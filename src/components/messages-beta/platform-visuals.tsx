import { Facebook, Instagram, Mail, MessageCircle, Send, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

import type { BetaPlatform } from "./store/types";

export const PLATFORM_ICON: Record<BetaPlatform, LucideIcon> = {
  facebook: Facebook,
  instagram: Instagram,
  whatsapp: MessageCircle,
  email: Mail,
  widget: MessageCircle,
  telegram: Send,
};

/** Brand colour for the channel badge / chip. */
export const PLATFORM_BG: Record<BetaPlatform, string> = {
  facebook: "bg-blue-600",
  instagram: "bg-gradient-to-br from-purple-600 to-pink-600",
  whatsapp: "bg-green-600",
  email: "bg-red-600",
  widget: "bg-indigo-600",
  telegram: "bg-sky-500",
};

/** Brand names stay untranslated; "widget" gets its label from i18n. */
export const PLATFORM_BRAND: Record<BetaPlatform, string | null> = {
  facebook: "Messenger",
  instagram: "Instagram",
  whatsapp: "WhatsApp",
  email: "Email",
  widget: null,
  telegram: "Telegram",
};

/** Small round brand badge overlaid on an avatar (design: 16px list, 14px header). */
export function ChannelBadge({
  platform,
  size = 16,
  className,
}: {
  platform: BetaPlatform;
  size?: 14 | 16;
  className?: string;
}) {
  const Icon = PLATFORM_ICON[platform];
  return (
    <span
      className={cn(
        "absolute -bottom-0.5 -right-0.5 flex items-center justify-center rounded-full border-2 border-background text-white",
        size === 16 ? "h-4 w-4" : "h-3.5 w-3.5",
        PLATFORM_BG[platform],
        className
      )}
      aria-hidden
    >
      <Icon className={size === 16 ? "h-2 w-2" : "h-[7px] w-[7px]"} strokeWidth={2.5} />
    </span>
  );
}
