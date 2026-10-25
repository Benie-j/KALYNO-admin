import { FormEvent, useState } from "react";
import { Check, Edit3, Plus, Save, ShieldCheck, Trash2, X } from "lucide-react";
import { supabase } from "./lib/supabase";

type Level = { id: string; label: string; position: number; is_active: boolean; cycle: string | null; icon_key: string | null; tagline: string | null };
type Draft = { id: string; label: string; cycle: string; icon_key: string; tagline: string; position: string; is_active: boolean };
const empty: Draft = { id: "", label: "", cycle: "BAC", icon_key: "", tagline: "", position: "10", is_active: true };
const fromLevel = (x: Level): Draft => ({ id:x.id, label:x.label, cycle:x.cycle??"", icon_key:x.icon_key??"", tagline:x.tagline??"", position:String(x.position), is_active:x.is_active });
const errText = (e: unknown) => e && typeof e === "object" && "message" in e ? String((e as {message:unknown}).message) : String(e);

export default function LevelsManager({levels,busy,onRefresh,onNotice}:{levels:Level[];busy:boolean;onRefresh:()=>Promise<void>;onNotice:(s:string)=>void}) {
  const [draft,setDraft] = useState<Draft>(empty);
  const [editingId,setEditingId] = useState<string|null>(null);
  const [saving,setSaving] = useState(false);
  function reset(){setEditingId(null);setDraft({...empty,position:String((levels.length+1)*10)});}
  async function submit(event:FormEvent){
    event.preventDefault();
    const id=draft.id.trim().toUpperCase(), label=draft.label.trim(), cycle=draft.cycle.trim(), position=Number(draft.position);
    if(!editingId && !/^[A-Z0-9]+(?:_[A-Z0-9]+)*$/.test(id)){onNotice("Échec : identifiant invalide. Exemple : TLE_A2.");return;}
    if(!label||!cycle||!Number.isInteger(position)||position<0){onNotice("Échec : libellé, cycle et position entière sont obligatoires.");return;}
    setSaving(true);onNotice("");
    try{
      const values={label,cycle,icon_key:draft.icon_key.trim()||null,tagline:draft.tagline.trim()||null,position,is_active:draft.is_active};
      const result=editingId?await supabase.from("levels").update(values).eq("id",editingId):await supabase.from("levels").insert({id,...values});
      if(result.error)throw result.error;
      await onRefresh();reset();onNotice(editingId?"Classe/série mise à jour.":"Classe/série créée.");
    }catch(e){onNotice("Échec : "+errText(e));}finally{setSaving(false);}
  }
  async function toggle(level:Level){
    setSaving(true);onNotice("");
    try{const {error}=await supabase.from("levels").update({is_active:!level.is_active}).eq("id",level.id);if(error)throw error;await onRefresh();onNotice(level.is_active?"Classe désactivée. Les données existantes sont conservées.":"Classe activée.");}
    catch(e){onNotice("Échec : "+errText(e));}finally{setSaving(false);}
  }
  async function remove(level:Level){
    if(!window.confirm(`Supprimer définitivement « ${level.label} » ? Si elle contient des données, la suppression sera bloquée. Préfère la désactivation pour conserver l’historique.`))return;
    setSaving(true);onNotice("");
    try{
      const checks=await Promise.all([
        supabase.from("subjects").select("id",{count:"exact",head:true}).eq("level_id",level.id),
        supabase.from("challenges").select("id",{count:"exact",head:true}).eq("level_id",level.id),
        supabase.from("profiles").select("id",{count:"exact",head:true}).eq("level_id",level.id),
        supabase.from("explorer_banners").select("id",{count:"exact",head:true}).eq("level_id",level.id)
      ]);
      const failed=checks.find(x=>x.error);if(failed?.error)throw failed.error;
      const refs=checks.reduce((n,x)=>n+(x.count??0),0);
      if(refs)throw new Error(`${refs} relation(s) existent encore (disciplines, défis, profils ou bannières). Désactive plutôt cette classe.`);
      const {error}=await supabase.from("levels").delete().eq("id",level.id);if(error)throw error;
      if(editingId===level.id)reset();await onRefresh();onNotice("Classe/série supprimée.");
    }catch(e){onNotice("Échec : "+errText(e));}finally{setSaving(false);}
  }
  return <div className="levels-layout">
    <form className="panel levels-form" onSubmit={submit}>
      <div className="panel-heading"><div><h3>{editingId?"Modifier une classe/série":"Ajouter une classe/série"}</h3><p>L’identifiant est stable et ne se modifie plus après création.</p></div><span className="levels-icon"><ShieldCheck size={18}/></span></div>
      <div className="levels-fields">
        <label>Identifiant technique<input value={draft.id} disabled={!!editingId} onChange={e=>setDraft(d=>({...d,id:e.target.value.toUpperCase().replace(/\s+/g,"_")}))} placeholder="TLE_A2" required/><small>Exemple : 3E, TLE_A1, TLE_A2. Lettres/chiffres et soulignements.</small></label>
        <div className="levels-two"><label>Libellé affiché<input value={draft.label} onChange={e=>setDraft(d=>({...d,label:e.target.value}))} placeholder="Tle A2" required/></label><label>Cycle / groupe<input value={draft.cycle} onChange={e=>setDraft(d=>({...d,cycle:e.target.value}))} placeholder="BAC" required/></label></div>
        <div className="levels-two"><label>Position<input type="number" min="0" step="1" value={draft.position} onChange={e=>setDraft(d=>({...d,position:e.target.value}))} required/></label><label>Clé d’icône<input value={draft.icon_key} onChange={e=>setDraft(d=>({...d,icon_key:e.target.value}))} placeholder="calculator"/></label></div>
        <label>Description courte<input value={draft.tagline} onChange={e=>setDraft(d=>({...d,tagline:e.target.value}))} placeholder="Facultatif"/></label>
        <label className="levels-active"><input type="checkbox" checked={draft.is_active} onChange={e=>setDraft(d=>({...d,is_active:e.target.checked}))}/><span><strong>Disponible dans l’application élève</strong><small>La désactivation masque la classe du choix Android, sans supprimer ses données.</small></span></label>
      </div>
      <div className="levels-form-actions"><button className="primary" type="submit" disabled={saving||busy}><Save size={15}/>{saving?"Enregistrement…":editingId?"Enregistrer":"Créer la classe"}</button>{editingId&&<button className="secondary" type="button" onClick={reset} disabled={saving}><X size={15}/> Annuler</button>}</div>
    </form>
    <div className="panel levels-list">
      <div className="panel-heading"><div><h3>Catalogue des classes</h3><p>{levels.length} classe(s)/série(s), actives et désactivées</p></div><span className="levels-count">{levels.filter(x=>x.is_active).length} actives</span></div>
      {levels.length===0?<div className="empty-state"><p>Aucune classe configurée dans Supabase.</p></div>:<div className="levels-items">{[...levels].sort((a,b)=>a.position-b.position||a.id.localeCompare(b.id)).map(level=><article className={`level-card ${level.is_active?"":"level-card-off"}`} key={level.id}>
        <div className="level-order">{level.position}</div><div className="level-main"><div className="level-title"><strong>{level.label}</strong><span className={`level-status ${level.is_active?"on":"off"}`}>{level.is_active?"Active":"Désactivée"}</span></div><small>{level.cycle||"Cycle non défini"} · <code>{level.id}</code></small>{level.tagline&&<p>{level.tagline}</p>}</div>
        <div className="level-actions"><button className="icon-button" type="button" title="Modifier" disabled={saving||busy} onClick={()=>{setEditingId(level.id);setDraft(fromLevel(level));onNotice("");}}><Edit3 size={15}/></button><button className="icon-button" type="button" title={level.is_active?"Désactiver":"Activer"} disabled={saving||busy} onClick={()=>void toggle(level)}>{level.is_active?<X size={15}/>:<Check size={15}/>}</button><button className="icon-button danger" type="button" title="Supprimer si inutilisée" disabled={saving||busy} onClick={()=>void remove(level)}><Trash2 size={15}/></button></div>
      </article>)}</div>}
    </div>
  </div>;
}
