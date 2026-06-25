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
  const n = parseFloat(v); if (isNaN(n)) return null;
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
  { id: 'douleur', label: 'Douleur', icon: '😣' },
  { id: 'fievre', label: 'Fievre', icon: '🌡️' },
  { id: 'coma', label: 'Coma / Inconscience', icon: '🚨' },
  { id: 'detresse_respi', label: 'Detresse respiratoire', icon: '😮' },
  { id: 'asthme', label: 'Asthme', icon: '💨' },
  { id: 'vertige', label: 'Vertige / Malaise', icon: '💫' },
  { id: 'plaie', label: 'Plaie / Traumatisme', icon: '🩹' },
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
  const [vue, setVue] = useState('liste');
  const [showVue, setShowVue] = useState(false);

  const [form, setForm] = useState({
    sexe: '', nom: '', prenom: '', ddn: '', ipp: '',
    allergie: '', allergie_detail: '',
    medicaments_today: '', medicaments_detail: '',
    fc: '', sat: '', tas: '', tad: '', temp: '', poids: '', taille: '',
    symptome: '', symptome_autre: '', signe_lutte: '', respire: '', dextro: '', hemocue: '',
    douleur_zones: [], douleur_eva: 5,
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
    if (u.role !== 'as') { router.push('/'); return; }
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
      return { place: 'preau', label: 'Salle d\'attente (preau)', urgence: false, msg: 'Constantes normales - faire patienter en salle d\'attente. Le medecin appellera le patient.' };
    }

    if (hasRedConst) {
      if (libre('brancard1')) return { place: 'brancard1', label: 'B1 - Brancard 1', urgence: true, msg: null };
      if (libre('brancard2')) return { place: 'brancard2', label: 'B2 - Brancard 2', urgence: true, msg: null };
    }

    if (libre('lit1')) return { place: 'lit1', label: 'L1 - Lit 1', urgence: false, msg: null };
    if (libre('lit2')) return { place: 'lit2', label: 'L2 - Lit 2', urgence: false, msg: null };
    if (libre('obs1')) return { place: 'obs1', label: 'O1 - Observation', urgence: false, msg: null };
    return { place: 'preau', label: 'Salle d\'attente', urgence: false, msg: 'Toutes les places sont occupees - faire patienter.' };
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
      setForm({ sexe:'',nom:'',prenom:'',ddn:'',ipp:'',allergie:'',allergie_detail:'',medicaments_today:'',medicaments_detail:'',fc:'',sat:'',tas:'',tad:'',temp:'',poids:'',taille:'',symptome:'',symptome_autre:'',signe_lutte:'',respire:'',dextro:'',hemocue:'',douleur_zones:[],douleur_eva:5,fievre_depuis:'',plaie_vaccin:'',quicktest:'',ecg_fait:false,bu_fait:false,bhcg_fait:false,notes:'' });
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
                <div style={{ color:'#6b7280', fontSize:12, marginTop:2 }}>{p.symptome || p.motifPrincipal} · {p.emplacement || 'Preau'}</div>
              </div>
              <span style={{ fontSize:11, color:'#9ca3af' }}>{dureePresence(parseInt(p.arrivee))}</span>
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
                  <input type="number" step="0.1" value={form[k]} onChange={e=>set(k,e.target.value)} placeholder={ph}
                    style={{width:'100%',border:'none',background:'transparent',fontSize:20,fontWeight:700,color:col?COLORS[col]:'#111827',outline:'none',padding:0}}/>
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
                <input type="number" value={form.poids} onChange={e=>set('poids',e.target.value)} placeholder="70" style={inp}/>
              </div>
              <div>
                <label style={lbl}>Taille (cm)</label>
                <input type="number" value={form.taille} onChange={e=>set('taille',e.target.value)} placeholder="170" style={inp}/>
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
                <div style={{fontWeight:600,color:'#374151',fontSize:13,marginBottom:10}}>Ou est la douleur ? (cliquez sur le schema — selection multiple possible)</div>
                <div style={{display:'flex',gap:16,alignItems:'flex-start',marginBottom:12}}>

                  {/* SCHEMAS face + dos cote a cote */}
                  <div style={{display:'flex',gap:8,flexShrink:0}}>
                    {/* Face - attention: gauche patient = droite ecran */}
                    <div style={{textAlign:'center'}}>
                      <div style={{fontSize:9,color:'#9ca3af',marginBottom:3}}>Face</div>
                      <svg width="110" height="280" viewBox="0 0 110 280">
                        {[
                          {id:'tete',     label:'Tete',        path:'M55,4 C42,4 33,14 33,26 C33,38 42,46 55,46 C68,46 77,38 77,26 C77,14 68,4 55,4 Z'},
                          {id:'cou',      label:'Cou',         path:'M46,46 L46,58 L64,58 L64,46 Z'},
                          {id:'thorax',   label:'Thorax',      path:'M25,58 L85,58 L88,115 L22,115 Z'},
                          {id:'bras_g',   label:'Bras Gauche', path:'M84,60 L96,62 L100,130 L86,128 Z'},
                          {id:'bras_d',   label:'Bras Droit',  path:'M26,60 L14,62 L10,130 L24,128 Z'},
                          {id:'avant_bras_g', label:'Avant-bras G', path:'M86,128 L100,130 L102,185 L88,183 Z'},
                          {id:'avant_bras_d', label:'Avant-bras D', path:'M24,128 L10,130 L8,185 L22,183 Z'},
                          {id:'abdomen',  label:'Abdomen',     path:'M22,115 L88,115 L86,165 L24,165 Z'},
                          {id:'bassin',   label:'Bassin/OGE',  path:'M24,165 L86,165 L83,185 L27,185 Z'},
                          {id:'cuisse_g', label:'Cuisse G',    path:'M55,185 L82,185 L80,240 L57,240 Z'},
                          {id:'cuisse_d', label:'Cuisse D',    path:'M55,185 L28,185 L30,240 L53,240 Z'},
                          {id:'jambe_g',  label:'Jambe G',     path:'M57,240 L80,240 L78,278 L59,278 Z'},
                          {id:'jambe_d',  label:'Jambe D',     path:'M53,240 L30,240 L32,278 L51,278 Z'},
                        ].map(z=>{
                          const sel=form.douleur_zones.includes(z.id);
                          const isBrasG = z.id==='bras_g'||z.id==='avant_bras_g';
                          return(
                            <g key={z.id} onClick={()=>{
                              const zones=sel?form.douleur_zones.filter(x=>x!==z.id):[...form.douleur_zones,z.id];
                              set('douleur_zones',zones);
                            }} style={{cursor:'pointer'}}>
                              <path d={z.path} fill={sel?(isBrasG?'#ef4444':'#0d9488'):'#e5e7eb'} stroke={sel?(isBrasG?'#b91c1c':'#0f766e'):'#c4c4c4'} strokeWidth="1"/>
                              <text textAnchor="middle" fontSize="6" fill={sel?'#fff':'#6b7280'} fontWeight={sel?'700':'400'}>
                                {z.id==='tete'&&<><tspan x="55" dy="22">{z.label}</tspan></>}
                                {z.id==='cou'&&<><tspan x="55" dy="54">{z.label}</tspan></>}
                                {z.id==='thorax'&&<><tspan x="55" dy="86">{z.label}</tspan></>}
                                {z.id==='bras_g'&&<><tspan x="93" dy="97">Bras G</tspan></>}
                                {z.id==='bras_d'&&<><tspan x="17" dy="97">Bras D</tspan></>}
                                {z.id==='avant_bras_g'&&<><tspan x="95" dy="155">AVB G</tspan></>}
                                {z.id==='avant_bras_d'&&<><tspan x="15" dy="155">AVB D</tspan></>}
                                {z.id==='abdomen'&&<><tspan x="55" dy="143">{z.label}</tspan></>}
                                {z.id==='bassin'&&<><tspan x="55" dy="178">Bassin</tspan></>}
                                {z.id==='cuisse_g'&&<><tspan x="69" dy="215">Cuisse G</tspan></>}
                                {z.id==='cuisse_d'&&<><tspan x="41" dy="215">Cuisse D</tspan></>}
                                {z.id==='jambe_g'&&<><tspan x="69" dy="260">Jambe G</tspan></>}
                                {z.id==='jambe_d'&&<><tspan x="41" dy="260">Jambe D</tspan></>}
                              </text>
                            </g>
                          );
                        })}
                      </svg>
                    </div>

                    {/* Dos */}
                    <div style={{textAlign:'center'}}>
                      <div style={{fontSize:9,color:'#9ca3af',marginBottom:3}}>Dos</div>
                      <svg width="110" height="280" viewBox="0 0 110 280">
                        {[
                          {id:'tete_dos',     label:'Tete (dos)',   path:'M55,4 C42,4 33,14 33,26 C33,38 42,46 55,46 C68,46 77,38 77,26 C77,14 68,4 55,4 Z'},
                          {id:'cou_dos',      label:'Cou (dos)',    path:'M46,46 L46,58 L64,58 L64,46 Z'},
                          {id:'dos_haut',     label:'Dos haut',     path:'M25,58 L85,58 L88,115 L22,115 Z'},
                          {id:'bras_g_dos',   label:'Bras G (dos)', path:'M84,60 L96,62 L100,130 L86,128 Z'},
                          {id:'bras_d_dos',   label:'Bras D (dos)', path:'M26,60 L14,62 L10,130 L24,128 Z'},
                          {id:'dos_bas',      label:'Dos bas/Reins',path:'M22,115 L88,115 L86,165 L24,165 Z'},
                          {id:'fesses',       label:'Fesses',       path:'M24,165 L86,165 L83,185 L27,185 Z'},
                          {id:'cuisse_g_dos', label:'Cuisse G (dos)',path:'M55,185 L82,185 L80,240 L57,240 Z'},
                          {id:'cuisse_d_dos', label:'Cuisse D (dos)',path:'M55,185 L28,185 L30,240 L53,240 Z'},
                          {id:'mollet_g',     label:'Mollet G',     path:'M57,240 L80,240 L78,278 L59,278 Z'},
                          {id:'mollet_d',     label:'Mollet D',     path:'M53,240 L30,240 L32,278 L51,278 Z'},
                        ].map(z=>{
                          const sel=form.douleur_zones.includes(z.id);
                          return(
                            <g key={z.id} onClick={()=>{
                              const zones=sel?form.douleur_zones.filter(x=>x!==z.id):[...form.douleur_zones,z.id];
                              set('douleur_zones',zones);
                            }} style={{cursor:'pointer'}}>
                              <path d={z.path} fill={sel?'#8b5cf6':'#e5e7eb'} stroke={sel?'#6d28d9':'#c4c4c4'} strokeWidth="1"/>
                              <text textAnchor="middle" fontSize="6" fill={sel?'#fff':'#6b7280'} fontWeight={sel?'700':'400'}>
                                {z.id==='tete_dos'&&<tspan x="55" dy="22">Tete</tspan>}
                                {z.id==='dos_haut'&&<tspan x="55" dy="86">Dos haut</tspan>}
                                {z.id==='bras_g_dos'&&<tspan x="93" dy="97">Bras G</tspan>}
                                {z.id==='bras_d_dos'&&<tspan x="17" dy="97">Bras D</tspan>}
                                {z.id==='dos_bas'&&<tspan x="55" dy="143">Dos bas</tspan>}
                                {z.id==='fesses'&&<tspan x="55" dy="178">Fesses</tspan>}
                                {z.id==='cuisse_g_dos'&&<tspan x="69" dy="215">Cuisse G</tspan>}
                                {z.id==='cuisse_d_dos'&&<tspan x="41" dy="215">Cuisse D</tspan>}
                                {z.id==='mollet_g'&&<tspan x="69" dy="260">Mollet G</tspan>}
                                {z.id==='mollet_d'&&<tspan x="41" dy="260">Mollet D</tspan>}
                              </text>
                            </g>
                          );
                        })}
                      </svg>
                    </div>
                  </div>

                  {/* Recap zones + alertes */}
                  <div style={{flex:1}}>
                    {/* Alerte bras gauche */}
                    {(form.douleur_zones.includes('bras_g')||form.douleur_zones.includes('avant_bras_g'))&&(
                      <div style={{background:'#fef2f2',border:'2px solid #ef4444',borderRadius:8,padding:'10px 12px',marginBottom:10}}>
                        <div style={{color:'#dc2626',fontWeight:700,fontSize:13}}>Douleur bras gauche - Faire ECG</div>
                        <div style={{color:'#ef4444',fontSize:12,marginTop:3}}>Allonger le patient et appeler le medecin immediatement</div>
                      </div>
                    )}

                    {/* Zones selectionnees */}
                    {form.douleur_zones.length>0&&(
                      <div style={{background:'#f0fdfa',borderRadius:8,border:'1px solid #99f6e4',padding:'8px 10px',marginBottom:10}}>
                        <div style={{fontSize:10,color:'#0d9488',fontWeight:700,marginBottom:5}}>Zones selectionnees :</div>
                        <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
                          {form.douleur_zones.map(z=>(
                            <span key={z} style={{background:'#fff',border:'1px solid #99f6e4',color:'#0d9488',fontSize:11,padding:'2px 8px',borderRadius:99,display:'flex',alignItems:'center',gap:4}}>
                              {z.replace(/_/g,' ')}
                              <button onClick={()=>set('douleur_zones',form.douleur_zones.filter(x=>x!==z))} style={{background:'none',border:'none',color:'#9ca3af',cursor:'pointer',fontSize:13,lineHeight:1,padding:0}}>x</button>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* EVA */}
                    <div>
                      <label style={{...lbl}}>Intensite (EVA 0-10)</label>
                      <div style={{display:'flex',alignItems:'center',gap:10}}>
                        <input type="range" min="0" max="10" value={form.douleur_eva} onChange={e=>set('douleur_eva',parseInt(e.target.value))}
                          style={{flex:1,accentColor:form.douleur_eva>=7?'#ef4444':form.douleur_eva>=4?'#f59e0b':'#16a34a'}}/>
                        <span style={{fontSize:22,fontWeight:800,minWidth:28,textAlign:'center',color:form.douleur_eva>=7?'#ef4444':form.douleur_eva>=4?'#f59e0b':'#16a34a'}}>{form.douleur_eva}</span>
                      </div>
                      <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'#9ca3af'}}>
                        <span>Pas de douleur</span><span>Douleur maximale</span>
                      </div>
                    </div>

                    {/* Zones supplementaires boutons */}
                    <div style={{marginTop:10}}>
                      <label style={lbl}>Autres zones</label>
                      <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
                        {[{id:'oreille_g',l:'Oreille gauche'},{id:'oreille_d',l:'Oreille droite'},{id:'bouche',l:'Bouche/Gorge'},{id:'oeil_g',l:'Oeil gauche'},{id:'oeil_d',l:'Oeil droit'}].map(z=>{
                          const sel=form.douleur_zones.includes(z.id);
                          return(
                            <button key={z.id} onClick={()=>{
                              const zones=sel?form.douleur_zones.filter(x=>x!==z.id):[...form.douleur_zones,z.id];
                              set('douleur_zones',zones);
                            }} style={{padding:'5px 10px',borderRadius:99,fontSize:11,background:sel?'#0d9488':'#fff',color:sel?'#fff':'#374151',border:'1px solid '+(sel?'#0d9488':'#e5e7eb'),cursor:'pointer'}}>
                              {z.l}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {form.douleur_zones.includes('thorax')&&(
                  <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:8,padding:'10px 12px',marginBottom:10}}>
                    <div style={{color:'#dc2626',fontWeight:700,fontSize:13}}>Douleur thoracique - Action immediate</div>
                    <div style={{color:'#ef4444',fontSize:12,marginTop:4}}>Allonger le patient et preparer l'ECG. Prevenir le medecin.</div>
                    <button onClick={()=>set('ecg_fait',!form.ecg_fait)} style={{marginTop:8,padding:'6px 14px',borderRadius:6,background:form.ecg_fait?'#16a34a':'#fff',color:form.ecg_fait?'#fff':'#374151',border:'1px solid '+(form.ecg_fait?'#16a34a':'#e5e7eb'),fontSize:12,fontWeight:600,cursor:'pointer'}}>
                      {form.ecg_fait?'✓ ECG realise':'Marquer ECG realise'}
                    </button>
                  </div>
                )}

                {form.douleur_zones.includes('abdomen')&&form.sexe==='F'&&(
                  <div style={{background:'#f5f3ff',border:'1px solid #ddd6fe',borderRadius:8,padding:'10px 12px',marginBottom:10}}>
                    <div style={{color:'#7c3aed',fontWeight:700,fontSize:13}}>Douleur abdominale chez une femme</div>
                    <div style={{color:'#8b5cf6',fontSize:12,marginTop:4}}>Donner un pot a urine pour BU et bHCG urinaire.</div>
                    <div style={{display:'flex',gap:8,marginTop:8}}>
                      <button onClick={()=>set('bu_fait',!form.bu_fait)} style={{padding:'6px 14px',borderRadius:6,background:form.bu_fait?'#7c3aed':'#fff',color:form.bu_fait?'#fff':'#374151',border:'1px solid '+(form.bu_fait?'#7c3aed':'#e5e7eb'),fontSize:12,fontWeight:600,cursor:'pointer'}}>
                        {form.bu_fait?'✓ BU faite':'BU'}
                      </button>
                      <button onClick={()=>set('bhcg_fait',!form.bhcg_fait)} style={{padding:'6px 14px',borderRadius:6,background:form.bhcg_fait?'#7c3aed':'#fff',color:form.bhcg_fait?'#fff':'#374151',border:'1px solid '+(form.bhcg_fait?'#7c3aed':'#e5e7eb'),fontSize:12,fontWeight:600,cursor:'pointer'}}>
                        {form.bhcg_fait?'✓ bHCG fait':'bHCG'}
                      </button>
                    </div>
                  </div>
                )}

                <div style={{marginTop:8}}>
                  <label style={lbl}>Intensite (EVA 0-10)</label>
                  <div style={{display:'flex',alignItems:'center',gap:12}}>
                    <input type="range" min="0" max="10" value={form.douleur_eva} onChange={e=>set('douleur_eva',parseInt(e.target.value))} style={{flex:1,accentColor:form.douleur_eva>=7?'#ef4444':form.douleur_eva>=4?'#f59e0b':'#16a34a'}}/>
                    <span style={{fontSize:24,fontWeight:700,minWidth:28,textAlign:'center',color:form.douleur_eva>=7?'#ef4444':form.douleur_eva>=4?'#f59e0b':'#16a34a'}}>{form.douleur_eva}</span>
                  </div>
                </div>
              </div>
            )}

            {/* FIEVRE */}
            {form.symptome==='fievre'&&(
              <div style={{marginTop:16,padding:14,background:'#f9fafb',borderRadius:10,border:'1px solid #e5e7eb'}}>
                <label style={lbl}>Fievre depuis ?</label>
                <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                  {['Quelques heures','1 jour','2-3 jours','Plus de 3 jours'].map(d=>(
                    <button key={d} onClick={()=>set('fievre_depuis',d)} style={{padding:'8px 14px',borderRadius:99,fontSize:12,background:form.fievre_depuis===d?'#0d9488':'#fff',color:form.fievre_depuis===d?'#fff':'#374151',border:'1px solid '+(form.fievre_depuis===d?'#0d9488':'#e5e7eb'),cursor:'pointer'}}>
                      {d}
                    </button>
                  ))}
                </div>
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
                      <div>2. Realiser un dextro et un hemocue</div>
                      <div>3. Installer en brancard 1</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* DETRESSE RESPIRATOIRE */}
            {form.symptome==='detresse_respi'&&(
              <div style={{marginTop:16,padding:14,background:'#f9fafb',borderRadius:10,border:'1px solid #e5e7eb'}}>
                <div style={{fontWeight:700,color:'#374151',fontSize:13,marginBottom:10}}>Evaluer la gravite</div>
                <div style={{marginBottom:10}}>
                  <label style={lbl}>Signe de lutte (tirage, n'arrive pas a parler) ?</label>
                  <div style={{display:'flex',gap:8}}>
                    <button onClick={()=>set('signe_lutte',true)} style={{flex:1,padding:'10px',borderRadius:8,background:form.signe_lutte===true?'#ef4444':'#f9fafb',color:form.signe_lutte===true?'#fff':'#374151',border:'2px solid '+(form.signe_lutte===true?'#ef4444':'#e5e7eb'),fontWeight:600,fontSize:13,cursor:'pointer'}}>
                      Oui - Signe de lutte
                    </button>
                    <button onClick={()=>set('signe_lutte',false)} style={{flex:1,padding:'10px',borderRadius:8,background:form.signe_lutte===false&&form.signe_lutte!==''?'#16a34a':'#f9fafb',color:form.signe_lutte===false&&form.signe_lutte!==''?'#fff':'#374151',border:'2px solid '+(form.signe_lutte===false&&form.signe_lutte!==''?'#16a34a':'#e5e7eb'),fontWeight:600,fontSize:13,cursor:'pointer'}}>
                      Non - Pas de lutte
                    </button>
                  </div>
                </div>
                {form.sat&&(
                  <div style={{marginTop:8}}>
                    {(parseFloat(form.sat)<95||form.signe_lutte===true)?(
                      <div style={{background:'#fef2f2',border:'2px solid #ef4444',borderRadius:8,padding:'10px 12px'}}>
                        <div style={{color:'#dc2626',fontWeight:700,fontSize:13}}>Detresse severe - ALERTER MEDECIN</div>
                        <div style={{color:'#ef4444',fontSize:12,marginTop:4}}>Installer en Brancard 1 (ou B2 si B1 occupe) en position demi-assise</div>
                      </div>
                    ):(
                      <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:8,padding:'10px 12px'}}>
                        <div style={{color:'#16a34a',fontWeight:700,fontSize:13}}>Detresse moderee</div>
                        <div style={{color:'#15803d',fontSize:12,marginTop:4}}>Installer en Fauteuil 1 ou 2 en position demi-assise</div>
                      </div>
                    )}
                  </div>
                )}
                {!form.sat&&(
                  <div style={{background:'#fffbeb',border:'1px solid #fde68a',borderRadius:8,padding:'8px 12px',marginTop:8}}>
                    <div style={{color:'#d97706',fontSize:12}}>Renseignez la saturation pour voir la recommandation</div>
                  </div>
                )}
              </div>
            )}

            {/* VERTIGE */}
            {form.symptome==='vertige'&&(
              <div style={{marginTop:16,padding:14,background:'#eff6ff',borderRadius:10,border:'1px solid #bfdbfe'}}>
                <div style={{color:'#1d4ed8',fontWeight:700,fontSize:13,marginBottom:10}}>Vertige / Malaise - Realiser dextro et hemocue</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                  <div>
                    <label style={{...lbl,color:'#3b82f6'}}>Dextro (g/L)</label>
                    <input type="number" step="0.1" value={form.dextro||''} onChange={e=>set('dextro',e.target.value)}
                      placeholder="Ex: 1.0"
                      style={{...inp,borderColor:form.dextro&&(parseFloat(form.dextro)<0.7||parseFloat(form.dextro)>2)?'#ef4444':'#bfdbfe'}}/>
                    {form.dextro&&parseFloat(form.dextro)<0.5&&<div style={{color:'#ef4444',fontSize:11,marginTop:3,fontWeight:700,background:'#fef2f2',padding:'4px 8px',borderRadius:5}}>HYPOGLYCEMIE SEVERE - Brancard 1 + alerter medecin</div>}
                    {form.dextro&&parseFloat(form.dextro)>=0.5&&parseFloat(form.dextro)<0.7&&<div style={{color:'#ef4444',fontSize:11,marginTop:3,fontWeight:600}}>Hypoglycemie - Alerter medecin</div>}
                    {form.dextro&&parseFloat(form.dextro)>2&&<div style={{color:'#f59e0b',fontSize:11,marginTop:3,fontWeight:600}}>Hyperglycemie - Prevenir medecin</div>}
                  </div>
                  <div>
                    <label style={{...lbl,color:'#3b82f6'}}>Hemocue (g/dL)</label>
                    <input type="number" step="0.1" value={form.hemocue||''} onChange={e=>set('hemocue',e.target.value)}
                      placeholder="Ex: 12.0"
                      style={{...inp,borderColor:form.hemocue&&parseFloat(form.hemocue)<8?'#ef4444':'#bfdbfe'}}/>
                    {form.hemocue&&parseFloat(form.hemocue)<7&&<div style={{color:'#ef4444',fontSize:11,marginTop:3,fontWeight:700,background:'#fef2f2',padding:'4px 8px',borderRadius:5}}>ANEMIE SEVERE - Brancard 1 + alerter medecin</div>}
                    {form.hemocue&&parseFloat(form.hemocue)>=7&&parseFloat(form.hemocue)<10&&<div style={{color:'#ef4444',fontSize:11,marginTop:3,fontWeight:600}}>Anemie - Alerter medecin</div>}
                    {form.hemocue&&parseFloat(form.hemocue)>=10&&parseFloat(form.hemocue)<12&&<div style={{color:'#f59e0b',fontSize:11,marginTop:3,fontWeight:600}}>Anemie moderee - Prevenir medecin</div>}
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
                    ['ok','Carnet present - vaccin lisible (1ere ou derniere page)','#16a34a','✓'],
                    ['illisible','Carnet present mais illisible / incomplet','#f59e0b','⚠️'],
                    ['absent','Pas de carnet','#ef4444','✗'],
                  ].map(([v,l,c,ic])=>(
                    <button key={v} onClick={()=>{set('plaie_vaccin',v);if(v!=='ok')set('quicktest','');}} style={{padding:'12px 16px',borderRadius:10,fontSize:13,background:form.plaie_vaccin===v?c+'15':'#f9fafb',color:form.plaie_vaccin===v?c:'#374151',border:'2px solid '+(form.plaie_vaccin===v?c:'#e5e7eb'),cursor:'pointer',fontWeight:600,textAlign:'left',display:'flex',alignItems:'center',gap:10}}>
                      <span style={{fontSize:16}}>{ic}</span>{l}
                    </button>
                  ))}
                </div>
                {(form.plaie_vaccin==='illisible'||form.plaie_vaccin==='absent')&&(
                  <div style={{background:'#fffbeb',border:'2px solid #f59e0b',borderRadius:10,padding:'12px 14px'}}>
                    <div style={{color:'#d97706',fontWeight:700,fontSize:13,marginBottom:8}}>Quick Test Tetanos - A realiser maintenant</div>
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

            {/* ASTHME */}
            {form.symptome==='asthme'&&(
              <div style={{marginTop:16,padding:14,background:'#f9fafb',borderRadius:10,border:'1px solid #e5e7eb'}}>
                <div style={{fontWeight:700,color:'#374151',fontSize:13,marginBottom:10}}>Evaluer l'asthme</div>
                <div style={{marginBottom:10}}>
                  <label style={lbl}>Signe de lutte (tirage, n'arrive pas a parler) ?</label>
                  <div style={{display:'flex',gap:8}}>
                    <button onClick={()=>set('signe_lutte',true)} style={{flex:1,padding:'9px',borderRadius:8,background:form.signe_lutte===true?'#ef4444':'#f9fafb',color:form.signe_lutte===true?'#fff':'#374151',border:'2px solid '+(form.signe_lutte===true?'#ef4444':'#e5e7eb'),fontWeight:600,fontSize:12,cursor:'pointer'}}>
                      Signe de lutte
                    </button>
                    <button onClick={()=>set('signe_lutte',false)} style={{flex:1,padding:'9px',borderRadius:8,background:form.signe_lutte===false&&form.signe_lutte!==''?'#16a34a':'#f9fafb',color:form.signe_lutte===false&&form.signe_lutte!==''?'#fff':'#374151',border:'2px solid '+(form.signe_lutte===false&&form.signe_lutte!==''?'#16a34a':'#e5e7eb'),fontWeight:600,fontSize:12,cursor:'pointer'}}>
                      Pas de lutte
                    </button>
                  </div>
                </div>
                {form.sat?(
                  (parseFloat(form.sat)<95||form.signe_lutte===true)?(
                    <div style={{background:'#fef2f2',border:'2px solid #ef4444',borderRadius:8,padding:'10px 12px'}}>
                      <div style={{color:'#dc2626',fontWeight:700,fontSize:13}}>Asthme severe - Fauteuil 1 + O2</div>
                      <div style={{color:'#ef4444',fontSize:12,marginTop:6,lineHeight:1.7}}>
                        <div>Installer en F1 · O2 5L/min · Scope obligatoire</div>
                        <div>Surveillance saturation en continu</div>
                        <div style={{fontWeight:700,marginTop:4}}>Aerosols :</div>
                        <div>1er : Ventoline {parseFloat(form.poids||99)<16?'2.5':'5'}mL + Atrovent {parseFloat(form.poids||99)<16?'0.25':'0.5'}mg sous O2</div>
                        <div>2e et 3e : Ventoline {parseFloat(form.poids||99)<16?'2.5':'5'}mL sous O2</div>
                        <div>Reevaluation apres chaque aerosol</div>
                      </div>
                    </div>
                  ):(
                    <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:8,padding:'10px 12px'}}>
                      <div style={{color:'#16a34a',fontWeight:700,fontSize:13}}>Asthme modere - Observation 1 + AIR</div>
                      <div style={{color:'#15803d',fontSize:12,marginTop:6,lineHeight:1.7}}>
                        <div>Installer en O1 · Aerosol sur AIR</div>
                        <div style={{fontWeight:700,marginTop:4}}>Aerosols :</div>
                        <div>1er : Ventoline {parseFloat(form.poids||99)<16?'2.5':'5'}mL + Atrovent {parseFloat(form.poids||99)<16?'0.25':'0.5'}mg sur AIR</div>
                        <div>2e et 3e : Ventoline {parseFloat(form.poids||99)<16?'2.5':'5'}mL sur AIR</div>
                        <div>Reevaluation apres chaque aerosol</div>
                      </div>
                    </div>
                  )
                ):(
                  <div style={{background:'#fffbeb',border:'1px solid #fde68a',borderRadius:8,padding:'8px 12px'}}>
                    <div style={{color:'#d97706',fontSize:12}}>Renseignez la saturation pour voir la recommandation</div>
                  </div>
                )}
              </div>
            )}
          </div>

            {/* AUTRE */}
            {form.symptome==='autre'&&(
              <div style={{marginTop:16,padding:14,background:'#f9fafb',borderRadius:10,border:'1px solid #e5e7eb'}}>
                <label style={lbl}>Decrivez le symptome</label>
                <textarea value={form.symptome_autre||''} onChange={e=>set('symptome_autre',e.target.value)}
                  placeholder="Decrivez le motif de consultation..."
                  rows={3} style={{...inp,resize:'vertical'}}/>
                {(cfcCol==='red'||csatCol==='red'||ctasCol==='red'||ctadCol==='red'||ctempCol==='red')&&(
                  <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:8,padding:'10px',marginTop:8}}>
                    <div style={{color:'#dc2626',fontWeight:700,fontSize:13}}>Constante anormale detectee</div>
                    <div style={{color:'#ef4444',fontSize:12,marginTop:4}}>Prevenir le medecin avant d'installer le patient</div>
                  </div>
                )}
              </div>
            )}

          {/* PLACEMENT SUGGERE */}
          {placement && (
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
              <button onClick={()=>setShowVue(false)} style={{width:32,height:32,borderRadius:'50%',background:'#e5e7eb',color:'#374151',fontSize:18,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',border:'none',fontWeight:700}}>x</button>
            </div>
            <iframe src="/vue-ensemble" style={{flex:1,border:'none',width:'100%'}}/>
          </div>
        </div>
      )}
    </div>
  );
}
