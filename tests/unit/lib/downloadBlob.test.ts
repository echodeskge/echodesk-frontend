import { describe, it, expect, vi } from "vitest"
import { downloadBlob, filenameFromContentDisposition } from "@/lib/downloadBlob"

describe("filenameFromContentDisposition", () => {
  it("reads a quoted filename", () => {
    expect(filenameFromContentDisposition('attachment; filename="payroll_acme_2026-11.csv"', "x.csv")).toBe(
      "payroll_acme_2026-11.csv"
    )
  })
  it("reads an unquoted filename", () => {
    expect(filenameFromContentDisposition("attachment; filename=report.csv", "x.csv")).toBe("report.csv")
  })
  it("prefers RFC 5987 filename*", () => {
    expect(
      filenameFromContentDisposition("attachment; filename=\"a.csv\"; filename*=UTF-8''%E1%83%90.csv", "x.csv")
    ).toBe("ა.csv")
  })
  it("falls back when missing", () => {
    expect(filenameFromContentDisposition(undefined, "fallback.csv")).toBe("fallback.csv")
    expect(filenameFromContentDisposition("inline", "fallback.csv")).toBe("fallback.csv")
  })
})

describe("downloadBlob", () => {
  it("clicks a temporary link with the file name", () => {
    const create = vi.fn(() => "blob:test")
    const revoke = vi.fn()
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke })
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {})
    vi.useFakeTimers()
    downloadBlob(new Blob(["a,b"]), "out.csv")
    expect(create).toHaveBeenCalled()
    expect(click).toHaveBeenCalledTimes(1)
    expect(document.querySelector('a[download="out.csv"]')).toBeNull()
    vi.runAllTimers()
    expect(revoke).toHaveBeenCalledWith("blob:test")
    vi.useRealTimers()
    click.mockRestore()
  })
})
