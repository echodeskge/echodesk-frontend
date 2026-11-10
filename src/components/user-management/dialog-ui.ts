/**
 * Settings dialog styling (SPEC §2 "Dialogs"): shadcn Dialog behaviour stays,
 * the content gets the design sizes — 13px labels, 34px inputs and selects,
 * 13px section titles. Used by the user form and the group form.
 */
export const settingsDialogFormClass = [
  "[&_[data-slot=label]]:text-[13px]",
  "[&_[data-slot=input]]:h-[34px] [&_[data-slot=input]]:text-[13px]",
  "[&_[data-slot=select-trigger]]:h-[34px] [&_[data-slot=select-trigger]]:text-[13px]",
  "[&_[data-slot=textarea]]:text-[13px]",
].join(" ")

/** Title of a block inside a settings dialog form (design section title: 13px semibold). */
export const settingsDialogSectionTitle = "text-[13px] font-semibold"
