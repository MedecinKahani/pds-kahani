'use client';
import { useState, useEffect, useRef } from 'react';

const EMPLACEMENTS_FICHE = [
  {id:'brancard1',l:'B1 — Brancard 1',c:'#ef4444'},
  {id:'brancard2',l:'B2 — Brancard 2',c:'#ef4444'},
  {id:'fauteuil1',l:'F1 — Fauteuil 1',c:'#16a34a'},
  {id:'fauteuil2',l:'F2 — Fauteuil 2',c:'#16a34a'},
  {id:'obs1',l:'O1 — Observation 1',c:'#3b82f6'},
  {id:'obs2',l:'O2 — Observation 2',c:'#3b82f6'},
  {id:'lit1',l:'L1 — Lit 1',c:'#3b82f6'},
  {id:'lit2',l:'L2 — Lit 2',c:'#3b82f6'},
  {id:'pansement',l:'P1 — Pansement',c:'#f59e0b'},
];


function safeJSON(val, fallback = []) {
  if (!val) return fallback;
  if (Array.isArray(val)) return val;
  if (typeof val === 'object') return val;
  try { return JSON.parse(val); } catch { return fallback; }
}

const EXAMENS = [
  { id:'bhcg',    label:'bHCG urinaire',        color:'#7c3aed' },
  { id:'bu',      label:'BU',                   color:'#7c3aed' },
  { id:'ecbu',    label:'ECBU',                 color:'#7c3aed' },
  { id:'dextro',  label:'Dextro',               color:'#f59e0b' },
  { id:'cetonem', label:'Cétonémie',            color:'#f59e0b' },
  { id:'ecg',     label:'ECG',                  color:'#dc2626' },
  { id:'hemocue', label:'Hémocue',              color:'#dc2626' },
  { id:'crp',     label:'CRP test',             color:'#ea580c' },
  { id:'tdr_den', label:'TDR Dengue',           color:'#ea580c' },
  { id:'tdr_pal', label:'TDR Paludisme',        color:'#16a34a' },
  { id:'tdr_tet', label:'Tétanotop',            color:'#16a34a' },
  { id:'hemocult',label:'Hémoculture',          color:'#0284c7' },
  { id:'coprocult',label:'Coproculture',        color:'#6b7280' },
  { id:'bio_del', label:'Bio délocalisée',      color:'#0891b2', sub:['NFS + CRP','Gaz du sang','Tropo / D-Dimère / BNP','Iono / Créatinine / BHC'] },
  { id:'bio_mam', label:'Prélèvement Mamoudzou',color:'#0284c7', sub:['NFS','CRP','Iono','Créatinine','BHC','Lipase','Sérologie','Bactério','PSA','Bilan anémie','Hémoculture','ECBU'] },
];

// Molécules sécurisées (rouge)
const SECURISEES = ['Tramadol','Morphine','MEOPA','Kétoprofène'];
function isSecurisee(label) { return SECURISEES.some(s => label.includes(s)); }

// Thérapeutique par voie et classe, avec couleur
const THERAPEUTIQUE_VOIES = {
  adulte: [
    { voie:'PO', label:'Voie orale', groupes:[
      { group:'Antalgiques', color:'#16a34a', items:['Paracétamol 500mg PO','Paracétamol 1g PO','Ibuprofène 200mg PO','Ibuprofène 400mg PO','Tramadol 50mg PO','Tramadol 100mg PO','Acupan 20mg PO'] },
      { group:'Cardiovasculaire', color:'#dc2626', items:['Kardegic 75mg PO','Lasilix 20mg PO','Lasilix 40mg PO','Loxen 10mg PO','Amlodipine 5mg PO'] },
      { group:'Antibiotiques', color:'#2563eb', items:['Amoxicilline 1g PO','Augmentin 1g PO','Azithromycine 500mg PO','Métronidazole 500mg PO'] },
      { group:'Antiparasitaires', color:'#15803d', items:['Artéméther-Luméfantrine (Coartem)','Albendazole 400mg'] },
      { group:'Autres', color:'#6b7280', items:['Métoclopramide 10mg PO','Ondansétron 4mg PO','Oméprazole 20mg PO','Polaramine 2mg PO','Spasfon 80mg PO'] },
    ]},
    { voie:'IV', label:'Voie IV', groupes:[
      { group:'Antalgiques', color:'#16a34a', items:['Perfalgan 1g IV','Kétoprofène 100mg IV','Acupan 20mg IV','Titration morphine 0.1mg/kg puis +3mg/5min IV'] },
      { group:'Urgence', color:'#dc2626', items:['Adrénaline 0.5mg IV','Adrénaline 1mg IV','Solumédrol 40mg IV','Méthylprednisolone __mg/kg IV','Risordan 1mg IV'] },
      { group:'Cardiovasculaire', color:'#b91c1c', items:['Lasilix 20mg IV','Lasilix 40mg IV','Loxen IV'] },
      { group:'Antibiotiques', color:'#2563eb', items:['Ceftriaxone 2g IV','Métronidazole 500mg IV','Artésunate IV'] },
      { group:'Autres', color:'#6b7280', items:['Métoclopramide 10mg IV','Ondansétron 4mg IV'] },
    ]},
    { voie:'IM', label:'Voie IM', groupes:[
      { group:'Antalgiques', color:'#16a34a', items:['Kétoprofène 100mg IM','Acupan 20mg IM'] },
      { group:'Antibiotiques', color:'#2563eb', items:['Ceftriaxone 1g IM','Ceftriaxone 2g IM'] },
      { group:'Urgence', color:'#dc2626', items:['Adrénaline 0.5mg IM','Adrénaline 1mg IM','Solumédrol 40mg IM'] },
    ]},
    { voie:'SC', label:'Voie SC', groupes:[
      { group:'Anesthésie locale', color:'#7c3aed', items:['Lidocaïne 1% SC','Lidocaïne 2% SC','Lidocaïne adrénalinée SC'] },
      { group:'Vaccin', color:'#0891b2', items:['Vaccin antitétanique SC','Vaccin antirabique SC'] },
      { group:'Insuline', color:'#6b7280', items:['Insuline rapide SC __UI','Insuline lente SC __UI'] },
    ]},
    { voie:'RESPI', label:'Voie respiratoire', groupes:[
      { group:'Oxygène', color:'#0891b2', items:['O2 lunettes (Sat>94%)','O2 masque (Sat>94%)','O2 masque haute concentration'] },
      { group:'Aérosols', color:'#0369a1', items:['Aérosol Ventoline 2.5mg','Aérosol Ventoline 5mg','Aérosol Atrovent 0.25mg','Aérosol Atrovent 0.5mg'] },
      { group:'Urgence', color:'#dc2626', items:['MEOPA'] },
    ]},
  ],
  pediatrie: [
    { voie:'PO', label:'Voie orale', groupes:[
      { group:'Antalgiques', color:'#16a34a', items:['Paracétamol 15mg/kg/dose PO','Ibuprofène 10mg/kg/dose PO','Tramadol 1-2mg/kg PO'] },
      { group:'Antibiotiques', color:'#2563eb', items:['Amoxicilline 50mg/kg/j PO','Augmentin 80mg/kg/j PO','Azithromycine 10mg/kg J1 puis 5mg/kg'] },
      { group:'Antiparasitaires', color:'#15803d', items:['Artéméther-Luméfantrine selon poids','Albendazole 200mg si <10kg / 400mg si >10kg'] },
      { group:'Autres', color:'#6b7280', items:['Métoclopramide 0.1mg/kg PO','Ondansétron 0.15mg/kg PO','Paracétamol 15mg/kg suppositoire'] },
    ]},
    { voie:'IV', label:'Voie IV', groupes:[
      { group:'Antalgiques', color:'#16a34a', items:['Perfalgan 15mg/kg IV','Morphine 0.1mg/kg IV titration'] },
      { group:'Antibiotiques', color:'#2563eb', items:['Ceftriaxone 50-100mg/kg IV'] },
      { group:'Urgence', color:'#dc2626', items:['Adrénaline 0.01mg/kg IV','Dexaméthasone 0.15mg/kg IV','Solumédrol 1mg/kg IV'] },
    ]},
    { voie:'IM', label:'Voie IM', groupes:[
      { group:'Antibiotiques', color:'#2563eb', items:['Ceftriaxone 50mg/kg IM','Ceftriaxone 100mg/kg IM'] },
      { group:'Urgence', color:'#dc2626', items:['Adrénaline 0.01mg/kg IM'] },
    ]},
    { voie:'SC', label:'Voie SC', groupes:[
      { group:'Anesthésie locale', color:'#7c3aed', items:['Lidocaïne 1% SC','Lidocaïne adrénalinée SC'] },
      { group:'Vaccin', color:'#0891b2', items:['Vaccin antitétanique SC'] },
    ]},
    { voie:'RESPI', label:'Voie respiratoire', groupes:[
      { group:'Oxygène', color:'#0891b2', items:['O2 lunettes (Sat>94%)','O2 masque (Sat>94%)'] },
      { group:'Aérosols', color:'#0369a1', items:['Aérosol Ventoline 2.5mg','Aérosol Atrovent 0.25mg'] },
      { group:'Urgence', color:'#dc2626', items:['MEOPA'] },
    ]},
  ],
};

