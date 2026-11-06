import { api } from "./api";
import { PredictionResult } from "@/types";

export async function registerUser(username: string, password: string) {
  const response = await api.post("/auth/register", { username, password });
  return response.data;
}

export async function predictImage(
  imageFile: Blob | File,
  source: "upload" | "webcam",
  saveHistory: boolean = true,
  model: "vanilla" | "resnet50" | "ensemble" = "resnet50",
): Promise<PredictionResult> {
  const formData = new FormData();
  formData.append(
    "file",
    imageFile,
    source === "webcam" ? "webcam.jpg" : "upload.jpg",
  );
  formData.append("source", source);
  formData.append("save_history", String(saveHistory));
  formData.append("model", model);

  const response = await api.post<PredictionResult>("/predict", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    skipAuth: !saveHistory,
  });
  return response.data;
}

export async function fetchHistory(offset: number = 0, limit: number = 20) {
  const response = await api.get(`/history?offset=${offset}&limit=${limit}`);
  return response.data;
}

export async function deleteHistoryItem(id: number) {
  const response = await api.delete(`/history/${id}`);
  return response.data;
}

export async function clearAllHistory() {
  const response = await api.delete("/history");
  return response.data;
}

export async function fetchStats(hari: number = 14) {
  const response = await api.get(`/stats?hari=${hari}`);
  return response.data;
}
