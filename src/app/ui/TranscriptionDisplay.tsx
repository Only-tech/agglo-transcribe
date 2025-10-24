import React from 'react';

type Session = {
    id: string;
    text: string;
    at: number;
};

interface TranscriptionDisplayProps {
    sessions: Session[];
    currentText: string;
}

export const TranscriptionDisplay = ({ sessions, currentText }: TranscriptionDisplayProps) => (
    <>
        {sessions.length === 0 && !currentText && (
            <p className="text-gray-600 dark:text-white/70 p-3 text-sm">Votre transcription apparaîtra ici</p>
        )}
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
    </>
);