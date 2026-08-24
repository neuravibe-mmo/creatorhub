"use client";

import React, { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { removeToast } from "@/store/slices/uiSlice";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function ToastContainer() {
  const dispatch = useAppDispatch();
  const toasts = useAppSelector((state) => state.ui.toasts);

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onClose={() => dispatch(removeToast(t.id))} />
      ))}
    </div>
  );
}

function ToastItem({
  toast,
  onClose,
}: {
  toast: { id: string; type: "info" | "ok" | "err"; message: string };
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3600);
    return () => clearTimeout(timer);
  }, [onClose]);

  const icons = {
    ok: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
    err: <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />,
    info: <Info className="w-5 h-5 text-blue-400 shrink-0" />,
  };

  const borders = {
    ok: "border-emerald-500/30 bg-slate-900/95 text-emerald-200",
    err: "border-rose-500/30 bg-slate-900/95 text-rose-200",
    info: "border-blue-500/30 bg-slate-900/95 text-blue-200",
  };

  return (
    <div
      className={cn(
        "pointer-events-auto flex items-center justify-between gap-3 p-3.5 rounded-lg border shadow-xl backdrop-blur-md animate-fade-in text-sm font-medium",
        borders[toast.type]
      )}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        {icons[toast.type]}
        <span className="truncate text-slate-100">{toast.message}</span>
      </div>
      <button
        onClick={onClose}
        className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
