"use client";

import { cn } from "@/lib/utils";

export interface EmojiOption {
  value: 1 | 3 | 5;
  emoji: string;
  labelKa: string;
  labelEn: string;
}

export const EMOJI_OPTIONS: EmojiOption[] = [
  { value: 1, emoji: '😞', labelKa: 'ცუდი', labelEn: 'Bad' },
  { value: 3, emoji: '🙂', labelKa: 'კარგი', labelEn: 'Good' },
  { value: 5, emoji: '😍', labelKa: 'შესანიშნავი', labelEn: 'Excellent' },
];

interface EmojiRatingSelectorProps {
  value: 1 | 3 | 5 | null;
  onChange: (value: 1 | 3 | 5) => void;
  disabled?: boolean;
  lang?: 'ka' | 'en';
}

export function EmojiRatingSelector({ value, onChange, disabled, lang = 'ka' }: EmojiRatingSelectorProps) {
  return (
    <div className="flex justify-center gap-6 md:gap-10">
      {EMOJI_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(option.value)}
          className={cn(
            "flex flex-col items-center gap-2 p-4 rounded-xl transition-all duration-200",
            "hover:scale-110 hover:bg-muted/50",
            "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
            value === option.value && "bg-primary/10 scale-110 ring-2 ring-primary",
            disabled && "opacity-50 cursor-not-allowed hover:scale-100"
          )}
        >
          <span className="text-5xl md:text-6xl" role="img" aria-label={option.labelEn}>
            {option.emoji}
          </span>
          <span className="text-sm font-medium text-muted-foreground">
            {lang === 'ka' ? option.labelKa : option.labelEn}
          </span>
        </button>
      ))}
    </div>
  );
}
