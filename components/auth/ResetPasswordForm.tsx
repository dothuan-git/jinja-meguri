"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion, type Variants } from "motion/react";
import { Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { authClient } from "@/lib/auth/client";
import OmikujiAlert from "./OmikujiAlert";

const INPUT =
  "w-full rounded-xl border border-moss/20 bg-washi/60 px-4 py-2.5 text-sm text-stone outline-none transition-all placeholder:text-moss-light/50 focus:border-torii focus:ring-3 focus:ring-torii/10 focus:bg-washi/90";
const LABEL = "block text-[11px] font-bold uppercase tracking-widest text-moss-light/95";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 120, damping: 14 },
  },
};


export default function ResetPasswordForm() {
  const t = useTranslations("Auth");
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      setError(t("errResetMissingToken"));
      return;
    }
    if (password.length < 8) {
      setError(t("errPasswordShort"));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("errPasswordMismatch"));
      return;
    }

    setPending(true);
    setError(null);
    try {
      const { error } = await authClient.resetPassword({
        newPassword: password,
        token,
      });
      if (error) {
        setError(error.message ?? t("errResetFailed"));
        return;
      }
      setDone(true);
    } catch {
      setError(t("errGeneric"));
    } finally {
      setPending(false);
    }
  }

  if (!token) {
    return (
      <div className="space-y-4 text-center">
        <OmikujiAlert
          type="error"
          message={t("invalidToken")}
        />
        <div className="pt-4">
          <Link
            href="/forgot-password"
            className="inline-block w-full rounded-xl bg-torii px-5 py-3 text-xs font-bold uppercase tracking-widest text-washi transition-all hover:bg-torii-dark shadow-sm"
          >
            {t("requestNewLink")}
          </Link>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="space-y-6 text-center"
      >
        <OmikujiAlert
          type="success"
          message={t("resetSuccess")}
        />

        <Link
          href="/sign-in"
          className="inline-block w-full rounded-xl bg-torii px-5 py-3 text-xs font-bold uppercase tracking-widest text-washi transition-all hover:bg-torii-dark shadow-sm"
        >
          {t("signIn")}
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <motion.form
        onSubmit={onSubmit}
        variants={containerVariants}
        className="space-y-5"
      >
        {error && (
          <motion.div variants={itemVariants}>
            <OmikujiAlert type="error" message={error} />
          </motion.div>
        )}

        <motion.div variants={itemVariants} className="space-y-1.5">
          <label htmlFor="password" className={LABEL}>
            {t("newPassword")}
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${INPUT} pr-11`}
              placeholder={t("min8Ph")}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-moss-light/50 hover:text-torii transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="space-y-1.5">
          <label htmlFor="confirmPassword" className={LABEL}>
            {t("confirmNewPassword")}
          </label>
          <input
            id="confirmPassword"
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={INPUT}
            placeholder={t("reenterPh")}
          />
        </motion.div>

        <motion.button
          type="submit"
          disabled={pending}
          variants={itemVariants}
          whileTap={{ scale: 0.98 }}
          className="w-full cursor-pointer rounded-xl bg-torii px-4 py-3 text-xs font-bold uppercase tracking-widest text-washi transition-all hover:bg-torii-dark disabled:opacity-50 shadow-sm"
        >
          {pending ? t("resettingPassword") : t("resetPassword")}
        </motion.button>
      </motion.form>
    </motion.div>
  );
}
