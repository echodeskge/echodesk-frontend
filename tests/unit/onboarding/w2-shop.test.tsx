/** ONB-W2 online shop step: draft from prefill/context, payload per SCHEMAS.md, conditional blocks, nested errors. */
import React, { useState } from "react"
import { describe, expect, it, vi } from "vitest"
import { fireEvent, screen, within } from "@testing-library/react"

vi.mock("@/api/axios", () => ({ default: { get: vi.fn(), post: vi.fn() } }))
vi.mock("@/components/MiniMapPicker", () => ({
  MiniMapPicker: ({ latitude, longitude, onChange }: { latitude: number | null; longitude: number | null; onChange: (lat: number, lng: number) => void }) => (
    <button type="button" data-testid="map" onClick={() => onChange(41.7, 44.8)}>
      {latitude ?? "-"},{longitude ?? "-"}
    </button>
  ),
}))

import { ShopStep, initShopAnswers, prepareShopAnswers, type ShopAnswers } from "@/app/(tenant)/onboarding/_steps/ecommerce_crm"
import { hasStepComponent } from "@/app/(tenant)/onboarding/_steps"
import type { FieldErrors } from "@/app/(tenant)/onboarding/_lib/onboarding-api"
import { renderOnb, step } from "./helpers"

const CONTEXT = {
  deployment: { status: "pending", url: "" },
  languages: ["ka", "en"],
  existing: { products: 0, shipping_methods: 0 },
  industry: "salon",
  presets: { salon: [{ ka: "თმის მოვლა", en: "Hair care" }, "Nails"], shop: [{ ka: "ფეხსაცმელი", en: "Shoes" }] },
}

function Harness({ initial, errors = null, onChange = () => {}, context = CONTEXT }: { initial: ShopAnswers; errors?: FieldErrors | null; onChange?: (a: ShopAnswers) => void; context?: Record<string, unknown> }) {
  const [answers, set] = useState(initial)
  const setAnswers = (next: ShopAnswers | ((p: ShopAnswers) => ShopAnswers)) =>
    set((prev) => {
      const v = typeof next === "function" ? next(prev) : next
      onChange(v)
      return v
    })
  return <ShopStep step={step("ecommerce_crm", 40)} answers={answers} setAnswers={setAnswers} errors={errors} context={context} prefill={{}} />
}

