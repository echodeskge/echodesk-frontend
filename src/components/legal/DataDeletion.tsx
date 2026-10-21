"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";

import { LanguageToggle } from "./LanguageToggle";
import { useLegalLanguage, type LegalLanguage } from "./useLegalLanguage";

export const SUPPORT_EMAIL = "support@echodesk.ge";

type Section = { id: string; title: string; body: ReactNode };

const mail = (
  <a href={`mailto:${SUPPORT_EMAIL}?subject=Data%20deletion%20request`} className="text-blue-600 hover:underline">
    {SUPPORT_EMAIL}
  </a>
);

const CONTENT: Record<
  LegalLanguage,
  { title: string; updated: string; intro: ReactNode; codeLabel: string; sections: Section[]; related: string; privacy: string }
> = {
  en: {
    title: "Facebook & Instagram Data Deletion",
    updated: "Last updated: October 21, 2026",
    intro: (
      <>
        EchoDesk is a customer-service inbox that businesses connect to their Facebook Pages and Instagram
        professional accounts to read and answer Messenger and Instagram Direct messages. This page explains how to
        have the Facebook and Instagram data that EchoDesk processes deleted.
      </>
    ),
    codeLabel: "Your deletion request confirmation code",
    sections: [
      {
        id: "remove-app",
        title: "Option 1: Remove EchoDesk in Facebook (automatic)",
        body: (
          <>
            <ol className="list-decimal pl-6 space-y-2 mb-4 text-gray-700">
              <li>Open Facebook and go to Settings &amp; privacy → Settings.</li>
              <li>
                Open <strong>Apps and Websites</strong> (for a Page, Business Integrations), find{" "}
                <strong>EchoDesk</strong> and choose <strong>Remove</strong>.
              </li>
              <li>
                On Instagram, go to Settings → Website permissions → Apps and websites and remove EchoDesk.
              </li>
            </ol>
            <p className="text-gray-700 mb-4 leading-relaxed">
              Removing the app sends EchoDesk a data deletion request automatically through Meta&apos;s data
              deletion callback. Facebook then shows you a confirmation code and a link where you can check the
              status of the request.
            </p>
          </>
        ),
      },
      {
        id: "email",
        title: "Option 2: Email us",
        body: (
          <p className="text-gray-700 mb-4 leading-relaxed">
            Email {mail} with the subject &quot;Data deletion request&quot;. Include the name of the Facebook Page
            (or the Instagram username) the request is about. If you are a customer who messaged a business, also
            include the name of the Page you messaged and the name on your Facebook or Instagram profile so we can
            find your conversation. We may ask you to confirm that you own or manage the account.
          </p>
        ),
      },
      {
        id: "what",
        title: "What gets deleted",
        body: (
          <>
            <ul className="list-disc pl-6 space-y-2 mb-4 text-gray-700">
              <li>The connection between EchoDesk and the Page or Instagram account, including the access tokens Meta issued. Tokens are revoked right away.</li>
              <li>Messenger and Instagram messages, attachments, reactions and delivery or read receipts stored for that Page or account.</li>
              <li>Profile data received from Meta about the people in those conversations: names, profile pictures and Page- or Instagram-scoped user IDs.</li>
              <li>For a request from an individual customer: the messages and profile data linked to your Facebook or Instagram user ID.</li>
            </ul>
            <p className="text-gray-700 mb-4 leading-relaxed">
              We keep only what the law requires us to keep, such as billing records of the business&apos;s EchoDesk
              subscription. Those records do not contain your Facebook or Instagram messages.
            </p>
          </>
        ),
      },
      {
        id: "timeline",
        title: "Timeline",
        body: (
          <p className="text-gray-700 mb-4 leading-relaxed">
            Access is revoked immediately. The data listed above is deleted within <strong>30 days</strong> of the
            request.
          </p>
        ),
      },
      {
        id: "status",
        title: "Checking the status of a request",
        body: (
          <p className="text-gray-700 mb-4 leading-relaxed">
            When the request comes from removing EchoDesk in Facebook, Facebook shows a confirmation code and a status
            link from EchoDesk. Open that link at any time to see whether the deletion is pending or complete. If you
            contact us about a request, quote the confirmation code. For email requests we reply to confirm when the
            deletion is done.
          </p>
        ),
      },
      {
        id: "contact",
        title: "Questions",
        body: (
          <p className="text-gray-700 mb-4 leading-relaxed">
            Contact {mail}. LLC Echodesk, identification code 405794289, Tbilisi, Georgia.
          </p>
        ),
      },
    ],
    related: "Related Documents",
    privacy: "Privacy Policy",
  },
  ka: {
    title: "Facebook-ისა და Instagram-ის მონაცემების წაშლა",
    updated: "ბოლო განახლება: 21 ოქტომბერი, 2026",
    intro: (
      <>
        EchoDesk არის მომხმარებელთა მომსახურების ინბოქსი, რომელსაც ბიზნესები თავიანთ Facebook გვერდებსა და
        Instagram პროფესიულ ანგარიშებს აკავშირებენ Messenger-ისა და Instagram Direct შეტყობინებების წასაკითხად და
        მათზე საპასუხოდ. ეს გვერდი განმარტავს, როგორ წაშალოთ Facebook-ისა და Instagram-ის მონაცემები, რომლებსაც
        EchoDesk ამუშავებს.
      </>
    ),
    codeLabel: "თქვენი წაშლის მოთხოვნის დადასტურების კოდი",
    sections: [
      {
        id: "remove-app",
        title: "ვარიანტი 1: წაშალეთ EchoDesk Facebook-ში (ავტომატურად)",
        body: (
          <>
            <ol className="list-decimal pl-6 space-y-2 mb-4 text-gray-700">
              <li>გახსენით Facebook და გადადით: პარამეტრები და კონფიდენციალურობა → პარამეტრები.</li>
              <li>
                გახსენით <strong>აპები და ვებსაიტები</strong> (გვერდისთვის — ბიზნეს ინტეგრაციები), იპოვეთ{" "}
                <strong>EchoDesk</strong> და აირჩიეთ <strong>წაშლა</strong>.
              </li>
              <li>Instagram-ში გადადით: პარამეტრები → ვებსაიტის ნებართვები → აპები და ვებსაიტები და წაშალეთ EchoDesk.</li>
            </ol>
            <p className="text-gray-700 mb-4 leading-relaxed">
              აპის წაშლისას EchoDesk მონაცემების წაშლის მოთხოვნას ავტომატურად იღებს Meta-ს მონაცემთა წაშლის
              callback-ით. ამის შემდეგ Facebook გაჩვენებთ დადასტურების კოდს და ბმულს, სადაც მოთხოვნის სტატუსს
              შეამოწმებთ.
            </p>
          </>
        ),
      },
      {
        id: "email",
        title: "ვარიანტი 2: მოგვწერეთ ელფოსტაზე",
        body: (
          <p className="text-gray-700 mb-4 leading-relaxed">
            მოგვწერეთ {mail}-ზე თემით &quot;Data deletion request&quot;. მიუთითეთ Facebook გვერდის სახელი (ან
            Instagram-ის მომხმარებლის სახელი), რომელსაც მოთხოვნა ეხება. თუ ხართ მომხმარებელი, რომელმაც ბიზნესს
            მისწერა, ასევე მიუთითეთ გვერდის სახელი, რომელსაც მისწერეთ, და თქვენი Facebook ან Instagram პროფილის
            სახელი, რომ თქვენი მიმოწერა ვიპოვოთ. შესაძლოა გთხოვოთ დაადასტუროთ, რომ ანგარიში თქვენ გეკუთვნით ან თქვენ
            მართავთ.
          </p>
        ),
      },
      {
        id: "what",
        title: "რა იშლება",
        body: (
          <>
            <ul className="list-disc pl-6 space-y-2 mb-4 text-gray-700">
              <li>EchoDesk-სა და გვერდს ან Instagram ანგარიშს შორის კავშირი, მათ შორის Meta-ს მიერ გაცემული წვდომის ტოკენები. ტოკენები მაშინვე უქმდება.</li>
              <li>ამ გვერდისთვის ან ანგარიშისთვის შენახული Messenger-ისა და Instagram-ის შეტყობინებები, მიმაგრებული ფაილები, რეაქციები და მიწოდების ან წაკითხვის სტატუსები.</li>
              <li>Meta-სგან მიღებული პროფილის მონაცემები ამ საუბრების მონაწილეებზე: სახელები, პროფილის სურათები და გვერდის ან Instagram-ის ფარგლებში მინიჭებული მომხმარებლის ID-ები.</li>
              <li>ცალკეული მომხმარებლის მოთხოვნისას: თქვენს Facebook ან Instagram მომხმარებლის ID-სთან დაკავშირებული შეტყობინებები და პროფილის მონაცემები.</li>
            </ul>
            <p className="text-gray-700 mb-4 leading-relaxed">
              ვინახავთ მხოლოდ იმას, რისი შენახვაც კანონით გვევალება, მაგალითად ბიზნესის EchoDesk-ის გამოწერის
              საბილინგო ჩანაწერებს. ეს ჩანაწერები თქვენს Facebook ან Instagram შეტყობინებებს არ შეიცავს.
            </p>
          </>
        ),
      },
      {
        id: "timeline",
        title: "ვადები",
        body: (
          <p className="text-gray-700 mb-4 leading-relaxed">
            წვდომა მაშინვე უქმდება. ზემოთ ჩამოთვლილი მონაცემები მოთხოვნიდან <strong>30 დღის</strong> განმავლობაში
            იშლება.
          </p>
        ),
      },
      {
        id: "status",
        title: "მოთხოვნის სტატუსის შემოწმება",
        body: (
          <p className="text-gray-700 mb-4 leading-relaxed">
            როცა მოთხოვნა Facebook-ში EchoDesk-ის წაშლით იგზავნება, Facebook გაჩვენებთ დადასტურების კოდს და EchoDesk-ის
            სტატუსის ბმულს. ეს ბმული ნებისმიერ დროს გახსენით, რომ ნახოთ, მიმდინარეობს თუ დასრულდა წაშლა. ჩვენთან
            დაკავშირებისას მიუთითეთ დადასტურების კოდი. ელფოსტით გამოგზავნილ მოთხოვნაზე წაშლის დასრულებისას
            დადასტურებას გიპასუხებთ.
          </p>
        ),
      },
      {
        id: "contact",
        title: "კითხვები",
        body: (
          <p className="text-gray-700 mb-4 leading-relaxed">
            დაგვიკავშირდით: {mail}. შპს Echodesk, საიდენტიფიკაციო კოდი 405794289, თბილისი, საქართველო.
          </p>
        ),
      },
    ],
    related: "დაკავშირებული დოკუმენტები",
    privacy: "კონფიდენციალურობის პოლიტიკა",
  },
};

