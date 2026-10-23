import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"

vi.mock("next-intl", () => ({ useLocale: () => "ka" }))
vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: (props: { src: string; alt: string }) => <img src={props.src} alt={props.alt} />,
}))

import { OrderItemsCard } from "@/app/(tenant)/ecommerce/orders/[id]/_components/order-items-card"

const t = (key: string) => key

function order(item: Record<string, unknown>) {
  return {
    items: [
      {
        id: 1,
        product: 5,
        product_name: { en: "Satin Durag", ka: "სატინის დურაგი" },
        product_image: "https://cdn.example.com/product.jpg",
        quantity: 1,
        price: "10.00",
        subtotal: "10.00",
        ...item,
      },
    ],
  } as never
}

describe("OrderItemsCard", () => {
  it("shows the variant name, attributes and SKU instead of the variant id", () => {
    render(
      <OrderItemsCard
        t={t}
        order={order({
          variant: 3,
          variant_details: {
            id: 3,
            sku: "SATIN_BROWN",
            name: { en: "Brown", ka: "ყავისფერი" },
            image: "https://cdn.example.com/brown.jpg",
            attributes: [{ key: "colour", name: { en: "Colour", ka: "ფერი" }, value: { en: "Brown", ka: "ყავისფერი" } }],
          },
        })}
      />,
    )
    expect(screen.getByText("სატინის დურაგი")).toBeInTheDocument()
    expect(screen.getByText("ყავისფერი · ფერი: ყავისფერი")).toBeInTheDocument()
    expect(screen.getByText("SATIN_BROWN")).toBeInTheDocument()
    expect(screen.queryByText(/Variant ID/)).not.toBeInTheDocument()
    expect(screen.getByRole("img")).toHaveAttribute("src", "https://cdn.example.com/brown.jpg")
  })

  it("falls back gracefully when the API has no variant details yet", () => {
    render(<OrderItemsCard t={t} order={order({ variant: 3 })} />)
    expect(screen.getByText("#3")).toBeInTheDocument()
  })

  it("shows nothing extra for items without a variant", () => {
    render(<OrderItemsCard t={t} order={order({ variant: null })} />)
    expect(screen.queryByText(/#/)).not.toBeInTheDocument()
  })
})
