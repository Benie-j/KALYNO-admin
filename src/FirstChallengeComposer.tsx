import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Check, CircleAlert, Edit3, Lightbulb, Plus, Rocket, Save, Trash2, X } from "lucide-react";
import { supabase } from "./lib/supabase";

/**
 * Compositeur du PREMIER DÉFI : celui que l'élève reçoit juste après avoir saisi son pseudo.
 * Mêmes types d'exercices que le Dojo : une bonne réponse, plusieurs bonnes réponses, saisie libre.
 * Table `challenges` (kind = discovery) + table `questions`.
 */

type LevelLite = { id: string; label: string; cycle?: string | null };
type Challenge = { id: string; level_id: string; title: string; position: number; status: "draft" | "published"; kind: string };
type QKind = "single" | "multiple" | "text";
type Q = {
  id: string; challenge_id: string; position: number; prompt: string; kind: QKind | null; choices: string[] | null;
  correct_index: number | null; correct_indices: number[] | null; answer: string | null; hint: string | null; explanation: string | null;
};
type Draft = { kind: QKind; prompt: string; choices: string[]; correct: number[]; answers: string; hint: string; explanation: string };

const KIND_LABEL: Record<QKind, string> = { single: "Une bonne réponse", multiple: "Plusieurs bonnes réponses", text: "Saisie libre" };
const KIND_PILL: Record<QKind, string> = { single: "UNE BONNE RÉPONSE", multiple: "PLUSIEURS RÉPONSES", text: "SAISIE LIBRE" };
const MIN_CHOICES = 2;
const MAX_CHOICES = 6;

const COLS_FULL = "id,challenge_id,position,prompt,kind,choices,correct_index,correct_indices,answer,hint,explanation";
const COLS_LEGACY = "id,challenge_id,position,prompt,choices,correct_index,explanation";

const emptyDraft = (): Draft => ({ kind: "single", prompt: "", choices: ["", "", "", ""], correct: [], answers: "", hint: "", explanation: "" });
const errText = (e: unknown) => (e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : String(e));

function kindOf(q: Q): QKind {
  if (q.kind === "single" || q.kind === "multiple" || q.kind === "text") return q.kind;
  return (q.correct_indices?.length ?? 0) > 1 ? "multiple" : "single";
}

function toDraft(q: Q): Draft {
  const kind = kindOf(q);
  const correct = q.correct_indices?.length ? q.correct_indices : q.correct_index !== null && q.correct_index !== undefined ? [q.correct_index] : [];
  return {
    kind,
    prompt: q.prompt,
    choices: kind === "text" ? ["", "", "", ""] : [...(q.choices ?? [])],
    correct: kind === "text" ? [] : [...correct].sort((a, b) => a - b),
    answers: (q.answer ?? "").split("|").map(x => x.trim()).filter(Boolean).join("\n"),
    hint: q.hint ?? "",
    explanation: q.explanation ?? ""
  };
}

/** Liste des problèmes qui empêchent d'enregistrer ou de publier cette question. */
function problems(d: Draft): string[] {
  const out: string[] = [];
  if (!d.prompt.trim()) out.push("L'énoncé est vide.");
  if (d.kind === "text") {
    if (!d.answers.split("\n").some(x => x.trim())) out.push("Ajoute au moins une réponse acceptée.");
    return out;
  }
  const texts = d.choices.map(x => x.trim());
  if (texts.length < MIN_CHOICES) out.push(`Il faut au moins ${MIN_CHOICES} choix.`);
  if (texts.some(x => !x)) out.push("Chaque choix doit être rempli (ou supprimé).");
  const filled = texts.filter(Boolean).map(x => x.toLowerCase());
  if (new Set(filled).size !== filled.length) out.push("Deux choix sont identiques.");
  if (d.kind === "single" && d.correct.length !== 1) out.push("Désigne la bonne réponse.");
  if (d.kind === "multiple" && d.correct.length < 1) out.push("Coche au moins une bonne réponse.");
  return out;
}

