'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Facebook, Instagram, Linkedin, Mail } from 'lucide-react';
import { useConsent } from '@/lib/consent';

export function Footer() {
  const t = useTranslations('landing.footer');
  const tFooter = useTranslations('footer');
  const { openBanner } = useConsent();

  return (
    <footer className="border-t bg-muted/40">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <Image
              src="/logo-svg.svg"
              alt="EchoDesk"
              width={140}
              height={35}
              className="h-8 w-auto"
            />
            <p className="text-sm text-muted-foreground">{t('tagline')}</p>
            <div className="flex gap-3">
              <a
                href="#"
                aria-label="Facebook"
                className="hover:text-secondary transition-colors"
              >
                <Facebook className="h-5 w-5" aria-hidden="true" />
              </a>
              <a
                href="#"
                aria-label="Instagram"
                className="hover:text-secondary transition-colors"
              >
                <Instagram className="h-5 w-5" aria-hidden="true" />
              </a>
              <a
                href="#"
                aria-label="LinkedIn"
                className="hover:text-secondary transition-colors"
              >
                <Linkedin className="h-5 w-5" aria-hidden="true" />
              </a>
              <a
                href="mailto:info@echodesk.ge"
                aria-label="Email EchoDesk"
                className="hover:text-secondary transition-colors"
              >
                <Mail className="h-5 w-5" aria-hidden="true" />
              </a>
            </div>
          </div>

          {/* Product */}
          <div className="space-y-4">
            <h3 className="font-semibold">{t('product.title')}</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="#features" className="text-muted-foreground hover:text-secondary transition-colors">
                  {t('product.features')}
                </Link>
              </li>
              <li>
                <Link href="#pricing" className="text-muted-foreground hover:text-secondary transition-colors">
                  {t('product.pricing')}
                </Link>
              </li>
              <li>
                <Link href="/registration" className="text-muted-foreground hover:text-secondary transition-colors">
                  {t('product.signUp')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <h3 className="font-semibold">{t('legal.title')}</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/privacy-policy" className="text-muted-foreground hover:text-secondary transition-colors">
                  {t('legal.privacy')}
                </Link>
              </li>
              <li>
                <Link href="/terms-of-service" className="text-muted-foreground hover:text-secondary transition-colors">
                  {t('legal.terms')}
                </Link>
              </li>
              <li>
                <Link href="/refund-policy" className="text-muted-foreground hover:text-secondary transition-colors">
                  {t('legal.refund')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h3 className="font-semibold">{t('contact.title')}</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                {t('contact.email')}:{' '}
                <a href="mailto:info@echodesk.ge" className="hover:text-secondary transition-colors">
                  info@echodesk.ge
                </a>
              </li>
              <li>
                {t('contact.phone')}:{' '}
                <a href="tel:+995510003358" className="hover:text-secondary transition-colors">
                  +995 (510) 003-358
                </a>
              </li>
              <li>{t('contact.address')}: Tbilisi, Georgia</li>
              <li className="pt-2">Echodesk LLC / შპს ექოდესკი</li>
              <li>{tFooter('legal.taxId')}</li>
            </ul>
          </div>
        </div>

        <div className="border-t mt-8 pt-8 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} EchoDesk. {t('rights')}</p>
          <span aria-hidden="true" className="hidden sm:inline">·</span>
          <button
            type="button"
            onClick={openBanner}
            className="hover:text-secondary transition-colors underline-offset-2 hover:underline"
          >
            {tFooter('cookiePreferences')}
          </button>
        </div>
      </div>
    </footer>
  );
}
