import React from 'react';
import { ActionButton, UploadButton } from '@/app/ui/ActionButton';
import { MicrophoneIcon, MicrophoneSlashIcon } from '@/app/ui/Icons';
import Loader from '@/app/ui/Loader';
import { PaperAirplaneIcon, StopIcon } from '@heroicons/react/24/solid';

interface ActionBarsProps {
    liveState: 'Recording' | 'Paused' | 'Idle' | 'Finished';
    isLoading: boolean;
    progress: number;
    onStart: () => void;
    onPause: () => void;
    onResume: () => void;
    onStop: () => void;
    onUploadChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onFinalize?: () => void;

}

export const ActionBars = ({ liveState, isLoading, progress, onStart, onPause, onResume, onStop, onUploadChange, onFinalize, }: ActionBarsProps) => {
    const isRecording = liveState === 'Recording';
    const isPaused = liveState === 'Paused';
    const showBottomBar = isRecording || isPaused;
    const showInitialActions = liveState === 'Idle' || liveState === 'Finished';

    if (isLoading) {
        return (
        <div className="w-full flex items-center justify-center pt-4 pb-2 mt-4 border-t border-gray-300 dark:border-white/10">
            <Loader variant="both" progress={progress} />
        </div>
        );
    }

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
            <div className="flex gap-6 w-full justify-center ">
                <UploadButton onFileSelected={onUploadChange} title="Uploader un fichier audio" />
                <ActionButton variant="primary" size="large" onClick={onStart} title="Démarrer l'écoute">
                    <MicrophoneIcon className="size-6" />
                </ActionButton>

                {liveState === 'Finished' && onFinalize && (
                    <ActionButton
                        variant="icon"
                        size="small"
                        onClick={onFinalize}
                        title="Envoyer la transcription"
                        className='absolute right-4'
                    >
                        <PaperAirplaneIcon className="size-6 -rotate-35"/>
                    </ActionButton>
                )}
            </div>
        )}
        </div>
    );
};