import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/auth/server";
import AuthShell from "@/components/auth/AuthShell";
import SignUpForm from "@/components/auth/SignUpForm";

export const dynamic = "force-dynamic";

export default async function SignUpPage() {
  const user = await getCurrentUser();
  if (user) redirect(`/users/${user.id}`);
  const t = await getTranslations("Auth");
  return (
    <AuthShell title={t("signUpTitle")} subtitle={t("signUpSubtitle")}>
      <SignUpForm />
    </AuthShell>
  );
}
