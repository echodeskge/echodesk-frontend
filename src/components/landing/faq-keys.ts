/**
 * Keys for the homepage FAQ entries. Lives outside the 'use client'
 * FAQ component so the server-rendered FAQPageSchema can import it —
 * Next.js can't read plain JS exports across the client/server
 * boundary (they get stubbed as module references).
 */
export const FAQ_KEYS = [
  'whatIsEchodesk',
  'channels',
  'calling',
  'gelBilling',
  'freeTrial',
  'competitors',
  'dataResidency',
] as const;
