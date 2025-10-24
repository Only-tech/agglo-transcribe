'use client';

import { MoonIcon } from '@heroicons/react/16/solid';
import { SunIcon } from '@heroicons/react/24/solid';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const isDark = theme === 'dark';

  return (
    <label
      htmlFor="themeToggle"
      className="inline-flex items-center cursor-pointer rounded-full drop-shadow-[0px_3px_3px_rgba(0,0,0,0.6)] dark:shadow-[0px_5px_5px_rgba(0,0,0,0.4)] shadow-[hsl(var(--always-black)/5.1%)]"
      title="Changer le thème"
    >
      <input
        type="checkbox"
        id="themeToggle"
        className="sr-only"
        checked={isDark}
        onChange={(e) => setTheme(e.target.checked ? 'dark' : 'default')}
      />
      {/* Track */}
      <div
        className={`w-14 h-8.5 rounded-full relative transition-colors duration-300 border
          ${isDark ? 'bg-black/20 border-white/40' : 'bg-black/50 hover:bg-black/90'}`}
      >
        {/* Pastille */}
        <div
          className={`absolute top-0.5 left-0.5 size-7 rounded-full border transform
            transition-all duration-600
            ease-[cubic-bezier(0.68,-0.55,0.27,1.55)]
            ${isDark
              ? 'translate-x-6 bg-black border-white/40'
              : 'translate-x-0 bg-white border-black'}`}
        />
        <span
          className={`absolute inset-0 flex items-center justify-between px-1 font-semibold transition-colors duration-600
            ${isDark ? 'text-black' : 'text-yellow-400'}`}
        >
          <SunIcon className={`size-6 text-yellow-400 transform transition-all duration-500 ease-in-out hove:rotate-180 active:rotate-180 drop-shadow-2xl ${isDark ? 'opacity-0 scale-90' : 'opacity-100 scale-100'}`}/>
          <MoonIcon className={`size-6 text-gray-300 transform transition-all duration-500 ease-in-out hover:animate-pulse active:animate-pulse drop-shadow-2xl ${isDark ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}/>
        </span>
      </div>
    </label>
  );
}
