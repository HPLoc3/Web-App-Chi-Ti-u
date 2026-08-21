import React, { ReactNode } from 'react';
import { Plus, Sparkles } from 'lucide-react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  secondaryActionText?: string;
  onSecondaryAction?: () => void;
  compact?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionText,
  onAction,
  secondaryActionText,
  onSecondaryAction,
  compact = false,
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center rounded-2xl border-2 border-dashed border-[#E6DEC9] bg-[#FAF7F0]/60 p-6 sm:p-10 ${
        compact ? 'py-6' : 'min-h-[220px]'
      }`}
    >
      <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center mb-3 shadow-xs">
        {icon || <Sparkles size={24} className="text-amber-600" />}
      </div>

      <h3 className="font-serif text-base sm:text-lg font-bold text-emerald-950 mb-1">
        {title}
      </h3>

      <p className="text-xs sm:text-sm text-stone-500 max-w-sm mb-5 leading-relaxed font-sans">
        {description}
      </p>

      {(actionText || secondaryActionText) && (
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          {actionText && onAction && (
            <button
              onClick={onAction}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-950 hover:bg-emerald-900 text-amber-300 rounded-xl font-medium text-xs sm:text-sm transition shadow-sm cursor-pointer active:scale-98"
            >
              <Plus size={16} />
              <span>{actionText}</span>
            </button>
          )}

          {secondaryActionText && onSecondaryAction && (
            <button
              onClick={onSecondaryAction}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-[#E6DEC9] hover:bg-white text-stone-700 rounded-xl font-medium text-xs sm:text-sm transition cursor-pointer"
            >
              <span>{secondaryActionText}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
