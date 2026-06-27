'use client';
import { useRef, useState, useEffect, memo, forwardRef } from 'react';
import { useRouter } from 'next/navigation';

// Calcul age
function calcAge(ddn) {
  if (!ddn) return null;
  const d = new Date(ddn);
  if (isNaN(d)) return null;
  return Math.floor((Date.now() - d.getTime()) / (365.25*24*3600*1000));
}

// Bouton avec hover via DOM direct - AUCUN useState
const Btn = memo(function Btn({ onClick, style, disabled, children }) {
  const ref = useRef(null);
  return (
    <button ref={ref} onClick={onClick} disabled={disabled}
      onMouseEnter={() => { if (ref.current && !disabled) ref.current.style.filter = 'brightness(0.88)'; }}
      onMouseLeave={() => { if (ref.current) ref.current.style.filter = 'none'; }}
      style={{ ...style, cursor: disabled ? 'not-allowed' : 'pointer', transition: 'filter 0.12s' }}>
      {children}
    </button>
  );
});

const lbl = { fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5 };
const inp = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#fff', fontFamily: 'system-ui' };

const EMPLACEMENTS = [
  { id: 'brancard1', l: 'B1 — Brancard 1', c: '#ef4444' },
  { id: 'brancard2', l: 'B2 — Brancard 2', c: '#ef4444' },
  { id: 'fauteuil1', l: 'F1 — Fauteuil 1', c: '#16a34a' },
  { id: 'fauteuil2', l: 'F2 — Fauteuil 2', c: '#16a34a' },
  { id: 'obs1',      l: 'O1 — Observation 1', c: '#3b82f6' },
  { id: 'obs2',      l: 'O2 — Observation 2', c: '#16a34a' },
  { id: 'lit1',      l: 'L1 — Lit 1', c: '#3b82f6' },
  { id: 'lit2',      l: 'L2 — Lit 2', c: '#3b82f6' },
  { id: 'pansement', l: 'P1 — Pansement', c: '#f59e0b' },
];

