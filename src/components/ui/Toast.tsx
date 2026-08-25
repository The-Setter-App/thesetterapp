"use client";

import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

export type ToastVariant = "success" | "error" | "info";

interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface ToastOptions {
  description?: string;
  durationMs?: number;
}

interface ToastContextValue {
  showToast: (
    variant: ToastVariant,
    title: string,
    options?: ToastOptions,
  ) => void;
  success: (title: string, options?: ToastOptions) => void;
  error: (title: string, options?: ToastOptions) => void;
  info: (title: string, options?: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION_MS = 4500;

const VARIANT_STYLES: Record<
  ToastVariant,
  { icon: typeof CheckCircle2; className: string; iconClassName: string }
> = {
  success: {
    icon: CheckCircle2,
    className: "border-[#D8D2FF] bg-white text-[#101011]",
    iconClassName: "text-[#8771FF]",
  },
  error: {
    icon: AlertCircle,
    className: "border-red-200 bg-white text-[#101011]",
    iconClassName: "text-red-500",
  },
  info: {
    icon: Info,
    className: "border-[#F0F2F6] bg-white text-[#101011]",
    iconClassName: "text-[#606266]",
  },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const showToast = useCallback(
    (variant: ToastVariant, title: string, options?: ToastOptions) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const toast: ToastItem = {
        id,
        title,
        description: options?.description,
        variant,
      };
      setToasts((current) => [...current, toast]);

      const timer = setTimeout(() => {
        dismissToast(id);
      }, options?.durationMs ?? DEFAULT_DURATION_MS);
      timersRef.current.set(id, timer);
    },
    [dismissToast],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      showToast,
      success: (title, options) => showToast("success", title, options),
      error: (title, options) => showToast("error", title, options),
      info: (title, options) => showToast("info", title, options),
    }),
    [showToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed top-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2"
        aria-live="polite"
        aria-atomic="true"
      >
        {toasts.map((toast) => {
          const style = VARIANT_STYLES[toast.variant];
          const Icon = style.icon;
          return (
            <output
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-lg ${style.className}`}
            >
              <Icon
                size={18}
                className={`mt-0.5 shrink-0 ${style.iconClassName}`}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{toast.title}</p>
                {toast.description && (
                  <p className="mt-0.5 text-xs text-[#606266]">
                    {toast.description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                className="shrink-0 rounded-lg p-1 text-[#9B9DA5] transition-colors hover:bg-[#F8F7FF] hover:text-[#606266]"
                aria-label="Dismiss notification"
              >
                <X size={14} />
              </button>
            </output>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
