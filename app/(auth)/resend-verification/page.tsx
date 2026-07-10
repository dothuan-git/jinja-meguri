import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/auth/server";
import AuthShell from "@/components/auth/AuthShell";
import ResendVerificationForm from "@/components/auth/ResendVerificationForm";

export const dynamic = "force-dynamic";

export default async function ResendVerificationPage() {
  const user = await getCurrentUser();
  if (user) redirect(`/users/${user.id}`);
  const t = await getTranslations("Auth");
  return (
    <AuthShell title={t("verifyTitle")} subtitle={t("verifySubtitle")}>
      <ResendVerificationForm />
    </AuthShell>
  );
}