/**
 * Public "how to delete your Facebook / Instagram data" page (Meta's data
 * deletion instructions URL). Both languages are in the server-rendered HTML;
 * the toggle only switches which one is visible. `?code=` (a confirmation
 * code from the deletion callback) is echoed back to the visitor.
 */
export default function DataDeletion() {
  const [language, setLanguage] = useLegalLanguage("en");
  const [code, setCode] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = new URLSearchParams(window.location.search).get("code");
      if (raw && /^[A-Za-z0-9_-]{1,64}$/.test(raw)) setCode(raw);
    } catch {
      // ignore
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-8">
        <div className="flex justify-end mb-6">
          <LanguageToggle language={language} onChange={setLanguage} />
        </div>

        {(["en", "ka"] as const).map((lang) => {
          const c = CONTENT[lang];
          return (
            <article key={lang} lang={lang} hidden={language !== lang} data-testid={`data-deletion-${lang}`}>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">{c.title}</h1>
              <p className="text-sm text-gray-500 mb-6">{c.updated}</p>
              <p className="text-gray-700 mb-6 leading-relaxed">{c.intro}</p>

              {code && (
                <div className="mb-6 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                  {c.codeLabel}: <code className="font-mono font-semibold">{code}</code>
                </div>
              )}

              {c.sections.map((s) => (
                <section key={s.id} id={lang === "en" ? s.id : `${s.id}-ka`}>
                  <h2 className="text-2xl font-semibold text-gray-900 mb-3 mt-8">{s.title}</h2>
                  {s.body}
                </section>
              ))}

              <section className="border-t pt-6 mt-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">{c.related}</h3>
                <Link href="/privacy-policy" className="text-blue-600 hover:underline">
                  {c.privacy}
                </Link>
              </section>
            </article>
          );
        })}
      </div>
    </div>
  );
}
