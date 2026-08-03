"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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


export default function ResendVerificationForm() {
  const t = useTranslations("Auth");
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get("email") || "";

  const [email, setEmail] = useState(initialEmail);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Sync state if initialEmail updates
  useEffect(() => {
    if (initialEmail) {
      setEmail(initialEmail);
    }
  }, [initialEmail]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const { error } = await authClient.sendVerificationEmail({
        email,
        callbackURL: "/shrines",
      });
      if (error) {
        setError(error.message ?? t("errVerification"));
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
          message={t("verifyResent", { email })}
        />

        <p className="text-xs text-moss-light/80 leading-relaxed pt-2">
          {t("verifyResentNote")}
        </p>

        <Link
          href="/sign-in"
          className="inline-block w-full rounded-xl bg-torii px-5 py-3 text-xs font-bold uppercase tracking-widest text-washi transition-all hover:bg-torii-dark shadow-sm"
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
          {pending ? t("sendingLinkShort") : t("resendVerification")}
        </motion.button>

        <motion.p
          variants={itemVariants}
          className="text-center text-xs tracking-widest uppercase text-moss-light"
        >
          {t("readyToSignIn")}{" "}
          <Link href="/sign-in" className="font-bold text-torii hover:underline">
            {t("signIn")}
          </Link>
        </motion.p>
      </motion.form>
    </motion.div>
  );
}
