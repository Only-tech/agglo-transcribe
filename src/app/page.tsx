'use client'

import { ArrowDownTrayIcon, Square2StackIcon, CheckIcon } from "@heroicons/react/24/outline";
import { useState, useRef, useEffect, useCallback } from "react";
import { processAudioChunk } from "@/app/utils/processAudioChunk";
import { LoadingAnimation } from "@/app/ui/LoadingAnimation";
import { TranscriptionDisplay } from "@/app/ui/TranscriptionDisplay";
import { ActionBars } from "@/app/ui/ActionBars";
import { EmailForm } from "@/app/ui/EmailForm";


// Génère un UUID si crypto.randomUUID n'est pas disponible sur http
const generateUUID = (): string => {
    if (crypto && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // Fallback pour les contextes non sécurisés (http)
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

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
    at: number; 
};

export default function Home() {
    // --- États principaux ---
    const [liveState, setLiveState] = useState<LiveRecordingState>(LiveRecordingState.EmailInput);
    const [userEmail, setUserEmail] = useState("");
    const [isSendingEmail, setIsSendingEmail] = useState(false);

    // --- Transcription ---
    const [sessions, setSessions] = useState<Session[]>([]);
    const sessionIdRef = useRef<string | null>(null);
    const [currentText, setCurrentText] = useState("");

    // --- UI ---
    const [copied, setCopied] = useState(false);
    const [downloaded, setDownloaded] = useState(false);
    
    // --- Intro + Loaders ---
    const [progress, setProgress] = useState(0);
    const [showIntro, setShowIntro] = useState(true);
    const [loadingBlock, setLoadingBlock] = useState<null | "uploadMic" | "emailActions">(null);
    
    // --- Animation de texte typeWriter ---
    const [displayedText, setDisplayedText] = useState("");
    const fullText = "Empowering Meetings and Ideas\nBecause Every Word Matters";
    const [displayedH3, setDisplayedH3] = useState("");
    const fullH3Text = liveState === LiveRecordingState.Recording ? "J’écoute, parlez, je transcris en direct" : liveState === LiveRecordingState.EmailInput ? "Recevez la transcription par e-mail" : "Enregistrez ou uploadez un audio";
    
    // --- Références Audio + Visuelles ---
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const recordingActiveRef = useRef<boolean>(false);

    // --- Animation du titre d'intro typeWriter ---
    useEffect(() => {
        let index = 0;
        const interval = setInterval(() => {
            setDisplayedText(fullText.slice(0, index + 1));
            index++;
            if (index === fullText.length) {
                clearInterval(interval);
            }
        }, 40);
        return () => clearInterval(interval);
    }, []);

    // --- Barre de progression de l'intro ---
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

    // --- Animation de h3 typeWriter ---
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
    
    // --- Défilement automatique de la transcription ---
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollTop = messagesEndRef.current.scrollHeight;
        }
    }, [sessions, currentText]);
    
    // --- Nettoyage global ---
    useEffect(() => {
        return () => {
            recordingActiveRef.current = false;
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
            streamRef.current?.getTracks().forEach((t) => t.stop());
            if (audioContextRef.current?.state !== "closed") {
                audioContextRef.current?.close();
            }
        };
    }, []);

    // --- Logique métier et Handlers ---

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
    
    const sendTranscriptionByEmail = async (transcription: string, sessionId?: string) => {
        if (!userEmail || (!transcription && !sessionId)) return;
        setIsSendingEmail(true);
        try {
            await fetch("/api/send-email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ to: userEmail, transcription, sessionId }),
            });
        } catch (error) {
            console.error("Erreur lors de l'envoi de l'email:", error);
        } finally {
            setIsSendingEmail(false);
        }
    };

    const handleEmailSubmit = (email: string) => {
        setUserEmail(email);
        triggerBlockLoading("emailActions", () => {
            setLiveState(LiveRecordingState.Idle);
        });
    };

    const handleEmailSkip = () => {
        triggerBlockLoading("emailActions", () => {
            setLiveState(LiveRecordingState.Idle);
        });
    };

    const handleFileSelected = async (file: File) => {
        setLoadingBlock("uploadMic");
        setProgress(0);
        const trickleInterval = setInterval(() => setProgress(p => (p < 90 ? p + 1 : p)), 150);

        try {
            const formData = new FormData();
            formData.append("audio", file);
            const res = await fetch("/api/transcribe", { method: "POST", body: formData });
            const result = await res.json();
            const text = String(result?.transcription || "").trim() || `(Fichier: ${file.name}) — pas de texte détecté`;
            
            setSessions((prev) => [...prev, { id: generateUUID(), text, at: Date.now() }]);
            sendTranscriptionByEmail(text);
            setLiveState(LiveRecordingState.Finished);

        } catch (err) {
            console.error("Erreur upload:", err);
        } finally {
            clearInterval(trickleInterval);
            setProgress(100);
            setTimeout(() => setLoadingBlock(null), 400);
        }
    };

    const onUploadChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.currentTarget.value = ""; 
        if (file) handleFileSelected(file);
    };

    // Fonction utilitaire pour détecter le format audio compatible au navigateur
    function getSupportedMimeType(): string | undefined {
    const types = [
        "audio/webm;codecs=opus",
        "audio/ogg;codecs=opus", 
        "audio/mp4",           
        "audio/webm",
        "audio/ogg"
    ];
    return types.find((t) => MediaRecorder.isTypeSupported(t));
    }

    const startRecording = () => {
    triggerBlockLoading("uploadMic", async () => {
        setLiveState(LiveRecordingState.Recording);
        recordingActiveRef.current = true;
        setCurrentText("");
        sessionIdRef.current = generateUUID();

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

        // Détection dynamique du format supporté
        const mimeType = getSupportedMimeType();
        const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (event) => {

            if (!recordingActiveRef.current) {
                console.log("Chunk ignoré car enregistrement stoppé");
                return;
            }

            if (event.data.size > 0) {
                processAudioChunk(event.data, sessionIdRef.current!).then((piece) => {
                    if (piece && recordingActiveRef.current) {
                    setCurrentText((prev) => (prev ? `${prev} ${piece}` : piece));
                    }
                });
            }
        };

        // Un chunk toutes les 3 secondes
        recorder.start(3000);

        } catch (error) {
        console.error("Erreur d'accès au micro:", error);
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
                const newSession = { id: generateUUID(), text: textToSave, at: Date.now() };
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
            const newSession = { id: generateUUID(), text: textToSave, at: Date.now() };
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
    }, []);

    // --- Utilitaires UI ---
    const allText = [...sessions]
        .sort((a, b) => a.at - b.at)
        .map(s => `[${new Date(s.at).toLocaleString("fr-FR")}] ${s.text}`)
        .join("\n\n") +
        (currentText ? (sessions.length ? "\n\n" : "") + `[${new Date().toLocaleString("fr-FR")}] ${currentText}` : "");

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

    // --- Switches UI ---
    const showEmailInput = liveState === LiveRecordingState.EmailInput;

    return (
        <>
            <main className="relative min-h-screen inset-0 overflow-y-auto flex flex-col items-center justify-center p-2 sm:p-6">
                {showIntro ? (
                <section className="text-center p-6 ">
                    <h1 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white mb-15 text-center leading-20">
                        {displayedText.split("\n").map((line, i, arr) => (<div key={i} >{line} {i === arr.length - 1 && <span className="animate-pulse font-extralight">|</span>}</div> ))}
                    </h1>
                    <LoadingAnimation progress={progress} />
                </section>
                ) : (
                <>
                    <h3 className="text-center text-xl lg:text-2xl font-semibold text-gray-800 dark:text-gray-300 drop-shadow-lg my-4">
                        {displayedH3}
                        <span className="animate-pulse font-extralight">|</span>
                    </h3>

                    <div className="relative max-h-full max-w-3xl xl:max-w-5xl xl:w-5xl drop-shadow-[3px_15px_5px_rgba(0,0,0,0.15)] dark:drop-shadow-[3px_15px_5px_rgba(0,0,0,0.95)] mx-auto transition-all duration-600 ease-in-out">
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
                                                style={{ opacity: liveState === LiveRecordingState.Recording || liveState === LiveRecordingState.Paused ? 1 : 0.3 }}
                                            />
                                            </div>
                                        )}

                                        <div className="relative w-full rounded-4xl overflow-hidden shadow-md border border-gray-400 dark:border-white/10 bg-gradient-to-b from-gray-200/80 to-gray-200/40 dark:bg-gradient-to-b dark:from-[#222222]/80 dark:to-[#2E2E2E]/40 transition-all duration-400 ease-in-out">
                                            {(sessions.length > 0 || currentText) && (
                                                <div className="absolute top-0.5 right-0.5 flex gap-1 z-20">
                                                    {isSendingEmail && <span className="text-xs text-white/70 animate-pulse bg-black/50 px-4 py-3 rounded-full">Envoi...</span>}
                                                    <button onClick={handleCopy} className="p-2 text-xs rounded-md bg-white/70 dark:bg-white/10 hover:bg-white/20 text-gray-700 dark:text-white backdrop-blur shadow-lg" title="Copier toute la transcription">
                                                        {copied ? <CheckIcon className="size-6 mx-auto text-blue-800" /> : <Square2StackIcon className="size-6 mx-auto" />}
                                                    </button>
                                                    <button onClick={handleDownload} className="p-2 text-xs rounded-md rounded-tr-4xl bg-white/70 dark:bg-white/10 hover:bg-white/20 text-gray-700 dark:text-white backdrop-blur shadow-lg" title="Télécharger le .txt">
                                                        {downloaded ? <CheckIcon className="size-6 mx-auto text-blue-800" /> : <ArrowDownTrayIcon className="size-6 mx-auto" />}
                                                    </button>
                                                </div>
                                            )}

                                            <div ref={messagesEndRef} className="space-y-3 w-full max-md:h-100 md:h-72 xl:h-90 rounded-2xl overflow-y-auto transition-all duration-400 ease-in-out">
                                            {showEmailInput ? (
                                                <EmailForm
                                                    onSubmit={handleEmailSubmit}
                                                    onSkip={handleEmailSkip}
                                                    isLoading={loadingBlock === 'emailActions'}
                                                    progress={progress}
                                                />
                                            ) : (
                                                <TranscriptionDisplay sessions={sessions} currentText={currentText} />
                                            )}
                                            </div>
                                        </div>

                                        {showEmailInput ? (
                                            <></>
                                        ) : (
                                            <ActionBars
                                                liveState={LiveRecordingState[liveState] as 'Recording' | 'Paused' | 'Idle' | 'Finished'}
                                                isLoading={loadingBlock === "uploadMic"}
                                                progress={progress}
                                                onStart={startRecording}
                                                onPause={pauseRecording}
                                                onResume={resumeRecording}
                                                onStop={stopRecording}
                                                onUploadChange={onUploadChange}
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
                )}
            </main>


        </>
    );
}