import React from 'react';

export const TabSkeleton: React.FC<{ type?: 'dashboard' | 'chat' | 'list' | 'cards' }> = ({ type = 'dashboard' }) => {
  return (
    <div className="space-y-6 animate-pulse py-2" role="status" aria-label="Đang tải dữ liệu...">
      {/* Top Banner Skeleton */}
      <div className="h-32 bg-stone-200/70 rounded-2xl w-full border border-stone-200" />

      {/* Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="h-48 bg-stone-200/60 rounded-2xl border border-stone-200" />
        <div className="h-48 bg-stone-200/60 rounded-2xl border border-stone-200" />
        <div className="h-48 bg-stone-200/60 rounded-2xl border border-stone-200" />
      </div>

      {/* Content Skeleton */}
      <div className="h-64 bg-stone-200/50 rounded-2xl border border-stone-200 w-full" />
    </div>
  );
};

export default TabSkeleton;
