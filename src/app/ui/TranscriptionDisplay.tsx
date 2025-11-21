'use client';

import React, { useRef, useEffect, useState } from 'react';
import { PencilIcon, CheckIcon, XMarkIcon, CheckCircleIcon } from "@heroicons/react/24/solid";
import Loader from "@/app/ui/Loader";
import { ActionButton } from '@/app/ui/ActionButton'; 

export type TranscriptEntry = {
    id: string;
    userId: string;
    userName: string;
    text: string;
    originalText?: string;
    isEdited: boolean;
    timestamp: number;
};

interface TranscriptionDisplayProps {
    entries: TranscriptEntry[];
    currentUserId?: string;
    currentText?: string;
    onEdit: (entryId: string, newText: string) => Promise<void>;
    isProcessingChunk?: boolean;
}

// --- EditableEntry ---
const EditableEntry = ({
    entry,
    isOwnMessage,
    onSave,
    onEditingStatusChange,
}: {
    entry: TranscriptEntry;
    isOwnMessage: boolean;
    onSave: (entryId: string, newText: string) => Promise<void>;
    onEditingStatusChange: (isEditing: boolean) => void;
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(entry.text);
    const [isLoading, setIsLoading] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    // Change l'état d'édition et prévient le parent
    const setEditingState = (state: boolean) => {
        setIsEditing(state);
        onEditingStatusChange(state);
    };

    const handleSave = async () => {
        setIsLoading(true);
        try {
            await onSave(entry.id, editText);
            
            setIsLoading(false);
            setShowSuccess(true);
            
            // Attend 3 secondes avant de fermer le mode édition
            setTimeout(() => {
                setShowSuccess(false);
                setEditingState(false);
            }, 3000);

        } catch (error) {
            console.error("Erreur lors de la sauvegarde", error);
            setIsLoading(false);
        }
    };

    const handleCancel = () => {
        setEditText(entry.text);
        setEditingState(false);
        setShowSuccess(false);
    };

    const time = new Date(entry.timestamp).toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
    });

    const bgColor = isOwnMessage
        ? "bg-blue-100 dark:bg-blue-900/40"
        : "bg-gray-100 dark:bg-gray-800/70";

    return (
        <div
            className={`relative sm:max-w-[90%] rounded-xl sm:rounded-3xl p-3 sm:px-5 mb-3 mt-1 border border-gray-300 dark:border-white/10 shadow-xl dark:shadow-[0_8px_10px_rgb(0,0,0,0.7)] transition-all duration-600 ease-out ${bgColor} ${
                isOwnMessage ? "ml-auto" : "mr-auto"
            } animate-fadeInUp`}
            >
            <p className="flex justify-between items-center mb-1">
                <span className="text-sm font-bold text-gray-900 dark:text-blue-300">{entry.userName}</span>
                <span className="text-xs text-gray-500 dark:text-white/50 ml-3">{time}</span>
            </p>

            {isEditing ? (
                <div className="flex flex-col gap-2">
                    <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="w-full p-2 rounded border border-gray-300 dark:border-white/20 dark:bg-gray-700 dark:text-white"
                        rows={6}
                        disabled={isLoading || showSuccess}
                    />
                    <div className="flex gap-2 justify-end items-center min-h-[32px]">
                        {showSuccess ? (
                            // Affiche le message de succès
                            <div className="flex items-center gap-1 text-green-600 dark:text-green-400 animate-pulse font-medium text-sm">
                                <CheckCircleIcon className="size-5" />
                                <span>Texte modifié !</span>
                            </div>
                        ) : (
                            // Affiche les boutons
                            <>
                                <ActionButton
                                    variant="icon"
                                    size="small"
                                    onClick={handleCancel}
                                    disabled={isLoading}
                                >
                                    <XMarkIcon className="size-5" />
                                </ActionButton>
                                <ActionButton
                                    variant="icon"
                                    size="small"
                                    onClick={handleSave}
                                    isLoading={isLoading}
                                >
                                    {!isLoading && <CheckIcon className="size-5 text-green-500" />}
                                </ActionButton>
                            </>
                        )}
                    </div>
                </div>
            ) : (
                <p className="whitespace-pre-wrap text-gray-900 dark:text-white/90 text-sm md:text-base">
                    {entry.text}
                    {entry.isEdited && (
                        <span className="text-xs text-gray-400 italic"> (modifié)</span>
                    )}
                </p>
            )}

            {isOwnMessage && !isEditing && (
                <ActionButton
                    variant="icon"
                    size="small"
                    onClick={() => setEditingState(true)}
                    title="Modifier le texte"
                    className="absolute -bottom-1.5 -right-1.5"
                >
                    <PencilIcon className="size-3" />
                </ActionButton>
            )}
        </div>
    );
};

