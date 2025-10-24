'use client'

import { PlusIcon } from '@heroicons/react/20/solid';
import React from 'react';
import Spinner from '@/app/ui/Spinner';


interface ActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    isLoading?: boolean;
    children: React.ReactNode;
    variant?: 'primary' | 'secondary' | 'icon' | 'recording' | 'primary-slide' | 'secondary-slide';
    size?: 'normal' | 'large' | 'small';
    className?: string;
}

export const ActionButton = ({ 
    isLoading = false,
    children, 
    variant = 'primary',
    size = 'large',
    className = '', 
    ...props 
}: ActionButtonProps) => {

    const baseStyles = 'flex items-center justify-center transition-all duration-300 ease-in-out cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-lg dark:drop-shadow-[3px_10px_5px_rgba(0,0,0,0.25)] active:scale-98';
    const withIndicator = "group overflow-hidden place-content-center before:content-[''] before:absolute before:w-1.5 before:h-1.5 before:rounded-full before:bg-[#fff] before:left-[calc(50%-3px)] before:-bottom-4 before:transition-all before:duration-300 before:ease-in-out hover:before:bottom-2 [&>svg]:transition-transform [&>svg]:duration-300 [&>svg]:ease-in-out hover:[&>svg]:-translate-y-1.5";

    const variantStyles = {
        primary: `relative bg-blue-800 hover:bg-blue-600 text-white rounded-full ${withIndicator}`,
        secondary: 'bg-gray-800 hover:bg-gray-700 text-white rounded-full',
        icon: `bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 text-red-500 shadow-2xl rounded-full ${withIndicator}`,
        recording: `relative text-white bg-[#48795e] dark:text-black/60 rounded-full ${withIndicator}`,
        'primary-slide': 'bg-blue-800 border border-blue-800 rounded-lg relative overflow-hidden group transition-transform duration-100',
        'secondary-slide': 'bg-gray-800 border border-gray-800 rounded-lg relative overflow-hidden group transition-transform duration-100',
    };

    const sizeStyles = {
        normal: 'w-36 h-12 text-base font-medium',
        large: 'w-12 h-12 rounded-full',
        small: 'p-2 text-xs bg-white/70 dark:bg-white/10 hover:bg-white/20 text-gray-700 dark:text-white rounded-full backdrop-blur-md',
    };

    const isSlideVariant = variant === 'primary-slide' || variant === 'secondary-slide';
    const slideDirection = variant === 'primary-slide' ? '-translate-x-full' : 'translate-x-full';

    return (
        <button
            className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
            {...props}
            >
            {isSlideVariant ? (
                <>
                <span className={`absolute inset-0 bg-gray-200 transition-transform duration-400 ease-out ${slideDirection} group-hover:translate-x-0 z-0 focus:ring-0`}></span>
                <span className="relative z-10 transition-colors duration-400 text-white/90 group-hover:text-gray-900 inline-flex items-center whitespace-nowrap">
                    {children}
                </span>
                </>
            ) : (
                <>
                    {isLoading && <Spinner className="w-5 h-5" />}
                    {children}
                </>
            )}
        </button>
    );
};

// bouton d'upload en <label>
export const UploadButton = ({ onFileSelected, title }: { onFileSelected: (e: React.ChangeEvent<HTMLInputElement>) => void; title: string }) => (
    <label className="w-12 h-12 flex items-center justify-center rounded-full bg-gray-800 hover:bg-gray-700 cursor-pointer text-white shadow-lg dark:drop-shadow-[3px_10px_5px_rgba(0,0,0,0.25)]" title={title}>
        <PlusIcon className="size-6" />
        <input type="file" accept="audio/*" onChange={onFileSelected} className="hidden" />
    </label>
);
