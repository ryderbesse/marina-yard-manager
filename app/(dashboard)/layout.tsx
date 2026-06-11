import { redirect } from "next/navigation";
import { Nav } from "@/components/nav";
import { AuthProvider } from "@/lib/auth-context";
import { getCurrentWorker } from "@/lib/auth";
import { LanguageProvider } from "@/lib/i18n/language-context";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const worker = await getCurrentWorker();

  if (!worker) {
    redirect("/login");
  }

  return (
    <AuthProvider worker={worker}>
      <LanguageProvider initialLanguage={worker.preferred_language} persistToAccount>
        <div className="flex h-full">
          <aside className="w-56 shrink-0">
            <Nav />
          </aside>
          <main className="flex-1 overflow-y-auto bg-background">
            {children}
          </main>
        </div>
      </LanguageProvider>
    </AuthProvider>
  );
}
