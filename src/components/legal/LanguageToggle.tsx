"use client";

import type { LegalLanguage } from "./useLegalLanguage";

export function LanguageToggle({
  language,
  onChange,
}: {
  language: LegalLanguage;
  onChange: (language: LegalLanguage) => void;
}) {
  const base = "px-4 py-2 text-sm font-medium border";
  const active = "bg-blue-600 text-white border-blue-600";
  const idle = "bg-white text-gray-700 border-gray-300 hover:bg-gray-50";
  return (
    <div className="inline-flex rounded-md shadow-sm" role="group">
      <button
        type="button"
        lang="ka"
        aria-pressed={language === "ka"}
        onClick={() => onChange("ka")}
        className={`${base} rounded-l-lg ${language === "ka" ? active : idle}`}
      >
        ქართული
      </button>
      <button
        type="button"
        lang="en"
        aria-pressed={language === "en"}
        onClick={() => onChange("en")}
        className={`${base} rounded-r-lg border-l-0 ${language === "en" ? active : idle}`}
      >
        English
      </button>
    </div>
  );
}
