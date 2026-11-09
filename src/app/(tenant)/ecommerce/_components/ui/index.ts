/**
 * E-commerce redesign primitives (EC-00). Pages import from here:
 *   import { EcommerceHeaderBridge, EcPage, EcTable, ... } from "@/app/(tenant)/ecommerce/_components/ui"
 * Generic pieces come from the shared redesign kit (`@/components/redesign`);
 * the ones below add e-commerce texts, test ids, tones and formatting.
 * Spec: ~/Echodesk/.wt/ec-shots/SPEC.md.
 */
export { EcommerceHeaderBridge } from "./header-bridge"
export type { EcHeaderAction, EcommerceHeaderBridgeProps } from "./header-bridge"
export { EcShell, EcPage, EcPageHeader, EcBanner } from "./page"
export type { EcPageProps, EcPageWidth } from "./page"
export { EcTable } from "./data-table"
export type { EcColumn, EcTableProps } from "./data-table"
export { EcEmptyState, EcErrorState, EcLoading, useEcErrorLabels } from "./states"
export {
  TonePill,
  OrderStatusPill,
  PaymentStatusPill,
  ProductStatusPill,
  ReviewStatusPill,
  PromoStatePill,
  ActivePill,
  humanize,
} from "./pills"
export {
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  PRODUCT_STATUSES,
  orderStatusTone,
  paymentStatusTone,
  productStatusTone,
  reviewTone,
  activeTone,
  promoCodeState,
  promoStateTone,
} from "./tones"
export type { PromoCodeState, Tone } from "./tones"
export {
  CURRENCY_SIGN,
  parseMoney,
  formatMoney,
  formatPercent,
  formatCount,
  formatEcDate,
  formatEcDateTime,
  localizedText,
  isoToDateTimeLocal,
} from "./format"
export type { MoneyOptions } from "./format"
export { MoneyCell } from "./money"
export { ProductThumb } from "./product-thumb"
export { IdText } from "./id-text"
export { EcPagination, PAGE_SIZES, pageRange } from "./pagination"
export { selectionColumn, BulkBar, toggleId, toggleAll } from "./selection"
export { FormSheet, FormSection, FormGrid, FormField, FormSwitchRow, ecField } from "./form-sheet"
export { DetailLayout, InfoCard, InfoRows, SummaryRows } from "./detail"

// Shared redesign kit, re-exported so pages need one import.
export {
  Toolbar,
  ToolbarSearch,
  ToolbarSpacer,
  Segmented,
  StatStrip,
  StatTile,
  StatGrid,
  SectionCard,
  FieldRow,
  Avatar,
  PersonCell,
  rdButton,
  isFromInteractive,
} from "@/components/redesign"
export type { SegmentedOption, StatItem } from "@/components/redesign"
