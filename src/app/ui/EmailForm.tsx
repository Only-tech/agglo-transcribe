'use client';

import { useState } from 'react';
import { ChevronUpIcon } from "@heroicons/react/16/solid";
import { LoadingAnimation } from './LoadingAnimation';
import { ActionButton } from '@/app/ui/ActionButton';

interface EmailFormProps {
    onSubmit: (email: string) => void;
    onSkip: () => void;
    isLoading: boolean;
    progress: number;
}

export const EmailForm = ({ onSubmit, onSkip, isLoading, progress }: EmailFormProps) => {
    const [userEmail, setUserEmail] = useState("");
    const [emailError, setEmailError] = useState("");
    const [isUserEmailFocused, setIsUserEmailFocused] = useState(false);
    const isUserEmailLabelActive = isUserEmailFocused || userEmail.length > 0;

    const handleLocalSubmit = (e: React.MouseEvent) => {
        e.preventDefault();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail)) {
        setEmailError("Veuillez entrer une adresse e-mail valide.");
        return;
        }
        setEmailError("");
        onSubmit(userEmail); // Appelle la fonction passée en prop
    };

    return (
        <form className="flex flex-col w-full items-center justify-evenly h-full rounded-4xl p-3 md:p-8 bg-gray-100 dark:bg-[#2E2E2E] gap-4 text-center transition-all duration-500 ease-out">
            <p className={`text-base text-gray-700 dark:text-white/70 transition-all duration-500 ease-out ${userEmail.trim() !== "" ? "opacity-80" : "opacity-100"}`}>
                Pour commencer, entrez votre adresse e-mail, la transcription y sera envoyée
            </p>

            <div className={`relative w-full transition-all duration-500 ease-out ${userEmail.trim() !== "" ? "translate-y-1" : "translate-y-4"}`}>
                <input
                    type="email"
                    id="email-input" 
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    onFocus={() => setIsUserEmailFocused(true)}
                    onBlur={() => setIsUserEmailFocused(false)}
                    className={`peer w-full py-4 px-6 text-gray-600 dark:text-white/70 border resize-none rounded-full shadow-sm focus:outline-none transition-all duration-300 ease-out ${
                        emailError ? "border-red-500" : "border-black/10 dark:border-white/10 focus:ring-1 focus:ring-blue-800 dark:focus-ring-blue-600 hover:border-blue-800 dark:hover:border-blue-600 focus:border-blue-800 dark:focus:border-blue-600"
                    }`}
                />
                <label
                    htmlFor="email-input"
                    className={`absolute pointer-events-none transition-all duration-300 ease-out px-3
                        ${isUserEmailLabelActive ? "top-0 left-6 -translate-y-1/2 text-sm rounded-full font-medium text-gray-500 peer-focus:text-blue-800 dark:peer-focus:text-blue-600 peer-hover:text-blue-800 dark:peer-hover:text-blue-600 px-1 bg-gray-100 dark:bg-[#2E2E2E] dark:text-white/50" : "top-1/2 left-3 -translate-y-1/2 text-base text-gray-500 dark:text-white/40"}`}
                >
                    votre.email@exemple.com
                </label>
            </div>
            
            {emailError && <p className="text-red-400 text-sm">{emailError}</p>}

            <div
                className={`flex gap-3 w-full justify-between pt-6 border-t border-gray-300 dark:border-white/10 transform transition-all duration-500 ease-out ${
                userEmail.trim() !== "" ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4 pointer-events-none"
                }`}
            >
                {isLoading ? (
                    <LoadingAnimation progress={progress} />
                ) : (
                <>
                    <ActionButton
                        onClick={onSkip}
                        type="button"
                        variant="secondary-slide"
                        size="normal"
                    >
                        Passer
                    </ActionButton>

                    <ActionButton
                        onClick={handleLocalSubmit}
                        type="submit"
                        variant="primary-slide"
                        size="normal"
                    >
                        Valider 
                        <ChevronUpIcon className="size-6 rotate-90 inline-block ml-2 -mr-4 group-hover:animate-bounce" />
                    </ActionButton>
                </>
                )}
            </div>
        </form>
    );
};