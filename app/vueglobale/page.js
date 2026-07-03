'use client';
import React, { useState, useEffect, useCallback } from 'react';

function safeJSON(val, fallback=[]) {
  if(!val) return fallback;
  if(typeof val === 'string') {
    if(val.includes('[object')) return fallback;
    try { return JSON.parse(val); } catch(e) { return fallback; }
  }
  if(Array.isArray(val)) return val;
  if(typeof val === 'object') return val;
  return fallback;
}
import FichePatient from './fiche';
import { useRouter } from 'next/navigation';

const NORMES = { sat:[94,100], fc:[50,100], ta_sys:[90,150], ta_dia:[60,95], temp:[36,38.4], dextro:[0.7,2.0] };
function isAnormal(val,k){const v=parseFloat(val);if(isNaN(v))return false;const[mn,mx]=NORMES[k]||[0,9999];return v<mn||v>mx;}
function hasAnomalie(p){return['sat','fc','ta_sys','ta_dia','temp'].some(k=>p[k]&&isAnormal(p[k],k));}
function duree(ts){const m=Math.floor((Date.now()-parseInt(ts))/60000);return m<60?m+'min':'H'+Math.floor(m/60);}

const statutColor = {attente_medecin:'#f59e0b',en_cours:'#0d9488',vu:'#10b981',transfert:'#8b5cf6'};
const LEGENDES = {pansement:'Pansement',obs1:'Lit obs',obs2:'Fauteuil obs',lit1:'Lit 1',lit2:'Lit 2',fauteuil1:'Fauteuil 1',fauteuil2:'Fauteuil 2',brancard1:'Brancard 1',brancard2:'Brancard 2'};

const C = {
  pansement:'#f59e0b', obs1:'#8b5cf6', obs2:'#8b5cf6',
  lit1:'#3b82f6', lit2:'#3b82f6', fauteuil1:'#16a34a', fauteuil2:'#16a34a',
  brancard1:'#ef4444', brancard2:'#ef4444'
};
const C_BG = {
  pansement:'#fffbeb', obs1:'#f5f3ff', obs2:'#f5f3ff',
  lit1:'#f8fbff', lit2:'#f8fbff', fauteuil1:'#f8fff9', fauteuil2:'#f8fff9',
  brancard1:'#fff8f8', brancard2:'#fff8f8'
};
const C_DIV = {
  pansement:'#fde68a', obs1:'#ddd6fe', obs2:'#ddd6fe',
  lit1:'#bfdbfe', lit2:'#bfdbfe', fauteuil1:'#bbf7d0', fauteuil2:'#bbf7d0',
  brancard1:'#fecaca', brancard2:'#fecaca'
};
const BG = {
  pansement:'#fffbeb', obs1:'#eff6ff', obs2:'#f0fdf4',
  lit1:'#eff6ff', lit2:'#eff6ff', fauteuil1:'#f0fdf4', fauteuil2:'#f0fdf4',
  brancard1:'#fef2f2', brancard2:'#fef2f2'
};

function fmtLocalDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function BoutonPanne({ router, user }) {
  const [open, setOpen] = React.useState(false);
  const [pannes, setPannes] = React.useState([]);
  const [date, setDate] = React.useState(fmtLocalDate(new Date()));
  const [loading, setLoading] = React.useState(false);

  const charger = React.useCallback(()=>{
    fetch('/api/pannes').then(r=>r.json()).then(d=>setPannes(d.pannes||[])).catch(()=>{});
  },[]);

  React.useEffect(()=>{ charger(); const iv=setInterval(charger,30000); return()=>clearInterval(iv); },[charger]);

  const today = fmtLocalDate(new Date());
  const hier = fmtLocalDate(new Date(Date.now()-86400000));
  const heureActuelle = new Date().getHours();
  const panneActive = pannes.some(p=>
    (p.date===today && p.creneau==='jour' && heureActuelle>=7 && heureActuelle<19) ||
    (p.date===today && p.creneau==='nuit' && heureActuelle>=19) ||
    (p.date===hier && p.creneau==='nuit' && heureActuelle<7)
  );

  async function declarer(creneau) {
    setLoading(true);
    await fetch('/api/pannes', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({date, creneau, par: user?.nom||user?.matricule})});
    await charger();
    setLoading(false);
  }
  async function supprimer(p) {
    await fetch('/api/pannes', {method:'DELETE', headers:{'Content-Type':'application/json'}, body: JSON.stringify({date:p.date, creneau:p.creneau})});
    charger();
  }

  const style = panneActive
    ? {padding:'7px 14px',borderRadius:8,background:'#ea580c',color:'#fff',fontSize:12,fontWeight:700,border:'none',cursor:'pointer',animation:'pulsePanne 1.5s infinite'}
    : {padding:'7px 14px',borderRadius:8,background:'#f3f4f6',color:'#374151',fontSize:12,fontWeight:500,border:'1px solid #e5e7eb',cursor:'pointer'};

  return (
    <div style={{position:'relative'}}>
      <button onClick={()=>setOpen(o=>!o)} style={style}>
        {panneActive ? '⚡ Panne en cours' : '⚡ Panne'}
      </button>
      {open && (
        <>
          <div onClick={()=>setOpen(false)} style={{position:'fixed',inset:0,zIndex:40}}/>
          <div style={{position:'absolute',top:44,right:0,zIndex:50,background:'#fff',border:'1px solid #e5e7eb',borderRadius:12,boxShadow:'0 8px 24px rgba(0,0,0,0.15)',padding:16,width:320}}>
            <div style={{fontWeight:700,fontSize:13,color:'#111827',marginBottom:4}}>Signaler une panne informatique</div>
            <div style={{fontSize:11,color:'#6b7280',marginBottom:12,lineHeight:1.4}}>
              Marque le créneau concerné pour lisser les statistiques (données manquantes plutôt qu'une vraie baisse d'activité). Pensez à noter à la main le téléphone et l'adresse des patients prélevés — utilisez le bouton « + Ajouter » dans Prélevés.
            </div>
            <label style={{fontSize:11,fontWeight:600,color:'#374151'}}>Date de la panne</label>
            <input type="date" value={date} onChange={e=>setDate(e.target.value)}
              style={{width:'100%',padding:'7px 10px',borderRadius:7,border:'1px solid #e5e7eb',fontSize:13,margin:'4px 0 10px',boxSizing:'border-box'}}/>
            <div style={{display:'flex',gap:8,marginBottom:12}}>
              <button disabled={loading} onClick={()=>declarer('jour')}
                style={{flex:1,padding:'10px 8px',borderRadius:8,border:'1px solid #fed7aa',background:'#fff7ed',color:'#9a3412',fontWeight:700,fontSize:12,cursor:'pointer'}}>
                ☀️ 7h – 19h
              </button>
              <button disabled={loading} onClick={()=>declarer('nuit')}
                style={{flex:1,padding:'10px 8px',borderRadius:8,border:'1px solid #ddd6fe',background:'#f5f3ff',color:'#5b21b6',fontWeight:700,fontSize:12,cursor:'pointer'}}>
                🌙 19h – 7h
              </button>
            </div>
            {pannes.length>0 && (
              <div style={{borderTop:'1px solid #f3f4f6',paddingTop:10}}>
                <div style={{fontSize:10,fontWeight:700,color:'#9ca3af',textTransform:'uppercase',marginBottom:6}}>Pannes déclarées récemment</div>
                <div style={{display:'flex',flexDirection:'column',gap:5,maxHeight:160,overflowY:'auto'}}>
                  {pannes.slice(0,15).map((p,i)=>(
                    <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:11,color:'#374151',background:'#f9fafb',borderRadius:6,padding:'5px 8px'}}>
                      <span>{new Date(p.date+'T00:00:00').toLocaleDateString('fr-FR')} · {p.creneau==='jour'?'7h–19h':'19h–7h'} <span style={{color:'#9ca3af'}}>({p.par})</span></span>
                      <button onClick={()=>supprimer(p)} title="Retirer cette panne" style={{border:'none',background:'none',color:'#ef4444',cursor:'pointer',fontSize:13,padding:'0 4px'}}>✕</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <button onClick={()=>setOpen(false)} style={{marginTop:12,width:'100%',padding:'7px',borderRadius:7,background:'#f3f4f6',color:'#6b7280',border:'none',fontSize:12,cursor:'pointer'}}>Fermer</button>
          </div>
        </>
      )}
      <style>{`@keyframes pulsePanne{0%,100%{opacity:1}50%{opacity:0.7}}`}</style>
    </div>
  );
}

function GuideSortiePopup({ prenom, onFermer }) {
  return (
    <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,zIndex:10001,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div style={{background:'#fff',borderRadius:16,width:520,maxHeight:'85vh',overflowY:'auto',padding:'24px',boxShadow:'0 24px 64px rgba(0,0,0,0.25)'}}>
        <div style={{fontWeight:800,fontSize:16,color:'#111827',marginBottom:14}}>📁 Où enregistrer le fichier de sortie</div>

        <div style={{fontSize:13,color:'#374151',lineHeight:1.7}}>
          <p>Bonjour {prenom||''},</p>
          <p>Les documents de sortie doivent être enregistrés dans un dossier accessible à la secrétaire, qui les intégrera plus tard dans DxCare.</p>
          <p>Pour cela, je vous montre le chemin à parcourir pour le premier patient. Par la suite, le chemin sera automatique et il suffira d'enregistrer en un clic dans le bon dossier.</p>
          <p><strong>Pour votre premier patient</strong>, cliquez sur "Sortie" puis sélectionnez la modalité de sortie (RAD ? Transfert ? GAV ?).</p>
          <p>Un nouvel onglet apparaît et vous propose d'imprimer. Sélectionnez l'imprimante et appuyez sur <strong>"Enregistrer en PDF"</strong>.</p>
          <p>Vous devez ensuite trouver le dossier <strong>"Sortie PDS"</strong>, accessible à la secrétaire. Voici le chemin :</p>
          <p style={{background:'#f9fafb',border:'1px solid #e5e7eb',borderRadius:8,padding:'10px 12px',fontFamily:'monospace',fontSize:12}}>
            Bureau → Service C (partagé) → Services médicaux → Dispensaire Kahani → Sortie PDS
          </p>
          <p>Enregistrez le fichier ici. Les prochaines sorties proposeront automatiquement ce même dossier "Sortie PDS".</p>
        </div>

        <div style={{display:'flex',flexDirection:'column',gap:8,marginTop:20}}>
          <button onClick={()=>onFermer(false)}
            style={{padding:'12px',borderRadius:10,background:'#0d9488',color:'#fff',fontSize:13,fontWeight:700,border:'none',cursor:'pointer'}}>
            J'ai compris — Bon courage !
          </button>
          <button onClick={()=>onFermer(true)}
            style={{padding:'8px',borderRadius:10,background:'none',color:'#6b7280',fontSize:12,fontWeight:500,border:'none',cursor:'pointer',textDecoration:'underline'}}>
            Revoir ce message à la prochaine sortie
          </button>
        </div>
      </div>
    </div>
  );
}

function OverlaySortie({ patient, onClose, onConfirm }) {
  const [modalite, setModalite] = React.useState('');
  const [moyen, setMoyen] = React.useState('');
  const p = patient;

  return (
    <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,zIndex:10000,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{background:'#fff',borderRadius:16,width:440,padding:'24px',boxShadow:'0 24px 64px rgba(0,0,0,0.25)'}}>
        <div style={{fontWeight:800,fontSize:16,color:'#111827',marginBottom:4}}>Fiche de sortie</div>
        <div style={{fontSize:13,color:'#6b7280',marginBottom:20}}>IPP {p.ipp||'—'} · {p.age} ans</div>

        <div style={{fontWeight:600,fontSize:13,color:'#374151',marginBottom:10}}>Modalité de sortie</div>
        <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:20}}>
          {[
            {id:'domicile',  label:'🏠 Retour à domicile'},
            {id:'pse',       label:'🚶 Parti sans attendre'},
            {id:'transfert', label:'🚑 Transfert Mamoudzou'},
            {id:'gav',       label:'🔒 GAV — Réquisition'},
            {id:'deces',     label:'🕊️ Décès'},
            {id:'erreur',    label:'⚠️ Annuler le dossier (erreur)'},
          ].map(opt=>(
            <button key={opt.id} onClick={()=>{setModalite(opt.id);if(opt.id!=='transfert')setMoyen('');}}
              style={{padding:'12px 16px',borderRadius:10,textAlign:'left',fontSize:13,fontWeight:600,cursor:'pointer',
                background:modalite===opt.id?(opt.id==='deces'?'#7f1d1d':opt.id==='transfert'?'#1e3a5f':opt.id==='gav'?'#312e81':opt.id==='pse'?'#c2410c':opt.id==='erreur'?'#4b5563':'#f0fdf4'):'#f9fafb',
                color:modalite===opt.id?(opt.id==='deces'||opt.id==='transfert'||opt.id==='gav'||opt.id==='pse'||opt.id==='erreur'?'#fff':'#15803d'):'#374151',
                border:'2px solid '+(modalite===opt.id?(opt.id==='deces'?'#7f1d1d':opt.id==='transfert'?'#1e3a5f':opt.id==='gav'?'#312e81':opt.id==='pse'?'#c2410c':opt.id==='erreur'?'#4b5563':'#16a34a'):'#e5e7eb')}}>
              {opt.label}
            </button>
          ))}
        </div>

        {modalite==='erreur'&&(
          <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:10,padding:'10px 14px',marginBottom:16,fontSize:12,color:'#991b1b'}}>
            ⚠️ Le dossier sera <strong>définitivement supprimé</strong> (aucun PDF, aucune trace dans les statistiques). À utiliser uniquement en cas d'erreur de création.
          </div>
        )}

        {modalite==='transfert'&&(
          <div style={{marginBottom:20}}>
            <div style={{fontWeight:600,fontSize:13,color:'#374151',marginBottom:8}}>Moyen de transport</div>
            <div style={{display:'flex',gap:8}}>
              {[
                {id:'ambulance', label:'🚑 Ambulance'},
                {id:'helicoptere', label:'🚁 Hélicoptère'},
                {id:'personnels', label:'🚗 Moyens personnels'},
              ].map(m=>(
                <button key={m.id} onClick={()=>setMoyen(m.id)}
                  style={{flex:1,padding:'10px 6px',borderRadius:8,fontSize:11,fontWeight:600,cursor:'pointer',textAlign:'center',
                    background:moyen===m.id?'#1e3a5f':'#f9fafb',
                    color:moyen===m.id?'#fff':'#374151',
                    border:'2px solid '+(moyen===m.id?'#1e3a5f':'#e5e7eb')}}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{display:'flex',gap:10,marginTop:8}}>
          <button onClick={onClose}
            style={{flex:1,padding:'12px',borderRadius:10,background:'#f3f4f6',color:'#6b7280',fontSize:13,fontWeight:600,border:'none',cursor:'pointer'}}>
            Annuler
          </button>
          <button
            disabled={!modalite||(modalite==='transfert'&&!moyen)}
            onClick={()=>onConfirm(modalite,moyen)}
            style={{flex:2,padding:'12px',borderRadius:10,fontSize:13,fontWeight:700,border:'none',cursor:'pointer',
              background:(!modalite||(modalite==='transfert'&&!moyen))?'#e5e7eb':(modalite==='deces'?'#7f1d1d':'#0d9488'),
              color:(!modalite||(modalite==='transfert'&&!moyen))?'#9ca3af':'#fff'}}>
            ✓ Confirmer la sortie
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PageVueGlobale() {
  const router = useRouter();
  const [user,setUser] = useState(null);
  const [patients,setPatients] = useState([]);
  const [sel,setSel] = useState(null);
  const [rx,setRx] = useState('');
  const [diag,setDiag] = useState('');
  const [orient,setOrient] = useState('');
  const [ficheOuverte,setFicheOuverte] = useState(null);
  const [fichesSortie,setFichesSortie] = useState(null); // patient en cours de sortie
  const [showSortis,setShowSortis] = useState(false);
  const [patientsSortis,setPatientsSortis] = useState([]);
  const [agents,setAgents] = useState([]); // présence temps réel, tous postes confondus
  const [guideSortieAAfficher,setGuideSortieAAfficher] = useState(false);
  const [guideSortieVisible,setGuideSortieVisible] = useState(false);
  const [acteIdeCible,setActeIdeCible] = useState(null); // null | 'nouveau' | patient existant (soins IDE deja enregistre par l'AS)
  const [acteIde,setActeIde] = useState({ipp:'',sexe:'',type:'',note:''});
  const [acteIdeEnvoi,setActeIdeEnvoi] = useState(false);

  const load = useCallback(async()=>{
    const r=await fetch('/api/patients');
    const d=await r.json();
    const ps=d.patients||[];
    setPatients(ps);
    if(sel){const u=ps.find(p=>p.id===sel.id);if(u)setSel(u);}
    return ps;
  },[sel?.id]);

  useEffect(()=>{
    const s=sessionStorage.getItem('pds_user');
    if(!s){router.push('/login');return;}
    const u=JSON.parse(s);
    setUser(u);load();
    const iv=setInterval(load,8000);
    return()=>clearInterval(iv);
  },[]);

  // Guide "où enregistrer le PDF de sortie" : affiché une fois au médecin,
  // lors de sa première sortie patient (voir GuideSortiePopup plus bas).
  useEffect(()=>{
    fetch('/api/guide-sortie').then(r=>r.json()).then(d=>{
      if(d.afficher) setGuideSortieAAfficher(true);
    }).catch(()=>{});
  },[]);
  useEffect(()=>{
    if(fichesSortie && guideSortieAAfficher) setGuideSortieVisible(true);
  },[fichesSortie]);
  function fermerGuideSortie(revoir) {
    fetch('/api/guide-sortie',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({revoir})}).catch(()=>{});
    setGuideSortieVisible(false);
    if(!revoir) setGuideSortieAAfficher(false);
  }

  // Présence temps réel : lecture de la liste des agents connectés (le battement
  // lui-même est envoyé globalement depuis le layout racine, sur toutes les pages).
  useEffect(()=>{
    function chargerAgents() {
      fetch('/api/presence').then(r=>r.json()).then(d=>setAgents(d.agents||[])).catch(()=>{});
    }
    chargerAgents();
    const ivAgents=setInterval(chargerAgents,10000);
    return()=>clearInterval(ivAgents);
  },[]);

  async function patch(id,data){
    await fetch('/api/patients',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'update',id,patch:data})});
    load();
  }
  async function addRx(id){
    if(!rx.trim())return;
    await fetch('/api/patients',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'addPrescription',id,prescription:{texte:rx,auteur:user.matricule}})});
    setRx('');load();
  }
  async function finaliser(id){
    await patch(id,{diagnostic:diag,orientation:orient,statut:orient.startsWith('transfert')?'transfert':'vu'});
    if(orient==='sortie'||orient==='rdv_consultation'){
      await fetch('/api/patients',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'discharge',id})});
    }
    setSel(null);setDiag('');setOrient('');load();
  }

  function ouvrirNouvelActeIde() {
    setActeIde({ipp:'',sexe:'',type:'',note:''});
    setActeIdeCible('nouveau');
  }
  function ouvrirActeIdeExistant(p) {
    setActeIde({ipp:p.ipp||'',sexe:p.sexe||'',type:p.soins_type||'',note:p.note_acte||''});
    setActeIdeCible(p);
  }
  async function soumettreActeIde() {
    if (!acteIde.ipp.trim() || !acteIde.type) return;
    setActeIdeEnvoi(true);
    if (acteIdeCible === 'nouveau') {
      await fetch('/api/patients',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
        action:'acteIdeDirect',
        patient:{ ipp:acteIde.ipp.trim(), sexe:acteIde.sexe||null, soins_type:acteIde.type, note_acte:acteIde.note.trim()||null }
      })});
    } else {
      const id = acteIdeCible.id;
      await fetch('/api/patients',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
        action:'update', id, patch:{ ipp:acteIde.ipp.trim(), sexe:acteIde.sexe||null, soins_type:acteIde.type, note_acte:acteIde.note.trim()||null }
      })});
      await fetch('/api/patients',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ action:'discharge', id })});
    }
    setActeIdeEnvoi(false);
    setActeIdeCible(null);
    setActeIde({ipp:'',sexe:'',type:'',note:''});
    load();
  }
  async function terminerSoinIde(id) {
    await fetch('/api/patients',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'discharge',id})});
    load();
  }

  if(!user)return null;
  const preau=patients.filter(p=>p.statut==='dehors'&&p.symptome!=='soins_ide');
  const soinsIDE=patients.filter(p=>p.statut==='dehors'&&p.symptome==='soins_ide');
  const enSalle=patients.filter(p=>p.statut!=='dehors');

  function labelSymptome(p) {
    if (p?.autre_motif) return p.autre_motif;
    const map = {
      coma:'Coma / Inconscience', detresse_respi:'Détresse respiratoire',
      asthme:'Asthme', douleur:'Douleur', fievre:'Fievre',
      vertige:'Vertige / Malaise', plaie:'Plaie', autre:'Autre'
    };
    let label = map[p?.symptome] || p?.symptome || '--';
    if(p?.symptome==='douleur') {
      try {
        const zones = typeof p?.douleur_zones==='string' ? JSON.parse(p.douleur_zones) : (p?.douleur_zones||[]);
        if(zones && zones.length>0) label += ' — '+zones.slice(0,2).map(z=>z.replace(/_/g,' ')).join(', ');
      } catch(e){}
    }
    if(p?.symptome_autre) label = p.symptome_autre;
    return label;
  }

  function couleurDuree(ts) {
    const h = (Date.now()-parseInt(ts)) / 3600000;
    if (h < 1) return {color:'#16a34a', label:'<1h'};
    if (h < 2) return {color:'#16a34a', label:'>1h'};
    if (h < 3) return {color:'#f59e0b', label:'>2h'};
    if (h < 4) return {color:'#f59e0b', label:'>3h'};
    if (h < 5) return {color:'#ef4444', label:'>4h'};
    if (h < 6) return {color:'#ef4444', label:'>5h'};
    return {color:'#ef4444', label:'>6h'};
  }

  function couleurConst(val, k) {
    const NORMES = {fc:[50,100],tas:[90,150],tad:[60,95],sat:[94,100],temp:[36,38.4],dextro:[0.7,2.0],hemocue:[8,18]};
    const v = parseFloat(val); if(isNaN(v)) return null;
    const [mn,mx] = NORMES[k]||[0,9999];
    if(v>=mn && v<=mx) return {color:'#16a34a',bg:'#f0fdf4'};
    const marge = (mx-mn)*0.2;
    if(v>=mn-marge && v<=mx+marge) return {color:'#f59e0b',bg:'#fffbeb'};
    return {color:'#ef4444',bg:'#fef2f2'};
  }

  function catPrescriptions(prescriptions) {
    const cats = {examens:[], therapeutique:[], soins:[]};
    prescriptions.filter(rx=>!rx.fait).forEach(rx => {
      if(rx.categorie === 'examen') cats.examens.push(rx);
      else if(rx.categorie === 'therapeutique') cats.therapeutique.push(rx);
      else cats.soins.push(rx);
    });
    return cats;
  }

  function imprimerSortie(p) {
    const presc = safeJSON(p?.prescriptions);
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Sortie IPP ${p.ipp||'?'}</title>
    <style>body{font-family:Arial,sans-serif;padding:2cm;max-width:800px;margin:auto}h1{font-size:18px;border-bottom:2px solid #333;padding-bottom:8px}table{width:100%;border-collapse:collapse;margin:12px 0}td,th{padding:6px 10px;border:1px solid #ddd;font-size:13px}th{background:#f3f4f6;font-weight:600}.sec{margin-top:16px;font-weight:bold;font-size:14px;color:#374151}</style>
    </head><body>
    <h1>Compte-rendu de passage — CMR Kahani</h1>
    <table><tr><th>IPP</th><td>${p.ipp||'--'}</td><th>DDN</th><td>${p.ddn||'--'}</td></tr>
    <tr><th>Sexe</th><td>${p.sexe||'--'}</td><th>Age</th><td>${p.age||'--'}</td></tr>
    <tr><th>Emplacement</th><td>${p.emplacement||'--'}</td><th>Arrivee</th><td>${p.arrivee?new Date(parseInt(p.arrivee)).toLocaleString('fr-FR'):'--'}</td></tr></table>
    <div class="sec">Motif</div><p>${p.symptome||'--'}${p.symptome_autre?' — '+p.symptome_autre:''}</p>
    <div class="sec">Constantes</div>
    <table><tr><th>FC</th><td>${p.fc||'--'} bpm</td><th>PAS/PAD</th><td>${p.tas||'--'}/${p.tad||'--'} mmHg</td></tr>
    <tr><th>Saturation</th><td>${p.sat||'--'} %</td><th>Temperature</th><td>${p.temp||'--'} °C</td></tr>
    <tr><th>Dextro</th><td>${p.dextro||'--'} g/L</td><th>Hemocue</th><td>${p.hemocue||'--'} g/dL</td></tr></table>
    <div class="sec">Anamnese</div><p>${p.anamnese||'--'}</p>
    <div class="sec">Examen clinique</div><p>${p.examen_clinique||'--'}</p>
    <div class="sec">Diagnostic</div><p>${p.diagnostic||'--'}</p>
    <div class="sec">Prescriptions</div>
    <table><tr><th>Prescription</th><th>Statut</th></tr>
    ${presc.map(r=>`<tr><td>${r.texte}</td><td>${r.fait?'Realise':'En attente'}</td></tr>`).join('')||'<tr><td colspan=2>Aucune prescription</td></tr>'}
    </table>
    <div class="sec">Evolution / Prise en charge</div><p>${p.prise_en_charge||'--'}</p>
    <p style="margin-top:2cm;font-size:11px;color:#9ca3af">Document genere le ${new Date().toLocaleString('fr-FR')} — PDS Kahani</p>
    </body></html>`;
    const filename = ['IPP'+(p.ipp||'inconnu'), p.ddn].filter(Boolean).join('_').replace(/\s+/g,'_') + '.pdf';
    const w = window.open('','_blank');
    w.document.write(html);
    w.document.close();
    w.onload = () => {
      w.document.title = filename;
      w.print();
    };
  }

  function Case({id,label}){
    const p=enSalle.find(x=>x.emplacement===id);
    const c=C[id]||'#9ca3af';
    const cbg=C_BG[id]||'#fff';
    const isSelected=ficheOuverte?.id===p?.id;
    const prescriptions = safeJSON(p?.prescriptions);
    const cats = catPrescriptions(prescriptions);
    const hasExamens = cats.examens.length > 0;
    const hasThera = cats.therapeutique.length > 0;
    const hasSoins = cats.soins.length > 0;
    const pam = p?.tas && p?.tad ? Math.round(parseFloat(p.tad)+(parseFloat(p.tas)-parseFloat(p.tad))/3) : null;
    const sexeSymbol = p?.sexe==='M'||p?.sexe==='Homme'?'♂':p?.sexe==='F'||p?.sexe==='Femme'?'♀':'';
    const [ippCopied, setIppCopied] = React.useState(false);
    function copierIpp(e) {
      e.stopPropagation();
      if (!p?.ipp) return;
      navigator.clipboard.writeText(p.ipp);
      setIppCopied(true);
      setTimeout(()=>setIppCopied(false), 10000);
    }

    return(
      <div onClick={()=>{if(!p)return;if(!p)return;setFicheOuverte(isSelected?null:p);if(p.statut==='attente_medecin')patch(p.id,{statut:'en_cours'});}}
        style={{background:'#fff',border:'0.5px solid #e5e7eb',borderRadius:16,cursor:p?'pointer':'default',
          position:'relative',overflow:'hidden',flex:1,display:'flex',flexDirection:'column',
          transition:'box-shadow 0.15s, transform 0.15s'
        }}
        onMouseEnter={e=>{if(p){e.currentTarget.style.boxShadow='0 6px 24px rgba(0,0,0,0.18)';e.currentTarget.style.transform='translateY(-2px)';}}}
        onMouseLeave={e=>{e.currentTarget.style.boxShadow=isSelected?'0 2px 12px rgba(0,0,0,0.1)':'none';e.currentTarget.style.transform='none';}}>

        {p ? (
          <div style={{margin:6,borderRadius:12,border:'3px solid '+c,background:cbg,padding:'7px 8px',display:'flex',gap:6,flex:1,overflow:'hidden'}}>

            {/* GAUCHE : identité + constantes */}
            <div style={{display:'flex',flexDirection:'column',gap:4,width:'55%',flexShrink:0}}>
              <div style={{display:'flex',gap:5,alignItems:'flex-start'}}>
                <div style={{fontWeight:800,fontSize:30,color:c,lineHeight:1,flexShrink:0}}>{label}</div>
                <div style={{minWidth:0,flex:1}}>
                  <div onClick={copierIpp} title="Copier l'IPP"
                    style={{display:'inline-flex',alignItems:'center',gap:4,fontWeight:700,fontSize:12,lineHeight:1.2,
                      padding:'1px 6px',borderRadius:5,cursor:p.ipp?'pointer':'default',
                      border:'1px solid '+(ippCopied?'#16a34a':'#e5e7eb'),
                      background:ippCopied?'#f0fdf4':'#f9fafb',
                      color:ippCopied?'#16a34a':'#111827',
                      maxWidth:'100%',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                    {ippCopied ? '✓ Copié' : 'IPP '+(p.ipp||'—')}
                  </div>
                  <div style={{color:'#6b7280',fontSize:9,marginTop:1,display:'flex',alignItems:'center',gap:3}}>
                    <span>{p.ddn?(()=>{const[y,m,d]=p.ddn.split('-');return d&&m&&y?`${d}/${m}/${y}`:p.ddn;})()+'· ':''}{p.age} ans</span>
                    {sexeSymbol&&<span style={{fontSize:15,fontWeight:800,color:c,lineHeight:1}}>{sexeSymbol}</span>}
                  </div>
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'2px 3px'}}>
                {[
                  {k:'fc',      v:p.fc,                                          l:'FC',  u:'bpm',  icon:'🫀'},
                  {k:'tas',     v:p.tas&&p.tad?p.tas+'/'+p.tad:p.tas||'--',     l:'TA',  u:'mmHg', icon:'🩸'},
                  {k:'sat',     v:p.sat||'--',                                   l:'Sat', u:'%',    icon:'💧'},
                  {k:'temp',    v:p.temp||'--',                                  l:'T°',  u:'°C',   icon:'🌡️'},
                  {k:'dextro',  v:p.dextro||'--',                                l:'Dex', u:'g/L',  icon:'🍬'},
                  {k:'hemocue', v:p.hemocue||'--',                               l:'Hb',  u:'g/dL', icon:'🔴'},
                ].map(({k,v,l,u,icon})=>{
                  const rawV = k==='tas'?p.tas:k==='sat'?p.sat:k==='temp'?p.temp:k==='dextro'?p.dextro:k==='hemocue'?p.hemocue:p.fc;
                  const col = rawV ? couleurConst(rawV, k==='tas'?'tas':k) : null;
                  return(
                    <div key={k} style={{background:'rgba(255,255,255,0.7)',borderRadius:4,padding:'2px 4px',border:'0.5px solid rgba(0,0,0,0.06)'}}>
                      <div style={{fontSize:7,color:'#9ca3af',display:'flex',alignItems:'center',gap:1}}><span style={{fontSize:8}}>{icon}</span>{l}</div>
                      <div style={{fontSize:10,fontWeight:700,color:col?.color||'#374151',whiteSpace:'nowrap'}}>{v} <span style={{fontSize:7,fontWeight:400,color:'#9ca3af'}}>{u}</span></div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* DROITE : motif en haut, cercles triangle, sortie en bas */}
            <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'space-between'}}>
              <div style={{fontSize:10,fontWeight:700,color:'#111827',textAlign:'center',lineHeight:1.2}}>{labelSymptome(p)}</div>
              <div style={{fontSize:9,color:'#9ca3af',textAlign:'center'}}>{p.arrivee?duree(p.arrivee):''}</div>
              {/* Cercle unique : nombre de prescriptions en attente */}
              {(() => {
                const enAttente = prescriptions.filter(r=>!r.fait&&!r.nonRealise).length;
                return (
                  <div style={{
                    width:36,height:36,borderRadius:'50%',
                    background:enAttente>0?c:'transparent',
                    border:'2px solid '+(enAttente>0?c:'#d1d5db'),
                    display:'flex',alignItems:'center',justifyContent:'center',
                    flexShrink:0,
                  }}>
                    {enAttente>0
                      ? <span style={{color:'#fff',fontSize:14,fontWeight:800,lineHeight:1}}>{enAttente}</span>
                      : <span style={{color:'#d1d5db',fontSize:11,fontWeight:600}}>—</span>
                    }
                  </div>
                );
              })()}
              <div style={{display:'flex',justifyContent:'flex-end',width:'100%'}}>
                <button onClick={e=>{e.stopPropagation();setFichesSortie(p);}}
                  style={{padding:'2px 7px',borderRadius:5,background:'#f3f4f6',color:'#6b7280',fontSize:9,fontWeight:600,border:'1px solid #e5e7eb',cursor:'pointer'}}>
                  Sortie →
                </button>
              </div>
            </div>

          </div>
        ):(
          <div style={{margin:5,borderRadius:8,border:'1.5px dashed '+c,background:cbg,flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:100,gap:4}}>
            <span style={{fontSize:24,fontWeight:800,color:c}}>{label}</span>
            <span style={{fontSize:10,color:c+'99'}}>{LEGENDES[id]}</span>
          </div>
        )}
      </div>
    );
  }

  const ROLE_PAR_POSTE = {_doc:'medecin', _med:'medecin', _ide:'ide', _as:'as'};

  function Poste({id,label,color}){
    const role = ROLE_PAR_POSTE[id];
    const connectes = agents.filter(a=>a.role===role);
    return(
      <div style={{flex:1,background:'#fff',border:'1.5px solid #e5e7eb',borderRadius:10,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:5,padding:'8px'}}>
        <div style={{width:9,height:9,borderRadius:'50%',background:color}}/>
        <span style={{fontSize:12,fontWeight:600,color:'#374151'}}>{label}</span>
        {connectes.length>0 ? (
          <div style={{display:'flex',flexDirection:'column',gap:1,alignItems:'center'}}>
            {connectes.map(a=>(
              <span key={a.matricule} style={{fontSize:11,color,fontWeight:500,textAlign:'center'}}>
                {role==='medecin'?'Dr '+a.nom:a.nom}
              </span>
            ))}
          </div>
        ) : (
          <span style={{fontSize:10,color:'#d1d5db',fontStyle:'italic'}}>Personne connecté</span>
        )}
      </div>
    );
  }

  function Salle({color, label, children, style={}}){
    return(
      <div style={{border:'2px solid '+color+'99',borderRadius:14,padding:6,display:'flex',flexDirection:'column',gap:6,...style}}>
        <div style={{fontSize:9,fontWeight:700,color:color,textTransform:'uppercase',letterSpacing:1,textAlign:'center',opacity:0.7,lineHeight:1}}>{label}</div>
        {children}
      </div>
    );
  }

  return(
    <div style={{height:'100vh',background:'#f3f4f6',display:'flex',flexDirection:'column',overflow:'hidden'}}>
      <nav style={{background:'#fff',borderBottom:'1px solid #e5e7eb',padding:'0 1.5rem',display:'flex',alignItems:'center',justifyContent:'space-between',height:52,flexShrink:0}}>
        <div style={{fontWeight:700,fontSize:16,color:'#111827'}}>PDS Kahani</div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <span style={{fontSize:12,color:'#9ca3af',marginRight:4}}>{user?.nom}</span>
          <button onClick={()=>{setFicheOuverte(null);setFichesSortie(null);setShowSortis(false);window.location.href='/nouveau-patient';}} style={{padding:'7px 16px',borderRadius:8,background:'#0d9488',color:'#fff',fontSize:13,fontWeight:600,border:'none',cursor:'pointer'}}>+ Nouveau patient</button>
          <button onClick={()=>router.push('/admin')} style={{padding:'7px 14px',borderRadius:8,background:'#f3f4f6',color:'#374151',fontSize:12,fontWeight:500,border:'1px solid #e5e7eb',cursor:'pointer'}}>Ajouter collègue</button>
          {(user.role==='medecin'||user.role==='secretaire')&&(
            <button onClick={()=>router.push('/stats-mensuelles')} style={{padding:'7px 14px',borderRadius:8,background:'#f3f4f6',color:'#374151',fontSize:12,fontWeight:500,border:'1px solid #e5e7eb',cursor:'pointer'}}>Statistiques</button>
          )}
          <button onClick={()=>router.push('/preleves')} style={{padding:'7px 14px',borderRadius:8,background:'#f3f4f6',color:'#374151',fontSize:12,fontWeight:500,border:'1px solid #e5e7eb',cursor:'pointer'}}>🧪 Prélevés</button>
          <BoutonPanne router={router} user={user}/>
          <button onClick={async()=>{
            setShowSortis(true);
            const r=await fetch('/api/patients?all=1');
            const d=await r.json();
            const cutoff=Date.now()-24*3600*1000;
            const sortis=(d.patients||[]).filter(p=>p.statut==='sorti'&&parseInt(p.sortie)>cutoff)
              .sort((a,b)=>parseInt(b.sortie)-parseInt(a.sortie));
            setPatientsSortis(sortis);
          }} style={{padding:'7px 14px',borderRadius:8,background:'#f3f4f6',color:'#374151',fontSize:12,fontWeight:500,border:'1px solid #e5e7eb',cursor:'pointer'}}>Patients sortis</button>
          <button onClick={()=>{sessionStorage.clear();router.push('/login');}} style={{padding:'7px 14px',borderRadius:8,background:'#f3f4f6',color:'#6b7280',fontSize:12,border:'1px solid #e5e7eb',cursor:'pointer'}}>Deconnexion</button>
        </div>
      </nav>

      <div style={{display:'flex',flex:1,overflow:'hidden',minHeight:0}}>
        <div style={{display:'flex',flex:1,overflow:'hidden',minHeight:0}}>
          <div style={{width:'100%',flexShrink:0,padding:'1rem',display:'flex',flexDirection:'column',minHeight:0}}>

            <div style={{
              display:'grid',
              gridTemplateColumns:'1fr 1fr 1fr 1fr',
              gridTemplateRows:'1fr 1fr 1fr',
              gap:8,
              flex:1,
              minHeight:0,
              position:'relative',
            }}>
              <div style={{gridColumn:1,gridRow:1,display:'flex'}}>
                <Case id="pansement" label="P1"/>
              </div>
              <div style={{gridColumn:2,gridRow:1,display:'flex'}}>
                <Poste id="_ide" label="IDE" color="#3b82f6"/>
              </div>
              <div style={{gridColumn:3,gridRow:1,display:'flex'}}>
                <Poste id="_med" label="Medecin" color="#0d9488"/>
              </div>
              <div style={{gridColumn:4,gridRow:1,display:'flex'}}>
                <Poste id="_as" label="AS" color="#f59e0b"/>
              </div>

              <div style={{
                gridColumn:1, gridRow:'2/4',
                border:'2px solid #16a34a99',borderRadius:12,
                display:'flex',flexDirection:'column',gap:6,padding:6
              }}>
                <Case id="obs1" label="O1"/>
                <Case id="obs2" label="O2"/>
              </div>

              <div style={{
                gridColumn:'2/4', gridRow:'2/4',
                border:'2px solid #9ca3af99',borderRadius:12,
                display:'grid',gridTemplateColumns:'1fr 1fr',gridTemplateRows:'1fr 1fr',gap:6,padding:6
              }}>
                <Case id="lit2" label="L2"/>
                <Case id="fauteuil1" label="F1"/>
                <Case id="fauteuil2" label="F2"/>
                <Case id="lit1" label="L1"/>
              </div>

              <div style={{
                gridColumn:4, gridRow:'2/4',
                border:'2px solid #ef444499',borderRadius:12,
                display:'flex',flexDirection:'column',gap:6,padding:6
              }}>
                <Case id="brancard1" label="B1"/>
                <Case id="brancard2" label="B2"/>
              </div>

            </div>
          </div>

        </div>

        {/* EN ATTENTE */}
        <div style={{width:210,flexShrink:0,background:'#fff',borderLeft:'1px solid #e5e7eb',padding:'1rem',display:'flex',flexDirection:'column',minHeight:0}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12,paddingBottom:10,borderBottom:'1px solid #f3f4f6'}}>
            <div style={{width:8,height:8,borderRadius:'50%',background:preau.length>0?'#f59e0b':'#e5e7eb'}}/>
            <span style={{fontWeight:700,fontSize:13,color:'#374151'}}>En attente</span>
            {preau.length>0&&<span style={{background:'#fef3c7',color:'#d97706',fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:99}}>{preau.length}</span>}
          </div>
          <div style={{flex:1,minHeight:0,display:'flex',flexDirection:'column',gap:6,overflowY:'auto'}}>
            {preau.map(p=>{
              const placesLibres=[
                {id:'brancard1',l:'B1'},{id:'brancard2',l:'B2'},
                {id:'fauteuil1',l:'F1'},{id:'fauteuil2',l:'F2'},
                {id:'obs1',l:'O1'},{id:'obs2',l:'O2'},
                {id:'lit1',l:'L1'},{id:'lit2',l:'L2'},
                {id:'pansement',l:'P1'},
              ].filter(x=>!enSalle.find(pt=>pt.emplacement===x.id));
              return(
              <div key={p.id} onClick={()=>setFicheOuverte(p)}
                style={{background:'#fffbeb',border:'1px solid #fde68a',borderRadius:10,padding:'10px 12px',flexShrink:0,cursor:'pointer',transition:'box-shadow 0.15s'}}
                onMouseEnter={e=>e.currentTarget.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)'}
                onMouseLeave={e=>e.currentTarget.style.boxShadow='none'}>
                <div style={{fontWeight:700,color:'#111827',fontSize:13}}>IPP {p.ipp||'—'} <span style={{fontSize:11,fontWeight:400,color:'#6b7280'}}>{p.age} ans</span></div>
                <div style={{color:'#d97706',fontSize:11,fontWeight:600,marginTop:2}}>{labelSymptome(p)||p.symptome||p.motifPrincipal}</div>
                <div style={{color:'#9ca3af',fontSize:10,marginTop:1}}>{p.arrivee?duree(p.arrivee):''}</div>
                <div style={{display:'flex',gap:5,marginTop:8}} onClick={e=>e.stopPropagation()}>
                  <select onChange={async e=>{
                    if(!e.target.value) return;
                    await patch(p.id,{statut:'attente_medecin',emplacement:e.target.value});
                    load();
                  }} defaultValue="" style={{flex:1,padding:'5px 4px',borderRadius:6,border:'1px solid #fde68a',fontSize:10,background:'#fff',cursor:'pointer'}}>
                    <option value="">Installer...</option>
                    {placesLibres.map(x=><option key={x.id} value={x.id}>{x.l}</option>)}
                  </select>
                  <button onClick={()=>setFichesSortie(p)} style={{padding:'4px 10px',borderRadius:6,background:'#f3f4f6',color:'#6b7280',fontSize:10,fontWeight:600,cursor:'pointer',border:'1px solid #e5e7eb',flexShrink:0}}>
                    Sortie
                  </button>
                </div>
              </div>
            );})}
            {[...Array(Math.max(4-preau.length,1))].map((_,i)=>(
              <div key={'e'+i} onClick={()=>{window.location.href='/nouveau-patient';}} style={{flexShrink:0,minHeight:72,borderRadius:10,border:'1.5px dashed #e5e7eb',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}
                onMouseEnter={e=>e.currentTarget.style.borderColor='#0d9488'}
                onMouseLeave={e=>e.currentTarget.style.borderColor='#e5e7eb'}>
                <div style={{width:28,height:28,borderRadius:7,border:'1.5px dashed #d1d5db',display:'flex',alignItems:'center',justifyContent:'center',color:'#d1d5db',fontSize:18}}>+</div>
              </div>
            ))}
          </div>

          {/* SOINS INFIRMIERS */}
          <div style={{marginTop:12,paddingTop:10,borderTop:'1px solid #f3f4f6'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <div style={{width:8,height:8,borderRadius:'50%',background:soinsIDE.length>0?'#3b82f6':'#e5e7eb'}}/>
                <span style={{fontWeight:700,fontSize:13,color:'#374151'}}>Soins IDE</span>
                {soinsIDE.length>0&&<span style={{background:'#eff6ff',color:'#3b82f6',fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:99}}>{soinsIDE.length}</span>}
              </div>
              <button onClick={ouvrirNouvelActeIde}
                style={{padding:'4px 10px',borderRadius:6,background:'#eff6ff',color:'#3b82f6',fontSize:11,fontWeight:700,border:'1px solid #bfdbfe',cursor:'pointer'}}>
                + Ajouter acte IDE
              </button>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              {soinsIDE.length===0&&<div style={{fontSize:11,color:'#9ca3af',fontStyle:'italic'}}>Aucun patient</div>}
              {soinsIDE.map(p=>{
                const typeLabel = p.soins_type==='bio'?'Biologie':p.soins_type==='injection'?'Injection':'Autre soin';
                const placesLibres=[
                  {id:'brancard1',l:'B1'},{id:'brancard2',l:'B2'},
                  {id:'fauteuil1',l:'F1'},{id:'fauteuil2',l:'F2'},
                  {id:'obs1',l:'O1'},{id:'obs2',l:'O2'},
                  {id:'lit1',l:'L1'},{id:'lit2',l:'L2'},
                  {id:'pansement',l:'P1'},
                ].filter(x=>!enSalle.find(pt=>pt.emplacement===x.id));
                return (
                  <div key={p.id} onClick={()=>ouvrirActeIdeExistant(p)}
                    style={{background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:8,padding:'8px 10px',flexShrink:0,cursor:'pointer'}}
                    onMouseEnter={e=>e.currentTarget.style.boxShadow='0 2px 8px rgba(0,0,0,0.08)'}
                    onMouseLeave={e=>e.currentTarget.style.boxShadow='none'}>
                    <div style={{fontWeight:700,color:'#111827',fontSize:12}}>IPP {p.ipp||'—'} <span style={{fontSize:10,fontWeight:400,color:'#6b7280'}}>{p.age} ans</span></div>
                    <div style={{color:'#3b82f6',fontSize:10,fontWeight:600,marginTop:2}}>{typeLabel}</div>
                    <div style={{color:'#9ca3af',fontSize:9,marginTop:1}}>{p.arrivee?duree(p.arrivee):''}</div>
                    <div style={{display:'flex',gap:4,marginTop:6}} onClick={e=>e.stopPropagation()}>
                      <select onChange={async e=>{if(!e.target.value)return;await patch(p.id,{statut:'attente_medecin',emplacement:e.target.value});load();}} defaultValue=""
                        style={{flex:1,padding:'4px 3px',borderRadius:5,border:'1px solid #bfdbfe',fontSize:9,background:'#fff',cursor:'pointer'}}>
                        <option value="">Installer...</option>
                        {placesLibres.map(x=><option key={x.id} value={x.id}>{x.l}</option>)}
                      </select>
                      <button onClick={()=>terminerSoinIde(p.id)} style={{padding:'3px 7px',borderRadius:5,background:'#f0fdf4',color:'#16a34a',fontSize:9,fontWeight:600,cursor:'pointer',border:'1px solid #bbf7d0',flexShrink:0}}>Fait</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* FICHE OVERLAY */}
      {ficheOuverte&&(
        <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,zIndex:9999,background:'#fff',display:'flex',flexDirection:'column',overflow:'hidden'}}>
          <FichePatient
            key={ficheOuverte?.id}
            patient={ficheOuverte}
            onClose={()=>setFicheOuverte(null)}
            onUpdate={async()=>{const ps=await load();if(ps&&ficheOuverte){const u=ps.find(x=>x.id===ficheOuverte.id);if(u)setFicheOuverte(u);}}}
            user={user}
            patients={patients}
          />
        </div>
      )}

      {/* GUIDE PREMIERE SORTIE (medecin) */}
      {fichesSortie && guideSortieVisible && (
        <GuideSortiePopup prenom={user?.nom} onFermer={fermerGuideSortie}/>
      )}

      {/* OVERLAY SORTIE */}
      {fichesSortie && !guideSortieVisible && (
        <OverlaySortie
          patient={fichesSortie}
          onClose={()=>setFichesSortie(null)}
          onConfirm={async(modalite,moyen)=>{
            const p=fichesSortie;
            if (modalite === 'erreur') {
              // Annulation : suppression complète du dossier, pas de PDF, pas de stat
              await fetch('/api/patients',{method:'POST',headers:{'Content-Type':'application/json'},
                body:JSON.stringify({action:'delete',id:p.id})});
              setFichesSortie(null);
              load();
              return;
            }
            // Imprimer PDF
            imprimerSortie({...p, modalite_sortie:modalite, moyen_sortie:moyen});
            // Discharge
            await fetch('/api/patients',{method:'POST',headers:{'Content-Type':'application/json'},
              body:JSON.stringify({action:'discharge',id:p.id,modalite_sortie:modalite,moyen_sortie:moyen})});
            setFichesSortie(null);
            load();
          }}
        />
      )}

      {/* MODAL ACTE IDE (nouveau : sans passage AS — ou complement d'un soin deja enregistre par l'AS) */}
      {acteIdeCible && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:10002,padding:16}}
          onClick={()=>setActeIdeCible(null)}>
          <div onClick={e=>e.stopPropagation()} style={{background:'#fff',borderRadius:14,padding:20,width:'100%',maxWidth:400}}>
            <div style={{fontWeight:700,fontSize:15,color:'#111827',marginBottom:4}}>💉 {acteIdeCible==='nouveau'?'Ajouter acte IDE':'Soin IDE — IPP '+(acteIdeCible.ipp||'?')}</div>
            <div style={{fontSize:11,color:'#6b7280',marginBottom:14,lineHeight:1.4}}>
              {acteIdeCible==='nouveau'
                ? "Pour un patient venu directement pour un prélèvement ou une injection, sans passage par l'accueil. Enregistré directement pour les statistiques, pas d'impression."
                : "Complétez l'acte réalisé puis validez. Enregistré directement pour les statistiques, pas d'impression."}
            </div>

            <label style={{fontSize:11,fontWeight:600,color:'#374151'}}>IPP *</label>
            <input value={acteIde.ipp} onChange={e=>setActeIde({...acteIde,ipp:e.target.value})} autoFocus
              style={{width:'100%',padding:'9px 10px',borderRadius:7,border:'1px solid #e5e7eb',fontSize:13,margin:'4px 0 10px',boxSizing:'border-box'}}/>

            <label style={{fontSize:11,fontWeight:600,color:'#374151'}}>Sexe</label>
            <div style={{display:'flex',gap:6,margin:'4px 0 10px'}}>
              <button onClick={()=>setActeIde({...acteIde,sexe:'M'})} type="button"
                style={{flex:1,padding:'9px',borderRadius:7,border:'1.5px solid '+(acteIde.sexe==='M'?'#3b82f6':'#e5e7eb'),background:acteIde.sexe==='M'?'#eff6ff':'#fff',color:acteIde.sexe==='M'?'#3b82f6':'#374151',fontWeight:600,fontSize:13,cursor:'pointer'}}>♂</button>
              <button onClick={()=>setActeIde({...acteIde,sexe:'F'})} type="button"
                style={{flex:1,padding:'9px',borderRadius:7,border:'1.5px solid '+(acteIde.sexe==='F'?'#ec4899':'#e5e7eb'),background:acteIde.sexe==='F'?'#fdf2f8':'#fff',color:acteIde.sexe==='F'?'#ec4899':'#374151',fontWeight:600,fontSize:13,cursor:'pointer'}}>♀</button>
            </div>

            <label style={{fontSize:11,fontWeight:600,color:'#374151'}}>Acte réalisé *</label>
            <div style={{display:'flex',flexDirection:'column',gap:6,margin:'4px 0 10px'}}>
              {[['bio','Biologie (prise de sang, ECBU...)'],['injection','Injection (IM, SC, IV...)'],['autre','Autre soin']].map(item=>(
                <button key={item[0]} onClick={()=>setActeIde({...acteIde,type:item[0]})} type="button"
                  style={{padding:'10px',borderRadius:8,fontWeight:600,fontSize:13,textAlign:'left',cursor:'pointer',
                    background:acteIde.type===item[0]?'#3b82f6':'#f9fafb',color:acteIde.type===item[0]?'#fff':'#374151',
                    border:'2px solid '+(acteIde.type===item[0]?'#3b82f6':'#e5e7eb')}}>
                  {item[1]}
                </button>
              ))}
            </div>

            <label style={{fontSize:11,fontWeight:600,color:'#374151'}}>Précision (optionnel)</label>
            <input value={acteIde.note} onChange={e=>setActeIde({...acteIde,note:e.target.value})} placeholder="Ex: Vitamine B12, pansement..."
              style={{width:'100%',padding:'9px 10px',borderRadius:7,border:'1px solid #e5e7eb',fontSize:13,margin:'4px 0 14px',boxSizing:'border-box'}}/>

            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>{setActeIdeCible(null);setActeIde({ipp:'',sexe:'',type:'',note:''});}}
                style={{flex:1,padding:'10px',borderRadius:8,background:'#f3f4f6',color:'#6b7280',border:'none',fontSize:13,cursor:'pointer'}}>
                Annuler
              </button>
              <button onClick={soumettreActeIde} disabled={acteIdeEnvoi||!acteIde.ipp.trim()||!acteIde.type}
                style={{flex:1,padding:'10px',borderRadius:8,background:(acteIdeEnvoi||!acteIde.ipp.trim()||!acteIde.type)?'#93c5fd':'#3b82f6',color:'#fff',border:'none',fontSize:13,fontWeight:600,cursor:(acteIdeEnvoi||!acteIde.ipp.trim()||!acteIde.type)?'not-allowed':'pointer'}}>
                {acteIdeEnvoi?'Enregistrement...':'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OVERLAY PATIENTS SORTIS */}
      {showSortis&&(
        <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,zIndex:9998,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center'}}
          onClick={()=>setShowSortis(false)}>
          <div onClick={e=>e.stopPropagation()} style={{background:'#fff',borderRadius:16,width:500,maxHeight:'80vh',display:'flex',flexDirection:'column',overflow:'hidden',boxShadow:'0 24px 64px rgba(0,0,0,0.2)'}}>
            <div style={{padding:'16px 20px',borderBottom:'1px solid #e5e7eb',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontWeight:700,fontSize:15,color:'#111827'}}>Patients sortis — dernières 24h</span>
              <button onClick={()=>setShowSortis(false)} style={{background:'#f3f4f6',border:'none',width:28,height:28,borderRadius:'50%',cursor:'pointer',fontSize:16,color:'#6b7280'}}>×</button>
            </div>
            <div style={{flex:1,overflowY:'auto',padding:12}}>
              {patientsSortis.length===0&&<div style={{color:'#9ca3af',textAlign:'center',padding:'2rem',fontSize:13}}>Aucun patient sorti dans les dernières 24h</div>}
              {patientsSortis.map(p=>(
                <div key={p.id} style={{background:'#f9fafb',borderRadius:10,padding:'10px 14px',marginBottom:8,display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,fontSize:13,color:'#111827',flexWrap:'wrap'}}>
                    <span style={{fontWeight:700}}>{p.sexe==='M'?'♂':p.sexe==='F'?'♀':'—'}</span>
                    <span>{p.age?p.age+' ans':'—'}</span>
                    <span style={{color:'#6b7280'}}>{p.ddn?(()=>{const[y,m,d]=p.ddn.split('-');return d&&m&&y?`${d}/${m}/${y}`:p.ddn;})():'—'}</span>
                    <span style={{fontWeight:700}}>IPP {p.ipp||'—'}</span>
                    <span style={{color:'#6b7280'}}>
                      sorti le {p.sortie?new Date(parseInt(p.sortie)).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric'}):'--'} à {p.sortie?new Date(parseInt(p.sortie)).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}).replace(':','h'):'--'}
                    </span>
                  </div>
                  <button onClick={async()=>{
                    // Vérifier si l'emplacement est libre
                    const placeLibre = !patients.find(x=>x.emplacement===p.emplacement);
                    const emplacement = placeLibre ? p.emplacement : null;
                    await fetch('/api/patients',{method:'POST',headers:{'Content-Type':'application/json'},
                      body:JSON.stringify({action:'restore',id:p.id,emplacement})});
                    setShowSortis(false);
                    load();
                  }} style={{padding:'6px 12px',borderRadius:7,background:'#fef3c7',color:'#d97706',fontSize:11,fontWeight:600,border:'1px solid #fde68a',cursor:'pointer',flexShrink:0}}>
                    Annuler sortie
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
