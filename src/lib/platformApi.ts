import { supabase } from "./supabase";
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export type ExamDraft = {
  id: string; exam_track: "cafop" | "police" | "fonction_publique" | "ena" | "injs";
  content_type: "course" | "exercise" | "dictation" | "mock_exam"; title: string;
  objective: string | null; difficulty: "foundation" | "intermediate" | "advanced";
  estimated_minutes: number | null; content: Record<string, unknown>; source_note: string | null;
  status: "draft" | "review" | "approved" | "archived"; origin: "chatgpt" | "admin";
  created_at: string; updated_at: string;
};
type Envelope<T> = { ok: true; data: T; meta?: { count?: number; limit?: number } };
type Failure = { ok: false; error?: { message?: string; request_id?: string } };

async function call<T>(path: string, init: RequestInit = {}): Promise<Envelope<T>> {
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error("Configuration Supabase absente.");
  const { data, error } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (error || !token) throw new Error("Session expirée. Reconnecte-toi à KALYNO-admin.");
  const response = await fetch(`${SUPABASE_URL}/functions/v1/kalyno-platform-api${path}`, {
    ...init,
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  const body = await response.json() as Envelope<T> | Failure;
  if (!response.ok || !body.ok) {
    const failure = body as Failure;
    const message = failure.error?.message ?? `Erreur API (${response.status}).`;
    throw new Error(failure.error?.request_id ? `${message} Référence : ${failure.error.request_id}` : message);
  }
  return body as Envelope<T>;
}

export async function listExamDrafts(limit = 250): Promise<ExamDraft[]> {
  const result = await call<ExamDraft[]>(`/v1/studio/drafts?limit=${encodeURIComponent(String(limit))}`);
  return result.data;
}
export async function createExamDraft(input: Record<string, unknown>): Promise<ExamDraft> {
  const result = await call<ExamDraft>("/v1/studio/drafts", { method: "POST", body: JSON.stringify(input) });
  return result.data;
}
export async function updateExamDraft(id: string, patch: Record<string, unknown>): Promise<ExamDraft> {
  const result = await call<ExamDraft>(`/v1/studio/drafts/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(patch) });
  return result.data;
}
