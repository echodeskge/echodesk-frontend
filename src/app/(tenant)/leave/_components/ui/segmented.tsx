"use client"

import { Segmented as RdSegmented, type SegmentedOption, type SegmentedProps } from "@/components/redesign/segmented"

export type { SegmentedOption, SegmentedProps }

/** Leave segmented control: the shared redesign `Segmented` with leave's `data-slot`. */
export function Segmented<T extends string>(props: SegmentedProps<T>) {
  return <RdSegmented dataSlot="leave-segmented" {...props} />
}
