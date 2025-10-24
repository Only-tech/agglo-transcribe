'use client'

import React from 'react';

type LoaderVariant = 'bar' | 'dots' | 'both';

interface LoaderProps {
    variant?: LoaderVariant; 
    progress?: number; 
    className?: string;
    Light?: boolean;
}

export default function Loader({
    variant = 'both',
    progress = 0,
    Light = false,
}: LoaderProps) {
    return (
        <>
            {/* Progress bar */}
            {(variant === 'bar' || variant === 'both') && (
                <div 
                    role="progressbar"
                    aria-valuenow={Math.round(progress)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    className={`w-64 h-1 bg-gray-300 ${!Light && 'dark:bg-gray-700'} rounded-full overflow-hidden mx-auto mb-6`}
                >
                    <div
                        className={`h-full bg-gray-900 ${!Light && 'dark:bg-gray-300'} rounded-full transition-all duration-100 ease-linear`}
                        style={{ width: `${progress}%`, backgroundColor: undefined }}
                    />
                </div>
            )}

            {/* Dots */}
            {(variant === 'dots' || variant === 'both') && (
                <div  
                    role="status" 
                    aria-live="polite" 
                    className="flex justify-center items-center space-x-2"
                >
                    <div className={`animate-dot-bounce-1 w-2 h-2 rounded-full bg-gray-900 ${!Light && 'dark:bg-gray-300'}`}></div>
                    <div className={`animate-dot-bounce-2 w-2 h-2 rounded-full bg-gray-900 ${!Light && 'dark:bg-gray-300'}`}></div>
                    <div className={`animate-dot-bounce-3 w-2 h-2 rounded-full bg-gray-900 ${!Light && 'dark:bg-gray-300'}`}></div>
                </div>
            )}
        </>
    );
}