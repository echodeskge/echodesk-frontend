import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LockedFeatureBadgeProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export function LockedFeatureBadge({
  className,
  size = 'sm',
  showText = false
}: LockedFeatureBadgeProps) {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-amber-600",
      className
    )}>
      <Lock className={sizeClasses[size]} />
      {showText && (
        <span className="text-xs font-medium">Premium</span>
      )}
    </span>
  );
}

interface PremiumBadgeProps {
  className?: string;
}

export function PremiumBadge({ className }: PremiumBadgeProps) {
  return (
    <span className={cn(
      "inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium",
      "bg-gradient-to-r from-amber-100 to-orange-100",
      "text-amber-700 border border-amber-200",
      className
    )}>
      Pro
    </span>
  );
}
