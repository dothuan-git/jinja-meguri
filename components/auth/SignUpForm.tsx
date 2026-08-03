"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, type Variants } from "motion/react";
import { Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { authClient } from "@/lib/auth/client";
import SocialAuthButtons from "./SocialAuthButtons";
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


export default function SignUpForm() {
  const t = useTranslations("Auth");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const { error } = await authClient.signUp.email({
        email,
        password,
        name,
        callbackURL: "/shrines", // where the email-verification link lands after confirming
      });
      if (error) {
        setError(error.message ?? t("errSignUp"));
        return;
      }
      // Email verification is required: don't sign in / redirect — confirm and
      // send the user to verify their inbox before they can sign in.
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
          message={t("verificationSent", { email })}
        />

        <div className="pt-2 text-xs tracking-wide text-moss-light/80 leading-relaxed">
          {t.rich("didntReceive", {
            link: (chunks) => (
              <Link
                href={`/resend-verification?email=${encodeURIComponent(email)}`}
                className="font-bold text-torii hover:underline"
              >
                {chunks}
              </Link>
            ),
          })}
        </div>

        <Link
          href="/sign-in"
          className="inline-block w-full rounded-xl bg-torii px-5 py-3 text-xs font-bold uppercase tracking-widest text-washi transition-all hover:bg-torii-dark shadow-sm"
        >
          {t("goToSignIn")}
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
      <motion.div variants={itemVariants}>
        <SocialAuthButtons />
      </motion.div>

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
          <label htmlFor="name" className={LABEL}>{t("name")}</label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={INPUT}
            placeholder={t("namePh")}
          />
        </motion.div>

        <motion.div variants={itemVariants} className="space-y-1.5">
          <label htmlFor="email" className={LABEL}>{t("email")}</label>
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

        <motion.div variants={itemVariants} className="space-y-1.5">
          <label htmlFor="password" className={LABEL}>{t("password")}</label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
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

        <motion.button
          type="submit"
          disabled={pending}
          variants={itemVariants}
          whileTap={{ scale: 0.98 }}
          className="w-full cursor-pointer rounded-xl bg-torii px-4 py-3 text-xs font-bold uppercase tracking-widest text-washi transition-all hover:bg-torii-dark disabled:opacity-50 shadow-sm"
        >
          {pending ? t("creatingAccount") : t("signUp")}
        </motion.button>

        <motion.p
          variants={itemVariants}
          className="text-center text-xs tracking-widest uppercase text-moss-light"
        >
          {t("alreadyHaveAccount")}{" "}
          <Link href="/sign-in" className="font-bold text-torii hover:underline">
            {t("signIn")}
          </Link>
        </motion.p>
      </motion.form>
    </motion.div>
  );
}

