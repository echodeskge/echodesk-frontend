'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import {
  Calendar,
  Facebook,
  Instagram,
  Lock,
  Mail,
  MessageCircle,
  MessageSquare,
  Phone,
  PhoneIncoming,
  Receipt,
  Search,
  Send,
  Settings,
  Ticket,
  User,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Static JSX mock of the product (sidebar + Messages list + one WhatsApp
 * conversation with an incoming-call card), from the design file. Sidebar
 * labels are the product's real navigation labels. Responsive per the
 * design's matchMedia rules: list only < 820 px, list + chat from 820 px,
 * sidebar from 1000 px.
 */
export function AppMock() {
  const t = useTranslations('landing.hero.mock');

  const navWork: NavItem[] = [
    { label: t('nav.boards'), icon: Ticket },
    { label: t('nav.calls'), icon: Phone },
  ];
  const navChannels: NavItem[] = [
    { label: t('nav.messages'), icon: MessageSquare, badge: 3, active: true },
    { label: t('nav.email'), icon: Mail, badge: 3 },
    { label: t('nav.users'), icon: User },
  ];
  const navModules: NavItem[] = [
    { label: t('nav.bookings'), icon: Calendar },
    { label: t('nav.invoices'), icon: Receipt },
    { label: t('nav.settings'), icon: Settings },
  ];

  const convos: Convo[] = [
    { id: 'c1', initials: 'MG', unread: 2, channel: 'whatsapp', active: true },
    { id: 'c2', initials: 'GK', unread: 1, channel: 'facebook' },
    { id: 'c3', initials: 'AT', channel: 'instagram' },
    { id: 'c4', initials: 'WV', channel: 'web' },
    { id: 'c5', initials: 'DL', channel: 'mail' },
  ];

  return (
    <div className="relative pb-[72px]" data-testid="app-mock" aria-hidden="true">
      <div className="pointer-events-none absolute left-1/2 top-[40%] h-[60%] w-[80%] -translate-x-1/2 rounded-full bg-secondary/[.18] blur-[90px]" />
      <div className="relative overflow-hidden rounded-2xl border bg-card shadow-[0_30px_80px_-30px_rgb(0_0_0/.35),0_1px_0_hsl(var(--border))]">
        {/* Browser chrome */}
        <div className="flex h-10 items-center gap-2 border-b bg-muted/50 px-3.5">
          <span className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#fe5f57]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          </span>
          <span className="mx-auto inline-flex h-6 items-center gap-1.5 rounded-md border bg-background px-2.5 text-[11px] text-muted-foreground">
            <Lock className="h-2.5 w-2.5" />
            {t('url')}
          </span>
        </div>

        <div className="grid min-h-[440px] grid-cols-[minmax(0,1fr)] text-[13px] leading-[18px] min-[820px]:grid-cols-[260px_minmax(0,1fr)] min-[1000px]:grid-cols-[190px_300px_minmax(0,1fr)]">
          {/* Sidebar */}
          <aside className="hidden flex-col gap-0.5 border-r bg-muted/30 px-2.5 py-3 min-[1000px]:flex">
            <div className="mb-2.5 flex items-center gap-2 px-2 py-1.5">
              <Image src="/logo-svg.svg" alt="" width={80} height={21} className="h-[18px] w-auto" />
              <span className="truncate text-xs font-semibold">{t('workspace')}</span>
            </div>
            <GroupLabel first>{t('groups.work')}</GroupLabel>
            {navWork.map((n) => (
              <NavRow key={n.label} item={n} />
            ))}
            <GroupLabel>{t('groups.channels')}</GroupLabel>
            {navChannels.map((n) => (
              <NavRow key={n.label} item={n} />
            ))}
            <GroupLabel>{t('groups.modules')}</GroupLabel>
            {navModules.map((n) => (
              <NavRow key={n.label} item={n} muted />
            ))}
          </aside>

          {/* Conversation list */}
          <div className="flex min-w-0 flex-col border-r">
            <div className="flex h-11 items-center gap-2 border-b px-3">
              <span className="font-semibold">{t('nav.messages')}</span>
              <span className="inline-flex h-5 items-center gap-1.5 rounded-full border px-2 text-[11px] text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-green" />
                {t('live')}
              </span>
            </div>
            <div className="flex gap-1.5 border-b px-3 py-2.5">
              {CHANNELS.map((c) => (
                <span
                  key={c.id}
                  className="flex h-[22px] w-[22px] items-center justify-center rounded-full text-white"
                  style={{ background: c.bg }}
                >
                  <c.icon className="h-[11px] w-[11px]" />
                </span>
              ))}
              <span className="ml-auto inline-flex h-[22px] items-center gap-1.5 rounded-md border px-2 text-[11px] text-muted-foreground">
                <Search className="h-[11px] w-[11px]" />
                {t('search')}
              </span>
            </div>
            {convos.map((c) => {
              const ch = CHANNEL_BY_ID[c.channel];
              return (
                <div
                  key={c.id}
                  className={cn('flex items-center gap-2.5 border-b border-border/60 px-3 py-2.5', c.active && 'bg-accent')}
                >
                  <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold">
                    {c.initials}
                    <span
                      className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-card text-white"
                      style={{ background: ch.bg }}
                    >
                      <ch.icon className="h-[7px] w-[7px]" />
                    </span>
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="flex justify-between gap-2">
                      <span className="truncate font-semibold">{t(`convos.${c.id}name`)}</span>
                      <span className="shrink-0 text-[11px] text-muted-foreground">{t(`convos.${c.id}time`)}</span>
                    </span>
                    <span className="flex justify-between gap-2 text-xs text-muted-foreground">
                      <span className="truncate">{t(`convos.${c.id}preview`)}</span>
                      {c.unread && (
                        <span className="h-4 min-w-4 shrink-0 rounded-full bg-primary text-center text-[10px] font-semibold leading-4 text-primary-foreground">
                          {c.unread}
                        </span>
                      )}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>

          {/* Conversation */}
          <div className="hidden min-w-0 flex-col min-[820px]:flex">
            <div className="flex h-11 items-center gap-2.5 border-b px-3.5">
              <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-muted text-[10px] font-semibold">
                MG
              </span>
              <span className="flex flex-col leading-[14px]">
                <span className="text-xs font-semibold">{t('convos.c1name')}</span>
                <span className="text-[11px] text-muted-foreground">{t('channelLine')}</span>
              </span>
              <span className="ml-auto inline-flex h-6 items-center gap-1.5 rounded-md border px-2 text-[11px] font-medium">
                <Ticket className="h-[11px] w-[11px]" />
                {t('ticket')}
              </span>
              <span className="inline-flex h-6 items-center gap-1.5 rounded-md bg-primary px-2 text-[11px] font-semibold text-primary-foreground">
                <Phone className="h-[11px] w-[11px]" />
                {t('call')}
              </span>
            </div>
            <div className="flex flex-1 flex-col gap-2.5 bg-muted/25 px-3.5 py-4">
              <span className="self-center text-[11px] text-muted-foreground">{t('today')}</span>
              <div className="max-w-[78%] self-start rounded-[12px_12px_12px_3px] border bg-card px-[11px] py-2" lang="ka">
                {t('msg1')}
              </div>
              <div className="max-w-[78%] self-start rounded-[12px_12px_12px_3px] border bg-card px-[11px] py-2">
                {t('msg2')}
              </div>
              <div className="max-w-[78%] self-end rounded-[12px_12px_3px_12px] bg-primary px-[11px] py-2 text-primary-foreground">
                {t('reply')}
              </div>
              <span className="self-end text-[11px] text-muted-foreground">{t('replyMeta')}</span>
              <div className="flex items-center gap-2.5 self-start rounded-[10px] border bg-card px-3 py-2.5">
                <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-green/[.12] text-green">
                  <PhoneIncoming className="h-3.5 w-3.5" />
                </span>
                <span className="flex flex-col leading-[15px]">
                  <span className="text-xs font-semibold">{t('callTitle')}</span>
                  <span className="text-[11px] text-muted-foreground">{t('callMeta')}</span>
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 border-t px-3.5 py-2.5">
              <span className="h-8 flex-1 rounded-lg border px-2.5 text-xs leading-[30px] text-muted-foreground">
                {t('composer')}
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Send className="h-[13px] w-[13px]" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface NavItem {
  label: string;
  icon: LucideIcon;
  badge?: number;
  active?: boolean;
}

interface Convo {
  id: 'c1' | 'c2' | 'c3' | 'c4' | 'c5';
  initials: string;
  unread?: number;
  channel: ChannelId;
  active?: boolean;
}

type ChannelId = 'facebook' | 'instagram' | 'whatsapp' | 'mail' | 'telegram' | 'web';

const CHANNELS: { id: ChannelId; icon: LucideIcon; bg: string }[] = [
  { id: 'facebook', icon: Facebook, bg: '#1877f2' },
  { id: 'instagram', icon: Instagram, bg: '#d62976' },
  { id: 'whatsapp', icon: MessageCircle, bg: '#25d366' },
  { id: 'mail', icon: Mail, bg: '#6366f1' },
  { id: 'telegram', icon: Send, bg: '#229ed9' },
];
const CHANNEL_BY_ID: Record<ChannelId, { icon: LucideIcon; bg: string }> = {
  ...Object.fromEntries(CHANNELS.map((c) => [c.id, c])),
  web: { icon: MessageSquare, bg: '#6366f1' },
} as Record<ChannelId, { icon: LucideIcon; bg: string }>;

function GroupLabel({ children, first }: { children: string; first?: boolean }) {
  return (
    <span
      className={cn(
        'px-2 pb-1 text-[10px] font-semibold uppercase tracking-[.06em] text-muted-foreground',
        first ? 'pt-1' : 'pt-3',
      )}
    >
      {children}
    </span>
  );
}

function NavRow({ item, muted }: { item: NavItem; muted?: boolean }) {
  return (
    <span
      className={cn(
        'flex h-[30px] items-center gap-2 rounded-md px-2 text-xs',
        item.active ? 'bg-accent font-semibold' : 'font-normal',
        muted && 'text-foreground/85',
      )}
    >
      <item.icon className="h-3.5 w-3.5" />
      {item.label}
      {item.badge && (
        <span className="ml-auto h-[18px] min-w-[18px] rounded-full bg-[hsl(0_84%_60%)] px-[5px] text-center text-[10px] font-semibold leading-[18px] text-white">
          {item.badge}
        </span>
      )}
    </span>
  );
}
