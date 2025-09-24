"use client";

import { ArrowDownTrayIcon, PlusIcon, Square2StackIcon, XMarkIcon, CheckIcon, ChevronUpIcon } from "@heroicons/react/24/outline";
import { useState, useRef, useEffect, useCallback } from "react";
import { Button, MicrophoneIcon, MicrophoneSlashIcon } from "@/app/ui/MicrophoneButton";
import { processAudioChunk } from "@/app/utils/processAudioChunk";


// --- États & types ---
enum LiveRecordingState {
  Idle,
  EmailInput,
  Recording,
  Paused,
  Finished,
}

type Session = {
  id: string;
  text: string;
  at: number; // timestamp
};



// --- Animation de chargement réutilisable (pour intro et blocs) ---
const LoadingAnimation = ({ progress }: { progress: number }) => (
  <div className="flex flex-col items-center justify-center w-full py-2">
    <div className="w-60 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-3 sm:mb-6">
      <div
        className="h-full bg-gray-900 dark:bg-gray-200 rounded-full transition-all duration-100 ease-linear"
        style={{ width: `${progress}%` }}
      ></div>
    </div>
    <div className="flex justify-center items-center space-x-4">
      <div className="animate-dot-bounce-1 w-2 h-2 rounded-full bg-gray-900 dark:bg-gray-200"></div>
      <div className="animate-dot-bounce-2 w-2 h-2 rounded-full bg-gray-900 dark:bg-gray-200"></div>
      <div className="animate-dot-bounce-3 w-2 h-2 rounded-full bg-gray-900 dark:bg-gray-200"></div>
    </div>
  </div>
);

