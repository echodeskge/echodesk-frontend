// Shared types for the application

import { icons } from "lucide-react"

export interface FileType {
  id?: string;
  name: string;
  size: number;
  type?: string;
  url: string;
}

export type LocaleType = "en" | "ka"; // Add more locales as needed

export type DynamicIconNameType = keyof typeof icons
