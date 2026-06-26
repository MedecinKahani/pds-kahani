'use client';
import { useState, useEffect, useRef } from 'react';

function safeJSON(val, fallback = []) {
  if (!val) return fallback;
  try { return JSON.parse(val); } catch { return fallback; }
}

const EXAMENS = [
  { id:'bhcg',    label:'bHCG urinaire',        color:'#7c3aed' },
  { id:'bu',      label:'BU',                   color:'#7c3aed' },
  { id:'dextro',  label:'Dextro',               color:'#f59e0b' },
  { id:'ecg',     label:'ECG',                  color:'#dc2626' },
  { id:'hemocue', label:'Hémocue',              color:'#dc2626' },
  { id:'tdr_den', label:'TDR Dengue',           color:'#ea580c' },
  { id:'tdr_pal', label:'TDR Paludisme',        color:'#16a34a' },
  { id:'bio_del', label:'Bio délocalisée',      color:'#0891b2', sub:['NFS + CRP','Gaz du sang','Tropo / D-Dimère / BNP','Iono / Créatinine / BHC'] },
  { id:'bio_mam', label:'Prélèvement Mamoudzou',color:'#0284c7', sub:['NFS','CRP','Iono','Créatinine','BHC','Lipase','Sérologie','Bactério','PSA','Bilan anémie','Hémoculture','ECBU'] },
];

// Molécules sécurisées (rouge)
const SECURISEES = ['Tramadol','Morphine','MEOPA','Kétoprofène'];
function isSecurisee(label) { return SECURISEES.some(s => label.includes(s)); }

const THERAPEUTIQUE_ADULTE = [
  { group:'Antalgiques PO', items:['Paracétamol 500mg PO','Paracétamol 1g PO','Ibuprofène 200mg PO','Ibuprofène 400mg PO','Tramadol 50mg PO','Tramadol 100mg PO','Acupan 20mg PO'] },
  { group:'Antalgiques IV/IM', items:['Perfalgan 1g IV','Kétoprofène 100mg IV','Acupan 20mg IV','Titration morphine 0.1mg/kg puis +3mg/5min EN<4','MEOPA'] },
  { group:'Respiratoire', items:['O2 lunettes (Sat>94%)','O2 masque (Sat>94%)','Aérosol Ventoline 2.5mg','Aérosol Ventoline 5mg','Aérosol Atrovent 0.25mg','Aérosol Atrovent 0.5mg'] },
  { group:'Cardiovasculaire', items:['Adrénaline 0.5mg','Adrénaline 1mg','Kardegic 75mg PO','Lasilix 20mg PO','Lasilix 40mg PO','Lasilix 20mg IV','Lasilix 40mg IV','Loxen 10mg PO','Loxen IV','Risordan 1mg IV','Amlodipine 5mg PO'] },
  { group:'Antibiotiques', items:['Amoxicilline 1g PO','Augmentin 1g PO','Azithromycine 500mg PO','Ceftriaxone 1g IM','Ceftriaxone 2g IV','Métronidazole 500mg IV'] },
  { group:'Antiparasitaires', items:['Artéméther-Luméfantrine (Coartem)','Artésunate IV','Albendazole 400mg'] },
  { group:'Autres', items:['Métoclopramide 10mg','Ondansétron 4mg','Oméprazole 20mg','Polaramine 2mg','Solumédrol 40mg IV','Méthylprednisolone __mg/kg IV','Spasfon 80mg'] },
];

const THERAPEUTIQUE_PEDIATRIE = [
  { group:'Antalgiques PO', items:['Paracétamol 15mg/kg/dose PO','Ibuprofène 10mg/kg/dose PO','Tramadol 1-2mg/kg PO'] },
  { group:'Antalgiques IV', items:['Perfalgan 15mg/kg IV','Morphine 0.1mg/kg IV titration'] },
  { group:'Respiratoire', items:['O2 lunettes (Sat>94%)','Aérosol Ventoline 2.5mg','Aérosol Atrovent 0.25mg','MEOPA'] },
  { group:'Antibiotiques', items:['Amoxicilline 50mg/kg/j PO en 3 prises','Augmentin 80mg/kg/j PO','Azithromycine 10mg/kg J1 puis 5mg/kg','Ceftriaxone 50-100mg/kg IV'] },
  { group:'Antiparasitaires', items:['Artéméther-Luméfantrine selon poids','Albendazole 200mg si <10kg / 400mg si >10kg'] },
  { group:'Autres', items:['Métoclopramide 0.1mg/kg','Ondansétron 0.15mg/kg','Paracétamol 15mg/kg/dose suppositoire','Dexaméthasone 0.15mg/kg IV'] },
];

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

