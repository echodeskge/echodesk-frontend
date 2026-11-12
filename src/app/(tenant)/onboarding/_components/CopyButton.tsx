"use client"

import { useEffect, useState } from "react"
import { Check, Copy } from "lucide-react"
import { rdButton } from "@/components/redesign/buttons"

/** Copies `text` to the clipboard and shows "Copied" for two seconds. */
export function CopyButton({ text, label, copiedLabel, testId }: { text: string; label: string; copiedLabel: string; testId?: string }) {
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) return
    const id = window.setTimeout(() => setCopied(false), 2000)
    return () => window.clearTimeout(id)
  }, [copied])
  return (
    <button
      type="button"
      className={rdButton.outlineSm}
      onClick={async () => {
        try {
          await navigator.clipboard?.writeText(text)
          setCopied(true)
        } catch {
          /* clipboard unavailable: nothing to do */
        }
      }}
      data-testid={testId}
    >
      {copied ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
      {copied ? copiedLabel : label}
    </button>
  )
}
