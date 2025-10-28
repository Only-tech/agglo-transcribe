'use client';

import React, { useState, InputHTMLAttributes } from 'react';

interface FloatingLabelInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

const FloatingLabelInput: React.FC<FloatingLabelInputProps> = ({ 
  id, 
  label, 
  value, 
  onFocus, 
  onBlur, 
  className, // for other className proprieties fusion
  ...props 
}) => {
  const [isFocused, setIsFocused] = useState<boolean>(false);
  
  const isActive = isFocused || (value && value.toString().length > 0);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    if (onFocus) {
      onFocus(e);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    if (onBlur) {
      onBlur(e);
    }
  };

  // Class fusion
  const baseClasses = "peer w-full py-3 px-6 text-gray-600 dark:text-white/70 border resize-none rounded-full shadow-sm focus:outline-none transition-all duration-300 ease-out border-black/10 dark:border-white/10 focus:ring-1 focus:ring-blue-800 dark:focus-ring-blue-600 hover:border-blue-800 dark:hover:border-blue-600 focus:border-blue-800 dark:focus:border-blue-600";
  const finalClassName = `${baseClasses} ${className || ''}`.trim();

  return (
    <div className={`relative group w-full transition-all duration-500 ease-out ${isActive ? "translate-y-1" : "translate-y-4"}`}>
      <input
        id={id}
        value={value}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={finalClassName} 
        {...props}
      />
      <label
        htmlFor={id}
        className={`absolute pointer-events-none transition-all duration-300 ease-out px-3 ${
          isActive
            ? "top-0 left-6 -translate-y-1/2 text-sm rounded-full font-medium text-gray-500 peer-focus:text-blue-800 dark:peer-focus:text-blue-600 peer-hover:text-blue-800 dark:peer-hover:text-blue-600 px-1 bg-white dark:bg-gray-800 dark:text-white/50" 
            : "top-1/2 left-3 -translate-y-1/2 text-base text-gray-500 dark:text-white/40"
        }`}
      >
        {label}
      </label>
    </div>
  );
};

export default FloatingLabelInput;