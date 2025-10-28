'use client';

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
  Zap,
  Shield,
  Clock,
  Globe
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
  automation: Zap,
  security: Shield,
  realtime: Clock,
  multilingual: Globe,
};

export function Features() {
  const t = useTranslations('landing.features');

  const features = [
    {
      icon: 'tickets',
      titleKey: 'ticketManagement.title',
      descKey: 'ticketManagement.description',
    },
    {
      icon: 'email',
      titleKey: 'emailIntegration.title',
      descKey: 'emailIntegration.description',
    },
    {
      icon: 'sip',
      titleKey: 'sipCalling.title',
      descKey: 'sipCalling.description',
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
      icon: 'whatsapp',
      titleKey: 'whatsapp.title',
      descKey: 'whatsapp.description',
    },
    {
      icon: 'analytics',
      titleKey: 'analytics.title',
      descKey: 'analytics.description',
    },
    {
      icon: 'team',
      titleKey: 'teamCollaboration.title',
      descKey: 'teamCollaboration.description',
    },
    {
      icon: 'automation',
      titleKey: 'automation.title',
      descKey: 'automation.description',
    },
    {
      icon: 'security',
      titleKey: 'security.title',
      descKey: 'security.description',
    },
    {
      icon: 'realtime',
      titleKey: 'realtime.title',
      descKey: 'realtime.description',
    },
    {
      icon: 'multilingual',
      titleKey: 'multilingual.title',
      descKey: 'multilingual.description',
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
          const Icon = featureIcons[feature.icon as keyof typeof featureIcons];
          return (
            <Card key={feature.titleKey} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Icon className="h-6 w-6 text-primary" />
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
        })}
      </div>
    </section>
  );
}
