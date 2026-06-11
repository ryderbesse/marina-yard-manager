"use client";

import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { updateLanguage } from "@/lib/actions";
import type { Language } from "@/lib/types";
import { translations } from "./translations";

const STORAGE_KEY = "language";

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function lookup(dict: unknown, path: string[]): unknown {
  let current = dict;
  for (const segment of path) {
    if (typeof current !== "object" || current === null) return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

function translate(
  language: Language,
  key: string,
  params?: Record<string, string | number>
): string {
  const path = key.split(".");
  let value = lookup(translations[language], path);
  if (typeof value !== "string") {
    value = lookup(translations.en, path);
  }
  if (typeof value !== "string") {
    return key;
  }
  if (!params) return value;
  return value.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match
  );
}

export function LanguageProvider({
  children,
  initialLanguage,
  persistToAccount,
}: {
  children: React.ReactNode;
  initialLanguage?: Language;
  persistToAccount?: boolean;
}) {
  const [language, setLanguageState] = useState<Language>(initialLanguage ?? "en");

  useEffect(() => {
    if (initialLanguage) return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "es") {
      setLanguageState(stored);
    }
  }, [initialLanguage]);

  const setLanguage = useCallback(
    (next: Language) => {
      setLanguageState(next);
      window.localStorage.setItem(STORAGE_KEY, next);
      if (persistToAccount) {
        startTransition(() => {
          void updateLanguage(next);
        });
      }
    },
    [persistToAccount]
  );

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) =>
      translate(language, key, params),
    [language]
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return ctx;
}
