import { describe, it, expect, vi, beforeEach } from "vitest"

const create = vi.fn()
vi.mock("@/api/generated/api", () => ({
  ecommerceAdminVariantsList: vi.fn(),
  ecommerceAdminVariantsCreate: (...args: unknown[]) => create(...args),
  ecommerceAdminVariantsPartialUpdate: vi.fn(),
  ecommerceAdminVariantsDestroy: vi.fn(),
}))

import { createStagedVariants, type StagedVariant } from "@/components/products/VariantManager"

const variant = (sku: string, extra: Partial<StagedVariant> = {}): StagedVariant => ({
  sku,
  name: { ka: sku, en: sku },
  quantity: 2,
  attributes: [{ attribute_id: 4, value_json: "blonde" }] as never,
  ...extra,
})

describe("createStagedVariants", () => {
  beforeEach(() => {
    create.mockReset()
  })

  it("creates each staged variant for the new product, in order", async () => {
    create.mockResolvedValue({})
    const result = await createStagedVariants(42, [variant("OMBRE-50"), variant("OMBRE-60")])
    expect(result.failed).toEqual([])
    expect(create).toHaveBeenCalledTimes(2)
    expect(create.mock.calls[0][0]).toMatchObject({ sku: "OMBRE-50", product: 42, sort_order: 0 })
    expect(create.mock.calls[1][0]).toMatchObject({
      sku: "OMBRE-60",
      product: 42,
      sort_order: 1,
      attributes: [{ attribute_id: 4, value_json: "blonde" }],
    })
  })

  it("keeps going past a refused variant and reports it", async () => {
    const error = { response: { data: { sku: ["exists"] } } }
    create.mockResolvedValueOnce({}).mockRejectedValueOnce(error).mockResolvedValueOnce({})
    const result = await createStagedVariants(7, [variant("A"), variant("DUP"), variant("C")])
    expect(create).toHaveBeenCalledTimes(3)
    expect(result.failed).toHaveLength(1)
    expect(result.failed[0].variant.sku).toBe("DUP")
    expect(result.failed[0].error).toBe(error)
  })
})
