'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import { useTranslations, useLocale } from 'next-intl';
import { Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { submitContact } from '@/hooks/useMarketing';
import type { ContactSubmissionCreateRequest } from '@/api/generated/interfaces';

const SUBJECT_VALUES = ['sales', 'demo', 'support', 'partnership', 'other'] as const;
type Subject = (typeof SUBJECT_VALUES)[number];

const Schema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  phone: z.string().max(40).optional().or(z.literal('')),
  company: z.string().max(120).optional().or(z.literal('')),
  subject: z.enum(SUBJECT_VALUES),
  message: z.string().min(10).max(5000),
});

type FormType = z.infer<typeof Schema>;

/**
 * Bilingual contact form. Posts to `/api/marketing/public/contact/submit/`.
 * On success replaces the form with a thank-you Card; on 429 surfaces a
 * "slow down" toast so users retry later without a raw axios error.
 */
export function ContactForm() {
  const t = useTranslations('contact.form');
  const tSubjects = useTranslations('contact.form.subjects');
  const tSuccess = useTranslations('contact.success');
  const locale = useLocale();
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<FormType>({
    resolver: zodResolver(Schema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      company: '',
      subject: 'sales',
      message: '',
    },
  });

  const onSubmit = async (values: FormType) => {
    try {
      const payload: ContactSubmissionCreateRequest = {
        name: values.name,
        email: values.email,
        phone: values.phone || undefined,
        company: values.company || undefined,
        // Generated enum types are permissive index-signature objects;
        // the backend expects plain strings for these fields.
        subject: values.subject as unknown as ContactSubmissionCreateRequest['subject'],
        message: values.message,
        preferred_language: (locale === 'en'
          ? 'en'
          : 'ka') as unknown as ContactSubmissionCreateRequest['preferred_language'],
      };
      await submitContact(payload);
      setSubmitted(true);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 429) {
        toast.error(t('rateLimited'));
      } else {
        toast.error(t('error'));
      }
    }
  };

  if (submitted) {
    return (
      <Card className="border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-900/10">
        <CardContent className="p-8 space-y-3 text-center">
          <div className="h-12 w-12 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
            <Check className="h-6 w-6 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          </div>
          <h3 className="text-xl font-semibold">{tSuccess('title')}</h3>
          <p className="text-sm text-muted-foreground max-w-prose mx-auto">
            {tSuccess('body')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('name')}</FormLabel>
                <FormControl>
                  <Input autoComplete="name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('email')}</FormLabel>
                <FormControl>
                  <Input type="email" autoComplete="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('phone')}</FormLabel>
                <FormControl>
                  <Input type="tel" autoComplete="tel" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="company"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('company')}</FormLabel>
                <FormControl>
                  <Input autoComplete="organization" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="subject"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('subject')}</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {SUBJECT_VALUES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {tSubjects(s as Subject)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('message')}</FormLabel>
              <FormControl>
                <Textarea rows={6} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" size="lg" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" aria-hidden="true" />
              {t('submitting')}
            </>
          ) : (
            t('submit')
          )}
        </Button>
      </form>
    </Form>
  );
}
