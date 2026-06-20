import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/server";
import AuthShell from "@/components/auth/AuthShell";
import SignUpForm from "@/components/auth/SignUpForm";

export const dynamic = "force-dynamic";

export default async function SignUpPage() {
  const user = await getCurrentUser();
  if (user) redirect(`/users/${user.id}`);
  return (
    <AuthShell title="Create an account" subtitle="Join to follow shrines and festivals.">
      <SignUpForm />
    </AuthShell>
  );
}
