"use client";

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

import { WidgetShell } from '@/components/widget-embed/WidgetShell';

function WidgetEmbedInner() {
  const params = useSearchParams();
  const token = params.get('t');

  if (!token) {
    return (
      <div className="echodesk-widget-root">
        <div
          style={{
            display: 'flex',
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            textAlign: 'center',
            color: '#6b7280',
            fontSize: '13px',
          }}
        >
          Missing widget token. Check your &lt;script&gt; tag installation —
          the URL needs a <code>?t=</code> parameter.
        </div>
      </div>
    );
  }

  return <WidgetShell token={token} />;
}

export default function WidgetEmbedPage() {
  return (
    <Suspense fallback={<div className="echodesk-widget-root" />}>
      <WidgetEmbedInner />
    </Suspense>
  );
}
