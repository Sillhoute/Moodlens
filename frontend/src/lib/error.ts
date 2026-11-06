import type { AxiosError } from "axios";
import { showToast } from "./toast";

type ApiError =
  | AxiosError<{
      message?: string;
      error?: string;
      data?: Record<string, string>;
    }>
  | Error
  | unknown;

export const handleError = (error: ApiError) => {
  const isAxiosError = (
    err: ApiError,
  ): err is AxiosError<{
    data?: Record<string, string>;
    message?: string;
    error?: string;
  }> => typeof err === "object" && err !== null && "isAxiosError" in err;

  // 1. Respon dari Axios API Backend
  if (isAxiosError(error)) {
    const errorData = error.response?.data;

    // Validation errors per field dari backend Express
    if (errorData?.data && typeof errorData.data === "object") {
      Object.values(errorData.data).forEach((errMessage) => {
        if (typeof errMessage === "string") showToast.error(errMessage);
      });
      return;
    }

    const customMessage = errorData?.message || errorData?.error;
    if (customMessage) {
      showToast.error(customMessage);
      return;
    }

    showToast.error("Terjadi kesalahan pada server");
    return;
  }

  // 2. Standard JS Error
  if (error instanceof Error) {
    showToast.error(error.message || "Terjadi kesalahan yang tidak terduga");
    return;
  }

  // 3. Unknown Error
  showToast.error("Terjadi kesalahan yang tidak diketahui");
};
