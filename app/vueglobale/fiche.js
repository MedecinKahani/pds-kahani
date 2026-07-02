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

// Regroupement des voies d'administration en 4 boutons visibles pour le
// médecin (Per os / IV / IM / Nébulisation) — le détail (Auriculaire, SC,
// Hydratation, Titration morphine) reste accessible mais rangé dans le
// groupe le plus proche cliniquement, pour ne pas surcharger l'écran.
const GROUPES_VOIE = [
  {id:'PO', label:'Per os', color:'#16a34a', voies:['PO','AURICULAIRE']},
  {id:'IV', label:'IV', color:'#2563eb', voies:['IV','HYDRATATION']},
  {id:'IM', label:'IM', color:'#6b7280', voies:['IM','SC']},
  {id:'NEBUL', label:'Nébulisation', color:'#0891b2', voies:['RESPI']},
];

// Ordre d'affichage des sous-catégories thérapeutiques. Par défaut, l'ordre
// ci-dessous s'applique à tous les groupes. Pour IV, un ordre spécifique a
// été demandé (Hydratation et Titration morphine intercalées entre les
// catégories médicamenteuses, plutôt que systématiquement en tête).
const ORDRE_CATEGORIES_DEFAUT = [
  'Asthme', 'Antalgique', 'Anti-infectieux', 'Cardio-vasculaire', 'Respiratoire',
  'Neuro-sédation', 'Digestif', 'Allergologie / Corticoïdes',
  'Réanimation / Antidotes', 'Métabolique / Solutés', 'Anesthésie locale', 'Autres',
];
const ORDRE_CATEGORIES_PAR_GROUPE = {
  IV: [
    '__HYDRATATION__', 'Antalgique', 'Anti-infectieux',
    'Cardio-vasculaire', 'Réanimation / Antidotes', 'Métabolique / Solutés',
    'Allergologie / Corticoïdes', 'Neuro-sédation', 'Autres',
  ],
};

const EXAMENS_ROWS = [
  [
    {id:'ecg', label:'ECG', color:'#dc2626'},
    {id:'hemocue', label:'Hémocue', color:'#dc2626'},
    {id:'dextro', label:'Dextro', color:'#dc2626'},
  ],
  [
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
  ],
  [
    {id:'tdr_tet', label:'Tétanotop', color:'#16a34a'},
    {id:'crp', label:'CRP rapide', color:'#16a34a'},
    {id:'tdr_palu', label:'TDR Paludisme', color:'#16a34a'},
    {id:'tdr_dengue', label:'TDR Dengue', color:'#16a34a'},
  ],
  [
    {id:'bu', label:'BU', color:'#d97706'},
    {id:'bhcg', label:'bHCG urinaire', color:'#d97706'},
  ],
];

