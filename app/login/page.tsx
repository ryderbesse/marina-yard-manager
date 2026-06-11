import { LoginCard } from "@/components/login-card";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex h-full items-center justify-center bg-background p-4">
      <LoginCard error={error} />
    </div>
  );
}
