import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/server";
import AuthShell from "@/components/auth/AuthShell";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage() {
  const user = await getCurrentUser();
  if (user) redirect(`/users/${user.id}`);
  return (
    <AuthShell title="Choose Password" subtitle="Choose a new secure password">
      <ResetPasswordForm />
    </AuthShell>
  );
}
