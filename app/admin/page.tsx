import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import LoginForm from "@/components/admin/LoginForm";

export default async function AdminLoginPage() {
  const { data } = await auth.getSession();
  if (data?.user?.email) redirect("/admin/dashboard");
  return <LoginForm />;
}
