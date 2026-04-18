'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  MessageSquare,
  Phone,
  Mail,
  Facebook,
  Instagram,
  MessageCircle,
  BarChart3,
  Users,
  Shield,
  Clock,
  Globe,
  FileText,
  Calendar,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const featureIcons = {
  tickets: MessageSquare,
  email: Mail,
  sip: Phone,
  facebook: Facebook,
  instagram: Instagram,
  whatsapp: MessageCircle,
  analytics: BarChart3,
  team: Users,
  automation: FileText,
  security: Shield,
  realtime: Clock,
  multilingual: Globe,
  invoicing: FileText,
  bookings: Calendar,
  leave: Clock,
};

/**
 * A card entry can optionally link to a dedicated SEO landing page
 * (added in Phase 3). Cards without `href` stay plain — we only link
 * modules that have real landing pages drafted.
 */
interface FeatureCard {
  icon: keyof typeof featureIcons;
  titleKey: string;
  descKey: string;
  href?: string;
}

export function Features() {
  const t = useTranslations('landing.features');

  const features: FeatureCard[] = [
    {
      icon: 'tickets',
      titleKey: 'ticketManagement.title',
      descKey: 'ticketManagement.description',
      href: '/ticket-management-georgia',
    },
    {
      icon: 'sip',
      titleKey: 'sipCalling.title',
      descKey: 'sipCalling.description',
      href: '/call-center-software-tbilisi',
    },
    {
      icon: 'automation',
      titleKey: 'advancedForms.title',
      descKey: 'advancedForms.description',
    },
    {
      icon: 'whatsapp',
      titleKey: 'whatsapp.title',
      descKey: 'whatsapp.description',
      href: '/whatsapp-business-crm-georgia',
    },
    {
      icon: 'facebook',
      titleKey: 'facebook.title',
      descKey: 'facebook.description',
    },
    {
      icon: 'instagram',
      titleKey: 'instagram.title',
      descKey: 'instagram.description',
    },
    {
      icon: 'email',
      titleKey: 'email.title',
      descKey: 'email.description',
      href: '/email-helpdesk-georgia',
    },
    {
      icon: 'invoicing',
      titleKey: 'invoicing.title',
      descKey: 'invoicing.description',
      href: '/invoice-software-gel',
    },
    {
      icon: 'bookings',
      titleKey: 'bookings.title',
      descKey: 'bookings.description',
      href: '/booking-software-georgia',
    },
    {
      icon: 'leave',
      titleKey: 'leave.title',
      descKey: 'leave.description',
      href: '/leave-management-georgia',
    },
  ];

  return (
    <section id="features" className="container py-16 space-y-8">
      <div className="text-center mx-auto space-y-2 max-w-3xl">
        <h2 className="text-4xl font-bold">{t('title')}</h2>
        <p className="text-lg text-muted-foreground">{t('subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
        {features.map((feature) => {
          const Icon = featureIcons[feature.icon];
          const card = (
            <Card
              className={`hover:shadow-lg transition-shadow h-full ${
                feature.href ? 'cursor-pointer hover:border-primary/50' : ''
              }`}
            >
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-secondary/10 flex items-center justify-center mb-4">
                  <Icon className="h-6 w-6 text-secondary" />
                </div>
                <CardTitle>{t(feature.titleKey)}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  {t(feature.descKey)}
                </CardDescription>
              </CardContent>
            </Card>
          );
          if (feature.href) {
            return (
              <Link key={feature.titleKey} href={feature.href} className="block">
                {card}
              </Link>
            );
          }
          return <div key={feature.titleKey}>{card}</div>;
        })}
      </div>
    </section>
  );
}
