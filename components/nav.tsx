"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ClipboardList, CalendarDays, Users, Settings, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { signOut } from "@/lib/auth-actions";
import { useLanguage } from "@/lib/i18n/language-context";
import { formatDate } from "@/lib/i18n/format";
import type { AppRole } from "@/lib/types";

const navItems = [
  { href: "/daily-jobs", labelKey: "nav.dailyJobs", icon: ClipboardList, roles: ["boss", "head", "worker"] as AppRole[] },
  { href: "/schedule", labelKey: "nav.schedule", icon: CalendarDays, roles: ["boss", "head"] as AppRole[] },
  { href: "/workers", labelKey: "nav.workers", icon: Users, roles: ["boss", "head"] as AppRole[] },
  { href: "/settings", labelKey: "nav.settings", icon: Settings, roles: ["boss", "head", "worker"] as AppRole[] },
];

export function Nav() {
  const pathname = usePathname();
  const worker = useAuth();
  const { language, t } = useLanguage();
  const visibleItems = navItems.filter(
    (item) => !worker || item.roles.includes(worker.app_role)
  );

  return (
    <nav className="flex h-full flex-col border-r border-border bg-card">
      <div className="flex h-16 items-center gap-3 border-b border-border px-5">
        <Image
          src="/logo.png"
          alt="Marine Group Boat Works"
          width={118}
          height={75}
          className="h-9 w-auto shrink-0 object-contain"
          priority
        />
        <div>
          <p className="text-sm font-semibold leading-none text-foreground">
            Marine Group
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">Boat Works</p>
        </div>
      </div>

      <div className="flex-1 space-y-1 p-3">
        {visibleItems.map(({ href, labelKey, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
              pathname === href || pathname.startsWith(href + "/")
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {t(labelKey)}
          </Link>
        ))}
      </div>

      <div className="border-t border-border p-3">
        {worker && (
          <div className="mb-2 flex items-center justify-between gap-2 rounded-md px-1 py-1">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium leading-none text-foreground">
                {worker.name}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t(`roles.${worker.app_role}`)}
              </p>
            </div>
            <form action={signOut}>
              <button
                type="submit"
                title={t("nav.signOut")}
                className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        )}
        <p className="px-1 text-xs text-muted-foreground">
          {formatDate(new Date(), language, {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>
    </nav>
  );
}
