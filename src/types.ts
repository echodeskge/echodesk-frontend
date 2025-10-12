// Shared types for the application

export interface FileType {
  id?: string;
  name: string;
  size: number;
  type?: string;
  url: string;
}

export type LocaleType = "en" | "ka"; // Add more locales as needed
