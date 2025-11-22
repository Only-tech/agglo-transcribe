'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ActionButton, UploadButton } from '@/app/ui/ActionButton';
import { MicrophoneIcon, MicrophoneSlashIcon } from '@/app/ui/Icons';
import Loader from '@/app/ui/Loader';
import { PaperAirplaneIcon, StopIcon, ClockIcon } from '@heroicons/react/24/solid';
import { PlayIcon } from '@heroicons/react/16/solid';

interface ActionBarsProps {
    liveState: 'Recording' | 'Paused' | 'Idle' | 'Finished';
    isLoading: boolean;
    progress: number;
    isFileUploaded?: boolean;
    onStart: (timeslice?: number) => void;
    onPause: () => void;
    onResume: () => void;
    onStop: () => void;
    onUploadChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onFinalize?: () => void;
    isSendingEmail?: boolean;

}

export const ActionBars = ({ liveState, isLoading, progress, isFileUploaded = false, onStart, onPause, onResume, onStop, onUploadChange, onFinalize, isSendingEmail = false, }: ActionBarsProps) => {
    const isRecording = liveState === 'Recording';
    const isPaused = liveState === 'Paused';
    const showBottomBar = isRecording || isPaused;
    const showInitialActions = liveState === 'Idle' || liveState === 'Finished';

    // État pour le menu de durée microphone
    const [showDurationMenu, setShowDurationMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Options de temps, menu de durée microphone
    const recordingOptions = [
        { label: '15 sec (Rapide)', value: 15000 },
        { label: '1 min', value: 60000 },
        { label: '2 min', value: 120000 },
        { label: '5 min', value: 300000 },
        { label: '10 min', value: 600000 },
        { label: '30 min', value: 1800000 },
        { label: '1 heure', value: 3600000 },
    ];

    // Ferme le menu si on clique ailleurs
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowDurationMenu(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleStartClick = (timeslice: number) => {
        setShowDurationMenu(false);
        onStart(timeslice);
    };

    if (isLoading) {
        return (
            <div className="w-full flex items-center justify-center pt-4 pb-2 mt-4 border-t border-gray-300 dark:border-white/10">
                <Loader variant="both" progress={progress} />
            </div>
        );
    }

    // Le bouton "envoyer" s'affiche si c'est Fini ou si c'est Idle et qu'un fichier a été uploadé
    const canFinalize = (liveState === 'Finished' || (liveState === 'Idle' && isFileUploaded));

    return (
        <div className="w-full flex items-center justify-center pt-4 pb-2 mt-4 border-t border-gray-300 dark:border-white/10 transition-all duration-300 ease-in-out">
            {showBottomBar && (
                <div className="flex gap-6 justify-center items-center">
                    <ActionButton variant="icon" size="large" onClick={onStop} title="Stop & Terminer">
                        <StopIcon className="size-6" />
                    </ActionButton>
                    <div className="relative">
                        {isRecording && <div className="absolute inset-0 rounded-full bg-[#48795e] opacity-30 animate-ping"></div>}
                        <ActionButton 
                            variant={isRecording ? 'recording' : 'primary'}
                            size="large"
                            onClick={isRecording ? onPause : onResume} 
                            title={isRecording ? "Mettre en pause" : "Reprendre"}
                        >
                            {isRecording ? <MicrophoneIcon className="size-6" /> : <MicrophoneSlashIcon className="size-6" />}
                        </ActionButton>
                    </div>
                    <div className="w-10 h-10"></div> {/* espace */}
                </div>
            )}

            {showInitialActions && (
                <div className="flex gap-6 w-full justify-center relative">
                    <UploadButton onFileSelected={onUploadChange} title="Uploader un fichier audio" />
                    
                    {/* Bouton Microphone avec Menu seletion durée */}
                    <div className="relative" ref={menuRef}>
                        <ActionButton 
                            variant="primary" 
                            size="large" 
                            onClick={() => setShowDurationMenu(!showDurationMenu)} 
                            title="Démarrer l'écoute (choisir durée)"
                            className="!rounded-br-md"
                        >
                            <MicrophoneIcon className="size-6" />
                        </ActionButton>
                        {/* Icône horloge pour indiquer le menu */}
                        <span className="absolute -bottom-1 -right-1 bg-white dark:bg-gray-700 rounded-full p-0.5 shadow z-50">
                            <ClockIcon className="size-3.5 text-gray-800 dark:text-white" />
                        </span>

                        {/* Menu Déroulant */}
                        {showDurationMenu && (
                            <section className="absolute bottom-16 left-1/2 transform -translate-x-1/2 w-48 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-white/10  transition-transform duration-700 ease shadow-xl hover:shadow-[0_12px_15px_rgb(0,0,0,0.3)] dark:shadow-[0_10px_12px_rgb(0,0,0,0.5)] dark:hover:shadow-[0_12px_15px_rgb(0,0,0,0.8)] z-50 overflow-hidden animate-fadeInUp">
                                <h5 className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-4 py-2 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-white/20">
                                    Fréquence d&apos;analyse
                                </h5>
                                <div className="max-h-60 overflow-y-auto">
                                    {recordingOptions.map((opt) => (
                                        <button
                                            key={opt.value}
                                            onClick={() => handleStartClick(opt.value)}
                                            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 rounded-sm hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 transition-colors flex justify-between items-center group"
                                        >
                                            <span>{opt.label}</span>
                                            <PlayIcon className="size-3 opacity-0 group-hover:opacity-100 text-blue-500" />
                                        </button>
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>

                    {canFinalize && onFinalize && (
                        <ActionButton
                            variant="icon"
                            size="small"
                            onClick={onFinalize}
                            title="Envoyer la transcription"
                            className='absolute right-4'
                            disabled={isSendingEmail}  
                            isLoading={isSendingEmail}
                        >
                            {!isSendingEmail && <PaperAirplaneIcon className="size-6 -rotate-35"/>}
                        </ActionButton>
                    )}
                </div>
            )}
        </div>
    );
};