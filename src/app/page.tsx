"use client";

import { ArrowDownTrayIcon, PlusIcon, Square2StackIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useState, useRef, useEffect, useCallback } from "react";
import { Button, MicrophoneIcon, MicrophoneSlashIcon } from "@/app/ui/MicrophoneButton";

// --- Définition des états et types ---
enum LiveRecordingState {
  Idle,
  Recording,
  Paused,
  Finished,
}

type Session = {
  id: string;
  text: string;
  at: number; // timestamp
};


// --- Composants d'interface réutilisables ---

const Spinner = ({ label = "Traitement en cours..." }: { label?: string }) => (
  <div className="flex items-center justify-center gap-3">
    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-white"></div>
    <span className="text-white/90 font-medium">{label}</span>
  </div>
);

// --- Composant principal de la page ---
export default function Home() {
  // Etats
  const [liveState, setLiveState] = useState<LiveRecordingState>(LiveRecordingState.Idle);
  const [isLoading, setIsLoading] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]); // bulles figées
  const [currentText, setCurrentText] = useState(""); // texte live (bulle en cours)
  const [copied, setCopied] = useState(false);

  // Audio/visu
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const transcriptionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const recordingActiveRef = useRef<boolean>(false);

  const processAudioChunk = async (audioBlob: Blob) => {
    if (!recordingActiveRef.current || audioBlob.size < 1000) return;
    const formData = new FormData();
    formData.append("audio", audioBlob, "live_chunk.webm");
    try {
      const res = await fetch("/api/transcribe", { method: "POST", body: formData });
      if (!res.ok) return;
      const result = await res.json();
      if (!recordingActiveRef.current) return;
      const piece = String(result?.transcription || "").trim();
      if (piece) setCurrentText((prev) => (prev ? `${prev} ${piece}` : piece));
    } catch (err) {
      console.error("Erreur de transcription live:", err);
    }
  };

  const handleDataAvailable = (event: BlobEvent) => {
    if (recordingActiveRef.current && event.data.size > 0) {
      audioChunksRef.current.push(event.data);
      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      processAudioChunk(audioBlob);
      audioChunksRef.current = [];
    }
  };

  const drawVisualizer = useCallback(() => {
    if (!analyserRef.current || !canvasRef.current) return;
    const analyser = analyserRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    const draw = () => {
      if (!recordingActiveRef.current) return;
      analyser.getByteFrequencyData(dataArray);
      if (ctx && canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const barWidth = (canvas.width / dataArray.length) * 1.5;
        let x = 0;
        const total = dataArray.reduce((s, v) => s + v, 0);
        if (total < dataArray.length * 2) {
          ctx.fillStyle = "rgba(255,255,255,0.08)";
          ctx.fillRect(0, canvas.height / 2, canvas.width, 1);
        } else {
          for (let i = 0; i < dataArray.length; i++) {
            const barHeight = dataArray[i] / 2;
            const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
            grad.addColorStop(0, "#60a5fa");
            grad.addColorStop(1, "#a78bfa");
            ctx.fillStyle = grad;
            ctx.fillRect(x, canvas.height / 2 - barHeight / 2, barWidth, barHeight);
            x += barWidth + 1;
          }
        }
      }
      animationFrameRef.current = requestAnimationFrame(draw);
    };
    animationFrameRef.current = requestAnimationFrame(draw);
  }, []);

  const startRecording = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setLiveState(LiveRecordingState.Recording);
    recordingActiveRef.current = true;
    setCurrentText("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const context = new AudioContext();
      audioContextRef.current = context;
      const source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      source.connect(analyser);
      drawVisualizer();
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = recorder;
      recorder.addEventListener("dataavailable", handleDataAvailable);
      recorder.start();
      transcriptionIntervalRef.current = setInterval(() => {
        if (recorder.state === "recording" && recordingActiveRef.current) {
          recorder.requestData();
        }
      }, 3000);
    } catch (err) {
      console.error("Erreur d'accès au micro:", err);
      setLiveState(LiveRecordingState.Idle);
      recordingActiveRef.current = false;
    } finally {
      setIsLoading(false);
    }
  };

  const cleanupRecording = () => {
    if (transcriptionIntervalRef.current) clearInterval(transcriptionIntervalRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    transcriptionIntervalRef.current = null;
    animationFrameRef.current = null;
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.pause();
      recordingActiveRef.current = false;
      cleanupRecording();
      const text = currentText.trim();
      if (text) {
        setSessions((prev) => [...prev, { id: crypto.randomUUID(), text, at: Date.now() }]);
        setCurrentText("");
      }
      setLiveState(LiveRecordingState.Paused);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current?.state === "paused") {
      mediaRecorderRef.current.resume();
      recordingActiveRef.current = true;
      drawVisualizer();
      transcriptionIntervalRef.current = setInterval(() => {
        if (mediaRecorderRef.current?.state === "recording" && recordingActiveRef.current) {
          mediaRecorderRef.current.requestData();
        }
      }, 3000);
      setLiveState(LiveRecordingState.Recording);
    }
  };

  const stopRecording = () => {
    recordingActiveRef.current = false;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try { mediaRecorderRef.current.stop(); } catch {}
    }
    cleanupRecording();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    audioContextRef.current?.close();
    const text = currentText.trim();
    if (text) {
      setSessions((prev) => [...prev, { id: crypto.randomUUID(), text, at: Date.now() }]);
      setCurrentText("");
    }
    setLiveState(LiveRecordingState.Finished);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("audio", file);
      const res = await fetch("/api/transcribe", { method: "POST", body: formData });
      const result = await res.json();
      const text = String(result?.transcription || "").trim();
      const finalText = text || `(Fichier: ${file.name}) — pas de texte détecté`;
      setSessions((prev) => [...prev, { id: crypto.randomUUID(), text: finalText, at: Date.now() }]);
      setLiveState(LiveRecordingState.Finished);
    } catch (err) {
      console.error("Erreur upload:", err);
    } finally {
      setIsLoading(false);
      if (event.target) event.target.value = "";
    }
  };

  const allText = sessions.sort((a, b) => a.at - b.at).map((s) => s.text).join("\n\n") +
                  (currentText ? (sessions.length ? "\n\n" : "") + currentText : "");

  const handleDownload = () => {
    const blob = new Blob([allText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "transcription.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(allText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch (e) {
      console.error("Impossible de copier:", e);
    }
  };

  useEffect(() => {
    return () => {
      recordingActiveRef.current = false;
      cleanupRecording();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      audioContextRef.current?.close();
    };
  }, []);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollTop = messagesEndRef.current.scrollHeight;
    }
  }, [sessions, currentText]);

  const isRecording = liveState === LiveRecordingState.Recording;
  const isPaused = liveState === LiveRecordingState.Paused;
  const showBottomBar = isRecording || isPaused;

  return (
    <main className="min-h-screen flex flex-col bg-gradient-to-t from-white/90 to-gray-100 dark:bg-gradient-to-br dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 text-white p-2 sm:p-6">
      <h3 className="text-center text-xl text-gray-700 dark:text-gray-400 mb-6 my-auto">
        {isRecording ? "J’écoute, parlez, je transcris en direct" : "Enregistrez ou uploadez un audio"}
      </h3>
      <div className="relative my-auto max-h-full max-w-3xl xl:max-w-5xl xl:w-5xl bg-gradient-to-b p-1.5 from-stone-400/10 to-white/35 dark:from-slate-700/35 dark:to-midnight-800/65 rounded-4xl shadow-[hsl(var(--always-black)/20.1%)] shadow-[inset_0px_0px_0px_1px_rgba(0,0,0,0.3)] dark:shadow-[inset_0px_0px_0px_1px_rgba(255,255,255,0.08)] mx-auto">
        <div className="bg-gradient-to-b from-white/90 to-gray-300/20 dark:from-black/30 dark:to-midnight-800/10 rounded-3xl">
          <div className="flex flex-col items-center justify-center px-4">
            <div className="w-full h-10 my-4 rounded-lg flex items-center justify-center overflow-hidden bg-gradient-to-br from-gray-300/40 to-gray-400/40 dark:from-gray-800/60 dark:to-gray-900/60 border border-gray-400 dark:border-white/10 shadow-inner">
              <canvas
                ref={canvasRef}
                width={800}
                height={40}
                className="transition-opacity duration-300 w-full"
                style={{ opacity: isRecording ? 1 : 0.3 }}
              />
            </div>
            <div className="relative w-full  rounded-xl p-4 shadow-md border border-gray-400 dark:border-white/10 bg-gradient-to-b from-gray-400/80 to-gray-400/40 dark:from-gray-900/80 dark:to-gray-900/40">
              {(sessions.length > 0 || currentText) && (
                <div className="absolute top-3 right-3 flex gap-2">
                  <button onClick={handleCopy} className="px-3 py-1 text-xs rounded-sm bg-white/70 dark:bg-white/10 hover:bg-white/20 text-gray-700 dark:text-white backdrop-blur shadow" title="Copier toute la transcription">
                    <Square2StackIcon className="size-6 mx-auto"/>
                    <span>{copied ? " Copié" : " Copier"}</span>
                  </button>
                  <button onClick={handleDownload} className="px-3 py-1 text-xs rounded-sm bg-white/70 dark:bg-white/10 hover:bg-white/20 text-gray-700 dark:text-white backdrop-blur shadow" title="Télécharger le .txt">
                    <ArrowDownTrayIcon className="size-6 mx-auto"/>
                    <span>Télécharger</span>
                  </button>
                </div>
              )}
              <div ref={messagesEndRef} className="space-y-3 w-full h-120 md:h-72 xl:h-90 rounded-lg overflow-y-auto pr-1">
                {sessions.sort((a, b) => a.at - b.at).map((s) => (
                  <div key={s.id} className="max-w-[85%] bg-gray-800/70 rounded-2xl px-4 py-3 shadow">
                    <p className="whitespace-pre-wrap text-white/90 text-sm md:text-base">{s.text}</p>
                  </div>
                ))}
                {isRecording && currentText && (
                  <div className="max-w-[85%] bg-blue-900/60 rounded-2xl px-4 py-3 shadow border border-blue-500/30">
                    <p className="whitespace-pre-wrap text-white/90 text-sm md:text-base">{currentText}</p>
                  </div>
                )}
                {sessions.length === 0 && !currentText && <p className="text-gray-600 dark:text-white/40 text-sm">Votre transcription</p>}
              </div>
            </div>
          </div>

          {showBottomBar ? (
            <div className="flex gap-6 justify-center items-center pt-3 pb-2 mt-3 border-t border-gray-300 dark:border-white/10">
              <Button onClick={stopRecording} className="w-10 h-10 bg-gray-200 dark:bg-gray-400 text-red-500 hover:text-red-400" title="Stop & Terminer">
                <XMarkIcon className="size-6"/>
              </Button>
              <div className="relative">
                {isRecording && <div className="absolute inset-0 rounded-full bg-blue-500 opacity-30 animate-ping"></div>}
                <Button onClick={isRecording ? pauseRecording : resumeRecording} className="relative z-10 w-12 h-12 bg-blue-600 text-white shadow-lg hover:bg-blue-500" title={isRecording ? "Mettre en pause" : "Reprendre"}>
                  {isRecording ? <MicrophoneIcon className="size-6" /> : <MicrophoneSlashIcon className="size-6" />}
                </Button>
              </div>
              <div className="w-10 h-10"></div>
            </div>
          ) : (
            <div className="flex items-center justify-center pt-3 pb-2 mt-3 border-t border-gray-300 dark:border-white/10">
              <div className="flex gap-6">
                <label className={`w-12 h-12 flex items-center justify-center rounded-full bg-gray-800 hover:bg-gray-700 cursor-pointer ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`} title="Uploader un fichier audio">
                  <PlusIcon className="size-6"/>
                  <input type="file" accept="audio/*" onChange={handleFileChange} className="hidden" disabled={isLoading} />
                </label>
                <Button onClick={startRecording} disabled={isLoading} className="w-12 h-12 bg-blue-600 hover:bg-blue-500 text-white shadow-lg" title="Démarrer l'écoute">
                  <MicrophoneIcon className="size-6" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="px-6 py-4 rounded-2xl bg-gradient-to-br from-gray-800 to-gray-900 border border-white/10 shadow-2xl">
            <Spinner />
          </div>
        </div>
      )}
    </main>
  );
}

