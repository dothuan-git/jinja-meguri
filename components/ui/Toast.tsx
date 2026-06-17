"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";

type ToastVariant = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  notify: (message: string, variant?: ToastVariant) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}

// Errors linger longer (and may carry validation detail); success/info are brief.
const DURATION_MS: Record<ToastVariant, number> = {
  success: 4000,
  info: 4000,
  error: 8000,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback(
    (message: string, variant: ToastVariant = "info") => {
      const id = ++seq.current;
      setToasts((prev) => [...prev, { id, message, variant }]);
      setTimeout(() => dismiss(id), DURATION_MS[variant]);
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      notify,
      success: (m) => notify(m, "success"),
      error: (m) => notify(m, "error"),
      info: (m) => notify(m, "info"),
    }),
    [notify],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

const VARIANT_STYLES: Record<
  ToastVariant,
  { accent: string; icon: React.ReactNode; role: "status" | "alert" }
> = {
  success: {
    accent: "border-l-green-500",
    icon: <CheckCircle2 size={18} className="text-green-600" />,
    role: "status",
  },
  error: {
    accent: "border-l-red-500",
    icon: <AlertTriangle size={18} className="text-red-600" />,
    role: "alert",
  },
  info: {
    accent: "border-l-stone-400",
    icon: <Info size={18} className="text-stone-500" />,
    role: "status",
  },
};

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}) {
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2">
      <AnimatePresence initial={false}>
        {toasts.map((t) => {
          const style = VARIANT_STYLES[t.variant];
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, x: 24, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 24, scale: 0.96 }}
              transition={{ type: "spring", damping: 26, stiffness: 320 }}
              role={style.role}
              aria-live={t.variant === "error" ? "assertive" : "polite"}
              className={`pointer-events-auto flex items-start gap-2.5 rounded-lg border border-l-4 ${style.accent} border-gray-200 bg-white px-4 py-3 shadow-lg`}
            >
              <span className="mt-0.5 shrink-0">{style.icon}</span>
              <p className="flex-1 break-words text-sm text-gray-700">{t.message}</p>
              <button
                onClick={() => onDismiss(t.id)}
                aria-label="Dismiss notification"
                className="-mr-1 shrink-0 rounded p-0.5 text-gray-400 transition-colors hover:text-gray-700"
              >
                <X size={15} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
