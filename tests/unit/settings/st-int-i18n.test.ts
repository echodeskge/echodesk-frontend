/** Settings redesign integration: every key the ST-00..05 packages added is in both merged catalogs. */
import { describe, expect, it } from "vitest"
import en from "@/i18n/messages/en.json"
import ka from "@/i18n/messages/ka.json"
import pendingKeys from "./fixtures/st-pending-keys.json"
import { lookup } from "./st-helpers"

describe("settings redesign i18n after integration", () => {
  for (const [pkg, keys] of Object.entries(pendingKeys as Record<string, { en: string[]; ka: string[] }>)) {
    it(`${pkg}: every key is a string in en.json and ka.json`, () => {
      expect(keys.en.filter((k) => typeof lookup(en, k) !== "string")).toEqual([])
      expect(keys.ka.filter((k) => typeof lookup(ka, k) !== "string")).toEqual([])
    })
  }
})
