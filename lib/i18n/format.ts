import type { Language } from "@/lib/types";

const LOCALES: Record<Language, string> = {
  en: "en-US",
  es: "es-ES",
};

export function formatDate(
  value: string | Date,
  language: Language,
  options?: Intl.DateTimeFormatOptions
): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleDateString(LOCALES[language], options);
}

export function formatTime(
  value: string | Date,
  language: Language,
  options?: Intl.DateTimeFormatOptions
): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleTimeString(LOCALES[language], options);
}

export function formatDateTime(
  value: string | Date,
  language: Language,
  options?: Intl.DateTimeFormatOptions
): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleString(LOCALES[language], options);
}
