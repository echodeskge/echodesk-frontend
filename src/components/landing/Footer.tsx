'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Facebook, Instagram, Linkedin, Mail } from 'lucide-react';
import { useConsent } from '@/lib/consent';
import { NewsletterSignup } from '@/components/marketing/NewsletterSignup';
import { cn } from '@/lib/utils';
import { CONTAINER } from './SectionHeading';

/**
 * Marketing footer (shared by the homepage and the other marketing pages):
 * newsletter card, link columns, cookie preferences. Carries the `.lp`
 * scope itself. The wordmark is the live-site logo, unchanged.
 */
export function Footer() {
  const t = useTranslations('landing.footer');
  const tFooter = useTranslations('footer');
  const tNewsletter = useTranslations('newsletter');
  const { openBanner } = useConsent();

  const link = 'transition-colors hover:text-foreground';

  return (
    <footer className="lp border-t bg-muted/40">
      <div className={cn(CONTAINER, 'flex flex-col gap-10 pb-8 pt-12')}>
        {/* Newsletter block — above the link grid */}
        <div className="flex flex-wrap items-center justify-between gap-5 rounded-2xl border bg-background p-6">
          <div className="flex max-w-[520px] flex-col gap-1">
            <h3 className="text-[17px] font-bold">{tNewsletter('heading')}</h3>
            <p className="text-sm text-muted-foreground">{tNewsletter('description')}</p>
          </div>
          <div className="min-w-[260px] max-w-[400px] flex-1">
            <NewsletterSignup source="footer" />
          </div>
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] gap-8">
          {/* Brand */}
          <div className="flex flex-col gap-3.5">
            <Image src="/logo-svg.svg" alt="EchoDesk" width={140} height={35} className="h-8 w-auto" />
            <p className="text-sm text-muted-foreground">{t('tagline')}</p>
            <div className="flex gap-3.5 text-muted-foreground">
              <a href="#" aria-label="Facebook" className={link}>
                <Facebook className="h-[18px] w-[18px]" aria-hidden="true" />
              </a>
              <a href="#" aria-label="Instagram" className={link}>
                <Instagram className="h-[18px] w-[18px]" aria-hidden="true" />
              </a>
              <a href="#" aria-label="LinkedIn" className={link}>
                <Linkedin className="h-[18px] w-[18px]" aria-hidden="true" />
              </a>
              <a href="mailto:info@echodesk.ge" aria-label="Email EchoDesk" className={link}>
                <Mail className="h-[18px] w-[18px]" aria-hidden="true" />
              </a>
            </div>
          </div>

          {/* Product */}
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-bold">{t('product.title')}</h3>
            <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
              <li><Link href="/#features" className={link}>{t('product.features')}</Link></li>
              <li><Link href="/#pricing" className={link}>{t('product.pricing')}</Link></li>
              <li><Link href="/registration" className={link}>{t('product.signUp')}</Link></li>
              <li><Link href="/integrations" className={link}>{t('product.integrations')}</Link></li>
              <li><Link href="/about" className={link}>{t('product.about')}</Link></li>
              <li><Link href="/contact" className={link}>{t('product.contact')}</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-bold">{t('legal.title')}</h3>
            <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
              <li><Link href="/privacy-policy" className={link}>{t('legal.privacy')}</Link></li>
              <li><Link href="/terms-of-service" className={link}>{t('legal.terms')}</Link></li>
              <li><Link href="/refund-policy" className={link}>{t('legal.refund')}</Link></li>
              <li><Link href="/data-deletion" className={link}>{t('legal.dataDeletion')}</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-bold">{t('contact.title')}</h3>
            <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
              <li>
                {t('contact.email')}:{' '}
                <a href="mailto:info@echodesk.ge" className={link}>info@echodesk.ge</a>
              </li>
              <li>
                {t('contact.phone')}:{' '}
                <a href="tel:+995510003358" className={link}>+995 (510) 003-358</a>
              </li>
              <li>{t('contact.address')}: Tbilisi, Georgia</li>
              <li className="pt-1.5">Echodesk LLC / შპს ექოდესკი</li>
              <li>{tFooter('legal.taxId')}</li>
            </ul>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-6 text-[13px] text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} EchoDesk. {t('rights')}</p>
          <button
            type="button"
            onClick={openBanner}
            className="underline-offset-[3px] transition-colors hover:text-foreground hover:underline"
          >
            {tFooter('cookiePreferences')}
          </button>
        </div>
      </div>
    </footer>
  );
}
