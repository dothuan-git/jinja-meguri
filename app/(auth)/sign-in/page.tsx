import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/server";
import AuthShell from "@/components/auth/AuthShell";
import SignInForm from "@/components/auth/SignInForm";

export const dynamic = "force-dynamic";

export default async function SignInPage() {
  const user = await getCurrentUser();
  if (user) redirect(`/users/${user.id}`);
  return (
    <AuthShell title="Welcome back" subtitle="Sign in to continue.">
      <SignInForm />
    </AuthShell>
  );
}
