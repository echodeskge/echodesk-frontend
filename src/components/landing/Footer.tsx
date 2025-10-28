'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Facebook, Instagram, Linkedin, Mail } from 'lucide-react';

export function Footer() {
  const t = useTranslations('landing.footer');

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
              <a href="#" className="hover:text-secondary transition-colors">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className="hover:text-secondary transition-colors">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="#" className="hover:text-secondary transition-colors">
                <Linkedin className="h-5 w-5" />
              </a>
              <a href="mailto:info@echodesk.ge" className="hover:text-secondary transition-colors">
                <Mail className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Product */}
          <div className="space-y-4">
            <h4 className="font-semibold">{t('product.title')}</h4>
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
            <h4 className="font-semibold">{t('legal.title')}</h4>
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
            <h4 className="font-semibold">{t('contact.title')}</h4>
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
            </ul>
          </div>
        </div>

        <div className="border-t mt-8 pt-8 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} EchoDesk. {t('rights')}</p>
        </div>
      </div>
    </footer>
  );
}
