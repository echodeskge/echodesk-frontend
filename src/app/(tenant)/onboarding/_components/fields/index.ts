/**
 * Field components shared by the onboarding step packages. Each takes
 * `value` / `onChange` and an optional `error` (first message of the field's
 * 400 error) and renders in the redesign look. No translations except the
 * fixed labels of HoursGrid / UsersPicker / EditableTable (`onboarding.fields.*`).
 */
export { FieldShell, inputClass } from "./field-shell"
export { TextField } from "./TextField"
export { I18nTextField, EMPTY_I18N } from "./I18nTextField"
export type { I18nText } from "./I18nTextField"
export { SelectField } from "./SelectField"
export type { SelectOption } from "./SelectField"
export { MultiChoiceCards } from "./MultiChoiceCards"
export type { ChoiceCard } from "./MultiChoiceCards"
export { Toggle } from "./Toggle"
export { NumberField } from "./NumberField"
export { HoursGrid, defaultHours, normalizeHours, DAY_KEYS, DEFAULT_DAY } from "./HoursGrid"
export type { HoursValue, DayHours, DayKey } from "./HoursGrid"
export { UsersPicker, usePickerUsers, pickerUserLabel } from "./UsersPicker"
export type { PickerUser } from "./UsersPicker"
export { EditableTable } from "./EditableTable"
export type { EditableColumn, EditableTableProps } from "./EditableTable"
export { TimezoneField, TIMEZONES, DEFAULT_TIMEZONE, timezoneOptions, timezoneLabel } from "./TimezoneField"
export { ChipsField } from "./ChipsField"
export { SecretField } from "./SecretField"
