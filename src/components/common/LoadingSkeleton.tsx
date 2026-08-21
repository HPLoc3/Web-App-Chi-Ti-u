import React from 'react';

export const LoadingSkeleton: React.FC<{
  type?: 'card' | 'table' | 'hero' | 'chart';
  count?: number;
}> = ({ type = 'card', count = 3 }) => {
  if (type === 'table') {
    return (
      <div className="w-full space-y-3 animate-pulse">
        <div className="h-10 bg-stone-200/80 rounded-xl w-full" />
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="h-14 bg-stone-100 rounded-xl w-full flex items-center justify-between px-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-stone-200" />
              <div className="space-y-1.5">
                <div className="h-3.5 bg-stone-200 rounded w-32" />
                <div className="h-2.5 bg-stone-200 rounded w-20" />
              </div>
            </div>
            <div className="h-4 bg-stone-200 rounded w-24" />
          </div>
        ))}
      </div>
    );
  }

  if (type === 'hero') {
    return (
      <div className="w-full h-48 bg-stone-200/70 rounded-2xl animate-pulse p-6 space-y-4">
        <div className="h-6 bg-stone-300/80 rounded w-1/3" />
        <div className="h-10 bg-stone-300/80 rounded w-1/2" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="h-14 bg-stone-300/60 rounded-xl" />
          <div className="h-14 bg-stone-300/60 rounded-xl" />
          <div className="h-14 bg-stone-300/60 rounded-xl" />
          <div className="h-14 bg-stone-300/60 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-5 bg-stone-100 rounded-2xl space-y-3 border border-[#E6DEC9]/60">
          <div className="flex items-center justify-between">
            <div className="h-4 bg-stone-200 rounded w-24" />
            <div className="w-7 h-7 bg-stone-200 rounded-lg" />
          </div>
          <div className="h-7 bg-stone-200 rounded w-36" />
          <div className="h-3 bg-stone-200 rounded w-48" />
        </div>
      ))}
    </div>
  );
};
