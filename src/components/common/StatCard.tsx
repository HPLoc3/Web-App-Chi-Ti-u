import React, { ReactNode } from 'react';
import { TrendingUp, TrendingDown, HelpCircle } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon?: ReactNode;
  trend?: {
    value: string;
    isPositive?: boolean;
    isNeutral?: boolean;
    label?: string;
  };
  variant?: 'default' | 'emerald' | 'amber' | 'blue' | 'purple';
  action?: ReactNode;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  variant = 'default',
  action,
  onClick,
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'emerald':
        return {
          card: 'bg-emerald-950 text-white border-emerald-800/80 shadow-md',
          title: 'text-emerald-200/80',
          value: 'text-amber-300',
          iconBg: 'bg-emerald-800/80 text-amber-300 border border-amber-400/30',
          subtitle: 'text-emerald-300/80',
        };
      case 'amber':
        return {
          card: 'bg-white border-amber-200 shadow-xs hover:border-amber-400',
          title: 'text-stone-600',
          value: 'text-amber-600',
          iconBg: 'bg-amber-100 text-amber-800',
          subtitle: 'text-stone-500',
        };
      case 'blue':
        return {
          card: 'bg-white border-blue-200 shadow-xs hover:border-blue-400',
          title: 'text-stone-600',
          value: 'text-blue-800',
          iconBg: 'bg-blue-100 text-blue-800',
          subtitle: 'text-stone-500',
        };
      case 'purple':
        return {
          card: 'bg-white border-purple-200 shadow-xs hover:border-purple-400',
          title: 'text-stone-600',
          value: 'text-purple-800',
          iconBg: 'bg-purple-100 text-purple-800',
          subtitle: 'text-stone-500',
        };
      default:
        return {
          card: 'bg-white border-[#E6DEC9] shadow-xs hover:border-stone-400',
          title: 'text-stone-600',
          value: 'text-emerald-950',
          iconBg: 'bg-stone-100 text-stone-700',
          subtitle: 'text-stone-500',
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div
      onClick={onClick}
      className={`rounded-2xl border p-4 sm:p-5 transition-all duration-200 ${styles.card} ${
        onClick ? 'cursor-pointer active:scale-[0.99]' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          {icon && (
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0 ${styles.iconBg}`}>
              {icon}
            </div>
          )}
          <span className={`text-xs font-semibold tracking-wide uppercase ${styles.title}`}>
            {title}
          </span>
        </div>
        {action && <div>{action}</div>}
      </div>

      <div className="space-y-1 mt-2">
        <div className={`text-xl sm:text-2xl lg:text-3xl font-black tracking-tight font-mono break-words ${styles.value}`}>
          {value}
        </div>

        {(subtitle || trend) && (
          <div className="flex items-center gap-2 pt-1 flex-wrap text-xs">
            {trend && (
              <span
                className={`inline-flex items-center gap-1 font-medium px-2 py-0.5 rounded-md ${
                  trend.isNeutral
                    ? 'bg-stone-100 text-stone-700'
                    : trend.isPositive
                    ? 'bg-emerald-100 text-emerald-800 font-semibold'
                    : 'bg-amber-100 text-amber-900 font-semibold'
                }`}
              >
                {trend.isPositive ? (
                  <TrendingUp size={12} />
                ) : trend.isNeutral ? null : (
                  <TrendingDown size={12} />
                )}
                <span>{trend.value}</span>
              </span>
            )}
            {subtitle && (
              <span className={`text-[11px] ${styles.subtitle}`}>
                {subtitle}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
