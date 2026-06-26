'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

function calcAge(ddn) {
  if (!ddn) return null;
  const diff = Date.now() - new Date(ddn).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

function calcIMC(poids, taille) {
  const p = parseFloat(poids), t = parseFloat(taille) / 100;
  if (!p || !t) return null;
  const imc = p / (t * t);
  let grade = '';
  if (imc < 18.5) grade = 'Maigreur';
  else if (imc < 25) grade = 'Normal';
  else if (imc < 30) grade = 'Surpoids';
  else if (imc < 35) grade = 'Obesite grade 1';
  else if (imc < 40) grade = 'Obesite grade 2';
  else grade = 'Obesite grade 3';
  return { val: imc.toFixed(1), grade };
}

// Couleurs constantes
function couleurFC(v) {
  const n = parseFloat(v); if (isNaN(n)) return null;
  if (n >= 50 && n <= 90) return 'green';
  if (n > 90 && n <= 105) return 'orange';
  return 'red';
}
function couleurSat(v) {
  const n = Math.round(parseFloat(v)); if (isNaN(n)) return null;
  if (n > 94) return 'green';
  if (n >= 90) return 'orange';
  return 'red';
}
function couleurTAS(v) {
  const n = parseFloat(v); if (isNaN(n)) return null;
  if (n >= 100 && n <= 140) return 'green';
  if ((n > 140 && n <= 179) || (n < 100 && n >= 80)) return 'orange';
  return 'red';
}
function couleurTAD(v) {
  const n = parseFloat(v); if (isNaN(n)) return null;
  if (n >= 60 && n <= 90) return 'green';
  if ((n > 90 && n <= 110) || (n >= 50 && n < 60)) return 'orange';
  return 'red';
}
function couleurTemp(v) {
  const n = parseFloat(v); if (isNaN(n)) return null;
  if (n >= 36 && n <= 37.9) return 'green';
  if (n >= 38 && n <= 39) return 'orange';
  return 'red';
}

const COLORS = { green:'#16a34a', orange:'#f59e0b', red:'#ef4444' };
const BG = { green:'#f0fdf4', orange:'#fffbeb', red:'#fef2f2' };
const BORDER = { green:'#bbf7d0', orange:'#fde68a', red:'#fecaca' };

function StatCard({ label, value, unit, couleur, icon }) {
  const c = couleur ? COLORS[couleur] : '#6b7280';
  const bg = couleur ? BG[couleur] : '#f9fafb';
  const border = couleur ? BORDER[couleur] : '#e5e7eb';
  return (
    <div style={{ background: bg, border: '1px solid ' + border, borderRadius: 10, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
          <span>{icon}</span><span style={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</span>
        </div>
        {value ? (
          <div style={{ fontSize: 20, fontWeight: 700, color: c }}>{value} <span style={{ fontSize: 13, fontWeight: 400, color: '#9ca3af' }}>{unit}</span></div>
        ) : (
          <div style={{ fontSize: 16, color: '#d1d5db' }}>--</div>
        )}
      </div>
    </div>
  );
}

const SYMPTOMES = [
  { id: 'coma', label: 'Coma / Inconscience', icon: '🚨' },
  { id: 'detresse_respi', label: 'Detresse respi', icon: '😮' },
  { id: 'asthme', label: 'Asthme', icon: '💨' },
  { id: 'douleur', label: 'Douleur', icon: '😣' },
  { id: 'fievre', label: 'Fievre', icon: '🌡️' },
  { id: 'vertige', label: 'Vertige / Malaise', icon: '💫' },
  { id: 'plaie', label: 'Plaie', icon: '🩹' },
  { id: 'autre', label: 'Autre', icon: '?' },
];

const ZONES_CORPS = [
  { id: 'tete', label: 'Tete' },
  { id: 'oreille_g', label: 'Oreille gauche' },
  { id: 'oreille_d', label: 'Oreille droite' },
  { id: 'bouche', label: 'Bouche / Gorge' },
  { id: 'cou', label: 'Cou' },
  { id: 'thorax', label: 'Thorax' },
  { id: 'bras_g', label: 'Bras gauche' },
  { id: 'bras_d', label: 'Bras droit' },
  { id: 'abdomen', label: 'Abdomen' },
  { id: 'oge', label: 'OGE' },
  { id: 'jambe_g', label: 'Jambe gauche' },
  { id: 'jambe_d', label: 'Jambe droite' },
];

function dureePresence(ts) {
  const m = Math.floor((Date.now() - ts) / 60000);
  return m < 60 ? m + 'min' : 'H' + Math.floor(m / 60) + (m % 60 > 0 ? 'h' + (m % 60) : '');
}

// v2
export default function PageAS() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [patients, setPatients] = useState([]);
  const [vue, setVue] = useState('nouveau');
  const [showVue, setShowVue] = useState(false);

  const [form, setForm] = useState({
    sexe: '', nom: '', prenom: '', ddn: '', ipp: '',
    allergie: '', allergie_detail: '',
    medicaments_today: '', medicaments_detail: '',
    fc: '', sat: '', tas: '', tad: '', temp: '', poids: '', taille: '',
    symptome: '', symptome_autre: '', signe_lutte: '', respire: '', dextro: '', hemocue: '',
    douleur_zones: [], douleur_eva: 5, nausee: '', tache_corps: '', fievre_jours: '', bu_resultat: '', bhcg_resultat: '',
    fievre_depuis: '',
    plaie_vaccin: '', quicktest: '',
    ecg_fait: false, bu_fait: false, bhcg_fait: false,
    notes: '',
  });

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  const load = useCallback(async () => {
    const r = await fetch('/api/patients');
    const d = await r.json();
    setPatients(d.patients || []);
  }, []);

  useEffect(() => {
    const s = sessionStorage.getItem('pds_user');
    if (!s) { router.push('/login'); return; }
    const u = JSON.parse(s);
    setUser(u);
    load();
    const iv = setInterval(load, 15000);
    return () => clearInterval(iv);
  }, []);

  const age = calcAge(form.ddn);
  const imc = calcIMC(form.poids, form.taille);

  const cfcCol = couleurFC(form.fc);
  const csatCol = couleurSat(form.sat);
  const ctasCol = couleurTAS(form.tas);
  const ctadCol = couleurTAD(form.tad);
  const ctempCol = couleurTemp(form.temp);

  const urgenceVitale = form.symptome === 'coma' ||
    csatCol === 'red' ||
    (form.symptome === 'detresse_respi' && csatCol !== 'green') ||
    (form.symptome === 'douleur' && form.douleur_zones.includes('thorax'));

  // Algorithme de placement
  function calcPlacement() {
    const s = form.symptome;
    const sat = parseFloat(form.sat);
    const emps = patients.map(p => p.emplacement);
    const libre = id => !emps.includes(id);

    if (s === 'coma' || (s === 'douleur' && form.douleur_zones.includes('thorax'))) {
      return { place: 'brancard1', label: 'B1 - Brancard 1', urgence: true, msg: null };
    }
    if (s === 'detresse_respi') {
      if (sat < 95 || form.signe_lutte === true) {
        const place = libre('brancard1') ? 'brancard1' : 'brancard2';
        return { place, label: place==='brancard1'?'B1 - Brancard 1':'B2 - Brancard 2', urgence: true, msg: 'Position demi-assise. ALERTER MEDECIN.' };
      }
      const place = libre('fauteuil1') ? 'fauteuil1' : libre('fauteuil2') ? 'fauteuil2' : 'obs1';
      return { place, label: 'Fauteuil - Position demi-assise', urgence: false, msg: 'Installer en position demi-assise. Surveillance saturation.' };
    }
    if (s === 'asthme') {
      if (sat >= 95 && form.signe_lutte !== true) {
        return { place: 'obs1', label: 'O1 - Observation', urgence: false, msg: 'Aerosol sur AIR : Ventoline + Atrovent x1, puis 2x Ventoline. Reevaluation apres chaque aerosol.' };
      } else {
        const place = libre('fauteuil1') ? 'fauteuil1' : 'fauteuil2';
        return { place, label: place==='fauteuil1'?'F1 - Fauteuil 1':'F2 - Fauteuil 2', urgence: true, msg: 'Scope + O2 5L. Aerosol sous O2 : Ventoline + Atrovent x1, puis 2x Ventoline. Surveillance saturation.' };
      }
    }
    if (s === 'plaie') {
      if (libre('brancard1') && libre('brancard2')) return { place: 'brancard2', label: 'B2 - Brancard 2', urgence: false, msg: null };
      return { place: 'pansement', label: 'P1 - Pansement', urgence: false, msg: null };
    }

    const hasRedConst = [cfcCol, csatCol, ctasCol, ctadCol, ctempCol].includes('red');
    const hasOrangeConst = [cfcCol, csatCol, ctasCol, ctadCol, ctempCol].includes('orange');

    if (!hasRedConst && !hasOrangeConst && s !== 'coma') {
      return { place: 'preau', label: 'Salle d\'attente dehors', urgence: false, msg: 'Constantes normales - faire patienter dehors.' };
    }

    if (hasRedConst) {
      if (libre('brancard1')) return { place: 'brancard1', label: 'B1 - Brancard 1', urgence: true, msg: null };
      if (libre('brancard2')) return { place: 'brancard2', label: 'B2 - Brancard 2', urgence: true, msg: null };
    }

    if (libre('lit1')) return { place: 'lit1', label: 'L1 - Lit 1', urgence: false, msg: null };
    if (libre('lit2')) return { place: 'lit2', label: 'L2 - Lit 2', urgence: false, msg: null };
    if (libre('obs1')) return { place: 'obs1', label: 'O1 - Observation', urgence: false, msg: null };
    return { place: 'preau', label: 'Salle d\'attente dehors', urgence: false, msg: 'Toutes les places sont occupees - faire patienter dehors.' };
  }

  const placement = form.symptome ? calcPlacement() : null;

  async function creerPatient() {
    const p = placement || { place: 'preau' };
    const patient = {
      ...form,
      age,
      statut: p.place === 'preau' ? 'preau' : 'attente_medecin',
      emplacement: p.place === 'preau' ? null : p.place,
      emplacement_suggere: p.place,
      creePar: user.matricule,
    };
    const r = await fetch('/api/patients', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create', patient })
    });
    const d = await r.json();
    if (d.ok) {
      setPatients(d.patients);
      setVue('liste');
      setForm({ sexe:'',nom:'',prenom:'',ddn:'',ipp:'',allergie:'',allergie_detail:'',medicaments_today:'',medicaments_detail:'',fc:'',sat:'',tas:'',tad:'',temp:'',poids:'',taille:'',symptome:'',symptome_autre:'',signe_lutte:'',respire:'',dextro:'',hemocue:'',douleur_zones:[],douleur_eva:5,nausee:'',tache_corps:'',fievre_jours:'',bu_resultat:'',bhcg_resultat:'',fievre_depuis:'',plaie_vaccin:'',quicktest:'',ecg_fait:false,bu_fait:false,bhcg_fait:false,notes:'' });
    }
  }

  if (!user) return null;

  const inp = { width:'100%', padding:'10px 12px', borderRadius:8, border:'1.5px solid #e5e7eb', fontSize:14, outline:'none', background:'#fff', color:'#111827', boxSizing:'border-box' };
  const lbl = { fontSize:12, fontWeight:600, color:'#6b7280', display:'block', marginBottom:5, textTransform:'uppercase', letterSpacing:0.5 };

  return (
    <div style={{ minHeight:'100vh', background:'#f3f4f6', fontFamily:'system-ui' }}>

      {/* NAV */}
      <nav style={{ background:'#fff', borderBottom:'1px solid #e5e7eb', padding:'0 1.5rem', display:'flex', alignItems:'center', justifyContent:'space-between', height:56, flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:32, height:32, borderRadius:'50%', background:'#f59e0b', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:14, fontWeight:700 }}>AS</div>
          <div>
            <div style={{ fontWeight:700, fontSize:15, color:'#111827' }}>PDS Kahani</div>
            <div style={{ fontSize:10, color:'#6b7280' }}>Aide-soignant</div>
          </div>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <span style={{ fontSize:13, color:'#6b7280' }}>{user.nom}</span>
          <button onClick={() => setShowVue(true)} style={{ padding:'7px 14px', borderRadius:8, background:'#f0fdfa', color:'#0d9488', fontSize:12, border:'1px solid #99f6e4', cursor:'pointer', fontWeight:600 }}>Vue ensemble</button>
          <button onClick={() => router.push('/admin')} style={{ padding:'7px 14px', borderRadius:8, background:'#f3f4f6', color:'#6b7280', fontSize:12, border:'1px solid #e5e7eb', cursor:'pointer' }}>Ajouter agent</button>
          <button onClick={() => router.push('/stats')} style={{ padding:'7px 14px', borderRadius:8, background:'#f9fafb', color:'#6b7280', fontSize:12, border:'1px solid #e5e7eb', cursor:'pointer' }}>Recap session</button>
          <button onClick={() => { sessionStorage.clear(); router.push('/login'); }} style={{ padding:'7px 14px', borderRadius:8, background:'#f3f4f6', color:'#6b7280', fontSize:12, border:'1px solid #e5e7eb', cursor:'pointer' }}>Deconnexion</button>
        </div>
      </nav>

      {vue === 'liste' && (
        <div style={{ maxWidth:700, margin:'0 auto', padding:'1.5rem' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <h2 style={{ fontSize:18, fontWeight:700, color:'#111827' }}>Patients ({patients.length})</h2>
            <button onClick={() => setVue('nouveau')} style={{ padding:'10px 20px', borderRadius:10, background:'#0d9488', color:'#fff', fontSize:14, fontWeight:600, cursor:'pointer' }}>
              + Nouveau patient
            </button>
          </div>
          {patients.length === 0 ? (
            <div style={{ textAlign:'center', padding:'4rem 0', background:'#fff', borderRadius:12, border:'1px solid #e5e7eb' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" style={{margin:'0 auto 10px',display:'block',opacity:0.2}}>
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <div style={{color:'#9ca3af',fontSize:13}}>Aucun patient en ce moment</div>
            </div>
          ) : patients.map(p => (
            <div key={p.id} style={{ background:'#fff', border:'1px solid #e5e7eb', borderRadius:12, padding:'14px 16px', marginBottom:8, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ fontWeight:700, color:'#111827', fontSize:15 }}>{p.nom} {p.prenom} <span style={{ color:'#9ca3af', fontWeight:400, fontSize:13 }}>{p.age} ans</span></div>
                <div style={{ color:'#6b7280', fontSize:12, marginTop:2 }}>{p.symptome || p.motifPrincipal} · {p.statut==='preau'?"Salle d'attente dehors":p.emplacement||'--'}</div>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <span style={{ fontSize:11, color:'#9ca3af' }}>{dureePresence(parseInt(p.arrivee))}</span>
                <button onClick={async()=>{
                  if(!confirm('Supprimer '+p.nom+' '+p.prenom+' ?')) return;
                  await fetch('/api/patients',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'delete',id:p.id})});
                  load();
                }} style={{padding:'4px 10px',borderRadius:6,background:'#fef2f2',color:'#dc2626',fontSize:11,fontWeight:600,border:'1px solid #fecaca',cursor:'pointer'}}>
                  Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {vue === 'nouveau' && (
        <div style={{ maxWidth:820, margin:'0 auto', padding:'1.5rem' }}>

          {/* ALERTE URGENCE VITALE */}
          {urgenceVitale && (
            <div style={{ background:'#7f1d1d', border:'2px solid #ef4444', borderRadius:12, padding:'16px 20px', marginBottom:16, display:'flex', alignItems:'center', gap:12, animation:'pulse 1s infinite' }}>
              <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.7}}`}</style>
              <span style={{ fontSize:28 }}>🚨</span>
              <div>
                <div style={{ color:'#fff', fontWeight:800, fontSize:18 }}>URGENCE VITALE - Alerter le medecin immediatement</div>
                {form.symptome === 'coma' && <div style={{ color:'#fca5a5', fontSize:13, marginTop:4 }}>Verifier que le patient respire. Si non : allonger, appeler le medecin, commencer massage cardiaque.</div>}
                {form.douleur_zones?.includes('thorax') && <div style={{ color:'#fca5a5', fontSize:13, marginTop:4 }}>Douleur thoracique : allonger le patient et preparer l'ECG.</div>}
              </div>
            </div>
          )}

          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
            <h2 style={{ fontSize:18, fontWeight:700, color:'#111827' }}>Nouveau patient</h2>
            <button onClick={() => setVue('liste')} style={{ padding:'7px 14px', borderRadius:8, background:'#f3f4f6', color:'#6b7280', fontSize:13, border:'1px solid #e5e7eb', cursor:'pointer' }}>Annuler</button>
          </div>

          {/* IDENTITE */}
          <div style={{ background:'#fff', borderRadius:12, border:'1px solid #e5e7eb', padding:'1.25rem', marginBottom:12 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
              <span style={{ fontSize:18 }}>👤</span>
              <span style={{ fontWeight:700, fontSize:15, color:'#111827' }}>Identite</span>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div style={{ gridColumn:'1/-1' }}>
                <label style={lbl}>Sexe</label>
                <div style={{ display:'flex', gap:8 }}>
                  {[['M','Homme','👨'],['F','Femme','👩']].map(([v,l,e]) => (
                    <button key={v} onClick={() => set('sexe', v)} style={{ flex:1, padding:'10px', borderRadius:8, background:form.sexe===v?'#0d9488':'#f9fafb', color:form.sexe===v?'#fff':'#374151', border:'1.5px solid '+(form.sexe===v?'#0d9488':'#e5e7eb'), fontSize:14, fontWeight:600, cursor:'pointer' }}>
                      {e} {l}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={lbl}>Nom</label>
                <input value={form.nom} onChange={e=>set('nom',e.target.value.toUpperCase())} placeholder="NOM" style={{...inp,textTransform:'uppercase'}}/>
              </div>
              <div>
                <label style={lbl}>Prenom</label>
                <input value={form.prenom} onChange={e=>set('prenom',e.target.value)} placeholder="Prenom" style={inp}/>
              </div>
              <div>
                <label style={lbl}>Date de naissance</label>
                <input type="date" value={form.ddn} onChange={e=>set('ddn',e.target.value)} style={inp}/>
                {age !== null && <div style={{color:'#0d9488',fontSize:12,marginTop:4,fontWeight:600}}>{age} ans</div>}
              </div>
              <div>
                <label style={lbl}>IPP DxCare</label>
                <input value={form.ipp} onChange={e=>set('ipp',e.target.value)} placeholder="Numero IPP" style={inp}/>
              </div>
            </div>
          </div>

          {/* CONSTANTES */}
          <div style={{ background:'#fff', borderRadius:12, border:'1px solid #e5e7eb', padding:'1.25rem', marginBottom:12 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
              <span style={{ fontSize:18 }}>📊</span>
              <span style={{ fontWeight:700, fontSize:15, color:'#111827' }}>Constantes vitales</span>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:12 }}>
              {[
                {k:'fc',l:'FC',u:'bpm',icon:'❤️',col:cfcCol,ph:'75'},
                {k:'sat',l:'SpO2',u:'%',icon:'💧',col:csatCol,ph:'98'},
                {k:'temp',l:'Temperature',u:'°C',icon:'🌡️',col:ctempCol,ph:'37.0'},
                {k:'tas',l:'PAS',u:'mmHg',icon:'🩸',col:ctasCol,ph:'120'},
                {k:'tad',l:'PAD',u:'mmHg',icon:'🩸',col:ctadCol,ph:'80'},
              ].map(({k,l,u,icon,col,ph}) => (
                <div key={k} style={{background:col?BG[col]:'#f9fafb',border:'1px solid '+(col?BORDER[col]:'#e5e7eb'),borderRadius:10,padding:'10px 12px'}}>
                  <div style={{fontSize:10,color:'#9ca3af',marginBottom:6,display:'flex',alignItems:'center',gap:4,textTransform:'uppercase',letterSpacing:0.5}}>
                    <span>{icon}</span><span>{l}</span>
                  </div>
                  <input type="number" step={k==='sat'||k==='fc'?'1':'0.1'} value={form[k]} onChange={e=>set(k,e.target.value)} placeholder="--"
                    style={{width:'100%',border:'none',background:'transparent',fontSize:20,fontWeight:700,color:form[k]?(col?COLORS[col]:'#111827'):'#d1d5db',outline:'none',padding:0}}/>
                  <div style={{fontSize:10,color:'#9ca3af',marginTop:2}}>{u}</div>
                  {col==='red'&&<div style={{fontSize:9,color:COLORS.red,marginTop:3,fontWeight:600}}>ANOMALIE</div>}
                  {col==='orange'&&<div style={{fontSize:9,color:COLORS.orange,marginTop:3,fontWeight:600}}>A SURVEILLER</div>}
                </div>
              ))}

              {/* PAM */}
              <div style={{background:'#f0fdfa',border:'1px solid #99f6e4',borderRadius:10,padding:'10px 12px'}}>
                <div style={{fontSize:10,color:'#9ca3af',marginBottom:6,display:'flex',alignItems:'center',gap:4,textTransform:'uppercase',letterSpacing:0.5}}>
                  <span>💉</span><span>PAM</span>
                </div>
                {form.tas && form.tad ? (() => {
                  const pam = Math.round(parseFloat(form.tad) + (parseFloat(form.tas) - parseFloat(form.tad)) / 3);
                  const critique = pam < 65;
                  return <>
                    <div style={{fontSize:20,fontWeight:700,color:critique?'#ef4444':'#0d9488'}}>{pam} <span style={{fontSize:13,fontWeight:400,color:'#9ca3af'}}>mmHg</span></div>
                    {critique && <div style={{fontSize:9,color:'#ef4444',fontWeight:700,marginTop:2}}>CHOC - ALERTER MEDECIN</div>}
                  </>;
                })() : <div style={{fontSize:16,color:'#d1d5db'}}>--</div>}
                <div style={{fontSize:10,color:'#9ca3af',marginTop:2}}>TAD + (TAS-TAD)/3</div>
              </div>
            </div>

            {/* Poids / Taille / IMC */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10}}>
              <div>
                <label style={lbl}>Poids (kg)</label>
                <input type="number" value={form.poids} onChange={e=>set('poids',e.target.value)} placeholder="--" style={inp}/>
              </div>
              <div>
                <label style={lbl}>Taille (cm)</label>
                <input type="number" value={form.taille} onChange={e=>set('taille',e.target.value)} placeholder="--" style={inp}/>
              </div>
              <div>
                <label style={lbl}>IMC</label>
                {imc ? (
                  <div style={{background:imc.val>=30?'#fef2f2':imc.val<18.5?'#fef2f2':'#f9fafb',border:'1px solid #e5e7eb',borderRadius:8,padding:'10px 12px'}}>
                    <div style={{fontSize:20,fontWeight:700,color:imc.val>=30||imc.val<18.5?'#ef4444':'#0d9488'}}>{imc.val}</div>
                    <div style={{fontSize:11,color:'#6b7280',marginTop:2}}>{imc.grade}</div>
                  </div>
                ) : <div style={{background:'#f9fafb',border:'1px solid #e5e7eb',borderRadius:8,padding:'10px 12px',color:'#d1d5db',fontSize:14}}>--</div>}
              </div>
            </div>
          </div>

          {/* ALLERGIE + MEDICAMENTS */}
          <div style={{ background:'#fff', borderRadius:12, border:'1px solid #e5e7eb', padding:'1.25rem', marginBottom:12 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
              <span style={{ fontSize:18 }}>⚠️</span>
              <span style={{ fontWeight:700, fontSize:15, color:'#111827' }}>Allergies et traitements</span>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div>
                <label style={lbl}>Allergie connue ?</label>
                <div style={{display:'flex',gap:6}}>
                  {['Oui','Non','Inconnu'].map(v=>(
                    <button key={v} onClick={()=>set('allergie',v)} style={{flex:1,padding:'8px',borderRadius:8,background:form.allergie===v?(v==='Oui'?'#fef2f2':'#f9fafb'):'#f9fafb',border:'1.5px solid '+(form.allergie===v?(v==='Oui'?'#ef4444':'#0d9488'):'#e5e7eb'),color:form.allergie===v?(v==='Oui'?'#ef4444':'#0d9488'):'#374151',fontSize:13,fontWeight:600,cursor:'pointer'}}>
                      {v}
                    </button>
                  ))}
                </div>
                {form.allergie==='Oui'&&<input value={form.allergie_detail} onChange={e=>set('allergie_detail',e.target.value)} placeholder="Preciser..." style={{...inp,marginTop:8,borderColor:'#ef4444'}}/>}
              </div>
              <div>
                <label style={lbl}>Medicaments pris aujourd'hui ?</label>
                <div style={{display:'flex',gap:6}}>
                  {['Oui','Non'].map(v=>(
                    <button key={v} onClick={()=>set('medicaments_today',v)} style={{flex:1,padding:'8px',borderRadius:8,background:form.medicaments_today===v?'#f0fdfa':'#f9fafb',border:'1.5px solid '+(form.medicaments_today===v?'#0d9488':'#e5e7eb'),color:form.medicaments_today===v?'#0d9488':'#374151',fontSize:13,fontWeight:600,cursor:'pointer'}}>
                      {v}
                    </button>
                  ))}
                </div>
                {form.medicaments_today==='Oui'&&<input value={form.medicaments_detail} onChange={e=>set('medicaments_detail',e.target.value)} placeholder="Lesquels ?" style={{...inp,marginTop:8}}/>}
              </div>
            </div>
          </div>

          {/* SYMPTOME */}
          <div style={{ background:'#fff', borderRadius:12, border:'1px solid #e5e7eb', padding:'1.25rem', marginBottom:12 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
              <span style={{ fontSize:18 }}>🩺</span>
              <span style={{ fontWeight:700, fontSize:15, color:'#111827' }}>Symptome principal</span>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
              {SYMPTOMES.map(s => (
                <button key={s.id} onClick={() => set('symptome', s.id)} style={{
                  padding:'14px 8px', borderRadius:10, display:'flex', flexDirection:'column', alignItems:'center', gap:6,
                  background:form.symptome===s.id?'#f0fdfa':'#f9fafb',
                  border:'1.5px solid '+(form.symptome===s.id?'#0d9488':'#e5e7eb'),
                  cursor:'pointer', transition:'all 0.15s'
                }}>
                  <span style={{fontSize:22}}>{s.icon}</span>
                  <span style={{fontSize:11,fontWeight:600,color:form.symptome===s.id?'#0d9488':'#374151',textAlign:'center',lineHeight:1.2}}>{s.label}</span>
                </button>
              ))}
            </div>

            {/* DOULEUR */}
            {form.symptome==='douleur'&&(
              <div style={{marginTop:16,padding:14,background:'#f9fafb',borderRadius:10,border:'1px solid #e5e7eb'}}>
                <div style={{fontWeight:600,color:'#374151',fontSize:13,marginBottom:10}}>Ou est la douleur ? (cliquez — selection multiple)</div>

                <div style={{display:'flex',gap:12,alignItems:'flex-start',marginBottom:10}}>
                  {/* SCHEMA SIMPLIFIE */}
                  <div style={{display:'flex',gap:8,flexShrink:0}}>

                    {/* Corps */}
                    <div style={{textAlign:'center'}}>
                      <div style={{fontSize:9,color:'#9ca3af',marginBottom:2,fontWeight:600}}>Corps</div>
                      <svg width="100" height="260" viewBox="0 0 100 260">
                        {[
                          {id:'tete',      d:'M50,2 C37,2 28,12 28,26 C28,40 37,50 50,50 C63,50 72,40 72,26 C72,12 63,2 50,2 Z', label:'Tete', lx:50, ly:27},
                          {id:'thorax',    d:'M20,56 L80,56 L84,116 L16,116 Z', label:'Thorax', lx:50, ly:86},
                          {id:'membre_g',  d:'M82,58 L96,62 L100,160 L84,156 Z', label:'Mbr G', lx:92, ly:108},
                          {id:'membre_d',  d:'M18,58 L4,62 L0,160 L16,156 Z', label:'Mbr D', lx:8, ly:108},
                          {id:'abdomen',   d:'M16,116 L84,116 L82,170 L18,170 Z', label:'Abdomen', lx:50, ly:143},
                          {id:'mig',       d:'M50,170 L80,170 L78,258 L52,258 Z', label:'MIG', lx:66, ly:213},
                          {id:'mid',       d:'M50,170 L20,170 L22,258 L48,258 Z', label:'MID', lx:34, ly:213},
                        ].map(z=>{
                          const sel=form.douleur_zones.includes(z.id);
                          const rouge=z.id==='membre_g';
                          return(
                            <g key={z.id} onClick={()=>{
                              const zones=sel?form.douleur_zones.filter(x=>x!==z.id):[...form.douleur_zones,z.id];
                              set('douleur_zones',zones);
                            }} style={{cursor:'pointer'}}>
                              <path d={z.d}
                                fill={sel?(rouge?'#ef4444':'#0d9488'):'#e2e8f0'}
                                stroke={sel?(rouge?'#b91c1c':'#0f766e'):'#94a3b8'}
                                strokeWidth="1.5" strokeLinejoin="round"/>
                            </g>
                          );
                        })}
                        {/* Cou entre tete et thorax */}
                        <path d="M42,50 L42,56 L58,56 L58,50 Z" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1"/>
                      </svg>
                    </div>

                    {/* Visage */}
                    <div style={{textAlign:'center'}}>
                      <div style={{fontSize:9,color:'#9ca3af',marginBottom:2,fontWeight:600}}>Visage</div>
                      <svg width="90" height="120" viewBox="0 0 90 120">
                        {/* Tête ovale */}
                        <ellipse cx="45" cy="55" rx="38" ry="48" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.5"/>
                        {[
                          {id:'oeil_g',   d:'M54,36 C54,31 64,31 64,36 C64,41 54,41 54,36 Z', label:'Oeil G', lx:59, ly:36},
                          {id:'oeil_d',   d:'M26,36 C26,31 36,31 36,36 C36,41 26,41 26,36 Z', label:'Oeil D', lx:31, ly:36},
                          {id:'oreille_g',d:'M83,45 C88,45 90,52 90,58 C90,64 88,70 83,70 L80,70 L80,45 Z', label:'O.G', lx:86, ly:58},
                          {id:'oreille_d',d:'M7,45 C2,45 0,52 0,58 C0,64 2,70 7,70 L10,70 L10,45 Z', label:'O.D', lx:4, ly:58},
                          {id:'nez',      d:'M45,48 L41,62 L49,62 Z', label:'Nez', lx:45, ly:60},
                          {id:'gorge',    d:'M28,82 C28,74 62,74 62,82 C62,90 28,90 28,82 Z', label:'Gorge', lx:45, ly:82},
                          {id:'dent',     d:'M33,72 C33,68 57,68 57,72 C57,76 33,76 33,72 Z', label:'Dent', lx:45, ly:72},
                        ].map(z=>{
                          const sel=form.douleur_zones.includes(z.id);
                          return(
                            <g key={z.id} onClick={()=>{
                              const zones=sel?form.douleur_zones.filter(x=>x!==z.id):[...form.douleur_zones,z.id];
                              set('douleur_zones',zones);
                            }} style={{cursor:'pointer'}}>
                              <path d={z.d}
                                fill={sel?'#f59e0b':'#cbd5e1'}
                                stroke={sel?'#d97706':'#94a3b8'}
                                strokeWidth="1.5" strokeLinejoin="round"/>
                            </g>
                          );
                        })}
                        {/* Cheveux */}
                        <ellipse cx="45" cy="10" rx="35" ry="10" fill="#94a3b8"/>
                      </svg>
                    </div>
                  </div>

                                    {/* PANNEAU DROIT */}
                  <div style={{flex:1,display:'flex',flexDirection:'column',gap:8}}>
                    {/* Alerte tete */}
                    {form.douleur_zones.includes('tete')&&(
                      <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:8,padding:'10px 12px',marginBottom:6}}>
                        <div style={{color:'#dc2626',fontWeight:700,fontSize:12,marginBottom:8}}>Douleur tete — evaluer urgence</div>
                        <div style={{display:'flex',flexDirection:'column',gap:6}}>
                          <div>
                            <label style={{fontSize:11,color:'#374151',fontWeight:600,display:'block',marginBottom:4}}>Nausees ou vomissements ?</label>
                            <div style={{display:'flex',gap:6}}>
                              {['Oui','Non'].map(v=>(
                                <button key={v} onClick={()=>set('nausee',v)} style={{flex:1,padding:'6px',borderRadius:6,background:form.nausee===v?(v==='Oui'?'#ef4444':'#16a34a'):'#fff',color:form.nausee===v?'#fff':'#374151',border:'1px solid '+(form.nausee===v?(v==='Oui'?'#ef4444':'#16a34a'):'#e5e7eb'),fontSize:12,fontWeight:600,cursor:'pointer'}}>{v}</button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <label style={{fontSize:11,color:'#374151',fontWeight:600,display:'block',marginBottom:4}}>Nouvelle tache sur la peau ?</label>
                            <div style={{display:'flex',gap:6}}>
                              {['Oui','Non'].map(v=>(
                                <button key={v} onClick={()=>set('tache_corps',v)} style={{flex:1,padding:'6px',borderRadius:6,background:form.tache_corps===v?(v==='Oui'?'#ef4444':'#16a34a'):'#fff',color:form.tache_corps===v?'#fff':'#374151',border:'1px solid '+(form.tache_corps===v?(v==='Oui'?'#ef4444':'#16a34a'):'#e5e7eb'),fontSize:12,fontWeight:600,cursor:'pointer'}}>{v}</button>
                              ))}
                            </div>
                          </div>
                          {(form.nausee==='Oui'||form.tache_corps==='Oui')&&(
                            <div style={{background:'#7f1d1d',borderRadius:8,padding:'8px 10px',marginTop:4}}>
                              <div style={{color:'#fff',fontWeight:800,fontSize:13}}>URGENCE — Brancard 1 + alerter medecin</div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Alerte bras gauche */}
                    {(form.douleur_zones.includes('bras_g'))&&(
                      <div style={{background:'#fef2f2',border:'2px solid #ef4444',borderRadius:8,padding:'10px 12px'}}>
                        <div style={{color:'#dc2626',fontWeight:700,fontSize:13}}>Bras gauche — Faire ECG</div>
                        <div style={{color:'#ef4444',fontSize:12,marginTop:3}}>Allonger + appeler medecin immediatement</div>
                        <button onClick={()=>set('ecg_fait',!form.ecg_fait)} style={{marginTop:6,padding:'5px 12px',borderRadius:6,background:form.ecg_fait?'#16a34a':'#fff',color:form.ecg_fait?'#fff':'#374151',border:'1px solid '+(form.ecg_fait?'#16a34a':'#e5e7eb'),fontSize:12,fontWeight:600,cursor:'pointer'}}>
                          {form.ecg_fait?'✓ ECG realise':'Marquer ECG realise'}
                        </button>
                      </div>
                    )}

                    {/* Alerte thorax */}
                    {form.douleur_zones.includes('thorax')&&(
                      <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:8,padding:'10px 12px'}}>
                        <div style={{color:'#dc2626',fontWeight:700,fontSize:13}}>Douleur thoracique</div>
                        <div style={{color:'#ef4444',fontSize:12,marginTop:3}}>Allonger + ECG + prevenir medecin</div>
                        <button onClick={()=>set('ecg_fait',!form.ecg_fait)} style={{marginTop:6,padding:'5px 12px',borderRadius:6,background:form.ecg_fait?'#16a34a':'#fff',color:form.ecg_fait?'#fff':'#374151',border:'1px solid '+(form.ecg_fait?'#16a34a':'#e5e7eb'),fontSize:12,fontWeight:600,cursor:'pointer'}}>
                          {form.ecg_fait?'✓ ECG realise':'ECG a faire'}
                        </button>
                      </div>
                    )}

                    {/* Alerte abdo femme */}
                    {form.douleur_zones.includes('abdomen')&&form.sexe==='F'&&age>=12&&(
                      <div style={{background:'#f5f3ff',border:'1px solid #ddd6fe',borderRadius:8,padding:'10px 12px'}}>
                        <div style={{color:'#7c3aed',fontWeight:700,fontSize:13}}>Douleur abdo — Femme</div>
                        <div style={{color:'#8b5cf6',fontSize:12,marginTop:3}}>Donner pot a urine pour BU et bHCG urinaire</div>
                        <div style={{display:'flex',gap:6,marginTop:6,flexWrap:'wrap'}}>
                          <button onClick={()=>set('bu_fait',!form.bu_fait)} style={{padding:'4px 10px',borderRadius:6,background:form.bu_fait?'#7c3aed':'#fff',color:form.bu_fait?'#fff':'#374151',border:'1px solid '+(form.bu_fait?'#7c3aed':'#e5e7eb'),fontSize:11,fontWeight:600,cursor:'pointer'}}>{form.bu_fait?'✓ BU fait':'BU'}</button>
                          <button onClick={()=>set('bhcg_fait',!form.bhcg_fait)} style={{padding:'4px 10px',borderRadius:6,background:form.bhcg_fait?'#7c3aed':'#fff',color:form.bhcg_fait?'#fff':'#374151',border:'1px solid '+(form.bhcg_fait?'#7c3aed':'#e5e7eb'),fontSize:11,fontWeight:600,cursor:'pointer'}}>{form.bhcg_fait?'✓ bHCG fait':'bHCG'}</button>
                        </div>
                        {form.bu_fait&&<div style={{marginTop:6}}>
                          <input value={form.bu_resultat||''} onChange={e=>set('bu_resultat',e.target.value)}
                            placeholder="Resultat BU : ex nitrites+, leucocytes++..." style={{...inp,fontSize:12,marginTop:4}}/>
                        </div>}
                        {form.bhcg_fait&&<div style={{marginTop:6}}>
                          <div style={{display:'flex',gap:6}}>
                            {['Negatif','Positif'].map(r=>(
                              <button key={r} onClick={()=>set('bhcg_resultat',r)} style={{flex:1,padding:'6px',borderRadius:6,background:form.bhcg_resultat===r?(r==='Positif'?'#ef4444':'#16a34a'):'#fff',color:form.bhcg_resultat===r?'#fff':'#374151',border:'1px solid '+(form.bhcg_resultat===r?(r==='Positif'?'#ef4444':'#16a34a'):'#e5e7eb'),fontSize:12,fontWeight:600,cursor:'pointer'}}>
                                bHCG {r}
                              </button>
                            ))}
                          </div>
                          {form.bhcg_resultat==='Positif'&&<div style={{color:'#ef4444',fontWeight:700,fontSize:12,marginTop:4}}>bHCG + — Prevenir medecin immediatement</div>}
                        </div>}
                      </div>
                    )}
                    {form.douleur_zones.includes('abdomen')&&form.sexe==='F'&&age<12&&age!==null&&(
                      <div style={{background:'#f5f3ff',border:'1px solid #ddd6fe',borderRadius:8,padding:'8px 12px'}}>
                        <div style={{color:'#7c3aed',fontSize:12}}>Douleur abdo — enfant — prevenir medecin</div>
                      </div>
                    )}



                    {/* Intensite */}
                    <div>
                      <label style={lbl}>Intensite de la douleur</label>
                      <div style={{display:'flex',gap:8}}>
                        {[
                          {id:3, label:'Legere', color:'#16a34a', bg:'#f0fdf4', border:'#bbf7d0'},
                          {id:6, label:'Moyenne', color:'#f59e0b', bg:'#fffbeb', border:'#fde68a'},
                          {id:9, label:'Intense', color:'#ef4444', bg:'#fef2f2', border:'#fecaca'},
                        ].map(o=>(
                          <button key={o.id} onClick={()=>set('douleur_eva',o.id)} style={{
                            flex:1, padding:'12px 8px', borderRadius:10, cursor:'pointer',
                            background:form.douleur_eva===o.id?o.color:o.bg,
                            color:form.douleur_eva===o.id?'#fff':o.color,
                            border:'2px solid '+(form.douleur_eva===o.id?o.color:o.border),
                            fontWeight:700, fontSize:14,
                          }}>{o.label}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* FIEVRE */}
            {form.symptome==='fievre'&&(
              <div style={{marginTop:16,padding:14,background:'#f9fafb',borderRadius:10,border:'1px solid #e5e7eb'}}>
                <label style={lbl}>Fievre depuis ?</label>
                <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:12}}>
                  {['Quelques heures','1 jour','2-3 jours','Plus de 3 jours'].map(d=>(
                    <button key={d} onClick={()=>set('fievre_depuis',d)} style={{padding:'8px 14px',borderRadius:99,fontSize:12,background:form.fievre_depuis===d?'#0d9488':'#fff',color:form.fievre_depuis===d?'#fff':'#374151',border:'1px solid '+(form.fievre_depuis===d?'#0d9488':'#e5e7eb'),cursor:'pointer'}}>
                      {d}
                    </button>
                  ))}
                </div>
                {(form.fievre_depuis==='2-3 jours'||form.fievre_depuis==='Plus de 3 jours')&&(
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                    <div>
                      <label style={lbl}>TDR Paludisme</label>
                      <div style={{display:'flex',gap:6}}>
                        {['Negatif','Positif'].map(r=>(
                          <button key={r} onClick={()=>set('tdr_palu',r)} style={{flex:1,padding:'9px',borderRadius:8,background:form.tdr_palu===r?(r==='Positif'?'#ef4444':'#16a34a'):'#fff',color:form.tdr_palu===r?'#fff':'#374151',border:'1.5px solid '+(form.tdr_palu===r?(r==='Positif'?'#ef4444':'#16a34a'):'#e5e7eb'),fontSize:12,fontWeight:600,cursor:'pointer'}}>
                            {r==='Positif'?'✗ Positif':'✓ Negatif'}
                          </button>
                        ))}
                      </div>
                      {form.tdr_palu==='Positif'&&<div style={{color:'#ef4444',fontSize:11,marginTop:4,fontWeight:600}}>Paludisme + — Prevenir medecin</div>}
                    </div>
                    <div>
                      <label style={lbl}>TDR Dengue</label>
                      <div style={{display:'flex',gap:6}}>
                        {['Negatif','Positif'].map(r=>(
                          <button key={r} onClick={()=>set('tdr_dengue',r)} style={{flex:1,padding:'9px',borderRadius:8,background:form.tdr_dengue===r?(r==='Positif'?'#f59e0b':'#16a34a'):'#fff',color:form.tdr_dengue===r?'#fff':'#374151',border:'1.5px solid '+(form.tdr_dengue===r?(r==='Positif'?'#f59e0b':'#16a34a'):'#e5e7eb'),fontSize:12,fontWeight:600,cursor:'pointer'}}>
                            {r==='Positif'?'✗ Positif':'✓ Negatif'}
                          </button>
                        ))}
                      </div>
                      {form.tdr_dengue==='Positif'&&<div style={{color:'#f59e0b',fontSize:11,marginTop:4,fontWeight:600}}>Dengue + — Prevenir medecin</div>}
                    </div>
                  </div>
                )}
                {(form.fievre_depuis==='Quelques heures'||form.fievre_depuis==='1 jour')&&(
                  <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:8,padding:'8px 12px',marginTop:8}}>
                    <div style={{color:'#16a34a',fontSize:12}}>Fievre recente — TDR non indique avant 3 jours</div>
                  </div>
                )}
              </div>
            )}

            {/* COMA */}
            {form.symptome==='coma'&&(
              <div style={{marginTop:16,padding:14,background:'#7f1d1d',borderRadius:10,border:'2px solid #ef4444'}}>
                <div style={{color:'#fff',fontWeight:800,fontSize:15,marginBottom:10}}>URGENCE VITALE</div>
                <div style={{color:'#fef2f2',fontSize:13,marginBottom:12,fontWeight:600}}>Le patient respire-t-il ?</div>
                <div style={{display:'flex',gap:8,marginBottom:12}}>
                  <button onClick={()=>set('respire','non')} style={{flex:1,padding:'12px',borderRadius:8,background:form.respire==='non'?'#ef4444':'rgba(255,255,255,0.1)',color:'#fff',fontWeight:700,fontSize:13,border:'2px solid '+(form.respire==='non'?'#ef4444':'rgba(255,255,255,0.3)'),cursor:'pointer'}}>
                    NON - Ne respire pas
                  </button>
                  <button onClick={()=>set('respire','oui')} style={{flex:1,padding:'12px',borderRadius:8,background:form.respire==='oui'?'#16a34a':'rgba(255,255,255,0.1)',color:'#fff',fontWeight:700,fontSize:13,border:'2px solid '+(form.respire==='oui'?'#16a34a':'rgba(255,255,255,0.3)'),cursor:'pointer'}}>
                    OUI - Respire
                  </button>
                </div>
                {form.respire==='non'&&(
                  <div style={{background:'rgba(0,0,0,0.3)',borderRadius:8,padding:'10px 12px'}}>
                    <div style={{color:'#fef2f2',fontSize:12,lineHeight:1.8}}>
                      <div style={{fontWeight:700,marginBottom:4}}>Actions immediates :</div>
                      <div>1. Allonger le patient sur le dos</div>
                      <div>2. Appeler le medecin et l'infirmier</div>
                      <div>3. Commencer le massage cardiaque</div>
                    </div>
                  </div>
                )}
                {form.respire==='oui'&&(
                  <div style={{background:'rgba(0,0,0,0.3)',borderRadius:8,padding:'10px 12px'}}>
                    <div style={{color:'#fef2f2',fontSize:12,lineHeight:1.8}}>
                      <div style={{fontWeight:700,marginBottom:4}}>Actions immediates :</div>
                      <div>1. Prevenir le medecin</div>
                      <div>2. Installer en brancard 1</div>
                      <div>3. Realiser un dextro et un hemocue</div>
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:10}}>
                      <div>
                        <div style={{color:'rgba(255,255,255,0.7)',fontSize:10,marginBottom:3}}>Dextro (g/L)</div>
                        <input type="number" step="0.1" value={form.dextro||''} onChange={e=>set('dextro',e.target.value)}
                          placeholder="Ex: 1.0" style={{width:'100%',padding:'6px 8px',borderRadius:6,border:'1px solid rgba(255,255,255,0.3)',background:'rgba(255,255,255,0.1)',color:'#fff',fontSize:13,outline:'none',boxSizing:'border-box'}}/>
                        {form.dextro&&parseFloat(form.dextro)<0.5&&<div style={{color:'#fca5a5',fontSize:10,marginTop:2,fontWeight:700}}>HYPOGLYCEMIE SEVERE</div>}
                      </div>
                      <div>
                        <div style={{color:'rgba(255,255,255,0.7)',fontSize:10,marginBottom:3}}>Hemocue (g/dL)</div>
                        <input type="number" step="0.1" value={form.hemocue||''} onChange={e=>set('hemocue',e.target.value)}
                          placeholder="Ex: 12.0" style={{width:'100%',padding:'6px 8px',borderRadius:6,border:'1px solid rgba(255,255,255,0.3)',background:'rgba(255,255,255,0.1)',color:'#fff',fontSize:13,outline:'none',boxSizing:'border-box'}}/>
                        {form.hemocue&&parseFloat(form.hemocue)<7&&<div style={{color:'#fca5a5',fontSize:10,marginTop:2,fontWeight:700}}>ANEMIE SEVERE</div>}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* DETRESSE RESPIRATOIRE */}
            {form.symptome==='detresse_respi'&&(
              <div style={{marginTop:16,borderRadius:10,overflow:'hidden',border:'1px solid #e5e7eb'}}>

                {/* Etape 1 : saturation */}
                {parseFloat(form.sat)<95&&form.sat?(
                  <div style={{background:'#7f1d1d',padding:'14px'}}>
                    <div style={{color:'#fff',fontWeight:800,fontSize:15,marginBottom:6}}>Saturation {Math.round(parseFloat(form.sat))}% — URGENCE</div>
                    <div style={{background:'rgba(0,0,0,0.3)',borderRadius:8,padding:'10px 12px',color:'#fef2f2',fontSize:12,lineHeight:1.8}}>
                      <div style={{fontWeight:700}}>Brancard 1 — O2 immediat — Appeler medecin et IDE</div>
                      <div>Installer en B1 (ou B2 si occupe) — O2 masque — Position demi-assise</div>
                    </div>
                  </div>
                ):(
                  <div style={{padding:'14px',background:'#f9fafb'}}>
                    {form.sat&&<div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:8,padding:'8px 12px',marginBottom:12}}>
                      <div style={{color:'#16a34a',fontSize:12,fontWeight:600}}>Saturation {Math.round(parseFloat(form.sat))}% — correcte</div>
                    </div>}
                    {!form.sat&&<div style={{background:'#fffbeb',border:'1px solid #fde68a',borderRadius:8,padding:'8px 12px',marginBottom:12}}>
                      <div style={{color:'#d97706',fontSize:12}}>Saturation non renseignee — evaluer cliniquement</div>
                    </div>}

                    <label style={lbl}>Le patient arrive a respirer et parle normalement ?</label>
                    <div style={{display:'flex',gap:8}}>
                      <button onClick={()=>set('signe_lutte',false)} style={{flex:1,padding:'10px',borderRadius:8,background:form.signe_lutte===false&&form.signe_lutte!==''?'#16a34a':'#fff',color:form.signe_lutte===false&&form.signe_lutte!==''?'#fff':'#374151',border:'2px solid '+(form.signe_lutte===false&&form.signe_lutte!==''?'#16a34a':'#e5e7eb'),fontWeight:600,fontSize:13,cursor:'pointer'}}>
                        Oui — respire et parle
                      </button>
                      <button onClick={()=>set('signe_lutte',true)} style={{flex:1,padding:'10px',borderRadius:8,background:form.signe_lutte===true?'#ef4444':'#fff',color:form.signe_lutte===true?'#fff':'#374151',border:'2px solid '+(form.signe_lutte===true?'#ef4444':'#e5e7eb'),fontWeight:600,fontSize:13,cursor:'pointer'}}>
                        Non — difficultes
                      </button>
                    </div>

                    {form.signe_lutte===false&&form.signe_lutte!==''&&(
                      <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:8,padding:'10px 12px',marginTop:10}}>
                        <div style={{color:'#16a34a',fontWeight:700,fontSize:13}}>
                          {libre('fauteuil2')?'F2 - Fauteuil 2':libre('lit2')?'L2 - Lit 2':libre('lit1')?'L1 - Lit 1':libre('fauteuil1')?'F1 - Fauteuil 1':'Salle 2'}
                        </div>
                        <div style={{color:'#15803d',fontSize:12,marginTop:4}}>Position demi-assise — Surveillance saturation</div>
                      </div>
                    )}
                    {form.signe_lutte===true&&(
                      <div style={{background:'#fef2f2',border:'2px solid #ef4444',borderRadius:8,padding:'10px 12px',marginTop:10}}>
                        <div style={{color:'#dc2626',fontWeight:700,fontSize:13}}>Brancard 1 ou 2 — O2 — Alerter equipe</div>
                        <div style={{color:'#ef4444',fontSize:12,marginTop:4}}>Position demi-assise — O2 masque — Prevenir medecin et IDE</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ASTHME */}
            {form.symptome==='asthme'&&(
              <div style={{marginTop:16,borderRadius:10,overflow:'hidden',border:'1px solid #e5e7eb'}}>
                {/* Sat < 95 : urgence directe, question grisée */}
                {form.sat&&parseFloat(form.sat)<95?(
                  <div style={{background:'#7f1d1d',padding:'12px 14px'}}>
                    <div style={{color:'#fff',fontWeight:800,fontSize:14,marginBottom:4}}>Saturation {form.sat}% — F1 + O2 + Appeler medecin</div>
                    <label style={{...lbl,color:'rgba(255,255,255,0.4)',marginBottom:6}}>Le patient arrive a respirer et parle normalement ?</label>
                    <div style={{display:'flex',gap:8,opacity:0.35,pointerEvents:'none'}}>
                      <button style={{flex:1,padding:'9px',borderRadius:8,background:'rgba(255,255,255,0.1)',color:'rgba(255,255,255,0.5)',border:'2px solid rgba(255,255,255,0.2)',fontWeight:600,fontSize:13,cursor:'not-allowed'}}>Oui — respire et parle</button>
                      <button style={{flex:1,padding:'9px',borderRadius:8,background:'rgba(255,255,255,0.1)',color:'rgba(255,255,255,0.5)',border:'2px solid rgba(255,255,255,0.2)',fontWeight:600,fontSize:13,cursor:'not-allowed'}}>Non — difficultes</button>
                    </div>
                  </div>
                ):(
                <div style={{padding:'12px 14px',background:'#f9fafb',borderBottom:'1px solid #e5e7eb'}}>
                  <label style={lbl}>Le patient arrive a respirer et parle normalement ?</label>
                  <div style={{display:'flex',gap:8}}>
                    <button onClick={()=>set('signe_lutte',false)} style={{flex:1,padding:'10px',borderRadius:8,background:form.signe_lutte===false&&form.signe_lutte!==''?'#16a34a':'#fff',color:form.signe_lutte===false&&form.signe_lutte!==''?'#fff':'#374151',border:'2px solid '+(form.signe_lutte===false&&form.signe_lutte!==''?'#16a34a':'#e5e7eb'),fontWeight:600,fontSize:13,cursor:'pointer'}}>
                      Oui — respire et parle
                    </button>
                    <button onClick={()=>set('signe_lutte',true)} style={{flex:1,padding:'10px',borderRadius:8,background:form.signe_lutte===true?'#ef4444':'#fff',color:form.signe_lutte===true?'#fff':'#374151',border:'2px solid '+(form.signe_lutte===true?'#ef4444':'#e5e7eb'),fontWeight:600,fontSize:13,cursor:'pointer'}}>
                      Non — difficultes
                    </button>
                  </div>
                </div>
                )}

                {(!form.sat||parseFloat(form.sat)>=95)&&form.signe_lutte===false&&form.signe_lutte!==''&&(
                  <div style={{background:'#f0fdf4',padding:'14px',borderTop:'1px solid #e5e7eb'}}>
                    <div style={{fontWeight:700,color:'#16a34a',fontSize:13,marginBottom:6}}>Fauteuil observation</div>
                    <div style={{fontSize:12,color:'#374151',lineHeight:1.8}}>
                      <div>Demarrer Ventoline + Atrovent sous AIR</div>
                      <div style={{marginTop:4,fontWeight:600,color:'#16a34a'}}>Demarrer education therapeutique video</div>
                    </div>
                  </div>
                )}

                {form.signe_lutte===true&&(
                  <div style={{background:'#fef2f2',padding:'14px'}}>
                    <div style={{fontWeight:700,color:'#dc2626',fontSize:13,marginBottom:8}}>F1 — Nebulisation sous O2 — Prevenir medecin</div>
                    <div style={{background:'#fff',borderRadius:8,padding:'10px',fontSize:12,color:'#374151',lineHeight:1.9}}>
                      {parseFloat(form.poids||99)>=16?(
                        <div>SALBUTAMOL <b>5 mg</b> + ATROVENT <b>0.5 mg</b></div>
                      ):(
                        <div>SALBUTAMOL <b>2.5 mg</b> + ATROVENT <b>0.25 mg</b></div>
                      )}
                      <div style={{color:'#9ca3af',fontSize:11,marginTop:2}}>{form.poids?form.poids+'kg':'Poids non renseigne'}</div>
                      <div style={{marginTop:4,fontWeight:600,color:'#ef4444'}}>Scope + O2 5L/min</div>
                      <div style={{marginTop:4,color:'#6b7280'}}>Reevaluation apres chaque aerosol</div>
                    </div>
                  </div>
                )}

                {age!==null&&age<2&&(
                  <div style={{background:'#eff6ff',borderTop:'1px solid #bfdbfe',padding:'10px 14px'}}>
                    <div style={{color:'#1d4ed8',fontWeight:700,fontSize:12}}>Enfant &lt; 2 ans — DRP recommande</div>
                    <button onClick={()=>set('drp',!form.drp)} style={{marginTop:6,padding:'6px 14px',borderRadius:6,background:form.drp?'#3b82f6':'#fff',color:form.drp?'#fff':'#374151',border:'1px solid '+(form.drp?'#3b82f6':'#e5e7eb'),fontSize:12,fontWeight:600,cursor:'pointer'}}>
                      {form.drp?'✓ DRP realise':'DRP a realiser'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* VERTIGE */}
            {form.symptome==='vertige'&&(
              <div style={{marginTop:16,padding:14,background:'#eff6ff',borderRadius:10,border:'1px solid #bfdbfe'}}>
                <div style={{color:'#1d4ed8',fontWeight:700,fontSize:13,marginBottom:10}}>Vertige / Malaise — Realiser dextro et hemocue</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                  <div>
                    <label style={{...lbl,color:'#3b82f6'}}>Dextro (g/L)</label>
                    <input type="number" step="0.1" value={form.dextro||''} onChange={e=>set('dextro',e.target.value)} placeholder="--"
                      style={{...inp,borderColor:form.dextro&&(parseFloat(form.dextro)<0.7||parseFloat(form.dextro)>2)?'#ef4444':'#bfdbfe'}}/>
                    {form.dextro&&parseFloat(form.dextro)<0.5&&<div style={{color:'#ef4444',fontSize:11,marginTop:3,fontWeight:700,background:'#fef2f2',padding:'4px 8px',borderRadius:5}}>HYPOGLYCEMIE SEVERE — Brancard 1 + alerter medecin</div>}
                    {form.dextro&&parseFloat(form.dextro)>=0.5&&parseFloat(form.dextro)<0.7&&<div style={{color:'#ef4444',fontSize:11,marginTop:3,fontWeight:600}}>Hypoglycemie — Alerter medecin</div>}
                    {form.dextro&&parseFloat(form.dextro)>2&&parseFloat(form.dextro)<=2.5&&<div style={{color:'#f59e0b',fontSize:11,marginTop:3,fontWeight:600}}>Hyperglycemie — Prevenir medecin</div>}
                    {form.dextro&&parseFloat(form.dextro)>2.5&&<div style={{color:'#ef4444',fontSize:11,marginTop:3,fontWeight:700,background:'#fef2f2',padding:'4px 8px',borderRadius:5}}>Dextro {form.dextro} — Faire cetonemie + prevenir medecin</div>}
                  </div>
                  <div>
                    <label style={{...lbl,color:'#3b82f6'}}>Hemocue (g/dL)</label>
                    <input type="number" step="0.1" value={form.hemocue||''} onChange={e=>set('hemocue',e.target.value)} placeholder="--"
                      style={{...inp,borderColor:form.hemocue&&parseFloat(form.hemocue)<8?'#ef4444':'#bfdbfe'}}/>
                    {form.hemocue&&parseFloat(form.hemocue)<7&&<div style={{color:'#ef4444',fontSize:11,marginTop:3,fontWeight:700,background:'#fef2f2',padding:'4px 8px',borderRadius:5}}>ANEMIE SEVERE ({form.hemocue} g/dL) — Allonger patient B1 ou B2, a defaut L1 ou L2 — Alerter medecin</div>}
                    {form.hemocue&&parseFloat(form.hemocue)>=7&&parseFloat(form.hemocue)<=10.9&&<div style={{color:'#ef4444',fontSize:11,marginTop:3,fontWeight:600}}>Anemie {form.hemocue} g/dL — Prevenir medecin</div>}
                    {form.hemocue&&parseFloat(form.hemocue)>10.9&&<div style={{color:'#16a34a',fontSize:11,marginTop:3,fontWeight:600}}>Hemoglobine normale ({form.hemocue} g/dL)</div>}
                  </div>
                </div>
              </div>
            )}

            {/* PLAIE */}
            {form.symptome==='plaie'&&(
              <div style={{marginTop:16,padding:14,background:'#f9fafb',borderRadius:10,border:'1px solid #e5e7eb'}}>
                <label style={lbl}>Carnet de vaccination</label>
                <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:10}}>
                  {[
                    ['ok','Carnet lisible — vaccin a jour','#16a34a','✓'],
                    ['illisible','Carnet illisible / incomplet','#f59e0b','⚠️'],
                    ['absent','Pas de carnet','#ef4444','✗'],
                  ].map(([v,l,c,ic])=>(
                    <button key={v} onClick={()=>{set('plaie_vaccin',v);if(v!=='ok')set('quicktest','');}} style={{padding:'12px 16px',borderRadius:10,fontSize:13,background:form.plaie_vaccin===v?c+'15':'#f9fafb',color:form.plaie_vaccin===v?c:'#374151',border:'2px solid '+(form.plaie_vaccin===v?c:'#e5e7eb'),cursor:'pointer',fontWeight:600,textAlign:'left',display:'flex',alignItems:'center',gap:10}}>
                      <span style={{fontSize:16}}>{ic}</span>{l}
                    </button>
                  ))}
                </div>
                {(form.plaie_vaccin==='illisible'||form.plaie_vaccin==='absent')&&(
                  <div style={{background:'#fffbeb',border:'2px solid #f59e0b',borderRadius:10,padding:'12px 14px'}}>
                    <div style={{color:'#d97706',fontWeight:700,fontSize:13,marginBottom:8}}>Quick Test Tetanos — A realiser maintenant</div>
                    <div style={{display:'flex',gap:8}}>
                      {['Negatif','Positif'].map(r=>(
                        <button key={r} onClick={()=>set('quicktest',r)} style={{flex:1,padding:'10px',borderRadius:8,background:form.quicktest===r?(r==='Positif'?'#ef4444':'#16a34a'):'#fff',color:form.quicktest===r?'#fff':'#374151',border:'1.5px solid '+(form.quicktest===r?(r==='Positif'?'#ef4444':'#16a34a'):'#e5e7eb'),fontSize:13,fontWeight:700,cursor:'pointer'}}>
                          {r==='Negatif'?'✓ Negatif':'✗ Positif'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* AUTRE */}
            {form.symptome==='autre'&&(
              <div style={{marginTop:16,padding:14,background:'#f9fafb',borderRadius:10,border:'1px solid #e5e7eb'}}>
                <label style={lbl}>Decrivez le motif de consultation</label>
                <textarea value={form.symptome_autre||''} onChange={e=>set('symptome_autre',e.target.value)}
                  placeholder="Ex: eruption cutanee, douleur dentaire, probleme administratif..."
                  rows={3} style={{...inp,resize:'vertical',marginBottom:10}}/>
                {form.symptome_autre&&(
                  (cfcCol==='red'||csatCol==='red'||ctasCol==='red'||ctadCol==='red'||ctempCol==='red'||
                   cfcCol==='orange'||csatCol==='orange'||ctasCol==='orange')?(
                    <div style={{background:'#fef2f2',border:'2px solid #ef4444',borderRadius:8,padding:'10px 12px'}}>
                      <div style={{color:'#dc2626',fontWeight:700,fontSize:13}}>Constante anormale — Prevenir le medecin</div>
                      <div style={{color:'#ef4444',fontSize:12,marginTop:4}}>Installer en Lit 1 ou Lit 2 et alerter le medecin</div>
                    </div>
                  ):(
                    <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:8,padding:'10px 12px'}}>
                      <div style={{color:'#16a34a',fontWeight:700,fontSize:13}}>Constantes normales</div>
                      <div style={{color:'#15803d',fontSize:12,marginTop:4}}>Faire patienter dehors</div>
                    </div>
                  )
                )}
              </div>
            )}
          </div>

          {/* PLACEMENT SUGGERE */}
          {placement&&(
            <div style={{background:placement.urgence?'#fef2f2':'#f0fdfa',border:'2px solid '+(placement.urgence?'#ef4444':'#0d9488'),borderRadius:12,padding:'1rem 1.25rem',marginBottom:12}}>
              <div style={{fontSize:11,fontWeight:700,color:placement.urgence?'#dc2626':'#0d9488',textTransform:'uppercase',letterSpacing:1,marginBottom:6}}>
                {placement.urgence?'Placement urgent':'Placement suggere'}
              </div>
              <div style={{fontWeight:700,fontSize:16,color:'#111827'}}>{placement.label}</div>
              {placement.msg&&<div style={{color:'#6b7280',fontSize:13,marginTop:6}}>{placement.msg}</div>}
            </div>
          )}

          {/* NOTES */}
          <div style={{background:'#fff',borderRadius:12,border:'1px solid #e5e7eb',padding:'1.25rem',marginBottom:16}}>
            <label style={lbl}>Notes pour l'equipe (optionnel)</label>
            <textarea value={form.notes} onChange={e=>set('notes',e.target.value)} placeholder="Observations particulieres..." rows={2}
              style={{...inp,resize:'vertical',fontFamily:'system-ui'}}/>
          </div>

          <button onClick={creerPatient} disabled={!form.nom||!form.sexe||!form.symptome}
            style={{width:'100%',padding:'14px',borderRadius:12,background:(!form.nom||!form.sexe||!form.symptome)?'#e5e7eb':'#0d9488',color:(!form.nom||!form.sexe||!form.symptome)?'#9ca3af':'#fff',fontSize:15,fontWeight:700,cursor:'pointer'}}>
            Enregistrer le patient
          </button>
        </div>
      )}

      {/* MODALE VUE ENSEMBLE */}
      {showVue&&(
        <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.5)',zIndex:1000,display:'flex',flexDirection:'column'}}>
          <div style={{background:'#fff',flex:1,margin:'60px 20px 20px',borderRadius:16,overflow:'hidden',display:'flex',flexDirection:'column',boxShadow:'0 24px 48px rgba(0,0,0,0.3)'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',borderBottom:'1px solid #e5e7eb',background:'#f9fafb',flexShrink:0}}>
              <span style={{fontWeight:700,fontSize:15,color:'#111827'}}>Vue d'ensemble — PDS Kahani</span>
              <button onClick={()=>setShowVue(false)} style={{width:32,height:32,borderRadius:'50%',background:'#e5e7eb',color:'#374151',fontSize:18,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',border:'none',fontWeight:700}}>×</button>
            </div>
            <iframe src="/vueglobale" style={{flex:1,border:'none',width:'100%'}}/>
          </div>
        </div>
      )}
    </div>
  );
}