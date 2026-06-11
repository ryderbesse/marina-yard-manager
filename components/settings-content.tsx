"use client";

import { Briefcase, Calendar, Clock, Mail, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/lib/i18n/language-context";
import { formatDate } from "@/lib/i18n/format";
import type { WorkerWithHours } from "@/lib/types";

export function SettingsContent({ worker }: { worker: WorkerWithHours }) {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{t("settings.title")}</h1>
      </div>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>{t("settings.profileTitle")}</CardTitle>
          <CardDescription>{t("settings.profileDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-base font-medium text-foreground">{worker.name}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant="outline">{t(`roles.${worker.app_role}`)}</Badge>
              {worker.job_title && (
                <Badge variant="outline" className="text-muted-foreground">
                  <Briefcase className="mr-1 h-3 w-3" />
                  {worker.job_title}
                </Badge>
              )}
              <Badge
                variant="outline"
                className={
                  worker.is_active
                    ? "text-muted-foreground"
                    : "border-destructive/30 text-destructive"
                }
              >
                {worker.is_active ? t("settings.fields.active") : t("settings.fields.inactive")}
              </Badge>
            </div>
          </div>

          <div className="space-y-1.5 text-sm">
            <p className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-3.5 w-3.5 shrink-0" />
              {worker.email || t("common.notProvided")}
            </p>
            <p className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-3.5 w-3.5 shrink-0" />
              {worker.phone || t("common.notProvided")}
            </p>
            {worker.hire_date && (
              <p className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-3.5 w-3.5 shrink-0" />
                {t("settings.hiredOn", {
                  date: formatDate(worker.hire_date + "T12:00:00", language, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  }),
                })}
              </p>
            )}
            <p className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              {t("settings.hoursValue", { hours: worker.hours_this_week })}
            </p>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">
              {t("settings.fields.skills")}
            </Label>
            {worker.skills && worker.skills.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {worker.skills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t("common.none")}</p>
            )}
          </div>

          {worker.notes && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                {t("settings.fields.notes")}
              </Label>
              <p className="rounded-md bg-muted px-3 py-2 text-sm">{worker.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>{t("settings.languageTitle")}</CardTitle>
          <CardDescription>{t("settings.languageDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={language === "en" ? "default" : "outline"}
              onClick={() => setLanguage("en")}
            >
              {t("language.english")}
            </Button>
            <Button
              type="button"
              variant={language === "es" ? "default" : "outline"}
              onClick={() => setLanguage("es")}
            >
              {t("language.spanish")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
