/** ST-01 pending catalog: every key in both languages, real Georgian (no Latin letters outside placeholders/tags). */
import { describe, it, expect } from "vitest"
import { flatten, pending } from "./st-helpers"

const st01 = pending["st-01"]

describe("st-01 pending i18n", () => {
  it("exists and has the same keys in en and ka", () => {
    expect(st01).toBeTruthy()
    const en = Object.keys(flatten(st01.en)).sort()
    const ka = flatten(st01.ka)
    for (const k of en) expect(ka[k], k).toBeTruthy()
  })

  it("has no Latin interface text in Georgian", () => {
    const ka = flatten(st01.ka)
    for (const [k, v] of Object.entries(ka)) {
      const stripped = v
        .replace(/\{[^}]*\}/g, "")
        .replace(/<\/?[a-z]+>/g, "")
      expect(/[A-Za-z]/.test(stripped), `${k}: ${v}`).toBe(false)
    }
  })

  it("owns settings.ui (save bar + error texts) used by every settings page", () => {
    const en = flatten(st01.en)
    for (const k of ["errorTitle", "errorHint", "noAccessTitle", "noAccessHint", "retry", "loading", "saveBar.unsaved", "saveBar.discard", "saveBar.save", "saveBar.saving", "saveBar.saved"]) {
      expect(en[`settings.ui.${k}`], k).toBeTruthy()
    }
  })
})
