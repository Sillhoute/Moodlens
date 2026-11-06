"use client";

import { useTheme } from "next-themes";
import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  const { theme = "system" } = useTheme();

  return (
    <SonnerToaster
      theme={theme as "light" | "dark" | "system"}
      className="toaster group"
      position="top-right"
      closeButton
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:border-0 group-[.toaster]:shadow-xl group-[.toaster]:rounded-2xl group-[.toaster]:p-4 relative !text-white font-medium transition-colors pr-10 overflow-hidden",
          title: "!text-white font-semibold text-xs/relaxed",
          description: "!text-white/90 text-xs font-normal mt-0.5",
          actionButton:
            "bg-white/20 hover:bg-white/30 !text-white text-xs font-semibold rounded-lg border-0 transition-colors",
          cancelButton:
            "bg-black/20 hover:bg-black/30 !text-white/80 text-xs font-medium rounded-lg border-0 transition-colors",

          /* FIX TOMBOL CLOSE: Memaksa warna putih & transparan pekat */
          closeButton:
            "group-[.toast]:!bg-black/20 group-[.toast]:hover:!bg-black/40 group-[.toast]:!text-white group-[.toast]:!border-0 group-[.toast]:!top-3 group-[.toast]:!right-3 group-[.toast]:!left-auto group-[.toast]:!transform-none group-[.toast]:!transition-colors group-[.toast]:!opacity-80 group-[.toast]:hover:!opacity-100",

          /* WARNA KARTU DARI TOKEN GLOBAL (SELALU TEKS PUTIH) */
          success:
            "!bg-[var(--success)] hover:!bg-[var(--success)] !text-white",
          error:
            "!bg-[var(--destructive)] hover:!bg-[var(--destructive)] !text-white",
          info: "!bg-[var(--info)] hover:!bg-[var(--info)] !text-white",
          warning:
            "!bg-[var(--warning)] hover:!bg-[var(--warning)] !text-white",

          // Toast Default
          default:
            "!bg-slate-900 hover:!bg-slate-900 dark:!bg-slate-950 dark:hover:!bg-slate-950 !text-white border border-slate-800 dark:border-slate-800",
        },
      }}
    />
  );
}
