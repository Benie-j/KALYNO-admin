import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  Activity, AlertCircle, Bell, ArrowDown, ArrowDownUp, ArrowUp, BookOpen, Check, ChevronDown, CircleHelp,
  ClipboardList, Cloud, FileText, GraduationCap, LayoutDashboard, LogOut, Plus,
  Flag, RefreshCw, Rocket, Save, Search, ShieldCheck, Sparkles, Target, Trash2, UploadCloud,
  X, Dumbbell, Eye, EyeOff, ArrowLeft, ChevronRight
} from "lucide-react";
import { supabase } from "./lib/supabase";
import FrenchConcoursStudio from "./FrenchConcoursStudio";
<<<<<<< HEAD
<<<<<<< HEAD
import PlatformApiManager from "./PlatformApiManager";
import CapsuleEditor, { type CapsuleEditorDraft } from "./CapsuleEditor";
=======
import CapsuleEditor, { renderPreview, type CapsuleEditorDraft } from "./CapsuleEditor";
>>>>>>> 8ce1c5c (***)
=======
import CapsuleEditor, { renderPreview, type CapsuleEditorDraft } from "./CapsuleEditor";
>>>>>>> main
import LevelsManager from "./LevelsManager";
import ThemesManager from "./ThemesManager";
import MotivationManager from "./MotivationManager";
import FaqManager from "./FaqManager";
import SemanticSettingsManager from "./SemanticSettingsManager";
import AiUsageManager from "./AiUsageManager";
import GenerationErrorsManager from "./GenerationErrorsManager";
import GenerationManager from "./GenerationManager";
import PushDeliveryManager from "./PushDeliveryManager";
import ReportsManager, { isWelcomeReport, type ReportSourceRef } from "./ReportsManager";
import { SlidersHorizontal } from "lucide-react";
import FirstChallengeComposer from "./FirstChallengeComposer";
import EntryPage, { type EntrySpec, type FieldDef, type Values } from "./EntryPage";
import { composeExplanation, splitExplanation } from "./feynman";
import { MathHtml } from "./MathField";
import { TABLE_KIND, newTableDraft, draftToValue, parseTable, serializeTable, tableSummary, type TableDraft } from "./tableExercise";

type Level = { id: string; label: string; position: number; is_active: boolean; cycle: string | null; icon_key: string | null; tagline: string | null };
type Subject = { id: string; level_id: string; name: string; emoji: string | null; icon_key: string | null; coefficient: number; position: number; is_active: boolean };
type Chapter = { id: string; subject_id: string; title: string; position: number; status: "draft" | "published"; tag?: string | null; complement?: string | null };
type LessonSession = { id: string; chapter_id: string; title: string; position: number; is_available?: boolean };
type Capsule = { id: string; chapter_id: string; title: string; body: string; minutes: number; position: number; kind: string; is_high_yield: boolean; session_id?: string | null };
type Card = { id: string; chapter_id: string; capsule_id: string | null; kind: "flashcard" | "qcm" | "cloze" | "table"; front: string; back: string | null; choices: string[] | null; correct_index: number | null; explanation: string | null; position: number; is_high_yield: boolean; admin_reference?: string | null };
type FreeExercise = { id: string; level_id: string | null; label: string | null; kind: "flashcard" | "qcm" | "cloze" | "table"; front: string; back: string | null; choices: string[] | null; correct_index: number | null; explanation: string | null; position: number; is_published: boolean; admin_reference?: string | null };
type Banner = { id: string; title: string; subtitle: string | null; button_label: string | null; chapter_id: string | null; level_id: string | null; position: number; is_active: boolean };

type Section = "frenchstudio" | "platformapi" | "overview" | "levels" | "courses" | "banners" | "motivation" | "themes" | "freeexercises" | "firstchallenge" | "semantic" | "reports" | "aiusage" | "generation" | "pushes" | "errors" | "faq";
const SUBJECT_ICONS = ["backpack","graduation-cap","book-open","pen-line","calculator","flask-conical","globe","brain","layers","target","lightbulb","rocket","trophy","dumbbell"];
// Champ facultatif rattaché à la leçon : affiché à l'élève dans un encart repliable en fin de leçon.
const COMPLEMENT_FIELD: FieldDef = {
  kind: "math", key: "complement", label: "Notes et ressources complémentaires (facultatif)", rows: 5, preview: "text",
  placeholder: "Ex. : œuvre intégrale à lire, rappel de méthode, lien utile…",
  help: "Laisse vide s'il n'y a rien à ajouter : l'encart n'apparaît alors pas chez l'élève."
};
// Valeur interne : section « Blocs non affectés » (capsules.session_id IS NULL)
const UNASSIGNED = "__none__";
const KIND_LABEL: Record<string, string> = { intro: "Introduction", text: "Texte", rule: "Règle / formule", tip: "Astuce", pitfall: "Piège à éviter" };

function errorText(error: unknown) {
  if (error && typeof error === "object" && "message" in error) return String((error as {message: unknown}).message);
  return String(error ?? "Une erreur inconnue est survenue.");
}
const ICON_LABEL: Record<string, string> = { "backpack": "Cartable", "graduation-cap": "Toque de diplômé", "book-open": "Livre ouvert", "pen-line": "Stylo", "calculator": "Calculatrice", "flask-conical": "Fiole", "globe": "Globe", "brain": "Cerveau", "layers": "Calques", "target": "Cible", "lightbulb": "Ampoule", "rocket": "Fusée", "trophy": "Trophée", "dumbbell": "Haltère" };
const ICON_OPTIONS = SUBJECT_ICONS.map(value => ({ value, label: `${ICON_LABEL[value] ?? value} (${value})` }));
// Coefficient d'une discipline (virgule ou point acceptés), lu par l'application pour le moteur FSRS.
const parseCoef = (value: string | string[] | undefined) => Number(str(value).replace(",", "."));
const coefProblem = (v: Record<string, string | string[]>): string | null => {
  const n = parseCoef(v.coefficient);
  return Number.isFinite(n) && n > 0 && n <= 20 ? null : "Coefficient : saisis un nombre supérieur à 0 et au plus 20 (ex. : 4 ou 2,5).";
};
const formatCoef = (n: number | null | undefined) => String(Math.round((Number(n) || 1) * 100) / 100).replace(".", ",");
const str = (value: string | string[] | undefined) => String(Array.isArray(value) ? value[0] ?? "" : value ?? "").trim();
// Explication en trois champs (technique de Feynman) <-> colonne `explanation`
const explanationFrom = (v: Values) => composeExplanation({ clear: str(v.exp_clear), analogy: str(v.exp_analogy), takeaway: str(v.exp_takeaway) });
const explanationValues = (raw: string | null | undefined) => { const f = splitExplanation(raw); return { exp_clear: f.clear, exp_analogy: f.analogy, exp_takeaway: f.takeaway }; };
const strings = (value: string | string[] | undefined, count: number) => Array.from({ length: count }, (_, i) => (Array.isArray(value) ? value[i] ?? "" : ""));


const cardFields = (withKind: boolean, count: number): FieldDef[] => [
  ...(withKind ? [{ kind: "select" as const, key: "kind", label: "Type de carte", options: [
    { value: "qcm", label: "QCM : une question et des choix" },
    { value: "flashcard", label: "Flashcard : recto / verso" },
    { value: "cloze", label: "Texte à compléter : réponse attendue" },
    { value: "table", label: "Tableau à compléter : cellules fixes et cellules vides" }
  ] }] : []),
  { kind: "math", key: "front", label: "Question / recto", required: true, rows: 3, preview: "title", when: v => v.kind !== TABLE_KIND },
  { kind: "math", key: "table_statement", label: "1 · Énoncé (affiché au-dessus du tableau)", required: true, rows: 3, preview: "title", when: v => v.kind === TABLE_KIND,
    placeholder: "Ex. : Complète le tableau suivant concernant les états de la matière.", help: "Les formules LaTeX s'écrivent entre $ … $ (Alt+M), comme dans les autres exercices." },
  { kind: "table", key: "table_grid", statementKey: "table_statement", label: "2 · Construction du tableau", when: v => v.kind === TABLE_KIND,
    help: "Touche une cellule pour la modifier. « À compléter » cache son contenu à l'élève et le remplace par un champ de saisie ; la réponse attendue reste réservée à la correction." },
  { kind: "choices", key: "choices", label: "Choix de réponse", count, correctKey: "correct", when: v => v.kind === "qcm" },
  { kind: "math", key: "back", label: "Réponse / complément (facultatif)", rows: 2, when: v => v.kind === "qcm" },
  { kind: "math", key: "back", label: "Verso / réponse", required: true, rows: 2, when: v => v.kind === "flashcard" },
  { kind: "math", key: "back", label: "Texte complété / réponse attendue", required: true, rows: 2, when: v => v.kind === "cloze" },
  { kind: "math", key: "exp_clear", label: "Explication en clair (facultatif)", rows: 3,
    placeholder: "Une idée par ligne, en mots simples, sans jargon.",
    help: "Explique comme à un ami de 12 ans : phrases courtes, aucun terme technique non expliqué." },
  { kind: "math", key: "exp_analogy", label: "Analogie du quotidien (facultatif)", rows: 2,
    placeholder: "Ex. : le courant, c'est de l'eau qui circule dans un tuyau.",
    help: "Compare le concept à quelque chose que l'élève connaît déjà." },
  { kind: "math", key: "exp_takeaway", label: "À retenir en une phrase (facultatif)", single: true,
    placeholder: "L'essentiel, que l'élève peut répéter avec ses mots." }
];


/** Valeurs de formulaire d'une carte « tableau » : énoncé + grille (brouillon JSON), relus depuis `front` et `admin_reference`. */
const tableValues = (front: string | null | undefined, reference: unknown): { table_statement: string; table_grid: string; broken: boolean } => {
  const parsed = parseTable(front, reference);
  const draft: TableDraft = parsed?.draft ?? newTableDraft();
  return { table_statement: parsed?.statement ?? "", table_grid: draftToValue(draft), broken: !parsed };
};
/** Colonnes enregistrées pour un tableau : `front` ne contient AUCUNE réponse, `admin_reference` les contient. */
const tableColumns = (v: Values) => {
  const { front, adminReference } = serializeTable(str(v.table_statement), JSON.parse(str(v.table_grid)) as TableDraft);
  return { front, back: null, choices: null, correct_index: null, admin_reference: adminReference };
};

