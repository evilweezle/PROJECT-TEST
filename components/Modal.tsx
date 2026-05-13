import React from 'react';
import { XIcon } from './icons';
import { motion, AnimatePresence } from 'motion/react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl' | 'full';
  hideHeader?: boolean;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'lg', hideHeader = false }) => {
  const sizeClasses: Record<string, string> = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl',
    '7xl': 'max-w-7xl',
    'full': 'w-full h-full max-w-none md:max-w-[95vw]',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center md:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`relative bg-white md:shadow-2xl w-full ${sizeClasses[size]} max-h-[100dvh] md:max-h-[90vh] flex flex-col border-0 md:border border-[#EDEBE9] md:rounded-sm overflow-hidden`}
          >
            {!hideHeader && (
              <header className="flex items-center justify-between px-6 py-4 border-b border-[#EDEBE9] flex-shrink-0">
                <h3 className="text-lg font-semibold text-[#323130]">{title}</h3>
                <button 
                  onClick={onClose} 
                  className="p-1.5 rounded-sm hover:bg-[#F3F2F1] text-[#605E5C] transition-colors"
                  title="Close"
                >
                  <XIcon className="w-5 h-5" />
                </button>
              </header>
            )}
            <div className={`overflow-y-auto custom-scrollbar ${hideHeader ? 'p-0' : 'p-6'}`}>
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
