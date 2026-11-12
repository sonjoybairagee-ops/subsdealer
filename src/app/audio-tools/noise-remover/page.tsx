import { Metadata } from "next";
import NoiseRemoverTool from "@/components/tools/NoiseRemoverTool";
import { Zap, CheckCircle2, HelpCircle, ShieldCheck, Cpu, Volume2, Sparkles } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Free Audio & Video Noise Remover — RNNoise WebAssembly (100% In-Browser)",
  description:
    "Remove background noise from audio and video files online using RNNoise WebAssembly. Lightweight RNN neural network suppresses fan noise, AC hum, traffic, and mic hiss in real-time. 100% Free, private & client-side.",
  keywords: [
    "noise remover",
    "rnnoise wasm",
    "rnnoise online",
    "remove background noise from audio",
    "remove background noise from video",
    "free noise suppression online",
    "browser audio denoiser",
    "webassembly noise removal",
    "real time noise cancellation",
  ],
  openGraph: {
    title: "Free Audio & Video Noise Remover — RNNoise WebAssembly",
    description:
      "Open-source RNN-based deep noise suppression running in your browser. Eliminates AC, fans, traffic, and mic hiss in real-time.",
  },
};

export default function NoiseRemoverPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "ToolHub RNNoise WebAssembly Audio & Video Noise Remover",
    url: "https://compxorbit.com/audio-tools/noise-remover",
    applicationCategory: "MultimediaApplication",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    description:
      "Browser-based recurrent neural network (RNN) noise removal tool for audio and video files using WebAssembly.",
    featureList: [
      "Open-source RNNoise RNN deep learning noise suppression",
      "Compiles to WebAssembly, runs in real-time in the browser",
      "Supports both audio (MP3, WAV, M4A, AAC) and video (MP4, WebM, MOV)",
      "Zero server uploads: 100% client-side privacy",
      "Adjustable denoise strength slider (0% to 100%)",
      "Real-time A/B before/after comparison playback",
      "Free 16-bit 48kHz broadcast WAV lossless download",
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#102a16] px-3.5 py-1 text-xs font-semibold text-[#3cff5f] border border-[#2a5234] mb-3">
            <Zap className="h-3.5 w-3.5" />
            <span>Open-Source Neural Network • WebAssembly</span>
          </span>
          <h1 className="text-3xl sm:text-5xl font-black text-[#e7eee9] tracking-tight">
            Audio &amp; Video Noise Remover
          </h1>
          <p className="mt-3 text-sm sm:text-base text-[#9baaa1] max-w-2xl mx-auto leading-relaxed">
            Lightweight RNN-based deep noise suppression running entirely inside your browser via WebAssembly. Clean voice recordings and eliminate background fan hum, AC rumble, and mic hiss in real-time.
          </p>
        </div>

        {/* Interactive Tool Container */}
        <div className="mb-14">
          <NoiseRemoverTool />
        </div>

        {/* Why RNNoise & How It Works */}
        <div className="rounded-3xl border border-[#26332d] bg-[#0c1510] p-8 mb-10 shadow-xs">
          <h2 className="text-xl font-bold text-[#e7eee9] mb-6 flex items-center gap-2">
            <Cpu className="h-5 w-5 text-[#3cff5f]" />
            <span>Why RNNoise WebAssembly is the Best Choice for Noise Removal</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-2xl bg-[#080e0b] p-5 border border-[#213026]">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#102a16] border border-[#2a5234] text-xs font-bold text-[#3cff5f] mb-3">
                <Zap className="h-4 w-4" />
              </span>
              <h3 className="text-sm font-bold text-[#e7eee9]">Lightweight RNN Neural Network</h3>
              <p className="mt-1.5 text-xs text-[#9baaa1] leading-relaxed">
                RNNoise combines classical signal processing with a deep Recurrent Neural Network (RNN) trained to recognize and preserve human vocal speech while eliminating non-speech noise.
              </p>
            </div>

            <div className="rounded-2xl bg-[#080e0b] p-5 border border-[#213026]">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#102a16] border border-[#2a5234] text-xs font-bold text-[#3cff5f] mb-3">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <h3 className="text-sm font-bold text-[#e7eee9]">100% Browser-Based &amp; Private</h3>
              <p className="mt-1.5 text-xs text-[#9baaa1] leading-relaxed">
                Compiled to WebAssembly (Wasm), the entire neural model runs locally on your device. Your sensitive interviews, confidential recordings, and videos are never transmitted to external servers.
              </p>
            </div>

            <div className="rounded-2xl bg-[#080e0b] p-5 border border-[#213026]">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#102a16] border border-[#2a5234] text-xs font-bold text-[#3cff5f] mb-3">
                <Volume2 className="h-4 w-4" />
              </span>
              <h3 className="text-sm font-bold text-[#e7eee9]">Audio &amp; Video Support</h3>
              <p className="mt-1.5 text-xs text-[#9baaa1] leading-relaxed">
                Upload audio files (MP3, WAV, M4A, AAC, OGG) or video footage (MP4, WebM, MOV). The tool extracts the audio track, strips background noise, and exports a 16-bit 48kHz WAV.
              </p>
            </div>
          </div>
        </div>

        {/* Step-by-step Guide */}
        <div className="rounded-3xl border border-[#26332d] bg-[#0c1510] p-8 mb-10 shadow-xs">
          <h2 className="text-xl font-bold text-[#e7eee9] mb-6 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-[#3cff5f]" />
            <span>How to Remove Background Noise in 3 Simple Steps</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-2xl bg-[#080e0b] p-5 border border-[#213026]">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#102a16] border border-[#2a5234] text-xs font-bold text-[#3cff5f] mb-3">
                1
              </span>
              <h3 className="text-sm font-bold text-[#e7eee9]">Upload File or Record Mic</h3>
              <p className="mt-1.5 text-xs text-[#9baaa1] leading-relaxed">
                Drop your audio file, video clip, or click &quot;Record Mic&quot; to capture your voice live.
              </p>
            </div>

            <div className="rounded-2xl bg-[#080e0b] p-5 border border-[#213026]">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#102a16] border border-[#2a5234] text-xs font-bold text-[#3cff5f] mb-3">
                2
              </span>
              <h3 className="text-sm font-bold text-[#e7eee9]">Adjust Denoise Strength</h3>
              <p className="mt-1.5 text-xs text-[#9baaa1] leading-relaxed">
                Default 80% offers optimal noise reduction while preserving vocal body. Use the slider to fine-tune between natural tone and aggressive suppression.
              </p>
            </div>

            <div className="rounded-2xl bg-[#080e0b] p-5 border border-[#213026]">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#102a16] border border-[#2a5234] text-xs font-bold text-[#3cff5f] mb-3">
                3
              </span>
              <h3 className="text-sm font-bold text-[#e7eee9]">Compare A/B &amp; Download WAV</h3>
              <p className="mt-1.5 text-xs text-[#9baaa1] leading-relaxed">
                Click between &quot;Cleaned&quot; and &quot;Original&quot; live to hear the difference. Click &quot;Download Cleaned WAV&quot; to save the file.
              </p>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="rounded-3xl border border-[#26332d] bg-[#0c1510] p-8 shadow-xs mb-10">
          <h2 className="text-xl font-bold text-[#e7eee9] mb-6 flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-[#3cff5f]" />
            <span>Frequently Asked Questions</span>
          </h2>

          <div className="space-y-4">
            <div className="rounded-2xl bg-[#080e0b] p-5 border border-[#213026]">
              <h3 className="text-sm font-bold text-[#e7eee9]">
                What is RNNoise?
              </h3>
              <p className="mt-1.5 text-xs text-[#9baaa1] leading-relaxed">
                RNNoise is an open-source, lightweight noise suppression library created by Jean-Marc Valin (Xiph.Org / Mozilla). It uses a recurrent neural network (Gated Recurrent Units) combined with traditional signal processing, enabling studio-quality noise reduction with minimal CPU overhead.
              </p>
            </div>

            <div className="rounded-2xl bg-[#080e0b] p-5 border border-[#213026]">
              <h3 className="text-sm font-bold text-[#e7eee9]">
                How does it run in the browser without a backend server?
              </h3>
              <p className="mt-1.5 text-xs text-[#9baaa1] leading-relaxed">
                RNNoise is compiled into WebAssembly (Wasm). Modern browsers execute WebAssembly at near-native binary speed, allowing real-time deep neural noise suppression directly on your laptop, desktop, or mobile device.
              </p>
            </div>

            <div className="rounded-2xl bg-[#080e0b] p-5 border border-[#213026]">
              <h3 className="text-sm font-bold text-[#e7eee9]">
                Can I remove noise from video files?
              </h3>
              <p className="mt-1.5 text-xs text-[#9baaa1] leading-relaxed">
                <strong>Yes!</strong> You can drop MP4, WebM, and MOV video files directly into this tool. The Web Audio API decodes the embedded audio track, runs RNNoise suppression, and lets you download a clean 48kHz WAV to replace the noisy audio track in Premiere, DaVinci Resolve, or Final Cut.
              </p>
            </div>

            <div className="rounded-2xl bg-[#080e0b] p-5 border border-[#213026]">
              <h3 className="text-sm font-bold text-[#e7eee9]">
                What is the difference between this and the Voice Enhancer tool?
              </h3>
              <p className="mt-1.5 text-xs text-[#9baaa1] leading-relaxed">
                This tool focuses on pure, lightweight RNNoise neural noise suppression with maximum speed. If you also want studio broadcast EQ (warm chest resonance, speech presence air sheen, and Adobe Podcast style auto-leveling), check out our{" "}
                <Link
                  href="/audio-tools/voice-enhancer-noise-reducer"
                  className="text-[#3cff5f] underline hover:text-[#48ff69]"
                >
                  Voice Enhancer &amp; Noise Reducer
                </Link>
                .
              </p>
            </div>
          </div>
        </div>

        {/* Related Tool CTA */}
        <div className="rounded-3xl border border-[#2a5234] bg-gradient-to-r from-[#0c1c13] to-[#08120c] p-8 text-center">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#3cff5f] mb-2">
            <Sparkles className="h-4 w-4" />
            <span>Looking for Studio Vocal EQ &amp; Warmth?</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-[#e7eee9]">
            Try Voice Enhancer &amp; Studio Podcast Leveller
          </h3>
          <p className="mt-2 text-xs sm:text-sm text-[#9baaa1] max-w-xl mx-auto">
            Upgrade your recording with RNNoise AI suppression plus SM7B chest warmth, room de-muffle, and broadcast volume leveling.
          </p>
          <div className="mt-5">
            <Link
              href="/audio-tools/voice-enhancer-noise-reducer"
              className="inline-flex items-center gap-2 rounded-2xl bg-[#3cff5f] px-6 py-3 text-sm font-bold text-[#050a08] hover:bg-[#48ff69] transition-all shadow-lg shadow-[#3cff5f]/20"
            >
              <span>Open Voice Enhancer &amp; Noise Reducer</span>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