// --- Page ---
export default function Home() {
  // Etats principaux
  const [liveState, setLiveState] = useState<LiveRecordingState>(LiveRecordingState.EmailInput);
  const [userEmail, setUserEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Transcription
  const [sessions, setSessions] = useState<Session[]>([]);
  const sessionIdRef = useRef<string | null>(null);
  const [currentText, setCurrentText] = useState("");

  // UI
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [isUserEmailFocused, setIsUserEmailFocused] = useState(false);

  // Intro + loaders locaux
  const [progress, setProgress] = useState(0);
  const [showIntro, setShowIntro] = useState(true);
  const [loadingBlock, setLoadingBlock] = useState<null | "uploadMic" | "emailActions">(null);
  
  // Text typeWriter
  const [displayedText, setDisplayedText] = useState("");
  const fullText = "Empowering Meetings and Ideas\nBecause Every Word Matters";

  // Audio/visu refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const recordingActiveRef = useRef<boolean>(false);

useEffect(() => {
  let index = 0;
  const interval = setInterval(() => {
    setDisplayedText(fullText.slice(0, index + 1));
    index++;
    if (index === fullText.length) {
      clearInterval(interval);
    }
  }, 40); // vitesse en ms par lettre
  return () => clearInterval(interval);
}, []);

  // --- Intro au montage (texte + loading, puis <main>) ---
  useEffect(() => {
    if (!showIntro) return;
    setProgress(0);
    const totalDuration = 5000;
    const intervalTime = 20;
    const increment = 100 / (totalDuration / intervalTime);
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setShowIntro(false);
          return 100;
        }
        return prev + increment;
      });
    }, intervalTime);
    return () => clearInterval(interval);
  }, [showIntro]);

  // --- Loader local pour un bloc (remplace le bloc bouton par LoadingAnimation) ---
  const triggerBlockLoading = (block: "uploadMic" | "emailActions", callback: () => void, duration = 2000) => {
    setLoadingBlock(block);
    setProgress(0);
    const totalDuration = duration;
    const intervalTime = 20;
    const increment = 100 / (totalDuration / intervalTime);
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setLoadingBlock(null);
          callback();
          return 100;
        }
        return prev + increment;
      });
    }, intervalTime);
  };

  // --- Email: envoi ---
  const sendTranscriptionByEmail = async (transcription: string, sessionId?: string) => {
    if (!userEmail || (!transcription && !sessionId)) return;
    setIsSendingEmail(true);
    try {
      await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: userEmail,          
          transcription,       
          sessionId,             
        }),
      });
    } catch (error) {
      console.error("Erreur lors de l'envoi de l'email:", error);
    } finally {
      setIsSendingEmail(false);
    }
  };

  // --- Email: valider ---
  const handleEmailSubmit = (e?: React.MouseEvent) => {
    e?.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail)) {
      setEmailError("Veuillez entrer une adresse e-mail valide.");
      return;
    }
    setEmailError("");
    triggerBlockLoading("emailActions", () => {
      setLiveState(LiveRecordingState.Idle);
    });
  };

  // --- Email: passer ---
  const handleEmailSkip = (e?: React.MouseEvent) => {
    e?.preventDefault();
    triggerBlockLoading("emailActions", () => {
      setLiveState(LiveRecordingState.Idle);
    });
  };

  // --- Upload: capture le fichier puis déclenche le loader bloc ---
  const handleFileSelected = async (file: File) => {
    setLoadingBlock("uploadMic");
    setProgress(0);

    const trickleInterval = setInterval(() => {
      setProgress(p => (p < 90 ? p + 1 : p));
    }, 150);

    try {
      const formData = new FormData();
      formData.append("audio", file);
      const res = await fetch("/api/transcribe", { method: "POST", body: formData });
      const result = await res.json();
      const text = String(result?.transcription || "").trim();
      const finalText = text || `(Fichier: ${file.name}) — pas de texte détecté`;
      
      setSessions((prev) => {
        if (prev.length > 0 && prev[prev.length - 1].text === finalText) {
          return prev;
        }
        return [...prev, { id: crypto.randomUUID(), text: finalText, at: Date.now() }];
      });

      if (finalText) {
        sendTranscriptionByEmail(finalText);
      }
      setLiveState(LiveRecordingState.Finished);

    } catch (err) {
      console.error("Erreur upload:", err);
    } finally {
        clearInterval(trickleInterval);
        setProgress(100);
        setTimeout(() => {
            setLoadingBlock(null);
        }, 400);
    }
  };

  const onUploadChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.currentTarget.value = ""; 
    if (!file) return;
    handleFileSelected(file);
  };

  const startRecording = async () => {
    triggerBlockLoading("uploadMic", async () => {
      setLiveState(LiveRecordingState.Recording);
      recordingActiveRef.current = true;
      setCurrentText("");

      sessionIdRef.current = crypto.randomUUID();

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;

        // AudioContext pour visualisation
        const context = new AudioContext();
        audioContextRef.current = context;
        const source = context.createMediaStreamSource(stream);
        const analyser = context.createAnalyser();
        analyser.fftSize = 256;
        analyserRef.current = analyser;
        source.connect(analyser);
        drawVisualizer();

        // Force un format stable
        const mimeType = "audio/webm;codecs=opus";
        const recorder = new MediaRecorder(stream, { mimeType });
        mediaRecorderRef.current = recorder;

        // Chunk généré toutes les 3s = fichier WebM complet
        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            processAudioChunk(event.data, sessionIdRef.current!).then((piece) => {
              if (piece && recordingActiveRef.current) {
                setCurrentText((prev) => (prev ? `${prev} ${piece}` : piece));
              }
            });
          }
        };

        // Timeslice à 3s
        recorder.start(3000);

      } catch (err) {
        console.error("Erreur d'accès au micro:", err);
        setLiveState(LiveRecordingState.Idle);
        recordingActiveRef.current = false;
      }
    });
  };


  const cleanupRecording = () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = null;
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.pause(); 
      recordingActiveRef.current = false;
      setLiveState(LiveRecordingState.Paused);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current?.state === "paused") {
      mediaRecorderRef.current.resume(); 
      recordingActiveRef.current = true; 
      setLiveState(LiveRecordingState.Recording);
    }
  };

  const stopRecording = () => {
    if (liveState !== LiveRecordingState.Recording && liveState !== LiveRecordingState.Paused) return;

    recordingActiveRef.current = false;
    cleanupRecording();

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      // Enregistreur en pause, reprendre brièvement pour que stop() fonctionne correctement
      if (mediaRecorderRef.current.state === "paused") {
        mediaRecorderRef.current.resume();
      }
      
      mediaRecorderRef.current.addEventListener(
        "stop",
        () => {
          const textToSave = currentText.trim();
          if (textToSave) {
            const newSession = { id: crypto.randomUUID(), text: textToSave, at: Date.now() };
            setSessions((prev) => [...prev, newSession]);
            
            // Envoie du texte de la session en cours
            sendTranscriptionByEmail(textToSave, sessionIdRef.current ?? undefined);
          }
          setCurrentText("");
        },
        { once: true }
      );
      mediaRecorderRef.current.stop();
    } else {
      const textToSave = currentText.trim();
      if (textToSave) {
          const newSession = { id: crypto.randomUUID(), text: textToSave, at: Date.now() };
          setSessions((prev) => [...prev, newSession]);
          sendTranscriptionByEmail(textToSave, sessionIdRef.current ?? undefined);
      }
      setCurrentText("");
    }
    
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (audioContextRef.current?.state !== "closed") {
      audioContextRef.current?.close();
    }
    setLiveState(LiveRecordingState.Finished);
  };

  // --- Effects divers ---
  useEffect(() => {
    return () => {
      recordingActiveRef.current = false;
      cleanupRecording();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      
      if (audioContextRef.current?.state !== "closed") {
        audioContextRef.current?.close();
      }
    };
  }, []);

  const drawVisualizer = useCallback(() => {
    if (!analyserRef.current || !canvasRef.current) return;
    const analyser = analyserRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    const draw = () => {
      if (!recordingActiveRef.current && liveState !== LiveRecordingState.Paused) {
        if(ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
        cancelAnimationFrame(animationFrameRef.current!);
        return;
      }
      animationFrameRef.current = requestAnimationFrame(draw);
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
    };
    draw();
  }, [liveState]);

  // --- Utilitaires UI ---
const allText = sessions
  .sort((a, b) => a.at - b.at)
  .map((s) => {
    const date = new Date(s.at);
    const dateStr = date.toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const timeStr = date.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    return `[${dateStr} ${timeStr}] ${s.text}`;
  })
  .join("\n\n") +
  (currentText
    ? (sessions.length ? "\n\n" : "") +
      `[${new Date().toLocaleDateString("fr-FR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })} ${new Date().toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })}] ${currentText}`
    : "");


const handleDownload = () => {
  const blob = new Blob([allText], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "transcription.txt";
  a.click();
  URL.revokeObjectURL(url);

  setDownloaded(true);
  setTimeout(() => setDownloaded(false), 1200);
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

  // --- Effects divers ---
  useEffect(() => {
    return () => {
      recordingActiveRef.current = false;
      cleanupRecording();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (audioContextRef.current?.state !== "closed") {
        audioContextRef.current?.close();
      }
    };
  }, []);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollTop = messagesEndRef.current.scrollHeight;
    }
  }, [sessions, currentText]);

  // --- UI switches ---
  const isRecording = liveState === LiveRecordingState.Recording;
  const isPaused = liveState === LiveRecordingState.Paused;
  const showBottomBar = isRecording || isPaused;
  const showInitialActions = liveState === LiveRecordingState.Idle || liveState === LiveRecordingState.Finished;
  const showEmailInput = liveState === LiveRecordingState.EmailInput;
  const isUserEmailLabelActive = isUserEmailFocused || userEmail.length > 0;

  // Text H3 typeWriter
  const [displayedH3, setDisplayedH3] = useState("");
  const fullH3Text = isRecording ? "J’écoute, parlez, je transcris en direct" : showEmailInput ? "Recevez la transcription par e-mail" : "Enregistrez ou uploadez un audio";
  
  useEffect(() => {
    setDisplayedH3("");
    let index = 0;
    const interval = setInterval(() => {
      setDisplayedH3(fullH3Text.slice(0, index + 1));
      index++;
      if (index === fullH3Text.length) {
        clearInterval(interval);
      }
    }, 50); 
    return () => clearInterval(interval);
  }, [fullH3Text]);



  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-2 sm:p-6">
      {showIntro ? (
        <div className="text-center p-6 ">
          <h1 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white mb-15 text-center leading-20">
            {displayedText.split("\n").map((line, i, arr) => (<div key={i} >{line} {i === arr.length - 1 && <span className="animate-pulse">|</span>}</div> ))}
          </h1>
          <LoadingAnimation progress={progress} />
        </div>
      ) : (
        <>
          <h3 className="text-center text-xl lg:text-2xl font-semibold text-gray-800 dark:text-gray-300 drop-shadow-lg my-4">
            {displayedH3}
            <span className="animate-pulse">|</span>
          </h3>

          <div className="relative max-h-full max-w-3xl xl:max-w-5xl xl:w-5xl drop-shadow-[3px_15px_5px_rgba(0,0,0,0.15)] dark:drop-shadow-[3px_15px_5px_rgba(0,0,0,0.95)] mx-auto transition-all duration-400 ease-in-out">
          <div className="relative p-[1px] transition-all bg-gray-300 dark:bg-white/40 duration-400 ease-in-out" style={{ clipPath: "var(--clip-path-squircle-60)"}}>
          <div className="relative bg-gradient-to-b p-1.5 from-stone-300 to-white dark:bg-gradient-to-b dark:from-[#4E4E4E] dark:to-[#222222] rounded-4xl" style={{ clipPath: "var(--clip-path-squircle-60)" }}>
            <div className="bg-gradient-to-b from-white/90 to-gray-300/20 dark:bg-gradient-to-b dark:from-[#1E1E1E]/30 dark:to-[#222222]/10 rounded-3xl p-3" style={{ clipPath: "var(--clip-path-squircle-60)" }}>
              <div className="flex flex-col items-center justify-center transition-all duration-300 ease-in-out">
                {!showEmailInput && (
                  <div className="w-[95%] h-10 mb-4 rounded-full flex items-center justify-center overflow-hidden bg-gradient-to-br from-gray-200/40 to-gray-300/40 dark:from-[#333333]/60 dark:to-[#2E2E2E]/60 border border-gray-400 dark:border-white/10 shadow-inner">
                    <canvas
                      ref={canvasRef}
                      width={800}
                      height={40}
                      className="transition-opacity duration-300 w-full"
                      style={{ opacity: isRecording || isPaused ? 1 : 0.3 }}
                    />
                  </div>
                )}

                <div className="relative w-full rounded-4xl overflow-hidden shadow-md border border-gray-400 dark:border-white/10 bg-gradient-to-b from-gray-200/80 to-gray-200/40 dark:bg-gradient-to-b dark:from-[#222222]/80 dark:to-[#2E2E2E]/40 transition-all duration-400 ease-in-out">
                  {(sessions.length > 0 || currentText) && (
                    <div className="absolute top-0.5 right-0.5 flex gap-1 z-20">
                      {isSendingEmail && <span className="text-xs text-white/70 animate-pulse bg-black/50 px-4 py-3 rounded-full">Envoi...</span>}
                      <button onClick={handleCopy} className="p-2 text-xs rounded-md bg-white/70 dark:bg-white/10 hover:bg-white/20 text-gray-700 dark:text-white backdrop-blur shadow-lg" title="Copier toute la transcription">
                        {copied ? (
                          <CheckIcon className="size-6 mx-auto text-blue-800" />
                        ) : (
                          <Square2StackIcon className="size-6 mx-auto" />
                        )}
                      </button>
                      <button onClick={handleDownload} className="p-2 text-xs rounded-md rounded-tr-4xl bg-white/70 dark:bg-white/10 hover:bg-white/20 text-gray-700 dark:text-white backdrop-blur shadow-lg" title="Télécharger le .txt">
                        {downloaded ? (
                          <CheckIcon className="size-6 mx-auto text-blue-800" />
                        ) : (
                          <ArrowDownTrayIcon className="size-6 mx-auto" />
                        )}
                      </button>
                    </div>
                  )}

                  <div ref={messagesEndRef} className="space-y-3 w-full max-md:h-100 md:h-72 xl:h-90 rounded-2xl overflow-y-auto transition-all duration-400 ease-in-out">
                    {showEmailInput ? (
                      <form className="flex flex-col w-full items-center justify-evenly h-full rounded-4xl p-3 md:p-8 bg-gray-100 dark:bg-[#2E2E2E] gap-4 text-center transition-all duration-500 ease-out">
                        <p className={`text-base text-gray-700 dark:text-white/70 transition-all duration-500 ease-out ${ userEmail.trim() !== "" ? "opacity-80" : "opacity-100" }`}>
                          Pour commencer, entrez votre adresse e-mail, la transcription y sera envoyée
                        </p>

                        <div className={`relative w-full transition-all duration-500 ease-out ${ userEmail.trim() !== "" ? "translate-y-1" : "translate-y-4" }`}>
                          <input
                            type="email"
                            value={userEmail}
                            onChange={(e) => setUserEmail(e.target.value)}
                            onFocus={() => setIsUserEmailFocused(true)}
                            onBlur={() => setIsUserEmailFocused(false)}
                            className={`peer w-full py-4 px-6 text-gray-600 dark:text-white/70 border resize-none rounded-full shadow-sm focus:outline-none transition-all duration-300 ease-out ${
                              emailError ? "border-red-500" : "border-black/10 dark:border-white/10 focus:ring-1 focus:ring-blue-800 dark:focus-ring-blue-600 hover:border-blue-800 dark:hover:border-blue-600 focus:border-blue-800 dark:focus:border-blue-600" }`}
                          />
                          <label
                            htmlFor="message"
                            className={`absolute pointer-events-none transition-all duration-300 ease-out px-3
                             ${ isUserEmailLabelActive ? "top-0 left-6 -translate-y-1/2 text-sm rounded-full font-medium text-gray-400 peer-focus:text-blue-800 dark:peer-focus:text-blue-600 peer-hover:text-blue-800 dark:peer-hover:text-blue-600 group-hover:text-gray-500 px-1 bg-gray-100 dark:bg-[#2E2E2E] dark:text-gray-400" : "top-1/2 left-3 -translate-y-1/2 text-base text-gray-500"}`}
                          >
                            votre.email@exemple.com
                          </label>
                        </div>
                        {/* Message d’erreur */}
                        {emailError && <p className="text-red-400 text-sm">{emailError}</p>}

                        {/* Boutons */}
                        <div
                          className={`flex gap-3 w-full justify-between pt-6 border-t border-gray-300 dark:border-white/10 transform transition-all duration-500 ease-out ${
                            userEmail.trim() !== "" ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4 pointer-events-none" }`}
                        >
                          {loadingBlock === "emailActions" ? (
                            <LoadingAnimation progress={progress} />
                          ) : (
                            <>
                              <button
                                onClick={(e) => handleEmailSkip(e)} type="button"
                                className="inline-flex items-center justify-center bg-gray-800 border border-gray-800 rounded-lg text-base font-medium disabled:pointer-events-none disabled:opacity-50 w-32 h-12 px-6 py-2 shadow-md cursor-pointer relative overflow-hidden group transition-transform duration-100 active:scale-98"
                              >
                                <span className="absolute inset-0 bg-gray-200 transition-transform duration-400 ease-out translate-x-full group-hover:translate-x-0 z-0 focus:ring-0"></span>
                                <span className="relative z-10 transition-colors duration-400 text-white/90 group-hover:text-gray-900">Passer</span>
                              </button>

                              <button
                                onClick={handleEmailSubmit} type="submit"
                                className="inline-flex items-center justify-center bg-blue-800 border border-blue-800 rounded-lg text-base font-medium disabled:pointer-events-none disabled:opacity-50 w-32 h-12 pl-6 pr-3 py-2 shadow-md cursor-pointer relative overflow-hidden group transition-transform duration-100 active:scale-98"
                              >
                                <span className="absolute inset-0 bg-gray-200 transition-transform duration-400 ease-out -translate-x-full group-hover:translate-x-0 z-0 focus:ring-0"></span>
                                <span className="relative z-10 transition-colors duration-400 text-white/90 group-hover:text-gray-900 inline-flex whitespace-nowrap">
                                  Valider <ChevronUpIcon className="size-6 rotate-90 inline-block ml-2 group-hover:animate-bounce" />
                                </span>
                              </button>
                            </>
                          )}
                        </div>
                      </form>
                    ) : (
                      <>
                        {sessions.sort((a, b) => a.at - b.at).map((s) => (
                          <div key={s.id} className="max-w-[90%] bg-gray-100 dark:bg-gray-800/70 rounded-3xl px-4 py-3 shadow-lg m-2 border dark:border-none">
                            <p className="whitespace-pre-wrap text-gray-900 dark:text-white/90 text-sm md:text-base">{s.text}</p>
                          </div>
                        ))}
                        {currentText && (
                          <div className="max-w-[85%] bg-blue-100/40 dark:bg-blue-900/20 rounded-3xl px-4 py-3 mt-4 m-2 shadow-lg border border-blue-500/30">
                            <p className="whitespace-pre-wrap text-gray-900 dark:text-white/90 text-sm md:text-base">{currentText}</p>
                          </div>
                        )}
                        {sessions.length === 0 && !currentText && (
                          <p className="text-gray-600 dark:text-white/40 p-3 text-sm">Votre transcription apparaîtra ici...</p>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Bottom bars */}
                {showBottomBar ? (
                  // Barre pendant l'enregistrement/pause
                  <div className="w-full flex gap-6 justify-center items-center pt-4 pb-2 mt-4 border-t border-gray-300 dark:border-white/10 transition-all duration-300 ease-in-out">
                    <Button onClick={stopRecording} className="w-10 h-10 bg-gray-200 dark:bg-gray-800 text-red-500 hover:bg-gray-300 shadow-2xl" title="Stop & Terminer">
                      <XMarkIcon className="size-6" />
                    </Button>
                    <div className="relative">
                      {isRecording && <div className="absolute inset-0 rounded-full bg-[#48795e] opacity-30 animate-ping"></div>}
                      <Button onClick={isRecording ? pauseRecording : resumeRecording} className={`relative btn-hover-effect z-10 w-12 h-12 text-white transition-all duration-300 ease-in-out ${ isRecording ? "bg-[#48795e] dark:text-black/60" : "bg-blue-800" } shadow-lg`}
                        title={isRecording ? "Mettre en pause" : "Reprendre"}
                      >
                         {isRecording ? <MicrophoneIcon className="size-6" /> : <MicrophoneSlashIcon className="size-6" />}
                      </Button>
                    </div>
                    <div className="w-10 h-10"></div>
                  </div>
                ) : showInitialActions ? (
                  // Barre avant enregistrement — bloc remplacé par loader au clic
                  <div className="w-full flex items-center justify-center pt-4 pb-2 mt-4 border-t border-gray-300 dark:border-white/10 transition-all duration-300 ease-in-out">
                    <div className="flex gap-6 w-full justify-center">
                      {loadingBlock === "uploadMic" ? (
                        <LoadingAnimation progress={progress} />
                      ) : (
                        <>
                          <label className="w-12 h-12 flex items-center justify-center rounded-full bg-gray-800 hover:bg-gray-700 cursor-pointer text-white"
                            title="Uploader un fichier audio"
                          >
                            <PlusIcon className="size-6" />
                            <input type="file" accept="audio/*" onChange={onUploadChange} className="hidden" />
                          </label>
                          <Button onClick={startRecording} className="w-12 h-12 btn-hover-effect bg-blue-800 hover:bg-blue-600 text-white shadow-lg"
                            title="Démarrer l'écoute"
                          >
                            <MicrophoneIcon className="size-6" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
          </div>
          </div>
        </>
      )}
    </main>
  );
}