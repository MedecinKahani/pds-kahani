'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const ZONES_CORPS = [
  { id: 'tete', label: 'Tête', x: 140, y: 20, w: 60, h: 50 },
  { id: 'oreille_g', label: 'Oreille gauche', x: 110, y: 35, w: 28, h: 28 },
  { id: 'oreille_d', label: 'Oreille droite', x: 202, y: 35, w: 28, h: 28 },
  { id: 'bouche', label: 'Bouche / gorge', x: 148, y: 58, w: 44, h: 22 },
  { id: 'cou', label: 'Cou', x: 150, y: 75, w: 40, h: 22 },
  { id: 'thorax', label: 'Thorax', x: 120, y: 100, w: 100, h: 70 },
  { id: 'bras_g', label: 'Bras gauche', x: 70, y: 105, w: 45, h: 90 },
  { id: 'bras_d', label: 'Bras droit', x: 225, y: 105, w: 45, h: 90 },
  { id: 'abdomen', label: 'Abdomen', x: 125, y: 172, w: 90, h: 65 },
  { id: 'oge', label: 'OGE', x: 148, y: 238, w: 44, h: 28 },
  { id: 'jambe_g', label: 'Jambe gauche', x: 115, y: 268, w: 50, h: 110 },
  { id: 'jambe_d', label: 'Jambe droite', x: 175, y: 268, w: 50, h: 110 },
];

const EMPLACEMENTS = [
  { id: 'brancard1', label: 'B1 — Brancard 1', salle: 'Déchocage', urgence: true },
  { id: 'brancard2', label: 'B2 — Brancard 2', salle: 'Déchocage', urgence: true },
  { id: 'lit1', label: 'L1 — Lit 1', salle: 'Salle 2' },
  { id: 'lit2', label: 'L2 — Lit 2', salle: 'Salle 2' },
  { id: 'fauteuil1', label: 'F1 — Fauteuil 1', salle: 'Salle 2', o2: true },
  { id: 'fauteuil2', label: 'F2 — Fauteuil 2', salle: 'Salle 2', o2: true },
  { id: 'obs1', label: 'O1 — Observation 1', salle: 'Observation' },
  { id: 'obs2', label: 'O2 — Observation 2', salle: 'Observation' },
  { id: 'pansement', label: 'P1 — Pansement', salle: 'Pansement' },
  { id: 'consultation', label: 'CS — Consultation', salle: 'Médecin' },
  { id: 'preau', label: '⏳ Préau — Attente dehors', salle: 'Préau', special: true },
];

