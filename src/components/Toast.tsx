"use client";

import { Toast as ToastType } from "@/lib/useToast";

const TOAST_STYLES: Record<string, { bg: string; border: string; icon: string }> = {
  success: { bg: "bg-green-900/90", border: "border-green-400", icon: "✓" },
  error:   { bg: "bg-red-900/90",   border: "border-red-400",   icon: "✕" },
  warning: { bg: "bg-yellow-900/90", border: "border-yellow-400", icon: "⚠" },
};

export default function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastType[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-[90vw] max-w-sm pointer-events-none">
      {toasts.map((toast) => {
        const style = TOAST_STYLES[toast.type] || TOAST_STYLES.success;
        return (
          <div
            key={toast.id}
            className={`${style.bg} ${style.border} border px-4 py-3 flex items-center gap-3 shadow-lg pointer-events-auto animate-[slideDown_0.3s_ease-out] backdrop-blur-sm`}
            onClick={() => onDismiss(toast.id)}
            role="alert"
          >
            <span className="text-lg font-bold font-mono">
              {style.icon}
            </span>
            <span className="text-sm text-white flex-1">{toast.message}</span>
          </div>
        );
      })}
    </div>
  );
}