// --- TranscriptionDisplay ---
export const TranscriptionDisplay = ({
    entries,
    currentUserId,
    currentText,
    onEdit,
    isProcessingChunk = false,
}: TranscriptionDisplayProps) => {
    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    // Bloque le scroll quand c'est le code qui scroll
    const isAutoScrolling = useRef(false);

    const [displayedP, setDisplayedP] = useState("");
    // Savoir si scroll manuel vers le haut
    const [userHasScrolledUp, setUserHasScrolledUp] = useState(false);
    // Savoir si message en cours d'édition
    const [isAnyEntryEditing, setIsAnyEntryEditing] = useState(false);

    const fullPText = "L'enregistrement n'a pas commencé ou aucun participant ne parle\nUploadez un fichier en cliquant sur le bouton *+* ou démarrer un enregistrement";

    // --- Gère le scroll manuel ---
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        // Ignore si le code qui scroll
        if (isAutoScrolling.current) return;

        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        
        // En bas à moins de 50px du fond
        const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;

        if (isAtBottom) {
            // Si en bas, réactive l'auto-scroll
            setUserHasScrolledUp(false);
        } else {
            // Si remonté, désactive l'auto-scroll
            setUserHasScrolledUp(true);
        }
    };

    // --- Animation de P typeWriter ---
    useEffect(() => {
        setDisplayedP("");
        let index = 0;
        const interval = setInterval(() => {
            setDisplayedP(fullPText.slice(0, index + 1));
            index++;
            if (index === fullPText.length) {
                clearInterval(interval);
            }
        }, 50); 
        return () => clearInterval(interval);
    }, [fullPText]);

    // --- Auto-Scroll ---
    useEffect(() => {
        // Pas de scroll si remonté manuel, si  message en édition
        if (userHasScrolledUp || isAnyEntryEditing) {
            return;
        }

        if (messagesEndRef.current) {
            isAutoScrolling.current = true;
            // Scroll vers le bas
            messagesEndRef.current.scrollTo({
                top: messagesEndRef.current.scrollHeight,
                behavior: 'smooth' 
            });

            // Désactive le flag après l'animation
            const timeout = setTimeout(() => {
                isAutoScrolling.current = false;
            }, 500);
            
            return () => clearTimeout(timeout);
        }
    }, [entries, currentText, userHasScrolledUp, isAnyEntryEditing, isProcessingChunk]);

    return (
        <div
            ref={messagesEndRef}
            onScroll={handleScroll}
            className="space-y-3 w-full max-md:h-100 md:h-72 xl:h-90 overflow-y-auto p-2 xl:p-2.5 rounded-2xl sm:rounded-4xl shadow-md border border-gray-400 dark:border-white/10 bg-gradient-to-b from-gray-200/80 to-gray-200/40 dark:bg-gradient-to-b dark:from-[#222222]/80 dark:to-[#2E2E2E]/40"
        >
            {entries.length === 0 && !currentText && (
                <div className="text-gray-600 dark:text-white/70 p-3 text-sm text-center drop-shadow-lg">
                    {displayedP.split("\n").map((line, i, arr) => (<div key={i} >{line} {i === arr.length - 1 && <span className="animate-pulse font-extralight">|</span>}</div> ))}
                </div>
            )}

            {entries.map((entry) => (
                <EditableEntry
                    key={entry.id}
                    entry={entry}
                    isOwnMessage={entry.userId === currentUserId}
                    onSave={onEdit}
                    onEditingStatusChange={setIsAnyEntryEditing}
                />
            ))}

            {currentText && (
                <>
                    <div className="max-w-[85%] p-3 rounded-2xl shadow-md ml-auto bg-blue-200 dark:bg-blue-600 text-gray-900 dark:text-white animate-pulse transition-all duration-500">
                        <p className="flex justify-between items-center mb-1">
                            <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Vous</span>
                            <span className="text-[10px] text-gray-400 ml-2">
                                {isProcessingChunk ? "Analyse en cours..." : "En cours..."}
                            </span>
                        </p>
                        <p className="whitespace-pre-wrap text-sm">{isProcessingChunk ? "Traitement du segment audio..." :currentText}</p>
                    </div>
                    <Loader variant="dots"className={isProcessingChunk ? "text-purple-500" : "text-gray-500"} />
                </>
            )}
        </div>
    );
};