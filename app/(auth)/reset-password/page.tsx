import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/auth/server";
import AuthShell from "@/components/auth/AuthShell";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage() {
  const user = await getCurrentUser();
  if (user) redirect(`/users/${user.id}`);
  const t = await getTranslations("Auth");
  return (
    <AuthShell title={t("resetTitle")} subtitle={t("resetSubtitle")}>
      <ResetPasswordForm />
    </AuthShell>
  );
}
