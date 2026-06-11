"use client";

import Image from "next/image";
import { LoginForm } from "@/components/login-form";
import { useLanguage } from "@/lib/i18n/language-context";
import { cn } from "@/lib/utils";

export function LoginCard({ error }: { error?: string }) {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="w-full max-w-sm space-y-6 rounded-xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-end gap-1">
        <button
          type="button"
          onClick={() => setLanguage("en")}
          className={cn(
            "rounded-md px-2 py-1 text-xs font-medium transition-colors",
            language === "en"
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          EN
        </button>
        <button
          type="button"
          onClick={() => setLanguage("es")}
          className={cn(
            "rounded-md px-2 py-1 text-xs font-medium transition-colors",
            language === "es"
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          ES
        </button>
      </div>
      <div className="flex flex-col items-center gap-3 text-center">
        <Image
          src="/logo.png"
          alt="Marine Group Boat Works"
          width={118}
          height={75}
          className="h-12 w-auto object-contain"
          priority
        />
        <div>
          <h1 className="text-lg font-semibold leading-none text-foreground">
            Marine Group Boat Works
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{t("login.subtitle")}</p>
        </div>
      </div>
      {error === "unauthorized" && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {t("login.unauthorized")}
        </p>
      )}
      <LoginForm />
    </div>
  );
}
