\
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Clock3, Play, RefreshCw, Sparkles } from "lucide-react";
import { supabase } from "./lib/supabase";
import "./generation-manager.css";

type ProfileRow = { id: string; level_id: string | null; created_at: string };
type StudentProfileRow = { user_id: string; nickname: string | null; level_id: string | null };
type LevelRow = { id: string; label: string };
type SubjectRow = { id: string; name: string };
type ChapterRow = { id: string; title: string; subject_id: string; status: string };
type Student = { id: string; level_id: string | null; nickname: string | null; created_at: string };
type ChapterOption = { id: string; title: string; subjectName: string };

type GenerationResult = {
  ok: boolean;
  run_id?: string;
  generated_count?: number;
  provider?: string;
  trigger_source?: string;
  chapter?: { id: string; title: string };
  message?: string;
  error?: { message?: string };
};

const shortId = (value: string) => value.slice(0, 8).toUpperCase();

export default function GenerationManager({ onOpenLogs }: { onOpenLogs?: () => void }) {
  const [students, setStudents] = useState<Student[]>([]);
  const [levels, setLevels] = useState<LevelRow[]>([]);
  const [chapters, setChapters] = useState<ChapterOption[]>([]);
  const [studentId, setStudentId] = useState("");
  const [chapterId, setChapterId] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<GenerationResult | null>(null);

  const levelLabels = useMemo(() => new Map<string, string>(levels.map(level => [level.id, level.label] as const)), [levels]);
  const selectedStudent = students.find(student => student.id === studentId);

  const loadStudents = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [profilesResult, studentProfilesResult, levelsResult] = await Promise.all([
        supabase.from("profiles").select("id,level_id,created_at").eq("role", "student").order("created_at", { ascending: false }),
        supabase.from("student_profiles").select("user_id,nickname,level_id"),
        supabase.from("levels").select("id,label").order("position")
      ]);
      if (profilesResult.error) throw profilesResult.error;
      if (studentProfilesResult.error) throw studentProfilesResult.error;
      if (levelsResult.error) throw levelsResult.error;

      const studentDetails = new Map<string, StudentProfileRow>((studentProfilesResult.data ?? []).map((row: StudentProfileRow) => [row.user_id, row] as const));
      const rows = (profilesResult.data ?? []).map((row: ProfileRow) => {
        const detail = studentDetails.get(row.id);
        return {
          id: row.id,
          level_id: detail?.level_id ?? row.level_id,
          nickname: detail?.nickname ?? null,
          created_at: row.created_at
        };
      });
      setStudents(rows);
      setLevels((levelsResult.data ?? []) as LevelRow[]);
      setStudentId(previous => rows.some(row => row.id === previous && row.level_id) ? previous : (rows.find(row => row.level_id)?.id ?? ""));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadChapters = useCallback(async (target: Student | undefined) => {
    setChapters([]);
    setChapterId("");
    if (!target?.level_id) return;
    setLoadingChapters(true);
    setError("");
    try {
      const { data: subjectRows, error: subjectError } = await supabase
        .from("subjects").select("id,name").eq("level_id", target.level_id).eq("is_active", true);
      if (subjectError) throw subjectError;
      const subjects = (subjectRows ?? []) as SubjectRow[];
      if (!subjects.length) return;
      const subjectIds = subjects.map(subject => subject.id);
      const { data: chapterRows, error: chapterError } = await supabase
        .from("chapters").select("id,title,subject_id,status")
        .in("subject_id", subjectIds).eq("status", "published").order("updated_at", { ascending: false });
      if (chapterError) throw chapterError;
      const subjectNames = new Map<string, string>(subjects.map(subject => [subject.id, subject.name] as const));
      setChapters(((chapterRows ?? []) as ChapterRow[]).map(chapter => ({
        id: chapter.id,
        title: chapter.title,
        subjectName: subjectNames.get(chapter.subject_id) ?? "Discipline"
      })));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingChapters(false);
    }
  }, []);

  useEffect(() => { void loadStudents(); }, [loadStudents]);
  useEffect(() => {
    void loadChapters(students.find(student => student.id === studentId));
  }, [studentId, students, loadChapters]);

  async function launch() {
    if (!selectedStudent?.level_id || !chapters.length || running) return;
    const selectedChapter = chapters.find(chapter => chapter.id === chapterId);
    const targetName = selectedStudent.nickname || `Élève ${shortId(selectedStudent.id)}`;
    const chapterName = selectedChapter ? `${selectedChapter.subjectName} · ${selectedChapter.title}` : "sélection automatique d'une leçon publiée";
    if (!window.confirm(`Lancer maintenant une génération pour ${targetName} (classe ${levelLabels.get(selectedStudent.level_id) ?? selectedStudent.level_id}) ?\n\nLeçon : ${chapterName}\n\nCette opération peut consommer des crédits IA.`)) return;

    setRunning(true);
    setError("");
    setResult(null);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke("kalyno-generate", {
        body: {
          action: "generate",
          manual: true,
          manual_request_id: crypto.randomUUID(),
          user_id: selectedStudent.id,
          ...(chapterId ? { chapter_id: chapterId } : {})
        }
      });
      if (invokeError) throw invokeError;
      const payload = data as GenerationResult;
      if (!payload?.ok) throw new Error(payload?.error?.message || payload?.message || "La génération n'a pas abouti.");
      setResult(payload);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="page gm-page">
      <div className="page-intro">
        <div>
          <div className="eyebrow">PILOTAGE IA · ACTION ADMINISTRATEUR</div>
          <h2>Génération immédiate d’exercices</h2>
          <p>Déclenche une génération sans attendre le prochain créneau automatique de cinq heures.</p>
        </div>
        <button className="secondary" onClick={() => void loadStudents()} disabled={loading || running}>
          <RefreshCw size={16}/> Actualiser
        </button>
      </div>

      <div className="gm-notice">
        <Sparkles size={19}/>
        <div><strong>Déclenchement manuel contrôlé</strong><p>La demande est authentifiée et le rôle administrateur est revérifié par la fonction Supabase. Elle ne remplace ni ne décale la génération automatique.</p></div>
      </div>

      <div className="panel gm-panel">
        <div className="gm-panel-heading"><div><h3>Paramètres de génération</h3><p>Choisis le compte élève et éventuellement une leçon précise.</p></div><span className="gm-live"><span/> Supabase</span></div>

        {loading ? <div className="gm-state">Chargement des comptes élèves…</div> : (
          <div className="gm-fields">
            <label>
              Compte élève
              <select value={studentId} onChange={event => { setStudentId(event.target.value); setResult(null); }} disabled={running}>
                <option value="">Choisir un compte élève</option>
                {students.map(student => (
                  <option key={student.id} value={student.id} disabled={!student.level_id}>
                    {(student.nickname || `Élève ${shortId(student.id)}`)} · {student.level_id ? (levelLabels.get(student.level_id) ?? student.level_id) : "classe non renseignée"} · {shortId(student.id)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Leçon à utiliser
              <select value={chapterId} onChange={event => { setChapterId(event.target.value); setResult(null); }} disabled={!selectedStudent?.level_id || loadingChapters || running}>
                <option value="">Sélection automatique parmi les leçons publiées</option>
                {chapters.map(chapter => <option key={chapter.id} value={chapter.id}>{chapter.subjectName} · {chapter.title}</option>)}
              </select>
              <small>{loadingChapters ? "Chargement des leçons…" : chapters.length ? `${chapters.length} leçon(s) publiée(s) disponible(s).` : "Aucune leçon publiée trouvée pour cette classe."}</small>
            </label>
          </div>
        )}

        {error && <div className="gm-error"><AlertCircle size={17}/><span>{error}</span></div>}

        <div className="gm-actions">
          <button className="primary" onClick={() => void launch()} disabled={loading || running || loadingChapters || !selectedStudent?.level_id || chapters.length === 0}>
            {running ? <><RefreshCw size={16} className="gm-spin"/> Génération en cours…</> : <><Play size={16}/> Lancer une génération maintenant</>}
          </button>
          <span>2 à 3 exercices demandés · Gemini puis secours Groq selon la configuration</span>
        </div>
      </div>

      {result && (
        <div className="panel gm-result">
          <div className="gm-result-icon"><CheckCircle2 size={22}/></div>
          <div className="gm-result-content">
            <strong>Génération terminée</strong>
            <p>{result.generated_count ?? 0} exercice(s) enregistré(s) pour {result.chapter?.title ?? "la leçon sélectionnée"}.</p>
            <div className="gm-result-meta">
              <span>Fournisseur : <b>{result.provider ?? "—"}</b></span>
              <span>Mode : <b>Manuel admin</b></span>
              {result.run_id && <span>ID : <code>{result.run_id}</code></span>}
            </div>
            {onOpenLogs && <button className="secondary" onClick={onOpenLogs}><Clock3 size={15}/> Voir le journal technique</button>}
          </div>
        </div>
      )}
    </section>
  );
}
