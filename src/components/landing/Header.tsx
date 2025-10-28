'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Globe, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function Header() {
  const t = useTranslations('landing.header');
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const changeLanguage = async (locale: string) => {
    try {
      // Set locale cookie
      await fetch('/api/set-locale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale }),
      });

      // Reload to apply new language
      router.refresh();
    } catch (error) {
      console.error('Failed to change language:', error);
    }
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setMobileMenuOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2">
          <Image
            src="/logo-svg.svg"
            alt="EchoDesk"
            width={100}
            height={26}
            className="h-6 w-auto"
          />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          <button
            onClick={() => scrollToSection('features')}
            className="text-sm font-medium text-muted-foreground hover:text-secondary transition-colors"
          >
            {t('features')}
          </button>
          <button
            onClick={() => scrollToSection('pricing')}
            className="text-sm font-medium text-muted-foreground hover:text-secondary transition-colors"
          >
            {t('pricing')}
          </button>
          <Link
            href="/privacy-policy"
            className="text-sm font-medium text-muted-foreground hover:text-secondary transition-colors"
          >
            {t('privacy')}
          </Link>
          <Link
            href="/terms-of-service"
            className="text-sm font-medium text-muted-foreground hover:text-secondary transition-colors"
          >
            {t('terms')}
          </Link>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {/* Language Switcher */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <Globe className="h-4 w-4" />
                <span className="hidden sm:inline">{t('language')}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => changeLanguage('ka')}>
                ქართული
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => changeLanguage('en')}>
                English
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* CTA Button */}
          <Button asChild className="hidden sm:flex">
            <Link href="/registration">{t('getStarted')}</Link>
          </Button>

          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t bg-background">
          <nav className="container py-4 flex flex-col space-y-3">
            <button
              onClick={() => scrollToSection('features')}
              className="text-sm font-medium text-muted-foreground hover:text-secondary transition-colors text-left"
            >
              {t('features')}
            </button>
            <button
              onClick={() => scrollToSection('pricing')}
              className="text-sm font-medium text-muted-foreground hover:text-secondary transition-colors text-left"
            >
              {t('pricing')}
            </button>
            <Link
              href="/privacy-policy"
              className="text-sm font-medium text-muted-foreground hover:text-secondary transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t('privacy')}
            </Link>
            <Link
              href="/terms-of-service"
              className="text-sm font-medium text-muted-foreground hover:text-secondary transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t('terms')}
            </Link>
            <Button asChild className="w-full">
              <Link href="/registration">{t('getStarted')}</Link>
            </Button>
          </nav>
        </div>
      )}
    </header>
  );
}
