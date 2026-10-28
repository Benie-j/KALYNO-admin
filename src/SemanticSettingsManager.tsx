import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Copy, RefreshCw, RotateCcw, Save, SlidersHorizontal } from "lucide-react";
import { supabase } from "./lib/supabase";

/** Valeurs et bornes identiques aux contraintes de la table Supabase et à l'application Android. */
const DEFAULT_VALID = 0.75;
const DEFAULT_PARTIAL = 0.6;
const MIN_VALID = 0.6;
const MAX_VALID = 0.95;
const MIN_PARTIAL = 0.3;
const GAP = 0.05;

const SETUP_SQL = `create table if not exists public.semantic_settings (
  scope             text primary key,
  valid_threshold   real not null default 0.75 check (valid_threshold between 0.60 and 0.95),
  partial_threshold real not null default 0.60 check (partial_threshold between 0.30 and 0.90),
  updated_at        timestamptz not null default now(),
  check (partial_threshold < valid_threshold)
);

insert into public.semantic_settings (scope) values ('global') on conflict (scope) do nothing;

alter table public.semantic_settings enable row level security;

drop policy if exists "semantic_settings_read" on public.semantic_settings;
create policy "semantic_settings_read" on public.semantic_settings
  for select using (true);

drop policy if exists "semantic_settings_admin_write" on public.semantic_settings;
create policy "semantic_settings_admin_write" on public.semantic_settings
  for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));`;

type Row = { scope: string; valid_threshold: number; partial_threshold: number; updated_at: string | null };

const errText = (e: unknown) => e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : String(e);
const round2 = (n: number) => Math.round(n * 100) / 100;
const isMissingTable = (e: { code?: string; message?: string }) =>
  e.code === "PGRST205" || e.code === "42P01" || /semantic_settings/i.test(e.message ?? "");

function profile(valid: number): { label: string; hint: string } {
  if (valid >= 0.85) return { label: "Très strict", hint: "Seules les reformulations très proches de la réponse attendue sont validées. Risque de refuser des réponses justes mais originales." };
  if (valid >= 0.75) return { label: "Strict (recommandé)", hint: "Bon équilibre entre rigueur pédagogique et tolérance aux reformulations." };
  if (valid >= 0.68) return { label: "Souple", hint: "Accepte davantage de reformulations, au prix de quelques réponses approximatives validées." };
  return { label: "Très souple", hint: "Risque élevé de valider des réponses imprécises. À éviter pour les classes d’examen." };
}

type Props = { busy: boolean; onNotice: (s: string) => void };

