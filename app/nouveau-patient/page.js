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
      const sess=JSON.parse(sessionStorage.getItem('pds_user')||'{}'); router.push('/vueglobale');
      setForm({ sexe:'',nom:'',prenom:'',ddn:'',ipp:'',allergie:'',allergie_detail:'',medicaments_today:'',medicaments_detail:'',fc:'',sat:'',tas:'',tad:'',temp:'',poids:'',taille:'',symptome:'',symptome_autre:'',signe_lutte:'',respire:'',dextro:'',hemocue:'',douleur_zones:[],douleur_eva:5,nausee:'',tache_corps:'',fievre_jours:'',bu_resultat:'',bhcg_resultat:'',fievre_depuis:'',plaie_vaccin:'',quicktest:'',ecg_fait:false,bu_fait:false,bhcg_fait:false,notes:'' });
    }
  }

  if (!user) return null;

  const inp = { width:'100%', padding:'10px 12px', borderRadius:8, border:'1.5px solid #e5e7eb', fontSize:14, outline:'none', background:'#fff', color:'#111827', boxSizing:'border-box' };
  const lbl = { fontSize:12, fontWeight:600, color:'#6b7280', display:'block', marginBottom:5, textTransform:'uppercase', letterSpacing:0.5 };

  return (