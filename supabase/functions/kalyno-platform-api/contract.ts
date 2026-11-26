export const EXAM_TRACKS = [
  { code: "cafop", label: "CAFOP" },
  { code: "police", label: "Police nationale" },
  { code: "fonction_publique", label: "Fonction publique" },
  { code: "ena", label: "ENA" },
  { code: "injs", label: "INJS" },
] as const;
export const CONTENT_TYPES = ["course", "exercise", "dictation", "mock_exam"] as const;
export const DIFFICULTIES = ["foundation", "intermediate", "advanced"] as const;
export const STATUSES = ["draft", "review", "approved", "archived"] as const;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validateDraftInput(value: unknown) {
  if (!isRecord(value)) return { ok: false as const, message: "Le corps doit être un objet JSON." };
  const title = typeof value.title === "string" ? value.title.trim() : "";
  const objective = value.objective === undefined ? "" : value.objective;
  const difficulty = value.difficulty ?? "intermediate";
  const estimated_minutes = value.estimated_minutes ?? 20;
  const source_note = value.source_note ?? null;
  if (!EXAM_TRACKS.some(x => x.code === value.exam_track)) return { ok: false as const, message: "Concours invalide." };
  if (!CONTENT_TYPES.includes(value.content_type as typeof CONTENT_TYPES[number])) return { ok: false as const, message: "Type de contenu invalide." };
  if (title.length < 3 || title.length > 180) return { ok: false as const, message: "Le titre doit contenir entre 3 et 180 caractères." };
  if (typeof objective !== "string" || objective.length > 1200) return { ok: false as const, message: "Objectif invalide." };
  if (!DIFFICULTIES.includes(difficulty as typeof DIFFICULTIES[number])) return { ok: false as const, message: "Difficulté invalide." };
  if (!Number.isInteger(estimated_minutes) || (estimated_minutes as number) < 1 || (estimated_minutes as number) > 600) return { ok: false as const, message: "La durée doit être un entier compris entre 1 et 600 minutes." };
  if (!isRecord(value.content)) return { ok: false as const, message: "Le contenu doit être un objet JSON." };
  if (source_note !== null && (typeof source_note !== "string" || source_note.length > 1500)) return { ok: false as const, message: "La note de source est invalide." };
  return { ok: true as const, value: {
    exam_track: value.exam_track as string,
    content_type: value.content_type as string,
    title,
    objective,
    difficulty,
    estimated_minutes,
    content: value.content,
    source_note,
  } };
}

export function validateDraftPatch(value: unknown) {
  if (!isRecord(value) || Object.keys(value).length === 0) return { ok: false as const, message: "Le corps doit contenir au moins un champ à modifier." };
  const allowed = new Set(["exam_track", "content_type", "title", "objective", "difficulty", "estimated_minutes", "content", "source_note", "status"]);
  if (Object.keys(value).some(key => !allowed.has(key))) return { ok: false as const, message: "Un ou plusieurs champs ne sont pas modifiables." };
  const result: Record<string, unknown> = {};
  if ("exam_track" in value) {
    if (!EXAM_TRACKS.some(x => x.code === value.exam_track)) return { ok: false as const, message: "Concours invalide." };
    result.exam_track = value.exam_track;
  }
  if ("content_type" in value) {
    if (!CONTENT_TYPES.includes(value.content_type as typeof CONTENT_TYPES[number])) return { ok: false as const, message: "Type de contenu invalide." };
    result.content_type = value.content_type;
  }
  if ("title" in value) {
    if (typeof value.title !== "string" || value.title.trim().length < 3 || value.title.trim().length > 180) return { ok: false as const, message: "Le titre doit contenir entre 3 et 180 caractères." };
    result.title = value.title.trim();
  }
  if ("objective" in value) {
    if (typeof value.objective !== "string" || value.objective.length > 1200) return { ok: false as const, message: "Objectif invalide." };
    result.objective = value.objective;
  }
  if ("difficulty" in value) {
    if (!DIFFICULTIES.includes(value.difficulty as typeof DIFFICULTIES[number])) return { ok: false as const, message: "Difficulté invalide." };
    result.difficulty = value.difficulty;
  }
  if ("estimated_minutes" in value) {
    if (!Number.isInteger(value.estimated_minutes) || (value.estimated_minutes as number) < 1 || (value.estimated_minutes as number) > 600) return { ok: false as const, message: "La durée doit être un entier compris entre 1 et 600 minutes." };
    result.estimated_minutes = value.estimated_minutes;
  }
  if ("content" in value) {
    if (!isRecord(value.content)) return { ok: false as const, message: "Le contenu doit être un objet JSON." };
    result.content = value.content;
  }
  if ("source_note" in value) {
    if (value.source_note !== null && (typeof value.source_note !== "string" || value.source_note.length > 1500)) return { ok: false as const, message: "La note de source est invalide." };
    result.source_note = value.source_note;
  }
  if ("status" in value) {
    if (!STATUSES.includes(value.status as typeof STATUSES[number])) return { ok: false as const, message: "Statut invalide." };
    result.status = value.status;
  }
  return { ok: true as const, value: result };
}

export function parseListLimit(raw: string | null): number {
  const value = raw === null ? 50 : Number(raw);
  return Number.isInteger(value) ? Math.min(100, Math.max(1, value)) : 50;
}
