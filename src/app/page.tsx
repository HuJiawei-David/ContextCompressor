"use client";

/**
 * Lazarus – Notebook Context Shaper
 * ─────────────────────────────────────────────────────────────────────
 * Main UI page with three states:
 *   1. Idle    → Hero + Dropzone
 *   2. Processing → Shimmer skeleton + progress
 *   3. Result  → Split-pane view (Raw Code | Recovery Package)
 * ─────────────────────────────────────────────────────────────────────
 */

import { useState, useCallback, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  FileCode2,
  Sparkles,
  Copy,
  Check,
  RefreshCw,
  AlertCircle,
  Zap,
  Layers,
  ChevronRight,
} from "lucide-react";
import { parseNotebook, type ParseResult } from "@/lib/ipynb-parser";

// ── App State ────────────────────────────────────────────────────────
type AppState = "idle" | "processing" | "result";

// ── Animation Variants ───────────────────────────────────────────────
const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.1 } },
};

export default function LazarusPage() {
  // ── State ────────────────────────────────────────────────────────
  const [appState, setAppState] = useState<AppState>("idle");
  const [fileName, setFileName] = useState<string>("");
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [summary, setSummary] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [streamProgress, setStreamProgress] = useState<string>("");
  const abortRef = useRef<AbortController | null>(null);

  // ── File Drop Handler ────────────────────────────────────────────
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith(".ipynb")) {
      setError("Please upload a valid .ipynb (Jupyter Notebook) file.");
      return;
    }

    setError("");
    setFileName(file.name);
    setAppState("processing");
    setSummary("");
    setStreamProgress("Parsing notebook...");

    try {
      // 1. Read & parse on the client side
      const rawJson = await file.text();
      const result = parseNotebook(rawJson);
      setParseResult(result);
      setStreamProgress("Generating context recovery package...");

      // 2. Send cleaned text to the API
      abortRef.current = new AbortController();
      const response = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cleanedText: result.cleanedText }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || `API error: ${response.status}`);
      }

      // 3. Stream the response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          accumulated += decoder.decode(value, { stream: true });
          setSummary(accumulated);
        }
      }

      setAppState("result");
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
      setAppState("idle");
    }
  }, []);

  // ── Dropzone Config ──────────────────────────────────────────────
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/json": [".ipynb"] },
    multiple: false,
    disabled: appState === "processing",
  });

  // ── Copy Handler ─────────────────────────────────────────────────
  const handleCopy = async () => {
    await navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Reset Handler ────────────────────────────────────────────────
  const handleReset = () => {
    abortRef.current?.abort();
    setAppState("idle");
    setFileName("");
    setParseResult(null);
    setSummary("");
    setError("");
    setStreamProgress("");
  };

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden">
      {/* Ambient background orbs */}
      <div
        className="ambient-orb"
        style={{
          width: 600,
          height: 600,
          top: "-10%",
          left: "-10%",
          background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
        }}
      />
      <div
        className="ambient-orb"
        style={{
          width: 500,
          height: 500,
          bottom: "-15%",
          right: "-10%",
          background: "linear-gradient(135deg, #a855f7, #ec4899)",
        }}
      />

      {/* Nav Bar */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, var(--gradient-start), var(--gradient-end))" }}
          >
            <Zap size={16} className="text-white" />
          </div>
          <span className="text-lg font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
            Lazarus
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{
              background: "rgba(99, 102, 241, 0.1)",
              color: "var(--accent-indigo)",
              border: "1px solid rgba(99, 102, 241, 0.2)",
            }}
          >
            v1.0
          </span>
        </div>

        {appState !== "idle" && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={handleReset}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer transition-colors"
            style={{
              background: "rgba(148, 163, 184, 0.08)",
              color: "var(--text-secondary)",
              border: "1px solid var(--border-subtle)",
            }}
            id="reset-button"
          >
            <RefreshCw size={14} />
            New File
          </motion.button>
        )}
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex flex-col">
        <AnimatePresence mode="wait">
          {/* ─── IDLE STATE ──────────────────────────────────────── */}
          {appState === "idle" && (
            <motion.div
              key="idle"
              variants={stagger}
              initial="initial"
              animate="animate"
              exit="exit"
              className="flex-1 flex flex-col items-center justify-center px-6 py-16"
            >
              {/* Hero */}
              <motion.div variants={fadeUp} className="text-center mb-12 max-w-2xl">
                <div className="flex items-center justify-center gap-2 mb-6">
                  <Sparkles size={20} style={{ color: "var(--accent-indigo)" }} />
                  <span className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>
                    Notebook Context Shaper
                  </span>
                </div>
                <h1 className="text-5xl sm:text-6xl font-bold tracking-tight mb-4 leading-tight">
                  <span className="gradient-text glow-text">Resurrect</span>{" "}
                  <span style={{ color: "var(--text-primary)" }}>your</span>
                  <br />
                  <span style={{ color: "var(--text-primary)" }}>Notebook Context</span>
                </h1>
                <p className="text-lg leading-relaxed max-w-lg mx-auto" style={{ color: "var(--text-secondary)" }}>
                  Drop a <code className="px-1.5 py-0.5 rounded text-sm font-mono"
                    style={{ background: "var(--bg-elevated)", color: "var(--accent-indigo)" }}
                  >.ipynb</code> file and get a high-density context recovery package,
                  ready to paste into your next LLM session.
                </p>
              </motion.div>

              {/* Dropzone */}
              <motion.div variants={fadeUp} className="w-full max-w-xl">
                <div
                  {...getRootProps()}
                  id="dropzone"
                  className={`glass-card glow p-12 text-center cursor-pointer transition-all duration-300 ${
                    isDragActive ? "dropzone-active" : ""
                  }`}
                  style={{
                    border: isDragActive
                      ? "2px dashed var(--accent-indigo)"
                      : "2px dashed rgba(148, 163, 184, 0.15)",
                  }}
                >
                  <input {...getInputProps()} />
                  <div className="flex flex-col items-center gap-4">
                    <motion.div
                      animate={isDragActive ? { scale: 1.1, rotate: 5 } : { scale: 1, rotate: 0 }}
                      className="w-16 h-16 rounded-2xl flex items-center justify-center"
                      style={{
                        background: isDragActive
                          ? "rgba(99, 102, 241, 0.15)"
                          : "rgba(148, 163, 184, 0.05)",
                        border: "1px solid var(--border-subtle)",
                      }}
                    >
                      <Upload
                        size={28}
                        style={{
                          color: isDragActive ? "var(--accent-indigo)" : "var(--text-muted)",
                        }}
                      />
                    </motion.div>
                    <div>
                      <p className="text-base font-medium mb-1" style={{ color: "var(--text-primary)" }}>
                        {isDragActive ? "Drop it here..." : "Drag & drop your notebook"}
                      </p>
                      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                        or click to browse • .ipynb files only
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Error Toast */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="mt-6 flex items-center gap-3 px-4 py-3 rounded-xl text-sm"
                    style={{
                      background: "rgba(239, 68, 68, 0.1)",
                      border: "1px solid rgba(239, 68, 68, 0.2)",
                      color: "#fca5a5",
                    }}
                    id="error-message"
                  >
                    <AlertCircle size={16} />
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Feature Pills */}
              <motion.div variants={fadeUp} className="flex flex-wrap justify-center gap-3 mt-12">
                {[
                  { icon: Layers, text: "Strips outputs & metadata" },
                  { icon: Zap, text: "Client-side parsing" },
                  { icon: Sparkles, text: "Gemini-powered summaries" },
                ].map(({ icon: Icon, text }) => (
                  <div
                    key={text}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium"
                    style={{
                      background: "var(--bg-elevated)",
                      color: "var(--text-muted)",
                      border: "1px solid var(--border-subtle)",
                    }}
                  >
                    <Icon size={12} />
                    {text}
                  </div>
                ))}
              </motion.div>
            </motion.div>
          )}

          {/* ─── PROCESSING STATE ────────────────────────────────── */}
          {appState === "processing" && (
            <motion.div
              key="processing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center px-6 py-16"
            >
              <div className="w-full max-w-lg">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                  className="w-12 h-12 mx-auto mb-6 rounded-xl flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg, var(--gradient-start), var(--gradient-end))",
                  }}
                >
                  <Sparkles size={20} className="text-white" />
                </motion.div>

                <h2 className="text-xl font-semibold text-center mb-2" style={{ color: "var(--text-primary)" }}>
                  Processing {fileName}
                </h2>
                <p className="text-sm text-center mb-8" style={{ color: "var(--text-muted)" }}>
                  {streamProgress}
                </p>

                {/* Skeleton Shimmer */}
                <div className="glass-card p-6 space-y-3">
                  {[100, 85, 92, 70, 88, 60].map((width, i) => (
                    <div
                      key={i}
                      className="shimmer rounded-md"
                      style={{ width: `${width}%`, height: 12 }}
                    />
                  ))}
                </div>

                {/* Stats (if parsed) */}
                {parseResult && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-center gap-6 mt-6"
                  >
                    <Stat label="Total Cells" value={parseResult.totalCells} />
                    <Stat label="Included" value={parseResult.includedCells} />
                    <Stat label="Skipped" value={parseResult.skippedCells} />
                  </motion.div>
                )}

                {/* Live Preview of Streaming Summary */}
                {summary && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card p-4 mt-6 max-h-48 overflow-y-auto"
                  >
                    <p className="text-xs font-medium mb-2 flex items-center gap-1.5"
                      style={{ color: "var(--accent-indigo)" }}
                    >
                      <ChevronRight size={12} />
                      Live preview
                    </p>
                    <pre className="text-xs whitespace-pre-wrap leading-relaxed"
                      style={{ color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}
                    >
                      {summary}
                    </pre>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {/* ─── RESULT STATE (Split Pane) ───────────────────────── */}
          {appState === "result" && (
            <motion.div
              key="result"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col"
            >
              {/* Result Header */}
              <div className="flex items-center justify-between px-6 py-3 border-b"
                style={{ borderColor: "var(--border-subtle)" }}
              >
                <div className="flex items-center gap-3">
                  <FileCode2 size={16} style={{ color: "var(--accent-indigo)" }} />
                  <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                    {fileName}
                  </span>
                  {parseResult && (
                    <span className="text-xs px-2 py-0.5 rounded-full"
                      style={{
                        background: "rgba(52, 211, 153, 0.1)",
                        color: "var(--accent-emerald)",
                        border: "1px solid rgba(52, 211, 153, 0.2)",
                      }}
                    >
                      {parseResult.includedCells} cells processed
                    </span>
                  )}
                </div>
                <button
                  onClick={handleCopy}
                  id="copy-button"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer transition-all duration-200"
                  style={{
                    background: copied
                      ? "rgba(52, 211, 153, 0.15)"
                      : "linear-gradient(135deg, var(--gradient-start), var(--gradient-end))",
                    color: copied ? "var(--accent-emerald)" : "white",
                    border: copied ? "1px solid rgba(52, 211, 153, 0.3)" : "none",
                  }}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? "Copied!" : "Copy Package"}
                </button>
              </div>

              {/* Split Pane */}
              <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 min-h-0">
                {/* Left: Raw Code Preview */}
                <div className="flex flex-col border-r min-h-0" style={{ borderColor: "var(--border-subtle)" }}>
                  <div className="flex items-center gap-2 px-4 py-2.5 border-b"
                    style={{
                      borderColor: "var(--border-subtle)",
                      background: "var(--bg-secondary)",
                    }}
                  >
                    <div className="flex gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#ef4444" }} />
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#eab308" }} />
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#22c55e" }} />
                    </div>
                    <span className="text-xs font-medium ml-2" style={{ color: "var(--text-muted)" }}>
                      Parsed Notebook
                    </span>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    <pre className="code-pane p-4 whitespace-pre-wrap" id="code-preview">
                      {parseResult?.cleanedText}
                    </pre>
                  </div>
                </div>

                {/* Right: Recovery Package */}
                <div className="flex flex-col min-h-0">
                  <div className="flex items-center gap-2 px-4 py-2.5 border-b"
                    style={{
                      borderColor: "var(--border-subtle)",
                      background: "var(--bg-secondary)",
                    }}
                  >
                    <Sparkles size={12} style={{ color: "var(--accent-violet)" }} />
                    <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                      Context Recovery Package
                    </span>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6" id="recovery-package">
                    <div className="prose prose-invert prose-sm max-w-none">
                      <pre className="whitespace-pre-wrap text-sm leading-relaxed"
                        style={{
                          color: "var(--text-secondary)",
                          fontFamily: "var(--font-mono)",
                          background: "transparent",
                        }}
                      >
                        {summary}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center py-4 border-t"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Built for devs who refuse to lose context.
        </p>
      </footer>
    </div>
  );
}

// ── Stat Component ───────────────────────────────────────────────────
function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <p className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
        {value}
      </p>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        {label}
      </p>
    </div>
  );
}
