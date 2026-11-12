"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Sparkles,
  Upload,
  Download,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Mic,
  Square,
  Sliders,
  CheckCircle2,
  AlertCircle,
  FileAudio,
  Radio,
  RefreshCw,
  ShieldCheck,
  Zap,
} from "lucide-react";
import {
  denoiseAudioFileWithRnnoise,
  resampleTo48kHz,
  getRnnoise,
} from "@/lib/rnnoise-engine";
import { encodeWav } from "@/lib/audio-file-utils";

export default function NoiseRemoverTool() {
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [fileSize, setFileSize] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [statusMsg, setStatusMsg] = useState<string>("Choose an audio or video file.");
  const [strength, setStrength] = useState<number>(80);
  const [error, setError] = useState<string>("");

  // Result audio URLs
  const [originalUrl, setOriginalUrl] = useState<string>("");
  const [cleanedUrl, setCleanedUrl] = useState<string>("");
  const [vadScore, setVadScore] = useState<number | null>(null);

  // Playback state
  const [activeTrack, setActiveTrack] = useState<"cleaned" | "original">("cleaned");
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Microphone recording
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordSeconds, setRecordSeconds] = useState<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cleanedAudioRef = useRef<HTMLAudioElement | null>(null);
  const originalAudioRef = useRef<HTMLAudioElement | null>(null);
  const rawDecodedBufferRef = useRef<AudioBuffer | null>(null);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      if (originalUrl) URL.revokeObjectURL(originalUrl);
      if (cleanedUrl) URL.revokeObjectURL(cleanedUrl);
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    };
  }, [originalUrl, cleanedUrl]);

  // Sync volume with active track
  useEffect(() => {
    const cleanEl = cleanedAudioRef.current;
    const origEl = originalAudioRef.current;
    if (!cleanEl || !origEl) return;

    if (isMuted) {
      cleanEl.volume = 0;
      origEl.volume = 0;
    } else {
      cleanEl.volume = activeTrack === "cleaned" ? 1 : 0;
      origEl.volume = activeTrack === "original" ? 1 : 0;
    }
  }, [activeTrack, isMuted]);

  // Format file size
  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Run RNNoise processing on a file
  const processFile = useCallback(
    async (targetFile: File, userStrength: number) => {
      setError("");
      setIsProcessing(true);
      setProgress(5);
      setStatusMsg("Loading RNNoise WebAssembly model (~4.8 MB)...");

      try {
        const result = await denoiseAudioFileWithRnnoise(targetFile, {
          strength: userStrength,
          stereoMode: "stereo",
          onProgress: (pct, msg) => {
            setProgress(pct);
            setStatusMsg(msg);
          },
        });

        rawDecodedBufferRef.current = result.originalBuffer;
        setDuration(result.duration);
        setVadScore(result.vadAverage);

        // Update URLs
        if (cleanedUrl) URL.revokeObjectURL(cleanedUrl);
        setCleanedUrl(result.audioUrl);

        if (!originalUrl) {
          const origBlobUrl = URL.createObjectURL(targetFile);
          setOriginalUrl(origBlobUrl);
        }

        setStatusMsg("Noise removal complete! Preview before & after below.");
        setActiveTrack("cleaned");
      } catch (err: unknown) {
        console.error("RNNoise error:", err);
        const errMsg = err instanceof Error ? err.message : "Processing failed";
        setError(`Failed to process file with RNNoise: ${errMsg}. Please ensure it is a valid audio or video format.`);
        setStatusMsg("Error occurred during processing.");
      } finally {
        setIsProcessing(false);
      }
    },
    [cleanedUrl, originalUrl]
  );

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (
      !selected.type.startsWith("audio/") &&
      !selected.type.startsWith("video/") &&
      !/\.(mp3|wav|m4a|aac|ogg|flac|webm|mp4|mov|mkv|avi)$/i.test(selected.name)
    ) {
      setError("Please select a supported audio or video file (MP3, WAV, M4A, MP4, WebM, MOV, etc.).");
      return;
    }

    setFile(selected);
    setFileName(selected.name);
    setFileSize(formatBytes(selected.size));
    setIsPlaying(false);
    setCurrentTime(0);

    if (originalUrl) URL.revokeObjectURL(originalUrl);
    if (cleanedUrl) URL.revokeObjectURL(cleanedUrl);
    setCleanedUrl("");

    const newOrigUrl = URL.createObjectURL(selected);
    setOriginalUrl(newOrigUrl);

    processFile(selected, strength);
  };

  // Re-process when strength changes
  const handleReprocess = () => {
    if (!file) return;
    processFile(file, strength);
  };

  // Toggle Play / Pause
  const handleTogglePlay = () => {
    const cleanEl = cleanedAudioRef.current;
    const origEl = originalAudioRef.current;
    if (!cleanEl || !origEl) return;

    if (isPlaying) {
      cleanEl.pause();
      origEl.pause();
      setIsPlaying(false);
    } else {
      origEl.currentTime = cleanEl.currentTime;
      cleanEl.volume = isMuted ? 0 : activeTrack === "cleaned" ? 1 : 0;
      origEl.volume = isMuted ? 0 : activeTrack === "original" ? 1 : 0;

      Promise.all([
        cleanEl.play().catch(() => {}),
        origEl.play().catch(() => {}),
      ]).then(() => {
        setIsPlaying(true);
      });
    }
  };

  // Switch between Cleaned and Original with 0ms latency
  const handleTrackSwitch = (track: "cleaned" | "original") => {
    setActiveTrack(track);
    const cleanEl = cleanedAudioRef.current;
    const origEl = originalAudioRef.current;
    if (!cleanEl || !origEl) return;

    if (!isMuted) {
      if (track === "cleaned") {
        cleanEl.volume = 1;
        origEl.volume = 0;
        origEl.currentTime = cleanEl.currentTime;
      } else {
        origEl.volume = 1;
        cleanEl.volume = 0;
        origEl.currentTime = cleanEl.currentTime;
      }
    }
  };

  // Seek
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = Number(e.target.value);
    setCurrentTime(newTime);
    if (cleanedAudioRef.current) cleanedAudioRef.current.currentTime = newTime;
    if (originalAudioRef.current) originalAudioRef.current.currentTime = newTime;
  };

  // Toggle Mute
  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    const cleanEl = cleanedAudioRef.current;
    const origEl = originalAudioRef.current;
    if (!cleanEl || !origEl) return;

    if (nextMuted) {
      cleanEl.volume = 0;
      origEl.volume = 0;
    } else {
      cleanEl.volume = activeTrack === "cleaned" ? 1 : 0;
      origEl.volume = activeTrack === "original" ? 1 : 0;
    }
  };

  // Download Cleaned WAV
  const handleDownload = () => {
    if (!cleanedUrl) return;
    const a = document.createElement("a");
    a.href = cleanedUrl;
    const base = fileName.replace(/\.[^/.]+$/, "") || "cleaned-audio";
    a.download = `${base}-rnnoise-cleaned.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Microphone recording
  const startRecording = async () => {
    try {
      setError("");
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError("Microphone access is not supported by your browser.");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mime =
        typeof MediaRecorder !== "undefined" &&
        MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm";

      const mr = new MediaRecorder(stream, { mimeType: mime });
      mediaRecorderRef.current = mr;

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mr.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(audioChunksRef.current, { type: mr.mimeType || "audio/webm" });
        const recFile = new File([blob], `mic-recording-${Date.now()}.webm`, {
          type: blob.type,
        });

        setFile(recFile);
        setFileName("mic-voice-recording.wav");
        setFileSize(formatBytes(blob.size));
        setIsPlaying(false);
        setCurrentTime(0);

        if (originalUrl) URL.revokeObjectURL(originalUrl);
        if (cleanedUrl) URL.revokeObjectURL(cleanedUrl);
        setCleanedUrl("");

        const newOrigUrl = URL.createObjectURL(blob);
        setOriginalUrl(newOrigUrl);

        processFile(recFile, strength);
      };

      mr.start(250);
      setIsRecording(true);
      setRecordSeconds(0);
      recordTimerRef.current = setInterval(() => {
        setRecordSeconds((s) => s + 1);
      }, 1000);
    } catch {
      setError("Microphone permission denied or microphone not found.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordTimerRef.current) {
        clearInterval(recordTimerRef.current);
        recordTimerRef.current = null;
      }
    }
  };

  // Try real noisy speech sample
  const handleTrySample = async () => {
    setIsProcessing(true);
    setStatusMsg("Loading real noisy speech sample...");
    setError("");

    try {
      const res = await fetch("/assets/audio/demo-noisy-speech.wav");
      if (!res.ok) throw new Error("Could not load sample audio.");
      const blob = await res.blob();
      const sampleFile = new File([blob], "noisy-speech-sample.wav", { type: "audio/wav" });

      setFile(sampleFile);
      setFileName("noisy-speech-sample.wav");
      setFileSize(formatBytes(blob.size));
      setIsPlaying(false);
      setCurrentTime(0);

      if (originalUrl) URL.revokeObjectURL(originalUrl);
      if (cleanedUrl) URL.revokeObjectURL(cleanedUrl);
      setCleanedUrl("");

      const newOrigUrl = URL.createObjectURL(blob);
      setOriginalUrl(newOrigUrl);

      processFile(sampleFile, strength);
    } catch {
      setError("Sample audio file could not be loaded.");
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full">
      {/* Hidden Synchronized HTML5 Audio Elements */}
      <audio
        ref={cleanedAudioRef}
        src={cleanedUrl || undefined}
        preload="auto"
        onTimeUpdate={() => {
          if (cleanedAudioRef.current) {
            setCurrentTime(cleanedAudioRef.current.currentTime);
          }
        }}
        onLoadedMetadata={() => {
          if (cleanedAudioRef.current && cleanedAudioRef.current.duration) {
            setDuration(cleanedAudioRef.current.duration);
          }
        }}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
          if (originalAudioRef.current) originalAudioRef.current.currentTime = 0;
        }}
      />
      <audio
        ref={originalAudioRef}
        src={originalUrl || undefined}
        preload="auto"
      />

      {/* Main Control Box */}
      <div className="rounded-3xl border border-[#26332d] bg-[#0c1510] p-6 sm:p-8 mb-8 shadow-2xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#102a16] px-2.5 py-0.5 text-[11px] font-bold text-[#3cff5f] border border-[#2a5234]">
                <Zap className="h-3 w-3" />
                RNNoise WebAssembly
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] text-[#9baaa1]">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                100% In-Browser Private
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#e7eee9] mt-2 flex items-center gap-2">
              <span>RNN-Based Noise Suppression</span>
            </h2>
            <p className="text-xs sm:text-sm text-[#9baaa1] mt-1 max-w-xl leading-relaxed">
              Upload audio or video. Processing happens entirely inside your browser using a lightweight Recurrent Neural Network (RNN) compiled to WebAssembly. The file is never uploaded to any server.
            </p>
          </div>

          {/* Action Buttons: Record Mic, Upload Media, Try Sample */}
          <div className="flex flex-wrap items-center gap-2.5">
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,video/*"
              onChange={handleFileChange}
              className="hidden"
            />

            {!isRecording ? (
              <button
                type="button"
                onClick={startRecording}
                disabled={isProcessing}
                className="inline-flex items-center gap-2 rounded-2xl bg-rose-500/15 border border-rose-500/40 px-4 py-2.5 text-xs sm:text-sm font-bold text-rose-300 hover:bg-rose-500/25 transition-all cursor-pointer disabled:opacity-50"
              >
                <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                <Mic className="h-4 w-4 text-rose-400" />
                <span>Record Mic</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={stopRecording}
                className="inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-4 py-2.5 text-xs sm:text-sm font-bold text-white hover:bg-rose-500 transition-all cursor-pointer animate-pulse"
              >
                <Square className="h-4 w-4 fill-white" />
                <span>
                  Stop ({String(Math.floor(recordSeconds / 60)).padStart(2, "0")}:
                  {String(recordSeconds % 60).padStart(2, "0")})
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing || isRecording}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#3cff5f] px-5 py-2.5 text-xs sm:text-sm font-bold text-[#050a08] hover:bg-[#48ff69] transition-all cursor-pointer shadow-md shadow-[#3cff5f]/20 disabled:opacity-50"
            >
              <Upload className="h-4 w-4" />
              <span>Upload Audio or Video</span>
            </button>

            <button
              type="button"
              onClick={handleTrySample}
              disabled={isProcessing || isRecording}
              className="inline-flex items-center gap-1.5 rounded-2xl bg-[#102a16] px-3.5 py-2.5 text-xs font-semibold text-[#3cff5f] border border-[#2a5234] hover:bg-[#16381e] transition-colors cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Try Sample</span>
            </button>
          </div>
        </div>

        {/* Strength Slider & Info */}
        <div className="mt-6 pt-5 border-t border-[#213026]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
            <label className="text-xs font-semibold text-[#e7eee9] flex items-center gap-2">
              <Sliders className="h-3.5 w-3.5 text-[#3cff5f]" />
              <span>Denoise Strength:</span>
              <span className="font-mono text-sm text-[#3cff5f] font-bold">{strength}%</span>
            </label>
            <span className="text-[11px] text-[#62776a]">
              Lower = more of the original voice tone kept, less robotic. Higher = deeper suppression of fans, AC, and traffic.
            </span>
          </div>

          <div className="flex items-center gap-4">
            <input
              type="range"
              min="0"
              max="100"
              value={strength}
              onChange={(e) => setStrength(Number(e.target.value))}
              disabled={isProcessing}
              className="flex-1 accent-[#3cff5f] cursor-pointer h-2 bg-[#102a16] rounded-lg"
            />
            {file && !isProcessing && (
              <button
                type="button"
                onClick={handleReprocess}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#102a16] border border-[#2a5234] text-[11px] font-semibold text-[#3cff5f] hover:bg-[#16381e] cursor-pointer"
              >
                <RefreshCw className="h-3 w-3" />
                <span>Re-apply</span>
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar & Status */}
        {isProcessing && (
          <div className="mt-6 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#3cff5f] font-semibold flex items-center gap-2">
                <span className="h-3 w-3 border-2 border-[#3cff5f] border-t-transparent rounded-full animate-spin" />
                <span>{statusMsg}</span>
              </span>
              <span className="font-mono text-xs text-[#3cff5f]">{progress}%</span>
            </div>
            <div className="w-full bg-[#102a16] h-2.5 rounded-full overflow-hidden border border-[#213026]">
              <div
                className="bg-gradient-to-r from-[#2ebd4a] to-[#3cff5f] h-full transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Current status line when idle */}
        {!isProcessing && (
          <div className="mt-4 flex flex-wrap items-center justify-between text-xs text-[#9baaa1]">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span>{file ? `File: ${fileName} (${fileSize})` : statusMsg}</span>
            </div>
            {vadScore !== null && (
              <span className="text-[11px] font-mono text-[#3cff5f] bg-[#102a16] px-2 py-0.5 rounded-md border border-[#2a5234]">
                VAD Speech Confidence: {Math.round(vadScore * 100)}%
              </span>
            )}
          </div>
        )}

        {/* Error notice */}
        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-950/40 border border-red-800/40 px-4 py-3 text-xs text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Results Box with Real-Time A/B Switching */}
      {cleanedUrl ? (
        <div className="rounded-3xl border border-[#26332d] bg-[#0c1510] p-6 sm:p-8 shadow-2xl space-y-6 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#213026] pb-5">
            <div>
              <h3 className="text-base font-bold text-[#e7eee9] flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-[#3cff5f]" />
                <span>Cleaned Audio Ready (RNNoise)</span>
              </h3>
              <p className="text-xs text-[#9baaa1] mt-0.5">
                Toggle between Cleaned and Original while playing to hear the background noise disappear.
              </p>
            </div>

            {/* Seamless A/B Switcher */}
            <div className="inline-flex items-center rounded-2xl bg-[#080e0b] border border-[#213026] p-1 shadow-inner">
              <button
                type="button"
                onClick={() => handleTrackSwitch("cleaned")}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTrack === "cleaned"
                    ? "bg-[#3cff5f] text-[#050a08] shadow-md shadow-[#3cff5f]/20"
                    : "text-[#9baaa1] hover:text-[#e7eee9]"
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Cleaned (RNNoise AI)</span>
              </button>

              <button
                type="button"
                onClick={() => handleTrackSwitch("original")}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTrack === "original"
                    ? "bg-amber-400 text-[#050a08] shadow-md shadow-amber-400/20"
                    : "text-[#9baaa1] hover:text-[#e7eee9]"
                }`}
              >
                <span>Original (Noisy)</span>
              </button>
            </div>
          </div>

          {/* Player controls */}
          <div className="rounded-2xl bg-[#080e0b] border border-[#213026] p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={handleTogglePlay}
                className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#3cff5f] text-[#050a08] hover:bg-[#48ff69] transition-transform active:scale-95 cursor-pointer shadow-lg shadow-[#3cff5f]/20 shrink-0"
              >
                {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-0.5" />}
              </button>

              <div className="flex-1 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-[#3cff5f]">
                    {Math.floor(currentTime / 60)}:{Math.floor(currentTime % 60).toString().padStart(2, "0")}
                  </span>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#9baaa1]">
                    Listening to:{" "}
                    <strong className={activeTrack === "cleaned" ? "text-[#3cff5f]" : "text-amber-400"}>
                      {activeTrack === "cleaned" ? "RNNoise Cleaned Audio" : "Original Raw Media"}
                    </strong>
                  </span>
                  <span className="font-mono text-[#9baaa1]">
                    {Math.floor(duration / 60)}:{Math.floor(duration % 60).toString().padStart(2, "0")}
                  </span>
                </div>

                <input
                  type="range"
                  min="0"
                  max={duration || 1}
                  step="0.05"
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full accent-[#3cff5f] cursor-pointer h-2 bg-[#102a16] rounded-lg"
                />
              </div>

              <button
                type="button"
                onClick={handleToggleMute}
                className={`p-2.5 rounded-xl border transition-colors cursor-pointer shrink-0 ${
                  isMuted ? "bg-[#101813] border-[#29392f] text-[#9baaa1]" : "bg-[#102a16] border-[#2a5234] text-[#3cff5f]"
                }`}
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Action Download Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
            <div className="text-xs text-[#9baaa1]">
              Format: <span className="text-[#3cff5f] font-mono font-semibold">16-bit 48kHz WAV</span> (Uncompressed, broadcast standard)
            </div>

            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#3cff5f] px-6 py-3.5 text-sm font-bold text-[#050a08] hover:bg-[#48ff69] transition-all cursor-pointer shadow-lg shadow-[#3cff5f]/20"
            >
              <Download className="h-4 w-4" />
              <span>Download Cleaned WAV</span>
            </button>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div
          onClick={() => fileInputRef.current?.click()}
          className="rounded-3xl border-2 border-dashed border-[#26332d] bg-[#0c1510]/50 p-12 text-center hover:border-[#3cff5f]/50 transition-colors cursor-pointer group"
        >
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#102a16] border border-[#2a5234] text-[#3cff5f] mb-4 group-hover:scale-105 transition-transform">
            <FileAudio className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-bold text-[#e7eee9]">
            Drag &amp; Drop or Click to Select Audio or Video
          </h3>
          <p className="mt-2 text-xs sm:text-sm text-[#9baaa1] max-w-md mx-auto leading-relaxed">
            Supports MP3, WAV, M4A, AAC, OGG, WebM, and video files (MP4, MOV). Processing runs 100% locally in your browser using RNNoise WebAssembly.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-xs font-semibold text-[#3cff5f]">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" /> Lightweight RNN Neural Network
            </span>
            <span className="text-[#334538]">•</span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" /> Runs in Real-Time in Browser
            </span>
            <span className="text-[#334538]">•</span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" /> Free &amp; Open-Source (WebAssembly)
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

