import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import type { ProductReview } from "@/api/generated/interfaces"
import { renderEc } from "./ec00-helpers"

const api = { list: vi.fn(), approve: vi.fn(), reject: vi.fn(), destroy: vi.fn() }
vi.mock("@/api/generated", () => ({
  ecommerceAdminReviewsList: (...a: unknown[]) => api.list(...a),
  ecommerceAdminReviewsApproveCreate: (...a: unknown[]) => api.approve(...a),
  ecommerceAdminReviewsRejectCreate: (...a: unknown[]) => api.reject(...a),
  ecommerceAdminReviewsDestroy: (...a: unknown[]) => api.destroy(...a),
}))
const toast = { success: vi.fn(), error: vi.fn() }
vi.mock("sonner", () => ({ toast: { success: (...a: unknown[]) => toast.success(...a), error: (...a: unknown[]) => toast.error(...a) } }))

import ReviewsPage from "@/app/(tenant)/ecommerce/reviews/page"
import { reviewText } from "@/app/(tenant)/ecommerce/reviews/_components/review-columns"

const review = (id: number, extra: Partial<ProductReview>): ProductReview => ({
  id,
  product: 17,
  product_name: { en: "Linen shirt", ka: "სელის პერანგი" },
  product_sku: "DEMO-017",
  product_image: "",
  client: 12,
  client_name: "Lika",
  rating: 4,
  title: "Great",
  content: "Fast delivery.",
  is_verified_purchase: false,
  is_approved: true,
  created_at: "2024-11-09T12:00:00Z",
  ...extra,
})
const REVIEWS = [
  review(1, { is_approved: false, rating: 5, is_verified_purchase: true }),
  review(2, { product: 99, product_name: null, client_name: "Dachi", rating: 2, title: "", content: "Broke quickly" }),
  review(3, { client_name: "Saba" }),
]

describe("ReviewsPage", () => {
  beforeEach(() => {
    Object.values(api).forEach((f) => f.mockReset())
    api.list.mockResolvedValue({ count: 3, results: REVIEWS })
    api.approve.mockResolvedValue({})
    api.reject.mockResolvedValue({})
    api.destroy.mockResolvedValue({})
    toast.success.mockReset()
    toast.error.mockReset()
  })

  it("shows stats, rows with product, stars, review text, verified and status", async () => {
    renderEc(<ReviewsPage />)
    await waitFor(() => expect(screen.getAllByTestId("ec-table-row")).toHaveLength(3))
    expect(api.list).toHaveBeenCalledWith()
    expect(screen.getByTestId("reviews-stats")).toHaveTextContent("Total Reviews3Approved2Pending1")
    expect(await screen.findByTestId("ec-header-sub")).toHaveTextContent("3 reviews found")
    const [first, second] = screen.getAllByTestId("ec-table-row")
    expect(first).toHaveTextContent("Linen shirt")
    expect(within(first).getByRole("img", { name: "5 out of 5 stars" })).toBeInTheDocument()
    expect(first).toHaveTextContent("Great: Fast delivery.")
    expect(first).toHaveTextContent("Verified")
    expect(within(first).getByTestId("ec-review-status")).toHaveTextContent("Pending")
    expect(second).toHaveTextContent("Product #99")
    expect(second).toHaveTextContent("Broke quickly")
    expect(within(second).getByTestId("ec-review-status")).toHaveTextContent("Approved")
    expect(reviewText({ title: "", content: "x" })).toBe("x")
  })

  it("filters client-side by moderation state with counts", async () => {
    renderEc(<ReviewsPage />)
    await waitFor(() => expect(screen.getAllByTestId("ec-table-row")).toHaveLength(3))
    fireEvent.click(screen.getByRole("radio", { name: /Pending/ }))
    expect(screen.getAllByTestId("ec-table-row")).toHaveLength(1)
    expect(screen.getByTestId("ec-header-sub")).toHaveTextContent("1 review found")
    fireEvent.click(screen.getByRole("radio", { name: /Approved/ }))
    expect(screen.getAllByTestId("ec-table-row")).toHaveLength(2)
    expect(api.list).toHaveBeenCalledTimes(1)
  })

  it("approves, rejects and deletes with the same calls and toasts", async () => {
    renderEc(<ReviewsPage />)
    await waitFor(() => expect(screen.getAllByTestId("ec-table-row")).toHaveLength(3))
    const rows = screen.getAllByTestId("ec-table-row")
    fireEvent.click(within(rows[0]).getByTestId("review-approve"))
    await waitFor(() => expect(api.approve).toHaveBeenCalledWith(1))
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Review approved successfully"))
    fireEvent.click(within(screen.getAllByTestId("ec-table-row")[1]).getByTestId("review-reject"))
    await waitFor(() => expect(api.reject).toHaveBeenCalledWith(2))
    fireEvent.click(within(screen.getAllByTestId("ec-table-row")[2]).getByRole("button", { name: "Delete the review by Saba" }))
    const dialog = await screen.findByRole("alertdialog")
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }))
    await waitFor(() => expect(api.destroy).toHaveBeenCalledWith(3))
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Review deleted successfully"))
    // refetches keep the rows on screen (no skeleton flash)
    expect(screen.queryByTestId("ec-table-skeleton")).toBeNull()
  })

  it("shows the backend reason when delete is not allowed", async () => {
    api.destroy.mockRejectedValue({ response: { status: 403, data: { detail: "Only managers can do this." } } })
    renderEc(<ReviewsPage />)
    await waitFor(() => expect(screen.getAllByTestId("ec-table-row")).toHaveLength(3))
    fireEvent.click(within(screen.getAllByTestId("ec-table-row")[0]).getByTestId("review-delete"))
    fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Delete" }))
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Only managers can do this."))
  })

  it("shows the error state with retry when the list fails, and empty states", async () => {
    api.list.mockRejectedValueOnce({ response: { status: 500 } })
    renderEc(<ReviewsPage />)
    expect(await screen.findByTestId("ec-error")).toBeInTheDocument()
    expect(toast.error).toHaveBeenCalledWith("Failed to load reviews")
    api.list.mockResolvedValueOnce({ count: 0, results: [] })
    fireEvent.click(screen.getByRole("button", { name: "Try again" }))
    expect(await screen.findByTestId("ec-empty")).toHaveTextContent("No reviews found")
  })

  it("renders Georgian product names and labels", async () => {
    renderEc(<ReviewsPage />, "ka")
    await waitFor(() => expect(screen.getAllByTestId("ec-table-row")).toHaveLength(3))
    const first = screen.getAllByTestId("ec-table-row")[0]
    expect(first).toHaveTextContent("სელის პერანგი")
    expect(within(first).getByRole("img", { name: "შეფასება: 5 5-დან" })).toBeInTheDocument()
    expect(within(first).getByTestId("review-approve")).toHaveTextContent("დამტკიცება")
  })
})