describe("shop answers", () => {
  it("is registered", () => expect(hasStepComponent("ecommerce_crm")).toBe(true))

  it("init takes the prefill and fills every section", () => {
    const a = initShopAnswers({
      answers: {},
      prefill: {
        store: { name: "Amanati shop", email: "shop@amanati.ge" },
        categories: [{ ka: "ფეხსაცმელი", en: "Shoes" }, "Bags"],
        payment: { card: true, provider: "tbc", tbc_client_id: "id" },
        delivery: { methods: [{ name: { ka: "თბილისი", en: "Tbilisi" }, price: "5", free_shipping_threshold: 100, estimated_days: 2 }] },
        look: { template: "voltage", preset: "ember", color_mode: "dark" },
      },
      context: CONTEXT,
    })
    expect(a.store).toEqual({ name: "Amanati shop", email: "shop@amanati.ge", phone: "" })
    expect(a.categories).toEqual([{ ka: "ფეხსაცმელი", en: "Shoes" }, { ka: "Bags", en: "Bags" }])
    expect(a.payment.cash_on_delivery).toBe(true)
    expect(a.payment.provider).toBe("tbc")
    expect(a.delivery.methods).toEqual([{ name_ka: "თბილისი", name_en: "Tbilisi", price: "5.00", free_shipping_threshold: "100.00", estimated_days: 2 }])
    expect(a.delivery.quickshipper.enabled).toBe(false)
    expect(a.tax).toEqual({ rate: "18.00", inclusive: true, label: "VAT" })
    expect(a.look).toEqual({ template: "voltage", preset: "ember", color_mode: "dark", primary_color: "" })
    expect(a.deploy_now).toBe(false)
  })

  it("prepare emits the SCHEMAS.md payload: provider credentials only for the chosen provider, I18n names, quickshipper null when off", () => {
    const a = initShopAnswers({ answers: {}, prefill: {}, context: CONTEXT })
    const out = prepareShopAnswers({
      ...a,
      store: { name: " Shop ", email: "s@x.ge", phone: "" },
      categories: [{ ka: " ფეხსაცმელი ", en: "Shoes" }, { ka: "", en: "" }],
      payment: { ...a.payment, card: true, provider: "bog", bog_client_id: " id ", bog_client_secret: "sec", tbc_client_id: "ignored" },
      delivery: {
        allow_pickup: true,
        pickup_address: " Rustaveli 1 ",
        methods: [
          { name_ka: "თბილისი", name_en: "Tbilisi", price: "5", free_shipping_threshold: "", estimated_days: null },
          { name_ka: "", name_en: "", price: "", free_shipping_threshold: "", estimated_days: null },
        ],
        quickshipper: { ...a.delivery.quickshipper, enabled: false, api_key: "k" },
      },
      look: { template: "classic", preset: "refurb", color_mode: "light", primary_color: "#ABCDEF" },
      analytics: { google_analytics_id: "", google_ads_conversion_id: "", google_ads_purchase_label: "", clarity_project_id: "" },
      deploy_now: true,
    })
    expect(out).toEqual({
      store: { name: "Shop", email: "s@x.ge", phone: "" },
      categories: [{ ka: "ფეხსაცმელი", en: "Shoes" }],
      payment: { cash_on_delivery: true, card: true, provider: "bog", bog_client_id: "id", bog_client_secret: "sec" },
      delivery: {
        allow_pickup: true,
        pickup_address: "Rustaveli 1",
        methods: [{ name: { ka: "თბილისი", en: "Tbilisi" }, price: "5.00", free_shipping_threshold: null, estimated_days: 1 }],
        quickshipper: null,
      },
      tax: { rate: "18.00", inclusive: true, label: "VAT" },
      look: { template: "classic", preset: "refurb", color_mode: "light", primary_color: "#abcdef" },
      deploy_now: true,
    })

    const qs = prepareShopAnswers({
      ...a,
      payment: { ...a.payment, card: false, provider: "tbc" },
      delivery: { ...a.delivery, quickshipper: { enabled: true, api_key: " key ", use_production: true, pickup: { ...a.delivery.quickshipper.pickup, contact_name: "Ana", latitude: 41.7, longitude: 44.8 } } },
      look: { ...a.look, primary_color: "red" },
    })
    expect(qs.payment).toEqual({ cash_on_delivery: true, card: false, provider: null })
    expect(qs.delivery.quickshipper).toEqual({
      enabled: true,
      api_key: "key",
      use_production: true,
      pickup: { contact_name: "Ana", phone: "", address: "", city: "Tbilisi", latitude: 41.7, longitude: 44.8, extra_instructions: "" },
    })
    expect(qs.look.primary_color).toBeNull()
    expect(qs.store).toBeUndefined()
    expect(qs.categories).toBeUndefined()
  })
})

