'use client';
import { useState, useRef, useEffect } from 'react';

function safeJSON(val, fallback=[]) {
  if (!val) return fallback;
  if (Array.isArray(val)) return val;
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch { return fallback; }
}

function useDebounce(fn, delay) {
  const t = useRef(null);
  return (...args) => { clearTimeout(t.current); t.current = setTimeout(() => fn(...args), delay); };
}

const EXAMEN_NORMAL_ADULTE = `Neurologique : Glasgow 15, pas de déficit sensitivo-moteur, pas de signe méningé.
Cardio-vasculaire : bruits du cœur réguliers, pouls périphériques perçus, pas d'œdème des membres inférieurs.
Pulmonaire : eupnéique, murmures vésiculaires présents et symétriques, pas de signe de lutte.
Abdominal : abdomen souple dépressible indolore, pas de défense, pas de masse palpable.`;

const EXAMEN_NORMAL_ENFANT = `Neurologique : conscient calme dans les bras des parents, 4 membres toniques, pas de déficit sensitivo-moteur.
Fontanelle antérieure souple et dépressible.
Cardio-vasculaire : bruits du cœur réguliers, TRC < 3 secondes, pas de pli cutané.
Pulmonaire : eupnéique, murmures vésiculaires présents et symétriques, pas de signe de lutte.
Abdominal : abdomen souple dépressible indolore.
ORL : gorge et tympans propres.`;

const EXAMENS_COMPL = [
  {id:'hemocue', label:'Hémocue', color:'#dc2626'},
  {id:'dextro', label:'Dextro', color:'#ea580c'},
  {id:'ecg', label:'ECG', color:'#dc2626'},
  {id:'crp', label:'CRP rapide', color:'#16a34a'},
  {id:'tdr_palu', label:'TDR Paludisme', color:'#16a34a'},
  {id:'tdr_dengue', label:'TDR Dengue', color:'#16a34a'},
  {id:'tdr_tet', label:'Tétanotop', color:'#16a34a'},
  {id:'bu', label:'BU', color:'#d97706'},
  {id:'bhcg', label:'bHCG urinaire', color:'#d97706'},
  {id:'bio_del', label:'Bio délocalisée', color:'#0891b2', sub:[
    {label:'NFS + CRP', color:'#7c3aed', note:'Tube violet'},
    {label:'Gaz du sang', color:'#16a34a', note:'Seringue héparinée'},
    {label:'Tropo / D-Dimère / BNP', color:'#0284c7', note:'Tube bleu/vert — à vérifier'},
    {label:'Iono / Créatinine / BHC', color:'#0891b2', note:''},
    {label:'Lipase', color:'#0891b2', note:''},
  ]},
  {id:'bio_mam', label:'Prélèvement Mamoudzou', color:'#0284c7', sub:[
    {label:'NFS', color:'#7c3aed', note:'Tube violet'},
    {label:'CRP', color:'#7c3aed', note:'Tube violet'},
    {label:'Iono', color:'#0891b2', note:''},
    {label:'Créatinine', color:'#0891b2', note:''},
    {label:'BHC', color:'#0891b2', note:''},
    {label:'Lipase', color:'#0891b2', note:''},
    {label:'Hémoculture', color:'#dc2626', note:'Flacon hémo'},
    {label:'ECBU', color:'#d97706', note:'Pot stérile'},
    {label:'Sérologie', color:'#0284c7', note:''},
    {label:'Bactério', color:'#6b7280', note:''},
  ]},
];

const SOINS = [
  {id:'drp', label:'DRP', color:'#3b82f6'},
  {id:'scoper', label:'Scopé', color:'#dc2626'},
  {id:'o2_lun', label:'O2 lunettes', color:'#0891b2'},
  {id:'o2_mas_moy', label:'O2 masque moyenne concentration', color:'#0891b2'},
  {id:'o2_mas_haut', label:'O2 masque haute concentration', color:'#0891b2'},
  {id:'demi_assis', label:'Demi-assis', color:'#0891b2'},
  {id:'assis_strict', label:'Assis strict', color:'#0891b2'},
  {id:'allonger', label:'Allongé strict', color:'#0891b2'},
  {id:'vvp1', label:'VVP n°1', color:'#7c3aed'},
  {id:'vvp2', label:'VVP n°2', color:'#7c3aed'},
  {id:'reprise_const', label:'Reprise constantes après thérapeutique', color:'#6b7280'},
  {id:'pst_simple', label:'Pansement simple', color:'#f59e0b'},
  {id:'pst_complexe', label:'Pansement complexe', color:'#f59e0b'},
  {id:'retrait_spu', label:'Retrait sonde urinaire', color:'#6b7280'},
  {id:'pose_spu', label:'Pose sonde urinaire', color:'#6b7280'},
  {id:'couv_survie', label:'Couverture de survie', color:'#6b7280'},
  {id:'educ_asthme', label:'Éducation thérapeutique asthme — salle observation — TV — play vidéo', color:'#0891b2'},
];

// ─── Bandeau constantes ───────────────────────────────────────────────────────

function ColC(v, k) {
  const N={fc:[50,100],tas:[90,150],tad:[60,95],sat:[94,100],temp:[36,38.4],dextro:[0.7,2.5],hemocue:[8,18]};
  const n=parseFloat(v); if(isNaN(n)) return null;
  const [mn,mx]=N[k]||[0,9999];
  return n<mn||n>mx ? '#ef4444' : '#16a34a';
}

function ConstBtn({ label, fk, unit, baseVal, history, onAdd }) {
  const [open, setOpen] = useState(false);
  const [val, setVal] = useState('');
  const inputRef = useRef(null);
  const latest = history.length ? history[history.length-1] : null;
  const cur = latest ? latest.val : baseVal;
  const color = cur&&cur!=='--' ? (ColC(cur,fk)||'#111827') : '#9ca3af';

  return (
    <div style={{position:'relative',display:'inline-block'}}>
      <div style={{background:'#f3f4f6',borderRadius:8,padding:'5px 10px',border:'1px solid #e5e7eb',minWidth:70,cursor:'default'}}>
        <div style={{fontSize:8,fontWeight:700,color:'#9ca3af',textTransform:'uppercase',letterSpacing:0.5,marginBottom:2}}>{label}</div>
        <div style={{display:'flex',alignItems:'baseline',gap:3,flexWrap:'nowrap'}}>
          {latest&&baseVal&&<span style={{fontSize:12,color:'#94a3b8',textDecoration:'line-through',marginRight:3,fontVariantNumeric:'tabular-nums'}}>{baseVal}</span>}
          <span style={{fontSize:17,fontWeight:700,color,lineHeight:1,fontVariantNumeric:'tabular-nums'}}>{cur||'—'}</span>
          {cur&&cur!=='--'&&cur!=='—'&&<span style={{fontSize:8,color:'#9ca3af'}}>{unit}</span>}
          <button
            onMouseDown={e=>{e.preventDefault();e.stopPropagation();setOpen(o=>{if(!o)setTimeout(()=>inputRef.current?.focus(),50);return !o;});setVal('');}}
            onMouseEnter={e=>e.currentTarget.style.cssText='font-size:11px;font-weight:700;color:#fff;background:#0d9488;border:1.5px solid #0d9488;border-radius:4px;padding:0 5px;cursor:pointer;line-height:16px;'}
            onMouseLeave={e=>e.currentTarget.style.cssText='font-size:11px;font-weight:700;color:#0d9488;background:transparent;border:1.5px solid #0d9488;border-radius:4px;padding:0 5px;cursor:pointer;line-height:16px;'}
            style={{fontSize:11,fontWeight:700,color:'#0d9488',background:'transparent',border:'1.5px solid #0d9488',borderRadius:4,padding:'0 5px',cursor:'pointer',lineHeight:'16px',marginLeft:2}}>+</button>
        </div>
      </div>
      {open&&(
        <div style={{position:'absolute',top:'110%',left:0,zIndex:9999,background:'#fff',border:'1px solid #e5e7eb',borderRadius:8,padding:'8px',boxShadow:'0 4px 16px rgba(0,0,0,0.12)',minWidth:120}}
          onMouseDown={e=>e.stopPropagation()}>
          <div style={{fontSize:10,color:'#6b7280',marginBottom:5}}>Nouvelle valeur ({unit})</div>
          <div style={{display:'flex',gap:4}}>
            <input ref={inputRef} value={val} onChange={e=>setVal(e.target.value)}
              onKeyDown={e=>{if(e.key==='Enter'&&val){onAdd(fk,label,val,unit);setOpen(false);}if(e.key==='Escape')setOpen(false);}}
              style={{width:60,fontSize:13,border:'1.5px solid #0d9488',borderRadius:5,padding:'3px 6px',outline:'none'}}/>
            <button onMouseDown={e=>{e.preventDefault();if(val){onAdd(fk,label,val,unit);setOpen(false);}}}
              style={{background:'#0d9488',color:'#fff',border:'none',borderRadius:5,padding:'3px 8px',cursor:'pointer',fontSize:12,fontWeight:600}}>✓</button>
          </div>
        </div>
      )}
    </div>
  );
}

