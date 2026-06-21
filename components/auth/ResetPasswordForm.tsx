"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion, type Variants } from "motion/react";
import { Eye, EyeOff } from "lucide-react";
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
      setError("Reset token is missing or invalid. Please check your email link.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
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
        setError(error.message ?? "Could not reset password. Your link may have expired.");
        return;
      }
      setDone(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  if (!token) {
    return (
      <div className="space-y-4 text-center">
        <OmikujiAlert
          type="error"
          message="Invalid or missing reset token. Please request a new password reset link."
        />
        <div className="pt-4">
          <Link
            href="/forgot-password"
            className="inline-block w-full rounded-xl bg-torii px-5 py-3 text-xs font-bold uppercase tracking-widest text-washi transition-all hover:bg-torii-dark shadow-sm"
          >
            Request new link
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
          message="Your password has been reset successfully. You can now sign in with your new password."
        />

        <Link
          href="/sign-in"
          className="inline-block w-full rounded-xl bg-torii px-5 py-3 text-xs font-bold uppercase tracking-widest text-washi transition-all hover:bg-torii-dark shadow-sm"
        >
          Sign in
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
            New Password
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
              placeholder="At least 8 characters"
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
            Confirm New Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={INPUT}
            placeholder="Re-enter your password"
          />
        </motion.div>

        <motion.button
          type="submit"
          disabled={pending}
          variants={itemVariants}
          whileTap={{ scale: 0.98 }}
          className="w-full cursor-pointer rounded-xl bg-torii px-4 py-3 text-xs font-bold uppercase tracking-widest text-washi transition-all hover:bg-torii-dark disabled:opacity-50 shadow-sm"
        >
          {pending ? "Resetting password…" : "Reset Password"}
        </motion.button>
      </motion.form>
    </motion.div>
  );
}
