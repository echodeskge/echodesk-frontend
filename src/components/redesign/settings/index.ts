/**
 * Settings kit of the redesign (ST-00): the design Settings screen's page
 * types (FORM, AGENTS, STATS, LIST, CONNECTIONS) built on the shared
 * redesign primitives. No translations inside: every text is a prop.
 * Spec: ~/Echodesk/.wt/st-shots/SPEC.md §2.
 */
export { SettingsPageHeader } from "./settings-page-header"
export { SettingsPage, SettingsFormPage, SettingsSection, FieldRow, DangerZone, SETTINGS_WIDTH } from "./page"
export type { SettingsPageProps, SettingsWidth } from "./page"
export {
  SettingsToggle,
  SecretInput,
  ChoiceControl,
  ActionButton,
  SwatchPicker,
  SettingsNote,
  settingsInputClass,
  settingsFieldWidth,
} from "./controls"
export type { SwatchOption, NoteTone } from "./controls"
export { StickySaveBar, SaveBarSlotProvider, useSaveBarSlot } from "./sticky-save-bar"
export type { StickySaveBarProps, StickySaveBarLabels } from "./sticky-save-bar"
export { SettingsListPage, ListActionButton, TextCell, AvatarCell, BadgeCell, ToggleCell } from "./list-page"
export type { SettingsListPageProps, SettingsListAction } from "./list-page"
export { StatsPanel, BarCell, deltaOf } from "./stats-panel"
export type { StatsPanelAction } from "./stats-panel"
export {
  ConnectionsLayout,
  ChannelList,
  ChannelDetailCard,
  ChannelActionButton,
  ChannelAlert,
  AccountRow,
  AccountRowAction,
  FactsGrid,
  PermissionList,
  ChannelNote,
} from "./channels"
export type { ChannelListItem, ChannelAction } from "./channels"
