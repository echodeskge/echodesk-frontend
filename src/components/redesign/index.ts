/**
 * Shared primitives of the EchoDesk redesign (promoted from the leave redesign
 * LV-00 by EC-00). They carry no translations: every visible text is a prop,
 * so any section can use them inside its own intl provider. Sections wrap the
 * few that need texts (`ErrorBlock`, `LoadingBlock`, `DataTable`'s error body):
 * leave in `leave/_components/ui`, e-commerce in `ecommerce/_components/ui`.
 * Spec: ~/Echodesk/.wt/leave-shots/SPEC.md §1 and ~/Echodesk/.wt/ec-shots/SPEC.md §1.
 */
export { HeaderBridge } from "./header-bridge"
export type { HeaderAction, HeaderBridgeProps } from "./header-bridge"
export { Page, PageHeader, PageShell, PageBanner } from "./page"
export type { PageProps, PageWidth } from "./page"
export { Toolbar, ToolbarSearch, ToolbarSpacer } from "./toolbar"
export { Segmented } from "./segmented"
export type { SegmentedOption, SegmentedProps } from "./segmented"
export { TonePill } from "./pill"
export { TONE_CLASS, TONE_DOT } from "./tones"
export type { Tone } from "./tones"
export { StatStrip, StatTile, StatGrid } from "./stats"
export type { StatItem } from "./stats"
export { DataTable, gridTemplate, isFromInteractive } from "./data-table"
export type { Column, DataTableProps, MobileSlot } from "./data-table"
export { EmptyBlock, ErrorBlock, LoadingBlock, isForbiddenError } from "./states"
export type { ErrorBlockLabels } from "./states"
export { SectionCard, FieldRow } from "./section-card"
export { Avatar, PersonCell } from "./person"
export { rdButton } from "./buttons"
export type { RdButtonVariant } from "./buttons"
