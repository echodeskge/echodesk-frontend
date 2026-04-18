import {
  MessageSquare,
  Phone,
  PhoneMissed,
  Mic,
  Mail,
  Globe,
  Shield,
  Clock,
  FileText,
  CheckCircle,
  Calendar,
  Zap,
  Users,
  BarChart3,
  Sparkles,
  Layers,
  Server,
  CreditCard,
  Coins,
  Monitor,
  Ticket,
  TicketCheck,
  Receipt,
  Headphones,
  Building2,
  MapPin,
  type LucideIcon,
} from 'lucide-react';

/**
 * Lazy-map of icon names that backend landing-page content blocks can
 * reference. Falls back to `Sparkles` when the icon name is unknown so
 * the UI never crashes on user-edited content.
 */
const ICON_MAP: Record<string, LucideIcon> = {
  MessageSquare,
  Phone,
  PhoneMissed,
  Mic,
  Mail,
  Globe,
  Shield,
  Clock,
  FileText,
  CheckCircle,
  Calendar,
  Zap,
  Users,
  BarChart3,
  Sparkles,
  Layers,
  Server,
  CreditCard,
  Coins,
  Monitor,
  Ticket,
  TicketCheck,
  Receipt,
  Headphones,
  Building2,
  MapPin,
};

export function getLandingIcon(name: string | undefined): LucideIcon {
  if (!name) return Sparkles;
  return ICON_MAP[name] || Sparkles;
}