// Gardé pour compatibilité
const THERAPEUTIQUE_ADULTE = THERAPEUTIQUE_VOIES.adulte.flatMap(v=>v.groupes);
const THERAPEUTIQUE_PEDIATRIE = THERAPEUTIQUE_VOIES.pediatrie.flatMap(v=>v.groupes);

const SOINS = [
  { id:'allonger',   label:'Allonger',                   color:'#0891b2' },
  { id:'demi_assis', label:'Demi-assis',                 color:'#0891b2' },
  { id:'assis',      label:'Assis strict',               color:'#0891b2' },
  { id:'scoper',     label:'Scoper',                     color:'#dc2626' },
  { id:'vvp1',       label:'VVP n°1',                   color:'#7c3aed' },
  { id:'vvp2',       label:'VVP n°2',                   color:'#7c3aed' },
  { id:'plaie',      label:'Lavage + pansement plaie',   color:'#f59e0b' },
  { id:'drp',        label:'DRP',                       color:'#3b82f6' },
  { id:'spu',        label:'Sonde urinaire',             color:'#6b7280' },
  { id:'sng',        label:'Sonde nasogastrique',        color:'#6b7280' },
  { id:'glyc_ctrl',  label:'Glycémie capillaire contrôle', color:'#f59e0b' },
  { id:'rechauffe',  label:'Réchauffement',              color:'#ea580c' },
  { id:'oxymetre',   label:'Oxymétrie de pouls',         color:'#dc2626' },
  { id:'spu',        label:'Sonde urinaire',             color:'#6b7280' },
  { id:'pose_impl',  label:'Pose implant',               color:'#7c3aed' },
  { id:'retrait_impl',label:'Retrait implant',           color:'#7c3aed' },
  { id:'educ_asthme',label:'Éducation asthme — vidéo TV obs', color:'#0891b2' },
  { id:'reprise_const',label:'Reprise constantes post-thérapeutique', color:'#6b7280' },
];

function HBtn({ onClick, style, children, title, disabled }) {
  const ref = useRef(null);
  return (
    <button ref={ref} onClick={onClick} title={title} disabled={disabled}
      onMouseEnter={e => { if(ref.current) ref.current.style.filter='brightness(0.75)'; ref.current.style.transform='scale(1.04)'; }}
      onMouseLeave={e => { if(ref.current) ref.current.style.filter='none'; ref.current.style.transform='scale(1)'; }}
      style={{ ...style, transition:'filter 0.1s, transform 0.1s', cursor:'pointer' }}>
      {children}
    </button>
  );
}

function useDebounce(fn, delay) {
  const t = useRef(null);
  return (...args) => {
    clearTimeout(t.current);
    t.current = setTimeout(() => fn(...args), delay);
  };
}

const inp = { width:'100%', padding:'10px 12px', borderRadius:8, border:'1.5px solid #e5e7eb', fontSize:13, outline:'none', boxSizing:'border-box', fontFamily:'system-ui', background:'#fff', resize:'vertical' };
const EXAMEN_NORMAL = `Neurologique : Glasgow 15, pas de déficit sensitivo-moteur, pas de signe méningé.
Cardio-vasculaire : bruits du coeur réguliers, pouls périphériques perçus, pas d'oedème des membres inférieurs.
Pulmonaire : eupnéique, murmures vésiculaires présents et symétriques, pas de signe de lutte.
Abdominal : abdomen souple dépressible indolore, pas de défense, pas de masse palpable.`;

const EXAMEN_NORMAL_PEDIATRIE = `Neurologique : conscient calme dans les bras des parents, 4 membres toniques, pas de déficit sensitivo-moteur.
Fontanelle antérieure souple et dépressible.
Cardio-vasculaire : bruits du coeur réguliers, TRC < 3 secondes, pas de pli cutané.
Pulmonaire : eupnéique, murmures vésiculaires présents et symétriques, pas de signe de lutte.
Abdominal : abdomen souple dépressible indolore.
ORL : gorge et tympans propres.`;

