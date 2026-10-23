import { describe, it, expect, vi } from "vitest"
import { render, fireEvent } from "@testing-library/react"

vi.mock("@/api/generated/api", () => ({
  ecommerceAdminVariantsList: vi.fn(),
  ecommerceAdminVariantsCreate: vi.fn(),
  ecommerceAdminVariantsPartialUpdate: vi.fn(),
  ecommerceAdminVariantsDestroy: vi.fn(),
}))
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "en",
}))
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock("@/hooks/useAttributes", () => ({ useAttributes: () => ({ data: { results: [] } }) }))
vi.mock("@/hooks/useLanguages", () => ({ useLanguages: () => ({ data: { results: [] } }) }))
vi.mock("@/components/ImageGalleryPicker", () => ({ ImageGalleryPicker: () => null }))

import { StagedVariantManager } from "@/components/products/VariantManager"

describe("StagedVariantManager", () => {
  it("tells the product form while a variant is being typed, so it isn't dropped on save", () => {
    const onEditingChange = vi.fn()
    const { getByText } = render(
      <StagedVariantManager value={[]} onChange={vi.fn()} onEditingChange={onEditingChange} />,
    )
    expect(onEditingChange).toHaveBeenLastCalledWith(false)

    fireEvent.click(getByText("add"))
    expect(onEditingChange).toHaveBeenLastCalledWith(true)

    fireEvent.click(getByText("cancel"))
    expect(onEditingChange).toHaveBeenLastCalledWith(false)
  })
})
