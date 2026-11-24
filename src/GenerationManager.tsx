import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Play, RefreshCw, Sparkles } from "lucide-react";
import { supabase } from "./lib/supabase";
import "./generation-manager.css";

type Student = {
  id: string;
  level_id: string | null;
  nickname: string | null;
};

type Level = { id: string; label: string };
type Subject = { id: string; name: string; level_id: string };
type Chapter = { id: string; title: string; subject_id: string };

type Props = {
  onOpenLogs: () => void;
};

export default function GenerationManager({ onOpenLogs }: Props) {
  const [students, setStudents] = useState<Student[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [studentId, setStudentId] = useState("");
  const [chapterId, setChapterId] = useState("");
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    generated_count?: number;
    provider?: string;
    run_id?: string;
  } | null>(null);

  const selectedStudent = students.find(student => student.id === studentId);

  const studentLevel = useMemo(() => {
    if (!selectedStudent) return null;
    return selectedStudent.level_id;
  }, [selectedStudent]);

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [profilesResult, studentProfilesResult, levelsResult, subjectsResult, chaptersResult] =
        await Promise.all([
          supabase.from("profiles")
            .select("id,level_id,role")
            .eq("role", "student"),
          supabase.from("student_profiles")
            .select("user_id,nickname,level_id"),
          supabase.from("levels").select("id,label"),
          supabase.from("subjects").select("id,name,level_id").eq("is_active", true),
          supabase.from("chapters").select("id,title,subject_id").eq("status", "published")
        ]);

      if (profilesResult.error) throw profilesResult.error;
      if (studentProfilesResult.error) throw studentProfilesResult.error;
      if (levelsResult.error) throw levelsResult.error;
      if (subjectsResult.error) throw subjectsResult.error;
      if (chaptersResult.error) throw chaptersResult.error;

      const profileDetails = new Map(
        (studentProfilesResult.data ?? []).map(row => [row.user_id, row])
      );

      const mergedStudents: Student[] = (profilesResult.data ?? []).map(profile => {
        const detail = profileDetails.get(profile.id);
        return {
          id: profile.id,
          level_id: detail?.level_id ?? profile.level_id ?? null,
          nickname: detail?.nickname ?? null
        };
      });

      setStudents(mergedStudents);
      setLevels((levelsResult.data ?? []) as Level[]);
      setSubjects((subjectsResult.data ?? []) as Subject[]);
      setChapters((chaptersResult.data ?? []) as Chapter[]);

      setStudentId(previous =>
        mergedStudents.some(student => student.id === previous)
          ? previous
          : mergedStudents.find(student => student.level_id)?.id ?? ""
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    setChapterId("");
  }, [studentId]);

  const eligibleStudents = students.filter(student => Boolean(student.level_id));

  const availableChapters = chapters.filter(chapter => {
    if (!studentLevel) return false;
    const subject = subjects.find(item => item.id === chapter.subject_id);
    return subject?.level_id === studentLevel;
  });

  async function launchGeneration() {
    if (!selectedStudent || !selectedStudent.level_id) {
      setError("Sélectionne un élève disposant d'une classe.");
      return;
    }

    const confirmed = window.confirm(
      "Lancer une génération maintenant pour cet élève ? Cette opération peut consommer des crédits IA."
    );
    if (!confirmed) return;

    setRunning(true);
    setError("");
    setResult(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke(
        "kalyno-generate",
        {
          body: {
            action: "generate",
            manual: true,
            manual_request_id: crypto.randomUUID(),
            user_id: selectedStudent.id,
            ...(chapterId ? { chapter_id: chapterId } : {})
          }
        }
      );

      if (invokeError) throw invokeError;
      if (data?.error) throw new Error(String(data.error));

      setResult({
        generated_count: data?.generated_count ?? data?.count ?? undefined,
        provider: data?.provider ?? undefined,
        run_id: data?.run_id ?? undefined
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="page generation-page">
      <div className="page-intro">
        <div>
          <div className="eyebrow">PILOTAGE · INTELLIGENCE ARTIFICIELLE</div>
          <h2>Génération IA</h2>
          <p>
            Déclenche une génération d'exercices à la demande, sans attendre
            la prochaine génération automatique.
          </p>
        </div>
        <button className="secondary" onClick={() => void loadData()} disabled={loading || running}>
          <RefreshCw size={16} /> Actualiser
        </button>
      </div>

      <div className="generation-card">
        <div className="generation-card-heading">
          <div className="generation-icon"><Sparkles size={22} /></div>
          <div>
            <h3>Lancement manuel</h3>
            <p>Choisis un élève et, si nécessaire, un chapitre précis.</p>
          </div>
        </div>

        {loading ? (
          <p className="generation-muted">Chargement des élèves et des chapitres…</p>
        ) : (
          <>
            <label className="generation-field">
              Élève destinataire
              <select value={studentId} onChange={event => setStudentId(event.target.value)}>
                <option value="">Sélectionner un élève</option>
                {eligibleStudents.map(student => (
                  <option key={student.id} value={student.id}>
                    {student.nickname?.trim() || `Élève ${student.id.slice(0, 8)}`}
                    {" — "}
                    {levels.find(level => level.id === student.level_id)?.label ?? "Classe non identifiée"}
                  </option>
                ))}
              </select>
            </label>

            <label className="generation-field">
              Chapitre (facultatif)
              <select
                value={chapterId}
                onChange={event => setChapterId(event.target.value)}
                disabled={!selectedStudent}
              >
                <option value="">Sélection automatique</option>
                {availableChapters.map(chapter => (
                  <option key={chapter.id} value={chapter.id}>
                    {subjects.find(subject => subject.id === chapter.subject_id)?.name}
                    {" · "}
                    {chapter.title}
                  </option>
                ))}
              </select>
            </label>

            {!eligibleStudents.length && (
              <div className="generation-warning">
                Aucun élève disposant d'une classe n'est disponible.
              </div>
            )}

            {selectedStudent && availableChapters.length === 0 && (
              <p className="generation-muted">
                Aucun chapitre publié n'est disponible pour la classe de cet élève.
              </p>
            )}

            <button
              className="primary generation-launch"
              onClick={() => void launchGeneration()}
              disabled={running || !selectedStudent}
            >
              {running ? (
                <><RefreshCw size={17} className="generation-spin" /> Génération en cours…</>
              ) : (
                <><Play size={17} /> Lancer une génération maintenant</>
              )}
            </button>
          </>
        )}
      </div>

      {error && (
        <div className="generation-error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div className="generation-success">
          <CheckCircle2 size={20} />
          <div>
            <strong>La fonction a répondu sans signaler d'erreur.</strong>
            {result.generated_count !== undefined && (
              <p>Exercices générés : {result.generated_count}</p>
            )}
            {result.provider && <p>Fournisseur : {result.provider}</p>}
            {result.run_id && <p>Exécution : <code>{result.run_id}</code></p>}
            <small>Vérifie le journal technique pour confirmer le résultat final.</small>
          </div>
        </div>
      )}

      <div className="generation-footer">
        <span>Les lancements manuels ne déplacent pas le calendrier automatique.</span>
        <button className="secondary" onClick={onOpenLogs}>Voir les journaux techniques</button>
      </div>
    </section>
  );
}