export default function FichePatient({ patient, p: pProp, onClose, onUpdate, user, patients=[] }) {
  const p = patient || pProp;
  if (!p) return null;

  const [onglet, setOnglet] = useState(user?.role==='ide' ? 'prescription' : 'anamnese');
  const [anamnese, setAnamnese] = useState(p.anamnese || '');
  const [exam, setExam] = useState(p.examen_clinique || '');
  const [evolution, setEvolution] = useState(p.evolution || '');
  const [diagnostic, setDiagnostic] = useState(p.diagnostic || '');
  const [ordonnance, setOrdonnance] = useState(p.ordonnance || '');
  const [copied, setCopied] = useState(false);
  const [subOpen, setSubOpen] = useState({});
  const [subSel, setSubSel] = useState({});
  const [collapsed, setCollapsed] = useState({examens:true, therapeutique:true, soins:true});
  const [therapieTab, setTherapieTab] = useState('adulte');
  const [nouvConst, setNouvConst] = useState({ type:'', val:'' });
  const [constPost, setConstPost] = useState(safeJSON(p.constantes_post, []));
  const [prescriptions, setPrescriptions] = useState(safeJSON(p.prescriptions, []));

  const pam = p.tas && p.tad ? Math.round(parseFloat(p.tad) + (parseFloat(p.tas) - parseFloat(p.tad)) / 3) : null;

  async function save(patch) {
    const res = await fetch('/api/patients', { method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ action:'update', id:p.id, patch }) });
    const data = await res.json();
    if (data.patients) {
      const updated = data.patients.find(x => x.id === p.id);
      if (updated) onUpdate?.(updated);
    }
  }

  const debouncedSave = useDebounce(save, 800);

  async function ajouterPrescription(texte, categorie) {
    const rx = [...prescriptions, { texte, categorie, fait:false, ts:Date.now(), par:user?.matricule||'' }];
    setPrescriptions(rx);
    await save({ prescriptions: JSON.stringify(rx) });
  }

  async function cocherFait(idx) {
    const rx = [...prescriptions];
    rx[idx] = { ...rx[idx], fait:true, faitPar:user?.matricule, faitA:Date.now() };
    setPrescriptions(rx);
    await save({ prescriptions: JSON.stringify(rx) });
  }

  const enAttente = prescriptions.filter(r => !r.fait);
  const realises  = prescriptions.filter(r => r.fait);

  const colConst = (v, k) => {
    const N = { fc:[50,100], tas:[90,150], tad:[60,95], sat:[94,100], temp:[36,38.4], dextro:[0.7,2.5], hemocue:[8,18] };
    const n = parseFloat(v); if(isNaN(n)) return '#9ca3af';
    const [mn,mx] = N[k]||[0,9999];
    return n<mn||n>mx ? '#ef4444' : '#16a34a';
  };

  function resume() {
    const rx = prescriptions.map(r=>`- [${r.fait?'FAIT':'EN ATTENTE'}] ${r.texte}`).join('\n');
    return `=== RESUME PDS KAHANI ===
Patient : ${p.nom} ${p.prenom} — ${p.age} ans — ${p.sexe==='M'?'Homme':'Femme'}
DDN : ${p.ddn||'--'} | IPP : ${p.ipp||'--'}
Arrivée : ${p.arrivee?new Date(parseInt(p.arrivee)).toLocaleString('fr-FR'):'--'}

MOTIF : ${p.symptome?.replace(/_/g,' ')||'--'}${p.symptome_autre?' — '+p.symptome_autre:''}

CONSTANTES :
FC ${p.fc||'--'} | PAS ${p.tas||'--'} / PAD ${p.tad||'--'} | PAM ${pam||'--'} mmHg
Sat ${p.sat||'--'}% | T° ${p.temp||'--'}°C | Dextro ${p.dextro||'--'} | Hb ${p.hemocue||'--'}
${p.tdr_palu?'TDR Palu : '+p.tdr_palu:''}${p.tdr_dengue?' | TDR Dengue : '+p.tdr_dengue:''}
${p.bu_resultat?'BU : '+p.bu_resultat:''}${p.bhcg_resultat?' | bHCG : '+p.bhcg_resultat:''}

ANAMNESE :
${anamnese||'--'}

EXAMEN CLINIQUE :
${exam||'--'}

PRESCRIPTIONS :
${rx||'Aucune'}

EVOLUTION :
${evolution||'--'}

DIAGNOSTIC :
${diagnostic||'--'}

ORDONNANCE DE SORTIE :
${ordonnance||'--'}
`;
  }

  return (
    <div style={{ display:'flex', height:'100%', fontFamily:'system-ui', fontSize:13 }}>

      {/* COLONNE PRINCIPALE */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minWidth:0 }}>

        {/* BANDEAU */}
        <div style={{ background:'#fff', borderBottom:'1px solid #e5e7eb', padding:'10px 14px', flexShrink:0 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
            <div>
              <span style={{ fontWeight:700, fontSize:15, color:'#111827' }}>{p.prenom} {p.nom}</span>
              <span style={{ marginLeft:8, fontSize:12, color:'#6b7280' }}>{p.age} ans · {p.sexe==='M'?'♂':'♀'}</span>
              {p.ddn&&<span style={{ marginLeft:8, fontSize:11, color:'#9ca3af' }}>{p.ddn}</span>}
              {p.ipp&&<span style={{ marginLeft:8, fontSize:11, color:'#9ca3af' }}>IPP {p.ipp}</span>}
              <span style={{ marginLeft:8, fontSize:12, fontWeight:600, color:'#0d9488' }}>{p.symptome?.replace(/_/g,' ')}</span>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              {/* Bouton déplacer */}
              <div style={{position:'relative'}}>
                <DeplacerBtn p={p} onUpdate={onUpdate} patients={patients}/>
              </div>
              <button onClick={onClose} style={{ background:'#f3f4f6', border:'none', width:28, height:28, borderRadius:'50%', cursor:'pointer', fontSize:16, color:'#6b7280', display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
            </div>
          </div>

          {/* Constantes style cartes vignette avec historique */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6,marginTop:8}}>
            {[
              {k:'fc',     v:p.fc,     l:'FC',  u:'bpm',  icon:'🫀'},
              {k:'tas',    v:p.tas&&p.tad?p.tas+'/'+p.tad:p.tas, l:'TA', u:'mmHg', icon:'🩸'},
              {k:'sat',    v:p.sat,    l:'Sat', u:'%',    icon:'💧'},
              {k:'temp',   v:p.temp,   l:'T°',  u:'°C',   icon:'🌡️'},
              {k:'pam',    v:pam,      l:'PAM', u:'mmHg', icon:'💉', fixed:pam?(pam<65?'#ef4444':'#16a34a'):null},
              {k:'dextro', v:p.dextro||'--', l:'Dex', u:'g/L',  icon:'🍬'},
              {k:'hemocue',v:p.hemocue||'--',l:'Hb',  u:'g/dL', icon:'🔴'},
            ].map(({k,v,l,u,icon,fixed})=>{
              const c = fixed || (v&&v!=='--' ? colConst(v,k) : '#9ca3af');
              // Chercher si une nouvelle constante de ce type existe dans constPost
              const nouvelles = constPost.filter(cp => cp.key===k || cp.label.toLowerCase().includes(l.toLowerCase()));
              const derniere = nouvelles[nouvelles.length-1];
              const cNew = derniere ? colConst(derniere.val, k) : null;
              return (
                <div key={k} style={{background:'rgba(255,255,255,0.8)',borderRadius:8,padding:'6px 10px',border:'0.5px solid rgba(0,0,0,0.07)'}}>
                  <div style={{fontSize:9,color:'#9ca3af',display:'flex',alignItems:'center',gap:3,marginBottom:2}}>
                    <span style={{fontSize:11}}>{icon}</span>{l}
                  </div>
                  <div style={{display:'flex',alignItems:'baseline',gap:6,flexWrap:'wrap'}}>
                    <div style={{fontSize:16,fontWeight:700,color:derniere?'#d1d5db':c,whiteSpace:'nowrap',textDecoration:derniere?'line-through':'none'}}>
                      {v||'--'} <span style={{fontSize:9,fontWeight:400,color:'#d1d5db'}}>{u}</span>
                    </div>
                    {derniere&&<div style={{fontSize:16,fontWeight:700,color:cNew||'#374151',whiteSpace:'nowrap'}}>
                      {derniere.val} <span style={{fontSize:9,fontWeight:400,color:'#9ca3af'}}>{u}</span>
                    </div>}
                  </div>
                </div>
              );
            })}
            {/* Ajouter constante */}
            <div onMouseEnter={e=>e.currentTarget.style.borderColor='#0d9488'} onMouseLeave={e=>e.currentTarget.style.borderColor='#e5e7eb'} style={{borderRadius:8,padding:'6px 10px',border:'1.5px dashed #e5e7eb',display:'flex',flexDirection:'column',justifyContent:'center',gap:4,transition:'border-color 0.15s'}}>
              <select value={nouvConst.type} onChange={e=>setNouvConst(n=>({...n,type:e.target.value}))}
                style={{fontSize:10,border:'none',background:'transparent',color:'#9ca3af',outline:'none',cursor:'pointer'}}>
                <option value="">+ Constante</option>
                <option value="fc">FC bpm</option>
                <option value="ta">TA mmHg</option>
                <option value="sat">Sat %</option>
                <option value="temp">T° °C</option>
                <option value="dextro">Dextro g/L</option>
                <option value="hemocue">Hémocue g/dL</option>
                <option value="tdr_palu">TDR Palu</option>
                <option value="tdr_dengue">TDR Dengue</option>
              </select>
              {nouvConst.type&&<div style={{display:'flex',gap:3}}>
                <input value={nouvConst.val} onChange={e=>setNouvConst(n=>({...n,val:e.target.value}))}
                  style={{flex:1,fontSize:11,border:'1px solid #e5e7eb',borderRadius:4,padding:'2px 4px',outline:'none'}} placeholder="valeur" autoFocus/>
                <HBtn onClick={()=>{
                  if(!nouvConst.val) return;
                  const k = nouvConst.type;
                  const u = {fc:'bpm',ta:'mmHg',sat:'%',temp:'°C',dextro:'g/L',hemocue:'g/dL',tdr_palu:'',tdr_dengue:''}[k]||'';
                  const l = {fc:'FC',ta:'TA',sat:'Sat',temp:'T°',dextro:'Dex',hemocue:'Hb',tdr_palu:'TDR Palu',tdr_dengue:'TDR Dengue'}[k]||k;
                  // Si c'est dextro ou hemocue et pas de valeur initiale, mettre à jour le patient directement
                  const noInit = (k==='dextro'&&(!p.dextro||p.dextro==='--'))||(k==='hemocue'&&(!p.hemocue||p.hemocue==='--'));
                  if(noInit) {
                    save({[k]:nouvConst.val});
                  }
                  const c=[...constPost,{label:l,key:k,val:nouvConst.val,unit:u,ts:Date.now()}];
                  setConstPost(c);
                  save({constantes_post:JSON.stringify(c)});
                  setNouvConst({type:'',val:''});
                }}
                  style={{padding:'2px 6px',borderRadius:4,background:'#0d9488',color:'#fff',border:'none',fontSize:10}}>✓</HBtn>
              </div>}
            </div>
          </div>
          {/* Résultats examens uniquement - pas les constantes de base */}
          {(()=>{
            const CONST_BASE = ['fc','ta','sat','temp','dextro','hemocue'];
            const extrasPost = constPost.filter(c => !CONST_BASE.includes(c.key));
            const hasExtras = p.tdr_palu||p.tdr_dengue||p.bu_resultat||p.bhcg_resultat||extrasPost.length>0;
            if(!hasExtras) return null;
            return (
              <div style={{display:'flex',gap:4,flexWrap:'wrap',marginTop:6}}>
                {p.tdr_palu&&<span style={{fontSize:10,fontWeight:600,padding:'2px 7px',borderRadius:99,background:p.tdr_palu==='Positif'?'#fef2f2':'#f0fdf4',color:p.tdr_palu==='Positif'?'#ef4444':'#16a34a'}}>Palu {p.tdr_palu}</span>}
                {p.tdr_dengue&&<span style={{fontSize:10,fontWeight:600,padding:'2px 7px',borderRadius:99,background:p.tdr_dengue==='Positif'?'#fef2f2':'#f0fdf4',color:p.tdr_dengue==='Positif'?'#ef4444':'#16a34a'}}>Dengue {p.tdr_dengue}</span>}
                {p.bu_resultat&&<span style={{fontSize:10,fontWeight:600,padding:'2px 7px',borderRadius:99,background:'#eff6ff',color:'#3b82f6'}}>BU {p.bu_resultat}</span>}
                {p.bhcg_resultat&&<span style={{fontSize:10,fontWeight:600,padding:'2px 7px',borderRadius:99,background:p.bhcg_resultat==='Positif'?'#fef2f2':'#f0fdf4',color:p.bhcg_resultat==='Positif'?'#ef4444':'#16a34a'}}>bHCG {p.bhcg_resultat}</span>}
                {extrasPost.map((c,i)=><span key={i} style={{fontSize:10,fontWeight:600,color:'#374151',background:'#f3f4f6',padding:'2px 7px',borderRadius:99}}>{c.label} {c.val}</span>)}
              </div>
            );
          })()}
        </div>

        {/* ONGLETS — masqués pour AS */}
        {user?.role !== 'as' && <div style={{display:'flex',borderBottom:'1px solid #e5e7eb',background:'#f9fafb',flexShrink:0}}>
          {[{id:'anamnese',l:'Anamnèse'},{id:'examen',l:'Examen'},{id:'prescription',l:'Prescriptions'},{id:'evolution',l:'Évolution & sortie'}].map(t=>(
            <button key={t.id} onClick={()=>setOnglet(t.id)}
              style={{padding:'9px 14px',border:'none',background:'none',cursor:'pointer',fontSize:12,fontWeight:onglet===t.id?700:500,
                color:onglet===t.id?'#0d9488':'#6b7280',
                borderBottom:onglet===t.id?'2px solid #0d9488':'2px solid transparent'}}>
              {t.l}
            </button>
          ))}
        </div>}

        {/* CONTENU — masqué pour AS */}
        {user?.role !== 'as' && <div style={{flex:1,overflow:'auto',padding:14,display:'flex',flexDirection:'column'}}>

          {onglet==='anamnese'&&(
            <textarea value={anamnese} onChange={e=>{setAnamnese(e.target.value);debouncedSave({anamnese:e.target.value});}}
              placeholder="Motif de consultation, histoire de la maladie, antécédents, traitements habituels..."
              style={{...inp,height:'calc(100vh - 180px)',resize:'none',overflow:'hidden'}}/>
          )}

          {onglet==='examen'&&(
            <div>
              <div style={{display:'flex',gap:8,marginBottom:10}}>
                <div style={{flex:1,display:'flex',alignItems:'center',gap:8,padding:'8px 12px',background:'#f0fdf4',borderRadius:8,border:'1px solid #bbf7d0',cursor:'pointer'}}
                  onClick={()=>{const v=exam===EXAMEN_NORMAL?'':EXAMEN_NORMAL;setExam(v);debouncedSave({examen_clinique:v});}}>
                  <div style={{width:18,height:18,borderRadius:4,border:'2px solid '+(exam===EXAMEN_NORMAL?'#16a34a':'#d1d5db'),background:exam===EXAMEN_NORMAL?'#16a34a':'#fff',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    {exam===EXAMEN_NORMAL&&<span style={{color:'#fff',fontSize:10,fontWeight:700}}>✓</span>}
                  </div>
                  <span style={{fontSize:12,fontWeight:600,color:'#16a34a'}}>Examen normal adulte</span>
                </div>
                <div style={{flex:1,display:'flex',alignItems:'center',gap:8,padding:'8px 12px',background:'#eff6ff',borderRadius:8,border:'1px solid #bfdbfe',cursor:'pointer'}}
                  onClick={()=>{const v=exam===EXAMEN_NORMAL_PEDIATRIE?'':EXAMEN_NORMAL_PEDIATRIE;setExam(v);debouncedSave({examen_clinique:v});}}>
                  <div style={{width:18,height:18,borderRadius:4,border:'2px solid '+(exam===EXAMEN_NORMAL_PEDIATRIE?'#3b82f6':'#d1d5db'),background:exam===EXAMEN_NORMAL_PEDIATRIE?'#3b82f6':'#fff',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    {exam===EXAMEN_NORMAL_PEDIATRIE&&<span style={{color:'#fff',fontSize:10,fontWeight:700}}>✓</span>}
                  </div>
                  <span style={{fontSize:12,fontWeight:600,color:'#3b82f6'}}>Examen normal &lt; 2 ans</span>
                </div>
              </div>
              <textarea value={exam} onChange={e=>{setExam(e.target.value);debouncedSave({examen_clinique:e.target.value});}}
                placeholder="Décrivez l'examen clinique..." style={{...inp,height:'calc(100vh - 260px)',resize:'none',overflow:'hidden'}}/>
            </div>
          )}

          {onglet==='prescription'&&(
            user?.role==='ide' ? (
              <VueIDE p={p} user={user} onUpdate={onUpdate}/>
            ) : (

            <div style={{display:'flex',flexDirection:'column',gap:12,overflowY:'auto',flex:1}}>

              {/* EXAMENS */}
              <div style={{border:'1.5px solid #7c3aed33',borderRadius:10,overflow:'hidden'}}>
                <div style={{background:'#7c3aed18',padding:'8px 12px',display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'pointer'}}
                  onClick={()=>setCollapsed(c=>({...c,examens:!c.examens}))}>
                  <span style={{fontWeight:700,color:'#7c3aed',fontSize:13}}>🔬 Examens complémentaires</span>
                  <span style={{color:'#7c3aed',fontSize:14}}>{collapsed.examens?'▶':'▼'}</span>
                </div>
                {!collapsed.examens&&<div style={{padding:'10px 12px',display:'flex',flexWrap:'wrap',gap:6}}>
                  {EXAMENS.map(e=>{
                    const deja=prescriptions.find(r=>!r.fait&&(r.texte===e.label||r.texte?.startsWith(e.label+' :')));
                    if(deja) return null;
                    if(e.sub) return (
                      <div key={e.id} style={{position:'relative'}}>
                        <HBtn onClick={()=>setSubOpen(s=>({...s,[e.id]:!s[e.id]}))}
                          style={{padding:'5px 10px',borderRadius:6,background:e.color+'18',color:e.color,border:'1.5px solid '+e.color+'66',fontSize:11,fontWeight:600}}>
                          {e.label} {subOpen[e.id]?'▲':'▼'}
                        </HBtn>
                        {subOpen[e.id]&&<div style={{position:'fixed',zIndex:500,background:'#fff',border:'1.5px solid '+e.color+'66',borderRadius:10,padding:12,boxShadow:'0 8px 24px rgba(0,0,0,0.15)',minWidth:240,maxHeight:320,overflowY:'auto'}}>
                          <div style={{fontSize:10,fontWeight:700,color:e.color,marginBottom:8,textTransform:'uppercase'}}>Cocher les items à prescrire</div>
                          {e.sub.map(s=>{
                            const sel=(subSel[e.id]||[]).includes(s);
                            const dejaRx=prescriptions.find(r=>!r.fait&&r.texte?.startsWith(e.label)&&r.texte?.includes(s));
                            return <div key={s}
                              onClick={()=>{
                                if(dejaRx) return;
                                setSubSel(prev=>{
                                  const cur=prev[e.id]||[];
                                  return {...prev,[e.id]:sel?cur.filter(x=>x!==s):[...cur,s]};
                                });
                              }}
                              style={{padding:'6px 8px',borderRadius:5,cursor:dejaRx?'default':'pointer',fontSize:11,color:dejaRx?'#9ca3af':e.color,fontWeight:600,display:'flex',alignItems:'center',gap:8,opacity:dejaRx?0.4:1}}
                              onMouseEnter={ev=>{if(!dejaRx)ev.currentTarget.style.background=e.color+'18';}}
                              onMouseLeave={ev=>{ev.currentTarget.style.background='transparent';}}>
                              <div style={{width:16,height:16,borderRadius:4,border:'1.5px solid '+(sel||dejaRx?e.color:'#d1d5db'),background:(sel||dejaRx)?e.color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                                {(sel||dejaRx)&&<span style={{color:'#fff',fontSize:10,fontWeight:700}}>✓</span>}
                              </div>
                              {s}{dejaRx?' (déjà prescrit)':''}
                            </div>;
                          })}
                          <div style={{display:'flex',gap:6,marginTop:10}}>
                            <button onClick={()=>{
                              const sel=subSel[e.id]||[];
                              if(sel.length>0){
                                const texte=e.label+' : '+sel.join(', ');
                                ajouterPrescription(texte,'examen');
                              }
                              setSubSel(prev=>({...prev,[e.id]:[]}));
                              setSubOpen(so=>({...so,[e.id]:false}));
                            }} style={{flex:1,padding:'8px',borderRadius:6,background:e.color,color:'#fff',border:'none',fontSize:11,cursor:'pointer',fontWeight:700}}>
                              Prescrire {(subSel[e.id]||[]).length>0?'('+subSel[e.id].length+')':''}
                            </button>
                            <button onClick={()=>setSubOpen(so=>({...so,[e.id]:false}))} style={{padding:'8px 12px',borderRadius:6,background:'#f3f4f6',color:'#6b7280',border:'none',fontSize:11,cursor:'pointer'}}>✕</button>
                          </div>
                        </div>}
                      </div>
                    );
                    return <HBtn key={e.id} onClick={()=>ajouterPrescription(e.label,'examen')}
                      style={{padding:'5px 10px',borderRadius:6,background:e.color+'18',color:e.color,border:'1.5px solid '+e.color+'66',fontSize:11,fontWeight:600}}>
                      {e.label}
                    </HBtn>;
                  })}
                  <AutreLibre categorie="examen" onAjouter={ajouterPrescription}/>
                </div>}
              </div>

              {/* THERAPEUTIQUE */}
              <div style={{border:'1.5px solid #ea580c44',borderRadius:10,overflow:'hidden'}}>
                <div style={{background:'#ea580c18',padding:'8px 12px',display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'pointer'}}
                  onClick={()=>setCollapsed(c=>({...c,therapeutique:!c.therapeutique}))}>
                  <span style={{fontWeight:700,color:'#ea580c',fontSize:13}}>💊 Thérapeutique</span>
                  <span style={{color:'#ea580c',fontSize:14}}>{collapsed.therapeutique?'▶':'▼'}</span>
                </div>
                {!collapsed.therapeutique&&<div style={{padding:'10px 12px'}}>
                  {/* Onglets Adulte / Pédiatrie */}
                  <div style={{display:'flex',gap:6,marginBottom:10}}>
                    {['adulte','pediatrie'].map(t=>(
                      <button key={t} onClick={()=>setTherapieTab(t)}
                        style={{padding:'4px 12px',borderRadius:6,fontSize:11,fontWeight:600,cursor:'pointer',border:'1.5px solid '+(therapieTab===t?'#ea580c':'#e5e7eb'),background:therapieTab===t?'#ea580c':'#fff',color:therapieTab===t?'#fff':'#6b7280'}}>
                        {t==='adulte'?'Adulte':'Pédiatrie'}
                      </button>
                    ))}
                  </div>

                  {/* Voies d'administration */}
                  {THERAPEUTIQUE_VOIES[therapieTab].map(voieObj=>(
                    <div key={voieObj.voie} style={{marginBottom:12,border:'1px solid #f3f4f6',borderRadius:8,overflow:'hidden'}}>
                      <div style={{background:'#f9fafb',padding:'6px 10px',fontSize:10,fontWeight:800,color:'#374151',textTransform:'uppercase',letterSpacing:1}}>
                        {voieObj.label}
                      </div>
                      <div style={{padding:'8px 10px',display:'flex',flexDirection:'column',gap:6}}>
                        {voieObj.groupes.map(grp=>(
                          <div key={grp.group}>
                            <div style={{fontSize:9,fontWeight:700,color:grp.color,textTransform:'uppercase',letterSpacing:0.5,marginBottom:4}}>{grp.group}</div>
                            <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
                              {grp.items.map(item=>{
                                const isVentoline = item.includes('Ventoline');
                                const isAtrovent = item.includes('Atrovent');
                                const dejaVentoline = prescriptions.find(r=>!r.fait&&r.texte.includes('Ventoline — Séance'));
                                const dejaAtrovent = prescriptions.find(r=>!r.fait&&r.texte.includes('Atrovent — Séance'));
                                if(isVentoline && dejaVentoline) return null;
                                if(isAtrovent && dejaAtrovent) return null;
                                const deja = !isVentoline && !isAtrovent && prescriptions.find(r=>!r.fait&&r.texte.startsWith(item.split('__')[0]));
                                if(deja) return null;
                                const rouge = isSecurisee(item);
                                const dose = item.includes('2.5mg') ? '2.5mg' : item.includes('5mg') ? '5mg' : item.includes('0.25mg') ? '0.25mg' : '0.5mg';
                                return <HBtn key={item} onClick={async()=>{
                                  if(isVentoline) {
                                    // 3 séances Ventoline + 1 Atrovent automatique
                                    const atroventDose = dose === '2.5mg' ? '0.25mg' : '0.5mg';
                                    const rx = [...prescriptions,
                                      { texte:`Ventoline ${dose} — Séance 1/3`, categorie:'therapeutique', fait:false, ts:Date.now(), par:user?.matricule||'' },
                                      { texte:`Ventoline ${dose} — Séance 2/3`, categorie:'therapeutique', fait:false, ts:Date.now()+1, par:user?.matricule||'' },
                                      { texte:`Ventoline ${dose} — Séance 3/3`, categorie:'therapeutique', fait:false, ts:Date.now()+2, par:user?.matricule||'' },
                                      { texte:`Atrovent ${atroventDose} — Séance 1/1`, categorie:'therapeutique', fait:false, ts:Date.now()+3, par:user?.matricule||'' },
                                    ];
                                    setPrescriptions(rx);
                                    await save({ prescriptions: JSON.stringify(rx) });
                                  } else {
                                    ajouterPrescription(item,'therapeutique');
                                  }
                                }}
                                  style={{padding:'4px 9px',borderRadius:6,fontSize:11,fontWeight:600,
                                    background:rouge?'#fef2f2':grp.color+'12',
                                    color:rouge?'#dc2626':grp.color,
                                    border:'1.5px solid '+(rouge?'#fecaca':grp.color+'44')}}>
                                  {isVentoline ? `${item} ×3 + Atrovent` : item}
                                </HBtn>;
                              })}
                            </div>
                          </div>
                        ))}
                        {voieObj.voie==='IV'&&(
                          <div>
                            <div style={{fontSize:9,fontWeight:700,color:'#0369a1',textTransform:'uppercase',letterSpacing:0.5,marginBottom:4}}>Hydratation</div>
                            <HydratationSelector onAjouter={ajouterPrescription}/>
                            <div style={{marginTop:4,display:'flex',gap:4,flexWrap:'wrap'}}>
                              {[['1g','250mL','1h'],['2g','500mL','2h'],['3g','750mL','3h scopé+GDS']].map(([g,v,d])=>{
                                const label=`Potassium ${g} / ${v} / ${d}`;
                                const deja=prescriptions.find(r=>!r.fait&&r.texte===label);
                                if(deja) return null;
                                return <HBtn key={g} onClick={()=>ajouterPrescription(label,'therapeutique')}
                                  style={{padding:'4px 10px',borderRadius:5,fontSize:10,fontWeight:600,background:'#f5f3ff',color:'#7c3aed',border:'1px solid #ddd6fe'}}>
                                  K+ {g}
                                </HBtn>;
                              })}
                            </div>
                          </div>
                        )}
                        {voieObj.voie==='SC'&&(
                          <div>
                            <div style={{fontSize:9,fontWeight:700,color:'#6b7280',textTransform:'uppercase',letterSpacing:0.5,marginBottom:4}}>Insuline</div>
                            <InsulineSelector onAjouter={ajouterPrescription}/>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  <AutreLibre categorie="therapeutique" onAjouter={ajouterPrescription}/>
                </div>}
              </div>

              {/* SOINS */}
              <div style={{border:'1.5px solid #eab30844',borderRadius:10,overflow:'hidden'}}>
                <div style={{background:'#f59e0b18',padding:'8px 12px',display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'pointer'}}
                  onClick={()=>setCollapsed(c=>({...c,soins:!c.soins}))}>
                  <span style={{fontWeight:700,color:'#d97706',fontSize:13}}>🩹 Soins</span>
                  <span style={{color:'#d97706',fontSize:14}}>{collapsed.soins?'▶':'▼'}</span>
                </div>
                {!collapsed.soins&&<div style={{padding:'10px 12px',display:'flex',flexWrap:'wrap',gap:6}}>
                  {SOINS.map(s=>{
                    const deja=prescriptions.find(r=>!r.fait&&r.texte===s.label);
                    if(deja) return null;
                    return <HBtn key={s.id} onClick={()=>ajouterPrescription(s.label,'soin')}
                      style={{padding:'5px 10px',borderRadius:6,background:s.color+'15',color:s.color,border:'1.5px solid '+s.color+'55',fontSize:11,fontWeight:600}}>
                      {s.label}
                    </HBtn>;
                  })}
                  <AutreLibre categorie="soin" onAjouter={ajouterPrescription}/>
                </div>
              }
            </div>
          </div>
            )
          )}
          {onglet==='evolution'&&(
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              {/* SUTURES si motif plaie */}
              {p.symptome==='plaie'&&<SutureSection p={p} save={save}/>}
              <div>
                <label style={{fontSize:11,fontWeight:700,color:'#6b7280',display:'block',marginBottom:4,textTransform:'uppercase'}}>Évolution au dispensaire</label>
                <textarea value={evolution} onChange={e=>{setEvolution(e.target.value);debouncedSave({evolution:e.target.value});}} rows={4} style={{...inp,overflow:'hidden'}} placeholder="Évolution clinique..."/>
              </div>
              <div>
                <label style={{fontSize:11,fontWeight:700,color:'#6b7280',display:'block',marginBottom:4,textTransform:'uppercase'}}>Diagnostic</label>
                <textarea value={diagnostic} onChange={e=>{setDiagnostic(e.target.value);debouncedSave({diagnostic:e.target.value});}} rows={3} style={inp} placeholder="Diagnostic retenu..."/>
              </div>
              <div>
                <label style={{fontSize:11,fontWeight:700,color:'#6b7280',display:'block',marginBottom:4,textTransform:'uppercase'}}>Ordonnance de sortie</label>
                <textarea value={ordonnance} onChange={e=>{setOrdonnance(e.target.value);debouncedSave({ordonnance:e.target.value});}} rows={5} style={inp} placeholder="Traitements de sortie, conseils, suivi..."/>
              </div>
              <HBtn onClick={()=>{navigator.clipboard.writeText(resume());setCopied(true);setTimeout(()=>setCopied(false),2000);}}
                style={{padding:'12px',borderRadius:8,background:copied?'#16a34a':'#111827',color:'#fff',fontSize:14,fontWeight:700,border:'none',width:'100%'}}>
                {copied?'✓ Copié !':'📋 Résumé — Copier pour DxCare'}
              </HBtn>
            </div>
          )}
        </div>}
      </div>

      {/* COLONNE DROITE — masquée pour IDE */}
      {user?.role !== 'ide' && <div style={{width:240,borderLeft:'1px solid #e5e7eb',background:'#fafafa',display:'flex',flexDirection:'column',overflow:'hidden',flexShrink:0}}>
        <div style={{padding:'10px 12px',borderBottom:'1px solid #e5e7eb',fontWeight:700,fontSize:12,color:'#374151'}}>
          Prescriptions <span style={{background:'#ef4444',color:'#fff',borderRadius:99,fontSize:10,padding:'1px 6px',marginLeft:4}}>{enAttente.length}</span>
        </div>
        <div style={{flex:1,overflow:'auto',padding:8}}>
          {enAttente.length===0&&realises.length===0&&<div style={{color:'#9ca3af',fontSize:11,textAlign:'center',marginTop:20,padding:8}}>Aucune prescription</div>}
          {enAttente.map((r,i)=>{
            const globalIdx = prescriptions.indexOf(r);
            const bc = r.categorie==='examen'?'#7c3aed':r.categorie==='therapeutique'?'#0d9488':'#f59e0b';
            return (
              <div key={i} style={{background:'#fff',border:'1.5px solid '+bc+'55',borderRadius:8,padding:'7px 10px',marginBottom:5,display:'flex',alignItems:'flex-start',gap:5}}>
                <span style={{fontSize:11,flexShrink:0}}>{r.categorie==='examen'?'🔬':r.categorie==='therapeutique'?'💊':'🩹'}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:11,color:'#374151',lineHeight:1.3}}>{r.texte}</div>
                  {r.ts&&<div style={{fontSize:9,color:'#9ca3af',marginTop:1}}>Prescrit {r.par?'par '+r.par+' ':''}{r.ts?new Date(r.ts).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}):''}</div>}
                  {r.faitA&&<div style={{fontSize:9,color:'#16a34a',marginTop:1}}>✓ Réalisé {r.faitPar?'par '+r.faitPar+' ':''}{new Date(r.faitA).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</div>}
                  {r.nonRealise&&<div style={{fontSize:9,color:'#ef4444',marginTop:1}}>✕ Non réalisé — {r.motifNonRealise||''}</div>}
                </div>
                <HBtn onClick={()=>cocherFait(globalIdx)} title="Marquer réalisé"
                  style={{flexShrink:0,width:20,height:20,borderRadius:4,border:'1.5px solid #16a34a',background:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,color:'#16a34a',padding:0}}>
                  ✓
                </HBtn>
                <HBtn onClick={async()=>{const rx=prescriptions.filter((_,j)=>j!==globalIdx);setPrescriptions(rx);await save({prescriptions:JSON.stringify(rx)});}} title="Supprimer"
                  style={{flexShrink:0,width:20,height:20,borderRadius:4,border:'1.5px solid #ef4444',background:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,color:'#ef4444',padding:0}}>
                  ✕
                </HBtn>
              </div>
            );
          })}
          {realises.length>0&&<>
            <div style={{fontSize:10,color:'#9ca3af',fontWeight:700,textTransform:'uppercase',margin:'8px 0 4px',padding:'0 2px'}}>Réalisés</div>
            {realises.map((r,i)=>(
              <div key={i} style={{background:'#f3f4f6',borderRadius:7,padding:'5px 8px',marginBottom:3,display:'flex',gap:5,alignItems:'flex-start',opacity:0.7}}>
                <span style={{fontSize:10,flexShrink:0}}>{r.categorie==='examen'?'🔬':r.categorie==='therapeutique'?'💊':'🩹'}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:10,color:'#6b7280',textDecoration:r.nonRealise?'none':'line-through'}}>{r.texte}</div>
                  {r.faitA&&<div style={{fontSize:8,color:'#16a34a'}}>✓ {r.faitPar} {new Date(r.faitA).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</div>}
                  {r.nonRealise&&<div style={{fontSize:8,color:'#ef4444'}}>✕ {r.motifNonRealise}</div>}
                </div>
              </div>
            ))}
          </>}
        </div>
      </div>}
    </div>
  );
}

function AutreLibre({ categorie, onAjouter }) {
  const [open, setOpen] = useState(false);
  const [val, setVal] = useState('');
  if(!open) return (
    <button onClick={()=>setOpen(true)}
      onMouseEnter={e=>e.currentTarget.style.filter='brightness(0.88)'}
      onMouseLeave={e=>e.currentTarget.style.filter='none'}
      style={{padding:'5px 10px',borderRadius:6,background:'#f3f4f6',color:'#6b7280',border:'1.5px solid #e5e7eb',fontSize:11,fontWeight:600,cursor:'pointer',transition:'filter 0.1s'}}>
      + Autre...
    </button>
  );
  return (
    <div style={{display:'flex',gap:5,alignItems:'center'}}>
      <input value={val} onChange={e=>setVal(e.target.value)} placeholder="Préciser..." autoFocus
        style={{padding:'4px 8px',borderRadius:5,border:'1px solid #e5e7eb',fontSize:11,outline:'none'}}
        onKeyDown={e=>{if(e.key==='Enter'&&val.trim()){onAjouter(val.trim(),categorie);setVal('');setOpen(false);}}}/>
      <button onClick={()=>{if(val.trim()){onAjouter(val.trim(),categorie);setVal('');setOpen(false);}}}
        style={{padding:'4px 10px',borderRadius:5,background:'#0d9488',color:'#fff',border:'none',fontSize:11,fontWeight:600,cursor:'pointer'}}>OK</button>
      <button onClick={()=>{setOpen(false);setVal('');}}
        style={{padding:'4px 8px',borderRadius:5,background:'#f3f4f6',color:'#6b7280',border:'none',fontSize:11,cursor:'pointer'}}>✕</button>
    </div>
  );
}

function HydratationSelector({ onAjouter }) {
  const [sol, setSol] = useState('');
  const [qte, setQte] = useState('');
  const [dur, setDur] = useState('');
  if (!sol) return (
    <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
      {['NaCl 0.9%','G5%','G10%','G30%','Ringer Lactate'].map(s=>(
        <HBtn key={s} onClick={()=>setSol(s)}
          style={{padding:'4px 10px',borderRadius:5,fontSize:10,fontWeight:600,background:'#e0f2fe',color:'#0369a1',border:'1px solid #bae6fd'}}>
          {s}
        </HBtn>
      ))}
    </div>
  );
  return (
    <div style={{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap'}}>
      <span style={{fontSize:11,fontWeight:600,color:'#0369a1'}}>{sol}</span>
      <input value={qte} onChange={e=>setQte(e.target.value)} placeholder="mL" style={{width:60,padding:'3px 6px',borderRadius:5,border:'1px solid #bae6fd',fontSize:11,outline:'none'}}/>
      <input value={dur} onChange={e=>setDur(e.target.value)} placeholder="durée" style={{width:70,padding:'3px 6px',borderRadius:5,border:'1px solid #bae6fd',fontSize:11,outline:'none'}}/>
      <HBtn onClick={()=>{if(qte&&dur){onAjouter(`${sol} ${qte}mL sur ${dur}`,'therapeutique');setSol('');setQte('');setDur('');}}}
        style={{padding:'3px 10px',borderRadius:5,background:'#0369a1',color:'#fff',border:'none',fontSize:10,fontWeight:600}}>OK</HBtn>
      <HBtn onClick={()=>setSol('')} style={{padding:'3px 6px',borderRadius:5,background:'#f3f4f6',color:'#6b7280',border:'none',fontSize:10}}>✕</HBtn>
    </div>
  );
}

function DeplacerBtn({ p, onUpdate, patients=[] }) {
  const [open, setOpen] = useState(false);
  const emplacementLabel = EMPLACEMENTS_FICHE.find(e=>e.id===p.emplacement)?.l || p.emplacement || '?';
  return (
    <div style={{position:'relative'}}>
      <button onClick={()=>setOpen(o=>!o)}
        style={{padding:'5px 12px',borderRadius:8,border:'1.5px solid #e5e7eb',background:'#f9fafb',fontSize:12,fontWeight:600,color:'#374151',cursor:'pointer',display:'flex',alignItems:'center',gap:6}}>
        📍 {emplacementLabel} {open?'▲':'▼'}
      </button>
      {open&&<div style={{position:'fixed',zIndex:9999,background:'#fff',border:'1.5px solid #e5e7eb',borderRadius:10,boxShadow:'0 8px 24px rgba(0,0,0,0.15)',padding:8,minWidth:200}}>
        <div style={{fontSize:10,fontWeight:700,color:'#9ca3af',textTransform:'uppercase',padding:'4px 8px',marginBottom:4}}>Déplacer vers</div>
        {EMPLACEMENTS_FICHE.map(em=>{
          const occupePar = patients.find(pt=>pt.emplacement===em.id && pt.id!==p.id);
          const estActuel = em.id===p.emplacement;
          const disabled = !!occupePar || estActuel;
          return (
            <div key={em.id}
              onClick={async()=>{
                if(disabled) return;
                await fetch('/api/patients',{method:'POST',headers:{'Content-Type':'application/json'},
                  body:JSON.stringify({action:'update',id:p.id,patch:{emplacement:em.id}})});
                setOpen(false);
                onUpdate?.();
              }}
              style={{padding:'8px 12px',borderRadius:7,cursor:disabled?'default':'pointer',
                fontSize:12,fontWeight:600,
                color:disabled?'#d1d5db':em.c,
                background:estActuel?'#f0fdf4':'#fff',
                display:'flex',alignItems:'center',gap:8,
                textDecoration:occupePar?'line-through':'none',
                opacity:occupePar?0.5:1}}
              onMouseEnter={e=>{if(!disabled)e.currentTarget.style.background=em.c+'18';}}
              onMouseLeave={e=>{e.currentTarget.style.background=estActuel?'#f0fdf4':'#fff';}}>
              {estActuel&&<span style={{fontSize:10,color:'#16a34a'}}>✓</span>}
              {em.l}
              {occupePar&&<span style={{fontSize:10,color:'#9ca3af',marginLeft:'auto'}}>{occupePar.nom}</span>}
            </div>
          );
        })}
        <div style={{borderTop:'1px solid #f3f4f6',marginTop:4,paddingTop:4}}>
          <div onClick={()=>setOpen(false)} style={{padding:'6px 12px',borderRadius:7,cursor:'pointer',fontSize:11,color:'#9ca3af',textAlign:'center'}}
            onMouseEnter={e=>e.currentTarget.style.background='#f9fafb'}
            onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
            Fermer
          </div>
        </div>
      </div>}
    </div>
  );
}

function SutureSection({ p, save }) {
  const SUTURES = [
    { id:'sut_sup5', label:'Suture ≥ 5 points', color:'#dc2626' },
    { id:'sut_inf5', label:'Suture < 5 points',  color:'#f59e0b' },
    { id:'sut_colle',label:'Suture colle',        color:'#0891b2' },
    { id:'sut_agraf',label:'Suture agrafes',      color:'#7c3aed' },
    { id:'sut_steri',label:'Suture Steri-strip',  color:'#16a34a' },
  ];
  const [sutures, setSutures] = useState(() => {
    try { return JSON.parse(p.sutures||'[]'); } catch { return []; }
  });

  async function toggle(id) {
    const next = sutures.includes(id) ? sutures.filter(x=>x!==id) : [...sutures, id];
    setSutures(next);
    await save({ sutures: JSON.stringify(next) });
  }

  return (
    <div style={{background:'#fff8f8',border:'1.5px solid #fecaca',borderRadius:10,padding:'10px 14px'}}>
      <div style={{fontSize:11,fontWeight:700,color:'#dc2626',textTransform:'uppercase',marginBottom:8}}>✂️ Suture / Fermeture plaie</div>
      <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
        {SUTURES.map(s=>{
          const sel = sutures.includes(s.id);
          return (
            <button key={s.id} onClick={()=>toggle(s.id)}
              style={{padding:'6px 14px',borderRadius:7,fontSize:12,fontWeight:600,cursor:'pointer',
                background: sel ? s.color : '#fff',
                color: sel ? '#fff' : s.color,
                border: '2px solid ' + s.color,
                transition:'all 0.1s'}}>
              {sel ? '✓ ' : ''}{s.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function VueIDE({ p, user, onUpdate }) {
  const rxAll = safeJSON(p.prescriptions, []);
  const [resultats, setResultats] = useState({});

  async function cocherAvecResultat(idx, resultat) {
    const rx = [...rxAll];
    rx[idx] = { ...rx[idx], fait:true, resultat: resultat||'', faitPar:user?.matricule, faitA:Date.now() };
    const res = await fetch('/api/patients', { method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ action:'update', id:p.id, patch:{ prescriptions: JSON.stringify(rx) } }) });
    const data = await res.json();
    if (data.patients) {
      const updated = data.patients.find(x => x.id === p.id);
      if (updated) onUpdate?.(updated);
    }
  }

  function getTypeExamen(texte) {
    const t = texte.toLowerCase();
    if (t.includes('bhcg')) return 'binaire';
    if (t.includes('tdr') || t.includes('paludisme') || t.includes('dengue')) return 'binaire';
    if (t.includes('quick test') || t.includes('tetanos')) return 'binaire';
    if (t.includes('bu') || t.includes('bandelette')) return 'bu';
    if (t.includes('hemocue') || t.includes('hémocue')) return 'chiffre_hb';
    if (t.includes('dextro')) return 'chiffre_dex';
    if (t.includes('ecg')) return 'fait_montre';
    if (t.includes('bio') || t.includes('prélèvement') || t.includes('nfs') || t.includes('gaz')) return 'fait_montre';
    return 'simple';
  }

  function ItemExamen({ r, idx }) {
    const globalIdx = rxAll.indexOf(r);
    const type = getTypeExamen(r.texte);
    const couleur = '#7c3aed';
    const [buVals, setBuVals] = useState({ leuco:'', nitrite:'', sang:'', glucose:'', cetone:'' });
    const [valChiffre, setValChiffre] = useState('');
    const [showSaisie, setShowSaisie] = useState(false);

    if (r.fait) return (
      <div style={{padding:'12px 16px',borderRadius:10,border:'1px solid #e5e7eb',background:'#f9fafb',opacity:0.6,display:'flex',alignItems:'center',gap:10}}>
        <div style={{width:24,height:24,borderRadius:6,background:couleur,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          <span style={{color:'#fff',fontSize:14,fontWeight:700}}>✓</span>
        </div>
        <div>
          <span style={{fontSize:14,fontWeight:400,color:'#9ca3af',textDecoration:'line-through'}}>{r.texte}</span>
          {r.resultat&&<div style={{fontSize:12,color:'#6b7280',marginTop:2}}>{r.resultat}</div>}
          {r.faitA&&<div style={{fontSize:10,color:'#16a34a',marginTop:2}}>Réalisé {r.faitPar?'par '+r.faitPar+' ':''}{new Date(r.faitA).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</div>}
        </div>
      </div>
    );

    // Pas encore fait
    if (!showSaisie) return (
      <div onClick={()=>{
        if(type==='simple'||type==='fait_montre') { cocherAvecResultat(globalIdx, ''); }
        else setShowSaisie(true);
      }}
        style={{padding:'14px 16px',borderRadius:10,border:'2px solid '+couleur+'66',background:'#fff',cursor:'pointer',display:'flex',alignItems:'center',gap:10,transition:'all 0.15s'}}
        onMouseEnter={e=>e.currentTarget.style.background='#f5f3ff'}
        onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
        <div style={{width:24,height:24,borderRadius:6,border:'2px solid '+couleur,background:'#fff',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}/>
        <div style={{flex:1}}>
          <div style={{fontSize:14,fontWeight:600,color:'#374151'}}>{r.texte}</div>
          {r.ts&&<div style={{fontSize:10,color:'#9ca3af',marginTop:2}}>Prescrit {r.par?'par '+r.par+' ':''}{new Date(r.ts).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</div>}
        </div>
        {(type!=='simple'&&type!=='fait_montre')&&<span style={{marginLeft:'auto',fontSize:11,color:couleur,fontWeight:600,flexShrink:0}}>Saisir résultat →</span>}
      </div>
    );

    // Saisie résultat
    return (
      <div style={{padding:'14px 16px',borderRadius:10,border:'2px solid '+couleur,background:'#faf5ff'}}>
        <div style={{fontWeight:700,fontSize:13,color:couleur,marginBottom:10}}>{r.texte}</div>

        {type==='binaire'&&(
          <div style={{display:'flex',gap:8}}>
            {['Négatif','Positif'].map(v=>(
              <button key={v} onClick={()=>cocherAvecResultat(globalIdx,v)}
                style={{flex:1,padding:'10px',borderRadius:8,fontWeight:700,fontSize:13,cursor:'pointer',
                  background:v==='Positif'?'#fef2f2':'#f0fdf4',
                  color:v==='Positif'?'#ef4444':'#16a34a',
                  border:'2px solid '+(v==='Positif'?'#fecaca':'#bbf7d0')}}>
                {v==='Positif'?'✗ Positif':'✓ Négatif'}
              </button>
            ))}
          </div>
        )}

        {type==='bu'&&(
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {[['leuco','Leucocytes'],['nitrite','Nitrites'],['sang','Sang'],['glucose','Glucose'],['cetone','Cétones']].map(([k,l])=>(
              <div key={k} style={{display:'flex',alignItems:'center',gap:8}}>
                <span style={{fontSize:12,fontWeight:600,color:'#374151',width:90,flexShrink:0}}>{l}</span>
                <div style={{display:'flex',gap:4}}>
                  {['Nég','+','++','+++'].map(v=>(
                    <button key={v} onClick={()=>setBuVals(prev=>({...prev,[k]:v}))}
                      style={{padding:'4px 10px',borderRadius:6,fontSize:11,fontWeight:600,cursor:'pointer',
                        background:buVals[k]===v?(v==='Nég'?'#f0fdf4':'#fef2f2'):'#f9fafb',
                        color:buVals[k]===v?(v==='Nég'?'#16a34a':'#ef4444'):'#6b7280',
                        border:'1.5px solid '+(buVals[k]===v?(v==='Nég'?'#bbf7d0':'#fecaca'):'#e5e7eb')}}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <button onClick={()=>{
              const res = `Leuco ${buVals.leuco||'?'} / Nitrites ${buVals.nitrite||'?'} / Sang ${buVals.sang||'?'} / Glucose ${buVals.glucose||'?'} / Cétones ${buVals.cetone||'?'}`;
              cocherAvecResultat(globalIdx, res);
            }} style={{marginTop:4,padding:'10px',borderRadius:8,background:couleur,color:'#fff',fontWeight:700,fontSize:13,border:'none',cursor:'pointer'}}>
              Valider
            </button>
          </div>
        )}

        {(type==='chiffre_hb'||type==='chiffre_dex')&&(
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <input value={valChiffre} onChange={e=>setValChiffre(e.target.value)}
              placeholder={type==='chiffre_hb'?'g/dL':'g/L'} inputMode="decimal" autoFocus
              style={{flex:1,padding:'10px 12px',borderRadius:8,border:'2px solid '+couleur+'66',fontSize:18,fontWeight:700,outline:'none',textAlign:'center'}}/>
            <span style={{fontSize:12,color:'#9ca3af'}}>{type==='chiffre_hb'?'g/dL':'g/L'}</span>
            <button onClick={()=>{if(valChiffre)cocherAvecResultat(globalIdx,valChiffre+(type==='chiffre_hb'?' g/dL':' g/L'));}}
              style={{padding:'10px 16px',borderRadius:8,background:couleur,color:'#fff',fontWeight:700,border:'none',cursor:'pointer'}}>OK</button>
          </div>
        )}

        <button onClick={()=>setShowSaisie(false)}
          style={{marginTop:8,background:'none',border:'none',color:'#9ca3af',fontSize:11,cursor:'pointer',padding:0}}>
          Annuler
        </button>
      </div>
    );
  }

  function ColPrescription({ titre, couleur, items }) {
    return (
      <div style={{flex:1,border:'2px solid '+couleur+'33',borderRadius:12,display:'flex',flexDirection:'column',overflow:'hidden'}}>
        <div style={{background:couleur+'18',padding:'12px 16px',borderBottom:'1px solid '+couleur+'22',flexShrink:0}}>
          <span style={{fontWeight:700,color:couleur,fontSize:14}}>{titre}</span>
        </div>
        <div style={{flex:1,overflow:'auto',padding:12,display:'flex',flexDirection:'column',gap:8}}>
          {items.length===0&&<div style={{color:'#9ca3af',fontSize:13,textAlign:'center',marginTop:20}}>Aucune prescription</div>}
          {items.map((r,i)=>(
            titre.includes('Examens')
              ? <ItemExamen key={i} r={r} idx={i}/>
              : <ItemSimple key={i} r={r} couleur={couleur} onCocher={()=>{
                  const globalIdx=rxAll.indexOf(r);
                  const rx=[...rxAll];
                  rx[globalIdx]={...rx[globalIdx],fait:true,faitPar:user?.matricule,faitA:Date.now()};
                  fetch('/api/patients',{method:'POST',headers:{'Content-Type':'application/json'},
                    body:JSON.stringify({action:'update',id:p.id,patch:{prescriptions:JSON.stringify(rx)}})})
                  .then(r=>r.json()).then(data=>{
                    if(data.patients){const u=data.patients.find(x=>x.id===p.id);if(u)onUpdate?.(u);}
                  });
                }} onNonRealise={(motif)=>{
                  const globalIdx=rxAll.indexOf(r);
                  const rx=[...rxAll];
                  rx[globalIdx]={...rx[globalIdx],nonRealise:true,motifNonRealise:motif,faitPar:user?.matricule,faitA:Date.now()};
                  fetch('/api/patients',{method:'POST',headers:{'Content-Type':'application/json'},
                    body:JSON.stringify({action:'update',id:p.id,patch:{prescriptions:JSON.stringify(rx)}})})
                  .then(r=>r.json()).then(data=>{
                    if(data.patients){const u=data.patients.find(x=>x.id===p.id);if(u)onUpdate?.(u);}
                  });
                }}/>
          ))}
        </div>
      </div>
    );
  }

  function ItemSimple({ r, couleur, onCocher, onNonRealise }) {
    const [showMotif, setShowMotif] = useState(false);
    const [motif, setMotif] = useState('');

    if (r.fait) return (
      <div style={{padding:'12px 16px',borderRadius:10,border:'1px solid #e5e7eb',background:'#f9fafb',opacity:0.6}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:24,height:24,borderRadius:6,background:couleur,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <span style={{color:'#fff',fontSize:14,fontWeight:700}}>✓</span>
          </div>
          <div>
            <div style={{fontSize:14,color:'#9ca3af',textDecoration:'line-through'}}>{r.texte}</div>
            {r.faitA&&<div style={{fontSize:10,color:'#16a34a',marginTop:2}}>Réalisé {r.faitPar?'par '+r.faitPar+' ':''}{new Date(r.faitA).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</div>}
          </div>
        </div>
      </div>
    );

    if (r.nonRealise) return (
      <div style={{padding:'12px 16px',borderRadius:10,border:'1.5px solid #fecaca',background:'#fef2f2',opacity:0.7}}>
        <div style={{fontSize:13,color:'#ef4444',fontWeight:600,textDecoration:'line-through'}}>{r.texte}</div>
        <div style={{fontSize:11,color:'#dc2626',marginTop:4}}>✕ Non réalisé — {r.motifNonRealise||'sans motif'}</div>
      </div>
    );

    if (showMotif) return (
      <div style={{padding:'12px 16px',borderRadius:10,border:'2px solid #ef4444',background:'#fef2f2'}}>
        <div style={{fontSize:13,fontWeight:600,color:'#374151',marginBottom:8}}>{r.texte}</div>
        <div style={{fontSize:11,fontWeight:600,color:'#dc2626',marginBottom:6}}>Motif de non-réalisation</div>
        <input value={motif} onChange={e=>setMotif(e.target.value)} autoFocus
          placeholder="Patient parti, refus, contre-indication..." 
          style={{width:'100%',padding:'8px 10px',borderRadius:7,border:'1.5px solid #fecaca',fontSize:12,outline:'none',boxSizing:'border-box',marginBottom:8}}/>
        <div style={{display:'flex',gap:6}}>
          <button onClick={()=>{if(motif.trim())onNonRealise(motif.trim());}}
            style={{flex:1,padding:'8px',borderRadius:7,background:'#ef4444',color:'#fff',fontWeight:700,fontSize:12,border:'none',cursor:'pointer'}}>
            Confirmer non-réalisation
          </button>
          <button onClick={()=>{setShowMotif(false);setMotif('');}}
            style={{padding:'8px 12px',borderRadius:7,background:'#f3f4f6',color:'#6b7280',border:'none',fontSize:12,cursor:'pointer'}}>✕</button>
        </div>
      </div>
    );

    return (
      <div style={{borderRadius:10,border:'2px solid '+couleur+'66',background:'#fff',overflow:'hidden'}}>
        <div onClick={onCocher}
          style={{padding:'14px 16px',cursor:'pointer',display:'flex',alignItems:'center',gap:10,transition:'all 0.15s'}}
          onMouseEnter={e=>e.currentTarget.style.background=couleur+'11'}
          onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
          <div style={{width:24,height:24,borderRadius:6,border:'2px solid '+couleur,background:'#fff',flexShrink:0}}/>
          <div style={{flex:1}}>
            <div style={{fontSize:14,fontWeight:600,color:'#374151'}}>{r.texte}</div>
            {r.ts&&<div style={{fontSize:10,color:'#9ca3af',marginTop:2}}>Prescrit {r.par?'par '+r.par+' ':''}{new Date(r.ts).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</div>}
          </div>
        </div>
        <div style={{borderTop:'1px solid '+couleur+'22',padding:'4px 16px 8px',display:'flex',justifyContent:'flex-end'}}>
          <button onClick={()=>setShowMotif(true)}
            style={{padding:'3px 10px',borderRadius:5,background:'#fef2f2',color:'#ef4444',fontSize:10,fontWeight:600,border:'1px solid #fecaca',cursor:'pointer'}}>
            ✕ Non réalisé
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{display:'flex',gap:12,height:'100%'}}>
      <ColPrescription titre="🔬 Examens complémentaires" couleur="#7c3aed" items={rxAll.filter(r=>r.categorie==='examen')}/>
      <ColPrescription titre="💊 Thérapeutique" couleur="#ea580c" items={rxAll.filter(r=>r.categorie==='therapeutique')}/>
      <ColPrescription titre="🩹 Soins" couleur="#d97706" items={rxAll.filter(r=>r.categorie==='soin')}/>
    </div>
  );
}

function InsulineSelector({ onAjouter }) {
  const [voie, setVoie] = useState('');
  const [ui, setUi] = useState('');
  if (!voie) return (
    <div style={{display:'flex',gap:4}}>
      {['SC','IV'].map(v=>(
        <HBtn key={v} onClick={()=>setVoie(v)}
          style={{padding:'4px 14px',borderRadius:5,fontSize:11,fontWeight:600,background:'#f5f3ff',color:'#7c3aed',border:'1px solid #ddd6fe'}}>
          Insuline {v}
        </HBtn>
      ))}
    </div>
  );
  return (
    <div style={{display:'flex',gap:6,alignItems:'center'}}>
      <span style={{fontSize:11,fontWeight:600,color:'#7c3aed'}}>Insuline {voie}</span>
      <input value={ui} onChange={e=>setUi(e.target.value)} placeholder="nb UI" style={{width:60,padding:'3px 6px',borderRadius:5,border:'1px solid #ddd6fe',fontSize:11,outline:'none'}}/>
      <HBtn onClick={()=>{if(ui){onAjouter(`Insuline ${ui} UI ${voie}`,'therapeutique');setVoie('');setUi('');}}}
        style={{padding:'3px 10px',borderRadius:5,background:'#7c3aed',color:'#fff',border:'none',fontSize:10,fontWeight:600}}>OK</HBtn>
      <HBtn onClick={()=>setVoie('')} style={{padding:'3px 6px',borderRadius:5,background:'#f3f4f6',color:'#6b7280',border:'none',fontSize:10}}>✕</HBtn>
    </div>
  );
}
