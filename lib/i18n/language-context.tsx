"use client";

import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useState,
  useSyncExternalStore,
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

function subscribeToStoredLanguage(callback: () => void): () => void {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getStoredLanguage(): Language {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "en" || stored === "es" ? stored : "en";
}

function getServerLanguage(): Language {
  return "en";
}

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
  const storedLanguage = useSyncExternalStore(
    subscribeToStoredLanguage,
    getStoredLanguage,
    getServerLanguage
  );
  const [override, setOverride] = useState<Language | null>(null);

  const language = override ?? initialLanguage ?? storedLanguage;

  const setLanguage = useCallback(
    (next: Language) => {
      setOverride(next);
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
