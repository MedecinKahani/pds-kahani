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
  { id: 'detresse_respi', label: 'Detresse respiratoire', icon: '😮‍💨' },
  { id: 'asthme', label: 'Asthme', icon: '💨' },
  { id: 'vertige', label: 'Vertige / Malaise', icon: '💫' },
  { id: 'plaie', label: 'Plaie / Traumatisme', icon: '🩹' },
  { id: 'autre', label: 'Autre', icon: '❓' },
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

export default function PageAS() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [patients, setPatients] = useState([]);
  const [vue, setVue] = useState('liste'); // liste | nouveau

  const [form, setForm] = useState({
    sexe: '', nom: '', prenom: '', ddn: '', ipp: '',
    allergie: '', allergie_detail: '',
    medicaments_today: '', medicaments_detail: '',
    fc: '', sat: '', tas: '', tad: '', temp: '', poids: '', taille: '',
    symptome: '',
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

    if (s === 'coma' || (s === 'detresse_respi' && sat < 90) || (s === 'douleur' && form.douleur_zones.includes('thorax'))) {
      return { place: 'brancard1', label: 'B1 - Brancard 1', urgence: true, msg: null };
    }
    if (s === 'asthme') {
      if (sat >= 95) {
        return { place: 'obs2', label: 'O2 - Fauteuil observation', urgence: false, msg: 'Installer en fauteuil observation. Aerosol sur AIR : Ventoline + Atrovent (1 seule fois), puis 2x Ventoline. Reevaluation saturation + clinique apres chaque aerosol.' };
      } else {
        return { place: 'fauteuil1', label: 'F1 - Fauteuil 1', urgence: true, msg: 'Installer en fauteuil 1. Aerosol sur O2 5L : Ventoline + Atrovent (1 seule fois), puis 2x Ventoline. Scope a mettre en place. Reevaluation apres chaque aerosol.' };
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
      setForm({ sexe:'',nom:'',prenom:'',ddn:'',ipp:'',allergie:'',allergie_detail:'',medicaments_today:'',medicaments_detail:'',fc:'',sat:'',tas:'',tad:'',temp:'',poids:'',taille:'',symptome:'',douleur_zones:[],douleur_eva:5,fievre_depuis:'',plaie_vaccin:'',quicktest:'',ecg_fait:false,bu_fait:false,bhcg_fait:false,notes:'' });
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
            <div style={{ textAlign:'center', color:'#9ca3af', padding:'4rem 0', background:'#fff', borderRadius:12, border:'1px solid #e5e7eb' }}>
              <div style={{ fontSize:36, marginBottom:8 }}>🌙</div>
              <div>Aucun patient en ce moment</div>
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
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:12 }}>
              {[
                {k:'fc',l:'FC',u:'bpm',icon:'❤️',col:cfcCol,ph:'75'},
                {k:'sat',l:'SpO2',u:'%',icon:'💧',col:csatCol,ph:'98'},
                {k:'tas',l:'PAS',u:'mmHg',icon:'🩸',col:ctasCol,ph:'120'},
                {k:'tad',l:'PAD',u:'mmHg',icon:'🩸',col:ctadCol,ph:'80'},
                {k:'temp',l:'Temperature',u:'°C',icon:'🌡️',col:ctempCol,ph:'37.0'},
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
                <div style={{fontWeight:600,color:'#374151',fontSize:13,marginBottom:10}}>Ou est la douleur ?</div>
                <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:12}}>
                  {ZONES_CORPS.map(z=>{
                    const sel=form.douleur_zones.includes(z.id);
                    return(
                      <button key={z.id} onClick={()=>{
                        const zones=sel?form.douleur_zones.filter(x=>x!==z.id):[...form.douleur_zones,z.id];
                        set('douleur_zones',zones);
                      }} style={{padding:'6px 12px',borderRadius:99,fontSize:12,fontWeight:500,background:sel?'#0d9488':'#fff',color:sel?'#fff':'#374151',border:'1px solid '+(sel?'#0d9488':'#e5e7eb'),cursor:'pointer'}}>
                        {z.label}
                      </button>
                    );
                  })}
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

            {/* VERTIGE */}
            {form.symptome==='vertige'&&(
              <div style={{marginTop:16,padding:14,background:'#eff6ff',borderRadius:10,border:'1px solid #bfdbfe'}}>
                <div style={{color:'#1d4ed8',fontWeight:700,fontSize:13}}>Vertige / Malaise - A realiser</div>
                <div style={{color:'#3b82f6',fontSize:12,marginTop:4}}>Realiser un dextro et un hemocue.</div>
              </div>
            )}

            {/* PLAIE */}
            {form.symptome==='plaie'&&(
              <div style={{marginTop:16,padding:14,background:'#f9fafb',borderRadius:10,border:'1px solid #e5e7eb'}}>
                <label style={lbl}>Etat du carnet de vaccination</label>
                <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:10}}>
                  {[['ok','Vaccin a jour (moins de 5 ans)','#16a34a'],['depasse','Vaccin ancien (plus de 5 ans)','#f59e0b'],['absent','Pas de carnet / illisible','#ef4444']].map(([v,l,c])=>(
                    <button key={v} onClick={()=>set('plaie_vaccin',v)} style={{padding:'8px 14px',borderRadius:99,fontSize:12,background:form.plaie_vaccin===v?c:'/fff',color:form.plaie_vaccin===v?'#fff':'#374151',border:'1px solid '+(form.plaie_vaccin===v?c:'#e5e7eb'),cursor:'pointer',fontWeight:500}}>
                      {l}
                    </button>
                  ))}
                </div>
                {(form.plaie_vaccin==='depasse'||form.plaie_vaccin==='absent')&&(
                  <div style={{background:'#fffbeb',border:'1px solid #fde68a',borderRadius:8,padding:'10px 12px'}}>
                    <div style={{color:'#d97706',fontWeight:700,fontSize:13}}>Realiser le Quick Test Tetanos maintenant</div>
                    <div style={{display:'flex',gap:8,marginTop:8}}>
                      {['Negatif','Positif'].map(r=>(
                        <button key={r} onClick={()=>set('quicktest',r)} style={{padding:'6px 14px',borderRadius:6,background:form.quicktest===r?'#f59e0b':'#fff',color:form.quicktest===r?'#fff':'#374151',border:'1px solid '+(form.quicktest===r?'#f59e0b':'#e5e7eb'),fontSize:12,fontWeight:600,cursor:'pointer'}}>
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ASTHME */}
            {form.symptome==='asthme'&&form.sat&&(
              <div style={{marginTop:16,padding:14,background:parseFloat(form.sat)<95?'#fef2f2':'#f0fdf4',borderRadius:10,border:'1px solid '+(parseFloat(form.sat)<95?'#fecaca':'#bbf7d0')}}>
                {parseFloat(form.sat)<95?(
                  <>
                    <div style={{color:'#dc2626',fontWeight:700,fontSize:13}}>Saturation basse - Fauteuil 1 avec O2</div>
                    <div style={{color:'#ef4444',fontSize:12,marginTop:6}}>
                      <div>Installer en F1 · O2 5L/min · Scope</div>
                      <div style={{marginTop:6,fontWeight:600}}>Protocol aerosol :</div>
                      <div>1er : Ventoline + Atrovent</div>
                      <div>2e et 3e : Ventoline seule</div>
                      <div>Reevaluation saturation + clinique apres chaque aerosol</div>
                      <div style={{marginTop:6,fontWeight:600}}>Posologie Ventoline : {age&&age<16&&parseFloat(form.poids||99)<16?'2.5 mL':'5 mL'}</div>
                      <div>Posologie Atrovent : {age&&parseFloat(form.poids||99)<16?'0.25 mg (1 fois)':'0.5 mg (1 fois)'}</div>
                    </div>
                  </>
                ):(
                  <>
                    <div style={{color:'#16a34a',fontWeight:700,fontSize:13}}>Saturation correcte - Fauteuil observation</div>
                    <div style={{color:'#15803d',fontSize:12,marginTop:6}}>
                      <div>Installer en O2 · Aerosol sur AIR</div>
                      <div style={{marginTop:4,fontWeight:600}}>Protocol aerosol :</div>
                      <div>1er : Ventoline + Atrovent</div>
                      <div>2e et 3e : Ventoline seule</div>
                      <div>Reevaluation apres chaque aerosol</div>
                      <div style={{marginTop:4,fontWeight:600}}>Posologie Ventoline : {age&&parseFloat(form.poids||99)<16?'2.5 mL':'5 mL'}</div>
                      <div>Posologie Atrovent : {age&&parseFloat(form.poids||99)<16?'0.25 mg (1 fois)':'0.5 mg (1 fois)'}</div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

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
    </div>
  );
}
