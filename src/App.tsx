import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  Activity, AlertCircle, ArrowDownUp, BookOpen, Check, ChevronDown, CircleHelp,
  ClipboardList, Cloud, FileText, GraduationCap, LayoutDashboard, LogOut, Plus,
  RefreshCw, Save, Search, ShieldCheck, Sparkles, Target, Trash2, UploadCloud,
  X
} from "lucide-react";
import { supabase } from "./lib/supabase";
import CapsuleEditor, { type CapsuleEditorDraft } from "./CapsuleEditor";
import ToolsDock from "./tools/ToolsDock";

type Level = { id: string; label: string; position: number; is_active: boolean };
type Subject = { id: string; level_id: string; name: string; emoji: string | null; coefficient: number; position: number; is_active: boolean };
type Chapter = { id: string; subject_id: string; title: string; position: number; status: "draft" | "published"; tag?: string | null };
type Capsule = { id: string; chapter_id: string; title: string; body: string; minutes: number; position: number; kind: string; is_high_yield: boolean };
type Card = { id: string; chapter_id: string; capsule_id: string | null; kind: "flashcard" | "qcm" | "cloze"; front: string; back: string | null; choices: string[] | null; correct_index: number | null; explanation: string | null; position: number; is_high_yield: boolean };
type Banner = { id: string; title: string; subtitle: string | null; button_label: string | null; chapter_id: string | null; level_id: string | null; position: number; is_active: boolean };
type Challenge = { id: string; level_id: string; title: string; position: number; status: "draft" | "published"; kind: "discovery" | "standard" };
type Question = { id: string; challenge_id: string; position: number; prompt: string; choices: string[]; correct_index: number; explanation: string | null };

type Section = "overview" | "courses" | "banners" | "dojo";
const KIND_LABEL: Record<string, string> = { intro: "Introduction", text: "Texte", rule: "Règle / formule", tip: "Astuce", pitfall: "Piège à éviter" };

