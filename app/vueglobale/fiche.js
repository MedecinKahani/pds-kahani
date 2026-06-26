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

const THERAPEUTIQUE = [
  { group:'Antalgiques PO', color:'#0d9488', items:['Paracétamol 500mg PO','Paracétamol 1g PO','Ibuprofène 200mg PO','Ibuprofène 400mg PO','Tramadol 50mg PO','Tramadol 100mg PO','Acupan 20mg PO'] },
  { group:'Antalgiques IV/IM', color:'#0891b2', items:['Perfalgan 1g IV','Kétoprofène 100mg IV','Acupan 20mg IV','Titration morphine 0.1mg/kg puis +3mg/5min EN<4','MEOPA'] },
  { group:'Respiratoire', color:'#3b82f6', items:['O2 lunettes (Sat>94%)','O2 masque (Sat>94%)','Aérosol Ventoline 2.5mg','Aérosol Ventoline 5mg','Aérosol Atrovent 0.25mg','Aérosol Atrovent 0.5mg'] },
  { group:'Cardiovasculaire', color:'#dc2626', items:['Adrénaline 0.5mg','Adrénaline 1mg','Kardegic 75mg PO','Lasilix 20mg PO','Lasilix 40mg PO','Lasilix 20mg IV','Lasilix 40mg IV','Loxen 10mg PO','Loxen IV','Risordan 1mg IV','Amlodipine 5mg PO'] },
  { group:'Hydratation', color:'#0891b2', items:['NaCl 0.9% 500mL','NaCl 0.9% 1L','G5% 500mL','Ringer Lactate 500mL','Potassium 1g / 250mL / 1h min','Potassium 2g / 500mL / 2h min','Potassium 3g / 750mL / 3h min (scopé + GDS contrôle)'] },
  { group:'Insuline', color:'#7c3aed', items:['Insuline __UI SC','Insuline __UI IV'] },
  { group:'Antibiotiques', color:'#16a34a', items:['Amoxicilline 1g PO','Augmentin 1g PO','Azithromycine 500mg PO','Ceftriaxone 1g IM','Ceftriaxone 2g IV','Métronidazole 500mg IV'] },
  { group:'Antiparasitaires', color:'#65a30d', items:['Artéméther-Luméfantrine (Coartem)','Artésunate IV','Albendazole 400mg'] },
  { group:'Autres', color:'#6b7280', items:['Métoclopramide 10mg','Ondansétron 4mg','Oméprazole 20mg','Polaramine 2mg','Solumédrol 40mg IV','Méthylprednisolone __mg/kg IV','Spasfon 80mg'] },
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
const EXAMEN_NORMAL = "Examen clinique sans anomalie. Neurologique : Glasgow 15, pas de déficit sensitivo-moteur. Cardio-vasculaire : bruits du coeur réguliers, pouls périphériques perçus, pas d'oedème. Pulmonaire : eupnéique, murmures vésiculaires présents et symétriques. Abdominal : abdomen souple dépressible indolore.";

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

          {/* Constantes style vignette */}
          <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
            {[
              {k:'fc',    v:p.fc,    l:'FC',  u:'bpm' },
              {k:'tas',   v:p.tas,   l:'PAS', u:'mmHg'},
              {k:'tad',   v:p.tad,   l:'PAD', u:'mmHg'},
              {k:'pam',   v:pam,     l:'PAM', u:'mmHg', fixed: pam?(pam<65?'#ef4444':'#16a34a'):'#9ca3af'},
              {k:'sat',   v:p.sat,   l:'Sat', u:'%'   },
              {k:'temp',  v:p.temp,  l:'T°',  u:'°C'  },
              {k:'dextro',v:p.dextro,l:'Dex', u:'g/L' },
              {k:'hemocue',v:p.hemocue,l:'Hb',u:'g/dL'},
            ].filter(x=>x.v).map(({k,v,l,u,fixed})=>{
              const c = fixed || colConst(v,k);
              return <span key={k} style={{ fontSize:11, fontWeight:600, color:c, background:c+'18', padding:'2px 8px', borderRadius:4 }}>{l} {v} <span style={{fontSize:9,fontWeight:400}}>{u}</span></span>;
            })}
            {p.tdr_palu&&<span style={{fontSize:11,fontWeight:600,padding:'2px 8px',borderRadius:4,background:p.tdr_palu==='Positif'?'#fef2f2':'#f0fdf4',color:p.tdr_palu==='Positif'?'#ef4444':'#16a34a'}}>Palu {p.tdr_palu}</span>}
            {p.tdr_dengue&&<span style={{fontSize:11,fontWeight:600,padding:'2px 8px',borderRadius:4,background:p.tdr_dengue==='Positif'?'#fef2f2':'#f0fdf4',color:p.tdr_dengue==='Positif'?'#ef4444':'#16a34a'}}>Dengue {p.tdr_dengue}</span>}
            {p.bu_resultat&&<span style={{fontSize:11,fontWeight:600,padding:'2px 8px',borderRadius:4,background:'#eff6ff',color:'#3b82f6'}}>BU {p.bu_resultat}</span>}
            {p.bhcg_resultat&&<span style={{fontSize:11,fontWeight:600,padding:'2px 8px',borderRadius:4,background:p.bhcg_resultat==='Positif'?'#fef2f2':'#f0fdf4',color:p.bhcg_resultat==='Positif'?'#ef4444':'#16a34a'}}>bHCG {p.bhcg_resultat}</span>}
            {constPost.map((c,i)=><span key={i} style={{fontSize:11,fontWeight:600,color:'#374151',background:'#f3f4f6',padding:'2px 8px',borderRadius:4}}>{c.label} {c.val}</span>)}

            {/* Ajouter constante */}
            <select value={nouvConst.type} onChange={e=>setNouvConst(n=>({...n,type:e.target.value}))}
              style={{fontSize:11,border:'1px solid #e5e7eb',borderRadius:5,padding:'2px 6px',background:'#fff',color:'#6b7280'}}>
              <option value="">+ Constante</option>
              {['Dextro g/L','Hémocue g/dL','TDR Palu','TDR Dengue','FC bpm','Sat %','T° °C','PAS mmHg'].map(x=><option key={x} value={x}>{x}</option>)}
            </select>
            {nouvConst.type&&<>
              <input value={nouvConst.val} onChange={e=>setNouvConst(n=>({...n,val:e.target.value}))}
                style={{width:60,fontSize:11,border:'1px solid #e5e7eb',borderRadius:5,padding:'2px 6px',outline:'none'}} placeholder="valeur" autoFocus/>
              <HBtn onClick={()=>{
                if(!nouvConst.val) return;
                const c=[...constPost,{label:nouvConst.type,val:nouvConst.val,ts:Date.now()}];
                setConstPost(c); save({constantes_post:JSON.stringify(c)}); setNouvConst({type:'',val:''});
              }} style={{fontSize:11,padding:'2px 8px',borderRadius:5,background:'#0d9488',color:'#fff',border:'none'}}>OK</HBtn>
              <HBtn onClick={()=>setNouvConst({type:'',val:''})} style={{fontSize:11,padding:'2px 6px',borderRadius:5,background:'#f3f4f6',color:'#6b7280',border:'none'}}>✕</HBtn>
            </>}
          </div>
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
        <div style={{flex:1,overflow:'auto',padding:14}}>

          {onglet==='anamnese'&&(
            <textarea value={anamnese} onChange={e=>{setAnamnese(e.target.value);debouncedSave({anamnese:e.target.value});}} rows={14}
              placeholder="Motif de consultation, histoire de la maladie, antécédents, traitements habituels..."
              style={{...inp,height:'100%',minHeight:300}}/>
          )}

          {onglet==='examen'&&(
            <div>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10,padding:'10px 12px',background:'#f0fdf4',borderRadius:8,border:'1px solid #bbf7d0',cursor:'pointer'}}
                onClick={()=>{const v=exam===EXAMEN_NORMAL?'':EXAMEN_NORMAL;setExam(v);debouncedSave({examen_clinique:v});}}>
                <div style={{width:20,height:20,borderRadius:5,border:'2px solid '+(exam===EXAMEN_NORMAL?'#16a34a':'#d1d5db'),background:exam===EXAMEN_NORMAL?'#16a34a':'#fff',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  {exam===EXAMEN_NORMAL&&<span style={{color:'#fff',fontSize:12,fontWeight:700}}>✓</span>}
                </div>
                <span style={{fontSize:13,fontWeight:600,color:'#16a34a'}}>Examen clinique normal</span>
              </div>
              <textarea value={exam} onChange={e=>{setExam(e.target.value);debouncedSave({examen_clinique:e.target.value});}} rows={12}
                placeholder="Décrivez l'examen clinique..." style={{...inp,minHeight:280}}/>
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
                        {subOpen[e.id]&&<div style={{position:'absolute',top:'100%',left:0,zIndex:10,background:'#fff',border:'1px solid '+e.color+'44',borderRadius:8,padding:8,boxShadow:'0 4px 12px rgba(0,0,0,0.1)',minWidth:200}}>
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
              <div style={{border:'1.5px solid #0d948833',borderRadius:10,overflow:'hidden'}}>
                <div style={{background:'#0d948818',padding:'8px 12px',display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'pointer'}}
                  onClick={()=>setCollapsed(c=>({...c,therapeutique:!c.therapeutique}))}>
                  <span style={{fontWeight:700,color:'#0d9488',fontSize:13}}>💊 Thérapeutique</span>
                  <span style={{color:'#0d9488',fontSize:14}}>{collapsed.therapeutique?'▶':'▼'}</span>
                </div>
                {!collapsed.therapeutique&&<div style={{padding:'10px 12px'}}>
                  {THERAPEUTIQUE.map(grp=>(
                    <div key={grp.group} style={{marginBottom:10}}>
                      <div style={{fontSize:10,fontWeight:700,color:grp.color,marginBottom:5,textTransform:'uppercase',letterSpacing:0.5}}>{grp.group}</div>
                      <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
                        {grp.items.map(item=>{
                          const deja=prescriptions.find(r=>!r.fait&&r.texte===item);
                          if(deja) return null;
                          return <HBtn key={item} onClick={()=>ajouterPrescription(item,'therapeutique')}
                            style={{padding:'5px 10px',borderRadius:6,background:grp.color+'15',color:grp.color,border:'1.5px solid '+grp.color+'55',fontSize:11,fontWeight:600}}>
                            {item}
                          </HBtn>;
                        })}
                      </div>
                    </div>
                  ))}
                  <AutreLibre categorie="therapeutique" onAjouter={ajouterPrescription}/>
                </div>}
              </div>

              {/* SOINS */}
              <div style={{border:'1.5px solid #f59e0b33',borderRadius:10,overflow:'hidden'}}>
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
                <textarea value={evolution} onChange={e=>{setEvolution(e.target.value);debouncedSave({evolution:e.target.value});}} rows={4} style={inp} placeholder="Évolution clinique..."/>
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
              <div key={i} style={{background:'#fff',border:'1.5px solid '+bc+'55',borderRadius:8,padding:'7px 10px',marginBottom:5,display:'flex',alignItems:'flex-start',gap:6}}>
                <span style={{fontSize:11,flexShrink:0}}>{r.categorie==='examen'?'🔬':r.categorie==='therapeutique'?'💊':'🩹'}</span>
                <div style={{flex:1,fontSize:11,color:'#374151',lineHeight:1.3}}>{r.texte}</div>
                <HBtn onClick={()=>cocherFait(globalIdx)}
                  style={{flexShrink:0,width:22,height:22,borderRadius:5,border:'1.5px solid #16a34a',background:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,color:'#16a34a',padding:0}}>
                  ✓
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
