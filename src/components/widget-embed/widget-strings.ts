/**
 * Visitor-facing copy for the iframe widget.
 *
 * The iframe deliberately runs WITHOUT a next-intl provider to keep its
 * JS bundle tiny (the host page is paying for our weight). Instead we
 * keep an English/Georgian dictionary in this file and pick the active
 * locale from `navigator.language`, matching the heuristic used by
 * `pickLocalized` in WidgetShell for tenant-configured `welcome_message`s.
 */

interface WidgetStrings {
  close: {
    title: string;
    prompt: string;
    minimize: string;
    endConversation: string;
    cancel: string;
  };
  review: {
    visitorTitle: string;
    agentTitle: string;
    prompt: string;
    ratingLabel: string;
    commentLabel: string;
    commentPlaceholder: string;
    submit: string;
    skip: string;
    thanks: string;
  };
}

const EN: WidgetStrings = {
  close: {
    title: 'Close chat?',
    prompt: 'Minimize to keep the conversation, or end it now.',
    minimize: 'Minimize',
    endConversation: 'End conversation',
    cancel: 'Cancel',
  },
  review: {
    visitorTitle: 'How was your experience?',
    agentTitle: 'The agent ended this conversation',
    prompt: 'Rate your chat to help us improve.',
    ratingLabel: 'Rating',
    commentLabel: 'Comment (optional)',
    commentPlaceholder: "Anything you'd like to share?",
    submit: 'Submit',
    skip: 'Skip',
    thanks: 'Thanks for your feedback!',
  },
};

const KA: WidgetStrings = {
  close: {
    title: 'ჩატის დახურვა?',
    prompt: 'მინიმიზაცია საუბრის შესანახად, ან დასრულება ახლა.',
    minimize: 'მინიმიზაცია',
    endConversation: 'საუბრის დასრულება',
    cancel: 'გაუქმება',
  },
  review: {
    visitorTitle: 'როგორი იყო თქვენი გამოცდილება?',
    agentTitle: 'ოპერატორმა საუბარი დაასრულა',
    prompt: 'შეაფასეთ ჩატი, რომ დაგვეხმაროთ გავუმჯობესოთ მომსახურება.',
    ratingLabel: 'შეფასება',
    commentLabel: 'კომენტარი (არასავალდებულო)',
    commentPlaceholder: 'გვითხარით, რა სურდით გაგვეცნოთ?',
    submit: 'გაგზავნა',
    skip: 'გამოტოვება',
    thanks: 'მადლობა გამოხმაურებისთვის!',
  },
};

/**
 * Pick a string set based on `navigator.language`. Defaults to English when
 * the locale isn't recognised or the API is unavailable (SSR / very old
 * browsers).
 */
export function pickWidgetStrings(): WidgetStrings {
  if (typeof navigator === 'undefined') return EN;
  const lang = (navigator.language || 'en').slice(0, 2).toLowerCase();
  if (lang === 'ka') return KA;
  return EN;
}
