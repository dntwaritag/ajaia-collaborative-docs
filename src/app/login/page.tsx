import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "@/components/LoginForm";
import { Logo } from "@/components/Logo";
import { DEMO_USERS } from "@/lib/seed";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/");
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <Logo />
        <h1 className="mt-6 text-2xl font-semibold">Sign in</h1>
        <p className="mt-1 text-sm text-slate-500">Write, import and share documents with your team.</p>
        <LoginForm demoUsers={DEMO_USERS.map((u) => ({ email: u.email, name: u.name }))} />
      </div>
    </main>
  );
}
