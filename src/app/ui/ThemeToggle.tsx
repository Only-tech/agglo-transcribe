'use client';

import { MoonIcon } from '@heroicons/react/16/solid';
import { SunIcon } from '@heroicons/react/24/solid';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [toggled, setToggled] = useState(false);

    useEffect(() => {
        setMounted(true);
        setToggled(theme === 'dark');
    }, [theme]);

    if (!mounted) return null;

    const handleToggle = () => {
        const next = !toggled;
        setToggled(next);
        setTimeout(() => {
            setTheme(next ? 'dark' : 'default');
        }, 250);
    };

    return (
        <label
            htmlFor="themeToggle"
            className=" inline-flex items-center cursor-pointer rounded-full"
            title="Changer le thème"
        >
            <input
                type="checkbox"
                id="themeToggle"
                className="sr-only"
                checked={toggled}
                onChange={handleToggle}
            />
            {/* Track */}
            <div
                className={`w-14 h-8.5 rounded-full relative transition-colors duration-300 border border-gray-300/10 dark:border-white/10
                ${toggled ? 'bg-black/20' : 'bg-black/50 hover:bg-black/90'}`}
            >
                {/* Pastille */}
                <div
                    className={`absolute top-0.5 left-0.5 size-7 rounded-full border-2 transform
                        transition-all duration-500 ease-in-out
                        ${toggled
                        ? 'translate-x-6 bg-black border-white/20'
                        : 'translate-x-0 bg-white border-black'}`}
                />
                <span className="absolute inset-0 flex items-center justify-between px-1">
                <SunIcon
                    className={`size-6 text-yellow-400 transform transition-all duration-500 ease-in-out
                    ${toggled 
                        ? 'opacity-0 scale-75 rotate-90' 
                        : 'opacity-100 scale-100 rotate-0'}`}
                />
                <MoonIcon
                    className={`size-6 text-gray-300 transform transition-all duration-500 ease-in-out
                    ${toggled 
                        ? 'opacity-100 scale-100 rotate-0' 
                        : 'opacity-0 scale-75 -rotate-90'}`}
                />
                </span>
            </div>
        </label>
    );
}