function BUBtn({ baseVal, history, onAdd }) {
  const [open, setOpen] = useState(false);
  const latest = history.length ? history[history.length-1] : null;
  const cur = latest ? latest.val : baseVal;
  const PARAMS = [['leuco','Leuco'],['nitrite','Nitrite'],['sang','Sang'],['glucose','Glucose'],['cetone','Cétone']];
  const CROIX = ['+','++','+++'];
  const [sel, setSel] = useState({});
  return (
    <div style={{position:'relative',display:'inline-block'}}>
      <div style={{background:'#f3f4f6',borderRadius:8,padding:'5px 10px',border:'1px solid #e5e7eb'}}>
        <div style={{fontSize:8,fontWeight:700,color:'#9ca3af',textTransform:'uppercase',letterSpacing:0.5,marginBottom:2}}>BU</div>
        <div style={{display:'flex',alignItems:'center',gap:3,flexWrap:'nowrap'}}>
          {latest&&baseVal&&<span style={{fontSize:9,color:'#c4c9d0',textDecoration:'line-through',maxWidth:60,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{baseVal}</span>}
          <span title={cur||''} style={{fontSize:12,fontWeight:700,color:cur?'#3b82f6':'#9ca3af',cursor:'help'}}>{cur&&cur!=='—'?(cur.includes('Nég')&&!cur.includes('Leuco +')&&!cur.includes('Nitrite +')&&!cur.includes('Sang +')&&!cur.includes('Glucose +')&&!cur.includes('Cétone +')?'Négative':'Positive'):cur||'—'}</span>
          <button
            onMouseDown={e=>{e.preventDefault();e.stopPropagation();setOpen(o=>!o);setSel({});}}
            onMouseEnter={e=>e.currentTarget.style.cssText='font-size:11px;font-weight:700;color:#fff;background:#0d9488;border:1.5px solid #0d9488;border-radius:4px;padding:0 5px;cursor:pointer;line-height:16px;'}
            onMouseLeave={e=>e.currentTarget.style.cssText='font-size:11px;font-weight:700;color:#0d9488;background:transparent;border:1.5px solid #0d9488;border-radius:4px;padding:0 5px;cursor:pointer;line-height:16px;'}
            style={{fontSize:11,fontWeight:700,color:'#0d9488',background:'transparent',border:'1.5px solid #0d9488',borderRadius:4,padding:'0 5px',cursor:'pointer',lineHeight:'16px',flexShrink:0}}>+</button>
        </div>
      </div>
      {open&&(
        <div style={{position:'absolute',top:'110%',left:0,zIndex:9999,background:'#fff',border:'1px solid #e5e7eb',borderRadius:10,padding:'10px 12px',boxShadow:'0 8px 24px rgba(0,0,0,0.12)',minWidth:280}}
          onMouseDown={e=>e.stopPropagation()}>
          <div style={{fontSize:10,fontWeight:700,color:'#3b82f6',marginBottom:8}}>Bandelette urinaire</div>
          {PARAMS.map(([k,l])=>(
            <div key={k} style={{display:'flex',alignItems:'center',gap:6,marginBottom:6}}>
              <div onClick={()=>setSel(prev=>({...prev,[k]:prev[k]?null:'+' }))}
                style={{width:16,height:16,borderRadius:3,border:'1.5px solid '+(sel[k]?'#3b82f6':'#d1d5db'),background:sel[k]?'#3b82f6':'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                {sel[k]&&<span style={{color:'#fff',fontSize:10}}>✓</span>}
              </div>
              <span style={{fontSize:11,fontWeight:500,color:'#374151',width:55,flexShrink:0}}>{l}</span>
              {sel[k]&&CROIX.map(v=>(
                <button key={v} onMouseDown={e=>{e.preventDefault();setSel(prev=>({...prev,[k]:v}));}}
                  style={{padding:'2px 7px',borderRadius:4,fontSize:10,fontWeight:600,cursor:'pointer',
                    border:'1.5px solid '+(sel[k]===v?'#3b82f6':'#e5e7eb'),
                    background:sel[k]===v?'#3b82f6':'#fff',
                    color:sel[k]===v?'#fff':'#374151'}}>{v}</button>
              ))}
            </div>
          ))}
          <div style={{fontSize:11,color:'#9ca3af',marginBottom:8,marginTop:4}}>
            Paramètres non cochés = Négatif
          </div>
          <div style={{display:'flex',gap:6}}>
            <button onMouseDown={e=>{
              e.preventDefault();
              const parts = PARAMS.map(([k,l])=>sel[k]?`${l} ${sel[k]}`:`${l} Nég`).join(' / ');
              onAdd('bu_resultat','BU',parts,'');
              setOpen(false);
            }} style={{flex:1,padding:'6px',borderRadius:6,background:'#3b82f6',color:'#fff',fontSize:11,fontWeight:600,border:'none',cursor:'pointer'}}>Valider</button>
            <button onMouseDown={e=>{e.preventDefault();setOpen(false);}}
              style={{padding:'6px 10px',borderRadius:6,background:'#f3f4f6',color:'#6b7280',fontSize:11,border:'none',cursor:'pointer'}}>✕</button>
          </div>
        </div>
      )}
    </div>
  );
}

function QualBtn({ label, fk, options, baseVal, history, onAdd }) {
  const [open, setOpen] = useState(false);
  const latest = history.length ? history[history.length-1] : null;
  const cur = latest ? latest.val : baseVal;
  const isPos = cur==='Positif'||cur?.includes('barre');
  const color = cur ? (isPos?'#ef4444':'#16a34a') : '#9ca3af';

  return (
    <div style={{position:'relative',display:'inline-block'}}>
      <div style={{background:'#f3f4f6',borderRadius:8,padding:'5px 10px',border:'1px solid #e5e7eb',minWidth:70}}>
        <div style={{fontSize:8,fontWeight:700,color:'#9ca3af',textTransform:'uppercase',letterSpacing:0.5,marginBottom:2}}>{label}</div>
        <div style={{display:'flex',alignItems:'center',gap:3}}>
          {latest&&baseVal&&<span style={{fontSize:10,color:'#c4c9d0',textDecoration:'line-through'}}>{baseVal}</span>}
          <span style={{fontSize:14,fontWeight:700,color,lineHeight:1}}>{cur||'—'}</span>
          <button
            onMouseDown={e=>{e.preventDefault();e.stopPropagation();setOpen(o=>!o);}}
            onMouseEnter={e=>e.currentTarget.style.cssText='font-size:11px;font-weight:700;color:#fff;background:#0d9488;border:1.5px solid #0d9488;border-radius:4px;padding:0 5px;cursor:pointer;line-height:16px;'}
            onMouseLeave={e=>e.currentTarget.style.cssText='font-size:11px;font-weight:700;color:#0d9488;background:transparent;border:1.5px solid #0d9488;border-radius:4px;padding:0 5px;cursor:pointer;line-height:16px;'}
            style={{fontSize:11,fontWeight:700,color:'#0d9488',background:'transparent',border:'1.5px solid #0d9488',borderRadius:4,padding:'0 5px',cursor:'pointer',lineHeight:'16px',marginLeft:2}}>+</button>
        </div>
      </div>
      {open&&(
        <div style={{position:'absolute',top:'110%',left:0,zIndex:9999,background:'#fff',border:'1px solid #e5e7eb',borderRadius:8,padding:'6px',boxShadow:'0 4px 16px rgba(0,0,0,0.12)',display:'flex',flexWrap:'wrap',gap:4,minWidth:140}}
          onMouseDown={e=>e.stopPropagation()}>
          {options.map(opt=>(
            <button key={opt} onMouseDown={e=>{e.preventDefault();onAdd(fk,label,opt,'');setOpen(false);}}
              style={{padding:'4px 10px',borderRadius:5,border:'1px solid #e5e7eb',background:'#fff',cursor:'pointer',fontSize:11,fontWeight:600,
                color:opt==='Positif'||opt.includes('barre')?'#ef4444':'#16a34a'}}>
              {opt}
            </button>
          ))}
          <button onMouseDown={e=>{e.preventDefault();setOpen(false);}}
            style={{padding:'4px 8px',borderRadius:5,background:'#f3f4f6',color:'#9ca3af',border:'none',fontSize:11,cursor:'pointer'}}>✕</button>
        </div>
      )}
    </div>
  );
}

// ─── Composant principal ───────────────────────────────────────────────────────

export default function FichePatient({ patient, p: pProp, onClose, onUpdate, user, patients=[] }) {
  const p = patient || pProp;
  if (!p) return null;

  const role = user?.role;
  const initConst = safeJSON(p.constantes_post, []);
  const [localConst, setLocalConst] = useState(initConst);
  const [showEditIdentite, setShowEditIdentite] = useState(false);
  const [editIdentite, setEditIdentite] = useState({});

  function openEditIdentite() {
    const ddn = p.ddn||'';
    const [y,m,d] = ddn.split('-');
    const ddnAff = d&&m&&y ? `${d}/${m}/${y}` : ddn;
    setEditIdentite({nom:p.nom||'',prenom:p.prenom||'',ddn:ddnAff,ipp:p.ipp||'',age:p.age||'',sexe:p.sexe||''});
    setShowEditIdentite(true);
  }

  async function saveIdentite() {
    // Reconvertir DDN de JJ/MM/AAAA → AAAA-MM-JJ
    const ddn = editIdentite.ddn||'';
    const parts = ddn.includes('/') ? ddn.split('/') : ddn.split('-');
    const ddnSave = parts.length===3
      ? (parts[0].length===4 ? ddn.replace(/\//g,'-') : `${parts[2]}-${parts[1]}-${parts[0]}`)
      : ddn;
    await fetch('/api/patients',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({action:'update',id:p.id,patch:{
        nom:editIdentite.nom,prenom:editIdentite.prenom,ddn:ddnSave,
        ipp:editIdentite.ipp,age:editIdentite.age,sexe:editIdentite.sexe
      }})});
    onUpdate?.();
    setShowEditIdentite(false);
  }

  // Quand on ajoute une nouvelle constante pour hemocue/dextro,
  // on a besoin que la valeur initiale soit visible comme "ancienne"
  // -> on vérifie si localConst a déjà une entrée pour hemocue/dextro
  // si non ET que p.hemocue/p.dextro existe, on l'injecte virtuellement
  function getLatestWithBase(key, baseVal) {
    const m = localConst.filter(c=>c.key===key);
    if (m.length) return m[m.length-1];
    return null; // baseVal affiché directement
  }

  function hasUpdate(key) {
    return localConst.some(c=>c.key===key);
  }
  const [onglet, setOnglet] = useState(role==='ide' ? 'prescriptions' : 'clinique');
  const [anamnese, setAnamnese] = useState(p.anamnese||'');
  const [examen, setExamen] = useState(p.examen_clinique||'');
  const [evolution, setEvolution] = useState(p.evolution||'');
  const [diagnostic, setDiagnostic] = useState(p.diagnostic||'');
  const [ordonnance, setOrdonnance] = useState(p.ordonnance||'');
  const [prescriptions, setPrescriptions] = useState(safeJSON(p.prescriptions, []));
  const [transmissions, setTransmissions] = useState(safeJSON(p.transmissions_ide, []));
  const [copied, setCopied] = useState(false);
  const [subOpen, setSubOpen] = useState({});
  const [collapsed, setCollapsed] = useState({examens:true, therapeutique:true, soins:true});
  const [editField, setEditField] = useState(null);
  const [editVal, setEditVal] = useState('');
  const [ippCopied, setIppCopied] = useState(false);

  const dbSave = useDebounce(async (patch) => {
    await fetch('/api/patients', {method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({action:'update',id:p.id,patch})});
  }, 800);

  async function saveNow(patch) {
    await fetch('/api/patients', {method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({action:'update',id:p.id,patch})});
    onUpdate?.();
  }

  function addConst(key, label, val, unit, extra={}) {
    const updated = [...localConst, {key,label,val,unit,ts:Date.now()}];
    setLocalConst(updated);
    fetch('/api/patients', {method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({action:'update',id:p.id,patch:{constantes_post:JSON.stringify(updated),...extra}})});
  }

  function getLatest(key) {
    const m = localConst.filter(c=>c.key===key);
    return m.length ? m[m.length-1] : null;
  }

  function getVal(key, base) {
    const l = getLatest(key);
    return l ? l.val : base;
  }

  async function saveEditField(field, val) {
    setEditField(null);
    await saveNow({[field]:val});
  }

  function EditSpan({field, value, initVal, placeholder, w=70}) {
    if (editField===field) return (
      <span style={{display:'inline-flex',alignItems:'center',gap:2}}>
        <input autoFocus value={editVal} onChange={e=>setEditVal(e.target.value)}
          onKeyDown={e=>{if(e.key==='Enter')saveEditField(field,editVal);if(e.key==='Escape')setEditField(null);}}
          style={{fontSize:'inherit',fontWeight:'inherit',border:'none',borderBottom:'2px solid #0d9488',outline:'none',background:'transparent',width:w,padding:0}}/>
        <button onMouseDown={e=>{e.preventDefault();saveEditField(field,editVal);}} style={{fontSize:9,background:'#0d9488',color:'#fff',border:'none',borderRadius:3,padding:'1px 4px',cursor:'pointer'}}>✓</button>
        <button onMouseDown={e=>{e.preventDefault();setEditField(null);}} style={{fontSize:9,background:'#f3f4f6',color:'#6b7280',border:'none',borderRadius:3,padding:'1px 4px',cursor:'pointer'}}>✕</button>
      </span>
    );
    return (
      <span onClick={()=>{setEditField(field);setEditVal(initVal||value||'');}} style={{cursor:'pointer',borderBottom:'1px dashed #d1d5db'}}>
        {value||<span style={{color:'#d1d5db',fontStyle:'italic'}}>{placeholder}</span>}
      </span>
    );
  }

  // PAM calculée
  const tasCur = getVal('tas', p.tas);
  const tadCur = getVal('tad', p.tad);
  const pamVal = tasCur&&tadCur ? Math.round(parseFloat(tadCur)+(parseFloat(tasCur)-parseFloat(tadCur))/3) : null;
  const pamColor = pamVal ? (pamVal<65?'#ef4444':'#16a34a') : '#9ca3af';

  // Prescriptions
  async function ajouterRx(texte, categorie) {
    const rx = [...prescriptions, {texte,categorie,fait:false,nonRealise:false,ts:Date.now(),par:user?.matricule||'',parNom:user?.nom||''}];
    setPrescriptions(rx);
    await fetch('/api/patients',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({action:'update',id:p.id,patch:{prescriptions:JSON.stringify(rx)}})});
  }

  async function cocherRx(idx) {
    const rx=[...prescriptions];
    rx[idx]={...rx[idx],fait:true,faitPar:user?.matricule,faitNom:user?.nom,faitA:Date.now()};
    setPrescriptions(rx);
    await fetch('/api/patients',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({action:'update',id:p.id,patch:{prescriptions:JSON.stringify(rx)}})});
  }

  async function nonRealiserRx(idx, motif) {
    const rx=[...prescriptions];
    rx[idx]={...rx[idx],nonRealise:true,motifNonRealise:motif,faitPar:user?.matricule,faitNom:user?.nom,faitA:Date.now()};
    setPrescriptions(rx);
    await fetch('/api/patients',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({action:'update',id:p.id,patch:{prescriptions:JSON.stringify(rx)}})});
  }

  async function supprimerRx(idx) {
    const rx=prescriptions.filter((_,i)=>i!==idx);
    setPrescriptions(rx);
    await fetch('/api/patients',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({action:'update',id:p.id,patch:{prescriptions:JSON.stringify(rx)}})});
  }

  function resume() {
    const rxTxt = prescriptions.map(r=>`- [${r.fait?'FAIT':r.nonRealise?'NON RÉALISÉ':'EN ATTENTE'}] ${r.texte}${r.motifNonRealise?' ('+r.motifNonRealise+')':''}`).join('\n');
    return `=== RÉSUMÉ PDS KAHANI ===
Patient : ${p.nom} ${p.prenom} — ${p.age} ans
DDN : ${p.ddn||'--'} | IPP : ${p.ipp||'--'}
Arrivée : ${p.arrivee?new Date(parseInt(p.arrivee)).toLocaleString('fr-FR'):'--'}

MOTIF : ${p.symptome?.replace(/_/g,' ')||'--'}

CONSTANTES :
FC ${getVal('fc',p.fc)||'--'} | PAS ${getVal('tas',p.tas)||'--'} / PAD ${getVal('tad',p.tad)||'--'} | PAM ${pamVal||'--'} mmHg
Sat ${getVal('sat',p.sat)||'--'}% | T° ${getVal('temp',p.temp)||'--'}°C | Dextro ${getVal('dextro',p.dextro)||'--'} | Hb ${getVal('hemocue',p.hemocue)||'--'}

ANAMNÈSE :
${anamnese||'--'}

EXAMEN CLINIQUE :
${examen||'--'}

PRESCRIPTIONS :
${rxTxt||'Aucune'}

ÉVOLUTION :
${evolution||'--'}

DIAGNOSTIC :
${diagnostic||'--'}

ORDONNANCE DE SORTIE :
${ordonnance||'--'}
`;
  }

  const enAttente = prescriptions.filter(r=>!r.fait&&!r.nonRealise);
  const termines = prescriptions.filter(r=>r.fait||r.nonRealise);

  const inp = {width:'100%',padding:'10px 12px',borderRadius:8,border:'1.5px solid #e5e7eb',fontSize:13,outline:'none',boxSizing:'border-box',fontFamily:'system-ui',background:'#fff',resize:'vertical'};

  // ── BANDEAU ──────────────────────────────────────────────────────────────────

  const CONSTANTES_R1 = [
    {label:'FC',     fk:'fc',   unit:'bpm',  base:p.fc,   type:'num'},
    {label:'Sat',    fk:'sat',  unit:'%',    base:p.sat,  type:'num'},
    {label:'PAS',    fk:'tas',  unit:'mmHg', base:p.tas,  type:'num'},
    {label:'PAD',    fk:'tad',  unit:'mmHg', base:p.tad,  type:'num'},
    {label:'PAM',    fk:'pam',  unit:'mmHg', base:pamVal?.toString(), type:'fixed'},
    {label:'T°',     fk:'temp', unit:'°C',   base:p.temp, type:'num'},
    {label:'BU', fk:'bu_resultat', unit:'', base:p.bu_resultat, type:'bu'},
  ];

  const CONSTANTES_R2 = [
    {label:'Hémocue',   fk:'hemocue',     unit:'g/dL', base:p.hemocue,     type:'num'},
    {label:'Dextro',    fk:'dextro',      unit:'g/L',  base:p.dextro,      type:'num'},
    {label:'TDR Palu',  fk:'tdr_palu',    unit:'',     base:p.tdr_palu,    type:'qual', options:['Négatif','Positif']},
    {label:'TDR Dengue',fk:'tdr_dengue',  unit:'',     base:p.tdr_dengue,  type:'qual', options:['Négatif','Positif']},
    {label:'CRP',       fk:'crp_test',    unit:'',     base:p.crp_test,    type:'qual', options:['Nég','1 barre','2 barres','3 barres','4 barres']},
    {label:'Tétanotop', fk:'tdr_tet',     unit:'',     base:p.quicktest,   type:'qual', options:['Négatif','Positif']},
    {label:'bHCG',      fk:'bhcg_resultat',unit:'',    base:p.bhcg_resultat,type:'qual',options:['Négatif','Positif']},
  ];

  function renderConst(c) {
    if (c.type==='fixed') return (
      <div key={c.fk} style={{background:'#f3f4f6',borderRadius:8,padding:'5px 10px',border:'1px solid #e5e7eb',minWidth:70}}>
        <div style={{fontSize:8,fontWeight:700,color:'#9ca3af',textTransform:'uppercase',letterSpacing:0.5,marginBottom:2}}>{c.label} <span style={{fontWeight:400}}>auto</span></div>
        <div style={{display:'flex',alignItems:'baseline',gap:3}}>
          <span style={{fontSize:17,fontWeight:700,color:pamColor,lineHeight:1}}>{pamVal||'—'}</span>
          {pamVal&&<span style={{fontSize:8,color:'#9ca3af'}}>{c.unit}</span>}
        </div>
        {pamVal&&pamVal<65&&<div style={{fontSize:8,color:'#ef4444',fontWeight:700,marginTop:1}}>⚠ Bas</div>}
      </div>
    );
    if (c.type==='num') return (
      <ConstBtn key={c.fk} label={c.label} fk={c.fk} unit={c.unit} baseVal={c.base} history={localConst.filter(x=>x.key===c.fk)} onAdd={addConst}/>
    );
    if (c.type==='bu') return (
      <BUBtn key={c.fk} baseVal={c.base} history={localConst.filter(x=>x.key==='bu_resultat')} onAdd={addConst}/>
    );
    return (
      <QualBtn key={c.fk} label={c.label} fk={c.fk} unit={c.unit} options={c.options} baseVal={c.base} history={localConst.filter(x=>x.key===c.fk)} onAdd={addConst}/>
    );
  }

  // ── RENDU ─────────────────────────────────────────────────────────────────────

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',fontFamily:'system-ui',fontSize:13,overflow:'hidden'}}>

      {/* ── TIERS SUPÉRIEUR : BANDEAU ── */}
      <div style={{flexShrink:0,background:'#fff',borderBottom:'1px solid #e5e7eb'}}>

        {/* Ligne 1 : identité */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'7px 14px',borderBottom:'0.5px solid #f0f0f0'}}>
          <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
            <span style={{fontWeight:800,fontSize:15,color:'#111827'}}>{p.nom} {p.prenom}</span>
            <span style={{fontSize:12,color:'#6b7280'}}>{p.sexe==='M'?'♂':'♀'} · {p.age} ans</span>
            {p.ddn&&<span style={{fontSize:11,color:'#9ca3af'}}>{(()=>{const[y,m,d]=(p.ddn||'').split('-');return d&&m&&y?`${d}/${m}/${y}`:p.ddn;})()}</span>}
            <span onMouseDown={e=>{e.preventDefault();if(p.ipp){navigator.clipboard.writeText(p.ipp);setIppCopied(true);setTimeout(()=>setIppCopied(false),10000);}}}
              style={{display:'inline-flex',alignItems:'center',gap:5,borderRadius:6,padding:'2px 8px',border:'1px solid '+(ippCopied?'#0d9488':'#e5e7eb'),background:ippCopied?'#f0fdfa':'#f3f4f6',cursor:p.ipp?'pointer':'default',userSelect:'none'}}>
              <span style={{fontSize:9,color:ippCopied?'#0d9488':'#9ca3af',fontWeight:700,textTransform:'uppercase',letterSpacing:0.4}}>IPP</span>
              <span style={{fontSize:12,fontWeight:700,color:ippCopied?'#0d9488':'#374151',fontFamily:'monospace'}}>{p.ipp||'—'}</span>
              {ippCopied&&<span style={{fontSize:10,color:'#0d9488',fontWeight:700}}>✓</span>}
            </span>
            <button onMouseDown={e=>{e.preventDefault();openEditIdentite();}} title="Modifier l'identité"
              style={{fontSize:13,background:'none',border:'none',cursor:'pointer',color:'#9ca3af',padding:'0 2px'}}>✎</button>
            <span style={{fontSize:11,fontWeight:700,color:'#0d9488',background:'#f0fdfa',padding:'2px 8px',borderRadius:5,border:'0.5px solid #99f6e4'}}>
              {p.symptome?.replace(/_/g,' ')}
            </span>
          </div>
          <div style={{display:'flex',gap:6,alignItems:'center',flexShrink:0}}>
            <DeplacerBtn p={p} onUpdate={onUpdate} patients={patients}/>
            <button onClick={onClose} style={{background:'#f3f4f6',border:'1px solid #e5e7eb',width:26,height:26,borderRadius:'50%',cursor:'pointer',fontSize:14,color:'#6b7280',display:'flex',alignItems:'center',justifyContent:'center'}}>×</button>
          </div>
        </div>

        {/* Ligne 2 : constantes rangée 1 */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:5,padding:'6px 10px 4px'}}>
          {CONSTANTES_R1.map(renderConst)}
        </div>
        {/* Ligne 3 : constantes rangée 2 */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:5,padding:'0 10px 7px'}}>
          {CONSTANTES_R2.map(renderConst)}
        </div>
      </div>

      {/* ── DEUX TIERS INFÉRIEURS ── */}
      {role==='as' ? null : (
        <div style={{flex:1,display:'flex',flexDirection:'column',minHeight:0}}>

          {/* Onglets */}
          <div style={{display:'flex',borderBottom:'1px solid #e5e7eb',background:'#f9fafb',flexShrink:0}}>
            {[
              {id:'clinique',      l:'Clinique'},
              {id:'prescriptions', l:'Prescriptions'},
              {id:'evolution',     l:'Évolution & sortie'},
            ].map(t=>(
              <button key={t.id} onClick={()=>setOnglet(t.id)}
                style={{padding:'9px 16px',border:'none',background:'none',cursor:'pointer',fontSize:12,fontWeight:onglet===t.id?700:500,
                  color:onglet===t.id?'#0d9488':'#6b7280',
                  borderBottom:onglet===t.id?'2px solid #0d9488':'2px solid transparent'}}>
                {t.l}
              </button>
            ))}
          </div>

          {/* Contenu onglets */}
          <div style={{flex:1,overflow:'hidden',display:'flex',minHeight:0}}>

            {/* ── CLINIQUE ── */}
            {onglet==='clinique'&&(
              <div style={{flex:1,overflow:'auto',padding:14,display:'flex',flexDirection:'column',gap:12}}>
                <div style={{flex:1,display:'flex',flexDirection:'column',minHeight:0}}>
                  <label style={{fontSize:10,fontWeight:700,color:'#6b7280',textTransform:'uppercase',marginBottom:4}}>Anamnèse</label>
                  {role==='ide'
                    ? <div style={{...inp,flex:1,overflow:'auto',background:'#f9fafb',whiteSpace:'pre-wrap',lineHeight:1.6,color:'#374151'}}>{anamnese||<span style={{color:'#9ca3af'}}>Aucune anamnèse</span>}</div>
                    : <textarea value={anamnese} onChange={e=>{setAnamnese(e.target.value);dbSave({anamnese:e.target.value});}}
                        placeholder="Motif, histoire, antécédents, traitements..." style={{...inp,flex:1,resize:'none'}}/>
                  }
                </div>
                <div style={{flex:1,display:'flex',flexDirection:'column',minHeight:0}}>
                  <label style={{fontSize:10,fontWeight:700,color:'#6b7280',textTransform:'uppercase',marginBottom:4}}>Examen clinique</label>
                  {role==='ide'
                    ? <div style={{...inp,flex:1,overflow:'auto',background:'#f9fafb',whiteSpace:'pre-wrap',lineHeight:1.6,color:'#374151'}}>{examen||<span style={{color:'#9ca3af'}}>Aucun examen</span>}</div>
                    : <>
                        <div style={{display:'flex',gap:8,marginBottom:6}}>
                          {[{l:'Normal adulte',v:EXAMEN_NORMAL_ADULTE,c:'#16a34a',bg:'#f0fdf4',border:'#bbf7d0'},
                            {l:'Normal enfant',v:EXAMEN_NORMAL_ENFANT,c:'#3b82f6',bg:'#eff6ff',border:'#bfdbfe'}].map(o=>(
                            <button key={o.l} onClick={()=>{const nv=examen===o.v?'':o.v;setExamen(nv);dbSave({examen_clinique:nv});}}
                              style={{padding:'6px 12px',borderRadius:7,fontSize:11,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:6,
                                background:examen===o.v?o.c:o.bg,color:examen===o.v?'#fff':o.c,border:'1px solid '+o.border}}>
                              <span style={{width:14,height:14,borderRadius:3,border:'2px solid '+(examen===o.v?'#fff':o.c),background:examen===o.v?'#fff':'transparent',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9}}>
                                {examen===o.v&&<span style={{color:o.c}}>✓</span>}
                              </span>
                              {o.l}
                            </button>
                          ))}
                        </div>
                        <textarea value={examen} onChange={e=>{setExamen(e.target.value);dbSave({examen_clinique:e.target.value});}}
                          placeholder="Examen clinique..." style={{...inp,flex:1,resize:'none'}}/>
                      </>
                  }
                </div>
              </div>
            )}

            {/* ── PRESCRIPTIONS ── */}
            {onglet==='prescriptions'&&(
              role==='ide' ? (
                /* VUE IDE : 3 colonnes plein écran */
                <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
                  <div style={{flex:1,display:'flex',gap:0,minHeight:0}}>
                    {[
                      {cat:'examen',        titre:'🔬 Examens',     color:'#7c3aed'},
                      {cat:'therapeutique', titre:'💊 Thérapeutique',color:'#ea580c'},
                      {cat:'soin',          titre:'🩹 Soins',        color:'#d97706'},
                    ].map(({cat,titre,color})=>{
                      const items = prescriptions.filter(r=>r.categorie===cat);
                      return (
                        <div key={cat} style={{flex:1,borderRight:'1px solid #e5e7eb',display:'flex',flexDirection:'column',overflow:'hidden'}}>
                          <div style={{background:color+'18',padding:'10px 14px',borderBottom:'1px solid '+color+'22',flexShrink:0}}>
                            <span style={{fontWeight:700,color,fontSize:13}}>{titre}</span>
                          </div>
                          <div style={{flex:1,overflow:'auto',padding:10,display:'flex',flexDirection:'column',gap:6}}>
                            <AjouterNote cat={cat} color={color} p={p} user={user} transmissions={transmissions} setTransmissions={setTransmissions}/>
                            {items.length===0&&<div style={{color:'#9ca3af',fontSize:12,textAlign:'center',marginTop:8}}>Aucune prescription</div>}
                            {items.map((r,i)=>{
                              const gi=prescriptions.indexOf(r);
                              return <IDERxItem key={i} r={r} color={color} onCocher={()=>cocherRx(gi)} onNonRealise={(m)=>nonRealiserRx(gi,m)} user={user}
                                onCocherAvecResultat={(val,fk,label)=>{
                                  const rx=[...prescriptions];
                                  rx[gi]={...rx[gi],fait:true,resultat:val,faitPar:user?.matricule,faitNom:user?.nom,faitA:Date.now()};
                                  setPrescriptions(rx);
                                  fetch('/api/patients',{method:'POST',headers:{'Content-Type':'application/json'},
                                    body:JSON.stringify({action:'update',id:p.id,patch:{prescriptions:JSON.stringify(rx)}})});
                                  addConst(fk,label,val,'');
                                }}/>;
                            })}
                            {transmissions.filter(t=>t.categorie===cat).map((t,i)=>(
                              <div key={'n'+i} style={{padding:'8px 10px',borderRadius:8,border:'1.5px dashed '+color+'55',background:color+'08'}}>
                                <div style={{fontSize:12,color:'#374151'}}>{t.texte}</div>
                                <div style={{fontSize:9,color:'#9ca3af',marginTop:3}}>{t.nom} · {new Date(t.ts).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                </div>
              ) : (
                /* VUE MÉDECIN : catégories + colonne droite */
                <div style={{flex:1,display:'flex',minHeight:0,overflow:'hidden'}}>
                  <div style={{flex:1,overflow:'auto',padding:12,display:'flex',flexDirection:'column',gap:8}}>
                    {/* Examens */}
                    <CatSection titre="🔬 Examens complémentaires" color="#374151"
                      collapsed={collapsed.examens} onToggle={()=>setCollapsed(c=>({...c,examens:!c.examens}))}>
                      <div style={{padding:'8px 10px',display:'flex',flexWrap:'wrap',gap:5}}>
                        {EXAMENS_COMPL.map(e=>{
                          const deja=prescriptions.find(r=>!r.fait&&!r.nonRealise&&r.texte?.startsWith(e.label));
                          if(deja) return null;
                          if(e.sub) return <SubBtn key={e.id} e={e} prescriptions={prescriptions} onAjouter={ajouterRx} subOpen={subOpen} setSubOpen={setSubOpen}/>;
                          return <RxBtn key={e.id} label={e.label} color={e.color} onClick={()=>ajouterRx(e.label,'examen')}/>;
                        })}
                        <AutreLibre categorie="examen" onAjouter={ajouterRx}/>
                      </div>
                    </CatSection>
                    {/* Thérapeutique */}
                    <CatSection titre="💊 Thérapeutique" color="#374151"
                      collapsed={collapsed.therapeutique} onToggle={()=>setCollapsed(c=>({...c,therapeutique:!c.therapeutique}))}>
                      <TheraSection prescriptions={prescriptions} onAjouter={ajouterRx}/>
                    </CatSection>
                    {/* Soins */}
                    <CatSection titre="🩹 Soins" color="#374151"
                      collapsed={collapsed.soins} onToggle={()=>setCollapsed(c=>({...c,soins:!c.soins}))}>
                      <div style={{padding:'8px 10px',display:'flex',flexWrap:'wrap',gap:5}}>
                        {SOINS.map(s=>{
                          const deja=prescriptions.find(r=>!r.fait&&!r.nonRealise&&r.texte===s.label);
                          if(deja) return null;
                          return <RxBtn key={s.id} label={s.label} color={s.color} onClick={()=>ajouterRx(s.label,'soin')}/>;
                        })}
                        <AutreLibre categorie="soin" onAjouter={ajouterRx}/>
                      </div>
                    </CatSection>
                  </div>
                  {/* Colonne droite prescriptions */}
                  <div style={{width:230,borderLeft:'1px solid #e5e7eb',background:'#fafafa',display:'flex',flexDirection:'column',flexShrink:0}}>
                    <div style={{padding:'8px 12px',borderBottom:'1px solid #e5e7eb',fontSize:11,fontWeight:700,color:'#374151',display:'flex',alignItems:'center',gap:6}}>
                      Prescriptions
                      {enAttente.length>0&&<span style={{background:'#ef4444',color:'#fff',borderRadius:99,fontSize:9,padding:'1px 6px'}}>{enAttente.length}</span>}
                    </div>
                    <div style={{flex:1,overflow:'auto',padding:8}}>
                      {enAttente.map((r,i)=>{
                        const gi=prescriptions.indexOf(r);
                        const bc=r.categorie==='examen'?'#7c3aed':r.categorie==='therapeutique'?'#0d9488':'#f59e0b';
                        return (
                          <div key={i} style={{background:'#fff',border:'1px solid '+bc+'44',borderRadius:7,padding:'6px 8px',marginBottom:4}}>
                            <div style={{display:'flex',alignItems:'flex-start',gap:4}}>
                              <span style={{fontSize:10,flexShrink:0}}>{r.categorie==='examen'?'🔬':r.categorie==='therapeutique'?'💊':'🩹'}</span>
                              <div style={{flex:1,minWidth:0}}>
                                <div style={{fontSize:11,color:'#374151',lineHeight:1.3,display:'flex',alignItems:'center',gap:4,flexWrap:'wrap'}}>
                                  {r.texte.includes(' ×')
                                    ? <>
                                        <span>{r.texte.replace(/ ×\d+$/,'')}</span>
                                        <span style={{display:'inline-flex',alignItems:'center',gap:2,background:'#f3f4f6',borderRadius:5,padding:'1px 4px'}}>
                                          <button onMouseDown={e=>{e.preventDefault();e.stopPropagation();
                                            const m=r.texte.match(/ ×(\d+)$/);const n=m?Math.max(1,parseInt(m[1])-1):1;
                                            const rx=[...prescriptions];rx[gi]={...rx[gi],texte:r.texte.replace(/ ×\d+$/,' ×'+n)};
                                            setPrescriptions(rx);fetch('/api/patients',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'update',id:p.id,patch:{prescriptions:JSON.stringify(rx)}})});
                                          }} style={{width:14,height:14,border:'none',background:'#e5e7eb',borderRadius:3,cursor:'pointer',fontSize:11,lineHeight:'14px',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700}}>−</button>
                                          <span style={{fontSize:11,fontWeight:700,minWidth:14,textAlign:'center'}}>×{r.texte.match(/ ×(\d+)$/)?.[1]||1}</span>
                                          <button onMouseDown={e=>{e.preventDefault();e.stopPropagation();
                                            const m=r.texte.match(/ ×(\d+)$/);const n=m?parseInt(m[1])+1:2;
                                            const rx=[...prescriptions];rx[gi]={...rx[gi],texte:r.texte.replace(/ ×\d+$/,' ×'+n)};
                                            setPrescriptions(rx);fetch('/api/patients',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'update',id:p.id,patch:{prescriptions:JSON.stringify(rx)}})});
                                          }} style={{width:14,height:14,border:'none',background:'#e5e7eb',borderRadius:3,cursor:'pointer',fontSize:11,lineHeight:'14px',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700}}>+</button>
                                        </span>
                                      </>
                                    : <span>{r.texte}</span>
                                  }
                                </div>
                                <div style={{fontSize:8,color:'#9ca3af',marginTop:2}}>{r.parNom||r.par} · {r.ts?new Date(r.ts).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}):''}</div>
                              </div>
                              <button onClick={()=>supprimerRx(gi)} title="Supprimer"
                                style={{flexShrink:0,width:16,height:16,borderRadius:3,border:'1px solid #fecaca',background:'#fef2f2',color:'#ef4444',cursor:'pointer',fontSize:10,display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
                            </div>
                          </div>
                        );
                      })}
                      {termines.length>0&&<>
                        <div style={{fontSize:9,color:'#9ca3af',fontWeight:700,textTransform:'uppercase',margin:'8px 0 4px'}}>Terminées</div>
                        {termines.map((r,i)=>(
                          <div key={i} style={{background:'#f9fafb',borderRadius:6,padding:'4px 7px',marginBottom:3,display:'flex',gap:4,opacity:0.6}}>
                            <span style={{fontSize:9}}>{r.fait?'✓':'✕'}</span>
                            <div style={{flex:1}}>
                              <div style={{fontSize:10,color:'#6b7280',textDecoration:'line-through'}}>{r.texte}</div>
                              {r.faitA&&<div style={{fontSize:8,color:'#9ca3af'}}>{r.faitNom} · {new Date(r.faitA).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</div>}
                              {r.motifNonRealise&&<div style={{fontSize:8,color:'#ef4444'}}>{r.motifNonRealise}</div>}
                            </div>
                          </div>
                        ))}
                      </>}
                    </div>
                  </div>
                </div>
              )
            )}

            {/* ── ÉVOLUTION ── */}
            {onglet==='evolution'&&(
              <div style={{flex:1,overflow:'auto',padding:14,display:'flex',flexDirection:'column',gap:12}}>
                {role==='ide' ? <>
                  {evolution&&<div><label style={{fontSize:10,fontWeight:700,color:'#6b7280',textTransform:'uppercase',display:'block',marginBottom:4}}>Évolution</label><div style={{...inp,background:'#f9fafb',color:'#374151',whiteSpace:'pre-wrap'}}>{evolution}</div></div>}
                  {diagnostic&&<div><label style={{fontSize:10,fontWeight:700,color:'#6b7280',textTransform:'uppercase',display:'block',marginBottom:4}}>Diagnostic</label><div style={{...inp,background:'#f9fafb',color:'#374151'}}>{diagnostic}</div></div>}
                  {ordonnance&&<div><label style={{fontSize:10,fontWeight:700,color:'#6b7280',textTransform:'uppercase',display:'block',marginBottom:4}}>Ordonnance</label><div style={{...inp,background:'#f9fafb',color:'#374151',whiteSpace:'pre-wrap'}}>{ordonnance}</div></div>}
                  {!evolution&&!diagnostic&&!ordonnance&&<div style={{color:'#9ca3af',textAlign:'center',padding:'2rem'}}>Aucune évolution renseignée</div>}
                </> : <>
                  {p.symptome==='plaie'&&<SutureSection p={p} save={saveNow}/>}
                  <div>
                    <label style={{fontSize:10,fontWeight:700,color:'#6b7280',textTransform:'uppercase',display:'block',marginBottom:4}}>Évolution au dispensaire</label>
                    <textarea value={evolution} onChange={e=>{setEvolution(e.target.value);dbSave({evolution:e.target.value});}} rows={4} style={inp} placeholder="Évolution clinique..."/>
                  </div>
                  <div>
                    <label style={{fontSize:10,fontWeight:700,color:'#6b7280',textTransform:'uppercase',display:'block',marginBottom:4}}>Diagnostic</label>
                    <textarea value={diagnostic} onChange={e=>{setDiagnostic(e.target.value);dbSave({diagnostic:e.target.value});}} rows={3} style={inp} placeholder="Diagnostic retenu..."/>
                  </div>
                  <div>
                    <label style={{fontSize:10,fontWeight:700,color:'#6b7280',textTransform:'uppercase',display:'block',marginBottom:4}}>Ordonnance de sortie</label>
                    <textarea value={ordonnance} onChange={e=>{setOrdonnance(e.target.value);dbSave({ordonnance:e.target.value});}} rows={4} style={inp} placeholder="Traitements de sortie, conseils, suivi..."/>
                  </div>
                  <button onClick={()=>{navigator.clipboard.writeText(resume());setCopied(true);}}
                    style={{padding:'12px',borderRadius:8,background:copied?'#16a34a':'#111827',color:'#fff',fontSize:14,fontWeight:700,border:'none',cursor:'pointer',width:'100%',transition:'background 0.2s'}}>
                    {copied?<span>✓ Copié ! <span style={{fontSize:12,fontWeight:400}}>— Faire Ctrl+V dans le dossier DxCare pour coller</span></span>:'📋 Résumé — Copier pour DxCare'}
                  </button>
                </>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modale édition identité */}
      {showEditIdentite&&(
        <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,zIndex:10000,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{background:'#fff',borderRadius:14,padding:'24px',width:360,boxShadow:'0 24px 64px rgba(0,0,0,0.2)'}}>
            <div style={{fontWeight:700,fontSize:15,color:'#111827',marginBottom:16}}>Modifier l'identité</div>
            {[
              {label:'Nom',    field:'nom',    w:'100%', upper:true},
              {label:'Prénom', field:'prenom', w:'100%'},
              {label:'Sexe',   field:'sexe',   w:'100%', options:['M','F']},
              {label:'DDN',    field:'ddn',    w:'100%', placeholder:'JJ/MM/AAAA'},
              {label:'Âge',    field:'age',    w:'80px'},
              {label:'IPP',    field:'ipp',    w:'100%'},
            ].map(({label,field,w,upper,placeholder,options})=>(
              <div key={field} style={{marginBottom:10}}>
                <label style={{fontSize:10,fontWeight:700,color:'#6b7280',textTransform:'uppercase',display:'block',marginBottom:3}}>{label}</label>
                {options
                  ? <div style={{display:'flex',gap:8}}>
                      {options.map(o=><button key={o} onMouseDown={e=>{e.preventDefault();setEditIdentite(prev=>({...prev,[field]:o}));}}
                        style={{padding:'6px 16px',borderRadius:7,border:'1.5px solid '+(editIdentite[field]===o?'#0d9488':'#e5e7eb'),background:editIdentite[field]===o?'#f0fdfa':'#fff',color:editIdentite[field]===o?'#0d9488':'#374151',fontWeight:600,fontSize:13,cursor:'pointer'}}>
                        {o==='M'?'♂ Homme':'♀ Femme'}
                      </button>)}
                    </div>
                  : <input value={editIdentite[field]||''} onChange={e=>setEditIdentite(prev=>({...prev,[field]:upper?e.target.value.toUpperCase():e.target.value}))}
                      placeholder={placeholder||label}
                      style={{width:w,padding:'7px 10px',borderRadius:7,border:'1.5px solid #e5e7eb',fontSize:13,outline:'none',boxSizing:'border-box'}}/>
                }
              </div>
            ))}
            <div style={{display:'flex',gap:8,marginTop:16}}>
              <button onMouseDown={e=>{e.preventDefault();saveIdentite();}}
                style={{flex:1,padding:'10px',borderRadius:8,background:'#0d9488',color:'#fff',fontSize:13,fontWeight:700,border:'none',cursor:'pointer'}}>
                Enregistrer
              </button>
              <button onMouseDown={e=>{e.preventDefault();setShowEditIdentite(false);}}
                style={{padding:'10px 16px',borderRadius:8,background:'#f3f4f6',color:'#6b7280',fontSize:13,border:'none',cursor:'pointer'}}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CatSection({titre, color, collapsed, onToggle, children}) {
  return (
    <div style={{border:'1.5px solid '+color+'33',borderRadius:10,overflow:'visible'}}>
      <div style={{background:color+'18',padding:'7px 12px',display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'pointer',borderRadius:collapsed?8:'8px 8px 0 0'}}
        onClick={onToggle}>
        <span style={{fontWeight:700,color,fontSize:12}}>{titre}</span>
        <span style={{color,fontSize:12}}>{collapsed?'▶':'▼'}</span>
      </div>
      {!collapsed&&children}
    </div>
  );
}

function RxBtn({label, color, onClick}) {
  return (
    <button onClick={onClick}
      onMouseEnter={e=>{e.currentTarget.style.filter='brightness(0.85)';}}
      onMouseLeave={e=>{e.currentTarget.style.filter='none';}}
      style={{padding:'5px 10px',borderRadius:6,background:color+'15',color,border:'1.5px solid '+color+'55',fontSize:11,fontWeight:600,cursor:'pointer',transition:'filter 0.1s'}}>
      {label}
    </button>
  );
}

function SubBtn({e, prescriptions, onAjouter, subOpen, setSubOpen}) {
  const [pos, setPos] = useState({top:0,left:0});
  const btnRef = useRef(null);
  return (
    <div style={{position:'relative',display:'inline-block'}}>
      <button ref={btnRef} onClick={ev=>{
        const r=btnRef.current?.getBoundingClientRect();
        if(r)setPos({top:r.bottom+4,left:r.left});
        setSubOpen(s=>({...s,[e.id]:!s[e.id]}));
      }}
        onMouseEnter={ev=>{ev.currentTarget.style.filter='brightness(0.85)';}}
        onMouseLeave={ev=>{ev.currentTarget.style.filter='none';}}
        style={{padding:'5px 10px',borderRadius:6,background:e.color+'15',color:e.color,border:'1.5px solid '+e.color+'55',fontSize:11,fontWeight:600,cursor:'pointer'}}>
        {e.label} {subOpen[e.id]?'▲':'▼'}
      </button>
      {subOpen[e.id]&&(
        <div style={{position:'fixed',zIndex:9999,top:pos.top,left:pos.left,background:'#fff',border:'1.5px solid '+e.color+'44',borderRadius:10,padding:10,boxShadow:'0 8px 24px rgba(0,0,0,0.15)',minWidth:220,maxHeight:280,overflowY:'auto'}}>
          <div style={{fontSize:10,fontWeight:700,color:e.color,marginBottom:6,textTransform:'uppercase'}}>Cocher plusieurs</div>
          {e.sub.map(s=>{
            const sl = typeof s === 'string' ? s : s.label;
            const sc = typeof s === 'string' ? e.color : (s.color||e.color);
            const sn = typeof s === 'object' ? s.note : '';
            const deja=prescriptions.find(r=>!r.fait&&!r.nonRealise&&r.texte===e.label+' : '+sl);
            return (
              <div key={sl} onClick={()=>{if(!deja)onAjouter(e.label+' : '+sl,'examen');}}
                style={{padding:'5px 8px',borderRadius:5,cursor:deja?'default':'pointer',fontSize:11,color:deja?'#9ca3af':sc,fontWeight:600,display:'flex',alignItems:'center',gap:6,opacity:deja?0.5:1}}
                onMouseEnter={ev=>{if(!deja)ev.currentTarget.style.background=sc+'18';}}
                onMouseLeave={ev=>{ev.currentTarget.style.background='transparent';}}>
                <div style={{width:14,height:14,borderRadius:3,border:'1.5px solid '+(deja?'#9ca3af':sc),background:deja?sc:'#fff',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  {deja&&<span style={{color:'#fff',fontSize:9}}>✓</span>}
                </div>
                <div>
                  <div>{sl}</div>
                  {sn&&<div style={{fontSize:9,color:'#9ca3af',fontWeight:400}}>{sn}</div>}
                </div>
              </div>
            );
          })}
          <button onClick={()=>setSubOpen(s=>({...s,[e.id]:false}))} style={{marginTop:6,width:'100%',padding:'5px',borderRadius:6,background:'#f3f4f6',color:'#6b7280',border:'none',fontSize:11,cursor:'pointer'}}>Fermer</button>
        </div>
      )}
    </div>
  );
}

function AutreLibre({categorie, onAjouter}) {
  const [open, setOpen] = useState(false);
  const [val, setVal] = useState('');
  if (!open) return (
    <button onClick={()=>setOpen(true)}
      onMouseEnter={e=>e.currentTarget.style.filter='brightness(0.88)'}
      onMouseLeave={e=>e.currentTarget.style.filter='none'}
      style={{padding:'5px 10px',borderRadius:6,background:'#f3f4f6',color:'#6b7280',border:'1.5px solid #e5e7eb',fontSize:11,fontWeight:600,cursor:'pointer'}}>
      + Autre...
    </button>
  );
  return (
    <div style={{display:'flex',gap:4,alignItems:'center'}}>
      <input value={val} onChange={e=>setVal(e.target.value)} placeholder="Préciser..." autoFocus
        style={{padding:'4px 8px',borderRadius:5,border:'1px solid #e5e7eb',fontSize:11,outline:'none'}}
        onKeyDown={e=>{if(e.key==='Enter'&&val.trim()){onAjouter(val.trim(),categorie);setVal('');setOpen(false);}}}/>
      <button onClick={()=>{if(val.trim()){onAjouter(val.trim(),categorie);setVal('');setOpen(false);}}}
        style={{padding:'4px 8px',borderRadius:5,background:'#0d9488',color:'#fff',border:'none',fontSize:11,cursor:'pointer'}}>OK</button>
      <button onClick={()=>{setOpen(false);setVal('');}}
        style={{padding:'4px 6px',borderRadius:5,background:'#f3f4f6',color:'#6b7280',border:'none',fontSize:11,cursor:'pointer'}}>✕</button>
    </div>
  );
}


const CONST_RX_MAP = {
  'ECG':           {fk:'ecg',          label:'ECG',          type:'texte',  placeholder:'Normal sinusal, RS, BBG...'},
  'Dextro':        {fk:'dextro',        label:'Dextro',        type:'nombre', unite:'g/L'},
  'Hémocue':       {fk:'hemocue',       label:'Hémocue',       type:'nombre', unite:'g/dL'},
  'BU':            {fk:'bu_resultat',   label:'BU',            type:'bu'},
  'CRP test':      {fk:'crp_test',      label:'CRP',           type:'choix',  options:['Nég','1 barre','2 barres','3 barres','4 barres']},
  'TDR Paludisme': {fk:'tdr_palu',      label:'TDR Palu',      type:'choix',  options:['Négatif','Positif']},
  'TDR Dengue':    {fk:'tdr_dengue',    label:'TDR Dengue',    type:'choix',  options:['Négatif','Positif']},
  'Tétanotop':     {fk:'tdr_tet',       label:'Tétanotop',     type:'choix',  options:['Négatif','Positif']},
  'bHCG urinaire': {fk:'bhcg_resultat', label:'bHCG urinaire', type:'choix',  options:['Négatif','Positif']},
};

function IDERxItem({r, color, onCocher, onNonRealise, onCocherAvecResultat, user}) {
  const [showMotif, setShowMotif] = useState(false);
  const [motif, setMotif] = useState('');
  const [showResultat, setShowResultat] = useState(false);
  const [resultatVal, setResultatVal] = useState('');
  const [buVals, setBuVals] = useState({leuco:'Nég',nitrite:'Nég',cetone:'Nég',glucose:'Nég'});

  // Détecter si cette prescription correspond à une constante
  const constInfo = Object.entries(CONST_RX_MAP).find(([k])=>r.texte?.startsWith(k))?.[1];

  if (r.fait) return (
    <div style={{padding:'10px 12px',borderRadius:8,border:'1px solid #e5e7eb',background:'#f9fafb',opacity:0.6}}>
      <div style={{display:'flex',alignItems:'center',gap:8}}>
        <div style={{width:22,height:22,borderRadius:5,background:color,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          <span style={{color:'#fff',fontSize:12}}>✓</span>
        </div>
        <div>
          <div style={{fontSize:13,color:'#9ca3af',textDecoration:'line-through'}}>{r.texte}</div>
          {r.faitA&&<div style={{fontSize:10,color:'#16a34a',marginTop:2}}>Réalisé par {r.faitNom||r.faitPar} à {new Date(r.faitA).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</div>}
          {r.resultat&&<div style={{fontSize:11,color:'#374151',marginTop:2}}>{r.resultat}</div>}
        </div>
      </div>
    </div>
  );

  if (r.nonRealise) return (
    <div style={{padding:'10px 12px',borderRadius:8,border:'1px solid #fecaca',background:'#fef2f2',opacity:0.7}}>
      <div style={{fontSize:13,color:'#ef4444',textDecoration:'line-through'}}>{r.texte}</div>
      <div style={{fontSize:10,color:'#dc2626',marginTop:3}}>✕ {r.motifNonRealise||'Non réalisé'}</div>
    </div>
  );

  if (showMotif) return (
    <div style={{padding:'10px 12px',borderRadius:8,border:'2px solid #ef4444',background:'#fef2f2'}}>
      <div style={{fontSize:12,fontWeight:600,color:'#374151',marginBottom:6}}>{r.texte}</div>
      <div style={{fontSize:10,color:'#dc2626',marginBottom:6}}>Motif de non-réalisation</div>
      <input value={motif} onChange={e=>setMotif(e.target.value)} autoFocus placeholder="Patient parti, refus..." 
        style={{width:'100%',padding:'6px 8px',borderRadius:6,border:'1px solid #fecaca',fontSize:12,outline:'none',boxSizing:'border-box',marginBottom:6}}/>
      <div style={{display:'flex',gap:5}}>
        <button onClick={()=>{if(motif.trim())onNonRealise(motif.trim());}}
          style={{flex:1,padding:'6px',borderRadius:6,background:'#ef4444',color:'#fff',fontSize:11,fontWeight:600,border:'none',cursor:'pointer'}}>Confirmer</button>
        <button onClick={()=>{setShowMotif(false);setMotif('');}}
          style={{padding:'6px 10px',borderRadius:6,background:'#f3f4f6',color:'#6b7280',fontSize:11,border:'none',cursor:'pointer'}}>✕</button>
      </div>
    </div>
  );

  return (
    <div style={{borderRadius:8,border:'2px solid '+color+'55',background:'#fff',overflow:'hidden'}}>
      <div onClick={onCocher} style={{padding:'12px 14px',cursor:'pointer',display:'flex',alignItems:'center',gap:10,transition:'background 0.1s'}}
        onMouseEnter={e=>e.currentTarget.style.background=color+'11'}
        onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
        <div style={{width:22,height:22,borderRadius:5,border:'2px solid '+color,background:'#fff',flexShrink:0}}/>
        <div style={{flex:1}}>
          <div style={{fontSize:13,fontWeight:600,color:'#374151'}}>{r.texte}</div>
          {r.ts&&<div style={{fontSize:9,color:'#9ca3af',marginTop:2}}>Prescrit par {r.parNom||r.par} à {new Date(r.ts).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</div>}
        </div>
      </div>
      <div style={{borderTop:'1px solid '+color+'22',padding:'4px 14px',display:'flex',justifyContent:'flex-end'}}>
        <button onClick={()=>setShowMotif(true)}
          style={{padding:'2px 8px',borderRadius:4,background:'#fef2f2',color:'#ef4444',fontSize:9,fontWeight:600,border:'1px solid #fecaca',cursor:'pointer'}}>
          ✕ Non réalisé
        </button>
      </div>
      {showResultat&&constInfo&&(
        <div style={{padding:'10px 14px',borderTop:'1px solid '+color+'22',background:color+'06'}}>
          <div style={{fontSize:11,fontWeight:600,color:color,marginBottom:8}}>Résultat — {constInfo.label}</div>
          {constInfo.type==='choix'&&(
            <div style={{display:'flex',gap:5,flexWrap:'wrap',marginBottom:8}}>
              {constInfo.options.map(opt=>(
                <button key={opt} onMouseDown={e=>{e.preventDefault();setResultatVal(opt);}}
                  style={{padding:'4px 10px',borderRadius:5,border:'1.5px solid '+(resultatVal===opt?color:'#e5e7eb'),
                    background:resultatVal===opt?color:'#fff',color:resultatVal===opt?'#fff':color,fontSize:11,fontWeight:600,cursor:'pointer'}}>
                  {opt}
                </button>
              ))}
            </div>
          )}
          {constInfo.type==='nombre'&&(
            <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:8}}>
              <input autoFocus value={resultatVal} onChange={e=>setResultatVal(e.target.value)} placeholder={constInfo.unite}
                style={{width:80,padding:'5px 8px',borderRadius:6,border:'1.5px solid '+color,fontSize:13,fontWeight:600,outline:'none',textAlign:'center'}}/>
              <span style={{fontSize:12,color:'#6b7280'}}>{constInfo.unite}</span>
            </div>
          )}
          {constInfo.type==='texte'&&(
            <textarea autoFocus value={resultatVal} onChange={e=>setResultatVal(e.target.value)} placeholder={constInfo.placeholder||'Résultat...'}
              rows={2} style={{width:'100%',padding:'6px 8px',borderRadius:6,border:'1.5px solid '+color,fontSize:12,outline:'none',resize:'none',boxSizing:'border-box',marginBottom:8}}/>
          )}
          {constInfo.type==='bu'&&(
            <div style={{marginBottom:8}}>
              {[['leuco','Leucocytes'],['nitrite','Nitrites'],['cetone','Cétones'],['glucose','Glucose']].map(([k,l])=>(
                <div key={k} style={{display:'flex',alignItems:'center',gap:5,marginBottom:4}}>
                  <span style={{fontSize:10,width:65,flexShrink:0,fontWeight:500}}>{l}</span>
                  {['Nég','+','++','+++'].map(v=>(
                    <button key={v} onMouseDown={e=>{e.preventDefault();setBuVals(prev=>({...prev,[k]:v}));}}
                      style={{padding:'2px 7px',borderRadius:4,fontSize:10,fontWeight:600,cursor:'pointer',
                        border:'1.5px solid '+(buVals[k]===v?color:'#e5e7eb'),
                        background:buVals[k]===v?color:'#fff',color:buVals[k]===v?'#fff':'#374151'}}>{v}</button>
                  ))}
                </div>
              ))}
            </div>
          )}
          <div style={{display:'flex',gap:6}}>
            <button onMouseDown={e=>{
              e.preventDefault();
              let val = resultatVal;
              if(constInfo.type==='bu') val=`Leuco ${buVals.leuco} / Nitrite ${buVals.nitrite} / Cétone ${buVals.cetone} / Glucose ${buVals.glucose}`;
              if(!val.trim()) return;
              onCocherAvecResultat(val, constInfo.fk, constInfo.label);
              setShowResultat(false);
            }} style={{flex:1,padding:'6px',borderRadius:6,background:color,color:'#fff',fontSize:12,fontWeight:600,border:'none',cursor:'pointer'}}>
              Valider et marquer fait
            </button>
            <button onMouseDown={e=>{e.preventDefault();setShowResultat(false);setResultatVal('');}}
              style={{padding:'6px 10px',borderRadius:6,background:'#f3f4f6',color:'#6b7280',fontSize:12,border:'none',cursor:'pointer'}}>✕</button>
          </div>
        </div>
      )}
    </div>
  );
}

function AjouterNote({cat, color, p, user, transmissions, setTransmissions}) {
  const [open, setOpen] = useState(false);
  const [texte, setTexte] = useState('');

  async function ajouter() {
    if (!texte.trim()) return;
    const t = [...transmissions, {texte:texte.trim(),categorie:cat,par:user?.matricule||'',nom:user?.nom||'',ts:Date.now()}];
    setTransmissions(t);
    setTexte('');
    setOpen(false);
    await fetch('/api/patients',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({action:'update',id:p.id,patch:{transmissions_ide:JSON.stringify(t)}})});
  }

  if (!open) return (
    <button onClick={()=>setOpen(true)}
      style={{marginTop:6,width:'100%',padding:'7px',borderRadius:8,border:'1.5px dashed '+color+'55',background:'#fff',color:color,fontSize:11,fontWeight:600,cursor:'pointer',textAlign:'center'}}>
      + Ajouter une note
    </button>
  );

  return (
    <div style={{marginTop:6,padding:'10px',borderRadius:8,border:'1.5px solid '+color+'55',background:color+'06'}}>
      <textarea autoFocus value={texte} onChange={e=>setTexte(e.target.value)}
        placeholder="Note, observation..."
        rows={2} style={{width:'100%',padding:'6px 8px',borderRadius:6,border:'1px solid '+color+'44',fontSize:12,outline:'none',resize:'none',boxSizing:'border-box',marginBottom:6}}/>
      <div style={{display:'flex',gap:5}}>
        <button onMouseDown={e=>{e.preventDefault();ajouter();}}
          style={{flex:1,padding:'5px',borderRadius:6,background:color,color:'#fff',fontSize:11,fontWeight:600,border:'none',cursor:'pointer'}}>
          Ajouter
        </button>
        <button onMouseDown={e=>{e.preventDefault();setOpen(false);setTexte('');}}
          style={{padding:'5px 10px',borderRadius:6,background:'#f3f4f6',color:'#6b7280',fontSize:11,border:'none',cursor:'pointer'}}>✕</button>
      </div>
    </div>
  );
}

function TransmissionIDE({p, user, transmissions, setTransmissions}) {
  const [texte, setTexte] = useState('');
  const [cat, setCat] = useState('soin');
  const CATS = [
    {id:'examen', label:'🔬 Examen', color:'#7c3aed'},
    {id:'therapeutique', label:'💊 Thérapeutique', color:'#ea580c'},
    {id:'soin', label:'🩹 Soin', color:'#d97706'},
  ];

  async function ajouter() {
    if (!texte.trim()) return;
    const t = [...transmissions, {texte:texte.trim(),categorie:cat,par:user?.matricule||'',nom:user?.nom||'',ts:Date.now(),fait:false}];
    setTransmissions(t);
    setTexte('');
    await fetch('/api/patients',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({action:'update',id:p.id,patch:{transmissions_ide:JSON.stringify(t)}})});
  }

  return (
    <div style={{background:'#f9fafb',borderTop:'1.5px solid #e5e7eb',padding:'8px 12px',flexShrink:0}}>
      <div style={{display:'flex',alignItems:'center',gap:8}}>
        <span style={{fontSize:10,fontWeight:700,color:'#6b7280',textTransform:'uppercase',flexShrink:0}}>📝 Note</span>
        <div style={{display:'flex',gap:4}}>
          {CATS.map(c=>(
            <button key={c.id} onMouseDown={e=>{e.preventDefault();setCat(c.id);}}
              style={{padding:'2px 8px',borderRadius:5,fontSize:10,fontWeight:600,cursor:'pointer',border:'1.5px solid '+(cat===c.id?c.color:'#e5e7eb'),background:cat===c.id?c.color:'#fff',color:cat===c.id?'#fff':c.color}}>
              {c.label}
            </button>
          ))}
        </div>
        <input value={texte} onChange={e=>setTexte(e.target.value)} placeholder="Observation, remarque..."
          onKeyDown={e=>{if(e.key==='Enter')ajouter();}}
          style={{flex:1,padding:'4px 8px',borderRadius:6,border:'1px solid #e5e7eb',fontSize:11,outline:'none',background:'#fff'}}/>
        <button onMouseDown={e=>{e.preventDefault();ajouter();}} disabled={!texte.trim()}
          style={{padding:'4px 10px',borderRadius:6,background:texte.trim()?'#0d9488':'#e5e7eb',color:texte.trim()?'#fff':'#9ca3af',fontSize:11,fontWeight:600,border:'none',cursor:'pointer',flexShrink:0}}>
          Ajouter
        </button>
      </div>
    </div>
  );
}

function TheraSection({prescriptions, onAjouter}) {
  const [tab, setTab] = useState('adulte');
  const VOIES = {
    adulte: [
      {voie:'PO', label:'Voie orale', color:'#16a34a', items:[
        'Paracétamol 500mg PO','Paracétamol 1g PO',
        'Ibuprofène 200mg PO','Ibuprofène 400mg PO (Antarène)',
        'Acide acétylsalicylique 500mg PO (Aspégic)','Kétoprofène 100mg PO (Profenid)','Naproxène 550mg PO',
        'Tramadol 50mg PO (Topalgic)','Tramadol 100mg PO','Paracétamol codéïne 500mg PO',
        'Acétylleucine 500mg PO (Tanganil)',
        'Métoclopramide 10mg PO (Primpéran)','Métopimazine 7.5mg PO (Vogalène)',
        'Amoxicilline 1g PO','Augmentin 1g PO','Azithromycine 250mg PO (Zithromax)','Doxycycline 100mg PO','Ofloxacine 200mg PO','Cefixime 40mg/5ml PO',
        'Artéméther-Luméfantrine PO (Coartem)',
        'Prednisolone 5mg PO (Solupred)','Prednisolone 20mg PO (Solupred)',
        'Cétirizine 10mg PO','Hydroxyzine 25mg PO (Atarax)','Dexchlorphéniramine PO (Polaramine)',
        'Lansoprazole 15mg PO','Pantoprazole 40mg PO',
        'Clopidogrel 75mg PO','Kardegic 75mg PO','Rivaroxaban 15mg PO (Xarelto)',
        'Clobazam 5mg PO (Urbanyl)','Clonazépam 1mg PO (Rivotril)','Oxazépam 10mg PO (Seresta)','Midazolam 5mg PO (Hypnovel)',
        'Loxapine 50mg PO','Halopéridol 5mg PO','Phénobarbital 200mg PO (Gardénal)','Phénytoïne 250mg PO (Dilantin)','Lévétiracétam 500mg/5ml PO (Keppra)',
        'Nicardipine 10mg PO (Loxen)','Nifédipine 50mg PO (Loxen LP)','Trinitrine 0.3mg PO (Natispray)','Furosémide 40mg PO (Lasilix)',
        'Charbon activé PO','Racécadotril 100mg PO (Tiorfan)','Sels réhydratation PO (Adiaril)',
        'Tropatépine 10mg PO (Lépicur)','Salbutamol 100mcg aérosol (Ventoline)',
        'Lévonorgestrel 1.5mg PO','Albendazole 4% PO (Zentel)','Ivermectine PO',
      ]},
      {voie:'IV', label:'Voie IV', color:'#2563eb', items:[
        'Paracétamol 1g IV (Perfalgan)','Paracétamol 500mg IV (Perfalgan)',
        'Kétoprofène 100mg IV (Profenid)',
        'Nalbuphine 20mg IV (Nubain)','Naloxone 0.4mg IV (Narcan)',
        'Kétamine 250mg IV','Étomidate 20mg IV (Lipuro)',
        'Midazolam 50mg IV (Hypnovel)','Diazépam 10mg IV (Valium)','Clonazépam 1mg IV (Rivotril)','Flumazénil 0.5mg IV (Anexate)',
        'Furosémide 20mg IV (Lasilix)','Furosémide 250mg IV (Lasilix spécial)',
        'Nicardipine 10mg IV (Loxen)',
        'Amiodarone 150mg IV (Cordarone)',
        'Adrénaline 1mg IV','Adrénaline sans sulfites 5mg IV (Longoni)','Noradrénaline 8mg IV',
        'Atropine 0.5mg IV','Adénosine 6mg IV (Krenosin)',
        'Ceftriaxone 1g IV','Ceftriaxone 2g IV','Métronidazole 500mg IV',
        'Méthylprednisolone 40mg IV (Solumedrol)','Méthylprednisolone 500mg IV (Solumedrol)',
        'Acide tranexamique 500mg IV (Exacyl)',
        'Magnésium sulfate 10% IV','Calcium gluconate 10% IV','Potassium chlorure 10% IV',
        'Sodium bicarbonate 4.2% IV','Mannitol 20% IV',
        'Glucose 10% IV','Glucose 30% IV',
        'Glucagon 1mg IV (Glucagen)','Digoxine 0.5mg IV',
        'Fondaparinux 2.5mg IV (Arixtra)','Énoxaparine 4000UI IV (Lovenox)',
        'Acétylleucine 500mg IV (Tanganil)',
        'Vitamine B1 100mg IV (Bévitine)','Vitamine K1 10mg IV',
        'Dexchlorphéniramine 5mg IV (Polaramine)',
        'Phénobarbital 200mg IV (Gardénal)',
      ]},
      {voie:'HYDRATATION', label:'Hydratation IV', color:'#0891b2', special:'hydratation'},
      {voie:'MORPHINE', label:'Titration morphine IV', color:'#dc2626', special:'morphine'},
      {voie:'IM', label:'Voie IM', color:'#6b7280', items:[
        'Kétoprofène 100mg IM (Profenid)',
        'Ceftriaxone 1g IM','Ceftriaxone 2g IM',
        'Adrénaline 1mg IM',
        'Halopéridol 5mg IM','Halopéridol décanoate 50mg IM',
        'Clonazépam 1mg IM (Rivotril)','Diazépam 10mg IM rectal (Valium)',
        'Triamcinolone 40mg IM (Kenacort Retard)','Bétaméthasone LP IM (Célestène)',
        'Terbutaline 0.5mg IM (Bricanyl)',
        'Morphine 10mg IM [STP]',
        'Vitamine B1 100mg IM','Vitamine K1 10mg IM',
        'Phénobarbital 200mg IM (Gardénal)',
        'Phlorglucinol 40mg IM (Spasfon)',
      ]},
      {voie:'SC', label:'Voie SC', color:'#7c3aed', items:[
        'Lidocaïne 1% SC','Lidocaïne 2% SC','Lidocaïne adrénalinée SC',
        'Adrénaline 0.5mg SC',
        'Fondaparinux 2.5mg SC (Arixtra)','Énoxaparine 4000UI SC (Lovenox)',
        'Terbutaline 0.5mg SC (Bricanyl)',
        'Vaccin antitétanique SC','Vaccin Hépatite B SC (Engerix B10)','Vaccin ROR SC (Priorix)',
      ]},
      {voie:'RESPI', label:'Respiratoire', color:'#64748b', items:[
        '__AEROSOL__','Budésonide 0.5mg nébulisation (Pulmicort)','Budésonide 1mg nébulisation (Pulmicort)',
        'MEOPA','Lidocaïne 5% nébulisation',
      ]},
    ],
    pediatrie: [
      {voie:'PO', label:'Voie orale', color:'#16a34a', items:[
        'Paracétamol 15mg/kg PO','Paracétamol 100mg sachet PO','Paracétamol 200mg sachet PO','Paracétamol 300mg sachet PO',
        'Ibuprofène 10mg/kg PO',
        'Amoxicilline 50mg/kg/j PO','Amox+Ac Clav 100mg/60ml PO',
        'Azithromycine 250mg PO (Zithromax)','Artéméther-Luméfantrine selon poids PO (Coartem)','Cefixime 40mg/5ml PO',
        'Métoclopramide sirop PO','Racécadotril 100mg PO (Tiorfan)','Sels réhydratation PO',
        'Cétirizine PO','Dexchlorphéniramine PO','Prednisolone 5mg PO',
        'Albendazole 4% PO (Zentel)','Ivermectine PO',
        'Lévonorgestrel 1.5mg PO',
      ]},
      {voie:'IV', label:'Voie IV', color:'#2563eb', items:[
        'Paracétamol 15mg/kg IV (Perfalgan)',
        'Morphine 0.1mg/kg IV [STP]','Kétamine IV','Midazolam IV (Hypnovel)',
        'Ceftriaxone 50mg/kg IV','Ceftriaxone 100mg/kg IV',
        'Adrénaline 0.01mg/kg IV',
        'Dexaméthasone 0.15mg/kg IV','Méthylprednisolone IV (Solumedrol)',
        'Glucose 10% IV','Glucose 30% IV','Ringer Lactate IV','NaCl 0.9% IV',
        'Diazépam rectal IV (Valium)','Clonazépam 0.02mg/kg IV (Rivotril)','Phénobarbital IV (Gardénal)',
        'Furosémide 1mg/kg IV (Lasilix)','Calcium gluconate 10% IV','Magnésium sulfate IV',
        'Acide tranexamique IV (Exacyl)',
        'Vitamine K1 2mg IV (NN)','Vitamine B1 IV',
      ]},
      {voie:'IM', label:'Voie IM', color:'#6b7280', items:[
        'Ceftriaxone 50mg/kg IM','Ceftriaxone 100mg/kg IM',
        'Adrénaline 0.01mg/kg IM',
        'Glucagon IM (Glucagen)','Phénobarbital IM (Gardénal)','Vitamine K1 2mg IM (NN)',
      ]},
      {voie:'SC', label:'Voie SC', color:'#7c3aed', items:[
        'Lidocaïne 1% SC','Adrénaline SC',
        'Vaccin antitétanique SC','Vaccin Hépatite B SC (Engerix B10)','Vaccin ROR SC (Priorix)',
      ]},
      {voie:'RESPI', label:'Respiratoire', color:'#64748b', items:[
        '__AEROSOL__','Budésonide 0.5mg nébulisation (Pulmicort)','Budésonide 1mg nébulisation (Pulmicort)',
        'MEOPA',
      ]},
    ],
  };
  const ROUGE = ['Tramadol','Codéine','Morphine','MEOPA'];

  return (
    <div style={{padding:'8px 10px'}}>
      <div style={{display:'flex',gap:5,marginBottom:8}}>
        {['adulte','pediatrie'].map(t=>(
          <button key={t} onClick={()=>setTab(t)}
            style={{padding:'3px 10px',borderRadius:5,fontSize:11,fontWeight:600,cursor:'pointer',
              border:'1.5px solid '+(tab===t?'#ea580c':'#e5e7eb'),
              background:tab===t?'#ea580c':'#fff',color:tab===t?'#fff':'#6b7280'}}>
            {t==='adulte'?'Adulte':'Pédiatrie'}
          </button>
        ))}
      </div>
      <div style={{maxHeight:'40vh',overflowY:'auto',display:'flex',flexDirection:'column',gap:8}}>
        {VOIES[tab].map(v=>{
          if(v.special==='morphine') return (
            <div key={v.voie}>
              <div style={{fontSize:9,fontWeight:700,color:'#dc2626',textTransform:'uppercase',letterSpacing:0.5,marginBottom:4,padding:'3px 6px',background:'#fef2f2',borderRadius:4}}>⚠ Titration morphine IV [STP]</div>
              <TitrationMorphine onAjouter={onAjouter} prescriptions={prescriptions}/>
            </div>
          );
          if(v.special==='hydratation') return (
            <div key={v.voie}>
              <div style={{fontSize:9,fontWeight:700,color:'#0891b2',textTransform:'uppercase',letterSpacing:0.5,marginBottom:4,padding:'3px 6px',background:'#f0f9ff',borderRadius:4}}>Hydratation IV</div>
              <HydratationSelector onAjouter={onAjouter} prescriptions={prescriptions}/>
            </div>
          );
          if(!v.items) return null;
          return (
          <div key={v.voie}>
            <div style={{fontSize:9,fontWeight:700,color:'#6b7280',textTransform:'uppercase',letterSpacing:0.5,marginBottom:4,padding:'3px 6px',background:'#f9fafb',borderRadius:4}}>{v.label}</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
              {v.items.map(item=>{
                if(item==='__AEROSOL__') return <AerosolSelector key="aerosol" onAjouter={onAjouter} prescriptions={prescriptions}/>;
                const deja=prescriptions.find(r=>!r.fait&&!r.nonRealise&&r.texte.startsWith(item.split('__')[0]));
                if(deja) return null;
                const rouge=ROUGE.some(s=>item.includes(s));
                const isPO = v.voie==='PO';
                return (
                  <button key={item} onClick={()=>onAjouter(isPO?item+' ×1':item,'therapeutique')}
                    onMouseEnter={e=>{e.currentTarget.style.filter='brightness(0.85)';}}
                    onMouseLeave={e=>{e.currentTarget.style.filter='none';}}
                    style={{padding:'4px 8px',borderRadius:5,fontSize:11,fontWeight:600,cursor:'pointer',
                      background:rouge?'#fef2f2':v.color+'12',
                      color:rouge?'#dc2626':v.color,
                      border:'1.5px solid '+(rouge?'#fecaca':v.color+'44')}}>
                    {item}
                  </button>
                );
              })}
            </div>
          </div>
          );
        })}
        <AutreLibre categorie="therapeutique" onAjouter={onAjouter}/>
      </div>
    </div>
  );
}

function AerosolSelector({onAjouter, prescriptions}) {
  const [poids, setPoids] = useState('');
  const dejaAero = prescriptions.find(r=>!r.fait&&!r.nonRealise&&r.texte.startsWith('Salbutamol'));

  const p = parseFloat(poids);
  const ventoline = !isNaN(p) ? (p < 16 ? '2.5mg' : '5mg') : null;
  const atrovent  = !isNaN(p) ? (p < 16 ? '0.25mg' : '0.5mg') : null;

  function prescrire() {
    if(!ventoline) return;
    onAjouter(`Salbutamol ${ventoline} nébulisation (Ventoline) — Séance 1/3`,'therapeutique');
    onAjouter(`Salbutamol ${ventoline} nébulisation (Ventoline) — Séance 2/3`,'therapeutique');
    onAjouter(`Salbutamol ${ventoline} nébulisation (Ventoline) — Séance 3/3`,'therapeutique');
    onAjouter(`Ipratropium ${atrovent} nébulisation (Atrovent) — Séance 1/1`,'therapeutique');
    setPoids('');
  }

  if(dejaAero) return (
    <div style={{fontSize:11,color:'#9ca3af',padding:'4px 8px',fontStyle:'italic'}}>Aérosols déjà prescrits</div>
  );

  return (
    <div style={{background:'#f0f9ff',borderRadius:8,padding:'8px 12px',border:'1.5px solid #bae6fd',marginBottom:4}}>
      <div style={{fontSize:11,color:'#0891b2',fontWeight:700,marginBottom:6}}>
        💨 Aérosols — Salbutamol (Ventoline) ×3 + Ipratropium (Atrovent) ×1
      </div>
      <div style={{fontSize:10,color:'#6b7280',marginBottom:8}}>
        &lt;16kg → Ventoline 2.5mg + Atrovent 0.25mg &nbsp;|&nbsp; ≥16kg → Ventoline 5mg + Atrovent 0.5mg
      </div>
      <div style={{display:'flex',alignItems:'center',gap:8}}>
        <label style={{fontSize:11,color:'#374151',fontWeight:500}}>Poids</label>
        <input value={poids} onChange={e=>setPoids(e.target.value)} placeholder="kg" type="number"
          style={{width:60,padding:'4px 8px',borderRadius:6,border:'1.5px solid #bae6fd',fontSize:12,outline:'none',textAlign:'center'}}/>
        <span style={{fontSize:11,color:'#6b7280'}}>kg</span>
        {ventoline&&<span style={{fontSize:11,fontWeight:600,color:'#0891b2'}}>→ Ventoline {ventoline} ×3 + Atrovent {atrovent} ×1</span>}
        <button onClick={prescrire} disabled={!ventoline}
          style={{padding:'5px 14px',borderRadius:6,background:ventoline?'#0891b2':'#e5e7eb',color:ventoline?'#fff':'#9ca3af',fontSize:11,fontWeight:700,border:'none',cursor:'pointer'}}>
          Prescrire
        </button>
      </div>
    </div>
  );
}

function HydratationSelector({onAjouter, prescriptions}) {
  const [solute, setSolute] = useState('');
  const [qte, setQte] = useState('');
  const [duree, setDuree] = useState('');
  const SOLUTES = [
    {id:'NaCl 0.9%', label:'NaCl 0.9%', color:'#0891b2'},
    {id:'Ringer Lactate', label:'Ringer Lactate', color:'#0891b2'},
    {id:'G5%', label:'G5%', color:'#f59e0b'},
    {id:'G10%', label:'G10%', color:'#f59e0b'},
    {id:'G30%', label:'G30%', color:'#ea580c'},
    {id:'NaCl 0.9% + KCl 2g', label:'NaCl + KCl 2g', color:'#7c3aed'},
    {id:'G5% + NaCl 0.9%', label:'G5% + NaCl', color:'#7c3aed'},
  ];
  const dejaHydrat = prescriptions.find(r=>!r.fait&&!r.nonRealise&&r.texte.startsWith('Hydratation'));
  if(dejaHydrat) return <div style={{fontSize:11,color:'#9ca3af',padding:'4px 8px',fontStyle:'italic'}}>Hydratation déjà prescrite</div>;

  return (
    <div style={{background:'#f0f9ff',borderRadius:8,padding:'8px 12px',border:'1.5px solid #bae6fd'}}>
      <div style={{display:'flex',flexWrap:'wrap',gap:4,marginBottom:solute?8:0}}>
        {SOLUTES.map(s=>(
          <button key={s.id} onClick={()=>{setSolute(s.id===solute?'':s.id);setQte('');setDuree('');}}
            style={{padding:'4px 10px',borderRadius:6,fontSize:11,fontWeight:600,cursor:'pointer',
              border:'1.5px solid '+(solute===s.id?s.color:s.color+'44'),
              background:solute===s.id?s.color:s.color+'12',
              color:solute===s.id?'#fff':s.color}}>
            {s.label}
          </button>
        ))}
      </div>
      {solute&&(
        <div style={{display:'flex',alignItems:'center',gap:6,marginTop:6}}>
          <input value={qte} onChange={e=>setQte(e.target.value)} placeholder="ml" type="number" autoFocus
            style={{width:65,padding:'4px 8px',borderRadius:6,border:'1.5px solid #0891b2',fontSize:12,outline:'none',textAlign:'center'}}/>
          <span style={{fontSize:11,color:'#6b7280'}}>ml en</span>
          <input value={duree} onChange={e=>setDuree(e.target.value)} placeholder="h"
            style={{width:50,padding:'4px 8px',borderRadius:6,border:'1.5px solid #0891b2',fontSize:12,outline:'none',textAlign:'center'}}/>
          <span style={{fontSize:11,color:'#6b7280'}}>h</span>
          <button onClick={()=>{
            if(!qte) return;
            const txt=`Hydratation ${solute} ${qte}ml${duree?' en '+duree+'h':''}`;
            onAjouter(txt,'therapeutique');
            setSolute('');setQte('');setDuree('');
          }} disabled={!qte}
            style={{padding:'4px 12px',borderRadius:6,background:qte?'#0891b2':'#e5e7eb',color:qte?'#fff':'#9ca3af',fontSize:11,fontWeight:700,border:'none',cursor:'pointer'}}>
            Prescrire
          </button>
          <button onClick={()=>setSolute('')}
            style={{padding:'4px 8px',borderRadius:6,background:'#f3f4f6',color:'#6b7280',fontSize:11,border:'none',cursor:'pointer'}}>✕</button>
        </div>
      )}
    </div>
  );
}

function TitrationMorphine({onAjouter, prescriptions}) {
  const [poids, setPoids] = useState('');
  const dejaMorphine = prescriptions.find(r=>!r.fait&&!r.nonRealise&&r.texte.startsWith('Titration morphine'));

  if(dejaMorphine) return (
    <div style={{fontSize:11,color:'#9ca3af',padding:'4px 8px',fontStyle:'italic'}}>Titration morphine déjà prescrite</div>
  );

  function prescrire() {
    if(!poids) return;
    const p = parseFloat(poids);
    const doseInitiale = Math.round(p * 0.1 * 10) / 10;
    const doseBolus = Math.round(p * 0.02 * 10) / 10;
    const protocole = `Titration morphine IV [STP] — Poids ${p}kg\n` +
      `• Dose initiale : ${doseInitiale}mg IV lent\n` +
      `• Puis ${doseBolus}mg IV toutes les 5 min si EN ≥ 4\n` +
      `• Objectif EN < 4\n` +
      `• Surveillance : FR, SpO2, sédation toutes les 5 min\n` +
      `• NALOXONE 0.4mg prêt à proximité\n` +
      `• STOP si FR < 12/min ou SpO2 < 94%`;
    onAjouter(protocole,'therapeutique');
    setPoids('');
  }

  return (
    <div style={{background:'#fef2f2',borderRadius:8,padding:'8px 12px',border:'1.5px solid #fecaca'}}>
      <div style={{fontSize:11,color:'#dc2626',fontWeight:600,marginBottom:8}}>
        ⚠ Protocole standard — Prescription sécurisée [STP]
      </div>
      <div style={{display:'flex',alignItems:'center',gap:8}}>
        <label style={{fontSize:11,color:'#374151',fontWeight:500}}>Poids patient</label>
        <input value={poids} onChange={e=>setPoids(e.target.value)} placeholder="kg" type="number"
          style={{width:60,padding:'4px 8px',borderRadius:6,border:'1.5px solid #fecaca',fontSize:12,outline:'none',textAlign:'center'}}/>
        <span style={{fontSize:11,color:'#6b7280'}}>kg</span>
        <button onClick={prescrire} disabled={!poids}
          style={{padding:'5px 14px',borderRadius:6,background:poids?'#dc2626':'#e5e7eb',color:poids?'#fff':'#9ca3af',fontSize:11,fontWeight:700,border:'none',cursor:'pointer'}}>
          Générer protocole
        </button>
      </div>
      {poids&&<div style={{fontSize:10,color:'#6b7280',marginTop:6}}>
        Dose initiale : {Math.round(parseFloat(poids)*0.1*10)/10}mg · Bolus : {Math.round(parseFloat(poids)*0.02*10)/10}mg/5min · NARCAN prêt
      </div>}
    </div>
  );
}

function SutureSection({p, save}) {
  const SUTURES=[{id:'sut_sup5',l:'Suture ≥5 pts',c:'#dc2626'},{id:'sut_inf5',l:'Suture <5 pts',c:'#f59e0b'},{id:'sut_colle',l:'Suture colle',c:'#0891b2'},{id:'sut_agraf',l:'Suture agrafes',c:'#7c3aed'},{id:'sut_steri',l:'Steri-strip',c:'#16a34a'}];
  const [sel,setSel]=useState(()=>{try{return JSON.parse(p.sutures||'[]');}catch{return [];}});
  async function toggle(id){const n=sel.includes(id)?sel.filter(x=>x!==id):[...sel,id];setSel(n);await save({sutures:JSON.stringify(n)});}
  return(
    <div style={{background:'#fff8f8',border:'1.5px solid #fecaca',borderRadius:8,padding:'8px 12px'}}>
      <div style={{fontSize:10,fontWeight:700,color:'#dc2626',textTransform:'uppercase',marginBottom:6}}>✂️ Suture / Fermeture</div>
      <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
        {SUTURES.map(s=>{const on=sel.includes(s.id);return(
          <button key={s.id} onClick={()=>toggle(s.id)}
            style={{padding:'5px 10px',borderRadius:6,fontSize:11,fontWeight:600,cursor:'pointer',background:on?s.c:'#fff',color:on?'#fff':s.c,border:'2px solid '+s.c}}>
            {on?'✓ ':''}{s.l}
          </button>
        );})}
      </div>
    </div>
  );
}

function DeplacerBtn({p, onUpdate, patients=[]}) {
  const [open,setOpen]=useState(false);
  const EMPL=[{id:'brancard1',l:'B1 — Brancard 1',c:'#ef4444'},{id:'brancard2',l:'B2 — Brancard 2',c:'#ef4444'},{id:'fauteuil1',l:'F1 — Fauteuil 1',c:'#16a34a'},{id:'fauteuil2',l:'F2 — Fauteuil 2',c:'#16a34a'},{id:'obs1',l:'O1 — Observation 1',c:'#3b82f6'},{id:'obs2',l:'O2 — Observation 2',c:'#3b82f6'},{id:'lit1',l:'L1 — Lit 1',c:'#3b82f6'},{id:'lit2',l:'L2 — Lit 2',c:'#3b82f6'},{id:'pansement',l:'P1 — Pansement',c:'#f59e0b'}];
  const cur=EMPL.find(e=>e.id===p.emplacement);
  return(
    <div style={{position:'relative'}}>
      <button onClick={()=>setOpen(o=>!o)}
        style={{padding:'4px 10px',borderRadius:7,border:'1px solid #e5e7eb',background:'#f9fafb',fontSize:11,fontWeight:600,color:'#374151',cursor:'pointer'}}>
        📍 {cur?.l||p.emplacement||'—'} {open?'▲':'▼'}
      </button>
      {open&&<div style={{position:'fixed',zIndex:9999,background:'#fff',border:'1px solid #e5e7eb',borderRadius:10,boxShadow:'0 8px 24px rgba(0,0,0,0.15)',padding:8,minWidth:200}}>
        <div style={{fontSize:9,color:'#9ca3af',fontWeight:700,textTransform:'uppercase',padding:'3px 8px',marginBottom:3}}>Déplacer vers</div>
        {EMPL.map(em=>{
          const occ=patients.find(pt=>pt.emplacement===em.id&&pt.id!==p.id);
          const cur2=em.id===p.emplacement;
          return(
            <div key={em.id} onClick={async()=>{
              if(occ||cur2)return;
              await fetch('/api/patients',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'update',id:p.id,patch:{emplacement:em.id}})});
              setOpen(false);onUpdate?.();
            }}
              style={{padding:'6px 10px',borderRadius:6,cursor:occ||cur2?'default':'pointer',fontSize:11,fontWeight:600,color:occ?'#d1d5db':cur2?'#16a34a':em.c,background:cur2?'#f0fdf4':'#fff',textDecoration:occ?'line-through':'none',display:'flex',alignItems:'center',gap:6}}
              onMouseEnter={e=>{if(!occ&&!cur2)e.currentTarget.style.background=em.c+'15';}}
              onMouseLeave={e=>{e.currentTarget.style.background=cur2?'#f0fdf4':'#fff';}}>
              {cur2&&<span style={{fontSize:9}}>✓</span>}{em.l}{occ&&<span style={{fontSize:9,color:'#d1d5db',marginLeft:'auto'}}>{occ.nom}</span>}
            </div>
          );
        })}
        <div onClick={()=>setOpen(false)} style={{padding:'5px 10px',borderRadius:6,cursor:'pointer',fontSize:10,color:'#9ca3af',textAlign:'center',marginTop:4}}
          onMouseEnter={e=>e.currentTarget.style.background='#f9fafb'}
          onMouseLeave={e=>e.currentTarget.style.background='transparent'}>Fermer</div>
      </div>}
    </div>
  );
}
