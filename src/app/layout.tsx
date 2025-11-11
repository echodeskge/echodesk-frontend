import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TenantProvider } from '@/contexts/TenantContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { SubscriptionProvider } from '@/contexts/SubscriptionContext';
import QueryProvider from '@/providers/QueryProvider';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { DevTenantLoader } from '@/components/DevTenantLoader';
import { NetworkMonitor } from '@/components/debug/NetworkMonitor';
import { Toaster } from 'sonner';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EchoDesk - Multi-Tenant CRM",
  description: "Professional CRM solution for modern businesses",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const messages = await getMessages();

  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} bg-white`}>
        <DevTenantLoader />
        <NextIntlClientProvider messages={messages}>
          <QueryProvider>
            <TenantProvider>
              <AuthProvider>
                <SubscriptionProvider>
                  {children}
                </SubscriptionProvider>
              </AuthProvider>
            </TenantProvider>
          </QueryProvider>
        </NextIntlClientProvider>
        <Toaster position="top-right" richColors />
        <NetworkMonitor />
      </body>
    </html>
  );
}
