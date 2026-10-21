"use client";

import Link from "next/link";
import ReactMarkdown, { type Components } from "react-markdown";

import { LanguageToggle } from "@/components/legal/LanguageToggle";
import { useLegalLanguage, type LegalLanguage } from "@/components/legal/useLegalLanguage";

const markdownComponents: Components = {
  h1: ({ children }) => <h1 className="text-4xl font-bold text-gray-900 mb-6">{children}</h1>,
  h2: ({ children }) => <h2 className="text-2xl font-semibold text-gray-900 mb-3 mt-8">{children}</h2>,
  h3: ({ children }) => <h3 className="text-xl font-semibold text-gray-900 mb-2 mt-6">{children}</h3>,
  p: ({ children }) => <p className="text-gray-700 mb-4 leading-relaxed">{children}</p>,
  ul: ({ children }) => <ul className="list-disc pl-6 space-y-2 mb-4 text-gray-700">{children}</ul>,
  li: ({ children }) => <li className="text-gray-700">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
  a: ({ children, href }) => (
    <a
      href={href}
      className="text-blue-600 hover:underline"
      target={href?.startsWith("http") ? "_blank" : undefined}
      rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
    >
      {children}
    </a>
  ),
};

const RELATED: Record<LegalLanguage, { title: string; terms: string; refund: string; deletion: string }> = {
  ka: {
    title: "დაკავშირებული დოკუმენტები",
    terms: "მომსახურების პირობები",
    refund: "დაბრუნების პოლიტიკა",
    deletion: "მონაცემების წაშლა",
  },
  en: {
    title: "Related Documents",
    terms: "Terms of Service",
    refund: "Refund Policy",
    deletion: "Data Deletion",
  },
};

/**
 * Privacy policy. The markdown for both languages is read on the server (see
 * app/privacy-policy/page.tsx) and passed in, so the full text is in the
 * server-rendered HTML — Meta's app-review crawler doesn't run client fetches.
 */
export default function PrivacyPolicy({ content }: { content: Record<LegalLanguage, string> }) {
  const [language, setLanguage] = useLegalLanguage("ka");

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-8">
        <div className="flex justify-end mb-6">
          <LanguageToggle language={language} onChange={setLanguage} />
        </div>

        {(["ka", "en"] as const).map((lang) => (
          <article
            key={lang}
            lang={lang}
            hidden={language !== lang}
            className="prose prose-gray max-w-none"
            data-testid={`privacy-${lang}`}
          >
            <ReactMarkdown components={markdownComponents}>{content[lang]}</ReactMarkdown>

            <section className="border-t pt-6 mt-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">{RELATED[lang].title}</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/terms-of-service" className="text-blue-600 hover:underline">
                    {RELATED[lang].terms}
                  </Link>
                </li>
                <li>
                  <Link href="/refund-policy" className="text-blue-600 hover:underline">
                    {RELATED[lang].refund}
                  </Link>
                </li>
                <li>
                  <Link href="/data-deletion" className="text-blue-600 hover:underline">
                    {RELATED[lang].deletion}
                  </Link>
                </li>
              </ul>
            </section>
          </article>
        ))}
      </div>
    </div>
  );
}