export default function NouveauPatient() {
  const router = useRouter();
  const [user, setUser] = useState(null);

  // Toutes les valeurs dans un seul objet ref - pas de re-render sur frappe
  const vals = useRef({
    sexe:'', nom:'', prenom:'', ddn:'', ddn_j:'', ddn_m:'', ddn_a:'', ipp:'',
    allergie:'', allergie_detail:'', medicaments_today:'', medicaments_detail:'',
    fc:'', sat:'', temp:'', tas:'', tad:'',
    poids:'', taille:'',
    symptome:'', symptome_autre:'',
    signe_lutte:'', respire:'',
    douleur_zones:[], douleur_eva:0,
    nausee:'', tache_corps:'',
    fievre_depuis:'', tdr_palu:'', tdr_dengue:'',
    dextro:'', hemocue:'',
    bu_fait:false, bu_resultat:'', bhcg_fait:false, bhcg_resultat:'',
    plaie_vaccin:'', quicktest:'',
    drp:false, educ_drp:false, cetonemie:'', crp_test:'', ecg_fait:false,
    notes:'',
  });

  // État UI minimal - seulement ce qui change l'affichage conditionnel
  const [ui, setUi] = useState({
    sexe:'', allergie:'', medicaments_today:'',
    symptome:'', signe_lutte:'', respire:'',
    douleur_zones:[], douleur_eva:0,
    nausee:'', tache_corps:'',
    fievre_depuis:'', tdr_palu:'', tdr_dengue:'',
    dextro:'', hemocue:'',
    bu_fait:false, bhcg_fait:false, bhcg_resultat:'',
    plaie_vaccin:'', quicktest:'', drp:false, ecg_fait:false,
    age:null, showEmplacement:false, pam:null, imc:null,
  });

  const setU = (k, v) => {
    vals.current[k] = v;
    setUi(prev => ({ ...prev, [k]: v }));
  };

  const ddnRefs = useRef([]);
  const constRefs = useRef([]);
  const [placesOccupees, setPlacesOccupees] = useState([]);

  useEffect(() => {
    const s = sessionStorage.getItem('pds_user');
    if (!s) { router.push('/login'); return; }
    setUser(JSON.parse(s));
    // Charger patients pour savoir places occupées
    fetch('/api/patients').then(r=>r.json()).then(d=>{
      const occupees = (d.patients||[]).filter(p=>p.emplacement).map(p=>p.emplacement);
      setPlacesOccupees(occupees);
    }).catch(()=>{});
  }, []);

  // Calcul placement
  function getPlacement() {
    const s = vals.current.symptome;
    const sat = parseFloat(vals.current.sat);
    const dex = parseFloat(vals.current.dextro);
    const hb = parseFloat(vals.current.hemocue);
    if (s === 'coma') {
      if (vals.current.respire === false) return { place:'brancard1', label:'B1 — Brancard 1', urgence:true, msg:'Allonger le patient — Alerter le médecin — Commencer le massage cardiaque' };
      return { place:'brancard1', label:'B1 — Brancard 1', urgence:true, msg:'Dextro + hemocue + alerter medecin' };
    }
    if (s === 'detresse_respi') {
      if (vals.current.sat && sat < 95) return { place:'brancard1', label:'B1 — Brancard 1', urgence:true, msg:'O2 immediat + alerter medecin et IDE' };
      if (vals.current.signe_lutte === true) return { place:'brancard1', label:'B1 — Brancard 1', urgence:true, msg:'O2 + alerter medecin' };
      if (vals.current.signe_lutte === false) return { place:'fauteuil2', label:'F2 (ou L2, L1, F1)', urgence:false, msg:'Position demi-assise — Surveillance saturation' };
      return null;
    }
    if (s === 'asthme') {
      if (vals.current.sat && sat < 95) return { place:'fauteuil1', label:'F1 — Fauteuil 1', urgence:true, msg:'O2 5L + nebulisation + prevenir medecin' };
      if (vals.current.signe_lutte === true) return { place:'fauteuil1', label:'F1 — Fauteuil 1', urgence:true, msg:'O2 + nebulisation + prevenir medecin' };
      if (vals.current.signe_lutte === false) return { place:'obs1', label:'O1 — Observation', urgence:false, msg:'Ventoline + Atrovent sous AIR — Video education therapeutique' };
      return null;
    }
    if (s === 'douleur') {
      const zones = vals.current.douleur_zones;
      if (zones.includes('bras_g') || zones.includes('thorax')) return { place:'brancard1', label:'B1 — Brancard 1', urgence:true, msg:'ECG + alerter medecin' };
      if ((vals.current.nausee==='Oui'||vals.current.tache_corps==='Oui') && zones.includes('tete')) return { place:'brancard1', label:'B1 — Brancard 1', urgence:true, msg:'Urgence — Alerter medecin immediatement' };
      return { place:'dehors', label:"Salle d'attente dehors", urgence:false, msg:'Constantes normales — Faire patienter' };
    }
    if (s === 'vertige') {
      if (vals.current.dextro && dex < 0.5) return { place:'brancard1', label:'B1 — Brancard 1', urgence:true, msg:'Hypoglycemie severe — Alerter medecin' };
      if (vals.current.hemocue && hb < 7) return { place:'brancard1', label:'B1 ou L1', urgence:true, msg:'Anemie severe — Allonger patient' };
      return { place:'lit1', label:'L1 — Lit 1', urgence:false, msg:'Surveiller constantes' };
    }
    if (s === 'plaie') return { place:'pansement', label:'P1 — Pansement', urgence:false, msg:'Salle de pansement' };
    if (s === 'fievre') return { place:'dehors', label:"Salle d'attente dehors", urgence:false, msg:'Faire patienter' };
    return { place:'dehors', label:"Salle d'attente dehors", urgence:false, msg:'Faire patienter' };
  }

  const placement = ui.symptome ? getPlacement() : null;
  const pam = vals.current.tas && vals.current.tad ? Math.round(parseFloat(vals.current.tad) + (parseFloat(vals.current.tas) - parseFloat(vals.current.tad)) / 3) : null;

  async function enregistrer(emplacementForce = null) {
    const v = vals.current;
    const p = emplacementForce ? { place: emplacementForce } : (placement || { place: 'dehors' });
    const patient = {
      nom: v.nom, prenom: v.prenom, sexe: v.sexe, ddn: v.ddn, ipp: v.ipp, age: calcAge(v.ddn)||'',
      allergie: v.allergie, allergie_detail: v.allergie_detail,
      medicaments_today: v.medicaments_today, medicaments_detail: v.medicaments_detail,
      fc: v.fc, sat: v.sat, temp: v.temp, tas: v.tas, tad: v.tad,
      poids: v.poids, taille: v.taille,
      symptome: v.symptome, symptome_autre: v.symptome_autre,
      signe_lutte: String(v.signe_lutte), respire: String(v.respire),
      douleur_zones: JSON.stringify(v.douleur_zones), douleur_eva: v.douleur_eva,
      nausee: v.nausee, tache_corps: v.tache_corps,
      fievre_depuis: v.fievre_depuis, tdr_palu: v.tdr_palu, tdr_dengue: v.tdr_dengue,
      dextro: v.dextro, hemocue: v.hemocue,
      bu_fait: v.bu_fait, bu_resultat: v.bu_resultat,
      bhcg_fait: v.bhcg_fait, bhcg_resultat: v.bhcg_resultat,
      plaie_vaccin: v.plaie_vaccin, quicktest: v.quicktest,
      drp: v.drp, educ_drp: v.educ_drp, cetonemie: v.cetonemie, crp_test: v.crp_test, ecg_fait: v.ecg_fait, notes: v.notes,
      statut: emplacementForce ? 'attente_medecin' : (p.place !== 'dehors' ? 'attente_medecin' : 'dehors'),
      emplacement: emplacementForce ? emplacementForce : (p.place !== 'dehors' ? p.place : null),
      emplacement_suggere: p.place,
      creePar: user?.matricule || '',
    };
    await fetch('/api/patients', { method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ action: 'create', patient }) });
    router.push('/vueglobale');
  }

  const canSubmit = ui.sexe && vals.current.nom && ui.symptome;

  const SYMPTOMES = [
    { id:'coma',          label:'Coma / Inconscience', icon:'🚨' },
    { id:'detresse_respi',label:'Difficulté respiratoire',       icon:'😮' },
    { id:'asthme',        label:'Asthme',               icon:'💨' },
    { id:'douleur',       label:'Douleur',              icon:'😣' },
    { id:'fievre',        label:'Fievre',               icon:'🌡️' },
    { id:'vertige',       label:'Vertige / Malaise',    icon:'💫' },
    { id:'plaie',         label:'Plaie',                icon:'🩹' },
    { id:'autre',         label:'Autre',                icon:'?' },
  ];

  return (
    <div style={{ minHeight:'100vh', background:'#f3f4f6', fontFamily:'system-ui' }}>
      <div style={{ maxWidth:680, margin:'0 auto', padding:'1.5rem 1rem 3rem' }}>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <h2 style={{ fontSize:18, fontWeight:700, color:'#111827', margin:0 }}>Nouveau patient</h2>
          <Btn onClick={() => router.push('/vueglobale')}
            style={{ padding:'8px 16px', borderRadius:8, background:'#f3f4f6', color:'#6b7280', fontSize:13, border:'1px solid #e5e7eb' }}>
            Annuler
          </Btn>
        </div>

        {/* IDENTITE */}
        <div style={{ background:'#fff', borderRadius:12, border:'1px solid #e5e7eb', padding:'1.25rem', marginBottom:12 }}>
          <div style={{ fontWeight:700, fontSize:14, color:'#111827', marginBottom:12 }}>🪪 Identite</div>

          {/* Sexe */}
          <div style={{ display:'flex', gap:8, marginBottom:12 }}>
            {[['M','Homme ♂','#3b82f6'],['F','Femme ♀','#ec4899']].map(([v,l,c]) => (
              <Btn key={v} onClick={() => setU('sexe', v)}
                style={{ flex:1, padding:'10px', borderRadius:8, fontSize:13, fontWeight:600,
                  background: ui.sexe===v ? c : '#f9fafb',
                  color: ui.sexe===v ? '#fff' : '#374151',
                  border: '2px solid '+(ui.sexe===v ? c : '#e5e7eb') }}>
                {l}
              </Btn>
            ))}
          </div>

          {/* Nom / Prénom */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
            <div>
              <label style={lbl}>Nom</label>
              <input
                onChange={e => { vals.current.nom = e.target.value.toUpperCase(); }}
                style={inp} placeholder="NOM" autoComplete="off" autoCorrect="off" spellCheck="false"/>
            </div>
            <div>
              <label style={lbl}>Prenom</label>
              <input
                onChange={e => { vals.current.prenom = e.target.value; }}
                style={inp} placeholder="Prenom" autoComplete="off" autoCorrect="off" spellCheck="false"/>
            </div>
          </div>

          {/* DDN + IPP */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
            <div>
              <label style={lbl}>Date de naissance (JJ / MM / AAAA)</label>
              <div style={{ display:'flex', gap:4, alignItems:'center' }}>
                <input ref={el=>ddnRefs.current[0]=el} inputMode="numeric" maxLength={2} placeholder="JJ"
                  onChange={e => {
                    vals.current.ddn_j = e.target.value;
                    if (e.target.value.length===2) ddnRefs.current[1]?.focus();
                    const j = e.target.value.padStart(2,'0');
                    const m = (vals.current.ddn_m||'').padStart(2,'0');
                    const a = vals.current.ddn_a||'';
                    if (e.target.value && vals.current.ddn_m && a.length===4) {
                      vals.current.ddn = a+'-'+m+'-'+j;
                      setUi(p=>({...p, age: calcAge(a+'-'+m+'-'+j)}));
                    }
                  }}
                  style={{...inp,width:48,textAlign:'center',padding:'10px 4px'}}/>
                <span style={{color:'#9ca3af'}}>/</span>
                <input ref={el=>ddnRefs.current[1]=el} inputMode="numeric" maxLength={2} placeholder="MM"
                  onChange={e => {
                    vals.current.ddn_m = e.target.value;
                    if (e.target.value.length===2) ddnRefs.current[2]?.focus();
                    const j = (vals.current.ddn_j||'').padStart(2,'0');
                    const m = e.target.value.padStart(2,'0');
                    const a = vals.current.ddn_a||'';
                    if (vals.current.ddn_j && e.target.value && a.length===4) {
                      vals.current.ddn = a+'-'+m+'-'+j;
                      setUi(p=>({...p, age: calcAge(a+'-'+m+'-'+j)}));
                    }
                  }}
                  style={{...inp,width:48,textAlign:'center',padding:'10px 4px'}}/>
                <span style={{color:'#9ca3af'}}>/</span>
                <input ref={el=>ddnRefs.current[2]=el} inputMode="numeric" maxLength={4} placeholder="AAAA"
                  onChange={e => {
                    vals.current.ddn_a = e.target.value;
                    const j = (vals.current.ddn_j||'').padStart(2,'0');
                    const m = (vals.current.ddn_m||'').padStart(2,'0');
                    const a = e.target.value;
                    if (vals.current.ddn_j && vals.current.ddn_m && a.length===4) {
                      vals.current.ddn = a+'-'+m+'-'+j;
                      setUi(p=>({...p, age: calcAge(a+'-'+m+'-'+j)}));
                    }
                  }}
                  style={{...inp,flex:1,textAlign:'center',padding:'10px 4px'}}/>
              </div>
              {ui.age !== null && <div style={{fontSize:12,color:'#0d9488',marginTop:4,fontWeight:600}}>{ui.age} ans</div>}
            </div>
            <div>
              <label style={lbl}>IPP</label>
              <input onChange={e => { vals.current.ipp = e.target.value; }}
                style={inp} placeholder="--" autoComplete="off"/>
            </div>
          </div>

          {/* Allergie + Traitements */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div>
              <label style={lbl}>Allergie ?</label>
              <div style={{ display:'flex', gap:6 }}>
                {['Oui','Non'].map(v => (
                  <Btn key={v} onClick={() => setU('allergie', v)}
                    style={{ flex:1, padding:'8px', borderRadius:7, fontSize:12, fontWeight:600,
                      background: ui.allergie===v ? (v==='Oui'?'#ef4444':'#16a34a') : '#f9fafb',
                      color: ui.allergie===v ? '#fff' : '#374151',
                      border: '1.5px solid '+(ui.allergie===v ? (v==='Oui'?'#ef4444':'#16a34a') : '#e5e7eb') }}>
                    {v}
                  </Btn>
                ))}
              </div>
              {ui.allergie==='Oui' && (
                <input onChange={e => { vals.current.allergie_detail = e.target.value; }}
                  style={{...inp,marginTop:6}} placeholder="Ex: Penicilline, AINS..."/>
              )}
            </div>
            <div>
              <label style={lbl}>Traitements du jour ?</label>
              <div style={{ display:'flex', gap:6 }}>
                {['Oui','Non'].map(v => (
                  <Btn key={v} onClick={() => setU('medicaments_today', v)}
                    style={{ flex:1, padding:'8px', borderRadius:7, fontSize:12, fontWeight:600,
                      background: ui.medicaments_today===v ? '#0d9488' : '#f9fafb',
                      color: ui.medicaments_today===v ? '#fff' : '#374151',
                      border: '1.5px solid '+(ui.medicaments_today===v ? '#0d9488' : '#e5e7eb') }}>
                    {v}
                  </Btn>
                ))}
              </div>
              {ui.medicaments_today==='Oui' && (
                <textarea onChange={e => { vals.current.medicaments_detail = e.target.value; }}
                  placeholder="Lister les traitements..." rows={2}
                  style={{...inp,marginTop:6,resize:'vertical'}}/>
              )}
            </div>
          </div>
        </div>

        {/* CONSTANTES */}
        <div style={{ background:'#fff', borderRadius:12, border:'1px solid #e5e7eb', padding:'1.25rem', marginBottom:12 }}>
          <div style={{ fontWeight:700, fontSize:14, color:'#111827', marginBottom:12 }}>📊 Constantes vitales</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:10 }}>
            {[
              {k:'fc',  l:'FC',  u:'bpm', bad:v=>parseFloat(v)<50||parseFloat(v)>100,  autoLen:3, ni:1},
              {k:'sat', l:'SpO2',u:'%',   bad:v=>parseFloat(v)<94,                      autoLen:2, ni:2},
              {k:'temp',l:'T°',  u:'°C',  bad:v=>parseFloat(v)<36||parseFloat(v)>38.4,  autoLen:4, ni:3},
              {k:'tas', l:'PAS', u:'mmHg',bad:v=>parseFloat(v)<90||parseFloat(v)>150,   autoLen:3, ni:4},
              {k:'tad', l:'PAD', u:'mmHg',bad:v=>parseFloat(v)<60||parseFloat(v)>95,    autoLen:3, ni:5},
            ].map(({k,l,u,bad,autoLen,ni}) => (
              <ConstCell key={k} label={l} unit={u} isBad={bad} autoLen={autoLen}
                nextRef={{current: constRefs.current[ni]}}
                onChange={v => {
                  vals.current[k] = v;
                  if (k==='tas'||k==='tad') {
                    const tas = parseFloat(k==='tas'?v:vals.current.tas);
                    const tad = parseFloat(k==='tad'?v:vals.current.tad);
                    if (!isNaN(tas)&&!isNaN(tad)) setUi(p=>({...p, pam: Math.round(tad+(tas-tad)/3)}));
                  }
                }}/>
            ))}
            {/* PAM calculée */}
            <div style={{ background:'#f9fafb', borderRadius:10, padding:'10px 12px', border:'1px solid #e5e7eb' }}>
              <label style={{ fontSize:11, color:'#9ca3af', fontWeight:600, display:'block', marginBottom:4 }}>PAM <span style={{fontSize:10}}>mmHg</span></label>
              <div style={{ fontSize:22, fontWeight:700, color: ui.pam ? (ui.pam<65?'#ef4444':'#16a34a') : '#d1d5db' }}>{ui.pam||'--'}</div>
              {ui.pam&&ui.pam<65&&<div style={{fontSize:10,color:'#ef4444',fontWeight:600}}>PAM basse — Alerter medecin</div>}
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
            <div>
              <label style={lbl}>Poids (kg)</label>
              <input ref={el=>constRefs.current[5]=el} inputMode="decimal" onChange={e => {
                vals.current.poids = e.target.value;
                const p=parseFloat(e.target.value), t=parseFloat(vals.current.taille);
                if(!isNaN(p)&&!isNaN(t)&&t>0) setUi(pr=>({...pr, imc: (p/Math.pow(t/100,2)).toFixed(1)}));
                if(e.target.value.replace(/[^0-9]/g,'').length>=3) constRefs.current[6]?.focus();
              }} style={inp} placeholder="--"/>
            </div>
            <div>
              <label style={lbl}>Taille (cm)</label>
              <input ref={el=>constRefs.current[6]=el} inputMode="decimal" onChange={e => {
                vals.current.taille = e.target.value;
                const p=parseFloat(vals.current.poids), t=parseFloat(e.target.value);
                if(!isNaN(p)&&!isNaN(t)&&t>0) setUi(pr=>({...pr, imc: (p/Math.pow(t/100,2)).toFixed(1)}));
              }} style={inp} placeholder="--"/>
            </div>
            <div>
              <label style={lbl}>IMC</label>
              <div style={{...inp, background:'#f9fafb', display:'flex', alignItems:'center', color: ui.imc?(parseFloat(ui.imc)>=30?'#ef4444':parseFloat(ui.imc)>=25?'#f59e0b':'#16a34a'):'#9ca3af', fontWeight:600}}>
                {ui.imc||'--'}{ui.imc&&<span style={{fontSize:11,marginLeft:4,fontWeight:400}}>{parseFloat(ui.imc)>=40?'Obesite morbide':parseFloat(ui.imc)>=35?'Obesite severe':parseFloat(ui.imc)>=30?'Obesite':parseFloat(ui.imc)>=25?'Surpoids':''}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* SYMPTOME */}
        <div style={{ background:'#fff', borderRadius:12, border:'1px solid #e5e7eb', padding:'1.25rem', marginBottom:12 }}>
          <div style={{ fontWeight:700, fontSize:14, color:'#111827', marginBottom:12 }}>🩺 Symptôme principal</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:ui.symptome?16:0 }}>
            {SYMPTOMES.map(s => (
              <Btn key={s.id} onClick={() => setU('symptome', s.id)}
                style={{ padding:'12px 6px', borderRadius:10, fontSize:11, fontWeight:600, textAlign:'center',
                  background: ui.symptome===s.id ? '#0d9488' : '#f9fafb',
                  color: ui.symptome===s.id ? '#fff' : '#374151',
                  border: '2px solid '+(ui.symptome===s.id ? '#0d9488' : '#e5e7eb') }}>
                <div style={{ fontSize:22, marginBottom:4 }}>{s.icon}</div>{s.label}
              </Btn>
            ))}
          </div>

          {/* COMA */}
          {ui.symptome==='coma'&&(
            <div style={{ background:'#fef2f2', border:'2px solid #ef4444', borderRadius:10, padding:14 }}>
              <div style={{ fontWeight:700, color:'#dc2626', fontSize:14, marginBottom:10 }}>Coma / Inconscience — URGENCE</div>
              <label style={lbl}>Le patient respire ?</label>
              <div style={{ display:'flex', gap:8 }}>
                {[[true,'Oui'],[false,'Non']].map(([v,l]) => (
                  <Btn key={String(v)} onClick={() => setU('respire', v)}
                    style={{ flex:1, padding:'10px', borderRadius:8, fontWeight:600, fontSize:13,
                      background: ui.respire===v ? (v===false?'#ef4444':'#16a34a') : '#fff',
                      color: ui.respire===v ? '#fff' : '#374151',
                      border: '2px solid '+(ui.respire===v ? (v===false?'#ef4444':'#16a34a') : '#e5e7eb') }}>
                    {l}
                  </Btn>
                ))}
              </div>
              {ui.respire===true&&(
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop:10 }}>
                  <div>
                    <label style={lbl}>Dextro (g/L)</label>
                    <input inputMode="decimal" onChange={e => { vals.current.dextro = e.target.value; setUi(p=>({...p,dextro:e.target.value})); }} style={inp} placeholder="--"/>
                  </div>
                  <div>
                    <label style={lbl}>Hemocue (g/dL)</label>
                    <input inputMode="decimal" onChange={e => { vals.current.hemocue = e.target.value; }} style={inp} placeholder="--"/>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* DETRESSE RESPI */}
          {ui.symptome==='detresse_respi'&&(
            <div style={{ borderRadius:10, overflow:'hidden', border:'1px solid #e5e7eb' }}>
              {vals.current.sat && parseFloat(vals.current.sat)<95 ? (
                <div style={{ background:'#7f1d1d', padding:14 }}>
                  <div style={{ color:'#fff', fontWeight:800, fontSize:15, marginBottom:4 }}>Saturation {vals.current.sat}% — URGENCE</div>
                  <div style={{ color:'#fef2f2', fontSize:12 }}>B1 — O2 immediat — Appeler medecin et IDE</div>
                </div>
              ) : (
                <div style={{ padding:14, background:'#f9fafb' }}>
                  <label style={lbl}>Le patient arrive a respirer et parle normalement ?</label>
                  <div style={{ display:'flex', gap:8 }}>
                    {[[false,'Oui — respire et parle'],[true,'Non — difficultes']].map(([v,l]) => (
                      <Btn key={String(v)} onClick={() => setU('signe_lutte', v)}
                        style={{ flex:1, padding:'10px', borderRadius:8, fontWeight:600, fontSize:13,
                          background: ui.signe_lutte===v ? (v===true?'#ef4444':'#16a34a') : '#fff',
                          color: ui.signe_lutte===v ? '#fff' : '#374151',
                          border: '2px solid '+(ui.signe_lutte===v ? (v===true?'#ef4444':'#16a34a') : '#e5e7eb') }}>
                        {l}
                      </Btn>
                    ))}
                  </div>

                  {ui.signe_lutte===true&&<div style={{ background:'#fef2f2', border:'2px solid #ef4444', borderRadius:8, padding:'10px 12px', marginTop:10 }}>
                    <div style={{ color:'#dc2626', fontWeight:700 }}>B1 ou B2 — O2 — Alerter équipe</div>
                  </div>}
                </div>
              )}
              {/* DRP si < 3 ans */}
              {ui.age!==null&&ui.age<3&&(
                <div style={{ background:'#eff6ff', borderTop:'1px solid #bfdbfe', padding:'10px 14px' }}>
                  <div style={{ color:'#1d4ed8', fontWeight:700, fontSize:12, marginBottom:6 }}>Enfant &lt; 3 ans — Si enrhumé : DRP recommandé</div>
                  <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                    <Btn onClick={() => setU('drp', !ui.drp)}
                      style={{ padding:'6px 14px', borderRadius:6, fontSize:12, fontWeight:600,
                        background: ui.drp?'#3b82f6':'#fff', color: ui.drp?'#fff':'#374151',
                        border: '1px solid '+(ui.drp?'#3b82f6':'#e5e7eb') }}>
                      {ui.drp?'✓ DRP réalisé':'DRP à réaliser'}
                    </Btn>
                    <Btn onClick={() => setU('educ_drp', !ui.educ_drp)}
                      style={{ padding:'6px 14px', borderRadius:6, fontSize:12, fontWeight:600,
                        background: ui.educ_drp?'#0d9488':'#fff', color: ui.educ_drp?'#fff':'#374151',
                        border: '1px solid '+(ui.educ_drp?'#0d9488':'#e5e7eb') }}>
                      {ui.educ_drp?'✓ Éducation lavage de nez':'Éducation lavage de nez'}
                    </Btn>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ASTHME */}
          {ui.symptome==='asthme'&&(
            <div style={{ borderRadius:10, overflow:'hidden', border:'1px solid #e5e7eb' }}>
              {vals.current.sat && parseFloat(vals.current.sat)<95 ? (
                <div style={{ background:'#7f1d1d', padding:14 }}>
                  <div style={{ color:'#fff', fontWeight:800, fontSize:14 }}>F1 + O2 + Prevenir medecin</div>
                  <div style={{ color:'#fef2f2', fontSize:12, marginTop:4 }}>
                    {parseFloat(vals.current.poids||99)>=16?'SALBUTAMOL 5mg + ATROVENT 0.5mg':'SALBUTAMOL 2.5mg + ATROVENT 0.25mg'}
                  </div>
                </div>
              ) : (
                <div style={{ padding:14, background:'#f9fafb' }}>
                  <label style={lbl}>Le patient arrive a respirer et parle normalement ?</label>
                  <div style={{ display:'flex', gap:8 }}>
                    {[[false,'Oui — respire et parle'],[true,'Non — difficultes']].map(([v,l]) => (
                      <Btn key={String(v)} onClick={() => setU('signe_lutte', v)}
                        style={{ flex:1, padding:'10px', borderRadius:8, fontWeight:600, fontSize:13,
                          background: ui.signe_lutte===v ? (v===true?'#ef4444':'#16a34a') : '#fff',
                          color: ui.signe_lutte===v ? '#fff' : '#374151',
                          border: '2px solid '+(ui.signe_lutte===v ? (v===true?'#ef4444':'#16a34a') : '#e5e7eb') }}>
                        {l}
                      </Btn>
                    ))}
                  </div>

                  {ui.signe_lutte===true&&<div style={{ background:'#fef2f2', border:'2px solid #ef4444', borderRadius:8, padding:'10px 12px', marginTop:10 }}>
                    <div style={{ color:'#dc2626', fontWeight:700 }}>F1 — O2 — Prevenir medecin</div>
                    <div style={{ color:'#ef4444', fontSize:12, marginTop:4 }}>
                      {parseFloat(vals.current.poids||99)>=16?'SALBUTAMOL 5mg + ATROVENT 0.5mg':'SALBUTAMOL 2.5mg + ATROVENT 0.25mg'}
                    </div>
                  </div>}
                </div>
              )}
              {ui.age!==null&&ui.age<2&&(
                <div style={{ background:'#eff6ff', borderTop:'1px solid #bfdbfe', padding:'10px 14px' }}>
                  <div style={{ color:'#1d4ed8', fontWeight:700, fontSize:12 }}>Enfant &lt; 2 ans — DRP recommande</div>
                  <Btn onClick={() => setU('drp', !ui.drp)}
                    style={{ marginTop:6, padding:'6px 14px', borderRadius:6, fontSize:12, fontWeight:600,
                      background: ui.drp?'#3b82f6':'#fff', color: ui.drp?'#fff':'#374151',
                      border: '1px solid '+(ui.drp?'#3b82f6':'#e5e7eb') }}>
                    {ui.drp?'✓ DRP realise':'DRP a realiser'}
                  </Btn>
                </div>
              )}
            </div>
          )}

          {/* DOULEUR */}
          {ui.symptome==='douleur'&&(
            <div style={{ padding:14, background:'#f9fafb', borderRadius:10, border:'1px solid #e5e7eb' }}>
              <div style={{ fontWeight:600, color:'#374151', fontSize:13, marginBottom:10 }}>Ou est la douleur ?</div>
              <div style={{ display:'flex', gap:10 }}>
                <svg width="90" height="240" viewBox="0 0 90 240">
                  {[
                    {id:'tete',    d:'M45,2 C34,2 26,11 26,23 C26,35 34,44 45,44 C56,44 64,35 64,23 C64,11 56,2 45,2 Z',   lx:45,ly:24},
                    {id:'thorax',  d:'M18,52 L72,52 L76,108 L14,108 Z', lx:45,ly:80},
                    {id:'membre_g',d:'M74,54 L84,58 L88,148 L76,144 Z', lx:82,ly:100},
                    {id:'membre_d',d:'M16,54 L6,58 L2,148 L14,144 Z',  lx:8, ly:100},
                    {id:'abdomen', d:'M14,108 L76,108 L74,156 L16,156 Z',lx:45,ly:132},
                    {id:'mig',     d:'M45,156 L74,156 L72,236 L47,236 Z',lx:61,ly:196},
                    {id:'mid',     d:'M45,156 L16,156 L18,236 L43,236 Z',lx:29,ly:196},
                  ].map(z => {
                    const sel = ui.douleur_zones.includes(z.id);
                    const rouge = z.id==='membre_g';
                    return (
                      <g key={z.id} onClick={() => {
                        const zones = sel ? ui.douleur_zones.filter(x=>x!==z.id) : [...ui.douleur_zones, z.id];
                        vals.current.douleur_zones = zones;
                        setUi(p=>({...p, douleur_zones: zones}));
                      }} style={{cursor:'pointer'}}>
                        <path d={z.d} fill={sel?(rouge?'#ef4444':'#0d9488'):'#e2e8f0'} stroke={sel?(rouge?'#b91c1c':'#0f766e'):'#94a3b8'} strokeWidth="1.5"/>
                        <text x={z.lx} y={z.ly} textAnchor="middle" dominantBaseline="middle" fontSize="7" fill={sel?'#fff':'#64748b'} fontWeight={sel?'700':'500'}>{z.id.replace(/_/g,' ')}</text>
                      </g>
                    );
                  })}
                </svg>
                <svg width="80" height="110" viewBox="0 0 80 110">
                  <ellipse cx="40" cy="52" rx="34" ry="44" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.5"/>
                  {[
                    {id:'oeil_g', d:'M48,34 C48,30 56,30 56,34 C56,38 48,38 48,34 Z'},
                    {id:'oeil_d', d:'M24,34 C24,30 32,30 32,34 C32,38 24,38 24,34 Z'},
                    {id:'oreille_g',d:'M74,42 C79,42 80,50 80,56 C80,62 79,68 74,68 L72,68 L72,42 Z'},
                    {id:'oreille_d',d:'M6,42 C1,42 0,50 0,56 C0,62 1,68 6,68 L8,68 L8,42 Z'},
                    {id:'gorge',  d:'M26,78 C26,72 54,72 54,78 C54,84 26,84 26,78 Z'},
                    {id:'nez',    d:'M40,48 L36,62 L44,62 Z'},
                  ].map(z => {
                    const sel = ui.douleur_zones.includes(z.id);
                    return (
                      <g key={z.id} onClick={() => {
                        const zones = sel ? ui.douleur_zones.filter(x=>x!==z.id) : [...ui.douleur_zones, z.id];
                        vals.current.douleur_zones = zones;
                        setUi(p=>({...p, douleur_zones: zones}));
                      }} style={{cursor:'pointer'}}>
                        <path d={z.d} fill={sel?'#f59e0b':'#cbd5e1'} stroke={sel?'#d97706':'#94a3b8'} strokeWidth="1.5"/>
                      </g>
                    );
                  })}
                </svg>
                <div style={{ flex:1, display:'flex', flexDirection:'column', gap:8 }}>
                  {ui.douleur_zones.includes('tete')&&(
                    <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:8, padding:'8px 10px' }}>
                      <div style={{ color:'#dc2626', fontWeight:700, fontSize:11, marginBottom:6 }}>Douleur tete</div>
                      <label style={{...lbl,fontSize:10}}>Nausees ?</label>
                      <div style={{ display:'flex', gap:4, marginBottom:4 }}>
                        {['Oui','Non'].map(v=><Btn key={v} onClick={()=>setU('nausee',v)} style={{flex:1,padding:'4px',borderRadius:5,fontSize:10,fontWeight:600,background:ui.nausee===v?(v==='Oui'?'#ef4444':'#16a34a'):'#fff',color:ui.nausee===v?'#fff':'#374151',border:'1px solid '+(ui.nausee===v?(v==='Oui'?'#ef4444':'#16a34a'):'#e5e7eb')}}>{v}</Btn>)}
                      </div>
                      <label style={{...lbl,fontSize:10}}>Tache sur la peau ?</label>
                      <div style={{ display:'flex', gap:4 }}>
                        {['Oui','Non'].map(v=><Btn key={v} onClick={()=>setU('tache_corps',v)} style={{flex:1,padding:'4px',borderRadius:5,fontSize:10,fontWeight:600,background:ui.tache_corps===v?(v==='Oui'?'#ef4444':'#16a34a'):'#fff',color:ui.tache_corps===v?'#fff':'#374151',border:'1px solid '+(ui.tache_corps===v?(v==='Oui'?'#ef4444':'#16a34a'):'#e5e7eb')}}>{v}</Btn>)}
                      </div>
                      {(ui.nausee==='Oui'||ui.tache_corps==='Oui')&&<div style={{background:'#7f1d1d',borderRadius:6,padding:'6px 8px',marginTop:4,color:'#fff',fontWeight:800,fontSize:11}}>URGENCE — B1 + alerter medecin</div>}
                    </div>
                  )}
                  {(ui.douleur_zones.includes('membre_g')||ui.douleur_zones.includes('thorax'))&&(
                    <div style={{ background:'#fef2f2', border:'2px solid #ef4444', borderRadius:8, padding:'8px 10px' }}>
                      <div style={{ color:'#dc2626', fontWeight:700, fontSize:11 }}>ECG — Alerter medecin</div>
                      <Btn onClick={()=>setU('ecg_fait',!ui.ecg_fait)} style={{marginTop:6,padding:'4px 10px',borderRadius:5,fontSize:10,fontWeight:600,background:ui.ecg_fait?'#16a34a':'#fff',color:ui.ecg_fait?'#fff':'#374151',border:'1px solid '+(ui.ecg_fait?'#16a34a':'#e5e7eb')}}>
                        {ui.ecg_fait?'✓ ECG realise':'ECG a faire'}
                      </Btn>
                    </div>
                  )}
                  {ui.douleur_zones.includes('abdomen')&&ui.sexe==='F'&&ui.age>=12&&(
                    <div style={{ background:'#f5f3ff', border:'1px solid #ddd6fe', borderRadius:8, padding:'8px 10px' }}>
                      <div style={{ color:'#7c3aed', fontWeight:700, fontSize:11, marginBottom:6 }}>Abdo femme</div>
                      <div style={{ display:'flex', gap:4, marginBottom:4 }}>
                        <Btn onClick={()=>setU('bu_fait',!ui.bu_fait)} style={{padding:'4px 8px',borderRadius:5,fontSize:10,fontWeight:600,background:ui.bu_fait?'#7c3aed':'#fff',color:ui.bu_fait?'#fff':'#374151',border:'1px solid '+(ui.bu_fait?'#7c3aed':'#e5e7eb')}}>{ui.bu_fait?'✓ BU':'BU'}</Btn>
                        <Btn onClick={()=>setU('bhcg_fait',!ui.bhcg_fait)} style={{padding:'4px 8px',borderRadius:5,fontSize:10,fontWeight:600,background:ui.bhcg_fait?'#7c3aed':'#fff',color:ui.bhcg_fait?'#fff':'#374151',border:'1px solid '+(ui.bhcg_fait?'#7c3aed':'#e5e7eb')}}>{ui.bhcg_fait?'✓ bHCG':'bHCG'}</Btn>
                      </div>
                      {ui.bu_fait&&<input onChange={e=>{vals.current.bu_resultat=e.target.value;}} style={{...inp,fontSize:11,marginBottom:4}} placeholder="Resultat BU..."/>}
                      {ui.bhcg_fait&&<div style={{display:'flex',gap:4}}>
                        {['Negatif','Positif'].map(r=><Btn key={r} onClick={()=>setU('bhcg_resultat',r)} style={{flex:1,padding:'4px',borderRadius:5,fontSize:10,fontWeight:600,background:ui.bhcg_resultat===r?(r==='Positif'?'#ef4444':'#16a34a'):'#fff',color:ui.bhcg_resultat===r?'#fff':'#374151',border:'1px solid '+(ui.bhcg_resultat===r?(r==='Positif'?'#ef4444':'#16a34a'):'#e5e7eb')}}>bHCG {r}</Btn>)}
                      </div>}
                      {ui.bhcg_resultat==='Positif'&&<div style={{color:'#ef4444',fontWeight:700,fontSize:11,marginTop:4}}>bHCG + — Prevenir medecin</div>}
                    </div>
                  )}
                  <div>
                    <label style={lbl}>Intensite</label>
                    <div style={{ display:'flex', gap:6 }}>
                      {[{id:3,l:'Legere',c:'#16a34a',bg:'#f0fdf4'},{id:6,l:'Moyenne',c:'#f59e0b',bg:'#fffbeb'},{id:9,l:'Intense',c:'#ef4444',bg:'#fef2f2'}].map(o=>(
                        <Btn key={o.id} onClick={()=>setU('douleur_eva',o.id)} style={{flex:1,padding:'10px 6px',borderRadius:8,fontWeight:700,fontSize:13,background:ui.douleur_eva===o.id?o.c:o.bg,color:ui.douleur_eva===o.id?'#fff':o.c,border:'2px solid '+(ui.douleur_eva===o.id?o.c:o.c+'44')}}>
                          {o.l}
                        </Btn>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* FIEVRE */}
          {ui.symptome==='fievre'&&(
            <div style={{ padding:14, background:'#f9fafb', borderRadius:10, border:'1px solid #e5e7eb' }}>
              <label style={lbl}>Fievre depuis ?</label>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:12 }}>
                {['Quelques heures','1 jour','2-3 jours','Plus de 3 jours'].map(d=>(
                  <Btn key={d} onClick={()=>setU('fievre_depuis',d)} style={{padding:'8px 12px',borderRadius:99,fontSize:12,background:ui.fievre_depuis===d?'#0d9488':'#fff',color:ui.fievre_depuis===d?'#fff':'#374151',border:'1px solid '+(ui.fievre_depuis===d?'#0d9488':'#e5e7eb')}}>
                    {d}
                  </Btn>
                ))}
              </div>
              {(ui.fievre_depuis==='2-3 jours'||ui.fievre_depuis==='Plus de 3 jours')&&(
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
                  {[{k:'tdr_palu',l:'TDR Paludisme',pos:'#ef4444'},{k:'tdr_dengue',l:'TDR Dengue',pos:'#f59e0b'}].map(({k,l,pos})=>(
                    <div key={k}>
                      <label style={lbl}>{l}</label>
                      <div style={{ display:'flex', gap:6 }}>
                        {['Negatif','Positif'].map(r=>(
                          <Btn key={r} onClick={()=>setU(k,r)} style={{flex:1,padding:'8px',borderRadius:7,fontSize:11,fontWeight:600,background:ui[k]===r?(r==='Positif'?pos:'#16a34a'):'#fff',color:ui[k]===r?'#fff':'#374151',border:'1.5px solid '+(ui[k]===r?(r==='Positif'?pos:'#16a34a'):'#e5e7eb')}}>
                            {r==='Positif'?'✗ Positif':'✓ Négatif'}
                          </Btn>
                        ))}
                      </div>
                      {ui[k]==='Positif'&&<div style={{color:pos,fontSize:11,marginTop:3,fontWeight:600}}>{l.replace('TDR ','')} + — Prévenir médecin</div>}
                    </div>
                  ))}
                  <div>
                    <label style={lbl}>CRP test</label>
                    <div style={{display:'flex',gap:6}}>
                      {['Négatif','Positif'].map(r=>(
                        <Btn key={r} onClick={()=>setU('crp_test',r)} style={{flex:1,padding:'8px',borderRadius:7,fontSize:11,fontWeight:600,background:ui.crp_test===r?(r==='Positif'?'#ef4444':'#16a34a'):'#fff',color:ui.crp_test===r?'#fff':'#374151',border:'1.5px solid '+(ui.crp_test===r?(r==='Positif'?'#ef4444':'#16a34a'):'#e5e7eb')}}>
                          {r==='Positif'?'✗ Positif':'✓ Négatif'}
                        </Btn>
                      ))}
                    </div>
                    {ui.crp_test==='Positif'&&<div style={{color:'#ef4444',fontSize:11,marginTop:3,fontWeight:600}}>CRP + — Prévenir médecin</div>}
                  </div>
                </div>
              )}
              {(ui.fievre_depuis==='Quelques heures'||ui.fievre_depuis==='1 jour')&&(
                <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:8, padding:'8px 12px' }}>
                  <div style={{ color:'#16a34a', fontSize:12 }}>Fievre recente — TDR non indique avant 3 jours</div>
                </div>
              )}
            </div>
          )}

          {/* VERTIGE */}
          {ui.symptome==='vertige'&&(
            <div style={{ padding:14, background:'#eff6ff', borderRadius:10, border:'1px solid #bfdbfe' }}>
              <div style={{ color:'#1d4ed8', fontWeight:700, fontSize:13, marginBottom:10 }}>Realiser dextro et hemocue</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <div>
                  <label style={lbl}>Dextro (g/L)</label>
                  <input inputMode="decimal" onChange={e=>{vals.current.dextro=e.target.value;setUi(p=>({...p,dextro:e.target.value}));}} style={inp} placeholder="--"/>
                  {ui.dextro&&parseFloat(ui.dextro)<0.5&&<div style={{color:'#ef4444',fontSize:11,marginTop:3,fontWeight:700,background:'#fef2f2',padding:'4px 8px',borderRadius:5}}>HYPOGLYCEMIE SEVERE — B1 + alerter medecin</div>}
                  {ui.dextro&&parseFloat(ui.dextro)>=0.5&&parseFloat(ui.dextro)<0.7&&<div style={{color:'#ef4444',fontSize:11,marginTop:3,fontWeight:600}}>Hypoglycemie — Alerter medecin</div>}
                  {ui.dextro&&parseFloat(ui.dextro)>2&&parseFloat(ui.dextro)<=2.5&&<div style={{color:'#f59e0b',fontSize:11,marginTop:3,fontWeight:600}}>Hyperglycemie — Prevenir medecin</div>}
                  {ui.dextro&&parseFloat(ui.dextro)>2.5&&(
                    <div style={{marginTop:4}}>
                      <div style={{color:'#ef4444',fontSize:11,fontWeight:700,background:'#fef2f2',padding:'4px 8px',borderRadius:5,marginBottom:6}}>Cétonémie + prévenir médecin</div>
                      <label style={{...lbl,fontSize:10}}>Cétonémie (mmol/L)</label>
                      <input inputMode="decimal" onChange={e=>{vals.current.cetonemie=e.target.value;setUi(p=>({...p,cetonemie:e.target.value}));}}
                        style={{...inp,fontSize:16}} placeholder="--"/>
                      {ui.cetonemie&&parseFloat(ui.cetonemie)>=3&&<div style={{color:'#ef4444',fontSize:11,marginTop:3,fontWeight:700,background:'#fef2f2',padding:'4px 8px',borderRadius:5}}>Cétonémie ≥ 3 — URGENCE acido-cétose — Alerter médecin</div>}
                      {ui.cetonemie&&parseFloat(ui.cetonemie)>=1&&parseFloat(ui.cetonemie)<3&&<div style={{color:'#f59e0b',fontSize:11,marginTop:3,fontWeight:600}}>Cétonémie modérée — Prévenir médecin</div>}
                      {ui.cetonemie&&parseFloat(ui.cetonemie)<1&&<div style={{color:'#16a34a',fontSize:11,marginTop:3,fontWeight:600}}>Cétonémie normale</div>}
                    </div>
                  )}
                </div>
                <div>
                  <label style={lbl}>Hemocue (g/dL)</label>
                  <input inputMode="decimal" onChange={e=>{vals.current.hemocue=e.target.value;setUi(p=>({...p,hemocue:e.target.value}));}} style={inp} placeholder="--"/>
                  {ui.hemocue&&parseFloat(ui.hemocue)<7&&<div style={{color:'#ef4444',fontSize:11,marginTop:3,fontWeight:700,background:'#fef2f2',padding:'4px 8px',borderRadius:5}}>ANEMIE SEVERE — Allonger B1/L1 + alerter medecin</div>}
                  {ui.hemocue&&parseFloat(ui.hemocue)>=7&&parseFloat(ui.hemocue)<=10.9&&<div style={{color:'#ef4444',fontSize:11,marginTop:3,fontWeight:600}}>Anemie {ui.hemocue} — Prevenir medecin</div>}
                  {ui.hemocue&&parseFloat(ui.hemocue)>10.9&&<div style={{color:'#16a34a',fontSize:11,marginTop:3,fontWeight:600}}>Hemoglobine normale</div>}
                </div>
              </div>
            </div>
          )}

          {/* PLAIE */}
          {ui.symptome==='plaie'&&(
            <div style={{ padding:14, background:'#f9fafb', borderRadius:10, border:'1px solid #e5e7eb' }}>
              <label style={lbl}>Carnet de vaccination</label>
              <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:10 }}>
                {[['ok','Carnet lisible — vaccin a jour','#16a34a','✓'],['illisible','Carnet illisible / incomplet','#f59e0b','⚠️'],['absent','Pas de carnet','#ef4444','✗']].map(([v,l,c,ic])=>(
                  <Btn key={v} onClick={()=>setU('plaie_vaccin',v)} style={{padding:'10px 14px',borderRadius:8,fontSize:12,fontWeight:600,textAlign:'left',display:'flex',alignItems:'center',gap:8,background:ui.plaie_vaccin===v?c+'15':'#fff',color:ui.plaie_vaccin===v?c:'#374151',border:'2px solid '+(ui.plaie_vaccin===v?c:'#e5e7eb')}}>
                    <span style={{fontSize:14}}>{ic}</span>{l}
                  </Btn>
                ))}
              </div>
              {(ui.plaie_vaccin==='illisible'||ui.plaie_vaccin==='absent')&&(
                <div style={{ background:'#fffbeb', border:'2px solid #f59e0b', borderRadius:10, padding:12 }}>
                  <div style={{ color:'#d97706', fontWeight:700, fontSize:12, marginBottom:8 }}>Quick Test Tetanos</div>
                  <div style={{ display:'flex', gap:6 }}>
                    {['Negatif','Positif'].map(r=>(
                      <Btn key={r} onClick={()=>setU('quicktest',r)} style={{flex:1,padding:'8px',borderRadius:7,fontSize:12,fontWeight:700,background:ui.quicktest===r?(r==='Positif'?'#ef4444':'#16a34a'):'#fff',color:ui.quicktest===r?'#fff':'#374151',border:'1.5px solid '+(ui.quicktest===r?(r==='Positif'?'#ef4444':'#16a34a'):'#e5e7eb')}}>
                        {r==='Negatif'?'✓ Negatif':'✗ Positif'}
                      </Btn>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* AUTRE */}
          {ui.symptome==='autre'&&(
            <div style={{ padding:14, background:'#f9fafb', borderRadius:10, border:'1px solid #e5e7eb' }}>
              <label style={lbl}>Decrivez le motif</label>
              <textarea onChange={e=>{vals.current.symptome_autre=e.target.value;}}
                placeholder="Ex: eruption cutanee, douleur dentaire..." rows={3}
                style={{...inp,resize:'vertical'}}/>
            </div>
          )}
        </div>

        {/* PLACEMENT */}
        {placement&&(
          <div style={{ background:placement.urgence?'#fef2f2':'#f0fdfa', border:'2px solid '+(placement.urgence?'#ef4444':'#0d9488'), borderRadius:12, padding:'1rem 1.25rem', marginBottom:12 }}>
            <div style={{ fontSize:11, fontWeight:700, color:placement.urgence?'#dc2626':'#0d9488', textTransform:'uppercase', letterSpacing:1, marginBottom:6 }}>
              {placement.urgence?'Placement urgent':'Placement suggere'}
            </div>
            <div style={{ fontWeight:700, fontSize:16, color:'#111827' }}>{placement.label}</div>
            {placement.msg&&<div style={{ color:'#6b7280', fontSize:13, marginTop:6 }}>{placement.msg}</div>}
          </div>
        )}

        {/* NOTES */}
        <div style={{ background:'#fff', borderRadius:12, border:'1px solid #e5e7eb', padding:'1.25rem', marginBottom:12 }}>
          <label style={lbl}>Notes (optionnel)</label>
          <textarea onChange={e=>{vals.current.notes=e.target.value;}}
            placeholder="Observations particulieres..." rows={2}
            style={{...inp,resize:'vertical'}}/>
        </div>

        {/* BOUTONS */}
        <Btn onClick={() => enregistrer(null)} disabled={!canSubmit}
          style={{ width:'100%', padding:'14px', borderRadius:12, marginBottom:8,
            background: canSubmit?'#0d9488':'#e5e7eb',
            color: canSubmit?'#fff':'#9ca3af',
            fontSize:15, fontWeight:700, border:'none' }}>
          Enregistrer le patient
        </Btn>

        {canSubmit&&(
          <div style={{ textAlign:'center', marginBottom:8 }}>
            <Btn onClick={() => setUi(p=>({...p, showEmplacement:!p.showEmplacement}))}
              style={{ background:'none', border:'none', color:'#9ca3af', fontSize:12, textDecoration:'underline', padding:0 }}>
              Choisir un emplacement different {ui.showEmplacement?'▲':'▼'}
            </Btn>
            {ui.showEmplacement&&(
              <div style={{ marginTop:10, padding:12, background:'#f9fafb', borderRadius:10, border:'1px solid #e5e7eb', textAlign:'left' }}>
                <div style={{ fontSize:12, color:'#6b7280', marginBottom:8, fontWeight:600 }}>Selectionner un emplacement :</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                  {EMPLACEMENTS.map(({id,l,c})=>{
                    const prise = placesOccupees.includes(id);
                    return (
                      <Btn key={id} onClick={()=>{ if(!prise) enregistrer(id); }}
                        style={{ padding:'8px 14px', borderRadius:8, fontSize:12, fontWeight:600,
                          background: prise ? '#f3f4f6' : '#fff',
                          border: '2px solid '+(prise?'#e5e7eb':c),
                          color: prise ? '#9ca3af' : c,
                          opacity: prise ? 0.5 : 1,
                          cursor: prise ? 'not-allowed' : 'pointer',
                          textDecoration: prise ? 'line-through' : 'none'
                        }}>
                        {l}{prise?' (occupee)':''}
                      </Btn>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Composant constante stable
const ConstCell = memo(forwardRef(function ConstCell({label, unit, isBad, onChange, autoLen, nextRef}, ref) {
  return (
    <div style={{ background:'#f9fafb', borderRadius:10, padding:'10px 12px', border:'1px solid #e5e7eb' }}>
      <label style={{ fontSize:11, color:'#9ca3af', fontWeight:600, display:'block', marginBottom:4 }}>{label} <span style={{fontSize:10}}>{unit}</span></label>
      <input ref={el=>{ if(ref) ref.current=el; }} inputMode="decimal" placeholder="--"
        onChange={e => {
          const v = e.target.value;
          const bad = v && isBad(v);
          e.target.style.color = v ? (bad?'#ef4444':'#16a34a') : '#d1d5db';
          onChange(v);
          const digits = v.replace(',','.').replace(/[^0-9]/g,'');
          if (autoLen && digits.length >= autoLen) {
            nextRef?.current?.focus();
          }
        }}
        onKeyDown={e => { if(e.key==='Enter' && nextRef) nextRef.current?.focus(); }}
        style={{ width:'100%', border:'none', background:'transparent', fontSize:22, fontWeight:700, outline:'none', padding:0, color:'#d1d5db' }}/>
    </div>
  );
}));

// PAM et IMC ne sont pas des composants séparés - affichés dans le parent
