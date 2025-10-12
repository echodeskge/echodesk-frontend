# Internationalization (i18n) Guide

## Overview

The application supports multiple languages using `next-intl`. Currently supported languages:
- **English** (en) - Default
- **Georgian** (ka) - ქართული

## How to Use Translations

### In Client Components

```tsx
"use client";

import { useTranslations } from 'next-intl';

export function MyComponent() {
  const t = useTranslations('common'); // or 'tickets', 'nav', etc.

  return (
    <div>
      <button>{t('save')}</button>
      <button>{t('cancel')}</button>
    </div>
  );
}
```

### Available Translation Keys

All translations are organized in JSON files under `src/i18n/messages/`:
- `src/i18n/messages/en.json` - English translations
- `src/i18n/messages/ka.json` - Georgian translations

#### Translation Namespaces:

- **common**: `save`, `cancel`, `delete`, `edit`, `create`, `add`, `remove`, `close`, `back`, `search`, etc.
- **nav**: `tickets`, `calls`, `messages`, `orders`, `social`, `groups`, `users`, `settings`
- **auth**: `login`, `logout`, `email`, `password`, `forgotPassword`
- **tickets**: `title`, `newTicket`, `description`, `priority`, `status`, `assignedTo`, `labels`, etc.
- **labels**: Label management translations
- **calls**: Call-related translations
- **messages**: Messaging translations
- **settings**: Settings translations
- **users**: User management translations

### Example Usage

```tsx
// Tickets page
import { useTranslations } from 'next-intl';

export function TicketsPage() {
  const t = useTranslations('tickets');
  const tCommon = useTranslations('common');

  return (
    <div>
      <h1>{t('title')}</h1>
      <button>{t('newTicket')}</button>
      <button>{tCommon('search')}</button>
    </div>
  );
}
```

```tsx
// Navigation
import { useTranslations } from 'next-intl';

export function Navigation() {
  const t = useTranslations('nav');

  return (
    <nav>
      <a href="/tickets">{t('tickets')}</a>
      <a href="/calls">{t('calls')}</a>
      <a href="/messages">{t('messages')}</a>
    </nav>
  );
}
```

## Language Switcher

The language switcher is already integrated in the tenant layout header. Users can click the globe icon to switch between English and Georgian.

## Adding New Translations

1. Add the key to `src/i18n/messages/en.json`
2. Add the Georgian translation to `src/i18n/messages/ka.json`
3. Use `useTranslations` hook in your component

Example:
```json
// en.json
{
  "myFeature": {
    "title": "My Feature",
    "description": "This is my feature"
  }
}

// ka.json
{
  "myFeature": {
    "title": "ჩემი ფუნქცია",
    "description": "ეს არის ჩემი ფუნქცია"
  }
}
```

## How It Works

1. User selects language from the globe icon dropdown
2. Language preference is stored in a cookie (`NEXT_LOCALE`)
3. On page refresh, the application loads the correct translations
4. All `useTranslations` hooks automatically use the current language

## Important Notes

- The language switcher is located in the top-right corner of the tenant layout
- Language preference persists across sessions (stored in cookie for 1 year)
- All translation keys must exist in both English and Georgian files
- Missing translations will show the key name in square brackets
