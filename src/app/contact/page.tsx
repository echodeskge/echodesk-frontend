import { Phone, Mail, MapPin, Clock, Globe } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Card } from '@/components/ui/card';
import { ContactForm } from '@/components/marketing/ContactForm';

export const revalidate = 300;

export default async function ContactPage() {
  const t = await getTranslations('contact');

  const sidebarItems = [
    { icon: Phone, label: t('sidebar.phoneLabel'), value: t('sidebar.phone'), href: 'tel:+995510003358' },
    { icon: Mail, label: t('sidebar.emailLabel'), value: t('sidebar.email'), href: 'mailto:info@echodesk.ge' },
    { icon: MapPin, label: t('sidebar.addressLabel'), value: t('sidebar.address') },
    { icon: Clock, label: t('sidebar.responseTimeLabel'), value: t('sidebar.responseTime') },
    { icon: Globe, label: t('sidebar.languagesLabel'), value: t('sidebar.languages') },
  ];

  return (
    <section className="container mx-auto max-w-6xl px-4 py-10 md:py-14">
      <header className="text-center space-y-3 mb-10 md:mb-14">
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight">{t('hero.title')}</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{t('hero.subtitle')}</p>
      </header>

      <div className="grid md:grid-cols-3 gap-8 md:gap-10">
        <div className="md:col-span-2">
          <ContactForm />
        </div>

        <aside className="space-y-3">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const body = (
              <div className="flex items-start gap-3">
                <Icon className="h-5 w-5 mt-0.5 text-primary flex-shrink-0" />
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {item.label}
                  </div>
                  <div className="text-sm">{item.value}</div>
                </div>
              </div>
            );
            return (
              <Card key={item.label} className="p-4">
                {item.href ? (
                  <a href={item.href} className="block hover:opacity-80 transition-opacity">
                    {body}
                  </a>
                ) : (
                  body
                )}
              </Card>
            );
          })}
        </aside>
      </div>
    </section>
  );
}
