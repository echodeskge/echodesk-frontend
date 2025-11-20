"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";

export default function PrivacyPolicy() {
  const [language, setLanguage] = useState<"ka" | "en">("ka");
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchContent = async () => {
      setLoading(true);
      try {
        const filename = language === "ka" ? "privacy-georgian.md" : "privacy-english.md";
        const response = await fetch(`/${filename}`);
        const text = await response.text();
        setContent(text);
      } catch (error) {
        console.error("Error fetching privacy policy:", error);
        setContent("Error loading privacy policy content.");
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [language]);

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-8">
        {/* Language Switcher */}
        <div className="flex justify-end mb-6">
          <div className="inline-flex rounded-md shadow-sm" role="group">
            <button
              type="button"
              onClick={() => setLanguage("ka")}
              className={`px-4 py-2 text-sm font-medium rounded-l-lg border ${
                language === "ka"
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              }`}
            >
              ქართული
            </button>
            <button
              type="button"
              onClick={() => setLanguage("en")}
              className={`px-4 py-2 text-sm font-medium rounded-r-lg border-t border-r border-b ${
                language === "en"
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              }`}
            >
              English
            </button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-600">Loading...</div>
          </div>
        ) : (
          <div className="prose prose-gray max-w-none">
            <ReactMarkdown
              components={{
                h1: ({ children }) => (
                  <h1 className="text-4xl font-bold text-gray-900 mb-6">{children}</h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-2xl font-semibold text-gray-900 mb-3 mt-8">{children}</h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-xl font-semibold text-gray-900 mb-2 mt-6">{children}</h3>
                ),
                p: ({ children }) => (
                  <p className="text-gray-700 mb-4 leading-relaxed">{children}</p>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc pl-6 space-y-2 mb-4 text-gray-700">{children}</ul>
                ),
                li: ({ children }) => (
                  <li className="text-gray-700">{children}</li>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold text-gray-900">{children}</strong>
                ),
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
              }}
            >
              {content}
            </ReactMarkdown>

            {/* Related Documents Section */}
            <section className="border-t pt-6 mt-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                {language === "ka" ? "დაკავშირებული დოკუმენტები" : "Related Documents"}
              </h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/terms-of-service" className="text-blue-600 hover:underline">
                    {language === "ka" ? "მომსახურების პირობები" : "Terms of Service"}
                  </Link>
                </li>
                <li>
                  <Link href="/refund-policy" className="text-blue-600 hover:underline">
                    {language === "ka" ? "დაბრუნების პოლიტიკა" : "Refund Policy"}
                  </Link>
                </li>
              </ul>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
