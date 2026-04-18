'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations, useLocale } from 'next-intl';
import { Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { subscribeNewsletter } from '@/hooks/useMarketing';
import type { NewsletterSubscribeRequest } from '@/api/generated/interfaces';

const Schema = z.object({
  email: z.string().email(),
});

type FormType = z.infer<typeof Schema>;

interface NewsletterSignupProps {
  /** Attribution — e.g. `footer`, `blog_post`, `landing_page`. */
  source?: string;
  className?: string;
}

/**
 * Small horizontal newsletter signup used in the footer (and reusable
 * elsewhere). Posts to the public marketing API — no auth required.
 *
 * The success state replaces the form with a short confirmation line so
 * users get feedback without waiting on the welcome email.
 */
export function NewsletterSignup({ source = 'footer', className }: NewsletterSignupProps) {
  const t = useTranslations('newsletter');
  const locale = useLocale();
  const [subscribed, setSubscribed] = useState(false);

  const form = useForm<FormType>({
    resolver: zodResolver(Schema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (values: FormType) => {
    try {
      // The generated `LocaleEnum` is a permissive index signature; we
      // send the plain locale string the backend expects (`'ka' | 'en'`).
      const payload: NewsletterSubscribeRequest = {
        email: values.email,
        locale: (locale === 'en' ? 'en' : 'ka') as unknown as NewsletterSubscribeRequest['locale'],
        source,
      };
      await subscribeNewsletter(payload);
      setSubscribed(true);
      form.reset();
    } catch {
      toast.error(t('error'));
    }
  };

  if (subscribed) {
    return (
      <div
        className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400"
        role="status"
      >
        <Check className="h-4 w-4" aria-hidden="true" />
        <span>{t('success')}</span>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={`flex flex-col sm:flex-row gap-2 ${className ?? ''}`}
      >
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem className="flex-1">
              <FormControl>
                <Input
                  type="email"
                  autoComplete="email"
                  placeholder={t('placeholder')}
                  aria-label={t('placeholder')}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={form.formState.isSubmitting} className="sm:w-auto">
          {form.formState.isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            t('button')
          )}
        </Button>
      </form>
    </Form>
  );
}