function calcAge(ddn) {
  if (!ddn) return null;
  const diff = Date.now() - new Date(ddn).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

function estHorsNormes(champ, valeur, age) {
  const v = parseFloat(valeur);
  if (isNaN(v)) return false;
  const normes = {
    sat: [94, 100],
    fc: [50, 100],
    ta_sys: [90, 150],
    ta_dia: [60, 95],
    temp: [36, 38.4],
    dextro: [0.7, 2.0],
    hemocue: [10, 18],
  };
  const [min, max] = normes[champ] || [0, 9999];
  return v < min || v > max;
}

function toutesConstantesNormales(form) {
  const normes = {
    sat: [94, 100], fc: [50, 100],
    ta_sys: [90, 150], ta_dia: [60, 95], temp: [36, 38.4]
  };
  return Object.entries(normes).every(([k, [min, max]]) => {
    const v = parseFloat(form[k]);
    if (isNaN(v)) return true;
    return v >= min && v <= max;
  });
}

const MOTIFS_NON_URGENTS = ['fievre', 'vertige', 'autre', 'douleur_abdominale'];

function suggerePlacement(motifs, constantes, empsDispos) {
  const suggestions = [];
  const { sat, motifPrincipal, thoraxAlerte, coma } = motifs;
  const toutNormal = toutesConstantesNormales(constantes);
  const motifBenin = MOTIFS_NON_URGENTS.includes(motifPrincipal);

  if (toutNormal && motifBenin) {
    suggestions.push('preau');
    return suggestions;
  }

  if (coma || motifPrincipal === 'coma') {
    suggestions.push('brancard1');
    suggestions.push('brancard2');
  } else if (thoraxAlerte || motifPrincipal === 'douleur_thorax') {
    suggestions.push('brancard1');
    suggestions.push('brancard2');
  } else if (motifPrincipal === 'asthme') {
    const satVal = parseFloat(sat);
    if (!isNaN(satVal) && satVal < 95) {
      suggestions.push('fauteuil1');
      suggestions.push('fauteuil2');
    } else {
      suggestions.push('obs1');
      suggestions.push('obs2');
    }
  } else if (motifPrincipal === 'plaie' || motifPrincipal === 'suture') {
    suggestions.push('pansement');
    suggestions.push('brancard2');
  } else if (motifPrincipal === 'fievre' || motifPrincipal === 'douleur') {
    suggestions.push('lit1');
    suggestions.push('lit2');
    suggestions.push('obs1');
  } else {
    suggestions.push('lit1');
    suggestions.push('lit2');
  }

  const dispoIds = empsDispos.map(e => e.id);
  const filtres = suggestions.filter(s => dispoIds.includes(s));
  if (filtres.length === 0) return suggestions;
  return filtres;
}

export default function PageAS() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [patients, setPatients] = useState([]);
  const [etape, setEtape] = useState('liste');
  const [urgenceVitale, setUrgenceVitale] = useState(false);
  const [alerte, setAlerte] = useState(null);

  const [form, setForm] = useState({
    sexe: '', nom: '', prenom: '', ddn: '', ipp: '',
    allergie: '', allergie_detail: '',
    sat: '', fc: '', ta_sys: '', ta_dia: '', temp: '', dextro: '', hemocue: '',
    motifPrincipal: '',
    douleur_zones: [],
    douleur_eva: 5,
    fievre_depuis: '',
    plaie_vaccin: '',
    quicktest_tetanos: false,
    bu_urine: false, bhcg: false,
    ecg: false,
    emplacement: '',
    notes_as: '',
    coma: false,
  });

  useEffect(() => {
    const session = sessionStorage.getItem('pds_user');
    if (!session) { router.push('/login'); return; }
    const u = JSON.parse(session);
    if (u.role !== 'as') { router.push('/'); return; }
    setUser(u);
    chargerPatients();
    const interval = setInterval(chargerPatients, 15000);
    return () => clearInterval(interval);
  }, []);

  async function chargerPatients() {
    const res = await fetch('/api/patients');
    const data = await res.json();
    setPatients(data.patients || []);
  }

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  function toggleZone(zoneId) {
    setForm(f => {
      const zones = f.douleur_zones.includes(zoneId)
        ? f.douleur_zones.filter(z => z !== zoneId)
        : [...f.douleur_zones, zoneId];
      const thoraxAlerte = zones.includes('thorax');
      return { ...f, douleur_zones: zones, thoraxAlerte };
    });
  }

  function handleComa(val) {
    set('coma', val);
    if (val) {
      setUrgenceVitale(true);
      setAlerte({ type: 'coma', msg: '⚠️ PATIENT INCONSCIENT — Alerter le médecin immédiatement et vérifier la respiration' });
    } else {
      setUrgenceVitale(false);
      setAlerte(null);
    }
  }

  const empsOccupes = patients.map(p => p.emplacement);
  const empsDispos = EMPLACEMENTS.filter(e => !empsOccupes.includes(e.id));
  const suggestions = etape === 'placement' ? suggerePlacement(
    { ...form, coma: form.coma || form.motifPrincipal === 'coma' },
    form,
    empsDispos
  ) : [];

  async function creerPatient() {
    const age = calcAge(form.ddn);
    const isPreau = form.emplacement === 'preau';
    const statut = isPreau ? 'preau' : 'attente_medecin';
    const emplacementFinal = isPreau ? null : form.emplacement;
    const patient = {
      ...form,
      age,
      creePar: user.matricule,
      statut,
      emplacement: emplacementFinal,
      emplacement_suggere: isPreau ? (suggestions[1] || 'lit1') : form.emplacement,
    };
    const res = await fetch('/api/patients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create', patient })
    });
    const data = await res.json();
    if (data.ok) {
      setPatients(data.patients);
      setEtape('liste');
      setForm({
        sexe: '', nom: '', prenom: '', ddn: '', ipp: '',
        allergie: '', allergie_detail: '',
        sat: '', fc: '', ta_sys: '', ta_dia: '', temp: '', dextro: '', hemocue: '',
        motifPrincipal: '', douleur_zones: [], douleur_eva: 5,
        fievre_depuis: '', plaie_vaccin: '', quicktest_tetanos: false,
        bu_urine: false, bhcg: false, ecg: false, emplacement: '', notes_as: '', coma: false,
      });
      setAlerte(null);
      setUrgenceVitale(false);
    }
  }

  function dureePresence(ts) {
    const diff = Date.now() - ts;
    const min = Math.floor(diff / 60000);
    if (min < 60) return `${min} min`;
    return `${Math.floor(min / 60)}h${(min % 60).toString().padStart(2, '0')}`;
  }

  const couleurStatut = {
    attente_medecin: '#f59e0b',
    en_cours: '#3b82f6',
    vu: '#10b981',
    transfert: '#8b5cf6',
    sorti: '#6b7280',
  };
  const labelStatut = {
    attente_medecin: 'En attente',
    en_cours: 'En cours',
    vu: 'Vu',
    transfert: 'Transfert',
  };

  if (!user) return null;

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a' }}>
      <nav style={{
        background: '#1e293b', borderBottom: '1px solid #334155',
        padding: '0 1rem', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', height: 56
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 22 }}>🏥</span>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>PDS Kahani</span>
          <span style={{ background: '#f59e0b', color: '#000', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4 }}>AIDE-SOIGNANT</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: '#94a3b8', fontSize: 13 }}>{user.nom} — {user.matricule}</span>
          <button onClick={() => { sessionStorage.clear(); router.push('/login'); }}
            style={{ background: '#334155', color: '#cbd5e1', padding: '6px 12px', borderRadius: 6, fontSize: 13 }}>
            Déconnexion
          </button>
        </div>
      </nav>

      {urgenceVitale && alerte && (
        <div style={{
          background: '#7f1d1d', border: '2px solid #ef4444',
          padding: '16px 20px', margin: '0',
          display: 'flex', alignItems: 'center', gap: 12,
          animation: 'pulse 1s infinite'
        }}>
          <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.7} }`}</style>
          <span style={{ fontSize: 28 }}>🚨</span>
          <div>
            <div style={{ color: '#fef2f2', fontWeight: 700, fontSize: 18 }}>{alerte.msg}</div>
            {alerte.type === 'coma' && (
              <div style={{ color: '#fca5a5', fontSize: 14, marginTop: 4 }}>
                Vérifiez si le patient respire — si non, appelez le médecin et démarrez la RCP
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{ padding: '1rem', maxWidth: 900, margin: '0 auto' }}>

        {etape === 'liste' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ color: '#f1f5f9', fontSize: 20, fontWeight: 600 }}>
                Patients en cours ({patients.length})
              </h2>
              <button
                onClick={() => setEtape('identite')}
                style={{
                  background: '#3b82f6', color: '#fff', padding: '10px 20px',
                  borderRadius: 10, fontSize: 15, fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: 8
                }}
              >
                + Nouveau patient
              </button>
            </div>

            {patients.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#475569', padding: '3rem', background: '#1e293b', borderRadius: 12 }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>🌙</div>
                <div style={{ fontSize: 16 }}>Aucun patient en ce moment</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {patients.map(p => (
                  <div key={p.id} style={{
                    background: '#1e293b', border: '1px solid #334155',
                    borderRadius: 12, padding: '14px 16px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: '50%',
                        background: '#334155', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: 20
                      }}>
                        {p.sexe === 'F' ? '👩' : '👨'}
                      </div>
                      <div>
                        <div style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 16 }}>
                          {p.nom} {p.prenom} {p.age && <span style={{ color: '#94a3b8', fontWeight: 400, fontSize: 14 }}>({p.age} ans)</span>}
                        </div>
                        <div style={{ color: '#94a3b8', fontSize: 13 }}>
                          {EMPLACEMENTS.find(e => e.id === p.emplacement)?.label || 'Non placé'} — {p.motifPrincipal || 'Motif non précisé'}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ color: '#64748b', fontSize: 12 }}>{dureePresence(parseInt(p.arrivee))}</span>
                      <span style={{
                        background: couleurStatut[p.statut] || '#334155',
                        color: '#fff', fontSize: 11, fontWeight: 600,
                        padding: '3px 10px', borderRadius: 99
                      }}>
                        {labelStatut[p.statut] || p.statut}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {etape === 'identite' && (
          <div style={{ background: '#1e293b', borderRadius: 16, padding: '1.5rem', border: '1px solid #334155' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <button onClick={() => setEtape('liste')} style={{ background: '#334155', color: '#94a3b8', padding: '6px 12px', borderRadius: 6, fontSize: 13 }}>← Retour</button>
              <h2 style={{ color: '#f1f5f9', fontSize: 18, fontWeight: 600 }}>1 — Identité du patient</h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={lbl}>Sexe</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['M', 'F'].map(s => (
                    <button key={s} onClick={() => set('sexe', s)} style={{
                      flex: 1, padding: '12px', borderRadius: 8, fontSize: 18,
                      background: form.sexe === s ? '#3b82f6' : '#334155',
                      color: '#fff', fontWeight: 600
                    }}>{s === 'M' ? '👨 Homme' : '👩 Femme'}</button>
                  ))}
                </div>
              </div>

              <div>
                <label style={lbl}>Date de naissance</label>
                <input type="date" value={form.ddn} onChange={e => set('ddn', e.target.value)} style={inp} />
                {form.ddn && <div style={{ color: '#10b981', fontSize: 13, marginTop: 4 }}>Âge : {calcAge(form.ddn)} ans</div>}
              </div>

              <div>
                <label style={lbl}>Nom</label>
                <input type="text" value={form.nom} onChange={e => set('nom', e.target.value.toUpperCase())} placeholder="NOM" style={{ ...inp, textTransform: 'uppercase' }} />
              </div>

              <div>
                <label style={lbl}>Prénom</label>
                <input type="text" value={form.prenom} onChange={e => set('prenom', e.target.value)} placeholder="Prénom" style={inp} />
              </div>

              <div>
                <label style={lbl}>IPP (numéro patient DxCare)</label>
                <input type="text" value={form.ipp} onChange={e => set('ipp', e.target.value)} placeholder="IPP" style={inp} />
              </div>

              <div>
                <label style={lbl}>Allergie connue ?</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {['Oui', 'Non', 'Inconnu'].map(a => (
                    <button key={a} onClick={() => set('allergie', a)} style={{
                      flex: 1, padding: '10px', borderRadius: 8, fontSize: 13,
                      background: form.allergie === a ? (a === 'Oui' ? '#dc2626' : '#334155') : '#1e3a5f',
                      color: '#fff', border: form.allergie === a ? 'none' : '1px solid #334155'
                    }}>{a}</button>
                  ))}
                </div>
                {form.allergie === 'Oui' && (
                  <input type="text" value={form.allergie_detail} onChange={e => set('allergie_detail', e.target.value)}
                    placeholder="Préciser l'allergie..." style={{ ...inp, marginTop: 8, border: '2px solid #dc2626' }} />
                )}
              </div>
            </div>

            <button
              onClick={() => setEtape('constantes')}
              disabled={!form.nom || !form.ddn || !form.sexe}
              style={{ ...btnPrimary, marginTop: 20, opacity: (!form.nom || !form.ddn || !form.sexe) ? 0.5 : 1 }}
            >
              Suivant : Constantes →
            </button>
          </div>
        )}

        {etape === 'constantes' && (
          <div style={{ background: '#1e293b', borderRadius: 16, padding: '1.5rem', border: '1px solid #334155' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <button onClick={() => setEtape('identite')} style={{ background: '#334155', color: '#94a3b8', padding: '6px 12px', borderRadius: 6, fontSize: 13 }}>← Retour</button>
              <h2 style={{ color: '#f1f5f9', fontSize: 18, fontWeight: 600 }}>2 — Constantes vitales</h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              {[
                { key: 'sat', label: 'Saturation (SpO2)', unite: '%', placeholder: '98', min: 70, max: 100 },
                { key: 'fc', label: 'Fréquence cardiaque', unite: 'bpm', placeholder: '75' },
                { key: 'ta_sys', label: 'TA systolique', unite: 'mmHg', placeholder: '120' },
                { key: 'ta_dia', label: 'TA diastolique', unite: 'mmHg', placeholder: '80' },
                { key: 'temp', label: 'Température', unite: '°C', placeholder: '37.0' },
                { key: 'dextro', label: 'Dextro', unite: 'g/L', placeholder: '1.0' },
              ].map(({ key, label, unite, placeholder }) => {
                const horsNormes = estHorsNormes(key, form[key]);
                return (
                  <div key={key}>
                    <label style={lbl}>{label}</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="number" step="0.1" value={form[key]}
                        onChange={e => set(key, e.target.value)}
                        placeholder={placeholder}
                        style={{
                          ...inp,
                          border: horsNormes ? '2px solid #ef4444' : '1px solid #334155',
                          background: horsNormes ? '#450a0a' : '#0f172a',
                          color: horsNormes ? '#fca5a5' : '#fff',
                          paddingRight: 40
                        }}
                      />
                      <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: 13 }}>{unite}</span>
                    </div>
                    {horsNormes && <div style={{ color: '#ef4444', fontSize: 11, marginTop: 2 }}>⚠️ Valeur anormale — à recontrôler</div>}
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => setEtape('motif')}
              style={{ ...btnPrimary, marginTop: 20 }}
            >
              Suivant : Motif de consultation →
            </button>
          </div>
        )}

        {etape === 'motif' && (
          <div style={{ background: '#1e293b', borderRadius: 16, padding: '1.5rem', border: '1px solid #334155' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <button onClick={() => setEtape('constantes')} style={{ background: '#334155', color: '#94a3b8', padding: '6px 12px', borderRadius: 6, fontSize: 13 }}>← Retour</button>
              <h2 style={{ color: '#f1f5f9', fontSize: 18, fontWeight: 600 }}>3 — Motif de consultation</h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
              {[
                { id: 'douleur', label: 'Douleur', emoji: '😣' },
                { id: 'fievre', label: 'Fièvre', emoji: '🌡️' },
                { id: 'coma', label: 'Inconscient / Coma', emoji: '😶' },
                { id: 'plaie', label: 'Plaie / Suture', emoji: '🩹' },
                { id: 'asthme', label: 'Asthme / Gêne respiratoire', emoji: '😮‍💨' },
                { id: 'vertige', label: 'Vertige / Malaise', emoji: '💫' },
                { id: 'douleur_abdominale', label: 'Douleur abdominale', emoji: '🤢' },
                { id: 'traumatisme', label: 'Traumatisme / Chute', emoji: '🦴' },
                { id: 'autre', label: 'Autre', emoji: '❓' },
              ].map(m => (
                <button key={m.id} onClick={() => {
                  set('motifPrincipal', m.id);
                  if (m.id === 'coma') handleComa(true);
                  else handleComa(false);
                }} style={{
                  padding: '16px 10px', borderRadius: 10, fontSize: 14, fontWeight: 600,
                  background: form.motifPrincipal === m.id ? '#3b82f6' : '#334155',
                  color: '#fff', border: form.motifPrincipal === m.id ? '2px solid #60a5fa' : '1px solid #475569',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6
                }}>
                  <span style={{ fontSize: 28 }}>{m.emoji}</span>
                  <span>{m.label}</span>
                </button>
              ))}
            </div>

            {form.motifPrincipal === 'douleur' && (
              <div style={{ background: '#0f172a', borderRadius: 12, padding: '1rem', marginBottom: 16 }}>
                <div style={{ color: '#cbd5e1', fontSize: 14, marginBottom: 12, fontWeight: 500 }}>
                  Cliquez sur la zone douloureuse
                </div>
                <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <svg width="340" height="390" style={{ flex: '0 0 auto' }}>
                    <rect x="0" y="0" width="340" height="390" fill="#0f172a" />
                    {ZONES_CORPS.map(z => {
                      const sel = form.douleur_zones.includes(z.id);
                      return (
                        <g key={z.id} onClick={() => toggleZone(z.id)} style={{ cursor: 'pointer' }}>
                          <rect x={z.x} y={z.y} width={z.w} height={z.h} rx="6"
                            fill={sel ? '#ef4444' : '#1e3a5f'}
                            stroke={sel ? '#fca5a5' : '#334155'}
                            strokeWidth={sel ? 2 : 1}
                          />
                          <text x={z.x + z.w / 2} y={z.y + z.h / 2 + 1} textAnchor="middle" dominantBaseline="middle"
                            fill={sel ? '#fff' : '#94a3b8'} fontSize="9" fontWeight={sel ? '700' : '400'}>
                            {z.label.length > 12 ? z.label.slice(0, 12) + '…' : z.label}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    {form.douleur_zones.length > 0 && (
                      <>
                        <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 8 }}>Zones sélectionnées :</div>
                        {form.douleur_zones.map(z => {
                          const zone = ZONES_CORPS.find(zz => zz.id === z);
                          return (
                            <div key={z} style={{ background: '#334155', borderRadius: 6, padding: '6px 10px', marginBottom: 4, color: '#fca5a5', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              {zone?.label}
                              <button onClick={() => toggleZone(z)} style={{ background: 'none', color: '#ef4444', fontSize: 16 }}>×</button>
                            </div>
                          );
                        })}
                        {form.douleur_zones.includes('thorax') && (
                          <div style={{ background: '#451a03', border: '1px solid #f59e0b', borderRadius: 8, padding: '10px', marginTop: 8 }}>
                            <div style={{ color: '#fcd34d', fontSize: 13, fontWeight: 600 }}>⚡ Douleur thoracique</div>
                            <div style={{ color: '#fbbf24', fontSize: 12, marginTop: 4 }}>Le médecin demandera probablement un ECG — vous pouvez le préparer dès maintenant</div>
                            <button onClick={() => set('ecg', !form.ecg)} style={{
                              marginTop: 8, padding: '6px 12px', borderRadius: 6, fontSize: 12,
                              background: form.ecg ? '#16a34a' : '#334155', color: '#fff'
                            }}>
                              {form.ecg ? '✓ ECG réalisé' : '→ Réaliser l\'ECG maintenant'}
                            </button>
                          </div>
                        )}
                      </>
                    )}
                    <div style={{ marginTop: 16 }}>
                      <label style={{ ...lbl, color: '#94a3b8' }}>Intensité de la douleur (EVA 0-10)</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <input type="range" min="0" max="10" value={form.douleur_eva}
                          onChange={e => set('douleur_eva', parseInt(e.target.value))}
                          style={{ flex: 1, accentColor: form.douleur_eva >= 7 ? '#ef4444' : form.douleur_eva >= 4 ? '#f59e0b' : '#10b981' }} />
                        <span style={{
                          fontSize: 24, fontWeight: 700, minWidth: 32, textAlign: 'center',
                          color: form.douleur_eva >= 7 ? '#ef4444' : form.douleur_eva >= 4 ? '#f59e0b' : '#10b981'
                        }}>{form.douleur_eva}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: 11, marginTop: 2 }}>
                        <span>Pas de douleur</span><span>Douleur maximale</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {form.motifPrincipal === 'fievre' && (
              <div style={{ background: '#0f172a', borderRadius: 12, padding: '1rem', marginBottom: 16 }}>
                <label style={lbl}>Fièvre depuis combien de temps ?</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {['Quelques heures', '1 jour', '2-3 jours', 'Plus de 3 jours', 'Inconnu'].map(d => (
                    <button key={d} onClick={() => set('fievre_depuis', d)} style={{
                      padding: '8px 14px', borderRadius: 8, fontSize: 13,
                      background: form.fievre_depuis === d ? '#3b82f6' : '#334155', color: '#fff'
                    }}>{d}</button>
                  ))}
                </div>
              </div>
            )}

            {form.motifPrincipal === 'plaie' && (
              <div style={{ background: '#0f172a', borderRadius: 12, padding: '1rem', marginBottom: 16 }}>
                <div style={{ color: '#fcd34d', fontSize: 14, fontWeight: 600, marginBottom: 10 }}>
                  📋 Regardez la PREMIÈRE PAGE du carnet de santé
                </div>
                <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 12 }}>
                  Y a-t-il des vaccins notés ? Le carnet est-il lisible ?
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {[
                    { id: 'vaccin_ok', label: '✓ Vaccins à jour (moins de 5 ans)', color: '#16a34a' },
                    { id: 'vaccin_depasse', label: '⚠️ Vaccins présents mais anciens (plus de 5 ans)', color: '#d97706' },
                    { id: 'vaccin_absent', label: '✗ Pas de vaccin noté / carnet illisible', color: '#dc2626' },
                  ].map(v => (
                    <button key={v.id} onClick={() => set('plaie_vaccin', v.id)} style={{
                      padding: '10px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                      background: form.plaie_vaccin === v.id ? v.color : '#334155',
                      color: '#fff', border: form.plaie_vaccin === v.id ? 'none' : '1px solid #475569',
                      flex: '1 1 200px'
                    }}>{v.label}</button>
                  ))}
                </div>
                {(form.plaie_vaccin === 'vaccin_absent' || form.plaie_vaccin === 'vaccin_depasse') && (
                  <div style={{ background: '#451a03', border: '1px solid #f59e0b', borderRadius: 8, padding: '12px', marginTop: 12 }}>
                    <div style={{ color: '#fcd34d', fontSize: 14, fontWeight: 600 }}>
                      → Réaliser le Quick Test Tétanos maintenant
                    </div>
                    <div style={{ color: '#fbbf24', fontSize: 12, marginTop: 4, marginBottom: 10 }}>
                      Le médecin en aura besoin — autant l'avancer maintenant pour ne pas perdre de temps
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button onClick={() => set('quicktest_tetanos', 'fait')} style={{
                        padding: '8px 16px', borderRadius: 6, fontSize: 13,
                        background: form.quicktest_tetanos === 'fait' ? '#16a34a' : '#334155', color: '#fff'
                      }}>✓ Test réalisé</button>
                      <button onClick={() => set('quicktest_tetanos', 'negatif')} style={{
                        padding: '8px 16px', borderRadius: 6, fontSize: 13,
                        background: form.quicktest_tetanos === 'negatif' ? '#dc2626' : '#334155', color: '#fff'
                      }}>Résultat négatif</button>
                      <button onClick={() => set('quicktest_tetanos', 'positif')} style={{
                        padding: '8px 16px', borderRadius: 6, fontSize: 13,
                        background: form.quicktest_tetanos === 'positif' ? '#16a34a' : '#334155', color: '#fff'
                      }}>Résultat positif</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {form.motifPrincipal === 'vertige' && (
              <div style={{ background: '#172554', border: '1px solid #3b82f6', borderRadius: 12, padding: '1rem', marginBottom: 16 }}>
                <div style={{ color: '#93c5fd', fontSize: 14, fontWeight: 600 }}>
                  → À réaliser dès maintenant pour ce patient :
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                  <button onClick={() => set('dextro', prompt('Dextro (g/L) :') || form.dextro)} style={{
                    padding: '8px 14px', borderRadius: 6, fontSize: 13,
                    background: form.dextro ? '#16a34a' : '#334155', color: '#fff'
                  }}>
                    {form.dextro ? `✓ Dextro : ${form.dextro} g/L` : '→ Saisir le Dextro'}
                  </button>
                  <button onClick={() => set('hemocue', prompt('Hémocue (g/dL) :') || form.hemocue)} style={{
                    padding: '8px 14px', borderRadius: 6, fontSize: 13,
                    background: form.hemocue ? '#16a34a' : '#334155', color: '#fff'
                  }}>
                    {form.hemocue ? `✓ Hémocue : ${form.hemocue} g/dL` : '→ Réaliser l\'Hémocue'}
                  </button>
                </div>
              </div>
            )}

            {form.motifPrincipal === 'douleur_abdominale' && form.sexe === 'F' && (
              <div style={{ background: '#2d1657', border: '1px solid #8b5cf6', borderRadius: 12, padding: '1rem', marginBottom: 16 }}>
                <div style={{ color: '#c4b5fd', fontSize: 14, fontWeight: 600 }}>
                  → Douleur abdominale chez une femme — à préparer :
                </div>
                <div style={{ color: '#a78bfa', fontSize: 13, marginTop: 6, marginBottom: 10 }}>
                  Donner un pot à urine au patient pour réaliser BU et bHCG urinaire
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => set('bu_urine', !form.bu_urine)} style={{
                    padding: '8px 14px', borderRadius: 6, fontSize: 13,
                    background: form.bu_urine ? '#16a34a' : '#334155', color: '#fff'
                  }}>
                    {form.bu_urine ? '✓ Pot donné — BU en attente' : '→ Donner le pot à urine'}
                  </button>
                  {form.bu_urine && (
                    <button onClick={() => set('bhcg', !form.bhcg)} style={{
                      padding: '8px 14px', borderRadius: 6, fontSize: 13,
                      background: form.bhcg ? '#16a34a' : '#334155', color: '#fff'
                    }}>
                      {form.bhcg ? '✓ bHCG réalisé' : '→ bHCG urinaire'}
                    </button>
                  )}
                </div>
              </div>
            )}

            {form.motifPrincipal === 'asthme' && (
              <div style={{ background: '#0f172a', borderRadius: 12, padding: '1rem', marginBottom: 16 }}>
                {parseFloat(form.sat) < 95 ? (
                  <div style={{ background: '#450a0a', border: '1px solid #ef4444', borderRadius: 8, padding: '12px' }}>
                    <div style={{ color: '#fca5a5', fontSize: 14, fontWeight: 600 }}>⚠️ Saturation basse — Fauteuil avec O2</div>
                    <div style={{ color: '#f87171', fontSize: 13, marginTop: 4 }}>
                      Installer au fauteuil 1 ou 2 — Préparer salbutamol + atrovent sous O2 5L/min
                    </div>
                    <div style={{ color: '#fca5a5', fontSize: 12, marginTop: 6 }}>
                      Objectif : saturation &gt; 95% — Recontrôler dans 5 minutes
                    </div>
                    {form.age && (
                      <div style={{ background: '#7f1d1d', borderRadius: 6, padding: '8px', marginTop: 8 }}>
                        <div style={{ color: '#fcd34d', fontSize: 12, fontWeight: 600 }}>Posologie salbutamol :</div>
                        <div style={{ color: '#fbbf24', fontSize: 13, marginTop: 2 }}>
                          {parseInt(form.age) < 16 ? 'Ventoline 2,5 mL nébulisation' : 'Ventoline 5 mL nébulisation'}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ background: '#052e16', border: '1px solid #16a34a', borderRadius: 8, padding: '12px' }}>
                    <div style={{ color: '#86efac', fontSize: 14, fontWeight: 600 }}>✓ Saturation correcte</div>
                    <div style={{ color: '#4ade80', fontSize: 13, marginTop: 4 }}>
                      Salle d'observation — Éducation thérapeutique disponible sur la télé
                    </div>
                  </div>
                )}
              </div>
            )}

            <button onClick={() => setEtape('placement')} disabled={!form.motifPrincipal}
              style={{ ...btnPrimary, opacity: !form.motifPrincipal ? 0.5 : 1 }}>
              Suivant : Placement →
            </button>
          </div>
        )}

        {etape === 'placement' && (
          <div style={{ background: '#1e293b', borderRadius: 16, padding: '1.5rem', border: '1px solid #334155' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <button onClick={() => setEtape('motif')} style={{ background: '#334155', color: '#94a3b8', padding: '6px 12px', borderRadius: 6, fontSize: 13 }}>← Retour</button>
              <h2 style={{ color: '#f1f5f9', fontSize: 18, fontWeight: 600 }}>4 — Placement</h2>
            </div>

            {suggestions.length > 0 && (
              <div style={{ background: '#172554', border: '1px solid #3b82f6', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
                <div style={{ color: '#93c5fd', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                  💡 Placement suggéré :
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {suggestions.map(s => {
                    const emp = EMPLACEMENTS.find(e => e.id === s);
                    const dispo = !empsOccupes.includes(s);
                    return (
                      <button key={s} onClick={() => set('emplacement', s)} style={{
                        padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                        background: form.emplacement === s ? '#3b82f6' : dispo ? '#1e3a5f' : '#451a03',
                        color: dispo ? '#93c5fd' : '#f97316',
                        border: form.emplacement === s ? '2px solid #60a5fa' : '1px solid #334155'
                      }}>
                        {emp?.label} {!dispo ? '(occupé)' : ''}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {EMPLACEMENTS.map(e => {
                const occupe = empsOccupes.includes(e.id);
                const sel = form.emplacement === e.id;
                const suggere = suggestions.includes(e.id);
                return (
                  <button key={e.id} onClick={() => set('emplacement', e.id)} style={{
                    padding: '14px 16px', borderRadius: 10, textAlign: 'left',
                    background: sel ? '#3b82f6' : occupe ? '#1c1917' : '#334155',
                    border: sel ? '2px solid #60a5fa' : suggere ? '2px solid #f59e0b' : '1px solid #475569',
                    color: occupe ? '#57534e' : '#fff',
                    cursor: 'pointer'
                  }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{e.label}</div>
                    <div style={{ fontSize: 12, color: sel ? '#bfdbfe' : occupe ? '#44403c' : '#94a3b8', marginTop: 2 }}>
                      {e.salle} {e.urgence ? '— Scope + O2' : ''}{e.o2 ? '— O2 disponible' : ''}
                      {occupe ? ' — OCCUPÉ' : ''}
                    </div>
                  </button>
                );
              })}
            </div>

            <div style={{ marginTop: 16 }}>
              <label style={lbl}>Notes pour l'équipe (optionnel)</label>
              <textarea value={form.notes_as} onChange={e => set('notes_as', e.target.value)}
                placeholder="Observations particulières..."
                style={{ ...inp, minHeight: 70, resize: 'vertical' }} />
            </div>

            <button
              onClick={creerPatient}
              disabled={!form.emplacement}
              style={{ ...btnPrimary, opacity: !form.emplacement ? 0.5 : 1, marginTop: 16, background: '#16a34a' }}
            >
              ✓ Enregistrer et placer le patient
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const lbl = { display: 'block', color: '#94a3b8', fontSize: 13, marginBottom: 6, fontWeight: 500 };
const inp = {
  width: '100%', padding: '12px 14px', borderRadius: 8,
  border: '1px solid #334155', background: '#0f172a',
  color: '#fff', fontSize: 15, outline: 'none'
};
const btnPrimary = {
  width: '100%', padding: '14px', borderRadius: 10,
  background: '#3b82f6', color: '#fff', fontSize: 15, fontWeight: 600,
  cursor: 'pointer'
};
