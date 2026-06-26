'use client';
import { useState, useCallback } from 'react';

function safeJSON(val, fallback = []) {
  if (!val) return fallback;
  try { return JSON.parse(val); } catch { return fallback; }
}

const EXAMENS = [
  { id:'bhcg',    label:'bHCG urinaire',   color:'#7c3aed' },
  { id:'bio_del', label:'Bio délocalisée',  color:'#0891b2', sub:['NFS + CRP','Gaz du sang','Tropo / D-Dimère / BNP','Iono / Créatinine / BHC'] },
  { id:'bio_mam', label:'Prélèvement Mamoudzou', color:'#0284c7', sub:['NFS','CRP','Iono','Créatinine','BHC','Lipase','Sérologie','Bactério','PSA','Bilan anémie','Hémoculture','ECBU'] },
  { id:'bu',      label:'BU',              color:'#7c3aed' },
  { id:'dextro',  label:'Dextro',          color:'#f59e0b' },
  { id:'ecg',     label:'ECG',             color:'#dc2626' },
  { id:'hemocue', label:'Hémocue',         color:'#dc2626' },
  { id:'tdr_den', label:'TDR Dengue',      color:'#ea580c' },
  { id:'tdr_pal', label:'TDR Paludisme',   color:'#16a34a' },
];

const THERAPEUTIQUE = [
  { group:'Antalgiques PO', color:'#0d9488', items:[
    'Paracétamol 500mg PO','Paracétamol 1g PO',
    'Ibuprofène 200mg PO','Ibuprofène 400mg PO',
    'Tramadol 50mg PO','Tramadol 100mg PO',
    'Acupan 20mg PO',
  ]},
  { group:'Antalgiques IV/IM', color:'#0891b2', items:[
    'Perfalgan 1g IV','Kétoprofène 100mg IV',
    'Acupan 20mg IV',
    'Titration morphine 0.1mg/kg puis +3mg/5min jusqu\'à EN<4 (Naloxone prêt)',
    'MEOPA',
  ]},
  { group:'Respiratoire', color:'#3b82f6', items:[
    'O2 lunettes (objectif Sat>94%)','O2 masque (objectif Sat>94%)',
    'Aérosol Ventoline 2.5mg','Aérosol Ventoline 5mg',
    'Aérosol Atrovent 0.25mg','Aérosol Atrovent 0.5mg',
  ]},
  { group:'Cardiovasculaire', color:'#dc2626', items:[
    'Adrénaline 0.5mg','Adrénaline 1mg',
    'Kardegic 75mg PO',
    'Lasilix 20mg PO','Lasilix 40mg PO',
    'Lasilix 20mg IV','Lasilix 40mg IV',
    'Loxen 10mg PO','Loxen IV',
    'Risordan 1mg IV',
    'Amlodipine 5mg PO',
  ]},
  { group:'Hydratation', color:'#0891b2', items:[
    'NaCl 0.9% 500mL','NaCl 0.9% 1L',
    'G5% 500mL','Ringer Lactate 500mL',
    'Potassium 1g dans 250mL sur 1h minimum',
    'Potassium 2g dans 500mL sur 2h minimum',
    'Potassium 3g dans 750mL sur 3h minimum (scopé + GDS de contrôle)',
  ]},
  { group:'Insuline', color:'#7c3aed', items:[
    'Insuline __UI SC','Insuline __UI IV',
  ]},
  { group:'Antibiotiques', color:'#16a34a', items:[
    'Amoxicilline 1g PO','Augmentin 1g PO',
    'Azithromycine 500mg PO',
    'Ceftriaxone 1g IM','Ceftriaxone 2g IV',
    'Métronidazole 500mg IV',
  ]},
  { group:'Antiparasitaires', color:'#65a30d', items:[
    'Artéméther-Luméfantrine (Coartem)','Artésunate IV','Albendazole 400mg',
  ]},
  { group:'Autres', color:'#6b7280', items:[
    'Antiémétique : Métoclopramide 10mg','Antiémétique : Ondansétron 4mg',
    'Oméprazole 20mg','Polaramine 2mg',
    'Solumédrol 40mg IV','Méthylprednisolone __mg/kg IV',
    'Spasfon 80mg',
  ]},
];

