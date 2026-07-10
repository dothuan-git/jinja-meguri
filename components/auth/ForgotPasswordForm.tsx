"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, type Variants } from "motion/react";
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


export default function ForgotPasswordForm() {
  const t = useTranslations("Auth");
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const { error } = await authClient.forgetPassword.emailOtp({ email });
      if (error) {
        setError(error.message ?? t("errForgot"));
        return;
      }
      setDone(true);
    } catch {
      setError(t("errGeneric"));
    } finally {
      setPending(false);
    }
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
          message={t("resetSent", { email })}
        />

        <p className="text-xs text-moss-light/80 leading-relaxed pt-2">
          {t("resetSentNote")}
        </p>

        <Link
          href="/sign-in"
          className="inline-block w-full rounded-xl bg-torii px-5 py-3 text-xs font-bold uppercase tracking-widest text-washi transition-all hover:bg-torii-dark shadow-sm animate-pulse"
        >
          {t("returnToSignIn")}
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
          <label htmlFor="email" className={LABEL}>
            {t("emailAddress")}
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={INPUT}
            placeholder={t("emailPh")}
          />
        </motion.div>

        <motion.button
          type="submit"
          disabled={pending}
          variants={itemVariants}
          whileTap={{ scale: 0.98 }}
          className="w-full cursor-pointer rounded-xl bg-torii px-4 py-3 text-xs font-bold uppercase tracking-widest text-washi transition-all hover:bg-torii-dark disabled:opacity-50 shadow-sm"
        >
          {pending ? t("sendingLink") : t("sendResetLink")}
        </motion.button>

        <motion.p
          variants={itemVariants}
          className="text-center text-xs tracking-widest uppercase text-moss-light"
        >
          {t("rememberPassword")}{" "}
          <Link href="/sign-in" className="font-bold text-torii hover:underline">
            {t("signIn")}
          </Link>
        </motion.p>
      </motion.form>
    </motion.div>
  );
}
