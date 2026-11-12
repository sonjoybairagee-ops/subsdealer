/**
 * RNNoise WebAssembly Audio & Video Noise Suppression Engine
 * 100% Client-Side Pure WebAssembly & Web Audio API
 *
 * Uses Mozilla/Xiph RNN deep learning noise suppression compiled to Wasm
 * via @shiguredo/rnnoise-wasm (runs at 48kHz, 10ms / 480-sample frames).
 */

import { encodeWav } from "@/lib/audio-file-utils";

export interface DenoiseStateInstance {
  processFrame(frame: Float32Array): number;
  destroy(): void;
}

export interface RnnoiseInstance {
  frameSize: number;
  createDenoiseState(): DenoiseStateInstance;
}

export interface RnnoiseStatic {
  load(): Promise<RnnoiseInstance>;
}

export interface RnnoiseProcessOptions {
  strength?: number; // 0 to 100 (wet/dry balance, default 80%)
  stereoMode?: "stereo" | "mono"; // default "stereo"
  onProgress?: (percent: number, status: string) => void;
}

export interface RnnoiseFileResult {
  blob: Blob;
  audioUrl: string;
  cleanedBuffer: AudioBuffer;
  originalBuffer: AudioBuffer;
  duration: number;
  sampleRate: number;
  channels: number;
  vadAverage: number;
}

// ─── Shared Rnnoise Instance Singleton ───────────────────────────────────────
let rnnoiseModulePromise: Promise<RnnoiseInstance> | null = null;

export async function getRnnoise(): Promise<RnnoiseInstance> {
  if (typeof window === "undefined") {
    throw new Error("RNNoise runs only in browser environments (WebAssembly).");
  }

  if (!rnnoiseModulePromise) {
    rnnoiseModulePromise = (async () => {
      let RnnoiseClass: RnnoiseStatic | null = null;

      // 1. Try local vendor script served from /vendor/rnnoise.js (instant, offline)
      try {
        const localPath = "/vendor/rnnoise.js";
        const importFn = new Function("u", "return import(u)");
        const localMod = await (importFn(localPath) as Promise<{ Rnnoise: RnnoiseStatic }>);
        if (localMod && localMod.Rnnoise) {
          RnnoiseClass = localMod.Rnnoise;
        }
      } catch (err) {
        console.warn("Could not load local /vendor/rnnoise.js, trying CDN fallback:", err);
      }

      // 2. Try pinned jsdelivr CDN as fallback
      if (!RnnoiseClass) {
        try {
          const cdnPath = "https://cdn.jsdelivr.net/npm/@shiguredo/rnnoise-wasm@2025.1.5/dist/rnnoise.js";
          const importFn = new Function("u", "return import(u)");
          const cdnMod = await (importFn(cdnPath) as Promise<{ Rnnoise: RnnoiseStatic }>);
          if (cdnMod && cdnMod.Rnnoise) {
            RnnoiseClass = cdnMod.Rnnoise;
          }
        } catch (cdnErr) {
          console.warn("CDN import failed, attempting bundled module fallback:", cdnErr);
        }
      }

      // 3. Fallback to bundled node_modules import
      if (!RnnoiseClass) {
        const bundledMod = await import("@shiguredo/rnnoise-wasm");
        RnnoiseClass = (bundledMod.Rnnoise as unknown) as RnnoiseStatic;
      }

      if (!RnnoiseClass || typeof RnnoiseClass.load !== "function") {
        throw new Error("Failed to load RNNoise WebAssembly module.");
      }

      return await RnnoiseClass.load();
    })();
  }

  return rnnoiseModulePromise;
}

// ─── Resample Audio to 48kHz (RNNoise Requirement) ───────────────────────────
export async function resampleTo48kHz(buffer: AudioBuffer): Promise<AudioBuffer> {
  if (buffer.sampleRate === 48000) return buffer;

  const targetLength = Math.max(1, Math.round((buffer.length * 48000) / buffer.sampleRate));
  const offlineCtx = new OfflineAudioContext(buffer.numberOfChannels, targetLength, 48000);
  const src = offlineCtx.createBufferSource();
  src.buffer = buffer;
  src.connect(offlineCtx.destination);
  src.start(0);
  return await offlineCtx.startRendering();
}

// ─── Convert Multi-Channel AudioBuffer to Mono Float32Array ─────────────────
export function toMonoFloat32(buffer: AudioBuffer): Float32Array {
  const length = buffer.length;
  const out = new Float32Array(length);
  const chCount = buffer.numberOfChannels;
  for (let c = 0; c < chCount; c++) {
    const d = buffer.getChannelData(c);
    for (let i = 0; i < length; i++) {
      out[i] += d[i] / chCount;
    }
  }
  return out;
}