const SOINS = [
  { id:'allonger',   label:'Allonger',               color:'#0891b2' },
  { id:'demi_assis', label:'Demi-assis',              color:'#0891b2' },
  { id:'assis',      label:'Assis strict',            color:'#0891b2' },
  { id:'scoper',     label:'Scoper',                  color:'#dc2626' },
  { id:'vvp1',       label:'VVP n°1',                color:'#7c3aed' },
  { id:'vvp2',       label:'VVP n°2',                color:'#7c3aed' },
  { id:'plaie',      label:'Lavage + pansement plaie',color:'#f59e0b' },
  { id:'drp',        label:'DRP',                    color:'#3b82f6' },
  { id:'spu',        label:'Sonde urinaire',          color:'#6b7280' },
  { id:'sng',        label:'Sonde nasogastrique',     color:'#6b7280' },
  { id:'glyc_ctrl',  label:'Glycémie capillaire contrôle', color:'#f59e0b' },
  { id:'rechauffe',  label:'Réchauffement',           color:'#ea580c' },
  { id:'oxymetre',   label:'Oxymétrie de pouls',      color:'#dc2626' },
];

function HBtn({ onClick, style, children, title }) {
  return (
    <button onClick={onClick} title={title}
      onMouseEnter={e => e.currentTarget.style.filter = 'brightness(0.88)'}
      onMouseLeave={e => e.currentTarget.style.filter = 'none'}
      style={{ ...style, transition: 'filter 0.1s', cursor: 'pointer' }}>
      {children}
    </button>
  );
}

const lbl = { fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 4 };
const inp = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'system-ui', background: '#fff' };

const EXAMEN_NORMAL = "Examen clinique sans anomalie. Neurologique : Glasgow 15, pas de déficit sensitivo-moteur. Cardio-vasculaire : bruits du coeur réguliers, pouls périphériques perçus, pas d'oedème. Pulmonaire : eupnéique, murmures vésiculaires présents et symétriques. Abdominal : abdomen souple dépressible indolore.";

