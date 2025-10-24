import React from 'react';

export const LoadingAnimation = ({ progress }: { progress: number }) => (
    <div className="flex flex-col items-center justify-center w-full py-2">
        <div className="w-60 h-1 bg-gray-300 dark:bg-gray-700 rounded-full overflow-hidden mb-3 sm:mb-6">
            <div
                className="h-full bg-gray-900 dark:bg-gray-300 rounded-full transition-all duration-100 ease-linear"
                style={{ width: `${progress}%` }}
            ></div>
        </div>
            <div className="flex justify-center items-center space-x-4">
            <div className="animate-dot-bounce-1 w-2 h-2 rounded-full bg-gray-900 dark:bg-gray-200"></div>
            <div className="animate-dot-bounce-2 w-2 h-2 rounded-full bg-gray-900 dark:bg-gray-200"></div>
            <div className="animate-dot-bounce-3 w-2 h-2 rounded-full bg-gray-900 dark:bg-gray-200"></div>
        </div>
    </div>
);