const TABLE_MIGRATION_MESSAGE = "La migration SQL « tableaux » n'a pas encore été exécutée dans Supabase (colonne admin_reference / type table) : exécute supabase/migrations/20261123_tableaux_a_completer.sql puis recharge cette page.";
const tableInitial = (row: { kind: string; front: string; admin_reference?: string | null }) =>
  row.kind === TABLE_KIND ? (({ table_statement, table_grid }) => ({ table_statement, table_grid }))(tableValues(row.front, row.admin_reference)) : {};
const tableIntro = (row: { front: string; admin_reference?: string | null }) =>
  tableValues(row.front, row.admin_reference).broken
    ? "Type : TABLEAU · le contenu enregistré est illisible : reconstruis le tableau ci-dessous puis enregistre."
    : "Type : TABLEAU À COMPLÉTER";
/** Cellule « énoncé » des listes : un tableau n'affiche jamais son JSON, seulement l'énoncé et sa taille. */
function FrontCell({ row }: { row: { kind: string; front: string; admin_reference?: string | null } }) {
  if (row.kind !== TABLE_KIND) return <MathHtml text={row.front} />;
  const s = tableSummary(row.front, row.admin_reference);
  return <><MathHtml text={s.statement} /><small className="muted-cell">{s.detail}</small></>;
}
/** Colonne « Réponse » des listes : rien d'autre que le nombre de cellules pour un tableau (les réponses restent dans la modification). */
const answerCellText = (row: { kind: string; choices: string[] | null; correct_index: number | null; back: string | null }) =>
  row.kind === TABLE_KIND ? "Voir le tableau" : row.kind === "qcm" && row.choices ? row.choices[row.correct_index ?? 0] ?? "—" : row.back ?? "—";

