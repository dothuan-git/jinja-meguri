"use server";

import { assertAdmin } from "@/lib/auth/server";
import { ShrineInputSchema } from "@/lib/admin/shrineContract";
import { DeityInputSchema } from "@/lib/admin/deityContract";
import { upsertShrine, deleteShrine, upsertDeity, updateDeity, deleteDeity } from "@/lib/db/mutations";

export async function saveShrineAction(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
): Promise<{ error?: string; success?: boolean; slug?: string }> {
  await assertAdmin();

  const raw = formData.get("json") as string | null;
  if (!raw) return { error: "No data submitted" };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { error: "Invalid JSON" };
  }

  const result = ShrineInputSchema.safeParse(parsed);
  if (!result.success) {
    const msgs = result.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ");
    return { error: msgs };
  }

  try {
    const { slug } = await upsertShrine(result.data);
    return { success: true, slug };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Database error" };
  }
}

export async function saveDeityAction(
  _prevState: { error?: string; success?: boolean } | null,
  formData: FormData,
): Promise<{ error?: string; success?: boolean; name_ja?: string }> {
  await assertAdmin();

  const raw = formData.get("json") as string | null;
  if (!raw) return { error: "No data submitted" };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { error: "Invalid JSON" };
  }

  const result = DeityInputSchema.safeParse(parsed);
  if (!result.success) {
    const msgs = result.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ");
    return { error: msgs };
  }

  const id = (formData.get("id") as string | null) || null;

  try {
    if (id) {
      await updateDeity(id, result.data);
      return { success: true, name_ja: result.data.name_ja };
    }
    const { name_ja } = await upsertDeity(result.data);
    return { success: true, name_ja };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Database error" };
  }
}

export async function deleteDeityAction(id: string): Promise<{ error?: string }> {
  await assertAdmin();
  try {
    await deleteDeity(id);
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Database error" };
  }
}

export async function deleteShrineAction(slug: string): Promise<{ error?: string }> {
  await assertAdmin();
  try {
    await deleteShrine(slug);
    return {};
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Database error" };
  }
}
