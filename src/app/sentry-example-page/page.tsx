"use client";

import * as Sentry from "@sentry/nextjs";

export default function SentryExamplePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8 gap-4">
      <h1 className="text-2xl font-bold">Sentry Test Page</h1>
      <p className="text-gray-600 mb-4">Click the button below to trigger a test error</p>

      <button
        className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium"
        onClick={() => {
          throw new Error("Sentry Frontend Test Error");
        }}
      >
        Throw Test Error
      </button>

      <button
        className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-medium"
        onClick={() => {
          Sentry.captureMessage("Test message from Sentry Example Page");
          alert("Message sent to Sentry!");
        }}
      >
        Send Test Message
      </button>

      <button
        className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium"
        onClick={async () => {
          // This will cause an undefined function error
          // @ts-expect-error - Intentional error for testing
          myUndefinedFunction();
        }}
      >
        Call Undefined Function
      </button>
    </div>
  );
}