export default function SemanticSettingsManager({ busy, onNotice }: Props) {
  const [valid, setValid] = useState(DEFAULT_VALID);
  const [partial, setPartial] = useState(DEFAULT_PARTIAL);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [exists, setExists] = useState(false);
  const [missingTable, setMissingTable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("semantic_settings")
      .select("scope,valid_threshold,partial_threshold,updated_at")
      .eq("scope", "global")
      .maybeSingle();
    setLoading(false);
    if (error) {
      if (isMissingTable(error)) { setMissingTable(true); return; }
      onNotice("Échec : " + errText(error));
      return;
    }
    setMissingTable(false);
    const row = data as Row | null;
    setExists(!!row);
    if (row) {
      setValid(round2(row.valid_threshold));
      setPartial(round2(row.partial_threshold));
      setUpdatedAt(row.updated_at);
    }
  }, [onNotice]);

  useEffect(() => { void load(); }, [load]);

  function changeValid(next: number) {
    const v = round2(Math.min(MAX_VALID, Math.max(MIN_VALID, next)));
    setValid(v);
    setPartial(p => round2(Math.min(p, v - GAP)));
  }
  function changePartial(next: number) {
    setPartial(round2(Math.min(valid - GAP, Math.max(MIN_PARTIAL, next))));
  }

  async function save() {
    if (valid < MIN_VALID || valid > MAX_VALID || partial < MIN_PARTIAL || partial > valid - GAP + 1e-9) {
      onNotice("Échec : seuils invalides. Le seuil « presque » doit rester au moins 0,05 sous le seuil de validation.");
      return;
    }
    setSaving(true); onNotice("");
    try {
      const { error } = await supabase.from("semantic_settings").upsert(
        { scope: "global", valid_threshold: valid, partial_threshold: partial, updated_at: new Date().toISOString() },
        { onConflict: "scope" }
      );
      if (error) throw error;
      await load();
      onNotice("Seuils enregistrés. L’application les récupère au prochain lancement du Dojo (délai maximal d’une heure).");
    } catch (e) { onNotice("Échec : " + errText(e)); } finally { setSaving(false); }
  }

  async function copySql() {
    try { await navigator.clipboard.writeText(SETUP_SQL); onNotice("Script SQL copié. Colle-le dans Supabase > SQL Editor, puis clique sur Actualiser."); }
    catch { onNotice("Échec : copie impossible, sélectionne le script manuellement."); }
  }

  const p = profile(valid);
  const wrong = Math.round(partial * 100), almost = Math.round((valid - partial) * 100), right = Math.round((1 - valid) * 100);

  return <section className="page">
    <div className="page-intro">
      <div><div className="eyebrow">ÉVALUATION DES RÉPONSES LIBRES</div><h2>Seuils de l’évaluation sémantique</h2><p>Quand l’élève rédige une réponse que les mots-clés ne reconnaissent pas, l’application compare le sens de sa phrase à ta réponse de référence, hors-ligne. Ces seuils décident de la validation.</p></div>
      <button className="secondary" onClick={() => void load()} disabled={loading || saving}><RefreshCw size={16} /> Actualiser</button>
    </div>

    {missingTable && <div className="panel sem-setup">
      <div className="panel-heading"><div><h3>Configuration requise dans Supabase</h3><p>La table des seuils n’existe pas encore. Exécute ce script une seule fois.</p></div><span className="levels-icon"><AlertCircle size={18} /></span></div>
      <div className="sem-sql"><pre>{SETUP_SQL}</pre></div>
      <div className="levels-form-actions"><button className="primary" onClick={() => void copySql()}><Copy size={15} /> Copier le script SQL</button><button className="secondary" onClick={() => void load()}><RefreshCw size={15} /> J’ai exécuté le script</button></div>
    </div>}

    {!missingTable && <div className="levels-layout">
      <div className="panel">
        <div className="panel-heading"><div><h3>Seuils globaux</h3><p>{exists && updatedAt ? "Dernière mise à jour : " + new Date(updatedAt).toLocaleString("fr-FR") : "Valeurs recommandées (non encore enregistrées)"}</p></div><span className="levels-icon"><SlidersHorizontal size={18} /></span></div>
        <div className="levels-fields">
          <label>Seuil de validation : {valid.toFixed(2)}
            <input className="sem-range" type="range" min={MIN_VALID} max={MAX_VALID} step={0.01} value={valid} onChange={e => changeValid(Number(e.target.value))} disabled={loading} />
            <small>Au-dessus de ce score, la réponse est validée (note « J’ai hésité » côté mémoire). Entre {MIN_VALID.toFixed(2)} et {MAX_VALID.toFixed(2)}.</small>
          </label>
          <label>Seuil « presque » : {partial.toFixed(2)}
            <input className="sem-range" type="range" min={MIN_PARTIAL} max={round2(valid - GAP)} step={0.01} value={partial} onChange={e => changePartial(Number(e.target.value))} disabled={loading} />
            <small>Entre ce seuil et le seuil de validation, l’élève reçoit un message « tu es sur la bonne piste ». En dessous, la réponse est jugée incorrecte.</small>
          </label>
          <div className="sem-zones" aria-label="Zones de décision">
            <div className="sem-zone sem-wrong" style={{ flexGrow: wrong }}><span>Incorrect</span></div>
            <div className="sem-zone sem-almost" style={{ flexGrow: almost }}><span>Presque</span></div>
            <div className="sem-zone sem-right" style={{ flexGrow: right }}><span>Validé</span></div>
          </div>
          <div className="sem-profile"><strong>{p.label}</strong><small>{p.hint}</small></div>
        </div>
        <div className="levels-form-actions">
          <button className="primary" onClick={() => void save()} disabled={saving || busy || loading}><Save size={15} />{saving ? "Enregistrement…" : "Enregistrer les seuils"}</button>
          <button className="secondary" onClick={() => { changeValid(DEFAULT_VALID); setPartial(DEFAULT_PARTIAL); }} disabled={saving || loading}><RotateCcw size={15} /> Valeurs recommandées</button>
        </div>
      </div>

      <div className="panel">
        <div className="panel-heading"><div><h3>Comment ça fonctionne</h3><p>Ce que l’élève voit, selon le score de proximité de sens</p></div></div>
        <ul className="sem-rules">
          <li><strong>Les mots-clés passent toujours en premier.</strong> L’évaluation sémantique n’intervient que si la réponse n’est pas reconnue et fait au moins trois mots.</li>
          <li><strong>Ajoute une phrase complète comme réponse acceptée.</strong> Sépare-la des mots-clés par <code>|</code>. Le moteur compare mieux une phrase qu’un mot seul. L’explication de la carte sert aussi de référence.</li>
          <li><strong>Les chiffres restent stricts.</strong> Si une réponse acceptée contient un chiffre, aucune tolérance sémantique n’est appliquée.</li>
          <li><strong>Les contresens sont bloqués.</strong> Négation inversée, antonyme ou chiffre différent : la réponse est refusée même si le score est élevé.</li>
          <li><strong>Hors-ligne.</strong> Le calcul se fait sur le téléphone. Si le modèle est indisponible, l’application garde la correction par mots-clés.</li>
        </ul>
      </div>
    </div>}
  </section>;
}
