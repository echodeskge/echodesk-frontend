import { describe, it, expect, vi, beforeEach } from "vitest"
import { useState } from "react"
import { render, fireEvent, waitFor } from "@testing-library/react"

const post = vi.fn()
vi.mock("@/api/axios", () => ({ default: { post: (...args: unknown[]) => post(...args) } }))
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }))
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

import { ImageGalleryPicker } from "@/components/ImageGalleryPicker"

function makeFile(name: string) {
  return new File(["x"], name, { type: "image/jpeg" })
}

function Harness({ initial, onValue }: { initial: string; onValue: (v: string) => void }) {
  const [value, setValue] = useState(initial)
  return (
    <ImageGalleryPicker
      value={value}
      onChange={(v) => {
        setValue(v)
        onValue(v)
      }}
    />
  )
}

describe("ImageGalleryPicker", () => {
  beforeEach(() => {
    post.mockReset()
  })

  it("keeps every photo when several are picked at once", async () => {
    // Uploads resolve out of order, as they do over the network.
    const delays: Record<string, number> = { "a.jpg": 30, "b.jpg": 5, "c.jpg": 15 }
    post.mockImplementation((_url: string, form: FormData) => {
      const file = form.get("image") as File
      return new Promise((resolve) =>
        setTimeout(() => resolve({ data: { url: `https://cdn.test/${file.name}` } }), delays[file.name]),
      )
    })
    const onValue = vi.fn()
    const { container } = render(<Harness initial="https://cdn.test/old.jpg" onValue={onValue} />)
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    expect(input.multiple).toBe(true)

    fireEvent.change(input, { target: { files: [makeFile("a.jpg"), makeFile("b.jpg"), makeFile("c.jpg")] } })

    await waitFor(() => expect(onValue).toHaveBeenCalled())
    expect(post).toHaveBeenCalledTimes(3)
    expect(onValue).toHaveBeenLastCalledWith(
      "https://cdn.test/old.jpg, https://cdn.test/a.jpg, https://cdn.test/b.jpg, https://cdn.test/c.jpg",
    )
    expect(container.querySelectorAll("img")).toHaveLength(4)
  })

  it("adds the photos that uploaded when one of them fails", async () => {
    post.mockImplementation((_url: string, form: FormData) => {
      const file = form.get("image") as File
      return file.name === "bad.jpg"
        ? Promise.reject(new Error("boom"))
        : Promise.resolve({ data: { url: `https://cdn.test/${file.name}` } })
    })
    const onValue = vi.fn()
    const { container } = render(<Harness initial="" onValue={onValue} />)
    const input = container.querySelector('input[type="file"]') as HTMLInputElement

    fireEvent.change(input, { target: { files: [makeFile("a.jpg"), makeFile("bad.jpg"), makeFile("c.jpg")] } })

    await waitFor(() => expect(onValue).toHaveBeenCalled())
    expect(onValue).toHaveBeenLastCalledWith("https://cdn.test/a.jpg, https://cdn.test/c.jpg")
  })
})
