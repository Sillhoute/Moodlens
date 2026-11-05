import { toast as sonnerToast } from "sonner";

interface ToastOptions {
  description?: string;
  duration?: number; // Durasi dalam ms (Default: 4000ms)
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const showToast = {
  /** 1. Success Toast */
  success: (message: string, options?: ToastOptions) => {
    const duration = options?.duration ?? 4000;
    return sonnerToast.success(message, {
      description: options?.description,
      duration,
      action: options?.action,
      style: {
        "--toast-duration": `${duration}ms`,
      } as React.CSSProperties,
    });
  },

  /** 2. Error Toast */
  error: (message: string, options?: ToastOptions) => {
    const duration = options?.duration ?? 5000;
    return sonnerToast.error(message, {
      description: options?.description,
      duration,
      action: options?.action,
      style: {
        "--toast-duration": `${duration}ms`,
      } as React.CSSProperties,
    });
  },

  /** 3. Info Toast */
  info: (message: string, options?: ToastOptions) => {
    const duration = options?.duration ?? 4000;
    return sonnerToast.info(message, {
      description: options?.description,
      duration,
      action: options?.action,
      style: {
        "--toast-duration": `${duration}ms`,
      } as React.CSSProperties,
    });
  },

  /** 4. Warning Toast */
  warning: (message: string, options?: ToastOptions) => {
    const duration = options?.duration ?? 4500;
    return sonnerToast.warning(message, {
      description: options?.description,
      duration,
      action: options?.action,
      style: {
        "--toast-duration": `${duration}ms`,
      } as React.CSSProperties,
    });
  },

  /** Dismiss all active toasts */
  dismiss: () => sonnerToast.dismiss(),
};
