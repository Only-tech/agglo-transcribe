'use client';

import { useState, useRef, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useCollection } from "react-firebase-hooks/firestore";
import { firestore } from "@/app/lib/firestore-client";
import { collection, query, orderBy, doc, updateDoc } from "firebase/firestore";
import Loader from "@/app/ui/Loader";
import { ActionBars } from "@/app/ui/ActionBars";
import { TranscriptionDisplay, TranscriptEntry } from "@/app/ui/TranscriptionDisplay";
import { ArrowDownTrayIcon, Square2StackIcon, CheckIcon, SparklesIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { ActionButton } from "@/app/ui/ActionButton"; 
import { UserIcon } from "@heroicons/react/24/solid";

// États de l'enregistrement
enum LiveRecordingState {
    Idle,
    Recording,
    Paused,
    Finished,
}

type ParticipantUser = {
    id: string;
    name: string | null;
};

export default function MeetingPageClient({ meetingId, meetingTitle }: { meetingId: string, meetingTitle: string }) {
    // --- États & Session ---
    const { data: session, status } = useSession({ required: true });
    const [liveState, setLiveState] = useState(LiveRecordingState.Idle);
    const [currentText, setCurrentText] = useState("");
    const [isFirstUploadDone, setIsFirstUploadDone] = useState(false);

    // --- Firestore & Transcription ---
    const firestoreCollectionId = meetingId;
    const [entriesSnapshot, loading, error] = useCollection(
        meetingId ?
        query(
            collection(firestore, `meetings/${firestoreCollectionId}/entries`),
            orderBy("timestamp", "asc")
        )
        : null
    );

    const transcriptEntries: TranscriptEntry[] =
        entriesSnapshot?.docs.map((d) => ({ id: d.id, ...d.data() } as TranscriptEntry)) || [];

    // --- UI ---
    const [copied, setCopied] = useState(false);
    const [downloaded, setDownloaded] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<any>(null);
    const [participants, setParticipants] = useState<ParticipantUser[]>([]);

    const [isUploading, setIsUploading] = useState(false);
    const [progress, setProgress] = useState(0);

    // --- Références Audio ---
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    // --- Copie/Partage lien de la réunion
    const meetingUrl = typeof window !== "undefined" ? `${window.location.origin}/meetings/${meetingId}` : "";

    const [copiedId, setCopiedId] = useState(false);
    const [copiedLink, setCopiedLink] = useState(false);

    const copyToClipboard = async (text: string, type: "id" | "link") => {
        try {
            await navigator.clipboard.writeText(text);
            if (type === "id") {
            setCopiedId(true);
            setTimeout(() => setCopiedId(false), 1500);
            } else {
            setCopiedLink(true);
            setTimeout(() => setCopiedLink(false), 1500);
            }
        } catch (err) {
            console.error("Erreur copie:", err);
        }
    };

    // --- Récupération des participants ---
    useEffect(() => {
        const fetchParticipants = async () => {
            try {
                const res = await fetch(`/api/meetings/${meetingId}/participants`);
                if (res.ok) {
                    const data = await res.json();
                    setParticipants(data);
                }
            } catch (err) {
                console.error("Erreur fetch participants:", err);
            }
        };
        fetchParticipants();
    }, [meetingId]);

    // --- Animation de progression pour l'upload ---
    useEffect(() => {
        if (!isUploading) {
            setProgress(0);
            return;
        }
        setProgress(0);
        const totalDuration = 4000; 
        const intervalTime = 20;
        const increment = 100 / (totalDuration / intervalTime);
        
        const interval = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 98) return 98;
                return prev + increment;
            });
        }, intervalTime);
        
        return () => clearInterval(interval);
    }, [isUploading]);

    // --- Défilement auto ---
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollTop = messagesEndRef.current.scrollHeight;
        }
    }, [transcriptEntries]);

    // --- Nettoyage ---
    useEffect(() => {
        return () => {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
            streamRef.current?.getTracks().forEach((t) => t.stop());
            if (audioContextRef.current?.state !== "closed") {
                audioContextRef.current?.close();
            }
        };
    }, []);

    // --- Upload fichier ---
    const handleUploadChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;

        setIsUploading(true);
        setCurrentText("Transcription en cours...");

        const formData = new FormData();
        formData.append("audio", file);
        formData.append("meetingId", meetingId);

        try {
            const res = await fetch("/api/transcribe/file", {
                method: "POST",
                body: formData,
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Erreur lors de l'upload");
            setCurrentText("");
            if (!isFirstUploadDone) setIsFirstUploadDone(true);
        } catch (err) {
            console.error("Erreur upload fichier:", err);
            setCurrentText("");
        } finally {
            setProgress(100); 
            setTimeout(() => { setIsUploading(false); }, 500); 
        }
    };

    // --- Visualizer ---
    const drawVisualizer = useCallback(() => {
        if (!analyserRef.current || !canvasRef.current || liveState === LiveRecordingState.Idle) return;
        const analyser = analyserRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const draw = () => {
            if (liveState !== LiveRecordingState.Recording && liveState !== LiveRecordingState.Paused) {
                if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
                if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
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

    // --- Automatise le visualizer ---
    useEffect(() => {
    if (liveState === LiveRecordingState.Recording || liveState === LiveRecordingState.Paused) {
        drawVisualizer();
    } else {
        if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
        }
        if (canvasRef.current) {
        const ctx = canvasRef.current.getContext("2d");
        if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
    }
    }, [liveState, drawVisualizer]);



    // --- Envoi des chunks live ---
    const sendChunk = async (blob: Blob) => {
        const formData = new FormData();
        formData.append("audio", blob, "chunk.webm");
        formData.append("meetingId", meetingId);
        try {
            await fetch("/api/transcribe/chunk", { method: "POST", body: formData });
        } catch (err) {
            console.error("Erreur envoi chunk:", err);
        }
    };

    // --- Recording controls ---
    const startRecording = async () => {
        setLiveState(LiveRecordingState.Recording);
        setCurrentText("Écoute en cours...");
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


            // drawVisualizer();

            const mimeType = "audio/webm;codecs=opus";
            const recorder = new MediaRecorder(stream, { mimeType });
            mediaRecorderRef.current = recorder;

            recorder.ondataavailable = (event) => {
                if (event.data.size > 0 && mediaRecorderRef.current?.state === "recording") {
                    sendChunk(event.data);
                }
            };

            recorder.start(10000);
        } catch (error) {
            console.error("Erreur d'accès au micro:", error);
            setLiveState(LiveRecordingState.Idle);
        }
    };

    const pauseRecording = () => {
        if (mediaRecorderRef.current?.state === "recording") {
            mediaRecorderRef.current.pause();
            setLiveState(LiveRecordingState.Paused);
        }
    };

    const resumeRecording = () => {
        if (mediaRecorderRef.current?.state === "paused") {
            mediaRecorderRef.current.resume();
            setLiveState(LiveRecordingState.Recording);
        }
    };

    const stopRecording = () => {
        if (liveState !== LiveRecordingState.Recording && liveState !== LiveRecordingState.Paused) return;

        setLiveState(LiveRecordingState.Finished);
        setCurrentText(""); 

        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            mediaRecorderRef.current.stop();
        }
        streamRef.current?.getTracks().forEach((t) => t.stop());
        if (audioContextRef.current?.state !== "closed") {
            audioContextRef.current?.close();
        }
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
    };

    // --- Édition ---
    const handleEditEntry = async (entryId: string, newText: string) => {
        if (!entryId) return;
        try {
            const docRef = doc(firestore, `meetings/${firestoreCollectionId}/entries`, entryId);
            const entry = transcriptEntries.find((e) => e.id === entryId);
            await updateDoc(docRef, {
                text: newText,
                isEdited: true,
                originalText: entry?.originalText || entry?.text,
            });
        } catch (err) {
            console.error("Erreur de mise à jour:", err);
        }
    };

    // --- Copier / Télécharger ---
    const getFullText = (includeNames = true) =>
        transcriptEntries
            .map((e) => {
                const time = new Date(e.timestamp).toLocaleString("fr-FR");
                return includeNames ? `[${time}] ${e.userName}:\n${e.text}` : `${e.text}`;
            })
            .join("\n\n");

    const handleDownload = () => {
        const text = getFullText(true);
        const blob = new Blob([text], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `transcription-${meetingId}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        setDownloaded(true);
        setTimeout(() => setDownloaded(false), 1200);
    };

    const handleCopy = async () => {
        try {
            const text = getFullText(false);
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
        } catch (e) {
            console.error("Impossible de copier:", e);
        }
    };

    // --- Analyse IA ---
    const handleAnalysis = async () => {
        setIsAnalyzing(true);
        setAnalysisResult(null);
        try {
            const res = await fetch(`/api/meetings/${meetingId}/analyze`, { method: "POST" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setAnalysisResult(data);
        } catch (err: any) {
            console.error("Erreur analyse IA:", err);
            setAnalysisResult({ error: err.message });
        }
        setIsAnalyzing(false);
    };

    // --- Rendu ---
    // const isLoadingFirestore = status === "loading" || (meetingId && loading);
    const shouldShowLoaderInsteadOfActions =
        isUploading && !isFirstUploadDone && liveState === LiveRecordingState.Idle;

    if (status === "loading")
        return (
            <div className="text-center p-10">
                <p>Chargement de la session...</p>
                <Loader variant="dots" />
            </div>
        );

    if (!meetingId) {
        return (
            <div className="text-center p-10 text-red-500">
                Erreur : ID de réunion non défini ou invalide.
            </div>
        );
    }

    if (error)
        return (
            <div className="text-center p-10 text-red-500">
                Erreur : {error.message}
            </div>
        );

    return (
        <div className="relative max-w-3xl xl:max-w-5xl mx-auto">

            <section className="flex flex-wrap mx-auto">
                <h1 className="text-center text-xl lg:text-2xl font-semibold text-gray-800 dark:text-gray-300 mb-4">
                    {meetingTitle}
                </h1>

                {/* Bloc de partage de la reunion */}
                <div className="flex items-center gap-2 mb-6 mx-auto">
                    <div className="flex items-center rounded-full max-w-40 border border-gray-300 dark:border-white/20 overflow-hidden shadow-lg dark:drop-shadow-[3px_10px_5px_rgba(0,0,0,0.25)]">
                        <span className="text-xs font-mono bg-white dark:bg-gray-800 px-2 py-1 truncate">
                            {meetingId}
                        </span>
                        <button
                            onClick={() => copyToClipboard(meetingId, "id")}
                            className=" text-white text-xs px-2 py-1 bg-blue-600 whitespace-nowrap cursor-pointer"
                        >
                            {copiedId ? "ID copié !" : "Copier ID"}
                        </button>
                    </div>

                    <div className="flex items-center rounded-full max-w-40 border border-gray-300 dark:border-white/20 overflow-hidden shadow-lg dark:drop-shadow-[3px_10px_5px_rgba(0,0,0,0.25)]">
                        <span className="text-xs font-mono bg-white dark:bg-gray-800 px-2 py-1 truncate">
                            {meetingUrl}
                        </span>
                        <button
                            onClick={() => copyToClipboard(meetingUrl, "link")}
                            className=" text-white text-xs px-2 py-1 bg-blue-600 whitespace-nowrap cursor-pointer"
                        >
                            {copiedLink ? "Lien copié !" : "Copier lien"}
                        </button>
                    </div>
                </div>
            </section>

            {/* Modale Analyse IA */}
            {analysisResult && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex items-center justify-center p-4">
                    <div className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-300 dark:border-white/10">
                        <ActionButton
                            variant="icon"
                            size="small"
                            onClick={() => setAnalysisResult(null)}
                            className="absolute top-3 right-3"
                        >
                            <XMarkIcon className="size-6" />
                        </ActionButton>
                        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
                            Analyse de la réunion
                        </h2>
                        {analysisResult.error ? (
                            <p className="text-red-500">{analysisResult.error}</p>
                        ) : (
                            <div className="space-y-4 max-h-[70vh] overflow-y-auto">
                                <div>
                                    <h3 className="text-lg font-semibold text-blue-600 dark:text-blue-400">Résumé</h3>
                                    <p className="text-gray-700 dark:text-gray-300">{analysisResult.summary}</p>
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-blue-600 dark:text-blue-400">Thèmes abordés</h3>
                                    <ul className="list-disc list-inside text-gray-700 dark:text-gray-300">
                                        {analysisResult.themes?.map((t: string, i: number) => <li key={i}>{t}</li>)}
                                    </ul>
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-blue-600 dark:text-blue-400">Actions à suivre</h3>
                                    <ul className="list-disc list-inside text-gray-700 dark:text-gray-300">
                                        {analysisResult.actionItems?.map((a: string, i: number) => <li key={i}>{a}</li>)}
                                    </ul>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Liste des participants */}
            <div className="flex items-center justify-center gap-2 mb-4">
                <UserIcon className="size-5 text-gray-600 dark:text-gray-400" />
                <p className="text-sm text-gray-700 dark:text-gray-300">
                    {participants.map(p => p.name || 'Anonyme').join(', ')}
                </p>
            </div>

            {/* Cadre principal */}
        <div className="drop-shadow-[3px_15px_5px_rgba(0,0,0,0.15)] dark:drop-shadow-[3px_15px_5px_rgba(0,0,0,0.95)]">
            <div className="relative p-[1px] bg-gray-300 dark:bg-white/40 rounded-4xl sm:[clip-path:var(--clip-path-squircle-60)]">
                <div className="relative bg-gradient-to-b p-1 sm:p-1.5 from-stone-300 to-white dark:bg-gradient-to-b dark:from-[#4E4E4E] dark:to-[#222222] rounded-4xl sm:[clip-path:var(--clip-path-squircle-60)]">
                    <div className="bg-gradient-to-b from-white/90 to-gray-300/20 dark:bg-gradient-to-b dark:from-[#1E1E1E]/30 dark:to-[#222222]/10 rounded-3xl p-0.5 sm:p-3 sm:[clip-path:var(--clip-path-squircle-60)]">
                        <div className="flex flex-col items-center justify-center">

                            {/* Visualizer */}
                            <div className="w-[95%] h-10 mb-4 rounded-full flex items-center justify-center overflow-hidden bg-gradient-to-br from-gray-200/40 to-gray-300/40 dark:from-[#333333]/60 dark:to-[#2E2E2E]/60 border border-gray-400 dark:border-white/10 shadow-inner">
                                <canvas
                                    ref={canvasRef}
                                    width={800}
                                    height={40}
                                    className="transition-opacity duration-300 w-full"
                                    style={{ opacity: liveState === LiveRecordingState.Recording || liveState === LiveRecordingState.Paused ? 1 : 0.3 }}
                                />
                            </div>

                            {/* Zone de transcription */}
                            <div className="relative w-full sm:rounded-4xl overflow-hidden shadow-md">
                                {(transcriptEntries.length > 0 || currentText) && (
                                    <div className="absolute top-0.5 right-0.5 flex gap-1 z-20">
                                        <ActionButton
                                            variant="icon"
                                            size="small"
                                            onClick={handleAnalysis}
                                            disabled={isAnalyzing || liveState !== LiveRecordingState.Finished}
                                            className="rounded-md"
                                            title="Générer un résumé IA (disponible après l'arrêt)"
                                        >
                                            {isAnalyzing ? <span className="animate-spin">✨</span> : <SparklesIcon className="size-6 mx-auto" />}
                                        </ActionButton>

                                        <ActionButton
                                            variant="icon"
                                            size="small"
                                            onClick={handleCopy}
                                            className="rounded-md"
                                            title="Copier la transcription"
                                        >
                                            {copied ? <CheckIcon className="size-6 mx-auto text-blue-800" /> : <Square2StackIcon className="size-6 mx-auto" />}
                                        </ActionButton>

                                        <ActionButton
                                            variant="icon"
                                            size="small"
                                            onClick={handleDownload}
                                            className="rounded-md rounded-tr-2xl sm:rounded-tr-4xl"
                                            title="Télécharger le .txt"
                                        >
                                            {downloaded ? <CheckIcon className="size-6 mx-auto text-blue-800" /> : <ArrowDownTrayIcon className="size-6 mx-auto" />}
                                        </ActionButton>
                                    </div>
                                )}

                                {/* Affichage transcription + édition */}
                                <div ref={messagesEndRef}>
                                    <TranscriptionDisplay
                                        entries={transcriptEntries}
                                        currentUserId={session?.user?.id}
                                        currentText={currentText}
                                        onEdit={handleEditEntry}
                                    />

                                    {/* Loader dots pour uploads suivants */}
                                    {isUploading && isFirstUploadDone && !currentText && (
                                        <div className="flex justify-center py-4 animate-fadeInUp">
                                            <Loader variant="dots" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Barre d'actions */}
                            <div className="transition-all duration-700 ease-in-out p-0.5 w-full">
                                {shouldShowLoaderInsteadOfActions ? (
                                    <div className="animate-fadeInUp">
                                        <Loader variant="both" progress={progress} />
                                    </div>
                                ) : (
                                    <ActionBars
                                        liveState={
                                            LiveRecordingState[liveState] as
                                                | "Recording"
                                                | "Paused"
                                                | "Idle"
                                                | "Finished"
                                        }
                                        isLoading={false}
                                        progress={isUploading ? progress : 0}
                                        onStart={startRecording}
                                        onPause={pauseRecording}
                                        onResume={resumeRecording}
                                        onStop={stopRecording}
                                        onUploadChange={handleUploadChange}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            </div>
        </div>
    );
}



// 'use client';

// import { useState, useRef, useEffect, useCallback } from "react";
// import { useSession } from "next-auth/react";
// import { useCollection } from "react-firebase-hooks/firestore";
// import { firestore } from "@/app/lib/firestore-client";
// import { collection, query, orderBy, doc, updateDoc } from "firebase/firestore";
// import Loader from "@/app/ui/Loader";
// import { ActionBars } from "@/app/ui/ActionBars";
// import { TranscriptionDisplay, TranscriptEntry } from "@/app/ui/TranscriptionDisplay";
// import { ArrowDownTrayIcon, Square2StackIcon, CheckIcon, SparklesIcon, XMarkIcon } from "@heroicons/react/24/outline";
// import { ActionButton } from "@/app/ui/ActionButton"; 
// import { UserIcon } from "@heroicons/react/24/solid";

// // États de l'enregistrement
// enum LiveRecordingState {
//   Idle,
//   Recording,
//   Paused,
//   Finished,
// }

// type ParticipantUser = {
//   id: string;
//   name: string | null;
// };

// export default function MeetingPageClient({ meetingId, meetingTitle }: { meetingId: string, meetingTitle: string }) {
//   // --- États & Session ---
//   const { data: session, status } = useSession({ required: true });
//   const [liveState, setLiveState] = useState(LiveRecordingState.Idle);
//   const [currentText, setCurrentText] = useState("");
//   const [isFirstUploadDone, setIsFirstUploadDone] = useState(false);

//   // --- Firestore & Transcription ---
//   const firestoreCollectionId = meetingId;
//   const [entriesSnapshot, loading, error] = useCollection(
//     meetingId
//       ? query(collection(firestore, `meetings/${firestoreCollectionId}/entries`), orderBy("timestamp", "asc"))
//       : null
//   );

//   const transcriptEntries: TranscriptEntry[] =
//     entriesSnapshot?.docs.map((d) => ({ id: d.id, ...d.data() } as TranscriptEntry)) || [];

//   // --- UI ---
//   const [copied, setCopied] = useState(false);
//   const [downloaded, setDownloaded] = useState(false);
//   const [isAnalyzing, setIsAnalyzing] = useState(false);
//   const [analysisResult, setAnalysisResult] = useState<any>(null);
//   const [participants, setParticipants] = useState<ParticipantUser[]>([]);

//   const [isUploading, setIsUploading] = useState(false);
//   const [progress, setProgress] = useState(0);

//   // --- Audio refs ---
//   const mediaRecorderRef = useRef<MediaRecorder | null>(null);
//   const audioContextRef = useRef<AudioContext | null>(null);
//   const analyserRef = useRef<AnalyserNode | null>(null);
//   const streamRef = useRef<MediaStream | null>(null);

//   // --- Visualizer refs ---
//   const canvasRef = useRef<HTMLCanvasElement | null>(null);
//   const animationFrameRef = useRef<number | null>(null);
//   // Track if analyser is ready to avoid race with liveState
//   const [visualizerReady, setVisualizerReady] = useState(false);

//   const messagesEndRef = useRef<HTMLDivElement | null>(null);

//   // --- Participants ---
//   useEffect(() => {
//     const fetchParticipants = async () => {
//       try {
//         const res = await fetch(`/api/meetings/${meetingId}/participants`);
//         if (res.ok) {
//           const data = await res.json();
//           setParticipants(data);
//         }
//       } catch (err) {
//         console.error("Erreur fetch participants:", err);
//       }
//     };
//     fetchParticipants();
//   }, [meetingId]);

//   // --- Upload progress animation ---
//   useEffect(() => {
//     if (!isUploading) {
//       setProgress(0);
//       return;
//     }
//     setProgress(0);
//     const totalDuration = 4000;
//     const intervalTime = 20;
//     const increment = 100 / (totalDuration / intervalTime);
//     const interval = setInterval(() => {
//       setProgress((prev) => (prev >= 98 ? 98 : prev + increment));
//     }, intervalTime);
//     return () => clearInterval(interval);
//   }, [isUploading]);

//   // --- Auto-scroll ---
//   useEffect(() => {
//     if (messagesEndRef.current) {
//       messagesEndRef.current.scrollTop = messagesEndRef.current.scrollHeight;
//     }
//   }, [transcriptEntries]);

//   // --- Cleanup on unmount ---
//   useEffect(() => {
//     return () => {
//       if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
//       streamRef.current?.getTracks().forEach((t) => t.stop());
//       if (audioContextRef.current?.state !== "closed") {
//         audioContextRef.current?.close();
//       }
//       setVisualizerReady(false);
//     };
//   }, []);

//   // --- Upload fichier ---
//   const handleUploadChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0];
//     e.target.value = "";
//     if (!file) return;

//     setIsUploading(true);
//     setCurrentText("Transcription en cours...");

//     const formData = new FormData();
//     formData.append("audio", file);
//     formData.append("meetingId", meetingId);

//     try {
//       const res = await fetch("/api/transcribe/file", { method: "POST", body: formData });
//       const data = await res.json();
//       if (!res.ok) throw new Error(data.error || "Erreur lors de l'upload");
//       setCurrentText("");
//       if (!isFirstUploadDone) setIsFirstUploadDone(true);
//     } catch (err) {
//       console.error("Erreur upload fichier:", err);
//       setCurrentText("");
//     } finally {
//       setProgress(100);
//       setTimeout(() => setIsUploading(false), 500);
//     }
//   };

//   // --- Visualizer loop (pure draw logic) ---
//   const drawVisualizer = useCallback(() => {
//     const analyser = analyserRef.current;
//     const canvas = canvasRef.current;
//     if (!analyser || !canvas) return;
//     const ctx = canvas.getContext("2d");
//     if (!ctx) return;

//     const dataArray = new Uint8Array(analyser.frequencyBinCount);

//     const loop = () => {
//       // Stop the loop if not in active states
//       if (liveState !== LiveRecordingState.Recording && liveState !== LiveRecordingState.Paused) {
//         ctx.clearRect(0, 0, canvas.width, canvas.height);
//         if (animationFrameRef.current) {
//           cancelAnimationFrame(animationFrameRef.current);
//           animationFrameRef.current = null;
//         }
//         return;
//       }

//       animationFrameRef.current = requestAnimationFrame(loop);

//       analyser.getByteFrequencyData(dataArray);

//       ctx.clearRect(0, 0, canvas.width, canvas.height);
//       const barWidth = (canvas.width / dataArray.length) * 1.5;
//       let x = 0;
//       const total = dataArray.reduce((s, v) => s + v, 0);

//       if (total < dataArray.length * 2) {
//         ctx.fillStyle = "rgba(255,255,255,0.08)";
//         ctx.fillRect(0, canvas.height / 2, canvas.width, 1);
//       } else {
//         for (let i = 0; i < dataArray.length; i++) {
//           const barHeight = dataArray[i] / 2;
//           const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
//           grad.addColorStop(0, "#60a5fa");
//           grad.addColorStop(1, "#a78bfa");
//           ctx.fillStyle = grad;
//           ctx.fillRect(x, canvas.height / 2 - barHeight / 2, barWidth, barHeight);
//           x += barWidth + 1;
//         }
//       }
//     };

//     loop();
//   }, [liveState]);

//   // --- Robust visualizer control (auto start/stop on state and readiness) ---
//   useEffect(() => {
//     const analyser = analyserRef.current;
//     const canvas = canvasRef.current;

//     // Only run when analyser is ready and canvas exists
//     if (!visualizerReady || !analyser || !canvas) return;

//     // If we are in active states, (re)start the loop
//     if (liveState === LiveRecordingState.Recording || liveState === LiveRecordingState.Paused) {
//       // Reset any previous frame id to be safe
//       if (animationFrameRef.current) {
//         cancelAnimationFrame(animationFrameRef.current);
//         animationFrameRef.current = null;
//       }
//       drawVisualizer();
//     } else {
//       // Not active → clear and stop
//       const ctx = canvas.getContext("2d");
//       if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
//       if (animationFrameRef.current) {
//         cancelAnimationFrame(animationFrameRef.current);
//         animationFrameRef.current = null;
//       }
//     }

//     // Cleanup on dependency change
//     return () => {
//       if (animationFrameRef.current) {
//         cancelAnimationFrame(animationFrameRef.current);
//         animationFrameRef.current = null;
//       }
//     };
//   }, [liveState, visualizerReady, drawVisualizer]);

//   // --- Envoi des chunks live ---
//   const sendChunk = async (blob: Blob) => {
//     const formData = new FormData();
//     formData.append("audio", blob, "chunk.webm");
//     formData.append("meetingId", meetingId);
//     try {
//       await fetch("/api/transcribe/chunk", { method: "POST", body: formData });
//     } catch (err) {
//       console.error("Erreur envoi chunk:", err);
//     }
//   };

//   // --- Recording controls ---
//   const startRecording = async () => {
//     setCurrentText("Transcription en cours...");
//     try {
//       const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
//       streamRef.current = stream;

//       const context = new AudioContext();
//       audioContextRef.current = context;
//       const source = context.createMediaStreamSource(stream);
//       const analyser = context.createAnalyser();
//       analyser.fftSize = 256;
//       analyserRef.current = analyser;
//       source.connect(analyser);

//       // Signal that visualizer prerequisites are ready
//       setVisualizerReady(true);

//       const mimeType = "audio/webm;codecs=opus";
//       const recorder = new MediaRecorder(stream, { mimeType });
//       mediaRecorderRef.current = recorder;

//       recorder.ondataavailable = (event) => {
//         if (event.data.size > 0 && mediaRecorderRef.current?.state === "recording") {
//           sendChunk(event.data);
//         }
//       };

//       recorder.start(10000);

//       // Set state AFTER everything is ready, avoids race with effect
//       setLiveState(LiveRecordingState.Recording);
//     } catch (error) {
//       console.error("Erreur d'accès au micro:", error);
//       setLiveState(LiveRecordingState.Idle);
//       setVisualizerReady(false);
//     }
//   };

//   const pauseRecording = () => {
//     if (mediaRecorderRef.current?.state === "recording") {
//       mediaRecorderRef.current.pause();
//       setLiveState(LiveRecordingState.Paused);
//     }
//   };

//   const resumeRecording = () => {
//     if (mediaRecorderRef.current?.state === "paused") {
//       mediaRecorderRef.current.resume();
//       setLiveState(LiveRecordingState.Recording);
//     }
//   };

//   const stopRecording = () => {
//     if (liveState !== LiveRecordingState.Recording && liveState !== LiveRecordingState.Paused) return;

//     setLiveState(LiveRecordingState.Finished);
//     setCurrentText("");

//     if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
//       mediaRecorderRef.current.stop();
//     }
//     streamRef.current?.getTracks().forEach((t) => t.stop());
//     if (audioContextRef.current?.state !== "closed") {
//       audioContextRef.current?.close();
//     }
//     if (animationFrameRef.current) {
//       cancelAnimationFrame(animationFrameRef.current);
//       animationFrameRef.current = null;
//     }
//     setVisualizerReady(false);
//   };

//   // --- Édition ---
//   const handleEditEntry = async (entryId: string, newText: string) => {
//     if (!entryId) return;
//     try {
//       const docRef = doc(firestore, `meetings/${firestoreCollectionId}/entries`, entryId);
//       const entry = transcriptEntries.find((e) => e.id === entryId);
//       await updateDoc(docRef, {
//         text: newText,
//         isEdited: true,
//         originalText: entry?.originalText || entry?.text,
//       });
//     } catch (err) {
//       console.error("Erreur de mise à jour:", err);
//     }
//   };

//   // --- Copier / Télécharger ---
//   const getFullText = (includeNames = true) =>
//     transcriptEntries
//       .map((e) => {
//         const time = new Date(e.timestamp).toLocaleString("fr-FR");
//         return includeNames ? `[${time}] ${e.userName}:\n${e.text}` : `${e.text}`;
//       })
//       .join("\n\n");

//   const handleDownload = () => {
//     const text = getFullText(true);
//     const blob = new Blob([text], { type: "text/plain" });
//     const url = URL.createObjectURL(blob);
//     const a = document.createElement("a");
//     a.href = url;
//     a.download = `transcription-${meetingId}.txt`;
//     a.click();
//     URL.revokeObjectURL(url);
//     setDownloaded(true);
//     setTimeout(() => setDownloaded(false), 1200);
//   };

//   const handleCopy = async () => {
//     try {
//       const text = getFullText(false);
//       await navigator.clipboard.writeText(text);
//       setCopied(true);
//       setTimeout(() => setCopied(false), 1200);
//     } catch (e) {
//       console.error("Impossible de copier:", e);
//     }
//   };

//   // --- Analyse IA ---
//   const handleAnalysis = async () => {
//     setIsAnalyzing(true);
//     setAnalysisResult(null);
//     try {
//       const res = await fetch(`/api/meetings/${meetingId}/analyze`, { method: "POST" });
//       const data = await res.json();
//       if (!res.ok) throw new Error(data.error);
//       setAnalysisResult(data);
//     } catch (err: any) {
//       console.error("Erreur analyse IA:", err);
//       setAnalysisResult({ error: err.message });
//     }
//     setIsAnalyzing(false);
//   };

//   // --- Rendu ---
//   const isLoadingFirestore = status === "loading" || (meetingId && loading);

//   const shouldShowLoaderInsteadOfActions =
//     isUploading && !isFirstUploadDone && liveState === LiveRecordingState.Idle;

//   if (status === "loading") {
//     return (
//       <div className="text-center p-10">
//         <p>Chargement de la session...</p>
//         <Loader variant="dots" />
//       </div>
//     );
//   }

//   if (!meetingId) {
//     return <div className="text-center p-10 text-red-500">Erreur : ID de réunion non défini ou invalide.</div>;
//   }

//   if (error) {
//     return <div className="text-center p-10 text-red-500">Erreur: {error.message}</div>;
//   }

//   return (
//     <div className="relative max-w-3xl xl:max-w-5xl mx-auto">
//       <h1 className="text-center text-xl lg:text-2xl font-semibold text-gray-800 dark:text-gray-300 my-4">
//         Réunion: {meetingTitle}
//       </h1>

//       {/* Modale Analyse IA */}
//       {analysisResult && (
//         <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex items-center justify-center p-4">
//           <div className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-300 dark:border-white/10">
//             <ActionButton
//               variant="icon"
//               size="small"
//               onClick={() => setAnalysisResult(null)}
//               className="absolute top-3 right-3"
//             >
//               <XMarkIcon className="size-6" />
//             </ActionButton>
//             <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Analyse de la réunion</h2>
//             {analysisResult.error ? (
//               <p className="text-red-500">{analysisResult.error}</p>
//             ) : (
//               <div className="space-y-4 max-h-[70vh] overflow-y-auto">
//                 <div>
//                   <h3 className="text-lg font-semibold text-blue-600 dark:text-blue-400">Résumé</h3>
//                   <p className="text-gray-700 dark:text-gray-300">{analysisResult.summary}</p>
//                 </div>
//                 <div>
//                   <h3 className="text-lg font-semibold text-blue-600 dark:text-blue-400">Thèmes abordés</h3>
//                   <ul className="list-disc list-inside text-gray-700 dark:text-gray-300">
//                     {analysisResult.themes?.map((t: string, i: number) => <li key={i}>{t}</li>)}
//                   </ul>
//                 </div>
//                 <div>
//                   <h3 className="text-lg font-semibold text-blue-600 dark:text-blue-400">Actions à suivre</h3>
//                   <ul className="list-disc list-inside text-gray-700 dark:text-gray-300">
//                     {analysisResult.actionItems?.map((a: string, i: number) => <li key={i}>{a}</li>)}
//                   </ul>
//                 </div>
//               </div>
//             )}
//           </div>
//         </div>
//       )}

//       {/* Liste des participants */}
//       <div className="flex items-center justify-center gap-2 mb-4">
//         <UserIcon className="size-5 text-gray-600 dark:text-gray-400" />
//         <p className="text-sm text-gray-700 dark:text-gray-300">
//           {participants.map(p => p.name || 'Anonyme').join(', ')}
//         </p>
//       </div>

//       {/* Cadre principal */}
//       <div className="relative p-[1px] bg-gray-300 dark:bg-white/40" style={{ clipPath: "var(--clip-path-squircle-60)" }}>
//         <div className="relative bg-gradient-to-b p-1.5 from-stone-300 to-white dark:bg-gradient-to-b dark:from-[#4E4E4E] dark:to-[#222222] rounded-4xl" style={{ clipPath: "var(--clip-path-squircle-60)" }}>
//           <div className="bg-gradient-to-b from-white/90 to-gray-300/20 dark:bg-gradient-to-b dark:from-[#1E1E1E]/30 dark:to-[#222222]/10 rounded-3xl p-3" style={{ clipPath: "var(--clip-path-squircle-60)" }}>
//             <div className="flex flex-col items-center justify-center">

//               {/* Visualizer */}
//               <div className="w-[95%] h-10 mb-4 rounded-full flex items-center justify-center overflow-hidden bg-gradient-to-br from-gray-200/40 to-gray-300/40 dark:from-[#333333]/60 dark:to-[#2E2E2E]/60 border border-gray-400 dark:border-white/10 shadow-inner">
//                 <canvas
//                   ref={canvasRef}
//                   width={800}
//                   height={40}
//                   className="transition-opacity duration-300 w-full"
//                   style={{
//                     opacity:
//                       liveState === LiveRecordingState.Recording || liveState === LiveRecordingState.Paused
//                         ? 1
//                         : 0.3,
//                   }}
//                 />
//               </div>

//               {/* Zone de transcription */}
//               <div className="relative w-full rounded-4xl overflow-hidden shadow-md">
//                 {(transcriptEntries.length > 0 || currentText) && (
//                   <div className="absolute top-0.5 right-0.5 flex gap-1 z-20">
//                     <ActionButton
//                       variant="icon"
//                       size="small"
//                       onClick={handleAnalysis}
//                       disabled={isAnalyzing || liveState !== LiveRecordingState.Finished}
//                       className="rounded-md"
//                       title="Générer un résumé IA (disponible après l'arrêt)"
//                     >
//                       {isAnalyzing ? <span className="animate-spin">✨</span> : <SparklesIcon className="size-6 mx-auto" />}
//                     </ActionButton>

//                     <ActionButton
//                       variant="icon"
//                       size="small"
//                       onClick={handleCopy}
//                       className="rounded-md"
//                       title="Copier la transcription"
//                     >
//                       {copied ? <CheckIcon className="size-6 mx-auto text-blue-800" /> : <Square2StackIcon className="size-6 mx-auto" />}
//                     </ActionButton>

//                     <ActionButton
//                       variant="icon"
//                       size="small"
//                       onClick={handleDownload}
//                       className="rounded-md rounded-tr-4xl"
//                       title="Télécharger le .txt"
//                     >
//                       {downloaded ? <CheckIcon className="size-6 mx-auto text-blue-800" /> : <ArrowDownTrayIcon className="size-6 mx-auto" />}
//                     </ActionButton>
//                   </div>
//                 )}

//                 {/* Affichage messagerie + édition */}
//                 <div ref={messagesEndRef}>
//                   <TranscriptionDisplay
//                     entries={transcriptEntries}
//                     currentUserId={session?.user?.id}
//                     currentText={currentText}
//                     onEdit={handleEditEntry}
//                   />

//                   {/* Loader dots pour uploads suivants */}
//                   {isUploading && isFirstUploadDone && !currentText && (
//                     <div className="flex justify-center py-4 animate-fadeInUp">
//                       <Loader variant="dots" />
//                     </div>
//                   )}
//                 </div>
//               </div>

//               {/* Barre d'actions */}
//               <div className="transition-all duration-700 ease-in-out mt-4 w-full">
//                 {shouldShowLoaderInsteadOfActions ? (
//                   <div className="animate-fadeInUp">
//                     <Loader variant="both" progress={progress} />
//                   </div>
//                 ) : (
//                   <ActionBars
//                     liveState={LiveRecordingState[liveState] as "Recording" | "Paused" | "Idle" | "Finished"}
//                     isLoading={false}
//                     progress={isUploading ? progress : 0}
//                     onStart={startRecording}
//                     onPause={pauseRecording}
//                     onResume={resumeRecording}
//                     onStop={stopRecording}
//                     onUploadChange={handleUploadChange}
//                   />
//                 )}
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }



// 'use client';

// import { useState, useRef, useEffect, useCallback } from "react";
// import { useSession } from "next-auth/react";
// import { useCollection } from "react-firebase-hooks/firestore";
// import { firestore } from "@/app/lib/firestore-client";
// import { collection, query, orderBy, doc, updateDoc } from "firebase/firestore";
// import Loader from "@/app/ui/Loader";
// import { ActionBars } from "@/app/ui/ActionBars";
// import { TranscriptionDisplay, TranscriptEntry } from "@/app/ui/TranscriptionDisplay";
// import { ArrowDownTrayIcon, Square2StackIcon, CheckIcon, SparklesIcon, XMarkIcon } from "@heroicons/react/24/outline";
// import { ActionButton } from "@/app/ui/ActionButton"; 
// import { UserIcon } from "@heroicons/react/24/solid";

// // États de l'enregistrement
// enum LiveRecordingState {
//     Idle,
//     Recording,
//     Paused,
//     Finished,
// }

// type ParticipantUser = {
//     id: string;
//     name: string | null;
// };

// export default function MeetingPageClient({ meetingId, meetingTitle }: { meetingId: string, meetingTitle: string }) {
//     // --- États & Session ---
//     const { data: session, status } = useSession({ required: true });
//     const [liveState, setLiveState] = useState(LiveRecordingState.Idle);

//     // --- Firestore & Transcription ---
//     const firestoreCollectionId = meetingId;
//     const [entriesSnapshot, loading, error] = useCollection(
//         meetingId ?
//         query(
//         collection(firestore, `meetings/${firestoreCollectionId}/entries`),
//         orderBy("timestamp", "asc")
//         )
//         : null // Si meetingId est null/undefined, n'exécutez rien
//     );

//     const transcriptEntries: TranscriptEntry[] =
//         entriesSnapshot?.docs.map((d) => ({ id: d.id, ...d.data() } as TranscriptEntry)) || [];

//     // --- UI ---
//     const [copied, setCopied] = useState(false);
//     const [downloaded, setDownloaded] = useState(false);
//     const [isAnalyzing, setIsAnalyzing] = useState(false);
//     const [analysisResult, setAnalysisResult] = useState<any>(null);
//     const [participants, setParticipants] = useState<ParticipantUser[]>([]);

//     // const [progress, setProgress] = useState(0);
//     // const [loading, setLoading] = useState(true);

//     // --- Références Audio ---
//     const mediaRecorderRef = useRef<MediaRecorder | null>(null);
//     const audioContextRef = useRef<AudioContext | null>(null);
//     const analyserRef = useRef<AnalyserNode | null>(null);
//     const streamRef = useRef<MediaStream | null>(null);
//     const canvasRef = useRef<HTMLCanvasElement | null>(null);
//     const animationFrameRef = useRef<number | null>(null);
//     const messagesEndRef = useRef<HTMLDivElement | null>(null);

//     // --- Récupération des participants ---
//     useEffect(() => {
//         const fetchParticipants = async () => {
//             try {
//             const res = await fetch(`/api/meetings/${meetingId}/participants`);
//             if (res.ok) {
//                 const data = await res.json();
//                 setParticipants(data);
//             }
//             } catch (err) {
//             console.error("Erreur fetch participants:", err);
//             }
//         };
        
//         fetchParticipants();
//     }, [meetingId]);


//     // useEffect(() => {
//     //     if (!loading) return;
//     //     setProgress(0);
//     //     const totalDuration = 4000;
//     //     const intervalTime = 20;
//     //     const increment = 100 / (totalDuration / intervalTime);
//     //     const interval = setInterval(() => {
//     //     setProgress((prev) => {
//     //         if (prev >= 100) {
//     //         clearInterval(interval);
//     //         setLoading(false);
//     //         return 100;
//     //         }
//     //         return prev + increment;
//     //     });
//     //     }, intervalTime);
//     //     return () => clearInterval(interval);
//     // }, [loading]);

//     // --- Défilement auto ---
//     useEffect(() => {
//         if (messagesEndRef.current) {
//         messagesEndRef.current.scrollTop = messagesEndRef.current.scrollHeight;
//         }
//     }, [transcriptEntries]);

//     // --- Nettoyage ---
//     useEffect(() => {
//         return () => {
//         if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
//         streamRef.current?.getTracks().forEach((t) => t.stop());
//         if (audioContextRef.current?.state !== "closed") {
//             audioContextRef.current?.close();
//         }
//         };
//     }, []);

//     // --- Upload fichier ---
//     const handleUploadChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
//         const file = e.target.files?.[0];
//         e.target.value = "";
//         if (!file) return;

//         const formData = new FormData();
//         formData.append("audio", file);
//         formData.append("meetingId", meetingId);

//         try {
//         const res = await fetch("/api/transcribe/file", {
//             method: "POST",
//             body: formData,
//         });
//         const data = await res.json();
//         if (!res.ok) throw new Error(data.error || "Erreur lors de l'upload");
//         console.log("Fichier transcrit:", data.text);
//         // L'API doit ajouter l'entrée Firestore serveur-side → affichage auto via useCollection
//         } catch (err) {
//         console.error("Erreur upload fichier:", err);
//         }
//     };

//     // --- Visualizer ---
//     const drawVisualizer = useCallback(() => {
//         if (!analyserRef.current || !canvasRef.current || liveState === LiveRecordingState.Idle) return;
//         const analyser = analyserRef.current;
//         const canvas = canvasRef.current;
//         const ctx = canvas.getContext("2d");
//         const dataArray = new Uint8Array(analyser.frequencyBinCount);

//         const draw = () => {
//         if (liveState !== LiveRecordingState.Recording && liveState !== LiveRecordingState.Paused) {
//             if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
//             if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
//             return;
//         }
//         animationFrameRef.current = requestAnimationFrame(draw);
//         analyser.getByteFrequencyData(dataArray);

//         if (ctx && canvas) {
//             ctx.clearRect(0, 0, canvas.width, canvas.height);
//             const barWidth = (canvas.width / dataArray.length) * 1.5;
//             let x = 0;
//             const total = dataArray.reduce((s, v) => s + v, 0);
//             if (total < dataArray.length * 2) {
//             ctx.fillStyle = "rgba(255,255,255,0.08)";
//             ctx.fillRect(0, canvas.height / 2, canvas.width, 1);
//             } else {
//             for (let i = 0; i < dataArray.length; i++) {
//                 const barHeight = dataArray[i] / 2;
//                 const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
//                 grad.addColorStop(0, "#60a5fa");
//                 grad.addColorStop(1, "#a78bfa");
//                 ctx.fillStyle = grad;
//                 ctx.fillRect(x, canvas.height / 2 - barHeight / 2, barWidth, barHeight);
//                 x += barWidth + 1;
//             }
//             }
//         }
//         };
//         draw();
//     }, [liveState]);

//     // --- Envoi des chunks live ---
//     const sendChunk = async (blob: Blob) => {
//         const formData = new FormData();
//         formData.append("audio", blob, "chunk.webm");
//         formData.append("meetingId", meetingId);
//         try {
//         await fetch("/api/transcribe/chunk", { method: "POST", body: formData });
//         } catch (err) {
//         console.error("Erreur envoi chunk:", err);
//         }
//     };

//     // --- Recording controls ---
//     const startRecording = async () => {
//         setLiveState(LiveRecordingState.Recording);
//         try {
//         const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
//         streamRef.current = stream;

//         const context = new AudioContext();
//         audioContextRef.current = context;
//         const source = context.createMediaStreamSource(stream);
//         const analyser = context.createAnalyser();
//         analyser.fftSize = 256;
//         analyserRef.current = analyser;
//         source.connect(analyser);
//         drawVisualizer();

//         const mimeType = "audio/webm;codecs=opus";
//         const recorder = new MediaRecorder(stream, { mimeType });
//         mediaRecorderRef.current = recorder;

//         recorder.ondataavailable = (event) => {
//             if (event.data.size > 0 && mediaRecorderRef.current?.state === "recording") {
//             sendChunk(event.data);
//             }
//         };

//         recorder.start(10000);
//         } catch (error) {
//         console.error("Erreur d'accès au micro:", error);
//         setLiveState(LiveRecordingState.Idle);
//         }
//     };

//     const pauseRecording = () => {
//         if (mediaRecorderRef.current?.state === "recording") {
//         mediaRecorderRef.current.pause();
//         setLiveState(LiveRecordingState.Paused);
//         }
//     };

//     const resumeRecording = () => {
//         if (mediaRecorderRef.current?.state === "paused") {
//         mediaRecorderRef.current.resume();
//         setLiveState(LiveRecordingState.Recording);
//         }
//     };

//     const stopRecording = () => {
//         if (liveState !== LiveRecordingState.Recording && liveState !== LiveRecordingState.Paused) return;

//         setLiveState(LiveRecordingState.Finished);

//         if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
//         mediaRecorderRef.current.stop();
//         }
//         streamRef.current?.getTracks().forEach((t) => t.stop());
//         if (audioContextRef.current?.state !== "closed") {
//         audioContextRef.current?.close();
//         }
//         if (animationFrameRef.current) {
//         cancelAnimationFrame(animationFrameRef.current);
//         animationFrameRef.current = null;
//         }
//     };

//     // --- Édition ---
//     const handleEditEntry = async (entryId: string, newText: string) => {
//         if (!entryId) return;
//         try {
//         const docRef = doc(firestore, `meetings/${firestoreCollectionId}/entries`, entryId);
//         const entry = transcriptEntries.find((e) => e.id === entryId);
//         await updateDoc(docRef, {
//             text: newText,
//             isEdited: true,
//             originalText: entry?.originalText || entry?.text,
//         });
//         } catch (err) {
//         console.error("Erreur de mise à jour:", err);
//         }
//     };

//     // --- Copier / Télécharger ---
//     const getFullText = (includeNames = true) =>
//         transcriptEntries
//         .map((e) => {
//             const time = new Date(e.timestamp).toLocaleString("fr-FR");
//             return includeNames ? `[${time}] ${e.userName}:\n${e.text}` : `${e.text}`;
//         })
//         .join("\n\n");

//     const handleDownload = () => {
//         const text = getFullText(true);
//         const blob = new Blob([text], { type: "text/plain" });
//         const url = URL.createObjectURL(blob);
//         const a = document.createElement("a");
//         a.href = url;
//         a.download = `transcription-${meetingId}.txt`;
//         a.click();
//         URL.revokeObjectURL(url);
//         setDownloaded(true);
//         setTimeout(() => setDownloaded(false), 1200);
//     };

//     const handleCopy = async () => {
//         try {
//         const text = getFullText(false);
//         await navigator.clipboard.writeText(text);
//         setCopied(true);
//         setTimeout(() => setCopied(false), 1200);
//         } catch (e) {
//         console.error("Impossible de copier:", e);
//         }
//     };

//     // --- Analyse IA ---
//     const handleAnalysis = async () => {
//         setIsAnalyzing(true);
//         setAnalysisResult(null);
//         try {
//         const res = await fetch(`/api/meetings/${meetingId}/analyze`, { method: "POST" });
//         const data = await res.json();
//         if (!res.ok) throw new Error(data.error);
//         setAnalysisResult(data);
//         } catch (err: any) {
//         console.error("Erreur analyse IA:", err);
//         setAnalysisResult({ error: err.message });
//         }
//         setIsAnalyzing(false);
//     };

//     // --- Rendu ---
//     const isLoading = status === "loading" || (meetingId && loading);

//     if (status === "loading") return <div className="text-center p-10"><p>Chargement de la session...</p><Loader variant="dots" /></div>;

//     // Gérer l'ID manquant AVANT le reste
//     if (!meetingId) {
//         return <div className="text-center p-10 text-red-500">Erreur : ID de réunion non défini ou invalide.</div>
//     }

//     // const isLoading = status === "loading" || loading;
//     if (isLoading) return <div className="text-center p-10"><p>Chargement de la réunion</p><Loader variant="dots" /></div>;
//     if (error) return <div className="text-center p-10 text-red-500">Erreur: {error.message}</div>;

//     return (
//         <div className="relative max-w-3xl xl:max-w-5xl mx-auto">
//         <h1 className="text-center text-xl lg:text-2xl font-semibold text-gray-800 dark:text-gray-300 my-4">
//             Réunion: {meetingTitle}
//         </h1>

//         {/* Modale Analyse IA */}
//         {analysisResult && (
//             <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex items-center justify-center p-4">
//             <div className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-300 dark:border-white/10">
//                 <ActionButton
//                     variant="icon"
//                     size="small"
//                     onClick={() => setAnalysisResult(null)}
//                     className="absolute top-3 right-3"
//                 >
//                     <XMarkIcon className="size-6" />
//                 </ActionButton>
//                 <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Analyse de la réunion</h2>
//                 {analysisResult.error ? (
//                 <p className="text-red-500">{analysisResult.error}</p>
//                 ) : (
//                 <div className="space-y-4 max-h-[70vh] overflow-y-auto">
//                     <div>
//                     <h3 className="text-lg font-semibold text-blue-600 dark:text-blue-400">Résumé</h3>
//                     <p className="text-gray-700 dark:text-gray-300">{analysisResult.summary}</p>
//                     </div>
//                     <div>
//                     <h3 className="text-lg font-semibold text-blue-600 dark:text-blue-400">Thèmes abordés</h3>
//                     <ul className="list-disc list-inside text-gray-700 dark:text-gray-300">
//                         {analysisResult.themes?.map((t: string, i: number) => <li key={i}>{t}</li>)}
//                     </ul>
//                     </div>
//                     <div>
//                     <h3 className="text-lg font-semibold text-blue-600 dark:text-blue-400">Actions à suivre</h3>
//                     <ul className="list-disc list-inside text-gray-700 dark:text-gray-300">
//                         {analysisResult.actionItems?.map((a: string, i: number) => <li key={i}>{a}</li>)}
//                     </ul>
//                     </div>
//                 </div>
//                 )}
//             </div>
//             </div>
//         )}

//         {/* Liste des participants */}
//         <div className="flex items-center justify-center gap-2 mb-4">
//             <UserIcon className="size-5 text-gray-600 dark:text-gray-400" />
//             <p className="text-sm text-gray-700 dark:text-gray-300">
//                 {participants.map(p => p.name || 'Anonyme').join(', ')}
//             </p>
//         </div>

//         {/* Cadre principal */}
//         <div className="relative p-[1px] bg-gray-300 dark:bg-white/40" style={{ clipPath: "var(--clip-path-squircle-60)" }}>
//             <div className="relative bg-gradient-to-b p-1.5 from-stone-300 to-white dark:bg-gradient-to-b dark:from-[#4E4E4E] dark:to-[#222222] rounded-4xl" style={{ clipPath: "var(--clip-path-squircle-60)" }}>
//             <div className="bg-gradient-to-b from-white/90 to-gray-300/20 dark:bg-gradient-to-b dark:from-[#1E1E1E]/30 dark:to-[#222222]/10 rounded-3xl p-3" style={{ clipPath: "var(--clip-path-squircle-60)" }}>
//                 <div className="flex flex-col items-center justify-center">

//                 {/* Visualizer (interne) */}
//                 <div className="w-[95%] h-10 mb-4 rounded-full flex items-center justify-center overflow-hidden bg-gradient-to-br from-gray-200/40 to-gray-300/40 dark:from-[#333333]/60 dark:to-[#2E2E2E]/60 border border-gray-400 dark:border-white/10 shadow-inner">
//                     <canvas
//                     ref={canvasRef}
//                     width={800}
//                     height={40}
//                     className="transition-opacity duration-300 w-full"
//                     style={{ opacity: liveState === LiveRecordingState.Recording || liveState === LiveRecordingState.Paused ? 1 : 0.3 }}
//                     />
//                 </div>

//                 {/* Zone de transcription */}
//                 <div className="relative w-full rounded-4xl overflow-hidden shadow-md">
//                 {/* <div className="relative w-full rounded-4xl overflow-hidden shadow-md border border-gray-400 dark:border-white/10 bg-gradient-to-b from-gray-200/80 to-gray-200/40 dark:bg-gradient-to-b dark:from-[#222222]/80 dark:to-[#2E2E2E]/40"> */}

//                     {/* Boutons d'action sur la transcription */}
//                     {transcriptEntries.length > 0 && (
//                         <div className="absolute top-0.5 right-0.5 flex gap-1 z-20">
//                             <button
//                                 onClick={handleAnalysis}
//                                 disabled={isAnalyzing || liveState !== LiveRecordingState.Finished}
//                                 className="p-2 text-xs rounded-md bg-white/70 dark:bg-white/10 hover:bg-white/20 text-gray-700 dark:text-white backdrop-blur shadow-lg disabled:opacity-50"
//                                 title="Générer un résumé IA (disponible après l'arrêt)"
//                             >
//                                 {isAnalyzing ? <span className="animate-spin">✨</span> : <SparklesIcon className="size-6 mx-auto" />}
//                             </button>

//                             <button
//                                 onClick={handleCopy}
//                                 className="p-2 text-xs rounded-md bg-white/70 dark:bg-white/10 hover:bg-white/20 text-gray-700 dark:text-white backdrop-blur shadow-lg"
//                                 title="Copier la transcription"
//                             >
//                                 {copied ? <CheckIcon className="size-6 mx-auto text-blue-800" /> : <Square2StackIcon className="size-6 mx-auto" />}
//                             </button>

//                             <button
//                                 onClick={handleDownload}
//                                 className="p-2 text-xs rounded-md rounded-tr-4xl bg-white/70 dark:bg-white/10 hover:bg-white/20 text-gray-700 dark:text-white backdrop-blur shadow-lg"
//                                 title="Télécharger le .txt"
//                             >
//                                 {downloaded ? <CheckIcon className="size-6 mx-auto text-blue-800" /> : <ArrowDownTrayIcon className="size-6 mx-auto" />}
//                             </button>
//                         </div>
//                     )}

//                     {/* Affichage messagerie + édition */}
//                     <div ref={messagesEndRef} className="">
//                     <TranscriptionDisplay
//                         entries={transcriptEntries}
//                         currentUserId={session?.user?.id}
//                         onEdit={handleEditEntry}
//                     />
//                     </div>
//                 </div>

//                 {/* Barre d'actions (Start/Stop/Pause/Upload) */}
//                 <ActionBars
//                     liveState={LiveRecordingState[liveState] as 'Recording' | 'Paused' | 'Idle' | 'Finished'}
//                     isLoading={false}
//                     progress={0}
//                     onStart={startRecording}
//                     onPause={pauseRecording}
//                     onResume={resumeRecording}
//                     onStop={stopRecording}
//                     onUploadChange={handleUploadChange}
//                 />
//                 </div>
//             </div>
//             </div>
//         </div>
//         </div>
//     );
// }