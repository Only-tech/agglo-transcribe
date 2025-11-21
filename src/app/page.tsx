'use client';

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronUpIcon, ClockIcon } from '@heroicons/react/16/solid';
import Loader from "@/app/ui/Loader";
import { ActionButton, UploadButton } from "@/app/ui/ActionButton";
import { TranscriptionDisplay, TranscriptEntry } from "@/app/ui/TranscriptionDisplay";
import { ArrowDownTrayIcon, CheckIcon } from "@heroicons/react/24/outline";
import { MicrophoneIcon, MicrophoneSlashIcon } from '@/app/ui/Icons';

export default function HomePage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    // --- Intro ---
    const [progress, setProgress] = useState(0);
    const [showIntro, setShowIntro] = useState(true);
    const [displayedText, setDisplayedText] = useState("");
    const fullText = "Empowering Meetings and Ideas\nBecause Every Word Matters";
    const [displayedH3, setDisplayedH3] = useState("");
    const fullH3Text = "Transformez vos réunions, Imagez la parole";

    // --- transcription ---
    const [sessions, setSessions] = useState<TranscriptEntry[]>([]);
    const [currentText, setCurrentText] = useState("");
    const [isFirstUploadDone, setIsFirstUploadDone] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [downloaded, setDownloaded] = useState(false);

    // --- Animations intro ---
    useEffect(() => {
        let index = 0;
        const interval = setInterval(() => {
        setDisplayedText(fullText.slice(0, index + 1));
        index++;
        if (index === fullText.length) clearInterval(interval);
        }, 40);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (!showIntro) return;
        setProgress(0);
        const totalDuration = 4000;
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

    useEffect(() => {
        if (showIntro) return;
        setDisplayedH3("");
        let index = 0;
        const interval = setInterval(() => {
        setDisplayedH3(fullH3Text.slice(0, index + 1));
        index++;
        if (index === fullH3Text.length) clearInterval(interval);
        }, 50);
        return () => clearInterval(interval);
    }, [showIntro]);

    useEffect(() => {
        if (status === "authenticated" && session?.user) {
        router.replace("/dashboard");
        }
    }, [status, session, router]);

    // --- Handler upload démo ---
    const handleDemoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;

        setIsUploading(true);
        setCurrentText("Transcription en cours..."); 

        try {
        const formData = new FormData();
        formData.append("audio", file);

        const res = await fetch("/api/transcribe/demo", {
            method: "POST",
            body: formData,
        });
        const data = await res.json();

        if (data.text) {
            const newEntry: TranscriptEntry = {
            id: crypto.randomUUID(),
            userId: "demo",
            userName: "Vite fait 😉",
            text: data.text,
            isEdited: false,
            timestamp: Date.now(),
            };
            setSessions((prev) => [...prev, newEntry]);
            setCurrentText(""); 
        }

        if (!isFirstUploadDone) setIsFirstUploadDone(true);
        } catch (err) {
        console.error("Erreur démo upload:", err);
        setCurrentText("");
        } finally {
        setIsUploading(false);
        }
    };

    const handleDemoEdit = async (entryId: string, newText: string) => {
        setSessions(prev =>
            prev.map(e => e.id === entryId ? { ...e, text: newText, isEdited: true } : e)
        );
    };

    const handleDownload = () => {
        const text = sessions
            .map((e) => {
            const time = new Date(e.timestamp).toLocaleString("fr-FR");
            return `[${time}] ${e.userName}:\n${e.text}`;
            })
            .join("\n\n");

        const blob = new Blob([text], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `transcription-demo.txt`;
        a.click();
        URL.revokeObjectURL(url);
        setDownloaded(true);
        setTimeout(() => setDownloaded(false), 1200);
    };

    // --- Rendu ---
    if (status === "loading") {
        return <div className="text-center p-10"><p>Chargement</p><Loader variant="dots" /></div>;
    }

    if (status === "authenticated") {
        return <div className="text-center p-10"><p>Redirection vers le dashboard</p><Loader variant="dots" /></div>;
    }

    // Page publique, pas de connexion
    return (
        <>
            {showIntro ? (
                <section className="text-center p-6 animate-fadeInUp">
                <h1 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white/90 mb-10 leading-20">
                    {displayedText.split("\n").map((line, i, arr) => (
                        <div key={i}>
                            {line}{" "}
                            {i === arr.length - 1 && (
                                <span className="animate-pulse font-extralight">|</span>
                            )}
                        </div>
                    ))}
                </h1>
                <Loader variant="both" progress={progress} />
                </section>
            ) : (
                <section className="w-full animate-fadeInUp">
                    <h3 className="text-center text-xl lg:text-2xl font-semibold text-gray-800 dark:text-gray-300 drop-shadow-lg my-4">
                        {displayedH3}
                        <span className="animate-pulse font-extralight">|</span>
                    </h3>

                    <div className="mt-8 flex flex-col items-center gap-6 w-full max-w-3xl xl:max-w-4xl mx-auto">
                        <p className="text-gray-600 dark:text-gray-300 text-center max-w-xl">
                            Essayez la démo publique en uploadant un fichier audio, ou connectez-vous
                            pour créer vos propres réunions.
                        </p>

                        {/* Loader pour premier upload */}
                        <div className="transition-all duration-700 ease-in-out">
                            {!isFirstUploadDone ? (
                                isUploading ? (
                                    <div className="animate-fadeInUp">
                                        <Loader variant="both" progress={progress} />
                                    </div>
                                ) : (
                                    <div className="flex gap-6 animate-fadeInUp">
                                        <UploadButton
                                            onFileSelected={handleDemoUpload}
                                            title="Uploader un fichier audio (démo)"
                                        />
                                        <ActionButton
                                            variant="primary-slide"
                                            size="normal"
                                            onClick={() => router.push("/api/auth/signin")}
                                            className="!w-45 !rounded-full"
                                        >
                                            <span>Se connecter</span>
                                            <ChevronUpIcon className="inline-block size-6 -mr-4 rotate-90 animate-bounce group-hover:animate-none"/>
                                        </ActionButton>
                                    </div>
                                )
                            ) : (
                                <div className="flex gap-6 animate-fadeInUp">
                                    {(sessions.length > 0 || currentText) && (
                                        <ActionButton
                                            variant="icon"
                                            size="small"
                                            onClick={handleDownload}
                                            className="size-12"
                                            title="Télécharger le .txt"
                                        >
                                            {downloaded ? <CheckIcon className="size-6 mx-auto text-blue-800" /> : <ArrowDownTrayIcon className="size-6 mx-auto" />}
                                        </ActionButton>
                                    )}

                                    <UploadButton
                                        onFileSelected={handleDemoUpload}
                                        title="Uploader un autre fichier"
                                    />
                                    <ActionButton
                                        variant="primary"
                                        size="normal"
                                        onClick={() => router.push("/api/auth/signin")}
                                        className="!w-45 !rounded-full"
                                    >
                                        <span>Se connecter</span>
                                        <ChevronUpIcon className="inline-block size-6 -mr-4 rotate-90 animate-bounce group-hover:animate-none"/>
                                    </ActionButton>
                                </div>
                            )}
                        </div>

                        {/* Affichage de la transcription sans connexion */}
                        {(sessions.length > 0 || currentText) && (
                            <div className="mt-4 w-full rounded-2xl md:rounded-4xl overflow-hidden shadow-[0_12px_15px_rgb(0,0,0,0.3)] dark:shadow-[0_12px_15px_rgb(0,0,0,0.9)] mx-auto transition-all duration-600 ease-out">
                                <TranscriptionDisplay
                                entries={sessions}
                                currentText={currentText}
                                currentUserId="demo"
                                onEdit={handleDemoEdit}
                                />

                                {/* Loader dots pour uploads suivants */}
                                {isUploading && isFirstUploadDone && !currentText && (
                                <div className="flex justify-center py-4 animate-fadeInUp">
                                    <Loader variant="dots" />
                                </div>
                                )}
                            </div>
                        )}
                    </div>
                </section>
            )}
        </>
    );
}
