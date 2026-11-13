import { cn } from "@/lib/utils";

import {
  InstagramIcon, MailIcon, MessengerIcon, TelegramIcon, WhatsAppIcon, WidgetIcon, type PlatformIcon,
} from "./brand-icons";
import type { BetaPlatform } from "./store/types";

/** The real channel glyph per platform (Messenger for Facebook pages). */
export const PLATFORM_ICON: Record<BetaPlatform, PlatformIcon> = {
  facebook: MessengerIcon,
  instagram: InstagramIcon,
  whatsapp: WhatsAppIcon,
  email: MailIcon,
  widget: WidgetIcon,
  telegram: TelegramIcon,
};

/** Brand colour for the channel badge / chip (matches MessagesDropdownItem). */
export const PLATFORM_BG: Record<BetaPlatform, string> = {
  facebook: "bg-[#0084FF]",
  instagram: "bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF]",
  whatsapp: "bg-[#25D366]",
  email: "bg-[#475569]",
  widget: "bg-[#6366F1]",
  telegram: "bg-[#229ED9]",
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