describe("ShopStep form", () => {
  it("categories from presets, card → provider block, quickshipper → map, deploy toggle with deployment status", () => {
    const onChange = vi.fn()
    renderOnb(<Harness initial={initShopAnswers({ answers: {}, prefill: { store: { name: "Amanati shop" } }, context: CONTEXT })} onChange={onChange} />)
    const last = () => onChange.mock.calls[onChange.mock.calls.length - 1][0] as ShopAnswers

    expect(screen.getByTestId("onb-shop-store-name-input")).toHaveValue("Amanati shop")

    fireEvent.click(screen.getByTestId("onb-shop-category-suggest-Hair care"))
    fireEvent.change(screen.getByTestId("onb-shop-category-new-en"), { target: { value: "Makeup" } })
    fireEvent.click(screen.getByTestId("onb-shop-category-add"))
    expect(last().categories).toEqual([{ ka: "თმის მოვლა", en: "Hair care" }, { ka: "Makeup", en: "Makeup" }])
    expect(screen.queryByTestId("onb-shop-category-suggest-Hair care")).not.toBeInTheDocument()

    expect(screen.queryByTestId("onb-shop-provider-block")).not.toBeInTheDocument()
    fireEvent.click(screen.getByTestId("onb-shop-card-switch"))
    expect(last().payment.card).toBe(true)
    expect(last().payment.provider).toBe("bog")
    expect(screen.getByTestId("onb-shop-bog-client-id-input")).toBeInTheDocument()
    fireEvent.click(within(screen.getByTestId("onb-shop-provider")).getByRole("radio", { name: "TBC" }))
    expect(last().payment.provider).toBe("tbc")
    expect(screen.getByTestId("onb-shop-tbc-api-key-input")).toHaveAttribute("type", "password")

    fireEvent.click(screen.getByTestId("onb-shop-pickup-switch"))
    fireEvent.change(screen.getByTestId("onb-shop-pickup-address-input"), { target: { value: "Rustaveli 1" } })
    expect(last().delivery.pickup_address).toBe("Rustaveli 1")

    fireEvent.click(screen.getByTestId("onb-shop-methods-add"))
    fireEvent.change(screen.getByTestId("onb-shop-methods-row-0-name_en"), { target: { value: "Courier" } })
    fireEvent.change(screen.getByTestId("onb-shop-methods-row-0-price"), { target: { value: "7" } })
    expect(prepareShopAnswers(last()).delivery.methods).toEqual([{ name: { ka: "", en: "Courier" }, price: "7.00", free_shipping_threshold: null, estimated_days: 1 }])

    expect(screen.queryByTestId("map")).not.toBeInTheDocument()
    fireEvent.click(screen.getByTestId("onb-shop-quickshipper-switch"))
    fireEvent.click(screen.getByTestId("map"))
    expect(last().delivery.quickshipper.pickup.latitude).toBe(41.7)

    fireEvent.click(screen.getByTestId("onb-shop-template-voltage"))
    fireEvent.click(screen.getByTestId("onb-shop-preset-forest"))
    fireEvent.click(within(screen.getByTestId("onb-shop-mode")).getByRole("radio", { name: "Dark" }))
    expect(last().look).toEqual({ template: "voltage", preset: "forest", color_mode: "dark", primary_color: "" })

    expect(screen.queryByTestId("onb-shop-ga-input")).not.toBeInTheDocument()
    fireEvent.click(screen.getByTestId("onb-shop-analytics-toggle"))
    fireEvent.change(screen.getByTestId("onb-shop-ga-input"), { target: { value: "G-1" } })
    expect(last().analytics.google_analytics_id).toBe("G-1")

    expect(screen.getByTestId("onb-shop-deployment")).toHaveTextContent("Not published")
    fireEvent.click(screen.getByTestId("onb-shop-deploy-switch"))
    expect(last().deploy_now).toBe(true)
  })

  it("shows the live storefront URL and disables the deploy toggle once deployed", () => {
    renderOnb(<Harness initial={initShopAnswers({ answers: {}, prefill: {}, context: CONTEXT })} context={{ ...CONTEXT, deployment: { status: "deployed", url: "https://shop.amanati.ge" } }} />)
    expect(screen.getByTestId("onb-shop-deployment")).toHaveTextContent("Published")
    expect(screen.getByRole("link", { name: /shop\.amanati\.ge/ })).toHaveAttribute("href", "https://shop.amanati.ge")
    expect(screen.getByTestId("onb-shop-deploy-switch")).toBeDisabled()
  })

  it("renders nested errors next to the fields and rows", () => {
    const initial = initShopAnswers({ answers: {}, prefill: { payment: { card: true, provider: "bog" }, delivery: { methods: [{ name: "X", price: "x" }] } }, context: CONTEXT })
    renderOnb(
      <Harness
        initial={initial}
        errors={{
          store: { email: ["Enter a valid e-mail"] },
          payment: { bog_client_secret: ["Required"] },
          delivery: { methods: [{ price: ["Not a number"] }], pickup_address: ["Required"] },
          "look.primary_color": ["Hex only"],
          categories: ["Add at least one"],
        }}
      />
    )
    expect(screen.getByTestId("onb-shop-store-email-error")).toHaveTextContent("Enter a valid e-mail")
    expect(screen.getByTestId("onb-shop-bog-client-secret")).toHaveTextContent("Required")
    expect(screen.getByTestId("onb-shop-methods-row-0")).toHaveTextContent("Not a number")
    expect(screen.getByTestId("onb-shop-categories")).toHaveTextContent("Add at least one")
    expect(screen.getByText("Hex only")).toBeInTheDocument()
    // pickup_address is hidden while pickup is off, so its error is not shown but nothing breaks.
    expect(screen.queryByTestId("onb-shop-pickup-address-input")).not.toBeInTheDocument()
  })
})