export default function FichePatient({ p, onClose, onUpdate, user }) {
  const [onglet, setOnglet] = useState('anamnese');
  const [anamnese, setAnamnese] = useState(p?.anamnese || '');
  const [exam, setExam] = useState(p?.examen_clinique || '');
  const [evolution, setEvolution] = useState(p?.evolution || '');
  const [diagnostic, setDiagnostic] = useState(p?.diagnostic || '');
  const [ordonnance, setOrdonnance] = useState(p?.ordonnance || '');
  const [copied, setCopied] = useState(false);
  const [subOpen, setSubOpen] = useState({});
  const [nouvConst, setNouvConst] = useState({ type:'', val:'' });
  const [constPost, setConstPost] = useState(safeJSON(p?.constantes_post, []));

  const prescriptions = safeJSON(p?.prescriptions, []);

  const pam = p?.tas && p?.tad ? Math.round(parseFloat(p.tad) + (parseFloat(p.tas) - parseFloat(p.tad)) / 3) : null;

  async function save(patch) {
    await fetch('/api/patients', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update', id: p.id, patch }) });
    onUpdate?.();
  }

  async function ajouterPrescription(texte, categorie) {
    const rx = [...prescriptions, { texte, categorie, fait: false, ts: Date.now(), par: user?.matricule || '' }];
    await save({ prescriptions: JSON.stringify(rx) });
  }

  async function cocherFait(idx) {
    const rx = [...prescriptions];
    rx[idx] = { ...rx[idx], fait: true, faitPar: user?.matricule, faitA: Date.now() };
    await save({ prescriptions: JSON.stringify(rx) });
  }

  function resume() {
    const rx = prescriptions.map(r => `- [${r.fait ? 'FAIT' : 'EN ATTENTE'}] ${r.texte}`).join('\n');
    return `=== RESUME PDS KAHANI ===
Patient : ${p.nom} ${p.prenom} — ${p.age} ans — ${p.sexe === 'M' ? 'Homme' : 'Femme'}
DDN : ${p.ddn || '--'} | IPP : ${p.ipp || '--'}
Arrivée : ${p.arrivee ? new Date(parseInt(p.arrivee)).toLocaleString('fr-FR') : '--'}

MOTIF : ${p.symptome || '--'}${p.symptome_autre ? ' — ' + p.symptome_autre : ''}

CONSTANTES :
FC ${p.fc || '--'} bpm | PAS ${p.tas || '--'} / PAD ${p.tad || '--'} mmHg | PAM ${pam || '--'} mmHg
Sat ${p.sat || '--'} % | T° ${p.temp || '--'} °C | Dextro ${p.dextro || '--'} | Hémocue ${p.hemocue || '--'}
${p.tdr_palu ? 'TDR Palu : ' + p.tdr_palu : ''}${p.tdr_dengue ? ' | TDR Dengue : ' + p.tdr_dengue : ''}
${p.bu_resultat ? 'BU : ' + p.bu_resultat : ''}${p.bhcg_resultat ? ' | bHCG : ' + p.bhcg_resultat : ''}

ANAMNESE :
${anamnese || '--'}

EXAMEN CLINIQUE :
${exam || '--'}

PRESCRIPTIONS :
${rx || 'Aucune'}

EVOLUTION :
${evolution || '--'}

DIAGNOSTIC :
${diagnostic || '--'}

ORDONNANCE DE SORTIE :
${ordonnance || '--'}
`;
  }

  const enAttente = prescriptions.filter(r => !r.fait);
  const realises = prescriptions.filter(r => r.fait);

  const colConst = (v, k) => {
    const NORM = { fc:[50,100], tas:[90,150], tad:[60,95], sat:[94,100], temp:[36,38.4], dextro:[0.7,2.5], hemocue:[8,18] };
    const n = parseFloat(v); if (isNaN(n)) return '#9ca3af';
    const [mn, mx] = NORM[k] || [0,9999];
    return n < mn || n > mx ? '#ef4444' : '#16a34a';
  };

  return (
    <div style={{ display:'flex', height:'100%', fontFamily:'system-ui', fontSize:13 }}>

      {/* COLONNE GAUCHE */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>

        {/* BANDEAU IDENTITE */}
        <div style={{ background:'#fff', borderBottom:'1px solid #e5e7eb', padding:'10px 16px', flexShrink:0 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
            <div>
              <div style={{ fontWeight:700, fontSize:16, color:'#111827' }}>{p.nom} {p.prenom}
                <span style={{ marginLeft:8, fontSize:13, fontWeight:400, color:'#6b7280' }}>{p.age} ans · {p.sexe==='M'?'♂':'♀'}</span>
              </div>
              <div style={{ fontSize:11, color:'#9ca3af', marginTop:2 }}>
                {p.ddn && <span>{p.ddn} · </span>}
                {p.ipp && <span>IPP : {p.ipp}</span>}
                <span style={{ marginLeft:8, fontWeight:600, color:'#0d9488' }}>{p.symptome?.replace('_',' ')}</span>
              </div>
            </div>
            <button onClick={onClose} style={{ background:'none', border:'none', fontSize:20, color:'#9ca3af', cursor:'pointer', padding:'0 4px' }}>×</button>
          </div>

          {/* Constantes ligne 1 */}
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:8 }}>
            {[
              { k:'fc',     v:p.fc,     l:'FC',   u:'bpm'  },
              { k:'tas',    v:p.tas,    l:'PAS',  u:'mmHg' },
              { k:'tad',    v:p.tad,    l:'PAD',  u:'mmHg' },
              { k:'pam',    v:pam,      l:'PAM',  u:'mmHg', c: pam ? (pam<65?'#ef4444':'#16a34a') : '#9ca3af' },
              { k:'sat',    v:p.sat,    l:'Sat',  u:'%'    },
              { k:'temp',   v:p.temp,   l:'T°',   u:'°C'   },
              { k:'dextro', v:p.dextro, l:'Dex',  u:'g/L'  },
              { k:'hemocue',v:p.hemocue,l:'Hb',   u:'g/dL' },
            ].filter(x => x.v).map(({ k, v, l, u, c }) => (
              <span key={k} style={{ fontSize:11, fontWeight:600, color: c || colConst(v, k), background: (c || colConst(v, k)) + '18', padding:'2px 7px', borderRadius:4 }}>
                {l} {v} <span style={{ fontWeight:400, fontSize:9 }}>{u}</span>
              </span>
            ))}
            {/* Résultats examens */}
            {p.tdr_palu && <span style={{ fontSize:11, fontWeight:600, padding:'2px 7px', borderRadius:4, background: p.tdr_palu==='Positif'?'#fef2f2':'#f0fdf4', color: p.tdr_palu==='Positif'?'#ef4444':'#16a34a' }}>Palu {p.tdr_palu}</span>}
            {p.tdr_dengue && <span style={{ fontSize:11, fontWeight:600, padding:'2px 7px', borderRadius:4, background: p.tdr_dengue==='Positif'?'#fef2f2':'#f0fdf4', color: p.tdr_dengue==='Positif'?'#ef4444':'#16a34a' }}>Dengue {p.tdr_dengue}</span>}
            {p.bu_resultat && <span style={{ fontSize:11, fontWeight:600, padding:'2px 7px', borderRadius:4, background:'#eff6ff', color:'#3b82f6' }}>BU: {p.bu_resultat}</span>}
            {p.bhcg_resultat && <span style={{ fontSize:11, fontWeight:600, padding:'2px 7px', borderRadius:4, background: p.bhcg_resultat==='Positif'?'#fef2f2':'#f0fdf4', color: p.bhcg_resultat==='Positif'?'#ef4444':'#16a34a' }}>bHCG {p.bhcg_resultat}</span>}
          </div>

          {/* Ligne 2 : nouvelles constantes */}
          <div style={{ display:'flex', gap:6, alignItems:'center', marginTop:8, flexWrap:'wrap' }}>
            {constPost.map((c, i) => (
              <span key={i} style={{ fontSize:11, fontWeight:600, color:'#374151', background:'#f3f4f6', padding:'2px 7px', borderRadius:4 }}>
                {c.label} {c.val}
              </span>
            ))}
            <select value={nouvConst.type} onChange={e => setNouvConst(n => ({ ...n, type: e.target.value }))}
              style={{ fontSize:11, border:'1px solid #e5e7eb', borderRadius:5, padding:'2px 6px', background:'#fff' }}>
              <option value="">+ Constante</option>
              {['Dextro g/L','Hémocue g/dL','TDR Palu','TDR Dengue','FC bpm','Sat %','T° °C','PAS mmHg'].map(x => <option key={x} value={x}>{x}</option>)}
            </select>
            {nouvConst.type && (
              <>
                <input value={nouvConst.val} onChange={e => setNouvConst(n => ({ ...n, val: e.target.value }))}
                  style={{ width:70, fontSize:11, border:'1px solid #e5e7eb', borderRadius:5, padding:'2px 6px' }} placeholder="valeur"/>
                <HBtn onClick={() => {
                  if (!nouvConst.val) return;
                  const c = [...constPost, { label: nouvConst.type, val: nouvConst.val, ts: Date.now() }];
                  setConstPost(c);
                  save({ constantes_post: JSON.stringify(c) });
                  setNouvConst({ type: '', val: '' });
                }} style={{ fontSize:11, padding:'2px 10px', borderRadius:5, background:'#0d9488', color:'#fff', border:'none' }}>
                  Ajouter
                </HBtn>
              </>
            )}
          </div>
        </div>

        {/* ONGLETS */}
        <div style={{ display:'flex', borderBottom:'1px solid #e5e7eb', background:'#f9fafb', flexShrink:0 }}>
          {[
            { id:'anamnese',     l:'Anamnèse' },
            { id:'examen',       l:'Examen clinique' },
            { id:'prescription', l:'Prescriptions' },
            { id:'evolution',    l:'Évolution & sortie' },
          ].map(t => (
            <button key={t.id} onClick={() => setOnglet(t.id)}
              style={{ padding:'10px 16px', border:'none', background:'none', cursor:'pointer', fontSize:12, fontWeight:onglet===t.id?700:500,
                color: onglet===t.id?'#0d9488':'#6b7280',
                borderBottom: onglet===t.id?'2px solid #0d9488':'2px solid transparent' }}>
              {t.l}
            </button>
          ))}
        </div>

        {/* CONTENU ONGLETS */}
        <div style={{ flex:1, overflow:'auto', padding:16 }}>

          {/* ANAMNESE */}
          {onglet==='anamnese'&&(
            <div>
              <label style={lbl}>Anamnèse</label>
              <textarea value={anamnese} onChange={e => setAnamnese(e.target.value)} rows={12}
                placeholder="Motif de consultation, histoire de la maladie, antécédents, traitements habituels..."
                style={{ ...inp, resize:'vertical' }}/>
              <HBtn onClick={() => save({ anamnese })}
                style={{ marginTop:8, padding:'8px 18px', borderRadius:8, background:'#0d9488', color:'#fff', fontSize:13, fontWeight:600, border:'none' }}>
                Sauvegarder
              </HBtn>
            </div>
          )}

          {/* EXAMEN CLINIQUE */}
          {onglet==='examen'&&(
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10, padding:'10px 12px', background:'#f0fdf4', borderRadius:8, border:'1px solid #bbf7d0', cursor:'pointer' }}
                onClick={() => setExam(exam === EXAMEN_NORMAL ? '' : EXAMEN_NORMAL)}>
                <div style={{ width:20, height:20, borderRadius:5, border:'2px solid '+(exam===EXAMEN_NORMAL?'#16a34a':'#d1d5db'), background:exam===EXAMEN_NORMAL?'#16a34a':'#fff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  {exam===EXAMEN_NORMAL && <span style={{ color:'#fff', fontSize:12, fontWeight:700 }}>✓</span>}
                </div>
                <span style={{ fontSize:13, fontWeight:600, color:'#16a34a' }}>Examen clinique normal</span>
              </div>
              <label style={lbl}>Examen clinique</label>
              <textarea value={exam} onChange={e => setExam(e.target.value)} rows={10}
                placeholder="Décrivez l'examen clinique..."
                style={{ ...inp, resize:'vertical' }}/>
              <HBtn onClick={() => save({ examen_clinique: exam })}
                style={{ marginTop:8, padding:'8px 18px', borderRadius:8, background:'#0d9488', color:'#fff', fontSize:13, fontWeight:600, border:'none' }}>
                Sauvegarder
              </HBtn>
            </div>
          )}

          {/* PRESCRIPTIONS */}
          {onglet==='prescription'&&(
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

              {/* EXAMENS */}
              <div>
                <label style={lbl}>🔬 Examens complémentaires</label>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                  {EXAMENS.map(e => {
                    const deja = prescriptions.find(r => r.texte.startsWith(e.label));
                    if (deja) return null;
                    if (e.sub) {
                      return (
                        <div key={e.id}>
                          <HBtn onClick={() => setSubOpen(s => ({ ...s, [e.id]: !s[e.id] }))}
                            style={{ padding:'5px 10px', borderRadius:6, background:e.color+'18', color:e.color, border:'1.5px solid '+e.color+'44', fontSize:11, fontWeight:600 }}>
                            {e.label} {subOpen[e.id]?'▲':'▼'}
                          </HBtn>
                          {subOpen[e.id]&&(
                            <div style={{ marginTop:4, marginLeft:4, display:'flex', flexWrap:'wrap', gap:4 }}>
                              {e.sub.map(s => {
                                const deja2 = prescriptions.find(r => r.texte === e.label+' : '+s);
                                if (deja2) return null;
                                return (
                                  <HBtn key={s} onClick={() => { ajouterPrescription(e.label+' : '+s, 'examen'); setSubOpen(so=>({...so,[e.id]:false})); }}
                                    style={{ padding:'4px 8px', borderRadius:5, background:e.color+'18', color:e.color, border:'1px solid '+e.color+'44', fontSize:10, fontWeight:600 }}>
                                    {s}
                                  </HBtn>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    }
                    return (
                      <HBtn key={e.id} onClick={() => ajouterPrescription(e.label, 'examen')}
                        style={{ padding:'5px 10px', borderRadius:6, background:e.color+'18', color:e.color, border:'1.5px solid '+e.color+'44', fontSize:11, fontWeight:600 }}>
                        {e.label}
                      </HBtn>
                    );
                  })}
                  {/* Autre examen libre */}
                  <AutreLibre categorie="examen" onAjouter={ajouterPrescription} color="#6b7280"/>
                </div>
              </div>

              {/* THERAPEUTIQUE */}
              <div>
                <label style={lbl}>💊 Thérapeutique</label>
                {THERAPEUTIQUE.map(grp => (
                  <div key={grp.group} style={{ marginBottom:8 }}>
                    <div style={{ fontSize:10, fontWeight:700, color:grp.color, marginBottom:4, textTransform:'uppercase', letterSpacing:0.5 }}>{grp.group}</div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                      {grp.items.map(item => {
                        const deja = prescriptions.find(r => r.texte === item);
                        if (deja) return null;
                        return (
                          <HBtn key={item} onClick={() => ajouterPrescription(item, 'therapeutique')}
                            style={{ padding:'5px 10px', borderRadius:6, background:grp.color+'15', color:grp.color, border:'1.5px solid '+grp.color+'33', fontSize:11, fontWeight:600 }}>
                            {item}
                          </HBtn>
                        );
                      })}
                    </div>
                  </div>
                ))}
                <AutreLibre categorie="therapeutique" onAjouter={ajouterPrescription} color="#6b7280"/>
              </div>

              {/* SOINS */}
              <div>
                <label style={lbl}>🩹 Soins</label>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                  {SOINS.map(s => {
                    const deja = prescriptions.find(r => r.texte === s.label);
                    if (deja) return null;
                    return (
                      <HBtn key={s.id} onClick={() => ajouterPrescription(s.label, 'soin')}
                        style={{ padding:'5px 10px', borderRadius:6, background:s.color+'15', color:s.color, border:'1.5px solid '+s.color+'33', fontSize:11, fontWeight:600 }}>
                        {s.label}
                      </HBtn>
                    );
                  })}
                  <AutreLibre categorie="soin" onAjouter={ajouterPrescription} color="#6b7280"/>
                </div>
              </div>
            </div>
          )}

          {/* EVOLUTION & SORTIE */}
          {onglet==='evolution'&&(
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <div>
                <label style={lbl}>Évolution au dispensaire</label>
                <textarea value={evolution} onChange={e => setEvolution(e.target.value)} rows={4}
                  style={{ ...inp, resize:'vertical' }} placeholder="Évolution clinique..."/>
              </div>
              <div>
                <label style={lbl}>Diagnostic</label>
                <textarea value={diagnostic} onChange={e => setDiagnostic(e.target.value)} rows={3}
                  style={{ ...inp, resize:'vertical' }} placeholder="Diagnostic retenu..."/>
              </div>
              <div>
                <label style={lbl}>Ordonnance de sortie</label>
                <textarea value={ordonnance} onChange={e => setOrdonnance(e.target.value)} rows={5}
                  style={{ ...inp, resize:'vertical' }} placeholder="Traitements de sortie, conseils, suivi..."/>
              </div>
              <HBtn onClick={() => save({ evolution, diagnostic, ordonnance })}
                style={{ padding:'8px 18px', borderRadius:8, background:'#0d9488', color:'#fff', fontSize:13, fontWeight:600, border:'none' }}>
                Sauvegarder
              </HBtn>
              <HBtn onClick={() => {
                navigator.clipboard.writeText(resume());
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }} style={{ padding:'12px', borderRadius:8, background:copied?'#16a34a':'#111827', color:'#fff', fontSize:14, fontWeight:700, border:'none' }}>
                {copied ? '✓ Copié !' : '📋 Résumé — Copier pour DxCare'}
              </HBtn>
            </div>
          )}
        </div>
      </div>

      {/* COLONNE DROITE — PRESCRIPTIONS EN COURS */}
      <div style={{ width:260, borderLeft:'1px solid #e5e7eb', background:'#f9fafb', display:'flex', flexDirection:'column', overflow:'hidden', flexShrink:0 }}>
        <div style={{ padding:'10px 12px', borderBottom:'1px solid #e5e7eb', fontWeight:700, fontSize:12, color:'#374151' }}>
          Prescriptions en cours
        </div>
        <div style={{ flex:1, overflow:'auto', padding:8 }}>
          {enAttente.length===0&&realises.length===0&&(
            <div style={{ color:'#9ca3af', fontSize:11, textAlign:'center', marginTop:20 }}>Aucune prescription</div>
          )}
          {enAttente.map((r, i) => (
            <div key={i} style={{ background:'#fff', border:'1.5px solid '+(r.categorie==='examen'?'#7c3aed':r.categorie==='therapeutique'?'#0d9488':'#f59e0b'), borderRadius:8, padding:'7px 10px', marginBottom:6, display:'flex', alignItems:'flex-start', gap:6 }}>
              <span style={{ fontSize:12 }}>{r.categorie==='examen'?'🔬':r.categorie==='therapeutique'?'💊':'🩹'}</span>
              <div style={{ flex:1, fontSize:11, color:'#374151', lineHeight:1.3 }}>{r.texte}</div>
              <HBtn onClick={() => cocherFait(prescriptions.indexOf(r))}
                style={{ flexShrink:0, width:20, height:20, borderRadius:4, border:'1.5px solid #16a34a', background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, color:'#16a34a' }}>
                ✓
              </HBtn>
            </div>
          ))}
          {realises.length>0&&(
            <>
              <div style={{ fontSize:10, color:'#9ca3af', fontWeight:700, textTransform:'uppercase', margin:'8px 0 4px' }}>Réalisés</div>
              {realises.map((r, i) => (
                <div key={i} style={{ background:'#f3f4f6', borderRadius:8, padding:'6px 10px', marginBottom:4, display:'flex', gap:6, alignItems:'center', opacity:0.6 }}>
                  <span style={{ fontSize:11 }}>{r.categorie==='examen'?'🔬':r.categorie==='therapeutique'?'💊':'🩹'}</span>
                  <div style={{ flex:1, fontSize:10, color:'#6b7280', textDecoration:'line-through' }}>{r.texte}</div>
                  <span style={{ fontSize:10, color:'#16a34a', fontWeight:700 }}>✓</span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function AutreLibre({ categorie, onAjouter, color }) {
  const [open, setOpen] = useState(false);
  const [val, setVal] = useState('');
  if (!open) return (
    <HBtn onClick={() => setOpen(true)}
      style={{ padding:'5px 10px', borderRadius:6, background:'#f3f4f6', color:'#6b7280', border:'1.5px solid #e5e7eb', fontSize:11, fontWeight:600 }}>
      + Autre...
    </HBtn>
  );
  return (
    <div style={{ display:'flex', gap:5, alignItems:'center' }}>
      <input value={val} onChange={e => setVal(e.target.value)} placeholder="Préciser..."
        style={{ padding:'4px 8px', borderRadius:5, border:'1px solid #e5e7eb', fontSize:11, outline:'none' }} autoFocus/>
      <HBtn onClick={() => { if (val.trim()) { onAjouter(val.trim(), categorie); setVal(''); setOpen(false); } }}
        style={{ padding:'4px 10px', borderRadius:5, background:'#0d9488', color:'#fff', border:'none', fontSize:11, fontWeight:600 }}>
        OK
      </HBtn>
      <HBtn onClick={() => { setOpen(false); setVal(''); }}
        style={{ padding:'4px 8px', borderRadius:5, background:'#f3f4f6', color:'#6b7280', border:'none', fontSize:11 }}>
        ✕
      </HBtn>
    </div>
  );
}
