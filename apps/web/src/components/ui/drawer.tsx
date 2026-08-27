import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
  side?: 'right' | 'left' | 'bottom';
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  description,
  icon,
  children,
  footer,
  width = 'max-w-lg',
  side = 'right',
}) => {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-[2px] transition-opacity animate-in fade-in duration-200"
      />

      {/* Drawer Panel */}
      <div
        className={`relative z-10 w-full ${width} h-full bg-[#161b22] border-l border-[#30363d] shadow-2xl flex flex-col justify-between text-[#c9d1d9] font-sans animate-in slide-in-from-right duration-300 ease-out`}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#30363d] bg-[#0d1117] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-3">
            {icon && (
              <div className="p-2 rounded-xl bg-[#58a6ff]/10 text-[#58a6ff] border border-[#58a6ff]/20">
                {icon}
              </div>
            )}
            <div>
              {title && <h3 className="text-sm font-bold text-white tracking-tight">{title}</h3>}
              {description && <p className="text-[11px] text-[#8b949e] mt-0.5">{description}</p>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8b949e] hover:text-white hover:bg-[#21262d] transition-colors"
            title="Close Drawer (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-5">{children}</div>

        {/* Sticky Action Footer */}
        {footer && (
          <div className="px-5 py-3.5 border-t border-[#30363d] bg-[#0d1117] flex items-center justify-end space-x-2 flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