export default function FichePatient({ patient, p: pProp, onClose, onUpdate, user }) {
  const p = patient || pProp;
  if (!p) return null;

  const [onglet, setOnglet] = useState('anamnese');
  const [anamnese, setAnamnese] = useState(p.anamnese || '');
  const [exam, setExam] = useState(p.examen_clinique || '');
  const [evolution, setEvolution] = useState(p.evolution || '');
  const [diagnostic, setDiagnostic] = useState(p.diagnostic || '');
  const [ordonnance, setOrdonnance] = useState(p.ordonnance || '');
  const [copied, setCopied] = useState(false);
  const [subOpen, setSubOpen] = useState({});
  const [collapsed, setCollapsed] = useState({examens:false, therapeutique:false, soins:false});
  const [therapieTab, setTherapieTab] = useState('adulte');
  const [nouvConst, setNouvConst] = useState({ type:'', val:'' });
  const [constPost, setConstPost] = useState(safeJSON(p.constantes_post, []));
  const [prescriptions, setPrescriptions] = useState(safeJSON(p.prescriptions, []));

  const pam = p.tas && p.tad ? Math.round(parseFloat(p.tad) + (parseFloat(p.tas) - parseFloat(p.tad)) / 3) : null;

  async function save(patch) {
    await fetch('/api/patients', { method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ action:'update', id:p.id, patch }) });
    onUpdate?.();
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
            <button onClick={onClose} style={{ background:'#f3f4f6', border:'none', width:28, height:28, borderRadius:'50%', cursor:'pointer', fontSize:16, color:'#6b7280', display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
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
            <div style={{borderRadius:8,padding:'6px 10px',border:'1.5px dashed #e5e7eb',display:'flex',flexDirection:'column',justifyContent:'center',gap:4}}>
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
          {/* Résultats examens */}
          {(p.tdr_palu||p.tdr_dengue||p.bu_resultat||p.bhcg_resultat||constPost.length>0)&&(
            <div style={{display:'flex',gap:4,flexWrap:'wrap',marginTop:6}}>
              {p.tdr_palu&&<span style={{fontSize:10,fontWeight:600,padding:'2px 7px',borderRadius:99,background:p.tdr_palu==='Positif'?'#fef2f2':'#f0fdf4',color:p.tdr_palu==='Positif'?'#ef4444':'#16a34a'}}>Palu {p.tdr_palu}</span>}
              {p.tdr_dengue&&<span style={{fontSize:10,fontWeight:600,padding:'2px 7px',borderRadius:99,background:p.tdr_dengue==='Positif'?'#fef2f2':'#f0fdf4',color:p.tdr_dengue==='Positif'?'#ef4444':'#16a34a'}}>Dengue {p.tdr_dengue}</span>}
              {p.bu_resultat&&<span style={{fontSize:10,fontWeight:600,padding:'2px 7px',borderRadius:99,background:'#eff6ff',color:'#3b82f6'}}>BU {p.bu_resultat}</span>}
              {p.bhcg_resultat&&<span style={{fontSize:10,fontWeight:600,padding:'2px 7px',borderRadius:99,background:p.bhcg_resultat==='Positif'?'#fef2f2':'#f0fdf4',color:p.bhcg_resultat==='Positif'?'#ef4444':'#16a34a'}}>bHCG {p.bhcg_resultat}</span>}
              {constPost.map((c,i)=><span key={i} style={{fontSize:10,fontWeight:600,color:'#374151',background:'#f3f4f6',padding:'2px 7px',borderRadius:99}}>{c.label} {c.val}</span>)}
            </div>
          )}
        </div>

        {/* ONGLETS */}
        <div style={{display:'flex',borderBottom:'1px solid #e5e7eb',background:'#f9fafb',flexShrink:0}}>
          {[{id:'anamnese',l:'Anamnèse'},{id:'examen',l:'Examen'},{id:'prescription',l:'Prescriptions'},{id:'evolution',l:'Évolution & sortie'}].map(t=>(
            <button key={t.id} onClick={()=>setOnglet(t.id)}
              style={{padding:'9px 14px',border:'none',background:'none',cursor:'pointer',fontSize:12,fontWeight:onglet===t.id?700:500,
                color:onglet===t.id?'#0d9488':'#6b7280',
                borderBottom:onglet===t.id?'2px solid #0d9488':'2px solid transparent'}}>
              {t.l}
            </button>
          ))}
        </div>

        {/* CONTENU */}
        <div style={{flex:1,overflow:'hidden',padding:14,display:'flex',flexDirection:'column'}}>

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
            <div style={{display:'flex',flexDirection:'column',gap:12}}>

              {/* EXAMENS */}
              <div style={{border:'1.5px solid #7c3aed33',borderRadius:10,overflow:'hidden'}}>
                <div style={{background:'#7c3aed18',padding:'8px 12px',display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'pointer'}}
                  onClick={()=>setCollapsed(c=>({...c,examens:!c.examens}))}>
                  <span style={{fontWeight:700,color:'#7c3aed',fontSize:13}}>🔬 Examens complémentaires</span>
                  <span style={{color:'#7c3aed',fontSize:14}}>{collapsed.examens?'▶':'▼'}</span>
                </div>
                {!collapsed.examens&&<div style={{padding:'10px 12px',display:'flex',flexWrap:'wrap',gap:6}}>
                  {EXAMENS.map(e=>{
                    const deja=prescriptions.find(r=>!r.fait&&r.texte===e.label);
                    if(deja) return null;
                    if(e.sub) return (
                      <div key={e.id} style={{position:'relative'}}>
                        <HBtn onClick={()=>setSubOpen(s=>({...s,[e.id]:!s[e.id]}))}
                          style={{padding:'5px 10px',borderRadius:6,background:e.color+'18',color:e.color,border:'1.5px solid '+e.color+'66',fontSize:11,fontWeight:600}}>
                          {e.label} {subOpen[e.id]?'▲':'▼'}
                        </HBtn>
                        {subOpen[e.id]&&<div style={{position:'fixed',zIndex:500,background:'#fff',border:'1.5px solid '+e.color+'66',borderRadius:10,padding:10,boxShadow:'0 8px 24px rgba(0,0,0,0.15)',minWidth:220,maxHeight:300,overflowY:'auto'}}>
                          {e.sub.map(s=>{
                            const deja2=prescriptions.find(r=>!r.fait&&r.texte===e.label+' : '+s);
                            if(deja2) return null;
                            return <div key={s} style={{padding:'4px 8px',borderRadius:5,cursor:'pointer',fontSize:11,color:e.color,fontWeight:600}}
                              onMouseEnter={ev=>ev.currentTarget.style.background=e.color+'18'}
                              onMouseLeave={ev=>ev.currentTarget.style.background='transparent'}
                              onClick={()=>{ajouterPrescription(e.label+' : '+s,'examen');setSubOpen(so=>({...so,[e.id]:false}));}}>
                              {s}
                            </div>;
                          })}
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
                  {/* Sous-onglets Adulte / Pédiatrie */}
                  <div style={{display:'flex',gap:6,marginBottom:10}}>
                    {['adulte','pediatrie'].map(t=>(
                      <button key={t} onClick={()=>setTherapieTab(t)}
                        style={{padding:'4px 12px',borderRadius:6,fontSize:11,fontWeight:600,cursor:'pointer',border:'1.5px solid '+(therapieTab===t?'#ea580c':'#e5e7eb'),background:therapieTab===t?'#ea580c':'#fff',color:therapieTab===t?'#fff':'#6b7280'}}>
                        {t==='adulte'?'Adulte':'Pédiatrie'}
                      </button>
                    ))}
                  </div>
                  {(therapieTab==='adulte'?THERAPEUTIQUE_ADULTE:THERAPEUTIQUE_PEDIATRIE).map(grp=>(
                    <div key={grp.group} style={{marginBottom:10}}>
                      <div style={{fontSize:10,fontWeight:700,color:'#9a3412',marginBottom:5,textTransform:'uppercase',letterSpacing:0.5}}>{grp.group}</div>
                      <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
                        {grp.items.map(item=>{
                          const deja=prescriptions.find(r=>!r.fait&&r.texte.startsWith(item.split('__')[0]));
                          if(deja) return null;
                          const rouge=isSecurisee(item);
                          return <HBtn key={item} onClick={()=>ajouterPrescription(item,'therapeutique')}
                            style={{padding:'5px 10px',borderRadius:6,fontSize:11,fontWeight:600,
                              background:rouge?'#fef2f2':'#fff7ed',
                              color:rouge?'#dc2626':'#9a3412',
                              border:'1.5px solid '+(rouge?'#fecaca':'#fed7aa')}}>
                            {item}
                          </HBtn>;
                        })}
                      </div>
                    </div>
                  ))}
                  <AutreLibre categorie="therapeutique" onAjouter={ajouterPrescription}/>

                  {/* Hydratation interactive */}
                  <div style={{marginTop:10,padding:10,background:'#f0f9ff',borderRadius:8,border:'1px solid #bae6fd'}}>
                    <div style={{fontSize:10,fontWeight:700,color:'#0369a1',marginBottom:6,textTransform:'uppercase'}}>Hydratation</div>
                    <HydratationSelector onAjouter={ajouterPrescription}/>
                    <div style={{marginTop:6}}>
                      <div style={{fontSize:10,fontWeight:700,color:'#7c3aed',marginBottom:4}}>Potassium</div>
                      {[['1g','250mL','1h'],['2g','500mL','2h'],['3g','750mL','3h (scopé + GDS contrôle)']].map(([g,v,d])=>{
                        const label=`Potassium ${g} / ${v} / ${d} min`;
                        const deja=prescriptions.find(r=>!r.fait&&r.texte===label);
                        if(deja) return null;
                        return <HBtn key={g} onClick={()=>ajouterPrescription(label,'therapeutique')}
                          style={{padding:'4px 10px',borderRadius:5,fontSize:10,fontWeight:600,background:'#f5f3ff',color:'#7c3aed',border:'1px solid #ddd6fe',marginRight:5,marginBottom:4}}>
                          K+ {g}
                        </HBtn>;
                      })}
                    </div>
                  </div>

                  {/* Insuline interactive */}
                  <div style={{marginTop:8,padding:10,background:'#fdf4ff',borderRadius:8,border:'1px solid #e9d5ff'}}>
                    <div style={{fontSize:10,fontWeight:700,color:'#7c3aed',marginBottom:6,textTransform:'uppercase'}}>Insuline</div>
                    <InsulineSelector onAjouter={ajouterPrescription}/>
                  </div>
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
                </div>}
              </div>
            </div>
          )}

          {onglet==='evolution'&&(
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
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
        </div>
      </div>

      {/* COLONNE DROITE */}
      <div style={{width:240,borderLeft:'1px solid #e5e7eb',background:'#fafafa',display:'flex',flexDirection:'column',overflow:'hidden',flexShrink:0}}>
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
                <div style={{flex:1,fontSize:11,color:'#374151',lineHeight:1.3}}>{r.texte}</div>
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
              <div key={i} style={{background:'#f3f4f6',borderRadius:7,padding:'5px 8px',marginBottom:3,display:'flex',gap:5,alignItems:'center',opacity:0.55}}>
                <span style={{fontSize:10}}>{r.categorie==='examen'?'🔬':r.categorie==='therapeutique'?'💊':'🩹'}</span>
                <div style={{flex:1,fontSize:10,color:'#6b7280',textDecoration:'line-through'}}>{r.texte}</div>
                <span style={{fontSize:10,color:'#16a34a',fontWeight:700}}>✓</span>
              </div>
            ))}
          </>}
        </div>
      </div>
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
