import { supabase } from "./supabase";
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export type ExamTrackCode = "cafop" | "police" | "fonction_publique" | "ena" | "injs";
export type PlatformTrack = { code: ExamTrackCode; label: string };
export type PlatformHealth = { service: string; version: string; status: string };
export type PlatformCapabilities = { api_version: string; modules: { id: string; status: string; resources: string[] }[]; transports: string[] };
export type ExamDraft = {
  id: string; exam_track: ExamTrackCode;
  content_type: "course" | "exercise" | "dictation" | "mock_exam"; title: string;
  objective: string | null; difficulty: "foundation" | "intermediate" | "advanced";
  estimated_minutes: number | null; content: Record<string, unknown>; source_note: string | null;
  status: "draft" | "review" | "approved" | "archived"; origin: "chatgpt" | "admin";
  created_at: string; updated_at: string;
};
type Envelope<T> = { ok: true; data: T; meta?: { count?: number; limit?: number } };
type Failure = { ok: false; error?: { message?: string; request_id?: string } };

async function call<T>(path: string, init: RequestInit = {}): Promise<Envelope<T>> {
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error("Configuration Supabase absente (URL ou clé publique).");
  const { data, error } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (error || !token) throw new Error("Session expirée. Reconnecte-toi à KALYNO-admin.");
  const response = await fetch(`${SUPABASE_URL}/functions/v1/kalyno-platform-api${path}`, {
    ...init,
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  const body = await response.json().catch(() => null) as Envelope<T> | Failure | null;
  if (!response.ok || !body || !body.ok) {
    const failure = body as Failure | null;
    const message = failure?.error?.message ?? `Erreur API (${response.status}).`;
    const requestId = failure?.error?.request_id ?? response.headers.get("X-Request-Id");
    throw new Error(requestId ? `${message} Référence : ${requestId}` : message);
  }
  return body as Envelope<T>;
}

export async function getPlatformHealth(): Promise<PlatformHealth> {
  return (await call<PlatformHealth>("/v1/health")).data;
}
export async function getPlatformCapabilities(): Promise<PlatformCapabilities> {
  return (await call<PlatformCapabilities>("/v1/capabilities")).data;
}
export async function getPlatformTracks(): Promise<PlatformTrack[]> {
  return (await call<PlatformTrack[]>("/v1/exam-tracks")).data;
}
export async function listExamDrafts(limit = 100): Promise<ExamDraft[]> {
  const safeLimit = Math.min(100, Math.max(1, Math.floor(limit)));
  return (await call<ExamDraft[]>(`/v1/studio/drafts?limit=${encodeURIComponent(String(safeLimit))}`)).data;
}
export async function createExamDraft(input: Record<string, unknown>): Promise<ExamDraft> {
  return (await call<ExamDraft>("/v1/studio/drafts", { method: "POST", body: JSON.stringify(input) })).data;
}
export async function updateExamDraft(id: string, patch: Record<string, unknown>): Promise<ExamDraft> {
  return (await call<ExamDraft>(`/v1/studio/drafts/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(patch) })).data;
}
