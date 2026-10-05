import { describe, expect, it } from "vitest"
import { isGsmText, renderSmsTemplate, smsLength, smsSegments } from "@/lib/sms"

describe("sms", () => {
  it("counts plain Latin at 160 / 153 per SMS", () => {
    expect(smsSegments("")).toBe(0)
    expect(smsSegments("a".repeat(160))).toBe(1)
    expect(smsSegments("a".repeat(161))).toBe(2)
    expect(smsSegments("a".repeat(306))).toBe(2)
    expect(smsSegments("a".repeat(307))).toBe(3)
  })

  it("counts Georgian at 70 / 67 per SMS", () => {
    expect(isGsmText("გამარჯობა")).toBe(false)
    expect(smsSegments("ა".repeat(70))).toBe(1)
    expect(smsSegments("ა".repeat(71))).toBe(2)
    expect(smsSegments("ა".repeat(134))).toBe(2)
    expect(smsSegments("ა".repeat(135))).toBe(3)
  })

  it("counts GSM extension characters twice", () => {
    expect(smsLength("€{}")).toBe(6)
    expect(smsSegments("€".repeat(80))).toBe(1)
    expect(smsSegments("€".repeat(81))).toBe(2)
  })

  it("fills placeholders and keeps unknown ones", () => {
    expect(renderSmsTemplate(" Hi {name}, {oops} at {time} ", { name: "Ana", time: "14:00" })).toBe("Hi Ana, {oops} at 14:00")
  })
})
