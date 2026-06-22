import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/server";
import AuthShell from "@/components/auth/AuthShell";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";

export const dynamic = "force-dynamic";

export default async function ForgotPasswordPage() {
  const user = await getCurrentUser();
  if (user) redirect(`/users/${user.id}`);
  return (
    <AuthShell title="Reset Password" subtitle="Request a password reset link">
      <ForgotPasswordForm />
    </AuthShell>
  );
}