export default function FirstChallengeComposer({ levels, levelId, onLevelChange, onNotice }: {
  levels: LevelLite[]; levelId: string; onLevelChange: (id: string) => void; onNotice: (s: string) => void;
}) {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [challengeId, setChallengeId] = useState("");
  const [questions, setQuestions] = useState<Q[]>([]);
  const [legacy, setLegacy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [editing, setEditing] = useState<string | null>(null); // id de la question, "new", ou null
  const [draft, setDraft] = useState<Draft>(emptyDraft());

  const level = levels.find(x => x.id === levelId);
  const challenge = challenges.find(x => x.id === challengeId);
  const published = challenges.find(x => x.status === "published");

  const loadChallenges = useCallback(async (keep?: string) => {
    if (!levelId) { setChallenges([]); setChallengeId(""); return; }
    const { data, error } = await supabase.from("challenges").select("id,level_id,title,position,status,kind")
      .eq("level_id", levelId).eq("kind", "discovery").order("position");
    if (error) throw error;
    const rows = (data ?? []) as Challenge[];
    setChallenges(rows);
    setChallengeId(prev => {
      const wanted = keep ?? prev;
      if (rows.some(x => x.id === wanted)) return wanted;
      return (rows.find(x => x.status === "published") ?? rows[0])?.id ?? "";
    });
  }, [levelId]);

  const loadQuestions = useCallback(async (id: string) => {
    if (!id) { setQuestions([]); return; }
    const res = await supabase.from("questions").select(COLS_FULL).eq("challenge_id", id).order("position");
    if (res.error) {
      // Colonnes du Dojo absentes : la migration SQL n'est pas encore passée
      const fallback = await supabase.from("questions").select(COLS_LEGACY).eq("challenge_id", id).order("position");
      if (fallback.error) throw fallback.error;
      setLegacy(true);
      setQuestions((fallback.data ?? []) as unknown as Q[]);
      return;
    }
    setLegacy(false);
    setQuestions((res.data ?? []) as unknown as Q[]);
  }, []);

  useEffect(() => {
    setLoading(true);
    setEditing(null);
    loadChallenges().catch(e => onNotice("Échec : " + errText(e))).finally(() => setLoading(false));
  }, [loadChallenges, onNotice]);

  useEffect(() => {
    setEditing(null);
    setTitle(challenge?.title ?? "");
    loadQuestions(challengeId).catch(e => onNotice("Échec : " + errText(e)));
  }, [challengeId, challenge?.title, loadQuestions, onNotice]);

  async function run(action: () => Promise<void>, success: string) {
    setSaving(true); onNotice("");
    try { await action(); onNotice(success); }
    catch (e) {
      const text = errText(e);
      const migration = /column|schema cache|does not exist/i.test(text);
      onNotice("Échec : " + text + (migration ? " (Passe d'abord la migration SQL 20261026_premier_defi_dojo.sql dans Supabase.)" : ""));
    }
    finally { setSaving(false); }
  }

  // ---------- Défi ----------
  async function createChallenge() {
    const name = newTitle.trim();
    if (!name || !levelId) { onNotice("Échec : donne un titre au premier défi."); return; }
    await run(async () => {
      const position = challenges.reduce((m, x) => Math.max(m, x.position), 0) + 1;
      const { data, error } = await supabase.from("challenges")
        .insert({ level_id: levelId, title: name, kind: "discovery", position, status: "draft" }).select("id").single();
      if (error) throw error;
      setNewTitle("");
      await loadChallenges(data.id);
    }, "Premier défi créé en brouillon. Ajoute ses questions.");
  }

  async function renameChallenge() {
    if (!challenge) return;
    const name = title.trim();
    if (!name) { onNotice("Échec : le titre ne peut pas être vide."); return; }
    await run(async () => {
      const { error } = await supabase.from("challenges").update({ title: name }).eq("id", challenge.id);
      if (error) throw error;
      await loadChallenges(challenge.id);
    }, "Titre mis à jour.");
  }

  async function deleteChallenge() {
    if (!challenge) return;
    if (!window.confirm(`Supprimer « ${challenge.title} » et toutes ses questions ?`)) return;
    await run(async () => {
      const { error } = await supabase.from("challenges").delete().eq("id", challenge.id);
      if (error) throw error;
      await loadChallenges("");
    }, "Défi supprimé.");
  }

  const publishIssues = useMemo(() => {
    const out: string[] = [];
    if (!challenge) return out;
    if (!challenge.title.trim()) out.push("Le défi n'a pas de titre.");
    if (!questions.length) out.push("Ajoute au moins une question.");
    questions.forEach((q, i) => { problems(toDraft(q)).forEach(p => out.push(`Question ${i + 1} : ${p}`)); });
    return out;
  }, [challenge, questions]);

  async function togglePublish() {
    if (!challenge) return;
    if (challenge.status === "published") {
      if (!window.confirm("Retirer ce défi ? Les nouveaux élèves de cette classe passeront directement à la suite.")) return;
      await run(async () => {
        const { error } = await supabase.from("challenges").update({ status: "draft" }).eq("id", challenge.id);
        if (error) throw error;
        await loadChallenges(challenge.id);
      }, "Défi remis en brouillon.");
      return;
    }
    if (publishIssues.length) { onNotice("Échec : corrige d'abord " + publishIssues[0]); return; }
    const other = challenges.find(x => x.status === "published" && x.id !== challenge.id);
    const message = other
      ? `« ${other.title} » est déjà publié pour ${level?.label ?? "cette classe"}. Le remplacer par « ${challenge.title} » ? Chaque élève ne reçoit qu'un premier défi.`
      : `Publier « ${challenge.title} » pour ${level?.label ?? "cette classe"} ? Les nouveaux élèves le recevront juste après leur pseudo.`;
    if (!window.confirm(message)) return;
    await run(async () => {
      if (other) {
        const { error } = await supabase.from("challenges").update({ status: "draft" }).eq("id", other.id);
        if (error) throw error;
      }
      const { error } = await supabase.from("challenges").update({ status: "published" }).eq("id", challenge.id);
      if (error) throw error;
      await loadChallenges(challenge.id);
    }, "Premier défi publié.");
  }

  // ---------- Questions ----------
  function openNew() { setDraft(emptyDraft()); setEditing("new"); onNotice(""); }
  function openEdit(q: Q) { setDraft(toDraft(q)); setEditing(q.id); onNotice(""); }

  async function saveQuestion() {
    if (!challenge || !editing) return;
    const issues = problems(draft);
    if (issues.length) { onNotice("Échec : " + issues[0]); return; }
    const isText = draft.kind === "text";
    const choices = isText ? [] : draft.choices.map(x => x.trim());
    const correct = isText ? [] : [...draft.correct].sort((a, b) => a - b);
    const answer = isText ? draft.answers.split("\n").map(x => x.trim()).filter(Boolean).join(" | ") : null;
    const values = {
      prompt: draft.prompt.trim(),
      kind: draft.kind,
      choices,
      correct_index: isText ? null : correct[0],
      correct_indices: isText ? null : correct,
      answer,
      hint: draft.hint.trim() || null,
      explanation: draft.explanation.trim() || null
    };
    await run(async () => {
      if (editing === "new") {
        const position = questions.reduce((m, x) => Math.max(m, x.position), 0) + 1;
        const { error } = await supabase.from("questions").insert({ challenge_id: challenge.id, position, ...values });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("questions").update(values).eq("id", editing);
        if (error) throw error;
      }
      setEditing(null);
      await loadQuestions(challenge.id);
    }, editing === "new" ? "Question ajoutée." : "Question mise à jour.");
  }

  async function removeQuestion(q: Q) {
    if (!window.confirm("Supprimer cette question ?")) return;
    await run(async () => {
      const { error } = await supabase.from("questions").delete().eq("id", q.id);
      if (error) throw error;
      if (editing === q.id) setEditing(null);
      await loadQuestions(challengeId);
    }, "Question supprimée.");
  }

  async function move(index: number, delta: -1 | 1) {
    const a = questions[index], b = questions[index + delta];
    if (!a || !b) return;
    await run(async () => {
      // Positions réattribuées proprement (évite les doublons éventuels)
      const ordered = [...questions];
      ordered[index] = b; ordered[index + delta] = a;
      for (let i = 0; i < ordered.length; i++) {
        if (ordered[i].position === i + 1) continue;
        const { error } = await supabase.from("questions").update({ position: i + 1 }).eq("id", ordered[i].id);
        if (error) throw error;
      }
      await loadQuestions(challengeId);
    }, "Ordre mis à jour.");
  }

  // ---------- Édition du brouillon ----------
  const patch = (p: Partial<Draft>) => setDraft(d => ({ ...d, ...p }));
  function setKind(kind: QKind) {
    setDraft(d => ({ ...d, kind, correct: kind === "single" ? d.correct.slice(0, 1) : kind === "text" ? [] : d.correct }));
  }
  function toggleCorrect(i: number) {
    setDraft(d => {
      if (d.kind === "single") return { ...d, correct: [i] };
      return { ...d, correct: d.correct.includes(i) ? d.correct.filter(x => x !== i) : [...d.correct, i].sort((a, b) => a - b) };
    });
  }
  function setChoice(i: number, value: string) { setDraft(d => ({ ...d, choices: d.choices.map((c, k) => (k === i ? value : c)) })); }
  function addChoice() { setDraft(d => (d.choices.length >= MAX_CHOICES ? d : { ...d, choices: [...d.choices, ""] })); }
  function removeChoice(i: number) {
    setDraft(d => {
      if (d.choices.length <= MIN_CHOICES) return d;
      return {
        ...d,
        choices: d.choices.filter((_, k) => k !== i),
        correct: d.correct.filter(x => x !== i).map(x => (x > i ? x - 1 : x))
      };
    });
  }

  const draftIssues = editing ? problems(draft) : [];
  const busy = saving || loading;

  return (
    <section className="page">
      <div className="page-intro">
        <div>
          <div className="eyebrow">ONBOARDING · APRÈS LE PSEUDO</div>
          <h2>Composer le premier défi</h2>
          <p>C'est le défi que l'élève reçoit juste après avoir saisi son pseudo. Mêmes exercices que le Dojo : une bonne réponse, plusieurs bonnes réponses ou saisie libre. Un seul défi publié par classe.</p>
        </div>
      </div>

      <div className="selector-row single">
        <label>Classe / série
          <select value={levelId} onChange={e => onLevelChange(e.target.value)}>
            {levels.map(x => <option key={x.id} value={x.id}>{x.cycle ? `${x.cycle} · ${x.label}` : x.label}</option>)}
          </select>
        </label>
      </div>

      {!levelId ? <div className="empty-state"><p>Choisis une classe pour composer son premier défi.</p></div> : (
        <>
          {/* ---- Défi de la classe ---- */}
          <div className="panel fc-head">
            {challenges.length === 0 ? (
              <>
                <div className="panel-heading"><div><h3>Aucun premier défi pour {level?.label ?? "cette classe"}</h3><p>Sans défi publié, l'élève passe directement à la suite après son pseudo.</p></div></div>
                <div className="fc-row">
                  <input className="fc-input" value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Titre du défi, par ex. Ton premier défi" maxLength={80} />
                  <button className="primary" onClick={() => void createChallenge()} disabled={busy}><Plus size={15} /> Créer le défi</button>
                </div>
              </>
            ) : (
              <>
                <div className="panel-heading">
                  <div>
                    <h3>Premier défi · {level?.label}</h3>
                    <p>{published ? `Publié : « ${published.title} »` : "Aucun défi publié : les élèves ne le voient pas encore."}</p>
                  </div>
                  <span className={`status-pill ${challenge?.status === "published" ? "published" : "draft"}`}><span />{challenge?.status === "published" ? "Publié" : "Brouillon"}</span>
                </div>

                {challenges.length > 1 && (
                  <div className="fc-tabs">
                    {challenges.map(x => (
                      <button key={x.id} className={`fc-tab ${x.id === challengeId ? "on" : ""}`} onClick={() => setChallengeId(x.id)}>
                        {x.title}{x.status === "published" ? " · publié" : ""}
                      </button>
                    ))}
                  </div>
                )}

                <div className="fc-row">
                  <input className="fc-input" value={title} onChange={e => setTitle(e.target.value)} maxLength={80} aria-label="Titre du défi" />
                  <button className="secondary" onClick={() => void renameChallenge()} disabled={busy || title.trim() === (challenge?.title ?? "") || !title.trim()}><Save size={15} /> Enregistrer le titre</button>
                  <button className="icon-button danger" title="Supprimer le défi" onClick={() => void deleteChallenge()} disabled={busy}><Trash2 size={15} /></button>
                </div>

                <div className={`fc-publish ${publishIssues.length === 0 ? "ready" : ""}`}>
                  <div>
                    {challenge?.status === "published" ? (
                      <><strong><Check size={15} /> Visible par les élèves de {level?.label}</strong><small>Retire-le pour modifier sereinement, puis republie.</small></>
                    ) : publishIssues.length === 0 ? (
                      <><strong><Check size={15} /> Prêt à publier</strong><small>{questions.length} question(s) valide(s).</small></>
                    ) : (
                      <><strong><CircleAlert size={15} /> À corriger avant publication</strong><small>{publishIssues.slice(0, 3).join(" · ")}{publishIssues.length > 3 ? ` · +${publishIssues.length - 3}` : ""}</small></>
                    )}
                  </div>
                  <button className="primary" onClick={() => void togglePublish()} disabled={busy || (challenge?.status !== "published" && publishIssues.length > 0)}>
                    <Rocket size={15} /> {challenge?.status === "published" ? "Retirer" : "Publier pour les élèves"}
                  </button>
                </div>
              </>
            )}
          </div>

          {legacy && (
            <div className="fc-warning"><CircleAlert size={17} /><div><strong>Migration SQL à passer</strong><p>Les colonnes du Dojo (type, plusieurs réponses, saisie libre, indice) n'existent pas encore. Exécute <code>20261026_premier_defi_dojo.sql</code> dans Supabase &gt; SQL Editor, puis rafraîchis.</p></div></div>
          )}

          {/* ---- Questions + aperçu ---- */}
          {challenge && (
            <div className="fc-layout">
              <div className="panel">
                <div className="panel-heading">
                  <div><h3>Questions</h3><p>{questions.length} question(s), dans l'ordre où l'élève les verra</p></div>
                  <button className="small-primary" onClick={openNew} disabled={busy || editing === "new"}><Plus size={15} /> Question</button>
                </div>

                {questions.length === 0 && editing !== "new" && <div className="empty-state"><p>Aucune question. Ajoute la première.</p></div>}

                <div className="fc-questions">
                  {questions.map((q, i) => {
                    const d = toDraft(q);
                    const bad = problems(d);
                    return (
                      <article key={q.id} className={`fc-q ${editing === q.id ? "editing" : ""}`}>
                        <div className="fc-q-top">
                          <span className="fc-num">{String(i + 1).padStart(2, "0")}</span>
                          <span className="kind-pill">{KIND_LABEL[d.kind]}</span>
                          {bad.length > 0 && <span className="fc-bad" title={bad.join(" ")}><CircleAlert size={13} /> À corriger</span>}
                          <span className="fc-spacer" />
                          <button className="text-icon" title="Monter" onClick={() => void move(i, -1)} disabled={busy || i === 0}><ArrowUp size={14} /></button>
                          <button className="text-icon" title="Descendre" onClick={() => void move(i, 1)} disabled={busy || i === questions.length - 1}><ArrowDown size={14} /></button>
                          <button className="text-icon" title="Modifier" onClick={() => openEdit(q)} disabled={busy}><Edit3 size={14} /></button>
                          <button className="text-icon danger" title="Supprimer" onClick={() => void removeQuestion(q)} disabled={busy}><Trash2 size={14} /></button>
                        </div>
                        <strong>{q.prompt}</strong>
                        {d.kind === "text"
                          ? <p className="fc-answer">Réponse : {d.answers.split("\n").join(" · ") || "—"}</p>
                          : <div className="choice-list">{d.choices.map((c, j) => <span key={j} className={d.correct.includes(j) ? "correct-choice" : ""}>{String.fromCharCode(65 + j)}. {c}{d.correct.includes(j) && <Check size={13} />}</span>)}</div>}
                      </article>
                    );
                  })}
                </div>

                {editing && (
                  <div className="fc-editor">
                    <h4>{editing === "new" ? "Nouvelle question" : "Modifier la question"}</h4>

                    <div className="fc-kinds" role="radiogroup" aria-label="Type de question">
                      {(Object.keys(KIND_LABEL) as QKind[]).map(k => (
                        <button key={k} type="button" role="radio" aria-checked={draft.kind === k} className={`fc-kind ${draft.kind === k ? "on" : ""}`} onClick={() => setKind(k)}>{KIND_LABEL[k]}</button>
                      ))}
                    </div>

                    <label className="fc-field">Énoncé
                      <textarea rows={3} value={draft.prompt} onChange={e => patch({ prompt: e.target.value })} placeholder="Pose ta question à l'élève" />
                    </label>

                    {draft.kind === "text" ? (
                      <label className="fc-field">Réponses acceptées
                        <textarea rows={3} value={draft.answers} onChange={e => patch({ answers: e.target.value })} placeholder={"Une réponse par ligne.\nLa première est affichée à la correction."} />
                        <small>Accents, majuscules et petites fautes de frappe sont tolérés par l'app. Les nombres doivent être exacts.</small>
                      </label>
                    ) : (
                      <div className="fc-field">
                        <span>Choix · {draft.kind === "single" ? "sélectionne la bonne réponse" : "coche toutes les bonnes réponses"}</span>
                        <div className="fc-choices">
                          {draft.choices.map((c, i) => (
                            <div key={i} className={`fc-choice ${draft.correct.includes(i) ? "good" : ""}`}>
                              <input
                                type={draft.kind === "single" ? "radio" : "checkbox"}
                                name="fc-correct"
                                checked={draft.correct.includes(i)}
                                onChange={() => toggleCorrect(i)}
                                aria-label={`Choix ${String.fromCharCode(65 + i)} correct`}
                              />
                              <b>{String.fromCharCode(65 + i)}</b>
                              <input className="fc-input" value={c} onChange={e => setChoice(i, e.target.value)} placeholder={`Choix ${String.fromCharCode(65 + i)}`} />
                              <button type="button" className="text-icon" title="Supprimer le choix" onClick={() => removeChoice(i)} disabled={draft.choices.length <= MIN_CHOICES}><X size={14} /></button>
                            </div>
                          ))}
                        </div>
                        <button type="button" className="secondary fc-add" onClick={addChoice} disabled={draft.choices.length >= MAX_CHOICES}><Plus size={14} /> Ajouter un choix</button>
                      </div>
                    )}

                    <label className="fc-field">Indice (facultatif)
                      <input className="fc-input" value={draft.hint} onChange={e => patch({ hint: e.target.value })} placeholder="Affiché seulement si l'élève le demande" />
                    </label>
                    <label className="fc-field">Explication (facultatif)
                      <textarea rows={3} value={draft.explanation} onChange={e => patch({ explanation: e.target.value })} placeholder={"Affichée après la validation.\nUne étape par ligne."} />
                    </label>

                    {draftIssues.length > 0 && <ul className="fc-issues">{draftIssues.map(p => <li key={p}>{p}</li>)}</ul>}

                    <div className="fc-row">
                      <button className="primary" onClick={() => void saveQuestion()} disabled={busy || draftIssues.length > 0}><Save size={15} /> {saving ? "Enregistrement…" : "Enregistrer la question"}</button>
                      <button className="secondary" onClick={() => setEditing(null)} disabled={saving}><X size={15} /> Annuler</button>
                    </div>
                  </div>
                )}
              </div>

              <aside className="fc-preview-col">
                <Preview draft={editing ? draft : questions[0] ? toDraft(questions[0]) : null} title={challenge.title} fromEditor={Boolean(editing)} />
              </aside>
            </div>
          )}
        </>
      )}
    </section>
  );
}

/** Aperçu fidèle de ce que l'élève verra (même vocabulaire que l'app Android). */
function Preview({ draft, title, fromEditor }: { draft: Draft | null; title: string; fromEditor: boolean }) {
  const [hint, setHint] = useState(false);
  const [correction, setCorrection] = useState(false);
  useEffect(() => { setHint(false); setCorrection(false); }, [draft?.prompt, draft?.kind]);

  if (!draft) return <div className="fc-phone fc-phone-empty"><p>L'aperçu élève apparaît dès qu'une question existe.</p></div>;

  const multiple = draft.kind === "multiple";
  const steps = draft.explanation.split("\n").map(x => x.trim()).filter(Boolean);
  const answers = draft.answers.split("\n").map(x => x.trim()).filter(Boolean);
  const goodText = draft.correct.map(i => draft.choices[i]).filter(Boolean).join(" · ");

  return (
    <div className="fc-phone">
      <div className="fc-phone-label">{fromEditor ? "Aperçu de la question en cours" : "Aperçu · première question"}</div>
      <div className="fc-phone-bar"><span className="fc-x"><X size={14} /></span><div className="fc-track"><i /></div></div>
      <div className="fc-card">
        <span className="fc-pill">{KIND_PILL[draft.kind]}</span>
        <small className="fc-ctx">{title}</small>
        <p className="fc-prompt">{draft.prompt || "Ton énoncé apparaîtra ici."}</p>

        {draft.hint.trim() && (hint
          ? <div className="fc-hint"><Lightbulb size={15} /> {draft.hint}</div>
          : <button className="fc-hint-btn" onClick={() => setHint(true)}><Lightbulb size={14} /> Voir un indice</button>)}

        {draft.kind === "text" ? (
          <div className="fc-fake-input">Écris ta réponse ici...</div>
        ) : (
          <div className="fc-opts">
            {multiple && <small>Coche toutes les bonnes réponses.</small>}
            {draft.choices.map((c, i) => (
              <div key={i} className={`fc-opt ${correction && draft.correct.includes(i) ? "right" : ""}`}>
                <span className={`fc-badge ${multiple ? "sq" : ""}`}>{correction && draft.correct.includes(i) ? "✓" : String.fromCharCode(65 + i)}</span>
                <span>{c || `Choix ${String.fromCharCode(65 + i)}`}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {correction && (
        <div className="fc-card fc-corr">
          <b>BONNE RÉPONSE</b>
          <p className="fc-good">{draft.kind === "text" ? answers[0] ?? "—" : goodText || "—"}</p>
          {steps.length > 0 && <><b className="fc-expl">EXPLICATION</b>{steps.map((s, i) => <p key={i}>{steps.length > 1 ? `${i + 1}. ` : ""}{s}</p>)}</>}
        </div>
      )}

      <button className="fc-validate" onClick={() => setCorrection(c => !c)}>{correction ? "MASQUER LA CORRECTION" : "VOIR LA CORRECTION"}</button>
    </div>
  );
}