const SOINS_ROWS = [
  [
    {id:'scoper', label:'Scopé', color:'#dc2626'},
    {id:'reprise_const', label:'Reprise constantes après thérapeutique', color:'#dc2626'},
  ],
  [
    {id:'drp', label:'DRP', color:'#3b82f6'},
  ],
  // Oxygène : voir <OxygeneSelector/> rendu séparément à cet emplacement
  [
    {id:'assis', label:'Assis', color:'#0891b2'},
    {id:'demi_assis', label:'Demi-assis', color:'#0891b2'},
    {id:'allonge', label:'Allongé', color:'#0891b2'},
    {id:'allonge_strict', label:'Allongé strict', color:'#0891b2'},
  ],
  [
    {id:'vvp1', label:'VVP n°1', color:'#7c3aed'},
    {id:'vvp2', label:'VVP n°2', color:'#7c3aed'},
    {id:'anesth_loc', label:'Anesthésie locale (Lidocaïne)', color:'#7c3aed'},
    {id:'suture', label:'Suture', color:'#7c3aed'},
  ],
  [
    {id:'desinfection', label:'Désinfection plaie', color:'#f59e0b'},
    {id:'pst_simple', label:'Pansement simple', color:'#f59e0b'},
    {id:'pst_complexe', label:'Pansement complexe', color:'#f59e0b'},
  ],
  [
    {id:'retrait_spu', label:'Retrait sonde urinaire', color:'#6b7280'},
    {id:'pose_spu', label:'Pose sonde urinaire', color:'#6b7280'},
    {id:'retrait_implant', label:'Retrait implant', color:'#6b7280'},
  ],
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
      <div style={{background:'#f3f4f6',borderRadius:6,padding:'3px 7px',border:'1px solid #e5e7eb',minWidth:0,cursor:'default'}}>
        <div style={{fontSize:8,fontWeight:700,color:'#9ca3af',textTransform:'uppercase',letterSpacing:0.5,marginBottom:2}}>{label}</div>
        <div style={{display:'flex',alignItems:'baseline',gap:3,flexWrap:'nowrap'}}>
          {latest&&baseVal&&<span style={{fontSize:12,color:'#94a3b8',textDecoration:'line-through',marginRight:3,fontVariantNumeric:'tabular-nums'}}>{baseVal}</span>}
          <span style={{fontSize:13,fontWeight:700,color,lineHeight:1,fontVariantNumeric:'tabular-nums'}}>{cur||'—'}</span>
          {cur&&cur!=='--'&&cur!=='—'&&<span style={{fontSize:8,color:'#9ca3af'}}>{unit}</span>}
          <button
            onMouseDown={e=>{e.preventDefault();e.stopPropagation();setOpen(o=>{if(!o)setTimeout(()=>inputRef.current?.focus(),50);return !o;});setVal('');}}
            onMouseEnter={e=>e.currentTarget.style.cssText='font-size:11px;font-weight:700;color:#fff;background:#0d9488;border:1.5px solid #0d9488;border-radius:4px;padding:0 5px;cursor:pointer;line-height:16px;'}
            onMouseLeave={e=>e.currentTarget.style.cssText='font-size:11px;font-weight:700;color:#0d9488;background:transparent;border:1.5px solid #0d9488;border-radius:4px;padding:0 5px;cursor:pointer;line-height:16px;'}
            style={{fontSize:11,fontWeight:700,color:'#374151',background:'transparent',border:'1.5px solid #0d9488',borderRadius:4,padding:'0 5px',cursor:'pointer',lineHeight:'16px',marginLeft:2}}>+</button>
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
      <div style={{background:'#f3f4f6',borderRadius:6,padding:'3px 7px',border:'1px solid #e5e7eb'}}>
        <div style={{fontSize:8,fontWeight:700,color:'#9ca3af',textTransform:'uppercase',letterSpacing:0.5,marginBottom:2}}>BU</div>
        <div style={{display:'flex',alignItems:'center',gap:3,flexWrap:'nowrap'}}>
          {latest&&baseVal&&<span style={{fontSize:9,color:'#c4c9d0',textDecoration:'line-through',maxWidth:60,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{baseVal}</span>}
          <span title={cur||''} style={{fontSize:12,fontWeight:700,color:cur?'#3b82f6':'#9ca3af',cursor:'help'}}>{cur&&cur!=='—'?(cur.includes('Nég')&&!cur.includes('Leuco +')&&!cur.includes('Nitrite +')&&!cur.includes('Sang +')&&!cur.includes('Glucose +')&&!cur.includes('Cétone +')?'Négative':'Positive'):cur||'—'}</span>
          <button
            onMouseDown={e=>{e.preventDefault();e.stopPropagation();setOpen(o=>!o);setSel({});}}
            onMouseEnter={e=>e.currentTarget.style.cssText='font-size:11px;font-weight:700;color:#fff;background:#0d9488;border:1.5px solid #0d9488;border-radius:4px;padding:0 5px;cursor:pointer;line-height:16px;'}
            onMouseLeave={e=>e.currentTarget.style.cssText='font-size:11px;font-weight:700;color:#0d9488;background:transparent;border:1.5px solid #0d9488;border-radius:4px;padding:0 5px;cursor:pointer;line-height:16px;'}
            style={{fontSize:11,fontWeight:700,color:'#374151',background:'transparent',border:'1.5px solid #0d9488',borderRadius:4,padding:'0 5px',cursor:'pointer',lineHeight:'16px',flexShrink:0}}>+</button>
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
      <div style={{background:'#f3f4f6',borderRadius:6,padding:'3px 7px',border:'1px solid #e5e7eb',minWidth:0}}>
        <div style={{fontSize:8,fontWeight:700,color:'#9ca3af',textTransform:'uppercase',letterSpacing:0.5,marginBottom:2}}>{label}</div>
        <div style={{display:'flex',alignItems:'center',gap:3}}>
          {latest&&baseVal&&<span style={{fontSize:10,color:'#c4c9d0',textDecoration:'line-through'}}>{baseVal}</span>}
          <span style={{fontSize:14,fontWeight:700,color,lineHeight:1}}>{cur||'—'}</span>
          <button
            onMouseDown={e=>{e.preventDefault();e.stopPropagation();setOpen(o=>!o);}}
            onMouseEnter={e=>e.currentTarget.style.cssText='font-size:11px;font-weight:700;color:#fff;background:#0d9488;border:1.5px solid #0d9488;border-radius:4px;padding:0 5px;cursor:pointer;line-height:16px;'}
            onMouseLeave={e=>e.currentTarget.style.cssText='font-size:11px;font-weight:700;color:#0d9488;background:transparent;border:1.5px solid #0d9488;border-radius:4px;padding:0 5px;cursor:pointer;line-height:16px;'}
            style={{fontSize:11,fontWeight:700,color:'#374151',background:'transparent',border:'1.5px solid #0d9488',borderRadius:4,padding:'0 5px',cursor:'pointer',lineHeight:'16px',marginLeft:2}}>+</button>
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
    setEditIdentite({ddn:ddnAff,ipp:p.ipp||'',age:p.age||'',sexe:p.sexe||''});
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
        ddn:ddnSave,
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
  const [onglet, setOnglet] = useState((role==='ide'||role==='medecin') ? 'prescriptions' : 'clinique');
  const [anamnese, setAnamnese] = useState(p.anamnese||'');
  const [examen, setExamen] = useState(p.examen_clinique||'');
  const [evolution, setEvolution] = useState(p.evolution||'');
  const [diagnostic, setDiagnostic] = useState(p.diagnostic||'');
  const [ordonnance, setOrdonnance] = useState(p.ordonnance||'');
  const [plaies, setPlaies] = useState(safeJSON(p.plaies_data, []));
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

  async function ajouterPlusieursRx(items) {
    // items = [{texte, categorie}]
    const now = Date.now();
    const nouvelles = items.map((item,i)=>({texte:item.texte,categorie:item.categorie,fait:false,nonRealise:false,ts:now+i,par:user?.matricule||'',parNom:user?.nom||''}));
    const rx = [...prescriptions, ...nouvelles];
    setPrescriptions(rx);
    await fetch('/api/patients',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({action:'update',id:p.id,patch:{prescriptions:JSON.stringify(rx)}})});
  }

  const [modalePrelev, setModalePrelev] = useState(null); // {idx}
  const [prelevTel, setPrelevTel] = useState('');
  const [prelevVille, setPrelevVille] = useState('');

  async function cocherRx(idx) {
    const rx=[...prescriptions];
    const r = rx[idx];
    // Si Prélèvement Mamoudzou → modale tél + ville d'abord
    if (r.texte && r.texte.includes('Mamoudzou') && !r.fait) {
      setModalePrelev({idx});
      setPrelevTel(p.tel||'');
      setPrelevVille(p.ville||'');
      return;
    }
    rx[idx]={...rx[idx],fait:true,faitPar:user?.matricule,faitNom:user?.nom,faitA:Date.now()};
    setPrescriptions(rx);
    await fetch('/api/patients',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({action:'update',id:p.id,patch:{prescriptions:JSON.stringify(rx)}})});
  }

  async function validerPrelev() {
    const idx = modalePrelev.idx;
    const rx=[...prescriptions];
    rx[idx]={...rx[idx],fait:true,faitPar:user?.matricule,faitNom:user?.nom,faitA:Date.now()};
    setPrescriptions(rx);
    // Sauvegarder tél + ville dans le patient
    await fetch('/api/patients',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({action:'update',id:p.id,patch:{prescriptions:JSON.stringify(rx),tel:prelevTel,ville:prelevVille}})});
    // Créer entrée dédiée prélevés (TTL 7j)
    await fetch('/api/prelev',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        id:p.id, ipp:p.ipp, ddn:p.ddn, sexe:p.sexe, age:p.age,
        tel:prelevTel, ville:prelevVille,
        motif:p.symptome, diagnostic:diagnostic, anamnese:anamnese,
        ts:Date.now(), faitPar:user?.nom||user?.matricule,
      })});
    setModalePrelev(null);
  }

  async function nonRealiserRx(idx, motif) {
    const rx=[...prescriptions];
    rx[idx]={...rx[idx],nonRealise:true,motifNonRealise:motif,faitPar:user?.matricule,faitNom:user?.nom,faitA:Date.now()};
    setPrescriptions(rx);
    await fetch('/api/patients',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({action:'update',id:p.id,patch:{prescriptions:JSON.stringify(rx)}})});
  }

  async function annulerRealisation(idx) {
    const rx=[...prescriptions];
    rx[idx]={...rx[idx],fait:false,nonRealise:false,motifNonRealise:null,resultat:null,faitPar:null,faitNom:null,faitA:null};
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
Patient : ${p.age} ans
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
    {label:'T°',     fk:'temp', unit:'°C',   base:p.temp, type:'num'},
    {label:'PAS',    fk:'tas',  unit:'mmHg', base:p.tas,  type:'num'},
    {label:'PAD',    fk:'tad',  unit:'mmHg', base:p.tad,  type:'num'},
    {label:'PAM',    fk:'pam',  unit:'mmHg', base:pamVal?.toString(), type:'fixed'},
    {label:'BU', fk:'bu_resultat', unit:'', base:p.bu_resultat, type:'bu'},
    {label:'Poids',  fk:'poids', unit:'kg',  base:p.poids, type:'fixed'},
  ];

  const CONSTANTES_R2 = [
    {label:'Hémocue',   fk:'hemocue',     unit:'g/dL', base:p.hemocue,     type:'num'},
    {label:'Dextro',    fk:'dextro',      unit:'g/L',  base:p.dextro,      type:'num'},
    {label:'TDR Palu',  fk:'tdr_palu',    unit:'',     base:p.tdr_palu,    type:'qual', options:['Négatif','Positif']},
    {label:'TDR Dengue',fk:'tdr_dengue',  unit:'',     base:p.tdr_dengue,  type:'qual', options:['Négatif','Positif']},
    {label:'CRP',       fk:'crp_test',    unit:'',     base:p.crp_test,    type:'qual', options:['Nég','1 barre','2 barres','3 barres','4 barres']},
    {label:'Tétanotop', fk:'tdr_tet',     unit:'',     base:p.quicktest,   type:'qual', options:['Négatif','Positif']},
    {label:'bHCG',      fk:'bhcg_resultat',unit:'',    base:p.bhcg_resultat,type:'qual',options:['Négatif','Positif']},
    {label:'Taille',    fk:'taille',      unit:'cm',   base:p.taille,      type:'fixed'},
  ];

  function renderConst(c) {
    if (c.type==='fixed') {
      // PAM : cas spécial avec couleur et alerte
      if (c.fk==='pam') return (
        <div key={c.fk} style={{background:'#f3f4f6',borderRadius:6,padding:'3px 7px',border:'1px solid #e5e7eb',minWidth:0}}>
          <div style={{fontSize:8,fontWeight:700,color:'#9ca3af',textTransform:'uppercase',letterSpacing:0.5,marginBottom:2}}>{c.label} <span style={{fontWeight:400}}>auto</span></div>
          <div style={{display:'flex',alignItems:'baseline',gap:3}}>
            <span style={{fontSize:13,fontWeight:700,color:pamColor,lineHeight:1}}>{pamVal||'—'}</span>
            {pamVal&&<span style={{fontSize:8,color:'#9ca3af'}}>{c.unit}</span>}
          </div>
          {pamVal&&pamVal<65&&<div style={{fontSize:8,color:'#ef4444',fontWeight:700,marginTop:1}}>⚠ Bas</div>}
        </div>
      );
      // Poids / Taille : valeur simple non éditable
      return (
        <div key={c.fk} style={{background:'#f3f4f6',borderRadius:6,padding:'3px 7px',border:'1px solid #e5e7eb',minWidth:0}}>
          <div style={{fontSize:8,fontWeight:700,color:'#9ca3af',textTransform:'uppercase',letterSpacing:0.5,marginBottom:2}}>{c.label}</div>
          <div style={{display:'flex',alignItems:'baseline',gap:3}}>
            <span style={{fontSize:13,fontWeight:700,color:'#374151',lineHeight:1}}>{c.base||'—'}</span>
            {c.base&&<span style={{fontSize:8,color:'#9ca3af'}}>{c.unit}</span>}
          </div>
        </div>
      );
    }
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
            <span style={{fontSize:12,color:'#6b7280'}}>{p.sexe==='M'?'♂':'♀'} · {p.age} ans</span>
            {p.ddn&&<span style={{fontSize:11,color:'#9ca3af'}}>{(()=>{const[y,m,d]=(p.ddn||'').split('-');return d&&m&&y?`${d}/${m}/${y}`:p.ddn;})()}</span>}
            <span onMouseDown={e=>{e.preventDefault();if(p.ipp){navigator.clipboard.writeText(p.ipp);setIppCopied(true);setTimeout(()=>setIppCopied(false),10000);}}}
              style={{display:'inline-flex',alignItems:'center',gap:5,borderRadius:6,padding:'2px 8px',border:'1px solid '+(ippCopied?'#0d9488':'#e5e7eb'),background:ippCopied?'#f0fdfa':'#f3f4f6',cursor:p.ipp?'pointer':'default',userSelect:'none'}}>
              <span style={{fontSize:9,color:ippCopied?'#0d9488':'#9ca3af',fontWeight:700,textTransform:'uppercase',letterSpacing:0.4}}>IPP</span>
              <span style={{fontSize:12,fontWeight:700,color:ippCopied?'#0d9488':'#374151',fontFamily:'monospace'}}>{p.ipp||'—'}</span>
              {ippCopied&&<span style={{fontSize:10,color:'#374151',fontWeight:700}}>✓</span>}
            </span>
            <button onMouseDown={e=>{e.preventDefault();openEditIdentite();}} title="Modifier l'identité"
              style={{fontSize:13,background:'none',border:'none',cursor:'pointer',color:'#9ca3af',padding:'0 2px'}}>✎</button>
            <span style={{fontSize:11,fontWeight:700,color:'#374151',background:'#f0fdfa',padding:'2px 8px',borderRadius:5,border:'0.5px solid #99f6e4'}}>
              {p.symptome==='autre'&&p.autre_motif ? p.autre_motif : p.symptome?.replace(/_/g,' ')}
            </span>
          </div>
          <div style={{display:'flex',gap:6,alignItems:'center',flexShrink:0}}>
            <DeplacerBtn p={p} onUpdate={onUpdate} patients={patients}/>
            <button onClick={onClose} style={{background:'#f3f4f6',border:'1px solid #e5e7eb',width:26,height:26,borderRadius:'50%',cursor:'pointer',fontSize:14,color:'#6b7280',display:'flex',alignItems:'center',justifyContent:'center'}}>×</button>
          </div>
        </div>

        {/* Ligne 2 : constantes rangée 1 */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(8,1fr)',gap:3,padding:'4px 10px 2px'}}>
          {CONSTANTES_R1.map(renderConst)}
        </div>
        {/* Ligne 3 : constantes rangée 2 */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(8,1fr)',gap:3,padding:'0 10px 5px'}}>
          {CONSTANTES_R2.map(renderConst)}
        </div>
      </div>

      {/* ── DEUX TIERS INFÉRIEURS ── */}
      {role==='as' ? null : (
        <div style={{flex:1,display:'flex',flexDirection:'column',minHeight:0}}>

          {/* Onglets */}
          <div style={{display:'flex',borderBottom:'1px solid #e5e7eb',background:'#f9fafb',flexShrink:0}}>
            {[
              {id:'prescriptions', l:'Prescriptions'},
              {id:'dxcare',        l:'Dossier médical'},
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
            {/* ── DOSSIER MÉDICAL (style DxCare) 2x3 ── */}
            {(onglet==='dxcare'||onglet==='clinique'||onglet==='evolution')&&(
              <div style={{flex:1,overflow:'hidden',padding:8,display:'flex',flexDirection:'column',gap:6}}>

                {/* Ligne 1 : MOTIF + DIAGNOSTIC */}
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,height:'15%',minHeight:70}}>
                  <DxCareCell label="Motifs de consultation" copyKey="motif" color="#374151"
                    value={anamnese} copyText={anamnese}
                    onChange={v=>{setAnamnese(v);dbSave({anamnese:v});}} readOnly={role==='ide'}/>
                  <DxCareCell label="Conclusion / Diagnostic final" copyKey="diag" color="#374151"
                    value={diagnostic} copyText={diagnostic}
                    onChange={v=>{setDiagnostic(v);dbSave({diagnostic:v});}} readOnly={role==='ide'}/>
                </div>

                {/* Ligne 2 : ATCD + ALLERGIE */}
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,height:'15%',minHeight:70}}>
                  <DxCareCell label="Antécédents" copyKey="atcd" color="#374151"
                    value={p.atcd||''} copyText={p.atcd||''}
                    onChange={v=>dbSave({atcd:v})} readOnly={role==='ide'}/>
                  <DxCareCell label="Allergie" copyKey="allergie" color="#374151"
                    value={p.allergie||''} copyText={p.allergie||''}
                    onChange={v=>dbSave({allergie:v})} readOnly={role==='ide'}/>
                </div>

                {/* Ligne 3 : CR CONSULTATION (gauche) + PRESCRIPTION (droite) */}
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,flex:1,minHeight:0}}>

                  {/* CR CONSULTATION */}
                  <div style={{display:'flex',flexDirection:'column',overflow:'hidden'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',background:'#37415118',padding:'7px 12px',borderRadius:'8px 8px 0 0',flexShrink:0}}>
                      <label style={{fontSize:12,fontWeight:700,color:'#374151'}}>Compte rendu de consultation</label>
                      <CopyBtn text={(anamnese?'MOTIF:\n'+anamnese+'\n\n':'')+(examen?'EXAMEN:\n'+examen+'\n\n':'')+(evolution?'EVOLUTION:\n'+evolution:'')} label="Copier"/>
                    </div>
                    <div style={{flex:1,border:'1.5px solid #37415133',borderTop:'none',borderRadius:'0 0 8px 8px',overflow:'hidden',display:'flex',flexDirection:'column',background:'#fff'}}>
                      {role!=='ide'&&(
                        <div style={{display:'flex',gap:4,padding:'3px 4px',borderBottom:'1px solid #e5e7eb',flexShrink:0,background:'#fafafa'}}>
                          {[{l:'Examen normal adulte',v:EXAMEN_NORMAL_ADULTE,c:'#16a34a'},{l:'Examen normal enfant',v:EXAMEN_NORMAL_ENFANT,c:'#3b82f6'}].map(o=>(
                            <button key={o.l} onClick={()=>{
                              const dejaPresent = examen.includes(o.v);
                              let nv;
                              if (dejaPresent) {
                                // Retirer le bloc normal du texte existant
                                nv = examen.replace(o.v,'').replace(/\n{3,}/g,'\n\n').trim();
                              } else {
                                // Ajouter sans écraser le texte déjà saisi
                                nv = examen ? examen.trim()+'\n\n'+o.v : o.v;
                              }
                              setExamen(nv);dbSave({examen_clinique:nv});
                            }}
                              style={{padding:'2px 8px',borderRadius:4,fontSize:9,fontWeight:600,cursor:'pointer',background:examen.includes(o.v)?o.c:'#fff',color:examen.includes(o.v)?'#fff':o.c,border:'1px solid '+o.c+'44'}}>
                              {examen.includes(o.v)?'✓ ':''}{o.l}
                            </button>
                          ))}
                        </div>
                      )}
                      {p.symptome==='plaie'
                        ? <div style={{display:'flex',flexDirection:'column',flex:1,overflow:'hidden'}}>
                            <SchemaPlaie plaies={plaies} setPlaies={pl=>{setPlaies(pl);dbSave({plaies_data:JSON.stringify(pl)});}} save={dbSave} notesInit={p.notes_plaie||''}/>
                            {role==='ide'
                              ? <div style={{flex:1,overflow:'auto',fontSize:11,color:'#374151',whiteSpace:'pre-wrap',padding:4,borderTop:'1px solid #e5e7eb'}}>{examen||''}</div>
                              : <textarea value={examen} onChange={e=>{setExamen(e.target.value);dbSave({examen_clinique:e.target.value});}} placeholder="Notes complémentaires..." style={{flex:1,border:'none',borderTop:'1px solid #e5e7eb',outline:'none',fontSize:11,resize:'none',fontFamily:'system-ui',padding:6}}/>
                            }
                          </div>
                        : role==='ide'
                          ? <div style={{flex:1,overflow:'auto',fontSize:11,color:'#374151',whiteSpace:'pre-wrap',padding:6}}>{examen||''}{evolution&&'\n\n--- Évolution ---\n'+evolution}</div>
                          : <div style={{flex:1,display:'flex',flexDirection:'column'}}>
                              <textarea value={examen} onChange={e=>{setExamen(e.target.value);dbSave({examen_clinique:e.target.value});}} placeholder="Examen clinique, constantes, résultats..." style={{flex:2,border:'none',borderBottom:'1px dashed #e5e7eb',outline:'none',fontSize:11,resize:'none',fontFamily:'system-ui',padding:6}}/>
                              <textarea value={evolution} onChange={e=>{setEvolution(e.target.value);dbSave({evolution:e.target.value});}} placeholder="Évolution post-traitement..." style={{flex:1,border:'none',outline:'none',fontSize:11,resize:'none',fontFamily:'system-ui',padding:6}}/>
                            </div>
                      }
                    </div>
                  </div>

                  {/* PRESCRIPTION */}
                  <div style={{display:'flex',flexDirection:'column',overflow:'hidden'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',background:'#37415118',padding:'7px 12px',borderRadius:'8px 8px 0 0',flexShrink:0}}>
                      <label style={{fontSize:12,fontWeight:700,color:'#374151'}}>Prescription médicale</label>
                      <CopyBtn text={ordonnance} label="Copier"/>
                    </div>
                    <div style={{flex:1,border:'1.5px solid #37415133',borderTop:'none',borderRadius:'0 0 8px 8px',overflow:'hidden',display:'flex',flexDirection:'column',background:'#fff',gap:4,padding:4}}>
                      {role!=='ide'&&<div style={{display:'flex',gap:4,flexWrap:'wrap',flexShrink:0}}>
                        {p.symptome==='plaie'&&<SutureSection p={p} save={saveNow}/>}
                        {(p.symptome==='asthme'||p.symptome==='detresse_respi')&&(
                          <button onClick={()=>{
                            const pds=parseFloat(p.poids)||0;const ag=parseFloat(p.age)||99;
                            const b=pds>0?(pds<15?2:pds<30?4:6):6;
                            const dev=ag<3?'Chambre d\'inhalation + masque nourrisson (ex: Babyhaler)':ag<6?'Chambre d\'inhalation + masque enfant':'Chambre d\'inhalation + embout buccal';
                            const txt='TRAITEMENT ASTHME\n\nSalbutamol (Ventoline) 100µg/bouffée\n→ Dispositif : '+dev+'\n→ '+b+' bouffée'+(b>1?'s':'')+' toutes les 4-6h si besoin (max 3x/j)\n→ Technique : 1 bouffée à la fois, attendre 30 sec entre chaque bouffée\n\nEN CAS DE CRISE :\n→ 1 bouffée/30 sec jusqu\'à '+b*2+' bouffées max\n→ Attendre 20 min — si pas d\'amélioration, recommencer\n→ Si pas d\'amélioration après 2 séries → CONSULTER EN URGENCE\n\nSIGNES D\'ALARME → APPELER LE 15 :\n• Difficulté à parler ou marcher\n• Lèvres ou ongles bleutés\n• Pas d\'amélioration malgré le traitement\n• Somnolence\n\nRDV médecin dans les 48h pour réévaluation\nRDV consultation chronique asthme à programmer';
                            setOrdonnance(prev=>prev?prev+'\n\n'+txt:txt);dbSave({ordonnance:ordonnance?ordonnance+'\n\n'+txt:txt});
                          }} style={{padding:'3px 8px',borderRadius:5,background:'#eff6ff',color:'#3b82f6',fontSize:10,fontWeight:600,border:'1px solid #bfdbfe',cursor:'pointer'}}>
                            💨 Asthme
                          </button>
                        )}
                        <OrdonnancesRapides p={p} ordonnance={ordonnance} setOrdonnance={setOrdonnance} dbSave={dbSave}/>
                        {p.symptome==='plaie'&&plaies.length>0&&(
                          <button onClick={()=>{
                            const JOURS={tete:5,cou:7,tronc:10,abdomen:10,bras:10,avant_bras:10,main:10,cuisse:12,jambe:12,cheville:14,pied:14,genou:14,coude:14,dos:10};
                            const LABELS={tete:'tête',cou:'cou',tronc:'tronc',abdomen:'abdomen',bras:'bras',avant_bras:'avant-bras',main:'main',cuisse:'cuisse',jambe:'jambe',cheville:'cheville',pied:'pied',genou:'genou',coude:'coude',dos:'dos'};
                            const today=new Date();const sutAct=safeJSON(p.sutures,[]);const agr=sutAct.includes('sut_agraf');
                            const base='Soins plaie(s):\n• Laver eau savon, secher\n• Compresse + Biseptine 1x/j\n• Pansement simple\n\nIDEL:\n';
                            const lig=plaies.map((pl,i)=>{const j=JOURS[pl.zone]||10;const z=LABELS[pl.zone]||pl.zone;const d=new Date(today.getTime()+j*24*3600*1000).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric'});return '• Plaie '+(i+1)+' ('+z+'): '+(agr?'retirer agrafes':'retirer fils')+' ('+pl.points+'pt) dans '+j+'j (le '+d+')';}).join('\n');
                            const txt=base+lig;setOrdonnance(prev=>prev?prev+'\n\n'+txt:txt);dbSave({ordonnance:ordonnance?ordonnance+'\n\n'+txt:txt});
                            const rx=plaies.map((pl,i)=>{const j=JOURS[pl.zone]||10;const z=LABELS[pl.zone]||pl.zone;const d=new Date(today.getTime()+j*24*3600*1000).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric'});return {texte:'RDV retrait '+(agr?'agrafes':'fils')+' Plaie '+(i+1)+' ('+z+') le '+d,categorie:'soin',fait:false,nonRealise:false,ts:Date.now()+i,par:user?.matricule||'',parNom:user?.nom||''};});
                            ajouterPlusieursRx(rx);
                          }} style={{padding:'3px 8px',borderRadius:5,background:'#f0fdfa',color:'#374151',fontSize:10,fontWeight:600,border:'1px solid #99f6e4',cursor:'pointer'}}>
                            ✨ Plaie
                          </button>
                        )}
                      </div>}
                      {role==='ide'
                        ? <div style={{flex:1,overflow:'auto',fontSize:11,color:'#374151',whiteSpace:'pre-wrap',padding:4}}>{ordonnance||''}</div>
                        : <textarea value={ordonnance} onChange={e=>{setOrdonnance(e.target.value);dbSave({ordonnance:e.target.value});}} placeholder="Ordonnance de sortie..." style={{flex:1,border:'none',outline:'none',fontSize:11,resize:'none',fontFamily:'system-ui',padding:4}}/>
                      }
                    </div>
                  </div>

                </div>

                {/* Bouton copie complète */}
                {role!=='ide'&&(
                  <CopyBtn
                    text={'PATIENT IPP '+(p.ipp||'?')+' — '+p.age+' ans\n\nCONSTANTES:\nFC:'+getVal('fc',p.fc)+'bpm | SpO2:'+getVal('sat',p.sat)+'% | T°:'+getVal('temp',p.temp)+'°C\nPAS:'+getVal('tas',p.tas)+' PAD:'+getVal('tad',p.tad)+' PAM:'+(pamVal||'--')+'mmHg\nDextro:'+getVal('dextro',p.dextro)+' | Hb:'+getVal('hemocue',p.hemocue)+'\n\nMOTIF:\n'+(anamnese||'--')+'\n\nEXAMEN CLINIQUE:\n'+(examen||'--')+'\n\nEVOLUTION:\n'+(evolution||'--')+'\n\nDIAGNOSTIC:\n'+(diagnostic||'--')+'\n\nPRESCRIPTIONS:\n'+prescriptions.map(r=>'- ['+(r.fait?'FAIT':r.nonRealise?'NON REALISE':'EN ATTENTE')+'] '+r.texte).join('\n')+'\n\nORDONNANCE:\n'+(ordonnance||'--')}
                    label="📋 Copier-coller complet pour DxCare"
                    fullWidth={true}
                  />
                )}

              </div>
            )}

            {/* ── PRESCRIPTIONS ── */}
            {onglet==='prescriptions'&&(
              role==='ide' ? (
                /* VUE IDE : 3 colonnes plein écran */
                <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',minHeight:0}}>
                  {/* Bandeau soins rapides pour patients soins IDE */}
                  {p.symptome==='soins_ide'&&(
                    <div style={{background:'#eff6ff',borderBottom:'1px solid #bfdbfe',padding:'8px 12px',flexShrink:0}}>
                      <div style={{fontSize:11,fontWeight:700,color:'#1d4ed8',marginBottom:6}}>Soins infirmiers — prescription rapide</div>
                      <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                        {[
                          {l:'Injection IM',c:'soin'},{l:'Pansement simple',c:'soin'},{l:'Pansement complexe',c:'soin'},
                          {l:'Biologie délocalisée',c:'examen'},{l:'Prélèvement Mamoudzou',c:'examen'},
                        ].map(({l,c})=>{
                          const deja=prescriptions.find(r=>!r.fait&&!r.nonRealise&&r.texte===l);
                          return !deja&&(
                            <button key={l} onClick={()=>ajouterRx(l,c)}
                              style={{padding:'5px 10px',borderRadius:7,fontSize:11,fontWeight:600,cursor:'pointer',
                                background:c==='soin'?'#fef3c7':'#f3e8ff',
                                color:c==='soin'?'#92400e':'#6b21a8',
                                border:'1px solid '+(c==='soin'?'#fde68a':'#e9d5ff')}}>
                              + {l}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  <div style={{flex:1,display:'flex',gap:0,minHeight:0,overflow:'hidden'}}>
                    {[
                      {cat:'examen',        titre:'🔬 Examens',     color:'#7c3aed'},
                      {cat:'therapeutique', titre:'💊 Thérapeutique',color:'#ea580c'},
                      {cat:'soin',          titre:'🩹 Soins',        color:'#0d9488'},
                    ].map(({cat,titre,color})=>{
                      const items = prescriptions.filter(r=>r.categorie===cat);
                      return (
                        <div key={cat} style={{flex:1,borderRight:'1px solid #e5e7eb',display:'flex',flexDirection:'column',overflow:'hidden',minHeight:0}}>
                          <div style={{background:color+'18',padding:'10px 14px',borderBottom:'1px solid '+color+'22',flexShrink:0}}>
                            <span style={{fontWeight:700,color,fontSize:13}}>{titre}</span>
                          </div>
                          <div style={{flex:1,overflowY:'auto',padding:10,display:'flex',flexDirection:'column',gap:6,minHeight:0}}>
                            <AjouterNote cat={cat} color={color} p={p} user={user} transmissions={transmissions} setTransmissions={setTransmissions}/>
                            {items.length===0&&<div style={{color:'#9ca3af',fontSize:12,textAlign:'center',marginTop:8}}>Aucune prescription</div>}
                            {items.map((r,i)=>{
                              const gi=prescriptions.indexOf(r);
                              return <IDERxItem key={i} r={r} color={color} onCocher={()=>cocherRx(gi)} onNonRealise={(m)=>nonRealiserRx(gi,m)} onAnnuler={()=>annulerRealisation(gi)} user={user}
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
                /* VUE MÉDECIN : 3 colonnes larges, propositions toujours visibles */
                <div style={{flex:1,display:'flex',minHeight:0,overflow:'hidden'}}>
                  {[
                    {cat:'examen',        titre:'🔬 Examens',      color:'#7c3aed'},
                    {cat:'therapeutique', titre:'💊 Thérapeutique', color:'#ea580c'},
                    {cat:'soin',          titre:'🩹 Soins',         color:'#0d9488'},
                  ].map(({cat,titre,color})=>{
                    const prescritsCategorie = prescriptions.filter(r=>r.categorie===cat);
                    const enAttenteCategorie = prescritsCategorie.filter(r=>!r.fait&&!r.nonRealise);
                    return (
                      <div key={cat} style={{flex:1,borderRight:'1px solid #e5e7eb',display:'flex',flexDirection:'column',overflow:'hidden',minHeight:0}}>
                        <div style={{background:color+'18',padding:'10px 14px',borderBottom:'1px solid '+color+'22',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                          <span style={{fontWeight:700,color,fontSize:13}}>{titre}</span>
                          {enAttenteCategorie.length>0&&<span style={{background:'#ef4444',color:'#fff',borderRadius:99,fontSize:9,padding:'1px 6px'}}>{enAttenteCategorie.length}</span>}
                        </div>
                        <div style={{flex:1,overflowY:'auto',padding:10,display:'flex',flexDirection:'column',gap:8,minHeight:0}}>
                          {prescritsCategorie.length>0 && (
                            <div style={{display:'flex',flexDirection:'column',gap:6}}>
                              {prescritsCategorie.map(r=>{
                                const gi=prescriptions.indexOf(r);
                                return <PrescrItemMedecin key={gi} r={r} gi={gi} prescriptions={prescriptions} setPrescriptions={setPrescriptions} p={p} user={user} supprimerRx={supprimerRx}/>;
                              })}
                            </div>
                          )}
                          {cat==='examen' && (
                            <div style={{display:'flex',flexDirection:'column',gap:6}}>
                              <div style={{display:'flex',flexWrap:'wrap',gap:5}}><AutreLibre categorie="examen" onAjouter={ajouterRx}/></div>
                              {EXAMENS_ROWS.map((row,ri)=>{
                                const rendus = row.map(e=>{
                                  if(e.sub) return <SubBtn key={e.id} e={e} prescriptions={prescriptions} onAjouter={ajouterRx} subOpen={subOpen} setSubOpen={setSubOpen}/>;
                                  const deja=prescriptions.find(r=>!r.fait&&!r.nonRealise&&r.texte?.startsWith(e.label));
                                  if(deja) return null;
                                  return <RxBtn key={e.id} label={e.label} color={e.color} onClick={()=>ajouterRx(e.label,'examen')}/>;
                                }).filter(Boolean);
                                if(!rendus.length) return null;
                                return <div key={ri} style={{display:'flex',flexWrap:'wrap',gap:5}}>{rendus}</div>;
                              })}
                            </div>
                          )}
                          {cat==='therapeutique' && (
                            <TheraSection prescriptions={prescriptions} onAjouter={ajouterRx} onAjouterPlusieurs={ajouterPlusieursRx} patient={p}/>
                          )}
                          {cat==='soin' && (
                            <div style={{display:'flex',flexDirection:'column',gap:6}}>
                              <div style={{display:'flex',flexWrap:'wrap',gap:5}}><AutreLibre categorie="soin" onAjouter={ajouterRx}/></div>
                              {SOINS_ROWS.map((row,ri)=>{
                                const rendus = row.map(s=>{
                                  const deja=prescriptions.find(r=>!r.fait&&!r.nonRealise&&r.texte===s.label);
                                  if(deja) return null;
                                  return <RxBtn key={s.id} label={s.label} color={s.color} onClick={()=>ajouterRx(s.label,'soin')}/>;
                                }).filter(Boolean);
                                return (
                                  <div key={ri} style={{display:'flex',flexDirection:'column',gap:6}}>
                                    {rendus.length>0 && <div style={{display:'flex',flexWrap:'wrap',gap:5}}>{rendus}</div>}
                                    {ri===1 && <div style={{display:'flex',flexWrap:'wrap',gap:5}}><OxygeneSelector prescriptions={prescriptions} onAjouter={ajouterRx}/></div>}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* Modale Prélèvement Mamoudzou */}
      {modalePrelev&&(
        <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,zIndex:10001,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{background:'#fff',borderRadius:14,padding:24,width:360,boxShadow:'0 24px 64px rgba(0,0,0,0.2)'}}>
            <div style={{fontWeight:700,fontSize:15,color:'#0284c7',marginBottom:4}}>🧪 Prélèvement Mamoudzou</div>
            <div style={{fontSize:12,color:'#6b7280',marginBottom:16}}>Coordonnées patient pour suivi des résultats (conservées 7 jours)</div>
            <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:20}}>
              <div>
                <label style={{fontSize:11,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Téléphone</label>
                <input value={prelevTel} onChange={e=>setPrelevTel(e.target.value)} inputMode="tel"
                  style={{width:'100%',padding:'9px 12px',borderRadius:8,border:'1.5px solid #e5e7eb',fontSize:14,outline:'none',boxSizing:'border-box'}}
                  placeholder="06 xx xx xx xx"/>
              </div>
              <div>
                <label style={{fontSize:11,fontWeight:700,color:'#374151',display:'block',marginBottom:4}}>Village / Quartier</label>
                <input value={prelevVille} onChange={e=>setPrelevVille(e.target.value)}
                  style={{width:'100%',padding:'9px 12px',borderRadius:8,border:'1.5px solid #e5e7eb',fontSize:14,outline:'none',boxSizing:'border-box'}}
                  placeholder="Ex: Bandraboua, Mamoudzou..."/>
              </div>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>setModalePrelev(null)}
                style={{flex:1,padding:'10px',borderRadius:8,background:'#f3f4f6',color:'#6b7280',fontSize:13,fontWeight:600,border:'none',cursor:'pointer'}}>
                Annuler
              </button>
              <button onClick={validerPrelev}
                style={{flex:2,padding:'10px',borderRadius:8,background:'#0284c7',color:'#fff',fontSize:13,fontWeight:700,border:'none',cursor:'pointer'}}>
                ✓ Confirmer prélèvement
              </button>
            </div>
          </div>
        </div>
      )}
      {showEditIdentite&&(
        <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,zIndex:10000,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{background:'#fff',borderRadius:14,padding:'24px',width:360,boxShadow:'0 24px 64px rgba(0,0,0,0.2)'}}>
            <div style={{fontWeight:700,fontSize:15,color:'#111827',marginBottom:16}}>Modifier l'identité</div>
            {[
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

function PrescrItemMedecin({r, gi, prescriptions, setPrescriptions, p, user, supprimerRx}) {
  const bc = r.categorie==='examen'?'#7c3aed':r.categorie==='therapeutique'?'#ea580c':'#0d9488';
  const poMatch = r.texte.match(/^(.+?) ×(\d+)$/);
  const isPO = !!poMatch;
  const nbComp = isPO ? parseInt(poMatch[2]) : null;

  function sauvegarder(rx) {
    setPrescriptions(rx);
    fetch('/api/patients',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'update',id:p.id,patch:{prescriptions:JSON.stringify(rx)}})});
  }

  function majQuantite(nouveau) {
    const rx=[...prescriptions];
    rx[gi]={...rx[gi],texte:poMatch[1]+' ×'+nouveau};
    sauvegarder(rx);
  }

  function cocher() {
    const rx=[...prescriptions];
    rx[gi]={...rx[gi],fait:true,faitPar:user?.matricule,faitNom:user?.nom,faitA:Date.now()};
    sauvegarder(rx);
  }

  function annulerRealisation() {
    const rx=[...prescriptions];
    rx[gi]={...rx[gi],fait:false,nonRealise:false,resultat:null,faitPar:null,faitNom:null,faitA:null};
    sauvegarder(rx);
  }

  // Prescription réalisée : coché, biffé, on sait qui/quand (peu importe médecin ou IDE)
  if (r.fait) {
    return (
      <div style={{background:'#f9fafb',border:'1px solid #e5e7eb',borderRadius:7,padding:'6px 8px',opacity:0.75}}>
        <div style={{display:'flex',alignItems:'flex-start',gap:6}}>
          <div style={{width:16,height:16,borderRadius:4,background:bc,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:1}}>
            <span style={{color:'#fff',fontSize:10}}>✓</span>
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:11,color:'#9ca3af',textDecoration:'line-through',lineHeight:1.3}}>{isPO?poMatch[1]:r.texte}</div>
            <div style={{fontSize:8,color:'#16a34a',marginTop:2}}>Réalisé par {r.faitNom||r.faitPar}{r.faitA?' à '+new Date(r.faitA).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}):''}</div>
          </div>
          <button onClick={annulerRealisation} title="Annuler — erreur de clic"
            style={{flexShrink:0,padding:'2px 6px',borderRadius:4,background:'#fff',color:'#9ca3af',fontSize:9,fontWeight:600,border:'1px solid #e5e7eb',cursor:'pointer'}}>↺</button>
        </div>
      </div>
    );
  }

  // Prescription marquée non réalisée (par l'IDE)
  if (r.nonRealise) {
    return (
      <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:7,padding:'6px 8px',opacity:0.85}}>
        <div style={{display:'flex',alignItems:'flex-start',gap:6}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:11,color:'#ef4444',textDecoration:'line-through',lineHeight:1.3}}>{r.texte}</div>
            <div style={{fontSize:8,color:'#dc2626',marginTop:2}}>✕ {r.motifNonRealise||'Non réalisé'}</div>
          </div>
          <button onClick={()=>supprimerRx(gi)} title="Supprimer"
            style={{flexShrink:0,width:16,height:16,borderRadius:3,border:'1px solid #fecaca',background:'#fff',color:'#ef4444',cursor:'pointer',fontSize:10,display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
        </div>
      </div>
    );
  }

  // En attente : case à cocher (le médecin peut marquer lui-même comme fait)
  return (
    <div style={{background:'#fff',border:'1px solid '+bc+'44',borderRadius:7,padding:'6px 8px'}}>
      <div style={{display:'flex',alignItems:'flex-start',gap:4}}>
        <div onClick={cocher} title="Marquer comme réalisé (par le médecin)"
          style={{width:16,height:16,borderRadius:4,border:'2px solid '+bc,background:'#fff',cursor:'pointer',flexShrink:0,marginTop:1}}/>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:11,color:'#374151',lineHeight:1.3}}>{isPO?poMatch[1]:r.texte}</div>
          <div style={{fontSize:8,color:'#9ca3af',marginTop:2}}>{r.parNom||r.par} · {r.ts?new Date(r.ts).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}):''}</div>
        </div>
        {isPO&&(
          <div style={{display:'flex',alignItems:'center',gap:3,flexShrink:0}}>
            <button onClick={()=>majQuantite(Math.max(1,nbComp-1))}
              style={{width:20,height:20,borderRadius:4,border:'1px solid #d1d5db',background:'#f3f4f6',color:'#374151',cursor:'pointer',fontSize:14,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700}}>−</button>
            <span style={{fontSize:12,fontWeight:700,color:'#0d9488',minWidth:22,textAlign:'center'}}>×{nbComp}</span>
            <button onClick={()=>majQuantite(nbComp+1)}
              style={{width:20,height:20,borderRadius:4,border:'1px solid #d1d5db',background:'#f3f4f6',color:'#374151',cursor:'pointer',fontSize:14,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700}}>+</button>
          </div>
        )}
        <button onClick={()=>supprimerRx(gi)} title="Supprimer"
          style={{flexShrink:0,width:16,height:16,borderRadius:3,border:'1px solid #fecaca',background:'#fef2f2',color:'#ef4444',cursor:'pointer',fontSize:10,display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
      </div>
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

function OxygeneSelector({prescriptions, onAjouter}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({top:0,left:0});
  const btnRef = useRef(null);
  const OPTIONS = ['O2 lunettes','O2 masque moyenne concentration','O2 masque haute concentration'];
  const deja = prescriptions.find(r=>!r.fait&&!r.nonRealise&&OPTIONS.includes(r.texte));

  if (deja) return (
    <div style={{padding:'5px 10px',borderRadius:6,background:'#ecfeff',color:'#0891b2',border:'1.5px solid #a5f3fc',fontSize:11,fontWeight:600,display:'inline-block'}}>
      ✓ {deja.texte}
    </div>
  );

  return (
    <div style={{position:'relative',display:'inline-block'}}>
      <button ref={btnRef} onClick={()=>{
        const r=btnRef.current?.getBoundingClientRect();
        if(r)setPos({top:r.bottom+4,left:r.left});
        setOpen(o=>!o);
      }}
        onMouseEnter={ev=>{ev.currentTarget.style.filter='brightness(0.85)';}}
        onMouseLeave={ev=>{ev.currentTarget.style.filter='none';}}
        style={{padding:'5px 10px',borderRadius:6,background:'#0891b215',color:'#0891b2',border:'1.5px solid #0891b255',fontSize:11,fontWeight:600,cursor:'pointer'}}>
        Oxygène {open?'▲':'▼'}
      </button>
      {open&&(
        <div style={{position:'fixed',zIndex:9999,top:pos.top,left:pos.left,background:'#fff',border:'1.5px solid #a5f3fc',borderRadius:10,padding:8,boxShadow:'0 8px 24px rgba(0,0,0,0.15)',minWidth:220}}>
          {OPTIONS.map(label=>(
            <div key={label} onClick={()=>{onAjouter(label,'soin');setOpen(false);}}
              style={{padding:'6px 8px',borderRadius:6,cursor:'pointer',fontSize:11,fontWeight:600,color:'#0891b2'}}
              onMouseEnter={ev=>{ev.currentTarget.style.background='#0891b215';}}
              onMouseLeave={ev=>{ev.currentTarget.style.background='transparent';}}>
              {label}
            </div>
          ))}
          <button onClick={()=>setOpen(false)} style={{marginTop:6,width:'100%',padding:'5px',borderRadius:6,background:'#f3f4f6',color:'#6b7280',border:'none',fontSize:11,cursor:'pointer'}}>Fermer</button>
        </div>
      )}
    </div>
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
      + Autre prescription, saisie libre
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

function IDERxItem({r, color, onCocher, onNonRealise, onCocherAvecResultat, onAnnuler, user}) {
  const [showMotif, setShowMotif] = useState(false);
  const [motif, setMotif] = useState('');
  const [showResultat, setShowResultat] = useState(false);
  const [resultatVal, setResultatVal] = useState('');
  const [buVals, setBuVals] = useState({leuco:'Nég',nitrite:'Nég',cetone:'Nég',glucose:'Nég'});

  // Détecter si cette prescription correspond à une constante
  const constInfo = Object.entries(CONST_RX_MAP).find(([k])=>r.texte?.startsWith(k))?.[1];

  if (r.fait) return (
    <div style={{padding:'10px 12px',borderRadius:8,border:'1px solid #e5e7eb',background:'#f9fafb',opacity:0.7}}>
      <div style={{display:'flex',alignItems:'center',gap:8}}>
        <div style={{width:22,height:22,borderRadius:5,background:color,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          <span style={{color:'#fff',fontSize:12}}>✓</span>
        </div>
        <div style={{flex:1}}>
          <div style={{fontSize:13,color:'#9ca3af',textDecoration:'line-through'}}>{r.texte}</div>
          {r.faitA&&<div style={{fontSize:10,color:'#16a34a',marginTop:2}}>Réalisé par {r.faitNom||r.faitPar} à {new Date(r.faitA).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</div>}
          {r.resultat&&<div style={{fontSize:11,color:'#374151',marginTop:2}}>{r.resultat}</div>}
        </div>
        {onAnnuler&&<button onClick={onAnnuler} title="Annuler — erreur de clic"
          style={{flexShrink:0,padding:'3px 8px',borderRadius:5,background:'#fff',color:'#9ca3af',fontSize:9,fontWeight:600,border:'1px solid #e5e7eb',cursor:'pointer'}}>
          ↺ Annuler
        </button>}
      </div>
    </div>
  );

  if (r.nonRealise) return (
    <div style={{padding:'10px 12px',borderRadius:8,border:'1px solid #fecaca',background:'#fef2f2',opacity:0.8}}>
      <div style={{display:'flex',alignItems:'flex-start',gap:8}}>
        <div style={{flex:1}}>
          <div style={{fontSize:13,color:'#ef4444',textDecoration:'line-through'}}>{r.texte}</div>
          <div style={{fontSize:10,color:'#dc2626',marginTop:3}}>✕ {r.motifNonRealise||'Non réalisé'}</div>
        </div>
        {onAnnuler&&<button onClick={onAnnuler} title="Annuler — erreur de clic"
          style={{flexShrink:0,padding:'3px 8px',borderRadius:5,background:'#fff',color:'#9ca3af',fontSize:9,fontWeight:600,border:'1px solid #fecaca',cursor:'pointer'}}>
          ↺ Annuler
        </button>}
      </div>
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
    <div style={{borderRadius:8,border:'2px solid '+color+'55',background:'#fff',overflow:'hidden',flexShrink:0}}>
      <div onClick={onCocher} style={{padding:'8px 10px',cursor:'pointer',display:'flex',alignItems:'center',gap:8,transition:'background 0.1s'}}
        onMouseEnter={e=>e.currentTarget.style.background=color+'11'}
        onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
        <div style={{width:20,height:20,borderRadius:5,border:'2px solid '+color,background:'#fff',flexShrink:0}}/>
        <div style={{flex:1}}>
          <div style={{fontSize:12,fontWeight:600,color:'#374151',lineHeight:1.3}}>{r.texte}</div>
          {r.ts&&<div style={{fontSize:8,color:'#9ca3af',marginTop:1}}>Prescrit par {r.parNom||r.par} à {new Date(r.ts).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</div>}
        </div>
      </div>
      <div style={{borderTop:'1px solid '+color+'22',padding:'2px 10px',display:'flex',justifyContent:'flex-end'}}>
        <button onClick={()=>setShowMotif(true)}
          style={{padding:'2px 7px',borderRadius:4,background:'#fef2f2',color:'#ef4444',fontSize:9,fontWeight:600,border:'1px solid #fecaca',cursor:'pointer'}}>
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
    {id:'soin', label:'🩹 Soin', color:'#0d9488'},
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

function TheraSection({prescriptions, onAjouter, onAjouterPlusieurs, patient}) {
  const age = parseFloat(patient?.age);
  const estEnfant = !isNaN(age) && age < 16;
  const [tab, setTab] = useState(estEnfant ? 'pediatrie' : 'adulte');
  useEffect(()=>{ if(estEnfant) setTab('pediatrie'); }, [estEnfant]);
  const [voieOuverte, setVoieOuverte] = useState(null);
  const [voieListeComplete, setVoieListeComplete] = useState(false);
  useEffect(()=>{ setVoieOuverte(null); setVoieListeComplete(false); }, [tab]); // on referme tout en changeant d'onglet adulte/pédiatrie
  // Médicaments les plus fréquents en garde (proposition à valider/corriger
  // par l'équipe médicale — pas de statistique d'usage disponible dans
  // l'appli pour la déterminer automatiquement). Affichés par défaut dans
  // chaque catégorie ; "Liste entière" révèle tout le reste.
  const FREQUENTS_ADULTE = [
    // Per os
    {label:'Acétylleucine 500mg PO (Tanganil)', voie:'PO', color:'#16a34a', cat:'Neuro-sédation'},
    {label:'Amlodipine 5mg PO (Amlor)', voie:'PO', color:'#16a34a', cat:'Cardio-vasculaire'},
    {label:'Amoxicilline 500mg PO', voie:'PO', color:'#16a34a', cat:'Anti-infectieux'},
    {label:'Augmentin 500mg PO', voie:'PO', color:'#16a34a', cat:'Anti-infectieux'},
    {label:'Azithromycine 250mg PO (Zithromax)', voie:'PO', color:'#16a34a', cat:'Anti-infectieux'},
    {label:'Cétirizine 10mg PO', voie:'PO', color:'#16a34a', cat:'Allergologie / Corticoïdes'},
    {label:'Furosémide 20mg PO (Lasilix)', voie:'PO', color:'#16a34a', cat:'Cardio-vasculaire'},
    {label:'Gaviscon 1 sachet PO', voie:'PO', color:'#16a34a', cat:'Digestif'},
    {label:'Hydroxyzine 25mg PO (Atarax)', voie:'PO', color:'#16a34a', cat:'Allergologie / Corticoïdes'},
    {label:'Ibuprofène 200mg PO', voie:'PO', color:'#16a34a', cat:'Antalgique'},
    {label:'Lansoprazole 15mg PO', voie:'PO', color:'#16a34a', cat:'Digestif'},
    {label:'Métoclopramide 10mg PO (Primpéran)', voie:'PO', color:'#16a34a', cat:'Digestif'},
    {label:'Nicardipine 10mg PO (Loxen)', voie:'PO', color:'#16a34a', cat:'Cardio-vasculaire'},
    {label:'Nifédipine 50mg PO (Loxen LP)', voie:'PO', color:'#16a34a', cat:'Cardio-vasculaire'},
    {label:'Ofloxacine 200mg PO', voie:'PO', color:'#16a34a', cat:'Anti-infectieux'},
    {label:'Oxazépam 10mg PO (Seresta)', voie:'PO', color:'#16a34a', cat:'Neuro-sédation'},
    {label:'Paracétamol 500mg PO', voie:'PO', color:'#16a34a', cat:'Antalgique'},
    {label:'Phloroglucinol 80mg PO (Spasfon)', voie:'PO', color:'#16a34a', cat:'Antalgique'},
    {label:'Prednisolone 20mg PO (Solupred)', voie:'PO', color:'#16a34a', cat:'Allergologie / Corticoïdes'},
    {label:'Propranolol 10mg PO', voie:'PO', color:'#16a34a', cat:'Cardio-vasculaire'},
    {label:'Tramadol 50mg PO (Topalgic)', voie:'PO', color:'#16a34a', cat:'Antalgique'},
    // Nébulisation
    {label:'MEOPA', voie:'RESPI', color:'#0891b2', cat:'Antalgique'},
    // Auriculaire
    {label:'Ofloxacine solution auriculaire (Oflocet)', voie:'AURICULAIRE', color:'#a855f7', cat:'Anti-infectieux'},
    // IV
    {label:'Acétylleucine 500mg IV (Tanganil)', voie:'IV', color:'#2563eb', cat:'Neuro-sédation'},
    {label:'Acide tranexamique 500mg IV (Exacyl)', voie:'IV', color:'#2563eb', cat:'Réanimation / Antidotes'},
    {label:'Adrénaline 0.5mg IV', voie:'IV', color:'#2563eb', cat:'Réanimation / Antidotes'},
    {label:'Adrénaline 1mg IV', voie:'IV', color:'#2563eb', cat:'Réanimation / Antidotes'},
    {label:'Ceftriaxone 1g IV', voie:'IV', color:'#2563eb', cat:'Anti-infectieux'},
    {label:'Kétoprofène 100mg IV (Profenid)', voie:'IV', color:'#2563eb', cat:'Antalgique'},
    {label:'Néfopam 20mg IV (Acupan)', voie:'IV', color:'#2563eb', cat:'Antalgique'},
    {label:'Paracétamol 500mg IV (Perfalgan)', voie:'IV', color:'#2563eb', cat:'Antalgique'},
    {label:'Phloroglucinol 40mg IV (Spasfon)', voie:'IV', color:'#2563eb', cat:'Antalgique'},
    {label:'Tramadol 100mg IV (Topalgic)', voie:'IV', color:'#2563eb', cat:'Antalgique'},
    // IM
    {label:'Adrénaline 0.5mg IM', voie:'IM', color:'#6b7280', cat:'Réanimation / Antidotes'},
    {label:'Adrénaline 1mg IM', voie:'IM', color:'#6b7280', cat:'Réanimation / Antidotes'},
    {label:'Ceftriaxone 1g IM', voie:'IM', color:'#6b7280', cat:'Anti-infectieux'},
    {label:'Kétoprofène 100mg IM (Profenid)', voie:'IM', color:'#6b7280', cat:'Antalgique'},
    {label:'Vaccin Repevax IM', voie:'IM', color:'#6b7280', cat:'Autres'},
  ];
  // Liste à valider par l'équipe médicale — proposition initiale, pas une vraie
  // statistique d'usage (10 molécules les plus fréquentes en pédiatrie).
  const FREQUENTS_PEDIATRIE = [
    {label:'Paracétamol 15mg/kg PO (Doliprane)', voie:'PO', color:'#16a34a', cat:'Antalgique'},
    {label:'Ibuprofène 10mg/kg PO (Nurofen)', voie:'PO', color:'#16a34a', cat:'Antalgique'},
    {label:'Amoxicilline 50mg/kg/j PO (Clamoxyl)', voie:'PO', color:'#16a34a', cat:'Anti-infectieux'},
    {label:'Amox+Ac Clav 100mg/60ml PO (Augmentin)', voie:'PO', color:'#16a34a', cat:'Anti-infectieux'},
    {label:'Racécadotril 100mg PO (Tiorfan)', voie:'PO', color:'#16a34a', cat:'Digestif'},
    {label:'Sels réhydratation PO (Adiaril)', voie:'PO', color:'#16a34a', cat:'Digestif'},
    {label:'Cétirizine PO (Zyrtec)', voie:'PO', color:'#16a34a', cat:'Allergologie / Corticoïdes'},
    {label:'Paracétamol 15mg/kg IV (Perfalgan)', voie:'IV', color:'#2563eb', cat:'Antalgique'},
    {label:'Ceftriaxone 50mg/kg IV (Rocéphine)', voie:'IV', color:'#2563eb', cat:'Anti-infectieux'},
    {label:'Budésonide 0.5mg nébulisation (Pulmicort)', voie:'RESPI', color:'#64748b', cat:'Asthme'},
  ];
  const VOIES = {
    adulte: [
      {voie:'PO', label:'Voie orale', color:'#16a34a', items:[
        '__CAT__Antalgique',
        'Acide acétylsalicylique 500mg PO (Aspégic)', 'Ibuprofène 200mg PO', 'Ibuprofène 400mg PO (Antarène)',
        'Kétoprofène 100mg PO (Profenid)', 'Naproxène 550mg PO', 'Paracétamol 500mg PO', 'Paracétamol 1g PO',
        'Paracétamol codéïne 500mg PO', 'Phloroglucinol 80mg PO (Spasfon)', 'Tramadol 50mg PO (Topalgic)', 'Tramadol 100mg PO',
        '__CAT__Anti-infectieux',
        'Albendazole 4% PO (Zentel)', 'Amoxicilline 500mg PO', 'Artéméther-Luméfantrine PO (Coartem)', 'Augmentin 500mg PO',
        'Azithromycine 250mg PO (Zithromax)', 'Cefixime 40mg/5ml PO', 'Doxycycline 100mg PO', 'Ivermectine PO',
        'Ofloxacine 200mg PO',
        '__CAT__Cardio-vasculaire',
        'Acétylsalicylate de lysine 75mg PO (Kardegic)', 'Amlodipine 5mg PO (Amlor)', 'Clopidogrel 75mg PO',
        'Furosémide 40mg PO (Lasilix)', 'Furosémide 20mg PO (Lasilix)', 'Nicardipine 10mg PO (Loxen)',
        'Nifédipine 50mg PO (Loxen LP)', 'Propranolol 10mg PO', 'Rivaroxaban 15mg PO (Xarelto)',
        'Trinitrine 0.3mg PO (Natispray)',
        '__CAT__Respiratoire',
        'Salbutamol 100mcg aérosol (Ventoline)',
        '__CAT__Neuro-sédation',
        'Acétylleucine 500mg PO (Tanganil)', 'Clobazam 5mg PO (Urbanyl)', 'Clonazépam 1mg PO (Rivotril)',
        'Halopéridol 5mg PO', 'Lévétiracétam 500mg/5ml PO (Keppra)', 'Loxapine 50mg PO',
        'Midazolam 5mg PO (Hypnovel)', 'Oxazépam 10mg PO (Seresta)', 'Phénobarbital 200mg PO (Gardénal)',
        'Phénytoïne 250mg PO (Dilantin)', 'Tropatépine 10mg PO (Lépicur)',
        '__CAT__Digestif',
        'Charbon activé PO', 'Gaviscon 1 sachet PO', 'Lansoprazole 15mg PO', 'Métoclopramide 10mg PO (Primpéran)',
        'Métopimazine 7.5mg PO (Vogalène)', 'Pantoprazole 40mg PO',
        'Racécadotril 100mg PO (Tiorfan)', 'Sels réhydratation PO (Adiaril)',
        '__CAT__Allergologie / Corticoïdes',
        'Cétirizine 10mg PO', 'Dexchlorphéniramine PO (Polaramine)', 'Hydroxyzine 25mg PO (Atarax)',
        'Prednisolone 5mg PO (Solupred)', 'Prednisolone 20mg PO (Solupred)',
        '__CAT__Autres',
        'Lévonorgestrel 1.5mg PO',
      ]},
      {voie:'IV', label:'Voie IV', color:'#2563eb', items:[
        '__CAT__Antalgique',
        'Kétoprofène 100mg IV (Profenid)', 'Nalbuphine 20mg IV (Nubain)', 'Néfopam 20mg IV (Acupan)',
        'Paracétamol 1g IV (Perfalgan)', 'Paracétamol 500mg IV (Perfalgan)', 'Phloroglucinol 40mg IV (Spasfon)', 'Tramadol 100mg IV (Topalgic)',
        '__CAT__Anti-infectieux',
        'Amoxicilline 500mg IV', 'Amoxicilline 1g IV', 'Amoxicilline 2g IV', 'Amoxicilline/Ac. clavulanique 500mg IV (Augmentin)',
        'Amoxicilline/Ac. clavulanique 1g IV (Augmentin)', 'Amoxicilline/Ac. clavulanique 2g IV (Augmentin)', 'Ceftriaxone 1g IV', 'Ceftriaxone 2g IV', 'Métronidazole 500mg IV',
        '__CAT__Cardio-vasculaire',
        'Adénosine 6mg IV (Krenosin)', 'Amiodarone 150mg IV (Cordarone)', 'Digoxine 0.5mg IV',
        'Énoxaparine 4000UI IV (Lovenox)', 'Fondaparinux 2.5mg IV (Arixtra)', 'Furosémide 20mg IV (Lasilix)',
        'Furosémide 250mg IV (Lasilix spécial)', 'Nicardipine 10mg IV (Loxen)',
        '__CAT__Neuro-sédation',
        'Acétylleucine 500mg IV (Tanganil)', 'Clonazépam 1mg IV (Rivotril)', 'Diazépam 10mg IV (Valium)',
        'Étomidate 20mg IV (Lipuro)', 'Kétamine 250mg IV', 'Midazolam 50mg IV (Hypnovel)',
        'Phénobarbital 200mg IV (Gardénal)',
        '__CAT__Allergologie / Corticoïdes',
        'Dexchlorphéniramine 5mg IV (Polaramine)', 'Méthylprednisolone 40mg IV (Solumedrol)',
        'Méthylprednisolone 500mg IV (Solumedrol)',
        '__CAT__Réanimation / Antidotes',
        'Acide tranexamique 500mg IV (Exacyl)', 'Adrénaline 0.5mg IV', 'Adrénaline 1mg IV', 'Adrénaline sans sulfites 5mg IV (Longoni)',
        'Atropine 0.5mg IV', 'Flumazénil 0.5mg IV (Anexate)', 'Glucagon 1mg IV (Glucagen)',
        'Naloxone 0.4mg IV (Narcan)', 'Noradrénaline 8mg IV', 'Vitamine K1 10mg IV',
        '__CAT__Métabolique / Solutés',
        'Calcium gluconate 10% IV', 'Glucose 10% IV', 'Glucose 30% IV', 'Magnésium sulfate 10% IV', 'Mannitol 20% IV',
        'Potassium chlorure 10% IV', 'Sodium bicarbonate 4.2% IV', 'Vitamine B1 100mg IV (Bévitine)',
      ]},
      {voie:'HYDRATATION', label:'Hydratation IV', color:'#0891b2', special:'hydratation'},
      {voie:'IM', label:'Voie IM', color:'#6b7280', items:[
        '__CAT__Antalgique',
        'Kétoprofène 100mg IM (Profenid)', 'Morphine 10mg IM [STP]',
        '__CAT__Anti-infectieux',
        'Ceftriaxone 1g IM', 'Ceftriaxone 2g IM',
        '__CAT__Respiratoire',
        'Terbutaline 0.5mg IM (Bricanyl)',
        '__CAT__Neuro-sédation',
        'Clonazépam 1mg IM (Rivotril)', 'Diazépam 10mg IM rectal (Valium)', 'Halopéridol 5mg IM',
        'Halopéridol décanoate 50mg IM', 'Phénobarbital 200mg IM (Gardénal)',
        '__CAT__Allergologie / Corticoïdes',
        'Bétaméthasone LP IM (Célestène)', 'Triamcinolone 40mg IM (Kenacort Retard)',
        '__CAT__Réanimation / Antidotes',
        'Adrénaline 0.5mg IM', 'Adrénaline 1mg IM', 'Vitamine K1 10mg IM',
        '__CAT__Métabolique / Solutés',
        'Vitamine B1 100mg IM',
        '__CAT__Autres',
        'Vaccin Repevax IM',
      ]},
      {voie:'SC', label:'Voie SC', color:'#7c3aed', items:[
        '__CAT__Cardio-vasculaire',
        'Énoxaparine 4000UI SC (Lovenox)', 'Fondaparinux 2.5mg SC (Arixtra)',
        '__CAT__Respiratoire',
        'Terbutaline 0.5mg SC (Bricanyl)',
        '__CAT__Réanimation / Antidotes',
        'Adrénaline 0.5mg SC',
        '__CAT__Anesthésie locale',
        'Lidocaïne 1% SC', 'Lidocaïne 2% SC', 'Lidocaïne adrénalinée SC',
        '__CAT__Autres',
        'Vaccin antitétanique SC', 'Vaccin Hépatite B SC (Engerix B10)', 'Vaccin ROR SC (Priorix)',
      ]},
      {voie:'RESPI', label:'Respiratoire', color:'#64748b', items:[
        '__AEROSOL__',
        '__CAT__Asthme',
        'Budésonide 0.5mg nébulisation (Pulmicort)', 'Budésonide 1mg nébulisation (Pulmicort)',
        '__CAT__Antalgique',
        'MEOPA',
        '__CAT__Réanimation / Antidotes',
        'Adrénaline 1mg nébulisation — laryngite enfant (1amp + 4ml NaCl 0.9%)',
      ]},
      {voie:'AURICULAIRE', label:'Auriculaire', color:'#a855f7', items:[
        '__CAT__Anti-infectieux',
        'Ofloxacine solution auriculaire (Oflocet)',
      ]},
    ],
    pediatrie: [
      {voie:'PO', label:'Voie orale', color:'#16a34a', items:[
        '__CAT__Antalgique',
        'Ibuprofène 10mg/kg PO (Nurofen)', 'Paracétamol 15mg/kg PO (Doliprane)', 'Paracétamol 100mg sachet PO (Doliprane)',
        'Paracétamol 200mg sachet PO (Doliprane)', 'Paracétamol 300mg sachet PO (Doliprane)',
        '__CAT__Anti-infectieux',
        'Albendazole 4% PO (Zentel)', 'Amox+Ac Clav 100mg/60ml PO (Augmentin)', 'Amoxicilline 50mg/kg/j PO (Clamoxyl)',
        'Artéméther-Luméfantrine selon poids PO (Coartem)', 'Azithromycine 250mg PO (Zithromax)',
        'Cefixime 40mg/5ml PO (Oroken)', 'Ivermectine PO (Stromectol)',
        '__CAT__Digestif',
        'Métoclopramide sirop PO (Primpéran)', 'Racécadotril 100mg PO (Tiorfan)', 'Sels réhydratation PO (Adiaril)',
        '__CAT__Allergologie / Corticoïdes',
        'Cétirizine PO (Zyrtec)', 'Dexchlorphéniramine PO (Polaramine)', 'Prednisolone 5mg PO (Solupred)',
        '__CAT__Autres',
        'Lévonorgestrel 1.5mg PO (Norlevo)',
      ]},
      {voie:'IV', label:'Voie IV', color:'#2563eb', items:[
        '__CAT__Antalgique',
        'Morphine 0.1mg/kg IV [STP]', 'Paracétamol 15mg/kg IV (Perfalgan)',
        '__CAT__Anti-infectieux',
        'Amoxicilline 50mg/kg/j IV (Clamoxyl)', 'Amox+Ac Clav 100mg/kg/j IV (Augmentin)',
        'Ceftriaxone 50mg/kg IV (Rocéphine)', 'Ceftriaxone 100mg/kg IV (Rocéphine)',
        '__CAT__Cardio-vasculaire',
        'Furosémide 1mg/kg IV (Lasilix)',
        '__CAT__Neuro-sédation',
        'Clonazépam 0.02mg/kg IV (Rivotril)', 'Diazépam rectal IV (Valium)', 'Kétamine IV (Kétalar)', 'Midazolam IV (Hypnovel)',
        'Phénobarbital IV (Gardénal)',
        '__CAT__Allergologie / Corticoïdes',
        'Dexaméthasone 0.15mg/kg IV', 'Méthylprednisolone IV (Solumedrol)',
        '__CAT__Réanimation / Antidotes',
        'Acide tranexamique IV (Exacyl)', 'Adrénaline 0.01mg/kg IV', 'Vitamine K1 2mg IV (NN)',
        '__CAT__Métabolique / Solutés',
        'Calcium gluconate 10% IV', 'Glucose 10% IV', 'Glucose 30% IV', 'Magnésium sulfate IV', 'NaCl 0.9% IV',
        'Ringer Lactate IV', 'Vitamine B1 IV',
      ]},
      {voie:'HYDRATATION', label:'Hydratation IV', color:'#0891b2', special:'hydratation'},
      {voie:'IM', label:'Voie IM', color:'#6b7280', items:[
        '__CAT__Anti-infectieux',
        'Ceftriaxone 50mg/kg IM (Rocéphine)', 'Ceftriaxone 100mg/kg IM (Rocéphine)',
        '__CAT__Neuro-sédation',
        'Phénobarbital IM (Gardénal)',
        '__CAT__Réanimation / Antidotes',
        'Adrénaline 0.01mg/kg IM', 'Glucagon IM (Glucagen)', 'Vitamine K1 2mg IM (NN)',
      ]},
      {voie:'SC', label:'Voie SC', color:'#7c3aed', items:[
        '__CAT__Réanimation / Antidotes',
        'Adrénaline SC',
        '__CAT__Anesthésie locale',
        'Lidocaïne 1% SC',
        '__CAT__Autres',
        'Vaccin antitétanique SC', 'Vaccin Hépatite B SC (Engerix B10)', 'Vaccin ROR SC (Priorix)',
      ]},
      {voie:'RESPI', label:'Respiratoire', color:'#64748b', items:[
        '__AEROSOL__',
        '__CAT__Asthme',
        'Budésonide 0.5mg nébulisation (Pulmicort)', 'Budésonide 1mg nébulisation (Pulmicort)',
        '__CAT__Antalgique',
        'MEOPA',
      ]},
    ],
  };
  const ROUGE = ['Tramadol','Codéine','Morphine','MEOPA'];

  return (
    <div style={{padding:'8px 10px'}}>
      <div style={{marginBottom:8}}><AutreLibre categorie="therapeutique" onAjouter={onAjouter}/></div>
      <div style={{display:'flex',gap:5,marginBottom:8}}>
        {(estEnfant ? ['pediatrie'] : ['adulte','pediatrie']).map(t=>(
          <button key={t} onClick={()=>setTab(t)}
            style={{padding:'3px 10px',borderRadius:5,fontSize:11,fontWeight:600,cursor:'pointer',
              border:'1.5px solid '+(tab===t?'#ea580c':'#e5e7eb'),
              background:tab===t?'#ea580c':'#fff',color:tab===t?'#fff':'#6b7280'}}>
            {t==='adulte'?'Adulte':'Pédiatrie'}
          </button>
        ))}
        {estEnfant && <span style={{fontSize:10,color:'#9ca3af',alignSelf:'center',marginLeft:4}}>Patient &lt; 16 ans — doses adulte masquées</span>}
      </div>

      {/* 3 groupes seulement : Per os (+ Respiratoire, Auriculaire), IV (+ Hydratation, Morphine), IM (+ SC) */}
      {/* Style volontairement uniforme et plus marqué que les boutons de médicaments : ce sont des catégories, pas des choix finaux */}
      <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:10}}>
        {GROUPES_VOIE.map(g=>(
          <button key={g.id} onClick={()=>{setVoieOuverte(vo=>vo===g.id?null:g.id);setVoieListeComplete(false);}}
            style={{padding:'8px 18px',borderRadius:8,fontSize:11,fontWeight:600,cursor:'pointer',
              border:'2px solid '+(voieOuverte===g.id?'#374151':'#d1d5db'),
              background:voieOuverte===g.id?'#374151':'#fff',
              color:voieOuverte===g.id?'#fff':'#374151'}}>
            {g.label}
          </button>
        ))}
      </div>

      {voieOuverte && (()=>{
        const groupe = GROUPES_VOIE.find(g=>g.id===voieOuverte);
        if(!groupe) return null;
        const sousVoies = VOIES[tab].filter(v=>groupe.voies.includes(v.voie));
        if(!sousVoies.length) return null;

        const voiesSpeciales = sousVoies.filter(v=>v.special); // ex: HYDRATATION, MORPHINE
        const voiesAvecItems = sousVoies.filter(v=>v.items);
        const favoris = tab==='adulte' ? FREQUENTS_ADULTE.filter(f=>groupe.voies.includes(f.voie)) : FREQUENTS_PEDIATRIE.filter(f=>groupe.voies.includes(f.voie));

        // Ordre des catégories : personnalisé pour IV (widgets intercalés), défaut ailleurs
        const ordre = ORDRE_CATEGORIES_PAR_GROUPE[voieOuverte] || ORDRE_CATEGORIES_DEFAUT;

        // Regroupe les items du catalogue complet par catégorie (les tableaux items[]
        // contiennent déjà des marqueurs __CAT__NomCategorie insérés en amont)
        function extraireCategories(items) {
          const map = {};
          let catCourante = null;
          for (const it of items) {
            if (it === '__AEROSOL__') { (map['__AEROSOL__']=map['__AEROSOL__']||[]).push(it); continue; }
            if (it.startsWith('__CAT__')) { catCourante = it.replace('__CAT__',''); map[catCourante]=map[catCourante]||[]; continue; }
            if (catCourante) map[catCourante].push(it);
          }
          return map;
        }
        const completParCat = {};
        voiesAvecItems.forEach(v=>{
          const m = extraireCategories(v.items);
          for (const cat in m) (completParCat[cat] = completParCat[cat]||[]).push(...m[cat].map(it=>({item:it, voie:v})));
        });

        const favorisParCat = {};
        favoris.forEach(f=>{ (favorisParCat[f.cat] = favorisParCat[f.cat]||[]).push(f); });

        const modeReduit = favoris.length>0 && !voieListeComplete;

        function renderWidget(marqueur) {
          if(marqueur==='__HYDRATATION__') {
            const v = voiesSpeciales.find(x=>x.special==='hydratation');
            if(!v) return null;
            return <HydratationSelector key={marqueur} onAjouter={onAjouter} prescriptions={prescriptions}/>;
          }
          return null;
        }

        // Code couleur par catégorie thérapeutique (demande médicale) — remplace
        // l'ancien code couleur par voie d'administration. Les prescriptions
        // sécurisées (ROUGE : Tramadol, Codéine, Morphine, MEOPA) restent rouges
        // quelle que soit leur catégorie.
        const COULEUR_CATEGORIE = {
          'Antalgique': '#16a34a',
          'Anti-infectieux': '#7c3aed',
          'Digestif': '#ea580c',
          'Cardio-vasculaire': '#db2777',
          'Allergologie / Corticoïdes': '#6b7280',
        };
        const COULEUR_CATEGORIE_DEFAUT = '#2563eb';

        // Rendu d'un bouton médicament : en pédiatrie, aucune dose n'est proposée
        // d'emblée (mg/kg ou mg fixe, hors paracétamol sachet) — saisie manuelle
        // systématique (sécurité). En adulte, comportement inchangé (dose fixe affichée).
        function renderMedButton(item, v, rouge, cat) {
          const isPO = v.voie==='PO';
          const couleur = rouge ? '#dc2626' : (COULEUR_CATEGORIE[cat] || COULEUR_CATEGORIE_DEFAUT);
          if (tab==='pediatrie') {
            const matchMgKg = item.match(/^(.+?) (\d+(?:\.\d+)?)mg\/kg(\/j)?(\s.*)?$/);
            if (matchMgKg) {
              const [, nomMed, , parJour, suffixe] = matchMgKg;
              return (
                <DoseManuelleButton key={item} nomMed={nomMed} parJour={parJour} suffixe={suffixe}
                  couleur={couleur} rouge={rouge} isPO={isPO} onAjouter={onAjouter}/>
              );
            }
            if (item.startsWith('Budésonide')) {
              return (
                <DoseDosetteButton key={item} item={item} couleur={couleur} rouge={rouge} onAjouter={onAjouter}/>
              );
            }
            const matchMgFixe = item.match(/^(.+?) (\d+(?:\.\d+)?)mg(?!\/)(\s.*)?$/);
            if (matchMgFixe && matchMgFixe[1] !== 'Paracétamol') {
              const [, nomMed, , suffixe] = matchMgFixe;
              return (
                <DoseManuelleButton key={item} nomMed={nomMed} parJour={null} suffixe={suffixe}
                  couleur={couleur} rouge={rouge} isPO={isPO} onAjouter={onAjouter}/>
              );
            }
          }
          return (
            <button key={item} onClick={()=>onAjouter(isPO?item+' ×1':item,'therapeutique')}
              onMouseEnter={e=>{e.currentTarget.style.filter='brightness(0.85)';}}
              onMouseLeave={e=>{e.currentTarget.style.filter='none';}}
              style={{padding:'4px 8px',borderRadius:5,fontSize:11,fontWeight:600,cursor:'pointer',
                background:couleur+'12',
                color:couleur,
                border:'1.5px solid '+couleur+'44'}}>
              {item}
            </button>
          );
        }

        function renderCategorieFavoris(cat) {
          const items = favorisParCat[cat];
          if((!items || !items.length) && !(cat==='Antalgique' && tab==='adulte' && voieOuverte==='IV')) return null;
          const rendus = (items||[]).map(f=>{
            const deja=prescriptions.find(r=>!r.fait&&!r.nonRealise&&r.texte.startsWith(f.label));
            if(deja) return null;
            const rouge=ROUGE.some(s=>f.label.includes(s));
            return renderMedButton(f.label, {voie:f.voie}, rouge, cat);
          }).filter(Boolean);
          if(cat==='Antalgique' && tab==='adulte' && voieOuverte==='IV') {
            rendus.push(<TitrationMorphine key="__morphine_inline__" onAjouter={onAjouter} onAjouterPlusieurs={onAjouterPlusieurs} prescriptions={prescriptions} poidsInitial={patient?.poids}/>);
          }
          if(!rendus.length) return null;
          return (
            <div key={cat}>
              <div style={{fontSize:9,fontWeight:800,color:'#374151',textTransform:'uppercase',letterSpacing:0.5,marginBottom:3}}>{cat}</div>
              <div style={{display:'flex',flexWrap:'wrap',gap:4,alignItems:'center'}}>{rendus}</div>
            </div>
          );
        }

        function renderCategorieComplete(cat) {
          const entries = completParCat[cat];
          if((!entries || !entries.length) && !(cat==='Antalgique' && tab==='adulte' && voieOuverte==='IV')) return null;
          const rendus = (entries||[]).map(({item, voie:v})=>{
            const deja=prescriptions.find(r=>!r.fait&&!r.nonRealise&&r.texte.startsWith(item.split('__')[0]));
            if(deja) return null;
            const rouge=ROUGE.some(s=>item.includes(s));
            return renderMedButton(item, v, rouge, cat);
          }).filter(Boolean);
          if(cat==='Antalgique' && tab==='adulte' && voieOuverte==='IV') {
            rendus.push(<TitrationMorphine key="__morphine_inline__" onAjouter={onAjouter} onAjouterPlusieurs={onAjouterPlusieurs} prescriptions={prescriptions} poidsInitial={patient?.poids}/>);
          }
          if(!rendus.length) return null;
          return (
            <div key={cat}>
              <div style={{fontSize:9,fontWeight:800,color:'#374151',textTransform:'uppercase',letterSpacing:0.5,marginBottom:3}}>{cat}</div>
              <div style={{display:'flex',flexWrap:'wrap',gap:4}}>{rendus}</div>
            </div>
          );
        }

        // Nébuliseur : widget hors catégorisation (RESPI seulement), affiché en tête
        const aerosolPresent = completParCat['__AEROSOL__'];

        return (
          <div style={{maxHeight:'40vh',overflowY:'auto',display:'flex',flexDirection:'column',gap:10}}>
            {aerosolPresent && <AerosolSelector onAjouter={onAjouter} onAjouterPlusieurs={onAjouterPlusieurs} prescriptions={prescriptions} poidsInitial={patient?.poids}/>}

            {ordre.map(slot=>slot.startsWith('__')
              ? renderWidget(slot)
              : (modeReduit ? renderCategorieFavoris(slot) : renderCategorieComplete(slot))
            )}

            {favoris.length>0 && (
              modeReduit ? (
                <button onClick={()=>setVoieListeComplete(true)}
                  style={{width:'100%',textAlign:'center',padding:'6px 10px',borderRadius:6,fontSize:11,fontWeight:600,color:'#6b7280',background:'#f3f4f6',border:'1px solid #e5e7eb',cursor:'pointer'}}>
                  ▸ Liste entière
                </button>
              ) : (
                <button onClick={()=>setVoieListeComplete(false)}
                  style={{width:'100%',textAlign:'center',padding:'6px 10px',borderRadius:6,fontSize:11,fontWeight:600,color:'#6b7280',background:'#f3f4f6',border:'1px solid #e5e7eb',cursor:'pointer'}}>
                  ▾ Réduire à l'essentiel
                </button>
              )
            )}
          </div>
        );
      })()}
    </div>
  );
}

function DoseManuelleButton({nomMed, parJour, suffixe, couleur, rouge, isPO, onAjouter}) {
  const [open, setOpen] = useState(false);
  const [mg, setMg] = useState('');

  function confirmer() {
    if(!mg) return;
    const texte = nomMed+' '+mg+'mg'+(parJour?'/j':'')+(suffixe||'');
    onAjouter(isPO?texte+' ×1':texte,'therapeutique');
    setMg(''); setOpen(false);
  }

  if(!open) {
    return (
      <button onClick={()=>setOpen(true)}
        onMouseEnter={e=>{e.currentTarget.style.filter='brightness(0.85)';}}
        onMouseLeave={e=>{e.currentTarget.style.filter='none';}}
        style={{padding:'4px 8px',borderRadius:5,fontSize:11,fontWeight:600,cursor:'pointer',
          background:rouge?'#fef2f2':couleur+'12',
          color:couleur,
          border:'1.5px solid '+(rouge?'#fecaca':couleur+'44')}}>
        {nomMed}{suffixe||''}
      </button>
    );
  }

  return (
    <span style={{display:'inline-flex',alignItems:'center',gap:4,padding:'3px 6px',borderRadius:5,
      background:couleur+'12',border:'1.5px solid '+couleur}}>
      <span style={{fontSize:11,fontWeight:600,color:couleur}}>{nomMed}{suffixe||''}</span>
      <input autoFocus value={mg} onChange={e=>setMg(e.target.value)} type="number" placeholder="mg"
        onKeyDown={e=>{if(e.key==='Enter') confirmer(); if(e.key==='Escape'){setOpen(false);setMg('');}}}
        style={{width:52,padding:'2px 4px',borderRadius:4,border:'1.5px solid '+couleur,fontSize:11,outline:'none',textAlign:'center'}}/>
      <span style={{fontSize:10,color:'#6b7280'}}>mg{parJour?'/j':''}</span>
      <button onClick={confirmer} disabled={!mg}
        style={{padding:'2px 7px',borderRadius:4,background:mg?couleur:'#e5e7eb',color:'#fff',fontSize:10,fontWeight:700,border:'none',cursor:'pointer'}}>✓</button>
      <button onClick={()=>{setOpen(false);setMg('');}}
        style={{padding:'2px 5px',borderRadius:4,background:'#f3f4f6',color:'#6b7280',fontSize:10,border:'none',cursor:'pointer'}}>✕</button>
    </span>
  );
}

function DoseDosetteButton({item, couleur, rouge, onAjouter}) {
  const [open, setOpen] = useState(false);
  const [qte, setQte] = useState('');

  function confirmer() {
    if(!qte) return;
    const n = parseInt(qte,10);
    onAjouter(item+' ×'+qte+' dosette'+(n>1?'s':''), 'therapeutique');
    setQte(''); setOpen(false);
  }

  if(!open) {
    return (
      <button onClick={()=>setOpen(true)}
        onMouseEnter={e=>{e.currentTarget.style.filter='brightness(0.85)';}}
        onMouseLeave={e=>{e.currentTarget.style.filter='none';}}
        style={{padding:'4px 8px',borderRadius:5,fontSize:11,fontWeight:600,cursor:'pointer',
          background:rouge?'#fef2f2':couleur+'12',
          color:couleur,
          border:'1.5px solid '+(rouge?'#fecaca':couleur+'44')}}>
        {item}
      </button>
    );
  }

  return (
    <span style={{display:'inline-flex',alignItems:'center',gap:4,padding:'3px 6px',borderRadius:5,
      background:couleur+'12',border:'1.5px solid '+couleur}}>
      <span style={{fontSize:11,fontWeight:600,color:couleur}}>{item}</span>
      <input autoFocus value={qte} onChange={e=>setQte(e.target.value)} type="number" placeholder="nb"
        onKeyDown={e=>{if(e.key==='Enter') confirmer(); if(e.key==='Escape'){setOpen(false);setQte('');}}}
        style={{width:44,padding:'2px 4px',borderRadius:4,border:'1.5px solid '+couleur,fontSize:11,outline:'none',textAlign:'center'}}/>
      <span style={{fontSize:10,color:'#6b7280'}}>dosette(s)</span>
      <button onClick={confirmer} disabled={!qte}
        style={{padding:'2px 7px',borderRadius:4,background:qte?couleur:'#e5e7eb',color:'#fff',fontSize:10,fontWeight:700,border:'none',cursor:'pointer'}}>✓</button>
      <button onClick={()=>{setOpen(false);setQte('');}}
        style={{padding:'2px 5px',borderRadius:4,background:'#f3f4f6',color:'#6b7280',fontSize:10,border:'none',cursor:'pointer'}}>✕</button>
    </span>
  );
}

function AerosolSelector({onAjouter, onAjouterPlusieurs, prescriptions, poidsInitial}) {
  const [poids, setPoids] = useState(poidsInitial||'');
  const dejaAero = prescriptions.find(r=>!r.fait&&!r.nonRealise&&r.texte.startsWith('Salbutamol'));

  const poidsParsed = parseFloat(poids);
  const ventoline = !isNaN(poidsParsed) ? (poidsParsed < 16 ? '2.5mg' : '5mg') : null;
  const atrovent  = !isNaN(poidsParsed) ? (poidsParsed < 16 ? '0.25mg' : '0.5mg') : null;

  function prescrire() {
    if(!ventoline) return;
    onAjouterPlusieurs([
      {texte:`Salbutamol ${ventoline} nébulisation (Ventoline) — Séance 1/3`, categorie:'therapeutique'},
      {texte:`Salbutamol ${ventoline} nébulisation (Ventoline) — Séance 2/3`, categorie:'therapeutique'},
      {texte:`Salbutamol ${ventoline} nébulisation (Ventoline) — Séance 3/3`, categorie:'therapeutique'},
      {texte:`Ipratropium ${atrovent} nébulisation (Atrovent) — Séance 1/1`, categorie:'therapeutique'},
    ]);
    setPoids('');
  }

  if(dejaAero) return (
    <div style={{fontSize:11,color:'#9ca3af',padding:'4px 8px',fontStyle:'italic'}}>Aérosols déjà prescrits</div>
  );

  return (
    <div style={{background:'#f0f9ff',borderRadius:8,padding:'8px 12px',border:'1.5px solid #bae6fd',marginBottom:4,display:'flex',flexWrap:'wrap',alignItems:'center',gap:8}}>
      <span style={{fontSize:11,color:'#0891b2',fontWeight:700}}>💨 Ventoline ×3 + Atrovent ×1</span>
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
  );
}

function HydratationSelector({onAjouter, prescriptions}) {
  const [solute, setSolute] = useState('');
  const [qte, setQte] = useState('');
  const [duree, setDuree] = useState('');
  const SOLUTES = [
    {id:'NaCl 0.9%', label:'NaCl 0.9%', color:'#0891b2'},
    {id:'Ringer Lactate', label:'Ringer Lactate', color:'#0891b2'},
    {id:'PG5%', label:'PG5%', color:'#f59e0b'},
    {id:'PG10%', label:'PG10%', color:'#f59e0b'},
    {id:'PG30%', label:'PG30%', color:'#ea580c'},
  ];

  return (
    <div style={{display:'flex',flexWrap:'wrap',alignItems:'center',gap:4}}>
      {SOLUTES.map(s=>(
        <button key={s.id} onClick={()=>{setSolute(s.id===solute?'':s.id);setQte('');setDuree('');}}
          style={{padding:'4px 10px',borderRadius:6,fontSize:11,fontWeight:600,cursor:'pointer',
            border:'1.5px solid '+(solute===s.id?s.color:s.color+'44'),
            background:solute===s.id?s.color:s.color+'12',
            color:solute===s.id?'#fff':s.color}}>
          {s.label}
        </button>
      ))}
      {solute&&(
        <span style={{display:'inline-flex',alignItems:'center',gap:6}}>
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
        </span>
      )}
    </div>
  );
}

function TitrationMorphine({onAjouter, onAjouterPlusieurs, prescriptions, poidsInitial}) {
  const [open, setOpen] = useState(false);
  const [poids, setPoids] = useState(poidsInitial||'');
  const dejaMorphine = prescriptions.find(r=>!r.fait&&!r.nonRealise&&r.texte.startsWith('Titration morphine'));
  const dejaScope = prescriptions.find(r=>!r.fait&&!r.nonRealise&&r.texte==='Scopé');
  const dejaNarcan = prescriptions.find(r=>!r.fait&&!r.nonRealise&&r.texte.startsWith('Naloxone'));

  const poidsParsed = parseFloat(poids);
  const doseInit = !isNaN(poidsParsed) ? Math.floor(poidsParsed * 0.1) : null;
  const doseBolus = !isNaN(poidsParsed) ? Math.floor(poidsParsed * 0.02) : null;

  function prescrire() {
    if(doseInit===null) return;
    const protocole = `Titration morphine IV [STP] — Poids ${poidsParsed}kg\n` +
      `• Dose initiale : ${doseInit}mg IV lent\n` +
      `• Bolus : ${doseBolus}mg IV toutes les 5 min si EN ≥ 4\n` +
      `• Objectif EN < 4\n` +
      `• Surveillance SpO2, FR, sédation toutes les 5 min\n` +
      `• STOP si FR < 12/min ou SpO2 < 94%`;
    onAjouterPlusieurs([
      {texte:protocole, categorie:'therapeutique'},
      ...(!dejaScope?[{texte:'Scopé', categorie:'soin'}]:[]),
      ...(!dejaNarcan?[{texte:'Naloxone 0.4mg — PRÊT à proximité (antidote morphine)', categorie:'therapeutique'}]:[]),
    ]);
    setOpen(false);setPoids('');
  }

  if(dejaMorphine) return (
    <div style={{fontSize:11,color:'#9ca3af',padding:'4px 8px',fontStyle:'italic'}}>Titration morphine déjà prescrite</div>
  );

  if(!open) return (
    <button onClick={()=>setOpen(true)}
      style={{padding:'5px 12px',borderRadius:6,background:'#fef2f2',color:'#dc2626',fontSize:11,fontWeight:700,border:'1.5px solid #fecaca',cursor:'pointer'}}>
      ⚠ Titration morphine IV [STP]
    </button>
  );

  return (
    <div style={{background:'#fef2f2',borderRadius:8,padding:'10px 12px',border:'1.5px solid #fecaca'}}>
      <div style={{fontSize:11,color:'#dc2626',fontWeight:700,marginBottom:8}}>⚠ Titration morphine IV — Prescription sécurisée [STP]</div>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
        <label style={{fontSize:11,color:'#374151',fontWeight:500}}>Poids patient</label>
        <input value={poids} onChange={e=>setPoids(e.target.value)} placeholder="kg" type="number" autoFocus
          style={{width:60,padding:'4px 8px',borderRadius:6,border:'1.5px solid #fecaca',fontSize:12,outline:'none',textAlign:'center'}}/>
        <span style={{fontSize:11,color:'#6b7280'}}>kg</span>
      </div>
      {doseInit!==null&&(
        <div style={{fontSize:11,color:'#374151',background:'#fff',borderRadius:6,padding:'8px',marginBottom:8,lineHeight:1.6}}>
          • Dose initiale : <strong>{doseInit}mg</strong> IV lent<br/>
          • Bolus : <strong>{doseBolus}mg</strong> IV toutes les 5 min si EN ≥ 4<br/>
          • Objectif EN &lt; 4 — STOP si FR &lt; 12/min ou SpO2 &lt; 94%
        </div>
      )}
      <div style={{display:'flex',gap:6}}>
        <button onClick={prescrire} disabled={doseInit===null}
          style={{flex:1,padding:'6px',borderRadius:6,background:doseInit!==null?'#dc2626':'#e5e7eb',color:doseInit!==null?'#fff':'#9ca3af',fontSize:11,fontWeight:700,border:'none',cursor:'pointer'}}>
          Prescrire le protocole
        </button>
        <button onClick={()=>{setOpen(false);setPoids('');}}
          style={{padding:'6px 12px',borderRadius:6,background:'#f3f4f6',color:'#6b7280',fontSize:11,border:'none',cursor:'pointer'}}>✕</button>
      </div>
    </div>
  );
}

function CopyBtn({text, label, fullWidth, color}) {
  const bg = color||'#065f46';
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={()=>{navigator.clipboard.writeText(text||'');setCopied(true);setTimeout(()=>setCopied(false),3000);}}
      style={{padding:fullWidth?'12px':'2px 7px',borderRadius:fullWidth?8:4,fontSize:fullWidth?14:9,fontWeight:700,cursor:'pointer',border:'none',
        background:copied?'#059669':bg,color:'#fff',transition:'background 0.2s',
        width:fullWidth?'100%':'auto',flexShrink:fullWidth?0:1}}>
      {copied?(fullWidth?'✓ Copié ! — Faire Ctrl+V dans le champ CR de DxCare':'✓ Copié'):(label||'Copier')}
    </button>
  );
}

function DxCareCell({label, value, copyText, onChange, readOnly, color}) {
  const [local, setLocal] = useState(value||'');
  useEffect(()=>setLocal(value||''),[value]);
  const c = color||'#0d9488';
  return (
    <div style={{display:'flex',flexDirection:'column',overflow:'hidden',border:'1.5px solid '+c+'33',borderRadius:10}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',background:c+'18',padding:'7px 12px',borderRadius:'8px 8px 0 0',flexShrink:0}}>
        <label style={{fontSize:12,fontWeight:700,color:c}}>{label}</label>
        <CopyBtn text={copyText||local} label="Copier" color={c}/>
      </div>
      {readOnly
        ? <div style={{flex:1,borderTop:'none',borderRadius:'0 0 8px 8px',padding:'4px 6px',background:'#fff',fontSize:11,color:'#374151',whiteSpace:'pre-wrap',overflow:'hidden'}}>{local||''}</div>
        : <textarea value={local} onChange={e=>setLocal(e.target.value)} onBlur={()=>onChange(local)}
            style={{flex:1,borderTop:'none',borderRadius:'0 0 8px 8px',padding:'4px 6px',fontSize:11,outline:'none',resize:'none',fontFamily:'system-ui',background:'#fff',overflow:'hidden'}}/>
      }
    </div>
  );
}

function DxCareField({label, value, onChange, placeholder, rows, readOnly}) {
  const [local, setLocal] = useState(value||'');
  useEffect(()=>setLocal(value||''),[value]);
  return (
    <div style={{display:'flex',flexDirection:'column',gap:4}}>
      <label style={{fontSize:10,fontWeight:700,color:'#374151',textTransform:'uppercase',letterSpacing:0.4,background:'#e8e8e8',padding:'4px 8px',borderRadius:4}}>{label}</label>
      {readOnly
        ? <div style={{border:'1.5px solid #a7f3d0',borderRadius:4,padding:'6px 8px',background:'#fff',minHeight:36,fontSize:12,color:'#374151',whiteSpace:'pre-wrap'}}>{local||<span style={{color:'#9ca3af'}}>--</span>}</div>
        : <textarea value={local} rows={rows||2}
            onChange={e=>setLocal(e.target.value)}
            onBlur={()=>onChange(local)}
            placeholder={placeholder||''}
            style={{border:'1.5px solid #a7f3d0',borderRadius:4,padding:'6px 8px',fontSize:12,outline:'none',resize:'vertical',fontFamily:'system-ui',background:'#fff'}}/>
      }
    </div>
  );
}

function DxCareButtons({p, anamnese, examen, evolution, diagnostic, ordonnance, prescriptions, pamVal, getVal, compact}) {
  const [copiedKey, setCopiedKey] = useState(null);

  function copy(key, text) {
    navigator.clipboard.writeText(text||'');
    setCopiedKey(key);
    setTimeout(()=>setCopiedKey(null), 3000);
  }

  const fc = getVal('fc',p.fc)||'--';
  const sat = getVal('sat',p.sat)||'--';
  const temp = getVal('temp',p.temp)||'--';
  const tas = getVal('tas',p.tas)||'--';
  const tad = getVal('tad',p.tad)||'--';
  const dextro = getVal('dextro',p.dextro)||'--';
  const hb = getVal('hemocue',p.hemocue)||'--';

  const rxTxt = prescriptions.map(r=>'- ['+(r.fait?'FAIT':r.nonRealise?'NON REALISE':'EN ATTENTE')+'] '+r.texte+(r.motifNonRealise?' ('+r.motifNonRealise+')':'')).join('\n');

  const SECTIONS = [
    {key:'motif',     label:'Motif',        text:(p.symptome?.replace(/_/g,' ')||'')+(p.autre_motif?' — '+p.autre_motif:'')},
    {key:'constantes',label:'Paramètres',   text:'FC:'+fc+' | SpO2:'+sat+'% | T°:'+temp+'°C | PAS:'+tas+' PAD:'+tad+' PAM:'+(pamVal||'--')+' | Dextro:'+dextro+' | Hb:'+hb+' | Poids:'+(p.poids||'--')+'kg'},
    {key:'atcd',      label:'Antécédents',  text:p.atcd||'--'},
    {key:'examen',    label:'CR consultation',text:(anamnese?'MOTIF:\n'+anamnese+'\n\n':'')+(examen?'EXAMEN:\n'+examen+'\n\n':'')+(evolution?'EVOLUTION:\n'+evolution:'')},
    {key:'diag',      label:'Diagnostic',   text:diagnostic||'--'},
    {key:'ordonnance',label:'Prescription', text:ordonnance||'--'},
    {key:'tout',      label:'Tout copier',  text:'PATIENT IPP '+(p.ipp||'?')+' — '+p.age+' ans\n\nCONSTANTES:\nFC:'+fc+' | SpO2:'+sat+'% | T°:'+temp+'°C\n\nMOTIF:\n'+(anamnese||'--')+'\n\nEXAMEN:\n'+(examen||'--')+'\n\nEVOLUTION:\n'+(evolution||'--')+'\n\nDIAGNOSTIC:\n'+(diagnostic||'--')+'\n\nPRESCRIPTIONS:\n'+rxTxt+'\n\nORDONNANCE:\n'+(ordonnance||'--')},
  ];

  if(compact) return (
    <div style={{display:'flex',gap:4,flexWrap:'wrap',padding:'4px 0',flexShrink:0}}>
      <span style={{fontSize:10,fontWeight:700,color:'#6b7280',alignSelf:'center'}}>Copier pour DxCare :</span>
      {SECTIONS.map(s=>(
        <button key={s.key} onClick={()=>copy(s.key,s.text)}
          style={{padding:'3px 8px',borderRadius:4,fontSize:10,fontWeight:600,cursor:'pointer',border:'none',
            background:copiedKey===s.key?'#16a34a':'#111827',color:'#fff',transition:'background 0.2s'}}>
          {copiedKey===s.key?'✓':s.label}
        </button>
      ))}
    </div>
  );

  return (
    <div style={{marginTop:8}}>
      <div style={{fontSize:10,fontWeight:700,color:'#6b7280',textTransform:'uppercase',marginBottom:6}}>Copier pour DxCare</div>
      <div style={{display:'flex',flexDirection:'column',gap:4}}>
        {SECTIONS.map(s=>(
          <button key={s.key} onClick={()=>copy(s.key,s.text)}
            style={{padding:'8px 12px',borderRadius:7,fontSize:12,fontWeight:600,cursor:'pointer',textAlign:'left',display:'flex',alignItems:'center',gap:8,
              background:copiedKey===s.key?'#16a34a':'#111827',color:'#fff',border:'none',transition:'background 0.2s'}}>
            <span style={{flex:1}}>{s.label}</span>
            {copiedKey===s.key&&<span style={{fontSize:11,fontWeight:400,color:'#bbf7d0'}}>✓ Copié — Ctrl+V dans DxCare</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

function OrdonnancesRapides({p, ordonnance, setOrdonnance, dbSave}) {
  const pds = parseFloat(p.poids)||0;
  const ag = parseFloat(p.age)||99;
  const adulte = ag>=16;

  function ajouter(txt) {
    setOrdonnance(prev=>prev?prev+'\n\n'+txt:txt);
    dbSave({ordonnance:ordonnance?ordonnance+'\n\n'+txt:txt});
  }

  const Btn = ({onClick,bg,color,border,children}) => (
    <button onClick={onClick} style={{padding:'3px 8px',borderRadius:5,background:bg,color,fontSize:10,fontWeight:600,border:'1px solid '+border,cursor:'pointer'}}>
      {children}
    </button>
  );

  // Bouton à saisie manuelle : pas de dose proposée d'emblée (sécurité pédiatrie),
  // clic ouvre un champ mg, la valeur saisie est injectée dans le texte de l'ordonnance.
  const BtnPosoManuelle = ({emoji,label,bg,color,border,unit='mg',onConfirm}) => {
    const [open, setOpen] = useState(false);
    const [val, setVal] = useState('');
    function confirmer() { if(!val) return; onConfirm(val); setVal(''); setOpen(false); }
    if(!open) return (
      <button onClick={()=>setOpen(true)}
        style={{padding:'3px 8px',borderRadius:5,background:bg,color,fontSize:10,fontWeight:600,border:'1px solid '+border,cursor:'pointer'}}>
        {emoji} {label}
      </button>
    );
    return (
      <span style={{display:'inline-flex',alignItems:'center',gap:4,padding:'2px 6px',borderRadius:5,background:bg,border:'1.5px solid '+color}}>
        <span style={{fontSize:10,fontWeight:600,color}}>{emoji} {label}</span>
        <input autoFocus value={val} onChange={e=>setVal(e.target.value)} type="number" placeholder={unit}
          onKeyDown={e=>{if(e.key==='Enter') confirmer(); if(e.key==='Escape'){setOpen(false);setVal('');}}}
          style={{width:48,padding:'2px 4px',borderRadius:4,border:'1.5px solid '+color,fontSize:10,outline:'none',textAlign:'center'}}/>
        <span style={{fontSize:9,color:'#6b7280'}}>{unit}</span>
        <button onClick={confirmer} disabled={!val}
          style={{padding:'2px 6px',borderRadius:4,background:val?color:'#e5e7eb',color:'#fff',fontSize:9,fontWeight:700,border:'none',cursor:'pointer'}}>✓</button>
        <button onClick={()=>{setOpen(false);setVal('');}}
          style={{padding:'2px 4px',borderRadius:4,background:'#f3f4f6',color:'#6b7280',fontSize:9,border:'none',cursor:'pointer'}}>✕</button>
      </span>
    );
  };

  // 1. Paracétamol
  let doseP, posoP;
  if (pds>0&&pds<=33) {
    const mg=Math.round(pds*15/100)*100;
    doseP=mg+'mg';
    posoP='1 dose-poids ('+mg+'mg) toutes les 6h (max 4 prises/j)\n→ Sirop ou sachet selon disponibilité\n→ Ne pas dépasser 60mg/kg/j';
  } else if (pds>33&&pds<=50) {
    doseP='500mg'; posoP='1 comprimé 500mg toutes les 6h (max 4 prises/j)\n→ Espacer les prises d\'au moins 4h';
  } else {
    doseP='1g'; posoP='1 comprimé 1g toutes les 6h (max 4 prises/j)\n→ Espacer les prises d\'au moins 4h';
  }

  // 2. Ibuprofène
  let doseIbu, posoIbu;
  if (pds>0&&!adulte) {
    const mg=Math.round(pds*10);
    doseIbu=mg+'mg'; posoIbu=mg+'mg ('+(pds>0?'10mg/kg':'')+') ×3/jour au cours du repas\n→ Avec un grand verre d\'eau, ne pas prendre à jeun\n→ Durée max 5 jours';
  } else {
    doseIbu='400mg'; posoIbu='1 comprimé 400mg matin, midi et soir au cours du repas\n→ Avec un grand verre d\'eau, ne pas prendre à jeun\n→ Durée max 5 jours\n→ CONTRE-INDIQUÉ si grossesse, allergie AINS, insuffisance rénale, ulcère gastrique';
  }

  // 3. Amoxicilline
  let doseAmx, posoAmx;
  if (pds>0&&!adulte) {
    const mgj=Math.round(pds*80);
    doseAmx=mgj+'mg/j'; posoAmx=mgj+'mg/jour (80mg/kg/j) en 2-3 prises — 6 à 7 jours';
  } else {
    doseAmx='1g'; posoAmx='1g ×2-3/jour — 6 à 7 jours';
  }

  // 4. Augmentin
  let doseAug, posoAug;
  if (pds>0&&!adulte) {
    const mgj=Math.round(pds*80);
    doseAug=mgj+'mg/j'; posoAug=mgj+'mg/jour d\'amoxicilline (80mg/kg/j) en 3 prises — 7 jours';
  } else {
    doseAug='1g'; posoAug='1g ×2-3/jour — 7 jours';
  }

  // 5. Tiorfan
  let posoTio;
  if (pds>0&&!adulte) {
    const mg=Math.round(pds*1.5);
    posoTio=mg+'mg ('+'1,5mg/kg) ×3/jour avant les repas, jusqu\'à amélioration (max 7 jours)';
  } else {
    posoTio='1 gélule (100mg) ×3/jour avant les repas, jusqu\'à amélioration (max 7 jours)';
  }

  // 8. Vogalène
  let posoVog;
  if (pds>0&&!adulte) {
    const mgj=(pds*0.4).toFixed(1);
    posoVog=mgj+'mg/jour (0,4mg/kg/j) en 2-3 prises, en suppositoire ou sirop selon âge';
  } else {
    posoVog='1 comprimé ×3/jour avant les repas';
  }

  // 9. Aerius
  let posoAer;
  if (ag<6) posoAer='Non recommandé avant 6 ans — avis médical';
  else if (ag<12) posoAer='2,5mg/jour (sirop) en 1 prise';
  else posoAer='5mg/jour (1 comprimé) en 1 prise';

  return (
    <>
      {pds>0 && pds<=33 ? (
        <BtnPosoManuelle emoji="🩹" label="Paracétamol" bg="#f0fdf4" color="#16a34a" border="#bbf7d0"
          onConfirm={mg=>ajouter('ANTALGIQUE\n\nParacétamol '+mg+'mg PO\n→ toutes les 6h (max 4 prises/j)\n→ Sirop ou sachet selon disponibilité\n→ Ne pas dépasser 60mg/kg/j\n→ À avaler avec un grand verre d\'eau')}/>
      ) : (
        <Btn onClick={()=>ajouter('ANTALGIQUE\n\nParacétamol '+doseP+' PO\n→ '+posoP+'\n→ À avaler avec un grand verre d\'eau')}
          bg="#f0fdf4" color="#16a34a" border="#bbf7d0">🩹 Paracétamol {doseP}</Btn>
      )}

      {!adulte && pds>0 ? (
        <BtnPosoManuelle emoji="🔥" label="Ibuprofène" bg="#fff7ed" color="#ea580c" border="#fed7aa"
          onConfirm={mg=>ajouter('ANTI-INFLAMMATOIRE\n\nIbuprofène '+mg+'mg PO\n→ ×3/jour au cours du repas\n→ Avec un grand verre d\'eau, ne pas prendre à jeun\n→ Durée max 5 jours')}/>
      ) : (
        <Btn onClick={()=>ajouter('ANTI-INFLAMMATOIRE\n\nIbuprofène '+doseIbu+' PO\n→ '+posoIbu)}
          bg="#fff7ed" color="#ea580c" border="#fed7aa">🔥 Ibuprofène</Btn>
      )}

      {!adulte && pds>0 ? (
        <BtnPosoManuelle emoji="💊" label="Amoxicilline" bg="#eff6ff" color="#2563eb" border="#bfdbfe" unit="mg/j"
          onConfirm={mgj=>ajouter('ANTIBIOTIQUE\n\nAmoxicilline '+mgj+'mg/j PO\n→ en 2-3 prises — 6 à 7 jours')}/>
      ) : (
        <Btn onClick={()=>ajouter('ANTIBIOTIQUE\n\nAmoxicilline '+doseAmx+' PO\n→ '+posoAmx)}
          bg="#eff6ff" color="#2563eb" border="#bfdbfe">💊 Amoxicilline</Btn>
      )}

      {!adulte && pds>0 ? (
        <BtnPosoManuelle emoji="💊" label="Augmentin" bg="#eef2ff" color="#4f46e5" border="#c7d2fe" unit="mg/j"
          onConfirm={mgj=>ajouter('ANTIBIOTIQUE\n\nAmoxicilline/Acide clavulanique (Augmentin) '+mgj+'mg/j PO\n→ en 3 prises — 7 jours')}/>
      ) : (
        <Btn onClick={()=>ajouter('ANTIBIOTIQUE\n\nAmoxicilline/Acide clavulanique (Augmentin) '+doseAug+' PO\n→ '+posoAug)}
          bg="#eef2ff" color="#4f46e5" border="#c7d2fe">💊 Augmentin</Btn>
      )}

      {!adulte && pds>0 ? (
        <BtnPosoManuelle emoji="💧" label="Tiorfan" bg="#fefce8" color="#a16207" border="#fde68a"
          onConfirm={mg=>ajouter('ANTIDIARRHÉIQUE\n\nTiorfan '+mg+'mg PO\n→ ×3/jour avant les repas, jusqu\'à amélioration (max 7 jours)')}/>
      ) : (
        <Btn onClick={()=>ajouter('ANTIDIARRHÉIQUE\n\nTiorfan PO\n→ '+posoTio)}
          bg="#fefce8" color="#a16207" border="#fde68a">💧 Tiorfan</Btn>
      )}

      <Btn onClick={()=>ajouter('LAVAGE NASAL\n\nSérum salé physiologique\n→ Lavage nasal selon âge, unidoses ×4-6/jour si nourrisson\n→ DRP avant chaque tétée/repas si encombrement')}
        bg="#eff6ff" color="#0891b2" border="#a5f3fc">💦 Sérum salé (DRP)</Btn>

      <Btn onClick={()=>ajouter('SOINS LOCAUX\n\nBiseptine\n→ Application locale 1x/jour sur la plaie après lavage\n→ Pansement simple')}
        bg="#fdf2f8" color="#be185d" border="#fbcfe8">🩹 Biseptine</Btn>

      {!adulte && pds>0 ? (
        <BtnPosoManuelle emoji="🤢" label="Vogalène" bg="#f5f3ff" color="#7c3aed" border="#ddd6fe" unit="mg/j"
          onConfirm={mgj=>ajouter('ANTIÉMÉTIQUE\n\nMétopimazine (Vogalène) '+mgj+'mg/j PO\n→ en 2-3 prises, en suppositoire ou sirop selon âge')}/>
      ) : (
        <Btn onClick={()=>ajouter('ANTIÉMÉTIQUE\n\nMétopimazine (Vogalène) PO\n→ '+posoVog)}
          bg="#f5f3ff" color="#7c3aed" border="#ddd6fe">🤢 Vogalène</Btn>
      )}

      <Btn onClick={()=>ajouter('ANTIHISTAMINIQUE\n\nAerius (desloratadine)\n→ '+posoAer)}
        bg="#ecfeff" color="#0e7490" border="#a5f3fc">🤧 Aerius</Btn>

      {adulte&&pds>50&&(
        <Btn onClick={()=>ajouter('ANTALGIQUE PALIER 2\n\nAcupan 30mg PO\n→ 1 comprimé matin, midi et soir\n→ Réservé adulte > 50kg')}
          bg="#fef2f2" color="#dc2626" border="#fecaca">💉 Acupan 30mg</Btn>
      )}
    </>
  );
}

function SchemaPlaie({plaies, setPlaies, save, notesInit}) {
  const [selected, setSelected] = useState(null);
  const [notesPlaieLoc, setNotesPlaieLoc] = useState(notesInit||'');
  const ZONES = [
    {id:'tete',      label:'Tête',        x:140, y:12,  w:40, h:40, rx:20},
    {id:'cou',       label:'Cou',         x:152, y:52,  w:16, h:18, rx:4},
    {id:'tronc',     label:'Tronc',       x:110, y:70,  w:100,h:80, rx:6},
    {id:'dos',       label:'Dos',         x:110, y:70,  w:100,h:80, rx:6},
    {id:'bras',      label:'Bras G',      x:65,  y:72,  w:40, h:60, rx:6},
    {id:'bras',      label:'Bras D',      x:215, y:72,  w:40, h:60, rx:6},
    {id:'avant_bras',label:'Av-bras G',   x:55,  y:132, w:35, h:55, rx:6},
    {id:'avant_bras',label:'Av-bras D',   x:230, y:132, w:35, h:55, rx:6},
    {id:'main',      label:'Main G',      x:48,  y:187, w:30, h:35, rx:4},
    {id:'main',      label:'Main D',      x:242, y:187, w:30, h:35, rx:4},
    {id:'abdomen',   label:'Abdomen',     x:110, y:150, w:100,h:50, rx:6},
    {id:'cuisse',    label:'Cuisse G',    x:112, y:205, w:44, h:70, rx:6},
    {id:'cuisse',    label:'Cuisse D',    x:164, y:205, w:44, h:70, rx:6},
    {id:'genou',     label:'Genou G',     x:112, y:275, w:44, h:25, rx:6},
    {id:'genou',     label:'Genou D',     x:164, y:275, w:44, h:25, rx:6},
    {id:'jambe',     label:'Jambe G',     x:115, y:300, w:40, h:65, rx:6},
    {id:'jambe',     label:'Jambe D',     x:165, y:300, w:40, h:65, rx:6},
    {id:'cheville',  label:'Cheville G',  x:115, y:365, w:40, h:20, rx:4},
    {id:'cheville',  label:'Cheville D',  x:165, y:365, w:40, h:20, rx:4},
    {id:'pied',      label:'Pied G',      x:105, y:385, w:50, h:25, rx:4},
    {id:'pied',      label:'Pied D',      x:165, y:385, w:50, h:25, rx:4},
  ];

  function addPlaie(zone, label) {
    const nouvPlaie = {zone, label, points:''};
    setPlaies([...plaies, nouvPlaie]);
    setSelected(plaies.length);
  }

  function updatePoints(idx, pts) {
    const p2 = [...plaies];
    p2[idx] = {...p2[idx], points: pts};
    setPlaies(p2);
  }

  function removePlaie(idx) {
    setPlaies(plaies.filter((_,i)=>i!==idx));
    setSelected(null);
  }

  const JOURS = {tete:5,cou:7,tronc:10,abdomen:10,bras:10,avant_bras:10,main:10,cuisse:12,jambe:12,cheville:14,pied:14,genou:14,coude:14,dos:10};

  return (
    <div style={{background:'#fef9f0',borderRadius:8,border:'1px solid #fde68a',padding:'6px 10px',marginBottom:8}}>
      <div style={{fontSize:9,fontWeight:700,color:'#d97706',textTransform:'uppercase',marginBottom:6}}>🩹 Plaies — cliquer sur le schéma</div>
      <div style={{display:'flex',gap:10,alignItems:'flex-start'}}>
        {/* Schéma SVG compact */}
        <svg viewBox="0 0 320 420" width={110} height={145} style={{flexShrink:0,cursor:'pointer'}}>
          {/* Corps simplifié */}
          <ellipse cx="160" cy="32" rx="20" ry="20" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="1.5"/>
          <rect x="152" y="52" width="16" height="18" rx="4" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="1"/>
          <rect x="110" y="68" width="100" height="130" rx="6" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="1.5"/>
          <rect x="65" y="70" width="45" height="115" rx="8" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="1"/>
          <rect x="210" y="70" width="45" height="115" rx="8" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="1"/>
          <rect x="48" y="185" width="32" height="36" rx="5" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="1"/>
          <rect x="240" y="185" width="32" height="36" rx="5" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="1"/>
          <rect x="112" y="195" width="44" height="75" rx="6" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="1"/>
          <rect x="164" y="195" width="44" height="75" rx="6" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="1"/>
          <rect x="115" y="268" width="40" height="30" rx="5" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="1"/>
          <rect x="165" y="268" width="40" height="30" rx="5" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="1"/>
          <rect x="117" y="296" width="36" height="68" rx="5" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="1"/>
          <rect x="167" y="296" width="36" height="68" rx="5" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="1"/>
          <rect x="108" y="362" width="48" height="28" rx="5" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="1"/>
          <rect x="164" y="362" width="48" height="28" rx="5" fill="#e5e7eb" stroke="#9ca3af" strokeWidth="1"/>

          {/* Zones cliquables avec labels */}
          {[
            {id:'tete',      label:'Tête',    cx:160, cy:32,  shape:'ellipse', rx:20,ry:20},
            {id:'cou',       label:'Cou',     cx:160, cy:61,  shape:'rect', x:152,y:52,w:16,h:18},
            {id:'tronc',     label:'Tronc',   cx:160, cy:120, shape:'rect', x:110,y:68,w:100,h:90},
            {id:'abdomen',   label:'Abdomen', cx:160, cy:165, shape:'rect', x:110,y:155,w:100,h:43},
            {id:'bras',      label:'Bras D',  cx:88,  cy:127, shape:'rect', x:65,y:70,w:45,h:115},
            {id:'bras',      label:'Bras G',  cx:232, cy:127, shape:'rect', x:210,y:70,w:45,h:115},
            {id:'main',      label:'Main D',  cx:64,  cy:203, shape:'rect', x:48,y:185,w:32,h:36},
            {id:'main',      label:'Main G',  cx:256, cy:203, shape:'rect', x:240,y:185,w:32,h:36},
            {id:'cuisse',    label:'Cuisse D',cx:134, cy:233, shape:'rect', x:112,y:195,w:44,h:75},
            {id:'cuisse',    label:'Cuisse G',cx:186, cy:233, shape:'rect', x:164,y:195,w:44,h:75},
            {id:'genou',     label:'Genou D', cx:135, cy:283, shape:'rect', x:115,y:268,w:40,h:30},
            {id:'genou',     label:'Genou G', cx:185, cy:283, shape:'rect', x:165,y:268,w:40,h:30},
            {id:'jambe',     label:'Jambe D', cx:135, cy:330, shape:'rect', x:117,y:296,w:36,h:68},
            {id:'jambe',     label:'Jambe G', cx:185, cy:330, shape:'rect', x:167,y:296,w:36,h:68},
            {id:'pied',      label:'Pied D',  cx:132, cy:376, shape:'rect', x:108,y:362,w:48,h:28},
            {id:'pied',      label:'Pied G',  cx:188, cy:376, shape:'rect', x:164,y:362,w:48,h:28},
          ].map((z,i)=>(
            <g key={i} onClick={()=>addPlaie(z.id, z.label)} style={{cursor:'pointer'}}>
              {z.shape==='ellipse'
                ? <ellipse cx={z.cx} cy={z.cy} rx={z.rx} ry={z.ry} fill="transparent"/>
                : <rect x={z.x} y={z.y} width={z.w} height={z.h} rx="5" fill="transparent"/>
              }
            </g>
          ))}

          {/* Points rouges pour chaque plaie */}
          {plaies.map((pl,i)=>{
            const estDroit = pl.label&&pl.label.includes('D') && !pl.label.includes('G');
            const coords = {
              tete:{x:160,y:32}, cou:{x:160,y:61}, tronc:{x:160,y:120}, abdomen:{x:160,y:165},
              bras:{x:estDroit?88:232, y:127},
              main:{x:estDroit?64:256, y:203},
              cuisse:{x:estDroit?134:186, y:233},
              genou:{x:estDroit?135:185, y:283},
              jambe:{x:estDroit?135:185, y:330},
              pied:{x:estDroit?132:188, y:376},
            };
            const pos = coords[pl.zone]||{x:160,y:200};
            return <circle key={i} cx={pos.x} cy={pos.y} r={6} fill="#ef4444" opacity={0.85} stroke="#fff" strokeWidth="1.5"/>;
          })}
        </svg>

        {/* Colonne liste plaies */}
        <div style={{minWidth:130,display:'flex',flexDirection:'column',gap:4}}>
          {plaies.length===0&&<div style={{fontSize:10,color:'#9ca3af',fontStyle:'italic'}}>Cliquer sur le schéma</div>}
          {plaies.map((pl,i)=>(            <div key={i} style={{background:'#fff',borderRadius:7,border:'1px solid #fde68a',padding:'6px 8px',marginBottom:5}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4}}>
                <span style={{fontSize:11,fontWeight:700,color:'#d97706'}}>🩹 Plaie {i+1} — {pl.label}</span>
                <button onClick={()=>removePlaie(i)} style={{fontSize:10,color:'#ef4444',background:'none',border:'none',cursor:'pointer'}}>✕</button>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:6}}>
                <label style={{fontSize:10,color:'#6b7280'}}>Points :</label>
                <input type="number" value={pl.points} onChange={e=>updatePoints(i,e.target.value)} placeholder="nb"
                  style={{width:50,padding:'2px 5px',borderRadius:5,border:'1px solid #fde68a',fontSize:12,textAlign:'center',outline:'none'}}/>
                <span style={{fontSize:9,color:'#9ca3af'}}>→ retrait dans {JOURS[pl.zone]||10}j</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SutureSection({p, save}) {
  const SUTURES=[{id:'sut_sup5',l:'Suture ≥5 pts',c:'#dc2626'},{id:'sut_inf5',l:'Suture <5 pts',c:'#f59e0b'},{id:'sut_colle',l:'Suture colle',c:'#0891b2'},{id:'sut_agraf',l:'Suture agrafes',c:'#7c3aed'},{id:'sut_steri',l:'Steri-strip',c:'#16a34a'},{id:'abces',l:'Ablation abcès',c:'#ea580c'}];
  const [sel,setSel]=useState(()=>{try{return JSON.parse(p.sutures||'[]');}catch{return [];}});
  async function toggle(id){const n=sel.includes(id)?sel.filter(x=>x!==id):[...sel,id];setSel(n);await save({sutures:JSON.stringify(n)});}
  return(
    <div style={{background:'#fff8f8',border:'1.5px solid #fecaca',borderRadius:8,padding:'8px 12px'}}>
      <div style={{fontSize:10,fontWeight:700,color:'#dc2626',textTransform:'uppercase',marginBottom:6}}>✂️ Suture / Fermeture / Actes</div>
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
  const EMPL=[{id:'brancard1',l:'B1 — Brancard 1',c:'#ef4444'},{id:'brancard2',l:'B2 — Brancard 2',c:'#ef4444'},{id:'fauteuil1',l:'F1 — Fauteuil 1',c:'#16a34a'},{id:'fauteuil2',l:'F2 — Fauteuil 2',c:'#16a34a'},{id:'obs1',l:'O1 — Observation 1',c:'#3b82f6'},{id:'obs2',l:'O2 — Observation 2',c:'#3b82f6'},{id:'lit1',l:'L1 — Lit 1',c:'#3b82f6'},{id:'lit2',l:'L2 — Lit 2',c:'#3b82f6'},{id:'pansement',l:'P1 — Pansement',c:'#f59e0b'},{id:'dehors',l:'Dehors',c:'#9ca3af'}];
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
              await fetch('/api/patients',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'update',id:p.id,patch:em.id==='dehors'?{emplacement:null,statut:'dehors'}:{emplacement:em.id,statut:'attente_medecin'}})});
              setOpen(false);onUpdate?.();
            }}
              style={{padding:'6px 10px',borderRadius:6,cursor:occ||cur2?'default':'pointer',fontSize:11,fontWeight:600,color:occ?'#d1d5db':cur2?'#16a34a':em.c,background:cur2?'#f0fdf4':'#fff',textDecoration:occ?'line-through':'none',display:'flex',alignItems:'center',gap:6}}
              onMouseEnter={e=>{if(!occ&&!cur2)e.currentTarget.style.background=em.c+'15';}}
              onMouseLeave={e=>{e.currentTarget.style.background=cur2?'#f0fdf4':'#fff';}}>
              {cur2&&<span style={{fontSize:9}}>✓</span>}{em.l}{occ&&<span style={{fontSize:9,color:'#d1d5db',marginLeft:'auto'}}>IPP {occ.ipp||'—'}</span>}
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