const questionFields: FieldDef[] = [
  { kind: "math", key: "prompt", label: "Énoncé de la question", required: true, rows: 3, preview: "title" },
  { kind: "choices", key: "choices", label: "Choix de réponse", count: 4, correctKey: "correct" },
  { kind: "math", key: "explanation", label: "Explication (facultatif)", rows: 3 }
];

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [section, setSection] = useState<Section>("overview");
  const [levels, setLevels] = useState<Level[]>([]);
  const [levelId, setLevelId] = useState("");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState("");
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [chapterId, setChapterId] = useState("");
  const [capsules, setCapsules] = useState<Capsule[]>([]);
  const [sessions, setSessions] = useState<LessonSession[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [searchText, setSearchText] = useState("");
  const [counts, setCounts] = useState({ subjects: 0, chapters: 0, capsules: 0, cards: 0, students: 0 });
  const [entry, setEntry] = useState<EntrySpec | null>(null);
  const [pendingReports, setPendingReports] = useState(0);
  const [capsuleEditor, setCapsuleEditor] = useState<{ capsule: Capsule | null } | null>(null);
  // Parcours de création : 1 = disciplines, 2 = leçons d'une discipline, 3 = une leçon (contenu / exercices)
  const [courseView, setCourseView] = useState<"subjects" | "lessons" | "lesson">("subjects");
  const [lessonTab, setLessonTab] = useState<"content" | "exercises">("content");
  // Navigation pédagogique : séances -> blocs d'une séance -> aperçu complet (lecture seule) d'un bloc
  const [sessionView, setSessionView] = useState<"sessions" | "blocks" | "preview">("sessions");
  const [openSessionId, setOpenSessionId] = useState("");
  const [previewId, setPreviewId] = useState("");
  useEffect(() => { setSessionView("sessions"); setOpenSessionId(""); setPreviewId(""); }, [chapterId]);
  const scopeCapsules = useMemo(() => capsules
    .filter(c => openSessionId === UNASSIGNED ? !c.session_id : c.session_id === openSessionId)
    .sort((a, b) => a.position - b.position), [capsules, openSessionId]);
  const unassignedCount = capsules.filter(c => !c.session_id).length;
  const openSession = sessions.find(s => s.id === openSessionId);
  const previewCapsule = capsules.find(c => c.id === previewId);
  const scopeLabel = openSessionId === UNASSIGNED ? "Blocs non affectés" : openSession ? `Séance ${sessions.findIndex(x => x.id === openSession.id) + 1} — ${openSession.title}` : "Séance";
  const [freeItems, setFreeItems] = useState<FreeExercise[]>([]);
  const [freeMissing, setFreeMissing] = useState(false);
  // Vrai tant que la migration SQL « tableaux » n'est pas passée : la création d'un tableau est alors refusée avec un message clair.
  const [tableColumnsMissing, setTableColumnsMissing] = useState(false);

  const currentLevel = levels.find(x => x.id === levelId);
  // Catalogue complet dans `levels` ; menus de travail = classes actives uniquement.
  const activeLevels = useMemo(() => levels.filter(x => x.is_active === true), [levels]);
  const currentSubject = subjects.find(x => x.id === subjectId);
  const currentChapter = chapters.find(x => x.id === chapterId);

  const loadLevels = useCallback(async () => {
    const { data, error } = await supabase.from("levels").select("id,label,position,is_active,cycle,icon_key,tagline").order("position");
    if (error) throw error;
    const rows = (data ?? []) as Level[];
    setLevels(rows);
    const active = rows.filter(x => x.is_active === true);
    setLevelId(previous =>
      active.some(x => x.id === previous) ? previous
      : active.some(x => x.id === "TLE_A3") ? "TLE_A3"
      : (active[0]?.id ?? ""));
  }, []);

  const loadContent = useCallback(async (activeLevel: string) => {
    if (!activeLevel) { setSubjects([]); setChapters([]); setCapsules([]); setCards([]); return; }
    const { data, error } = await supabase.from("subjects")
      .select("id,level_id,name,emoji,icon_key,coefficient,position,is_active")
      .eq("level_id", activeLevel).order("position");
    if (error) throw error;
    const rows = (data ?? []) as Subject[];
    setSubjects(rows);
    setSubjectId(previous => rows.some(x => x.id === previous) ? previous : (rows[0]?.id ?? ""));
  }, []);

  const loadChapters = useCallback(async (activeSubject: string) => {
    if (!activeSubject) { setChapters([]); setChapterId(""); setCapsules([]); setCards([]); return; }
    const firstTry = await supabase.from("chapters")
      .select("id,subject_id,title,position,status,tag,complement")
      .eq("subject_id", activeSubject).order("position");
    let rows: Chapter[];
    if (firstTry.error) {
      // Migration des séances pas encore passée : on lit sans la colonne `complement`
      const retry = await supabase.from("chapters")
        .select("id,subject_id,title,position,status,tag")
        .eq("subject_id", activeSubject).order("position");
      if (retry.error) throw retry.error;
      rows = (retry.data ?? []) as Chapter[];
    } else {
      rows = (firstTry.data ?? []) as Chapter[];
    }
    setChapters(rows);
    setChapterId(previous => rows.some(x => x.id === previous) ? previous : (rows[0]?.id ?? ""));
  }, []);

  const loadLesson = useCallback(async (activeChapter: string) => {
    if (!activeChapter) { setCapsules([]); setCards([]); setSessions([]); return; }
    const [firstCapsuleTry, cardResult, sessionResult] = await Promise.all([
      supabase.from("capsules").select("id,chapter_id,title,body,minutes,position,kind,is_high_yield,session_id").eq("chapter_id", activeChapter).order("position"),
      supabase.from("cards").select("id,chapter_id,capsule_id,kind,front,back,choices,correct_index,explanation,position,is_high_yield,admin_reference").eq("chapter_id", activeChapter).order("position"),
      supabase.from("lesson_sessions").select("id,chapter_id,title,position,is_available").eq("chapter_id", activeChapter).order("position")
    ]);
    let capsuleRows: Capsule[];
    if (firstCapsuleTry.error) {
      // Colonne `session_id` absente (migration pas encore passée) : lecture sans séances
      const retry = await supabase.from("capsules").select("id,chapter_id,title,body,minutes,position,kind,is_high_yield").eq("chapter_id", activeChapter).order("position");
      if (retry.error) throw retry.error;
      capsuleRows = (retry.data ?? []) as Capsule[];
    } else {
      capsuleRows = (firstCapsuleTry.data ?? []) as Capsule[];
    }
    let cardRows = cardResult;
    if (cardRows.error) {
      // Colonne `admin_reference` absente (migration « tableaux » pas encore passée) : lecture des cartes sans elle
      const retry = await supabase.from("cards").select("id,chapter_id,capsule_id,kind,front,back,choices,correct_index,explanation,position,is_high_yield").eq("chapter_id", activeChapter).order("position");
      if (retry.error) throw retry.error;
      cardRows = retry as unknown as typeof cardResult;
      setTableColumnsMissing(true);
    } else setTableColumnsMissing(false);
    if (sessionResult.error) {
      // Colonne `is_available` absente : relecture sans elle (les séances restent administrables)
      const retry = await supabase.from("lesson_sessions").select("id,chapter_id,title,position").eq("chapter_id", activeChapter).order("position");
      setSessions(retry.error ? [] : (retry.data ?? []) as LessonSession[]);
    } else setSessions((sessionResult.data ?? []) as LessonSession[]);
    setCapsules(capsuleRows);
    setCards((cardRows.data ?? []) as Card[]);
  }, []);

  const loadBanners = useCallback(async () => {
    const { data, error } = await supabase.from("explorer_banners")
      .select("id,title,subtitle,button_label,chapter_id,level_id,position,is_active").order("position");
    if (error) throw error;
    setBanners((data ?? []) as Banner[]);
  }, []);

  const loadFree = useCallback(async () => {
    let result = await supabase.from("free_exercises")
      .select("id,level_id,label,kind,front,back,choices,correct_index,explanation,position,is_published,admin_reference")
      .order("position");
    if (result.error) {
      // Colonne `admin_reference` absente (migration « tableaux » pas encore passée) : on relit sans elle
      const retry = await supabase.from("free_exercises")
        .select("id,level_id,label,kind,front,back,choices,correct_index,explanation,position,is_published")
        .order("position");
      if (retry.error) { setFreeItems([]); setFreeMissing(true); return; } // table pas encore créée : l'écran l'explique
      result = retry as unknown as typeof result;
      setTableColumnsMissing(true);
    } else setTableColumnsMissing(false);
    setFreeMissing(false);
    setFreeItems((result.data ?? []) as FreeExercise[]);
  }, []);

  const refreshCounts = useCallback(async () => {
    const [s, c, ca, cr, st] = await Promise.all([
      supabase.from("subjects").select("id", { count: "exact", head: true }),
      supabase.from("chapters").select("id", { count: "exact", head: true }),
      supabase.from("capsules").select("id", { count: "exact", head: true }),
      supabase.from("cards").select("id", { count: "exact", head: true }),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "student")
    ]);
    const firstError = [s,c,ca,cr,st].find(x => x.error)?.error;
    if (firstError) throw firstError;
    setCounts({ subjects: s.count ?? 0, chapters: c.count ?? 0, capsules: ca.count ?? 0, cards: cr.count ?? 0, students: st.count ?? 0 });
  }, []);

  const reloadAll = useCallback(async () => {
    setBusy(true);
    try {
      await loadLevels();
      await loadBanners();
      await loadFree();
      await refreshCounts();
      setNotice("Synchronisation terminée avec Supabase.");
    } catch (e) { setNotice(`Synchronisation impossible : ${errorText(e)}`); }
    finally { setBusy(false); }
  }, [loadLevels, loadBanners, loadFree, refreshCounts]);

  const authorize = useCallback(async (nextSession: Session | null) => {
    setChecking(true);
    setAuthError("");
    if (!nextSession) { setSession(null); setChecking(false); return; }
    const { data, error } = await supabase.from("profiles").select("role").eq("id", nextSession.user.id).maybeSingle();
    if (error || data?.role !== "admin") {
      await supabase.auth.signOut();
      setSession(null);
      setAuthError(error ? `Vérification du rôle impossible : ${error.message}` : "Ce compte n'a pas le rôle administrateur KALYNO.");
      setChecking(false);
      return;
    }
    setSession(nextSession);
    setChecking(false);
  }, []);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => { if (mounted) void authorize(data.session); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => { if (mounted) void authorize(next); });
    return () => { mounted = false; listener.subscription.unsubscribe(); };
  }, [authorize]);

  useEffect(() => { if (session) void reloadAll(); }, [session, reloadAll]);
  const refreshPendingReports = useCallback(async () => {
    const { count, error } = await supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "PENDING");
    if (!error) setPendingReports(count ?? 0);
  }, []);
  useEffect(() => { if (session) void refreshPendingReports(); }, [session, section, refreshPendingReports]);

  /** Ouvre l’élément signalé : le chapitre (leçon ou exercice du Dojo) ou le premier défi. */
  const openReportSource = useCallback(async (ref: ReportSourceRef) => {
    if (isWelcomeReport(ref)) { setSection("firstchallenge"); return; }
    if (!ref.source_id) return;
    try {
      let chapter = ref.source_id;
      if (ref.source_type === "EXERCISE") {
        const card = await supabase.from("cards").select("chapter_id").eq("id", ref.source_id).maybeSingle();
        if (card.error) throw card.error;
        if (!card.data) { setNotice("Échec : cet exercice n’existe plus dans le catalogue (carte supprimée ou renumérotée)."); return; }
        chapter = (card.data as { chapter_id: string }).chapter_id;
      }
      const ch = await supabase.from("chapters").select("id,subject_id").eq("id", chapter).maybeSingle();
      if (ch.error) throw ch.error;
      if (!ch.data) { setNotice("Échec : cette leçon n’existe plus dans le catalogue."); return; }
      const sub = await supabase.from("subjects").select("id,level_id").eq("id", (ch.data as { subject_id: string }).subject_id).maybeSingle();
      if (sub.error) throw sub.error;
      if (!sub.data) { setNotice("Échec : la discipline de cet élément est introuvable."); return; }
      // Les chargeurs gardent la sélection si elle existe : classe, discipline et chapitre se posent d’un coup.
      setLevelId((sub.data as { level_id: string }).level_id);
      setSubjectId((sub.data as { id: string }).id);
      setChapterId((ch.data as { id: string }).id);
      setCourseView("lesson");
      setSection("courses");
    } catch (e) { setNotice(errorText(e)); }
  }, []);
  useEffect(() => { if (session && levelId) void loadContent(levelId).catch(e => setNotice(errorText(e))); }, [session, levelId, loadContent]);
  useEffect(() => { if (session) void loadChapters(subjectId).catch(e => setNotice(errorText(e))); }, [session, subjectId, loadChapters]);
  useEffect(() => { if (session) void loadLesson(chapterId).catch(e => setNotice(errorText(e))); }, [session, chapterId, loadLesson]);

  async function signIn(event: FormEvent) {
    event.preventDefault(); setBusy(true); setAuthError("");
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      await authorize(data.session);
    } catch (e) { setAuthError(errorText(e)); }
    finally { setBusy(false); }
  }
  async function signOut() { await supabase.auth.signOut(); setSession(null); }

  async function runAction(action: () => Promise<void>, success?: string) {
    setBusy(true); setNotice("");
    try { await action(); if (success) setNotice(success); await refreshCounts(); }
    catch (e) { setNotice(`Échec : ${errorText(e)}`); }
    finally { setBusy(false); }
  }

  // Enregistrement depuis la page de saisie : renvoie le message d'erreur (la page reste ouverte) ou null.
  async function save(action: () => Promise<void>, success: string): Promise<string | null> {
    setBusy(true); setNotice("");
    try { await action(); setNotice(success); await refreshCounts(); return null; }
    catch (e) { return errorText(e); }
    finally { setBusy(false); }
  }

  function createSubject() {
    if (!levelId) return;
    setEntry({
      eyebrow: "DISCIPLINE", title: "Nouvelle discipline", submitLabel: "Créer la discipline",
      intro: `Classe : ${currentLevel?.label ?? "—"}`,
      fields: [
        { kind: "text", key: "name", label: "Nom de la discipline", required: true, max: 60, placeholder: "Ex. : Mathématiques", preview: "title" },
        { kind: "select", key: "icon_key", label: "Icône", options: ICON_OPTIONS },
        { kind: "text", key: "coefficient", label: "Coefficient à l’examen", required: true, max: 5, placeholder: "Ex. : 4", help: "Plus il est élevé, plus les cartes de cette discipline passent en priorité dans les révisions de l’élève.", preview: "hidden" }
      ],
      initial: { name: "", icon_key: "book-open", coefficient: "1" },
      validate: coefProblem,
      onSubmit: v => save(async () => {
        const { error } = await supabase.from("subjects").insert({ level_id: levelId, name: str(v.name), emoji: "📘", icon_key: str(v.icon_key), coefficient: parseCoef(v.coefficient), position: subjects.length, is_active: true });
        if (error) throw error; await loadContent(levelId);
      }, "Discipline créée.")
    });
  }
  function editSubject(subject: Subject) {
    setEntry({
      eyebrow: "DISCIPLINE", title: "Modifier la discipline", submitLabel: "Enregistrer",
      fields: [
        { kind: "text", key: "name", label: "Nom de la discipline", required: true, max: 60, preview: "title" },
        { kind: "select", key: "icon_key", label: "Icône", options: ICON_OPTIONS },
        { kind: "text", key: "coefficient", label: "Coefficient à l’examen", required: true, max: 5, placeholder: "Ex. : 4", help: "Plus il est élevé, plus les cartes de cette discipline passent en priorité dans les révisions de l’élève.", preview: "hidden" }
      ],
      initial: { name: subject.name, icon_key: subject.icon_key && SUBJECT_ICONS.includes(subject.icon_key) ? subject.icon_key : "book-open", coefficient: formatCoef(subject.coefficient) },
      validate: coefProblem,
      onSubmit: v => save(async () => {
        const { error } = await supabase.from("subjects").update({ name: str(v.name), icon_key: str(v.icon_key), coefficient: parseCoef(v.coefficient) }).eq("id", subject.id);
        if (error) throw error; await loadContent(levelId);
      }, "Discipline mise à jour.")
    });
  }
  async function deleteSubject(subject: Subject) {
    if (!confirm(`Supprimer « ${subject.name} » et toutes ses leçons (séances, blocs, cartes) ?`)) return;
    await runAction(async () => {
      const { error } = await supabase.from("subjects").delete().eq("id", subject.id);
      if (error) throw error; setSubjectId(""); setCourseView("subjects"); await loadContent(levelId);
    }, "Discipline supprimée.");
  }
  function createChapter() {
    if (!subjectId) return;
    setEntry({
      eyebrow: "LEÇON", title: "Nouvelle leçon", submitLabel: "Créer la leçon",
      intro: `Discipline : ${currentSubject?.name ?? "—"}. La leçon est créée en brouillon : tu la publieras quand elle sera prête.`,
      fields: [
        { kind: "math", key: "title", label: "Titre de la leçon", required: true, single: true, placeholder: "Ex. : Équations du premier degré", preview: "title" },
        { kind: "text", key: "tag", label: "Smart Tag (facultatif)", max: 60, help: "Laisse vide s'il n'y en a pas." },
        COMPLEMENT_FIELD
      ],
      initial: { title: "", tag: "", complement: "" },
      onSubmit: v => save(async () => {
        const { data, error } = await supabase.from("chapters").insert({ subject_id: subjectId, title: str(v.title), tag: str(v.tag) || null, complement: str(v.complement) || null, position: chapters.length, status: "draft" }).select("id").single();
        if (error) throw error; await loadChapters(subjectId);
        // Parcours guidé : on arrive directement dans la leçon créée pour y ajouter son contenu
        if (data?.id) { setChapterId(data.id); setLessonTab("content"); setCourseView("lesson"); }
      }, "Leçon créée en brouillon : ajoute maintenant son contenu.")
    });
  }
  function editChapter(chapter: Chapter) {
    setEntry({
      eyebrow: "LEÇON", title: "Modifier la leçon", submitLabel: "Enregistrer",
      fields: [
        { kind: "math", key: "title", label: "Titre de la leçon", required: true, single: true, preview: "title" },
        { kind: "text", key: "tag", label: "Smart Tag (facultatif)", max: 60 },
        COMPLEMENT_FIELD
      ],
      initial: { title: chapter.title, tag: chapter.tag ?? "", complement: chapter.complement ?? "" },
      onSubmit: v => save(async () => {
        const { error } = await supabase.from("chapters").update({ title: str(v.title), tag: str(v.tag) || null, complement: str(v.complement) || null }).eq("id", chapter.id);
        if (error) throw error; await loadChapters(subjectId);
      }, "Leçon mise à jour.")
    });
  }
  async function toggleChapter(chapter: Chapter) {
    const status = chapter.status === "published" ? "draft" : "published";
    if (status === "published" && !confirm("Publier cette leçon ? Les élèves de la classe pourront la consulter.")) return;
    await runAction(async () => {
      const { error } = await supabase.from("chapters").update({ status }).eq("id", chapter.id);
      if (error) throw error; await loadChapters(subjectId);
    }, status === "published" ? "Leçon publiée pour les élèves." : "Leçon remise en brouillon.");
  }
  async function deleteChapter(chapter: Chapter) {
    if (!confirm(`Supprimer la leçon « ${chapter.title} » et tout son contenu (séances, blocs, cartes) ?`)) return;
    await runAction(async () => {
      const { error } = await supabase.from("chapters").delete().eq("id", chapter.id);
      if (error) throw error; setChapterId(""); setCourseView("lessons"); await loadChapters(subjectId);
    }, "Leçon supprimée.");
  }
  function createSession() {
    if (!chapterId) return;
    setEntry({
      eyebrow: "SÉANCE", title: "Nouvelle séance", submitLabel: "Créer la séance",
      intro: `Leçon : ${currentChapter?.title ?? "—"}`,
      fields: [
        { kind: "math", key: "title", label: "Intitulé de la séance", required: true, single: true, placeholder: "Ex. : Présentation de l'auteur et contexte de l'œuvre", preview: "title",
          help: "La séance est créée masquée : les élèves ne la voient qu'après publication. Le numéro (Séance 1, Séance 2…) est ajouté automatiquement selon l'ordre. En littérature africaine : présentation de l'auteur, lecture d'un extrait, étude des thèmes, expression écrite…" }
      ],
      initial: { title: "" },
      onSubmit: v => save(async () => {
        const { error } = await supabase.from("lesson_sessions").insert({ chapter_id: chapterId, title: str(v.title), position: sessions.length, is_available: false });
        if (error) throw error; await loadLesson(chapterId);
      }, "Séance créée.")
    });
  }
  function editSession(session: LessonSession) {
    setEntry({
      eyebrow: "SÉANCE", title: "Modifier la séance", submitLabel: "Enregistrer",
      fields: [{ kind: "math", key: "title", label: "Intitulé de la séance", required: true, single: true, preview: "title" }],
      initial: { title: session.title },
      onSubmit: v => save(async () => {
        const { error } = await supabase.from("lesson_sessions").update({ title: str(v.title) }).eq("id", session.id);
        if (error) throw error; await loadLesson(chapterId);
      }, "Séance mise à jour.")
    });
  }
  async function moveSession(session: LessonSession, direction: -1 | 1) {
    const from = sessions.findIndex(x => x.id === session.id);
    const to = from + direction;
    if (from < 0 || to < 0 || to >= sessions.length) return;
    const order = [...sessions];
    order.splice(to, 0, order.splice(from, 1)[0]);
    await runAction(async () => {
      const results = await Promise.all(order.map((s, index) => supabase.from("lesson_sessions").update({ position: index }).eq("id", s.id)));
      const failed = results.find(r => r.error);
      if (failed?.error) throw failed.error;
      await loadLesson(chapterId);
    }, "Ordre des séances mis à jour.");
  }
  async function deleteSession(session: LessonSession) {
    if (!confirm(`Supprimer la séance « ${session.title} » ? Ses blocs sont conservés, sans séance.`)) return;
    await runAction(async () => {
      const { error } = await supabase.from("lesson_sessions").delete().eq("id", session.id);
      if (error) throw error;
      if (openSessionId === session.id) { setSessionView("sessions"); setOpenSessionId(""); }
      await loadLesson(chapterId);
    }, "Séance supprimée.");
  }
  async function toggleSessionAvailability(session: LessonSession) {
    const next = !session.is_available;
    if (next && !confirm(`Publier « ${session.title} » ? Les élèves pourront la consulter.`)) return;
    await runAction(async () => {
      const { data, error } = await supabase.from("lesson_sessions").update({ is_available: next }).eq("id", session.id).select("id,is_available").single();
      if (error) throw error;
      if (!data || data.is_available !== next) throw new Error("Le changement de disponibilité n'a pas été confirmé par Supabase.");
      await loadLesson(chapterId);
    }, next ? "Séance publiée pour les élèves." : "Séance masquée aux élèves (son contenu est conservé).");
  }
  async function assignCapsule(capsule: Capsule, sessionId: string) {
    if (!confirm(sessionId ? "Déplacer ce bloc vers la séance choisie ?" : "Retirer ce bloc de sa séance ? Il ira dans « Blocs non affectés ».")) return;
    await runAction(async () => {
      const { error } = await supabase.from("capsules").update({ session_id: sessionId || null }).eq("id", capsule.id);
      if (error) throw error; await loadLesson(chapterId);
    }, sessionId ? "Bloc rattaché à la séance." : "Bloc retiré de la séance.");
  }
  function createCapsule() {
    if (!chapterId) return;
    setCapsuleEditor({ capsule: null });
  }

  function editCapsule(capsule: Capsule) {
    setCapsuleEditor({ capsule });
  }

  async function saveCapsule(draft: CapsuleEditorDraft) {
    if (!chapterId) return;
    setBusy(true);
    setNotice("");
    try {
      if (capsuleEditor?.capsule) {
        const { error } = await supabase.from("capsules").update({
          title: draft.title,
          body: draft.body,
          kind: draft.kind,
          minutes: draft.minutes,
          is_high_yield: draft.is_high_yield
        }).eq("id", capsuleEditor.capsule.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("capsules").insert({
          chapter_id: chapterId,
          title: draft.title,
          body: draft.body,
          kind: draft.kind,
          minutes: draft.minutes,
          is_high_yield: draft.is_high_yield,
          position: capsules.length,
          ...(sessionView !== "sessions" && openSessionId && openSessionId !== UNASSIGNED ? { session_id: openSessionId } : {})
        });
        if (error) throw error;
      }
      await loadLesson(chapterId);
      await refreshCounts();
      setCapsuleEditor(null);
      setNotice(capsuleEditor?.capsule ? "Bloc pédagogique mis à jour." : "Bloc pédagogique créé.");
    } catch (e) {
      setNotice(`Échec de l’enregistrement : ${errorText(e)}`);
    } finally {
      setBusy(false);
    }
  }
  async function deleteCapsule(capsule: Capsule) {
    if (!confirm(`Supprimer le bloc « ${capsule.title} » ? Les cartes associées seront conservées sans bloc.`)) return;
    await runAction(async () => {
      const { error } = await supabase.from("capsules").delete().eq("id", capsule.id);
      if (error) throw error; await loadLesson(chapterId);
    }, "Bloc supprimé.");
  }
  function createCard() {
    if (!chapterId) return;
    const capsule_id = capsules[0]?.id ?? null;
    setEntry({
      eyebrow: "CARTE · DOJO", title: "Nouvelle carte", submitLabel: "Créer la carte",
      intro: "Les formules LaTeX s'écrivent entre $ … $ (Alt+M). L'élève les voit rendues dans l'app.",
      fields: cardFields(true, 4),
      initial: { kind: "qcm", front: "", choices: ["", "", "", ""], correct: "0", back: "", table_statement: "", table_grid: draftToValue(newTableDraft()), ...explanationValues(null) },
      onSubmit: v => save(async () => {
        const kind = str(v.kind);
        const isQcm = kind === "qcm";
        if (kind === TABLE_KIND && tableColumnsMissing) throw new Error(TABLE_MIGRATION_MESSAGE);
        const { error } = await supabase.from("cards").insert({
          chapter_id: chapterId, capsule_id, kind, explanation: explanationFrom(v) || null, position: cards.length,
          ...(kind === TABLE_KIND ? tableColumns(v) : {
            front: str(v.front), back: str(v.back) || null,
            choices: isQcm ? strings(v.choices, 4).map(x => x.trim()) : null, correct_index: isQcm ? Number(str(v.correct)) : null
          })
        });
        if (error) throw error; await loadLesson(chapterId);
      }, "Carte créée.")
    });
  }
  function editCard(card: Card) {
    const count = Math.max(4, card.choices?.length ?? 4);
    setEntry({
      eyebrow: "CARTE · DOJO", title: "Modifier la carte", submitLabel: "Enregistrer",
      intro: card.kind === TABLE_KIND ? tableIntro(card) : `Type : ${card.kind.toUpperCase()}`,
      fields: cardFields(false, count),
      initial: { kind: card.kind, front: card.front, choices: strings(card.choices ?? [], count), correct: String(card.correct_index ?? 0), back: card.back ?? "", ...tableInitial(card), ...explanationValues(card.explanation) },
      onSubmit: v => save(async () => {
        const isQcm = card.kind === "qcm";
        if (card.kind === TABLE_KIND && tableColumnsMissing) throw new Error(TABLE_MIGRATION_MESSAGE);
        const { error } = await supabase.from("cards").update(card.kind === TABLE_KIND
          ? { ...tableColumns(v), explanation: explanationFrom(v) || null }
          : {
            front: str(v.front), back: str(v.back) || null, explanation: explanationFrom(v) || null,
            ...(isQcm ? { choices: strings(v.choices, count).map(x => x.trim()), correct_index: Number(str(v.correct)) } : {})
          }).eq("id", card.id);
        if (error) throw error; await loadLesson(chapterId);
      }, "Carte mise à jour.")
    });
  }
  async function deleteCard(card: Card) {
    if (!confirm("Supprimer cette carte ?")) return;
    await runAction(async () => {
      const { error } = await supabase.from("cards").delete().eq("id", card.id);
      if (error) throw error; await loadLesson(chapterId);
    }, "Carte supprimée.");
  }
  function createBanner() {
    setEntry(bannerSpec(null));
  }
  function editBanner(banner: Banner) {
    setEntry(bannerSpec(banner));
  }
  function bannerSpec(banner: Banner | null): EntrySpec {
    const chapterOptions = [{ value: "", label: "Aucune destination" }, ...chapters.map(c => ({ value: c.id, label: c.title }))];
    if (banner?.chapter_id && !chapterOptions.some(o => o.value === banner.chapter_id)) chapterOptions.push({ value: banner.chapter_id, label: "Leçon déjà associée" });
    const levelOptions = [{ value: "", label: "Toutes les classes" }, ...activeLevels.map(l => ({ value: l.id, label: l.label }))];
    if (banner?.level_id && !levelOptions.some(o => o.value === banner.level_id)) levelOptions.push({ value: banner.level_id, label: `${levels.find(l => l.id === banner.level_id)?.label ?? banner.level_id} (désactivée)` });
    return {
      eyebrow: "BANNIÈRE EXPLORER", title: banner ? "Modifier la bannière" : "Nouvelle bannière", submitLabel: banner ? "Enregistrer" : "Créer la bannière",
      intro: banner ? undefined : "La bannière est créée en brouillon : active-la quand elle est prête.",
      fields: [
        { kind: "text", key: "title", label: "Titre de la bannière", required: true, max: 80, preview: "title" },
        { kind: "text", key: "subtitle", label: "Sous-titre (facultatif)", max: 140 },
        { kind: "text", key: "button_label", label: "Texte du bouton (facultatif)", max: 30 },
        { kind: "select", key: "level_id", label: "Classe cible", options: levelOptions },
        { kind: "select", key: "chapter_id", label: "Leçon à ouvrir", options: chapterOptions, help: "Seules les leçons de la discipline sélectionnée sont proposées." }
      ],
      initial: banner
        ? { title: banner.title, subtitle: banner.subtitle ?? "", button_label: banner.button_label ?? "", level_id: banner.level_id ?? "", chapter_id: banner.chapter_id ?? "" }
        : { title: "", subtitle: "", button_label: "Découvrir", level_id: levelId, chapter_id: chapterId },
      onSubmit: v => save(async () => {
        const values = { title: str(v.title), subtitle: str(v.subtitle) || null, button_label: str(v.button_label) || null, level_id: str(v.level_id) || null, chapter_id: str(v.chapter_id) || null };
        const { error } = banner
          ? await supabase.from("explorer_banners").update({ ...values, updated_at: new Date().toISOString() }).eq("id", banner.id)
          : await supabase.from("explorer_banners").insert({ ...values, position: banners.length, is_active: false });
        if (error) throw error; await loadBanners();
      }, banner ? "Bannière mise à jour." : "Bannière enregistrée en brouillon.")
    };
  }
  async function toggleBanner(banner: Banner) {
    await runAction(async () => {
      const { error } = await supabase.from("explorer_banners").update({ is_active: !banner.is_active, updated_at: new Date().toISOString() }).eq("id", banner.id);
      if (error) throw error; await loadBanners();
    }, banner.is_active ? "Bannière désactivée." : "Bannière activée dans Explorer.");
  }
  async function deleteBanner(banner: Banner) {
    if (!confirm(`Supprimer la bannière « ${banner.title} » ?`)) return;
    await runAction(async () => {
      const { error } = await supabase.from("explorer_banners").delete().eq("id", banner.id);
      if (error) throw error; await loadBanners();
    }, "Bannière supprimée.");
  }

  const freeShown = useMemo(() => freeItems.filter(x => x.level_id === null || x.level_id === levelId), [freeItems, levelId]);

  // Champs d'un exercice libre : classe cible + étiquette, puis les mêmes champs qu'une carte de leçon
  const freeFields = (withKind: boolean, count: number, current: FreeExercise | null): FieldDef[] => {
    const levelOptions = [{ value: "", label: "Toutes les classes" }, ...activeLevels.map(l => ({ value: l.id, label: l.label }))];
    if (current?.level_id && !levelOptions.some(o => o.value === current.level_id)) levelOptions.push({ value: current.level_id, label: `${levels.find(l => l.id === current.level_id)?.label ?? current.level_id} (désactivée)` });
    return [
      { kind: "select", key: "level_id", label: "Classe cible", options: levelOptions },
      { kind: "text", key: "label", label: "Étiquette (facultatif)", max: 60, placeholder: "Ex. : Calcul mental, Grammaire…", help: "Un repère libre, affiché à l'élève comme intitulé de l'exercice." },
      ...cardFields(withKind, count)
    ];
  };
  function createFree() {
    setEntry({
      eyebrow: "EXERCICE LIBRE", title: "Nouvel exercice libre", submitLabel: "Créer l’exercice",
      intro: "Un exercice libre ne dépend d'aucun cours. Il est créé en brouillon : tu le publieras quand il sera prêt. Les formules LaTeX s'écrivent entre $ … $ (Alt+M).",
      fields: freeFields(true, 4, null),
      initial: { level_id: levelId, label: "", kind: "qcm", front: "", choices: ["", "", "", ""], correct: "0", back: "", table_statement: "", table_grid: draftToValue(newTableDraft()), ...explanationValues(null) },
      onSubmit: v => save(async () => {
        const kind = str(v.kind);
        const isQcm = kind === "qcm";
        if (kind === TABLE_KIND && tableColumnsMissing) throw new Error(TABLE_MIGRATION_MESSAGE);
        const { error } = await supabase.from("free_exercises").insert({
          level_id: str(v.level_id) || null, label: str(v.label) || null, kind,
          explanation: explanationFrom(v) || null, position: freeItems.length, is_published: false,
          ...(kind === TABLE_KIND ? tableColumns(v) : {
            front: str(v.front), back: str(v.back) || null,
            choices: isQcm ? strings(v.choices, 4).map(x => x.trim()) : null, correct_index: isQcm ? Number(str(v.correct)) : null
          })
        });
        if (error) throw error; await loadFree();
      }, "Exercice libre créé en brouillon.")
    });
  }
  function editFree(item: FreeExercise) {
    const count = Math.max(4, item.choices?.length ?? 4);
    setEntry({
      eyebrow: "EXERCICE LIBRE", title: "Modifier l’exercice libre", submitLabel: "Enregistrer",
      intro: item.kind === TABLE_KIND ? tableIntro(item) : `Type : ${item.kind.toUpperCase()}`,
      fields: freeFields(false, count, item),
      initial: { level_id: item.level_id ?? "", label: item.label ?? "", kind: item.kind, front: item.front, choices: strings(item.choices ?? [], count), correct: String(item.correct_index ?? 0), back: item.back ?? "", ...tableInitial(item), ...explanationValues(item.explanation) },
      onSubmit: v => save(async () => {
        const isQcm = item.kind === "qcm";
        if (item.kind === TABLE_KIND && tableColumnsMissing) throw new Error(TABLE_MIGRATION_MESSAGE);
        const { error } = await supabase.from("free_exercises").update({
          level_id: str(v.level_id) || null, label: str(v.label) || null, explanation: explanationFrom(v) || null,
          ...(item.kind === TABLE_KIND ? tableColumns(v) : {
            front: str(v.front), back: str(v.back) || null,
            ...(isQcm ? { choices: strings(v.choices, count).map(x => x.trim()), correct_index: Number(str(v.correct)) } : {})
          })
        }).eq("id", item.id);
        if (error) throw error; await loadFree();
      }, "Exercice libre mis à jour.")
    });
  }
  async function toggleFree(item: FreeExercise) {
    const publish = !item.is_published;
    if (publish && !confirm("Publier cet exercice libre ? Il apparaîtra dans le Dojo des élèves concernés.")) return;
    await runAction(async () => {
      const { error } = await supabase.from("free_exercises").update({ is_published: publish }).eq("id", item.id);
      if (error) throw error; await loadFree();
    }, publish ? "Exercice publié." : "Exercice remis en brouillon.");
  }
  async function deleteFree(item: FreeExercise) {
    if (!confirm("Supprimer cet exercice libre ?")) return;
    await runAction(async () => {
      const { error } = await supabase.from("free_exercises").delete().eq("id", item.id);
      if (error) throw error; await loadFree();
    }, "Exercice libre supprimé.");
  }

  const visibleChapters = useMemo(() => chapters.filter(x => `${x.title} ${x.tag ?? ""}`.toLowerCase().includes(searchText.toLowerCase())), [chapters, searchText]);

  if (checking) return <div className="loading-screen"><div className="brand-mark">K</div><p>Connexion sécurisée à Supabase…</p></div>;

  if (!session) return (
    <main className="login-shell">
      <div className="login-art">
        <div className="brand-lockup"><div className="brand-mark">K</div><div><strong>KALYNO</strong><span>ESPACE ADMINISTRATION</span></div></div>
        <div className="login-message">
          <div className="eyebrow"><Sparkles size={15}/> PILOTAGE PÉDAGOGIQUE</div>
          <h1>Les bons contenus.<br/><em>Au bon moment.</em></h1>
          <p>Publie les leçons, les exercices et les défis qui apparaîtront dans l’espace élève KALYNO.</p>
          <div className="login-proof"><ShieldCheck size={18}/> Accès réservé aux comptes administrateurs autorisés</div>
        </div>
        <div className="login-art-footer">KALYNO · Apprendre, comprendre, progresser.</div>
      </div>
      <form className="login-card" onSubmit={signIn}>
        <div className="mobile-brand"><div className="brand-mark">K</div><strong>KALYNO</strong></div>
        <span className="eyebrow">BON RETOUR</span><h2>Connexion admin</h2><p className="muted">Utilise le compte déjà autorisé dans Supabase.</p>
        <label>Adresse e-mail<input autoComplete="username" type="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="admin@exemple.ci"/></label>
        <label>Mot de passe<input autoComplete="current-password" type="password" value={password} onChange={e=>setPassword(e.target.value)} required placeholder="Ton mot de passe"/></label>
        {authError && <div className="error-box"><AlertCircle size={17}/>{authError}</div>}
        <button className="primary wide" disabled={busy}>{busy ? "Connexion…" : "Se connecter"} <span>→</span></button>
        <div className="login-foot"><ShieldCheck size={15}/> Authentification Supabase · rôle vérifié côté base</div>
      </form>
    </main>
  );

  const nav = [
    { id: "overview" as Section, label: "Vue générale", icon: LayoutDashboard },
    { id: "levels" as Section, label: "Classes & séries", icon: GraduationCap },
    { id: "courses" as Section, label: "Cours & leçons", icon: BookOpen },
    { id: "frenchstudio" as Section, label: "Studio français · Concours", icon: BookOpen },
    { id: "platformapi" as Section, label: "Platform API · Console", icon: Cloud },
    { id: "freeexercises" as Section, label: "Exercices libres", icon: Dumbbell },
    { id: "themes" as Section, label: "Thèmes · Organisation", icon: ArrowDownUp },
    { id: "banners" as Section, label: "Explorer · À la une", icon: Sparkles },
    { id: "motivation" as Section, label: "Accueil · Examens & citations", icon: Activity },
    { id: "firstchallenge" as Section, label: "Premier défi · Onboarding", icon: Rocket },
    { id: "semantic" as Section, label: "Évaluation · Seuils", icon: SlidersHorizontal },
    { id: "aiusage" as Section, label: "Consommation IA", icon: Activity },
    { id: "generation" as Section, label: "Génération IA", icon: Sparkles },
    { id: "pushes" as Section, label: "Notifications push", icon: Bell },
    { id: "errors" as Section, label: "Erreurs & journaux", icon: AlertCircle },
    { id: "reports" as Section, label: "Signalements élèves", icon: Flag },
    { id: "faq" as Section, label: "Centre d’aide · FAQ", icon: CircleHelp },
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup side-brand"><div className="brand-mark">K</div><div><strong>KALYNO</strong><span>ESPACE ADMIN</span></div></div>
        <div className="side-label">ESPACE DE TRAVAIL</div>
        <nav>{nav.map(item => {
          const Icon = item.icon;
          return <button key={item.id} className={`nav-item ${section===item.id?"active":""}`} onClick={()=>setSection(item.id)}><Icon size={18}/><span>{item.label}</span>{item.id==="reports"&&pendingReports>0&&<span className="nav-badge">{pendingReports}</span>}{section===item.id&&<span className="nav-active-dot"/>}</button>;
        })}</nav>
        <div className="sidebar-bottom">
          <div className="connection-card"><span className="online-dot"/><div><strong>Supabase connecté</strong><small>Backend KALYNO</small></div></div>
          <button className="nav-item logout" onClick={signOut}><LogOut size={18}/><span>Déconnexion</span></button>
          <div className="sidebar-version">KALYNO ADMIN · 1.0.0</div>
        </div>
      </aside>
      <main className="main-area">
        <header className="topbar">
          <div><div className="breadcrumb">KALYNO <span>/</span> {nav.find(x=>x.id===section)?.label}</div><h1>{nav.find(x=>x.id===section)?.label}</h1></div>
          <div className="top-actions">
            <div className="admin-avatar">{session.user.email?.slice(0,1).toUpperCase() ?? "A"}</div>
            <div className="admin-identity"><strong>Administrateur</strong><small>{session.user.email}</small></div>
            <button className="icon-button" title="Synchroniser" onClick={()=>void reloadAll()} disabled={busy}><RefreshCw size={17}/></button>
          </div>
        </header>
        {notice && <div className={`notice ${notice.startsWith("Échec")||notice.includes("impossible")?"notice-error":""}`}><span>{notice}</span><button onClick={()=>setNotice("")} aria-label="Fermer"><X size={15}/></button></div>}

        <div className="content-wrap">
          {section === "overview" && <section className="page">
            <div className="welcome-row"><div><div className="eyebrow">CENTRE DE CONTRÔLE</div><h2>Bonjour, bienvenue dans KALYNO.</h2><p>Les données affichées proviennent directement de la base Supabase connectée à l’application élève.</p></div><div className="sync-pill"><span className="online-dot"/> Données en direct</div></div>
            <div className="stat-grid">
              <Stat icon={<GraduationCap/>} label="Élèves inscrits" value={counts.students} tone="blue" detail="Profils étudiants"/>
              <Stat icon={<BookOpen/>} label="Disciplines" value={counts.subjects} tone="violet" detail="Toutes classes"/>
              <Stat icon={<FileText/>} label="Leçons" value={counts.chapters} tone="green" detail="Brouillons et publiés"/>
              <Stat icon={<ClipboardList/>} label="Blocs pédagogiques" value={counts.capsules} tone="amber" detail="Contenus de leçon"/>
              <Stat icon={<CircleHelp/>} label="Cartes & exercices" value={counts.cards} tone="rose" detail="QCM, cartes, clozes"/>
            </div>
            <div className="section-heading"><div><h3>Accès rapides</h3><p>Gère les contenus réellement consommés par les élèves.</p></div></div>
            <div className="quick-grid">
              <button className="quick-card" onClick={()=>setSection("courses")}><div className="quick-icon blue"><BookOpen/></div><strong>Gérer les cours</strong><span>Disciplines, leçons, séances et exercices</span><b>Ouvrir <span>→</span></b></button>
              <button className="quick-card" onClick={()=>setSection("freeexercises")}><div className="quick-icon green"><Dumbbell/></div><strong>Exercices libres</strong><span>Des exercices sans cours, pour le Dojo</span><b>Ouvrir <span>→</span></b></button>
              <button className="quick-card" onClick={()=>setSection("banners")}><div className="quick-icon violet"><Sparkles/></div><strong>Mettre à la une</strong><span>Publier une bannière dans Explorer</span><b>Ouvrir <span>→</span></b></button>
            </div>
            <div className="info-banner"><div className="info-symbol"><Cloud size={21}/></div><div><strong>Une seule source de vérité</strong><p>Les cours et défis publiés ici sont lus par l’application Android via les politiques RLS de Supabase. Les brouillons restent réservés à l’administration.</p></div><ShieldCheck className="info-check" size={22}/></div>
          </section>}

          {section === "frenchstudio" && <FrenchConcoursStudio />}
          {section === "platformapi" && <PlatformApiManager />}
          {section === "semantic" && <SemanticSettingsManager busy={busy} onNotice={setNotice}/>}
          {section === "aiusage" && <AiUsageManager />}
          {section === "generation" && <GenerationManager onOpenLogs={() => setSection("errors")} />}
          {section === "pushes" && <PushDeliveryManager />}
          {section === "errors" && <GenerationErrorsManager />}

          {section === "reports" && <section className="page">
            <div className="page-intro"><div><div className="eyebrow">QUALITÉ DU CONTENU</div><h2>Signalements des élèves</h2><p>Les erreurs signalées dans l’application arrivent ici, même celles envoyées hors ligne. Prends-les en charge, corrige le contenu, puis clôture.</p></div></div>
            <ReportsManager busy={busy} onNotice={setNotice} onChanged={refreshPendingReports} onOpenSource={ref=>void openReportSource(ref)}/>
          </section>}

          {section === "faq" && <section className="page">
            <div className="page-intro"><div><div className="eyebrow">AIDE DE L’APPLICATION</div><h2>Centre d’aide & FAQ</h2><p>Les questions et réponses affichées dans Profil › Centre d’aide & FAQ. Tout ce que tu écris ici arrive sur le téléphone des élèves, sans mise à jour de l’app.</p></div></div>
            <FaqManager busy={busy} onNotice={setNotice}/>
          </section>}

          {section === "levels" && <section className="page">
            <div className="page-intro"><div><div className="eyebrow">CATALOGUE OFFICIEL</div><h2>Classes et séries</h2><p>La liste active publiée ici est celle que l’application Android récupère depuis Supabase. Les identifiants sont conservés pour protéger les relations avec les contenus.</p></div><button className="secondary" onClick={()=>void reloadAll()}><RefreshCw size={16}/> Actualiser</button></div>
            <LevelsManager levels={levels} busy={busy} onRefresh={reloadAll} onNotice={setNotice}/>
          </section>}

          {section === "motivation" && <section className="page">
            <div className="page-intro"><div><div className="eyebrow">ACCUEIL DE L’APPLICATION</div><h2>Examens et citations</h2><p>La date d’examen alimente le compte à rebours de l’accueil élève ; la citation du jour tourne chaque jour parmi les citations actives.</p></div></div>
            <MotivationManager levels={activeLevels} catalog={levels} busy={busy} onNotice={setNotice}/>
          </section>}

          {section === "themes" && <section className="page">
            <div className="page-intro"><div><div className="eyebrow">ORGANISATION DES LEÇONS</div><h2>Thèmes d’une discipline</h2><p>Regroupe les leçons d’une discipline en thèmes. L’élève les voit dans l’Explorer, dans l’ordre des positions.</p></div></div>
            <div className="selector-row">
              <label>Classe<select value={levelId} onChange={e=>setLevelId(e.target.value)}>{activeLevels.map(x=><option key={x.id} value={x.id}>{x.label}</option>)}</select></label>
              <label>Discipline<select value={subjectId} onChange={e=>setSubjectId(e.target.value)}><option value="">Choisir une discipline</option>{subjects.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
            </div>
            <ThemesManager subjectId={subjectId} busy={busy} onNotice={setNotice}/>
          </section>}

          {section === "courses" && <section className="page">
            <nav className="crumbs" aria-label="Parcours de création">
              <button className={`crumb ${courseView==="subjects"?"current":""}`} onClick={()=>setCourseView("subjects")}>{currentLevel?.label ?? "Classe"}</button>
              {courseView!=="subjects" && currentSubject && <><span className="crumb-sep">›</span><button className={`crumb ${courseView==="lessons"?"current":""}`} onClick={()=>setCourseView("lessons")}>{currentSubject.name}</button></>}
              {courseView==="lesson" && currentChapter && <><span className="crumb-sep">›</span><span className="crumb current"><MathHtml text={currentChapter.title}/></span></>}
            </nav>

            {courseView==="subjects" && <>
              <div className="page-intro"><div><div className="eyebrow">ÉTAPE 1 SUR 3 · DISCIPLINES</div><h2>Choisis une discipline</h2><p>Le parcours est toujours le même : classe, discipline, puis leçon. Ouvre une discipline pour gérer ses leçons.</p></div><button className="primary" disabled={!levelId} onClick={()=>void createSubject()}><Plus size={16}/> Nouvelle discipline</button></div>
              {activeLevels.length>1 && <div className="selector-row single"><label>Classe<select value={levelId} onChange={e=>setLevelId(e.target.value)}>{activeLevels.map(x=><option key={x.id} value={x.id}>{x.label}</option>)}</select></label></div>}
              <div className="panel">
                {subjects.length===0?<Empty text="Aucune discipline pour cette classe. Crée la première avec « Nouvelle discipline »."/>:<div className="item-list">{subjects.map(subject=><div key={subject.id} className="subject-row"><button className="subject-select" onClick={()=>{setSubjectId(subject.id);setCourseView("lessons");}}><span className="subject-emoji"><BookOpen size={17}/></span><span><strong>{subject.name}</strong><small>Coefficient {formatCoef(subject.coefficient)}</small></span></button><div className="row-actions"><button title="Ouvrir les leçons" onClick={()=>{setSubjectId(subject.id);setCourseView("lessons");}}>→</button><button title="Modifier" onClick={()=>void editSubject(subject)}>✎</button><button title="Supprimer" onClick={()=>void deleteSubject(subject)}><Trash2 size={14}/></button></div></div>)}</div>}
              </div>
            </>}

            {courseView==="lessons" && <>
              <div className="page-intro"><div><div className="eyebrow">ÉTAPE 2 SUR 3 · LEÇONS</div><h2>{currentSubject?.name ?? "Discipline"}</h2><p>Ouvre une leçon pour y ajouter des séances, des blocs de cours et des exercices. Une leçon reste en brouillon tant que tu ne la publies pas.</p></div><div className="panel-actions"><button className="secondary" onClick={()=>setCourseView("subjects")}>← Disciplines</button><button className="secondary" onClick={()=>setSection("themes")}>Organiser en thèmes</button><button className="primary" disabled={!subjectId} onClick={()=>void createChapter()}><Plus size={16}/> Nouvelle leçon</button></div></div>
              <div className="panel">
                <div className="list-search"><Search size={16}/><input value={searchText} onChange={e=>setSearchText(e.target.value)} placeholder="Rechercher une leçon…"/></div>
                {chapters.length===0?<Empty text="Aucune leçon. Crée la première avec « Nouvelle leçon »."/>:visibleChapters.length===0?<Empty text="Aucune leçon ne correspond à la recherche."/>:<div className="item-list">{visibleChapters.map(chapter=><div key={chapter.id} className="chapter-row"><button className="chapter-select" onClick={()=>{setChapterId(chapter.id);setLessonTab("content");setCourseView("lesson");}}><span className="chapter-number">{String(chapters.findIndex(c=>c.id===chapter.id)+1).padStart(2,"0")}</span><span className="chapter-title"><strong><MathHtml text={chapter.title}/></strong><small>{chapter.tag||"Sans Smart Tag"}</small></span><Status status={chapter.status}/></button><div className="row-actions"><button title="Modifier les infos" onClick={()=>void editChapter(chapter)}>✎</button><button title={chapter.status==="published"?"Dépublier":"Publier"} onClick={()=>void toggleChapter(chapter)}>{chapter.status==="published"?<X size={14}/>:<Check size={14}/>}</button><button title="Supprimer" onClick={()=>void deleteChapter(chapter)}><Trash2 size={14}/></button></div></div>)}</div>}
              </div>
            </>}

            {courseView==="lesson" && (!currentChapter ? <div className="panel"><Empty text="Leçon introuvable. Reviens à la liste des leçons."/></div> : <>
              <div className="page-intro"><div><div className="eyebrow">ÉTAPE 3 SUR 3 · LEÇON</div><h2><MathHtml text={currentChapter.title}/></h2><p><Status status={currentChapter.status}/>{currentChapter.tag?` · ${currentChapter.tag}`:""}</p></div><div className="panel-actions"><button className="secondary" onClick={()=>setCourseView("lessons")}>← Leçons</button><button className="secondary" onClick={()=>editChapter(currentChapter)}>Modifier les infos</button><button className={currentChapter.status==="published"?"secondary":"primary"} onClick={()=>void toggleChapter(currentChapter)}>{currentChapter.status==="published"?"Dépublier":"Publier la leçon"}</button></div></div>
              <div className="panel lesson-panel">
                <div className="tabs" role="tablist">
                  <button role="tab" aria-selected={lessonTab==="content"} className={`tab ${lessonTab==="content"?"active":""}`} onClick={()=>setLessonTab("content")}>Contenu du cours <span>{capsules.length}</span></button>
                  <button role="tab" aria-selected={lessonTab==="exercises"} className={`tab ${lessonTab==="exercises"?"active":""}`} onClick={()=>setLessonTab("exercises")}>Exercices <span>{cards.length}</span></button>
                </div>
                {lessonTab==="content" && <>
                {sessionView!=="sessions" && <nav className="crumbs session-crumbs" aria-label="Fil de navigation">
                  <button className="crumb" onClick={()=>{setSessionView("sessions");setPreviewId("");}}>Séances</button><span className="crumb-sep"><ChevronRight size={12}/></span>
                  {sessionView==="blocks" ? <span className="crumb current">{scopeLabel}</span> : <><button className="crumb" onClick={()=>setSessionView("blocks")}>{scopeLabel}</button><span className="crumb-sep"><ChevronRight size={12}/></span><span className="crumb current">Bloc {previewCapsule ? scopeCapsules.findIndex(c=>c.id===previewCapsule.id)+1 : ""}</span></>}
                </nav>}

                {sessionView==="sessions" && <>
                  <div className="content-subhead"><h4>Séances <span>{sessions.length}</span></h4><div className="panel-actions"><small>Ouvre une séance pour voir ses blocs. Une nouvelle séance est masquée aux élèves tant qu’elle n’est pas publiée.</small><button className="small-primary" disabled={busy} onClick={()=>void createSession()}><Plus size={15}/> Séance</button></div></div>
                  {sessions.length===0 && unassignedCount===0 ? <Empty text="Aucune séance et aucun bloc. Crée une séance, puis ajoute ses blocs."/> : <div className="item-list">
                    {sessions.map((session,i)=><div key={session.id} className="chapter-row session-row">
                      <button className="chapter-select" onClick={()=>{setOpenSessionId(session.id);setSessionView("blocks");}}>
                        <span className="chapter-number">{i+1}</span>
                        <span className="chapter-title"><strong><MathHtml text={session.title}/></strong><small>Séance {i+1} · position {session.position+1} · {capsules.filter(c=>c.session_id===session.id).length} bloc(s)</small></span>
                        <span className={`status-pill ${session.is_available?"published":"draft"}`}><span/>{session.is_available?"Disponible":"Masquée"}</span>
                      </button>
                      <div className="row-actions">
                        <button title="Ouvrir la séance" onClick={()=>{setOpenSessionId(session.id);setSessionView("blocks");}}><ChevronRight size={14}/></button>
                        <button title={session.is_available?"Masquer aux élèves":"Publier pour les élèves"} disabled={busy} onClick={()=>void toggleSessionAvailability(session)}>{session.is_available?<EyeOff size={14}/>:<Eye size={14}/>}</button>
                        <button title="Monter" disabled={busy||i===0} onClick={()=>void moveSession(session,-1)}><ArrowUp size={14}/></button>
                        <button title="Descendre" disabled={busy||i===sessions.length-1} onClick={()=>void moveSession(session,1)}><ArrowDown size={14}/></button>
                        <button title="Renommer" onClick={()=>editSession(session)}>✎</button>
                        <button title="Supprimer" onClick={()=>void deleteSession(session)}><Trash2 size={14}/></button>
                      </div>
                    </div>)}
                    {unassignedCount>0 && <div className="chapter-row session-row unassigned-row">
                      <button className="chapter-select" onClick={()=>{setOpenSessionId(UNASSIGNED);setSessionView("blocks");}}>
                        <span className="chapter-number">∅</span>
                        <span className="chapter-title"><strong>Blocs non affectés</strong><small>{unassignedCount} bloc(s) sans séance — à affecter explicitement</small></span>
                      </button>
                      <div className="row-actions"><button title="Ouvrir" onClick={()=>{setOpenSessionId(UNASSIGNED);setSessionView("blocks");}}><ChevronRight size={14}/></button></div>
                    </div>}
                  </div>}
                </>}

                {sessionView==="blocks" && <>
                  <div className="content-subhead"><h4>{scopeLabel} <span>{scopeCapsules.length}</span></h4><div className="panel-actions"><button className="secondary" onClick={()=>setSessionView("sessions")}><ArrowLeft size={14}/> Séances</button><button className="small-primary" disabled={busy} onClick={()=>void createCapsule()}><Plus size={15}/> Bloc</button></div></div>
                  {openSessionId!==UNASSIGNED && !openSession ? <Empty text="Séance introuvable. Reviens à la liste des séances."/> : scopeCapsules.length===0 ? <Empty text={openSessionId===UNASSIGNED?"Plus aucun bloc non affecté.":"Cette séance ne contient aucun bloc. Ajoute-en un avec « Bloc »."}/> : <div className="item-list">
                    {scopeCapsules.map((capsule,i)=><div key={capsule.id} className="chapter-row block-row">
                      <button className="chapter-select" onClick={()=>{setPreviewId(capsule.id);setSessionView("preview");}}>
                        <span className="chapter-number">{i+1}</span>
                        <span className="chapter-title"><strong><MathHtml text={capsule.title}/></strong><small>Bloc {i+1} · {KIND_LABEL[capsule.kind]??capsule.kind}</small></span>
                      </button>
                      <select className="block-move" aria-label="Séance du bloc" value={capsule.session_id??""} disabled={busy||sessions.length===0} onChange={e=>void assignCapsule(capsule,e.target.value)}>
                        <option value="">Non affecté</option>{sessions.map((s,k)=><option key={s.id} value={s.id}>{`Séance ${k+1}`}</option>)}
                      </select>
                      <div className="row-actions">
                        <button title="Voir l’aperçu complet" onClick={()=>{setPreviewId(capsule.id);setSessionView("preview");}}><Eye size={14}/></button>
                        <button title="Supprimer" disabled={busy} onClick={()=>void deleteCapsule(capsule)}><Trash2 size={14}/></button>
                      </div>
                    </div>)}
                  </div>}
                </>}

                {sessionView==="preview" && (!previewCapsule ? <Empty text="Bloc introuvable. Reviens à la liste des blocs."/> : <div className="block-preview">
                  <div className="content-subhead"><h4><MathHtml text={previewCapsule.title}/></h4><div className="panel-actions"><button className="secondary" onClick={()=>{setSessionView("blocks");setPreviewId("");}}><ArrowLeft size={14}/> Retour aux blocs</button><button className="primary" disabled={busy} onClick={()=>editCapsule(previewCapsule)}>Modifier le bloc</button></div></div>
                  <div className="block-preview-meta"><span className="kind-pill">{KIND_LABEL[previewCapsule.kind]??previewCapsule.kind}</span><span>{previewCapsule.minutes} min</span><span>{previewCapsule.is_high_yield?"Prioritaire":"Bloc de leçon"}</span><span className="muted">Aperçu en lecture seule — rendu élève</span></div>
                  <div className="preview-box block-preview-body" dangerouslySetInnerHTML={{ __html: renderPreview(previewCapsule.body) || "<span class=\"muted\">Aucun texte dans ce bloc.</span>" }} />
                </div>)}
                </>}
                {lessonTab==="exercises" && <>
                  <div className="content-subhead"><small>QCM, flashcards et textes à compléter liés à cette leçon.</small><button className="small-primary" onClick={()=>void createCard()}><Plus size={15}/> Exercice</button></div>
                {cards.length===0?<Empty text="Aucune carte ni exercice dans ce chapitre."/>:<div className="table-wrap"><table><thead><tr><th>Type</th><th>Énoncé / recto</th><th>Réponse</th><th></th></tr></thead><tbody>{cards.map(card=><tr key={card.id}><td><span className="kind-pill">{card.kind.toUpperCase()}</span></td><td className="question-cell"><FrontCell row={card}/></td><td><MathHtml text={answerCellText(card)}/></td><td className="table-actions"><button onClick={()=>void editCard(card)} title="Modifier">✎</button><button onClick={()=>void deleteCard(card)} title="Supprimer"><Trash2 size={14}/></button></td></tr>)}</tbody></table></div>}
                </>}
              </div>
            </>)}
          </section>}

          {section === "freeexercises" && <section className="page">
            <div className="page-intro"><div><div className="eyebrow">DOJO · HORS COURS</div><h2>Exercices libres</h2><p>Des exercices qui ne dépendent d’aucune discipline, leçon ou chapitre. Les élèves les retrouvent dans le Dojo, bloc « Exercices libres », sans avoir à terminer de leçon.</p></div><button className="primary" disabled={freeMissing} onClick={()=>createFree()}><Plus size={16}/> Nouvel exercice</button></div>
            {freeMissing && <div className="banner-tip"><AlertCircle size={19}/><div><strong>Configuration requise</strong><p>La table des exercices libres n’existe pas encore dans Supabase. Exécute une seule fois le script <code>supabase/migrations/20261122_exercices_libres.sql</code> dans l’éditeur SQL, puis clique sur Synchroniser.</p></div></div>}
            {!freeMissing && activeLevels.length>1 && <div className="selector-row single"><label>Classe<select value={levelId} onChange={e=>setLevelId(e.target.value)}>{activeLevels.map(x=><option key={x.id} value={x.id}>{x.label}</option>)}</select></label></div>}
            {!freeMissing && (freeShown.length===0
              ? <div className="panel"><Empty text="Aucun exercice libre pour cette classe. Crée le premier avec « Nouvel exercice »."/></div>
              : <div className="panel"><div className="table-wrap"><table><thead><tr><th>Type</th><th>Énoncé</th><th>Réponse</th><th>Classe</th><th>Statut</th><th></th></tr></thead><tbody>{freeShown.map(item=><tr key={item.id}><td><span className="kind-pill">{item.kind.toUpperCase()}</span></td><td className="question-cell"><FrontCell row={item}/>{item.label && <small className="muted-cell">{item.label}</small>}</td><td><MathHtml text={answerCellText(item)}/></td><td>{item.level_id?(levels.find(l=>l.id===item.level_id)?.label??item.level_id):"Toutes"}</td><td><Status status={item.is_published?"published":"draft"}/></td><td className="table-actions"><button onClick={()=>editFree(item)} title="Modifier">✎</button><button onClick={()=>void toggleFree(item)} title={item.is_published?"Dépublier":"Publier"}>{item.is_published?<X size={14}/>:<Check size={14}/>}</button><button onClick={()=>void deleteFree(item)} title="Supprimer"><Trash2 size={14}/></button></td></tr>)}</tbody></table></div></div>)}
          </section>}

          {section === "banners" && <section className="page">
            <div className="page-intro"><div><div className="eyebrow">EXPLORER · CONTENU ÉDITORIAL</div><h2>À la une dans l’espace élève</h2><p>Les bannières actives sont récupérées par <code>loadBanner(levelId)</code> dans le code Android.</p></div><button className="primary" onClick={()=>void createBanner()}><Plus size={16}/> Nouvelle bannière</button></div>
            <div className="banner-tip"><Sparkles size={19}/><div><strong>Publication contrôlée</strong><p>Une bannière est créée en brouillon. Active-la uniquement après vérification du titre et de sa destination. Une bannière sans classe cible est valable pour toutes les classes.</p></div></div>
            {banners.length===0?<Empty text="Aucune bannière enregistrée dans Supabase. Il n’y a pas de contenu de démonstration."/>:<div className="banner-list">{banners.map(banner=><article className={`banner-card ${banner.is_active?"banner-live":""}`} key={banner.id}><div className="banner-art"><Sparkles size={22}/><span>EXPLORER</span></div><div className="banner-copy"><div className="banner-meta"><Status status={banner.is_active?"published":"draft"}/><span>{banner.level_id?levels.find(l=>l.id===banner.level_id)?.label??banner.level_id:"Toutes les classes"}</span></div><h3>{banner.title}</h3><p>{banner.subtitle||"Sans sous-titre"}</p><small>{banner.button_label?`Bouton : ${banner.button_label}`:"Bannière informative"} · {banner.chapter_id?"Chapitre associé":"Aucune destination"}</small></div><div className="banner-actions"><button className="secondary" onClick={()=>void editBanner(banner)}>Modifier</button><button className={banner.is_active?"secondary":"small-primary"} onClick={()=>void toggleBanner(banner)}>{banner.is_active?"Désactiver":"Publier"}</button><button className="icon-button danger" onClick={()=>void deleteBanner(banner)} title="Supprimer"><Trash2 size={16}/></button></div></article>)}</div>}
          </section>}

          {section === "firstchallenge" && <FirstChallengeComposer levels={activeLevels} levelId={levelId} onLevelChange={setLevelId} onNotice={setNotice} />}


        </div>
        {entry && <EntryPage spec={entry} onClose={() => setEntry(null)} />}
        {capsuleEditor && (
          <CapsuleEditor
            key={capsuleEditor.capsule?.id ?? "new-capsule"}
            editing={Boolean(capsuleEditor.capsule)}
            saving={busy}
            initial={capsuleEditor.capsule ? {
              title: capsuleEditor.capsule.title,
              body: capsuleEditor.capsule.body,
              kind: capsuleEditor.capsule.kind,
              minutes: capsuleEditor.capsule.minutes,
              is_high_yield: capsuleEditor.capsule.is_high_yield
            } : {
              title: "",
              body: "",
              kind: "text",
              minutes: 3,
              is_high_yield: false
            }}
            onCancel={() => setCapsuleEditor(null)}
            onSave={draft => void saveCapsule(draft)}
          />
        )}
        <footer className="main-footer"><span>© KALYNO · Administration pédagogique</span><span><span className="online-dot"/> Backend Supabase · RLS actif</span></footer>
      </main>
    </div>
  );
}

function Stat({icon,label,value,tone,detail}:{icon:ReactNode;label:string;value:number;tone:string;detail:string}) {
  return <article className="stat-card"><div className={`stat-icon ${tone}`}>{icon}</div><div className="stat-label">{label}</div><div className="stat-value">{value.toLocaleString("fr-FR")}</div><div className="stat-detail">{detail}</div></article>;
}
function Status({status}:{status:string}) {
  const published = status === "published";
  return <span className={`status-pill ${published?"published":"draft"}`}><span/>{published?"Publié":"Brouillon"}</span>;
}
function Empty({text}:{text:string}) {
  return <div className="empty-state"><div className="empty-icon"><FileText size={21}/></div><p>{text}</p></div>;
}
