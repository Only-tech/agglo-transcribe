'use client';

import React from 'react';
import { ActionButton } from '@/app/ui/ActionButton';

interface ConfirmationModalProps {
  isOpen: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmationModal({ isOpen, message, onConfirm, onCancel }: ConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[#FCFFF7]/65 dark:bg-[#222222]/65 backdrop-blur-sm flex items-center justify-center z-10000 transition-opacity duration-500 ease-in-out">
      <div className="bg-[#FCFFF7] dark:bg-[#1E1E1E] border border-gray-300 dark:border-white/20 rounded-xl drop-shadow-2xl max-w-lg w-full p-6 lg:p-10 transition-all ease-in-out duration-500 translate-y-0 opacity-100 animate-slide-up mx-4 dark:hover:drop-shadow-[0px_1px_1px_rgba(255,_255,_255,_0.4)] dark:drop-shadow-[0px_15px_15px_rgba(0,0,0,_0.6)]">
        <p className="text-base font-semibold text-gray-800 dark:text-white/70 mb-8 leading-8 text-center">{message}</p>
        <div className="flex justify-center pt-6 border-t border-gray-300 dark:border-white/20 gap-4">
          <ActionButton 
            variant="secondary-slide"
            size="normal"
            className="rounded-l-full flex-1 !bg-[#9f0712]"
            onClick={onCancel}
            >
            Annuler
          </ActionButton>
          <ActionButton 
            variant="primary-slide"
            size="normal"
            className="rounded-r-full flex-1"
            onClick={onConfirm} 
          >
            Confirmer
          </ActionButton>
        </div>
      </div>
    </div>
  );
}