// ─── Core RNNoise Buffer Processing ─────────────────────────────────────────
export async function processAudioBufferWithRnnoise(
  rawBuffer: AudioBuffer,
  options: RnnoiseProcessOptions = {}
): Promise<{
  cleanedBuffer: AudioBuffer;
  vadAverage: number;
}> {
  const strength = options.strength !== undefined ? options.strength : 80;
  const wet = Math.max(0, Math.min(100, strength)) / 100;
  const stereoMode = options.stereoMode || (rawBuffer.numberOfChannels > 1 ? "stereo" : "mono");

  options.onProgress?.(5, "Initializing RNNoise Neural Network (Wasm)...");
  const rnnoise = await getRnnoise();
  const FS = rnnoise.frameSize || 480;
  const SCALE = 32768;

  options.onProgress?.(15, "Resampling audio to 48 kHz standard...");
  const buffer48k = await resampleTo48kHz(rawBuffer);

  const length = buffer48k.length;
  const isMono = stereoMode === "mono" || buffer48k.numberOfChannels === 1;
  const numChannels = isMono ? 1 : buffer48k.numberOfChannels;

  // Setup offline audio context to create the output AudioBuffer
  const offlineCtx = new OfflineAudioContext(numChannels, length, 48000);
  const outBuffer = offlineCtx.createBuffer(numChannels, length, 48000);

  const totalFrames = Math.ceil(length / FS);
  let totalVadSum = 0;
  let totalVadCount = 0;

  for (let ch = 0; ch < numChannels; ch++) {
    const inData =
      isMono && buffer48k.numberOfChannels > 1
        ? toMonoFloat32(buffer48k)
        : buffer48k.getChannelData(ch);
    const outData = outBuffer.getChannelData(ch);

    const state = rnnoise.createDenoiseState();
    const frame = new Float32Array(FS);

    for (let f = 0; f < totalFrames; f++) {
      const start = f * FS;
      const len = Math.min(FS, length - start);

      frame.fill(0);
      for (let i = 0; i < len; i++) {
        frame[i] = inData[start + i] * SCALE;
      }

      // RNNoise processes frame in-place and returns VAD (0.0 to 1.0)
      const vad = state.processFrame(frame);
      totalVadSum += vad;
      totalVadCount++;

      // Blend cleaned signal with original according to wet/dry strength
      for (let i = 0; i < len; i++) {
        const cleaned = frame[i] / SCALE;
        const original = inData[start + i];
        outData[start + i] = wet * cleaned + (1 - wet) * original;
      }

      // Update progress and yield to browser thread periodically
      if (f % 200 === 0 || f === totalFrames - 1) {
        const overall = 20 + Math.round(((ch + f / totalFrames) / numChannels) * 75);
        options.onProgress?.(
          overall,
          `Removing noise with RNNoise RNN (${overall}%)...`
        );
        await new Promise((r) => setTimeout(r, 0));
      }
    }

    state.destroy();
  }

  const vadAverage = totalVadCount > 0 ? totalVadSum / totalVadCount : 0.5;
  options.onProgress?.(98, "Finalizing audio render...");

  return {
    cleanedBuffer: outBuffer,
    vadAverage,
  };
}

// ─── High-Level File / Video Denoise Function ────────────────────────────────
export async function denoiseAudioFileWithRnnoise(
  file: File | Blob,
  options: RnnoiseProcessOptions = {}
): Promise<RnnoiseFileResult> {
  options.onProgress?.(2, "Reading media file...");
  const arrayBuffer = await file.arrayBuffer();

  options.onProgress?.(8, "Decoding audio track...");
  // Browser AudioContext decodes audio from MP3, WAV, M4A, AAC, and video files (MP4, WebM, MOV)
  const ctx = new AudioContext({ sampleRate: 48000 });
  let decoded: AudioBuffer;
  try {
    decoded = await ctx.decodeAudioData(arrayBuffer);
  } finally {
    try {
      await ctx.close();
    } catch {}
  }

  const { cleanedBuffer, vadAverage } = await processAudioBufferWithRnnoise(
    decoded,
    options
  );

  options.onProgress?.(99, "Encoding broadcast WAV...");
  const wavBlob = encodeWav(cleanedBuffer);
  const audioUrl = URL.createObjectURL(wavBlob);

  options.onProgress?.(100, "Noise suppression complete!");

  return {
    blob: wavBlob,
    audioUrl,
    cleanedBuffer,
    originalBuffer: decoded,
    duration: cleanedBuffer.duration,
    sampleRate: cleanedBuffer.sampleRate,
    channels: cleanedBuffer.numberOfChannels,
    vadAverage,
  };
}