function errorText(error: unknown) {
  if (error && typeof error === "object" && "message" in error) return String((error as {message: unknown}).message);
  return String(error ?? "Une erreur inconnue est survenue.");
}
function ask(label: string, initial = ""): string | null {
  const value = window.prompt(label, initial);
  return value === null ? null : value.trim();
}
function tell(message: string) { window.alert(message); }

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
  const [cards, setCards] = useState<Card[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [challengeId, setChallengeId] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [searchText, setSearchText] = useState("");
  const [counts, setCounts] = useState({ subjects: 0, chapters: 0, capsules: 0, cards: 0, challenges: 0, students: 0 });
  const [capsuleEditor, setCapsuleEditor] = useState<{ capsule: Capsule | null } | null>(null);

  const currentLevel = levels.find(x => x.id === levelId);
  const currentSubject = subjects.find(x => x.id === subjectId);
  const currentChapter = chapters.find(x => x.id === chapterId);
  const currentChallenge = challenges.find(x => x.id === challengeId);

  const loadLevels = useCallback(async () => {
    const { data, error } = await supabase.from("levels").select("id,label,position,is_active").order("position");
    if (error) throw error;
    const rows = (data ?? []) as Level[];
    setLevels(rows);
    setLevelId(previous => rows.some(x => x.id === previous) ? previous : (rows[0]?.id ?? ""));
  }, []);

  const loadContent = useCallback(async (activeLevel: string) => {
    if (!activeLevel) { setSubjects([]); setChapters([]); setCapsules([]); setCards([]); return; }
    const { data, error } = await supabase.from("subjects")
      .select("id,level_id,name,emoji,coefficient,position,is_active")
      .eq("level_id", activeLevel).order("position");
    if (error) throw error;
    const rows = (data ?? []) as Subject[];
    setSubjects(rows);
    setSubjectId(previous => rows.some(x => x.id === previous) ? previous : (rows[0]?.id ?? ""));
  }, []);

  const loadChapters = useCallback(async (activeSubject: string) => {
    if (!activeSubject) { setChapters([]); setChapterId(""); setCapsules([]); setCards([]); return; }
    const { data, error } = await supabase.from("chapters")
      .select("id,subject_id,title,position,status,tag")
      .eq("subject_id", activeSubject).order("position");
    if (error) throw error;
    const rows = (data ?? []) as Chapter[];
    setChapters(rows);
    setChapterId(previous => rows.some(x => x.id === previous) ? previous : (rows[0]?.id ?? ""));
  }, []);

  const loadLesson = useCallback(async (activeChapter: string) => {
    if (!activeChapter) { setCapsules([]); setCards([]); return; }
    const [capsuleResult, cardResult] = await Promise.all([
      supabase.from("capsules").select("id,chapter_id,title,body,minutes,position,kind,is_high_yield").eq("chapter_id", activeChapter).order("position"),
      supabase.from("cards").select("id,chapter_id,capsule_id,kind,front,back,choices,correct_index,explanation,position,is_high_yield").eq("chapter_id", activeChapter).order("position")
    ]);
    if (capsuleResult.error) throw capsuleResult.error;
    if (cardResult.error) throw cardResult.error;
    setCapsules((capsuleResult.data ?? []) as Capsule[]);
    setCards((cardResult.data ?? []) as Card[]);
  }, []);

  const loadBanners = useCallback(async () => {
    const { data, error } = await supabase.from("explorer_banners")
      .select("id,title,subtitle,button_label,chapter_id,level_id,position,is_active").order("position");
    if (error) throw error;
    setBanners((data ?? []) as Banner[]);
  }, []);

  const loadChallenges = useCallback(async (activeLevel: string) => {
    if (!activeLevel) { setChallenges([]); setChallengeId(""); setQuestions([]); return; }
    const { data, error } = await supabase.from("challenges")
      .select("id,level_id,title,position,status,kind").eq("level_id", activeLevel).order("position");
    if (error) throw error;
    const rows = (data ?? []) as Challenge[];
    setChallenges(rows);
    setChallengeId(previous => rows.some(x => x.id === previous) ? previous : (rows[0]?.id ?? ""));
  }, []);

  const loadQuestions = useCallback(async (activeChallenge: string) => {
    if (!activeChallenge) { setQuestions([]); return; }
    const { data, error } = await supabase.from("questions")
      .select("id,challenge_id,position,prompt,choices,correct_index,explanation")
      .eq("challenge_id", activeChallenge).order("position");
    if (error) throw error;
    setQuestions((data ?? []) as Question[]);
  }, []);

  const refreshCounts = useCallback(async () => {
    const [s, c, ca, cr, ch, st] = await Promise.all([
      supabase.from("subjects").select("id", { count: "exact", head: true }),
      supabase.from("chapters").select("id", { count: "exact", head: true }),
      supabase.from("capsules").select("id", { count: "exact", head: true }),
      supabase.from("cards").select("id", { count: "exact", head: true }),
      supabase.from("challenges").select("id", { count: "exact", head: true }),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "student")
    ]);
    const firstError = [s,c,ca,cr,ch,st].find(x => x.error)?.error;
    if (firstError) throw firstError;
    setCounts({ subjects: s.count ?? 0, chapters: c.count ?? 0, capsules: ca.count ?? 0, cards: cr.count ?? 0, challenges: ch.count ?? 0, students: st.count ?? 0 });
  }, []);

  const reloadAll = useCallback(async () => {
    setBusy(true);
    try {
      await loadLevels();
      await loadBanners();
      await refreshCounts();
      setNotice("Synchronisation terminée avec Supabase.");
    } catch (e) { setNotice(`Synchronisation impossible : ${errorText(e)}`); }
    finally { setBusy(false); }
  }, [loadLevels, loadBanners, refreshCounts]);

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
  useEffect(() => { if (session && levelId) { void loadContent(levelId).catch(e => setNotice(errorText(e))); void loadChallenges(levelId).catch(e => setNotice(errorText(e))); } }, [session, levelId, loadContent, loadChallenges]);
  useEffect(() => { if (session) void loadChapters(subjectId).catch(e => setNotice(errorText(e))); }, [session, subjectId, loadChapters]);
  useEffect(() => { if (session) void loadLesson(chapterId).catch(e => setNotice(errorText(e))); }, [session, chapterId, loadLesson]);
  useEffect(() => { if (session) void loadQuestions(challengeId).catch(e => setNotice(errorText(e))); }, [session, challengeId, loadQuestions]);

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

  async function createSubject() {
    const name = ask("Nom de la discipline"); if (!name || !levelId) return;
    const emoji = ask("Emoji de la discipline", "📘") || "📘";
    await runAction(async () => {
      const { error } = await supabase.from("subjects").insert({ level_id: levelId, name, emoji, position: subjects.length, is_active: true });
      if (error) throw error; await loadContent(levelId);
    }, "Discipline créée.");
  }
  async function editSubject(subject: Subject) {
    const name = ask("Nom de la discipline", subject.name); if (!name) return;
    const emoji = ask("Emoji", subject.emoji ?? "📘"); if (emoji === null) return;
    await runAction(async () => {
      const { error } = await supabase.from("subjects").update({ name, emoji: emoji || null }).eq("id", subject.id);
      if (error) throw error; await loadContent(levelId);
    }, "Discipline mise à jour.");
  }
  async function deleteSubject(subject: Subject) {
    if (!confirm(`Supprimer « ${subject.name} » et ses chapitres, blocs et cartes ?`)) return;
    await runAction(async () => {
      const { error } = await supabase.from("subjects").delete().eq("id", subject.id);
      if (error) throw error; setSubjectId(""); await loadContent(levelId);
    }, "Discipline supprimée.");
  }
  async function createChapter() {
    const title = ask("Titre du chapitre"); if (!title || !subjectId) return;
    const tag = ask("Smart Tag (laisser vide si aucun)", "") ;
    if (tag === null) return;
    await runAction(async () => {
      const { error } = await supabase.from("chapters").insert({ subject_id: subjectId, title, tag: tag || null, position: chapters.length, status: "draft" });
      if (error) throw error; await loadChapters(subjectId);
    }, "Chapitre créé en brouillon.");
  }
  async function editChapter(chapter: Chapter) {
    const title = ask("Titre du chapitre", chapter.title); if (!title) return;
    const tag = ask("Smart Tag", chapter.tag ?? ""); if (tag === null) return;
    await runAction(async () => {
      const { error } = await supabase.from("chapters").update({ title, tag: tag || null }).eq("id", chapter.id);
      if (error) throw error; await loadChapters(subjectId);
    }, "Chapitre mis à jour.");
  }
  async function toggleChapter(chapter: Chapter) {
    const status = chapter.status === "published" ? "draft" : "published";
    if (status === "published" && !confirm("Publier ce chapitre ? Les élèves de la classe pourront le consulter.")) return;
    await runAction(async () => {
      const { error } = await supabase.from("chapters").update({ status }).eq("id", chapter.id);
      if (error) throw error; await loadChapters(subjectId);
    }, status === "published" ? "Chapitre publié pour les élèves." : "Chapitre remis en brouillon.");
  }
  async function deleteChapter(chapter: Chapter) {
    if (!confirm(`Supprimer le chapitre « ${chapter.title} » et son contenu ?`)) return;
    await runAction(async () => {
      const { error } = await supabase.from("chapters").delete().eq("id", chapter.id);
      if (error) throw error; setChapterId(""); await loadChapters(subjectId);
    }, "Chapitre supprimé.");
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
          position: capsules.length
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
  async function createCard() {
    if (!chapterId) return;
    const kind = ask("Type de carte : qcm, flashcard ou cloze", "qcm");
    if (!kind || !["qcm","flashcard","cloze"].includes(kind)) { tell("Type de carte invalide."); return; }
    const front = ask("Question / recto"); if (!front) return;
    let back: string | null = null, choices: string[] | null = null, correct_index: number | null = null;
    if (kind === "qcm") {
      const c1 = ask("Choix A"); if (!c1) return;
      const c2 = ask("Choix B"); if (!c2) return;
      const c3 = ask("Choix C"); if (!c3) return;
      const c4 = ask("Choix D"); if (!c4) return;
      choices = [c1,c2,c3,c4];
      const answer = Number(ask("Réponse correcte : 1, 2, 3 ou 4", "1"));
      if (![1,2,3,4].includes(answer)) { tell("Réponse correcte invalide."); return; }
      correct_index = answer - 1;
      back = ask("Réponse / complément (facultatif)", "") || null;
    } else {
      back = ask(kind === "cloze" ? "Texte complété / réponse attendue" : "Verso / réponse"); if (!back) return;
    }
    const explanation = ask("Explication de la réponse (facultatif)", "");
    const capsule_id = capsules[0]?.id ?? null;
    await runAction(async () => {
      const { error } = await supabase.from("cards").insert({
        chapter_id: chapterId, capsule_id, kind, front, back, choices, correct_index,
        explanation: explanation || null, position: cards.length
      });
      if (error) throw error; await loadLesson(chapterId);
    }, "Carte créée.");
  }
  async function editCard(card: Card) {
    const front = ask("Question / recto", card.front); if (!front) return;
    const back = ask("Verso / réponse", card.back ?? ""); if (back === null) return;
    const explanation = ask("Explication", card.explanation ?? ""); if (explanation === null) return;
    await runAction(async () => {
      const { error } = await supabase.from("cards").update({ front, back: back || null, explanation: explanation || null }).eq("id", card.id);
      if (error) throw error; await loadLesson(chapterId);
    }, "Carte mise à jour.");
  }
  async function deleteCard(card: Card) {
    if (!confirm("Supprimer cette carte ?")) return;
    await runAction(async () => {
      const { error } = await supabase.from("cards").delete().eq("id", card.id);
      if (error) throw error; await loadLesson(chapterId);
    }, "Carte supprimée.");
  }
  async function createBanner() {
    const title = ask("Titre de la bannière"); if (!title) return;
    const subtitle = ask("Sous-titre (facultatif)", ""); if (subtitle === null) return;
    const button_label = ask("Texte du bouton (facultatif)", "Découvrir"); if (button_label === null) return;
    const target = ask("Classe cible : saisir l'identifiant exact, ou laisser vide pour toutes les classes", levelId);
    if (target === null) return;
    const chapter = ask("ID du chapitre à ouvrir (facultatif)", chapterId); if (chapter === null) return;
    await runAction(async () => {
      const { error } = await supabase.from("explorer_banners").insert({
        title, subtitle: subtitle || null, button_label: button_label || null,
        level_id: target || null, chapter_id: chapter || null, position: banners.length, is_active: false
      });
      if (error) throw error; await loadBanners();
    }, "Bannière enregistrée en brouillon.");
  }
  async function editBanner(banner: Banner) {
    const title = ask("Titre de la bannière", banner.title); if (!title) return;
    const subtitle = ask("Sous-titre", banner.subtitle ?? ""); if (subtitle === null) return;
    const button_label = ask("Texte du bouton", banner.button_label ?? ""); if (button_label === null) return;
    await runAction(async () => {
      const { error } = await supabase.from("explorer_banners").update({
        title, subtitle: subtitle || null, button_label: button_label || null, updated_at: new Date().toISOString()
      }).eq("id", banner.id);
      if (error) throw error; await loadBanners();
    }, "Bannière mise à jour.");
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
  async function createChallenge() {
    const title = ask("Titre du défi"); if (!title || !levelId) return;
    const kind = ask("Type : discovery (défi de découverte) ou standard", "standard");
    if (!kind || !["discovery","standard"].includes(kind)) { tell("Type de défi invalide."); return; }
    await runAction(async () => {
      const { error } = await supabase.from("challenges").insert({ level_id: levelId, title, kind, position: challenges.length + 1, status: "draft" });
      if (error) throw error; await loadChallenges(levelId);
    }, "Défi créé en brouillon.");
  }
  async function editChallenge(challenge: Challenge) {
    const title = ask("Titre du défi", challenge.title); if (!title) return;
    await runAction(async () => {
      const { error } = await supabase.from("challenges").update({ title }).eq("id", challenge.id);
      if (error) throw error; await loadChallenges(levelId);
    }, "Défi mis à jour.");
  }
  async function toggleChallenge(challenge: Challenge) {
    const status = challenge.status === "published" ? "draft" : "published";
    if (status === "published" && !questions.length && challenge.id === challengeId) { tell("Ajoute au moins une question avant de publier ce défi."); return; }
    if (status === "published" && !confirm("Publier ce défi pour les élèves ?")) return;
    await runAction(async () => {
      const { error } = await supabase.from("challenges").update({ status }).eq("id", challenge.id);
      if (error) throw error; await loadChallenges(levelId);
    }, status === "published" ? "Défi publié." : "Défi remis en brouillon.");
  }
  async function deleteChallenge(challenge: Challenge) {
    if (!confirm(`Supprimer le défi « ${challenge.title} » et ses questions ?`)) return;
    await runAction(async () => {
      const { error } = await supabase.from("challenges").delete().eq("id", challenge.id);
      if (error) throw error; setChallengeId(""); await loadChallenges(levelId);
    }, "Défi supprimé.");
  }
  async function createQuestion() {
    if (!challengeId) return;
    const prompt = ask("Énoncé de la question"); if (!prompt) return;
    const choices: string[] = [];
    for (const letter of ["A","B","C","D"]) {
      const choice = ask(`Choix ${letter}`); if (!choice) return; choices.push(choice);
    }
    const correct = Number(ask("Réponse correcte : 1, 2, 3 ou 4", "1"));
    if (![1,2,3,4].includes(correct)) { tell("Réponse correcte invalide."); return; }
    const explanation = ask("Explication (facultatif)", "");
    await runAction(async () => {
      const { error } = await supabase.from("questions").insert({
        challenge_id: challengeId, position: questions.length + 1, prompt, choices,
        correct_index: correct - 1, explanation: explanation || null
      });
      if (error) throw error; await loadQuestions(challengeId);
    }, "Question ajoutée.");
  }
  async function editQuestion(question: Question) {
    const prompt = ask("Énoncé de la question", question.prompt); if (!prompt) return;
    const choices: string[] = [];
    for (let i=0;i<4;i++) {
      const choice = ask(`Choix ${String.fromCharCode(65+i)}`, question.choices[i] ?? "");
      if (!choice) return; choices.push(choice);
    }
    const correct = Number(ask("Réponse correcte : 1, 2, 3 ou 4", String(question.correct_index + 1)));
    if (![1,2,3,4].includes(correct)) { tell("Réponse correcte invalide."); return; }
    const explanation = ask("Explication", question.explanation ?? ""); if (explanation === null) return;
    await runAction(async () => {
      const { error } = await supabase.from("questions").update({ prompt, choices, correct_index: correct - 1, explanation: explanation || null }).eq("id", question.id);
      if (error) throw error; await loadQuestions(challengeId);
    }, "Question mise à jour.");
  }
  async function deleteQuestion(question: Question) {
    if (!confirm("Supprimer cette question ?")) return;
    await runAction(async () => {
      const { error } = await supabase.from("questions").delete().eq("id", question.id);
      if (error) throw error; await loadQuestions(challengeId);
    }, "Question supprimée.");
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
    { id: "courses" as Section, label: "Cours & leçons", icon: BookOpen },
    { id: "banners" as Section, label: "Explorer · À la une", icon: Sparkles },
    { id: "dojo" as Section, label: "Dojo · Défis", icon: Target }
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup side-brand"><div className="brand-mark">K</div><div><strong>KALYNO</strong><span>ESPACE ADMIN</span></div></div>
        <div className="side-label">ESPACE DE TRAVAIL</div>
        <nav>{nav.map(item => {
          const Icon = item.icon;
          return <button key={item.id} className={`nav-item ${section===item.id?"active":""}`} onClick={()=>setSection(item.id)}><Icon size={18}/><span>{item.label}</span>{section===item.id&&<span className="nav-active-dot"/>}</button>;
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
              <Stat icon={<FileText/>} label="Chapitres" value={counts.chapters} tone="green" detail="Brouillons et publiés"/>
              <Stat icon={<ClipboardList/>} label="Blocs pédagogiques" value={counts.capsules} tone="amber" detail="Contenus de leçon"/>
              <Stat icon={<CircleHelp/>} label="Cartes & exercices" value={counts.cards} tone="rose" detail="QCM, cartes, clozes"/>
              <Stat icon={<Target/>} label="Défis Dojo" value={counts.challenges} tone="teal" detail="Défis enregistrés"/>
            </div>
            <div className="section-heading"><div><h3>Accès rapides</h3><p>Gère les contenus réellement consommés par les élèves.</p></div></div>
            <div className="quick-grid">
              <button className="quick-card" onClick={()=>setSection("courses")}><div className="quick-icon blue"><BookOpen/></div><strong>Gérer les cours</strong><span>Disciplines, chapitres, leçons et exercices</span><b>Ouvrir <span>→</span></b></button>
              <button className="quick-card" onClick={()=>setSection("banners")}><div className="quick-icon violet"><Sparkles/></div><strong>Mettre à la une</strong><span>Publier une bannière dans Explorer</span><b>Ouvrir <span>→</span></b></button>
              <button className="quick-card" onClick={()=>setSection("dojo")}><div className="quick-icon green"><Target/></div><strong>Préparer un défi</strong><span>Créer les questions QCM du Dojo</span><b>Ouvrir <span>→</span></b></button>
            </div>
            <div className="info-banner"><div className="info-symbol"><Cloud size={21}/></div><div><strong>Une seule source de vérité</strong><p>Les cours et défis publiés ici sont lus par l’application Android via les politiques RLS de Supabase. Les brouillons restent réservés à l’administration.</p></div><ShieldCheck className="info-check" size={22}/></div>
          </section>}

          {section === "courses" && <section className="page">
            <div className="page-intro"><div><div className="eyebrow">CONTENU PÉDAGOGIQUE</div><h2>Construire le parcours élève</h2><p>Choisis une classe, puis une discipline et un chapitre pour gérer son contenu.</p></div><button className="secondary" onClick={()=>void reloadAll()}><RefreshCw size={16}/> Actualiser</button></div>
            <div className="selector-row">
              <label>Classe<select value={levelId} onChange={e=>setLevelId(e.target.value)}>{levels.map(x=><option key={x.id} value={x.id}>{x.label}</option>)}</select></label>
              <label>Discipline<select value={subjectId} onChange={e=>setSubjectId(e.target.value)}><option value="">Choisir une discipline</option>{subjects.map(x=><option key={x.id} value={x.id}>{x.emoji ?? "📘"} {x.name}</option>)}</select></label>
              <label>Chapitre<select value={chapterId} onChange={e=>setChapterId(e.target.value)}><option value="">Choisir un chapitre</option>{chapters.map(x=><option key={x.id} value={x.id}>{x.title}</option>)}</select></label>
            </div>
            <div className="course-columns">
              <div className="panel">
                <div className="panel-heading"><div><h3>Disciplines</h3><p>{currentLevel?.label ?? "Sélectionne une classe"}</p></div><button className="small-primary" onClick={()=>void createSubject()} disabled={!levelId}><Plus size={15}/> Ajouter</button></div>
                <div className="list-search"><Search size={16}/><input value={searchText} onChange={e=>setSearchText(e.target.value)} placeholder="Filtrer les chapitres…"/></div>
                {subjects.length===0?<Empty text="Aucune discipline pour cette classe."/>:<div className="item-list">{subjects.map(subject=><div key={subject.id} className={`subject-row ${subject.id===subjectId?"selected":""}`}><button className="subject-select" onClick={()=>setSubjectId(subject.id)}><span className="subject-emoji">{subject.emoji??"📘"}</span><span><strong>{subject.name}</strong><small>{chapters.length && subject.id===subjectId?`${chapters.length} chapitre(s)`:"Discipline"}</small></span></button><div className="row-actions"><button title="Modifier" onClick={()=>void editSubject(subject)}>✎</button><button title="Supprimer" onClick={()=>void deleteSubject(subject)}><Trash2 size={14}/></button></div></div>)}</div>}
              </div>
              <div className="panel">
                <div className="panel-heading"><div><h3>Chapitres</h3><p>{currentSubject?.name ?? "Sélectionne une discipline"}</p></div><button className="small-primary" onClick={()=>void createChapter()} disabled={!subjectId}><Plus size={15}/> Ajouter</button></div>
                {chapters.length===0?<Empty text="Crée un chapitre pour commencer."/>:<div className="item-list">{visibleChapters.map((chapter,i)=><div key={chapter.id} className={`chapter-row ${chapter.id===chapterId?"selected":""}`}><button className="chapter-select" onClick={()=>setChapterId(chapter.id)}><span className="chapter-number">{String(i+1).padStart(2,"0")}</span><span className="chapter-title"><strong>{chapter.title}</strong><small>{chapter.tag||"Sans Smart Tag"}</small></span><Status status={chapter.status}/></button><div className="row-actions"><button title="Modifier" onClick={()=>void editChapter(chapter)}>✎</button><button title={chapter.status==="published"?"Dépublier":"Publier"} onClick={()=>void toggleChapter(chapter)}>{chapter.status==="published"?<X size={14}/>:<Check size={14}/>}</button><button title="Supprimer" onClick={()=>void deleteChapter(chapter)}><Trash2 size={14}/></button></div></div>)}</div>}
              </div>
            </div>
            <div className="panel lesson-panel">
              <div className="panel-heading"><div><div className="eyebrow">ÉDITEUR DE LEÇON</div><h3>{currentChapter?.title ?? "Sélectionne un chapitre"}</h3><p>Les blocs et les cartes ci-dessous sont partagés avec l’application élève.</p></div><div className="panel-actions"><button className="secondary" disabled={!currentChapter} onClick={()=>currentChapter&&void toggleChapter(currentChapter)}>{currentChapter?.status==="published"?"Dépublier":"Publier le chapitre"}</button><button className="small-primary" disabled={!chapterId} onClick={()=>void createCapsule()}><Plus size={15}/> Bloc</button><button className="small-primary" disabled={!chapterId} onClick={()=>void createCard()}><Plus size={15}/> Carte / exercice</button></div></div>
              {!chapterId?<Empty text="Sélectionne un chapitre pour consulter et modifier sa leçon."/>:<>
                <div className="content-subhead"><h4>Blocs pédagogiques <span>{capsules.length}</span></h4><small>Ordre de présentation de la leçon</small></div>
                {capsules.length===0?<Empty text="Aucun bloc. Ajoute une introduction, une explication, une règle ou une astuce."/>:<div className="capsule-grid">{capsules.map((capsule,i)=><article className="capsule-card" key={capsule.id}><div className="capsule-top"><span className="capsule-index">{String(i+1).padStart(2,"0")}</span><span className="kind-pill">{KIND_LABEL[capsule.kind]??capsule.kind}</span><button className="text-icon" onClick={()=>void editCapsule(capsule)} title="Modifier">✎</button><button className="text-icon danger" onClick={()=>void deleteCapsule(capsule)} title="Supprimer"><Trash2 size={14}/></button></div><h4>{capsule.title}</h4><p>{capsule.body||"Aucun texte dans ce bloc."}</p><div className="capsule-footer"><span>{capsule.minutes} min</span><span>{capsule.is_high_yield?"Prioritaire":"Bloc de leçon"}</span></div></article>)}</div>}
                <div className="content-subhead"><h4>Cartes et exercices <span>{cards.length}</span></h4><small>QCM, flashcards et textes à trous</small></div>
                {cards.length===0?<Empty text="Aucune carte ni exercice dans ce chapitre."/>:<div className="table-wrap"><table><thead><tr><th>Type</th><th>Énoncé / recto</th><th>Réponse</th><th></th></tr></thead><tbody>{cards.map(card=><tr key={card.id}><td><span className="kind-pill">{card.kind.toUpperCase()}</span></td><td className="question-cell">{card.front}</td><td>{card.kind==="qcm"&&card.choices?card.choices[card.correct_index??0]:card.back??"—"}</td><td className="table-actions"><button onClick={()=>void editCard(card)} title="Modifier">✎</button><button onClick={()=>void deleteCard(card)} title="Supprimer"><Trash2 size={14}/></button></td></tr>)}</tbody></table></div>}
              </>}
            </div>
          </section>}

          {section === "banners" && <section className="page">
            <div className="page-intro"><div><div className="eyebrow">EXPLORER · CONTENU ÉDITORIAL</div><h2>À la une dans l’espace élève</h2><p>Les bannières actives sont récupérées par <code>loadBanner(levelId)</code> dans le code Android.</p></div><button className="primary" onClick={()=>void createBanner()}><Plus size={16}/> Nouvelle bannière</button></div>
            <div className="banner-tip"><Sparkles size={19}/><div><strong>Publication contrôlée</strong><p>Une bannière est créée en brouillon. Active-la uniquement après vérification du titre et de sa destination. Une bannière sans classe cible est valable pour toutes les classes.</p></div></div>
            {banners.length===0?<Empty text="Aucune bannière enregistrée dans Supabase. Il n’y a pas de contenu de démonstration."/>:<div className="banner-list">{banners.map(banner=><article className={`banner-card ${banner.is_active?"banner-live":""}`} key={banner.id}><div className="banner-art"><Sparkles size={22}/><span>EXPLORER</span></div><div className="banner-copy"><div className="banner-meta"><Status status={banner.is_active?"published":"draft"}/><span>{banner.level_id?levels.find(l=>l.id===banner.level_id)?.label??banner.level_id:"Toutes les classes"}</span></div><h3>{banner.title}</h3><p>{banner.subtitle||"Sans sous-titre"}</p><small>{banner.button_label?`Bouton : ${banner.button_label}`:"Bannière informative"} · {banner.chapter_id?"Chapitre associé":"Aucune destination"}</small></div><div className="banner-actions"><button className="secondary" onClick={()=>void editBanner(banner)}>Modifier</button><button className={banner.is_active?"secondary":"small-primary"} onClick={()=>void toggleBanner(banner)}>{banner.is_active?"Désactiver":"Publier"}</button><button className="icon-button danger" onClick={()=>void deleteBanner(banner)} title="Supprimer"><Trash2 size={16}/></button></div></article>)}</div>}
          </section>}

          {section === "dojo" && <section className="page">
            <div className="page-intro"><div><div className="eyebrow">ENTRAÎNEMENT & QCM</div><h2>Préparer les défis du Dojo</h2><p>Les défis publiés sont chargés par l’application Android selon la classe de l’élève.</p></div><button className="primary" onClick={()=>void createChallenge()} disabled={!levelId}><Plus size={16}/> Nouveau défi</button></div>
            <div className="selector-row single"><label>Classe<select value={levelId} onChange={e=>setLevelId(e.target.value)}>{levels.map(x=><option key={x.id} value={x.id}>{x.label}</option>)}</select></label></div>
            <div className="dojo-layout"><div className="panel"><div className="panel-heading"><div><h3>Défis de {currentLevel?.label??"la classe"}</h3><p>{challenges.length} défi(s)</p></div></div>{challenges.length===0?<Empty text="Aucun défi pour cette classe."/>:<div className="item-list">{challenges.map(ch=><div key={ch.id} className={`challenge-row ${challengeId===ch.id?"selected":""}`}><button className="challenge-select" onClick={()=>setChallengeId(ch.id)}><span className="challenge-symbol"><Target size={17}/></span><span><strong>{ch.title}</strong><small>{ch.kind==="discovery"?"Défi découverte":"Défi standard"}</small></span></button><div className="row-actions"><Status status={ch.status}/><button onClick={()=>void editChallenge(ch)} title="Modifier">✎</button><button onClick={()=>void toggleChallenge(ch)} title="Publier / dépublier">{ch.status==="published"?<X size={14}/>:<Check size={14}/>}</button><button onClick={()=>void deleteChallenge(ch)} title="Supprimer"><Trash2 size={14}/></button></div></div>)}</div>}</div>
              <div className="panel"><div className="panel-heading"><div><h3>{currentChallenge?.title??"Questions du défi"}</h3><p>{questions.length} question(s) · 4 choix par question</p></div><button className="small-primary" onClick={()=>void createQuestion()} disabled={!challengeId}><Plus size={15}/> Question</button></div>{!challengeId?<Empty text="Choisis un défi pour gérer ses questions."/>:questions.length===0?<Empty text="Ce défi n’a pas encore de question."/>:<div className="question-list">{questions.map((q,i)=><article key={q.id} className="question-card"><div className="question-number">{String(i+1).padStart(2,"0")}</div><div className="question-main"><strong>{q.prompt}</strong><div className="choice-list">{q.choices.map((choice,j)=><span className={j===q.correct_index?"correct-choice":""} key={j}>{String.fromCharCode(65+j)}. {choice}{j===q.correct_index&&<Check size={13}/>}</span>)}</div>{q.explanation&&<p>{q.explanation}</p>}</div><div className="row-actions"><button onClick={()=>void editQuestion(q)} title="Modifier">✎</button><button onClick={()=>void deleteQuestion(q)} title="Supprimer"><Trash2 size={14}/></button></div></article>)}</div>}</div></div>
          </section>}
        </div>
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
        <ToolsDock />
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
