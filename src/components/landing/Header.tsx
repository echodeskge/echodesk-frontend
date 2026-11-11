'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Globe, Menu, X } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { CONTAINER } from './SectionHeading';

const NAV = [
  { key: 'features', href: '/#features' },
  { key: 'pricing', href: '/#pricing' },
  { key: 'faq', href: '/#faq' },
  { key: 'docs', href: '/docs' },
] as const;

/**
 * Sticky marketing header (shared by the homepage and the other marketing
 * pages). Carries the `.lp` scope itself so it looks the same wherever
 * it is mounted. The wordmark is the live-site logo, unchanged.
 */
export function Header() {
  const t = useTranslations('landing.header');
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const changeLanguage = async (locale: string) => {
    try {
      await fetch('/api/set-locale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale }),
      });
      router.refresh();
    } catch (error) {
      console.error('Failed to change language:', error);
    }
  };

  const navLink = 'text-sm font-medium text-muted-foreground transition-colors hover:text-foreground';

  return (
    <header className="lp sticky top-0 z-50 w-full border-b bg-background/85 backdrop-blur-[12px]">
      <div className={cn(CONTAINER, 'flex h-[60px] items-center justify-between gap-4')}>
        <Link href="/" className="flex items-center" aria-label="EchoDesk">
          <Image src="/logo-svg.svg" alt="EchoDesk" width={100} height={26} className="h-6 w-auto" priority />
        </Link>

        <nav className="hidden items-center gap-7 min-[820px]:flex" aria-label="Main">
          {NAV.map((item) => (
            <Link key={item.key} href={item.href} className={navLink}>
              {t(item.key)}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={t('language')}
                className="inline-flex h-[34px] items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <Globe className="h-[15px] w-[15px]" aria-hidden="true" />
                <span className="hidden min-[820px]:inline">{t('language')}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="lp min-w-[140px]">
              <DropdownMenuItem onClick={() => changeLanguage('ka')}>ქართული</DropdownMenuItem>
              <DropdownMenuItem onClick={() => changeLanguage('en')}>English</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Link
            href="/registration"
            className="hidden h-[34px] items-center rounded-lg bg-primary px-3.5 text-[13px] font-semibold text-primary-foreground transition-opacity hover:opacity-90 min-[820px]:inline-flex"
          >
            {t('getStarted')}
          </Link>

          <button
            type="button"
            className="inline-flex h-[34px] w-[34px] items-center justify-center rounded-lg transition-colors hover:bg-accent min-[820px]:hidden"
            aria-label={mobileMenuOpen ? t('closeMenu') : t('openMenu')}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            {mobileMenuOpen ? (
              <X className="h-[18px] w-[18px]" aria-hidden="true" />
            ) : (
              <Menu className="h-[18px] w-[18px]" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <nav
          className="flex flex-col gap-1 border-t bg-background px-6 pb-4 pt-3 min-[820px]:hidden"
          aria-label="Main"
        >
          {NAV.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className="rounded-lg px-2 py-2.5 text-[15px] font-medium transition-colors hover:bg-accent"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t(item.key)}
            </Link>
          ))}
          <Link
            href="/registration"
            className="mt-2 flex h-11 items-center justify-center rounded-lg bg-primary font-semibold text-primary-foreground"
            onClick={() => setMobileMenuOpen(false)}
          >
            {t('getStarted')}
          </Link>
        </nav>
      )}
    </header>
  );
}
