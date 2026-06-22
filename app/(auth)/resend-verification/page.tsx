import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/server";
import AuthShell from "@/components/auth/AuthShell";
import ResendVerificationForm from "@/components/auth/ResendVerificationForm";

export const dynamic = "force-dynamic";

export default async function ResendVerificationPage() {
  const user = await getCurrentUser();
  if (user) redirect(`/users/${user.id}`);
  return (
    <AuthShell title="Verify Email" subtitle="Send another verification link to your email">
      <ResendVerificationForm />
    </AuthShell>
  );
}
