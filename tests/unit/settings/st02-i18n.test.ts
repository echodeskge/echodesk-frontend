/** ST-02 pending catalog: every key exists in en and ka, and the Georgian has no stray Latin. */
import { describe, expect, it } from "vitest"
import { flatten, pending } from "./st-helpers"

// Protocol / brand names and ICU / rich-text markup that legitimately stay Latin in Georgian.
const ALLOWED = /\{\{customer_name\}\}|\b(IMAP|SMTP|SSL|TLS|STARTTLS|Gmail|WhatsApp|SMS)\b|<\/?(strong|link)>|\{[a-zA-Z]+(, plural, (one|other) )?/g

describe("st-02 pending i18n", () => {
  const p = pending["st-02"]
  const en = flatten(p.en)
  const ka = flatten(p.ka)

  it("has the same keys in en and ka", () => {
    expect(Object.keys(ka).sort()).toEqual(Object.keys(en).sort())
    expect(Object.keys(en).length).toBeGreaterThan(80)
  })

  it("Georgian values contain no Latin interface text", () => {
    const offenders = Object.entries(ka).filter(([, v]) => /[A-Za-z]/.test(v.replace(ALLOWED, "")))
    expect(offenders).toEqual([])
  })

  it("keeps the ICU placeholders of the English text", () => {
    for (const [k, v] of Object.entries(en)) {
      const vars = (s: string) => [...s.matchAll(/\{([a-zA-Z]+)[,}]/g)].map((m) => m[1]).sort()
      expect(vars(ka[k]), k).toEqual(vars(v))
    }
  })
})
