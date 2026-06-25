'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const EMPLACEMENTS = [
  { id: 'brancard1', label: 'Brancard 1', salle: 'Déchocage', couleur: '#ef4444', urgence: true },
  { id: 'brancard2', label: 'Brancard 2', salle: 'Déchocage', couleur: '#ef4444', urgence: true },
  { id: 'lit1', label: 'Lit 1', salle: 'Salle 2', couleur: '#3b82f6' },
  { id: 'fauteuil1', label: 'Fauteuil 1', salle: 'Salle 2', couleur: '#8b5cf6', o2: true },
  { id: 'lit2', label: 'Lit 2', salle: 'Salle 2', couleur: '#3b82f6' },
  { id: 'fauteuil2', label: 'Fauteuil 2', salle: 'Salle 2', couleur: '#8b5cf6', o2: true },
  { id: 'obs', label: 'Salle obs', salle: 'Observation', couleur: '#10b981' },
  { id: 'pansement', label: 'Salle pansement', salle: 'Pansement', couleur: '#f59e0b' },
];

const ACTES_IDE = [
  'Perfusion VVP', 'ECG', 'Aérosol Ventoline', 'Aérosol Atrovent',
  'Hémocue', 'Dextro', 'BU', 'bHCG urinaire', 'Quick test tétanos',
  'Prélèvement sanguin', 'Injection IM', 'Injection IV', 'Pansement',
  'Oxygénothérapie', 'Scope posé', 'Radio prescrite', 'MEOPA',
];

function dureePresence(ts) {
  const diff = Date.now() - parseInt(ts);
  const min = Math.floor(diff / 60000);
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)}h${(min % 60).toString().padStart(2, '0')}`;
}

function constante(val, key) {
  if (!val) return <span style={{ color: '#475569' }}>—</span>;
  const normes = { sat: [94, 100], fc: [50, 100], ta_sys: [90, 150], ta_dia: [60, 95], temp: [36, 38.4], dextro: [0.7, 2.0] };
  const [min, max] = normes[key] || [0, 9999];
  const v = parseFloat(val);
  const anormal = v < min || v > max;
  return <span style={{ color: anormal ? '#ef4444' : '#10b981', fontWeight: anormal ? 700 : 400 }}>{val}{anormal ? ' ⚠️' : ''}</span>;
}

export default function PageMedecin() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [patients, setPatients] = useState([]);
  const [selected, setSelected] = useState(null);
  const [prescription, setPrescription] = useState('');
  const [diagnostic, setDiagnostic] = useState('');
  const [orientation, setOrientation] = useState('');

  const charger = useCallback(async () => {
    const res = await fetch('/api/patients');
    const data = await res.json();
    setPatients(data.patients || []);
    if (selected) {
      const updated = (data.patients || []).find(p => p.id === selected.id);
      if (updated) setSelected(updated);
    }
  }, [selected]);

  useEffect(() => {
    const session = sessionStorage.getItem('pds_user');
    if (!session) { router.push('/login'); return; }
    const u = JSON.parse(session);
    if (u.role !== 'medecin') { router.push('/'); return; }
    setUser(u);
    charger();
    const interval = setInterval(charger, 10000);
    return () => clearInterval(interval);
  }, []);

  async function majStatut(id, statut) {
    await fetch('/api/patients', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update', id, patch: { statut } })
    });
    charger();
  }

  async function ajouterPrescription(id) {
    if (!prescription.trim()) return;
    await fetch('/api/patients', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'addPrescription', id, prescription: { texte: prescription, auteur: user.matricule } })
    });
    setPrescription('');
    charger();
  }

  async function finaliserPrise(id) {
    await fetch('/api/patients', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update', id, patch: { diagnostic, orientation, statut: orientation === 'transfert' ? 'transfert' : 'vu' } })
    });
    if (orientation === 'sortie') {
      await fetch('/api/patients', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'discharge', id })
      });
    }
    setSelected(null);
    setDiagnostic('');
    setOrientation('');
    charger();
  }

  if (!user) return null;

  const couleurStatut = { attente_medecin: '#f59e0b', en_cours: '#3b82f6', vu: '#10b981', transfert: '#8b5cf6' };

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', flexDirection: 'column' }}>
      <nav style={{
        background: '#064e3b', borderBottom: '1px solid #065f46',
        padding: '0 1rem', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', height: 56, flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 22 }}>🩺</span>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>PDS Kahani</span>
          <span style={{ background: '#10b981', color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4 }}>MÉDECIN</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: '#6ee7b7', fontSize: 13 }}>Dr {user.nom} — {user.matricule}</span>
          <button onClick={() => { sessionStorage.clear(); router.push('/login'); }}
            style={{ background: '#065f46', color: '#6ee7b7', padding: '6px 12px', borderRadius: 6, fontSize: 13, border: '1px solid #059669' }}>
            Déconnexion
          </button>
        </div>
      </nav>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={{ width: selected ? '380px' : '100%', flexShrink: 0, padding: '1rem', overflowY: 'auto', transition: 'width 0.2s' }}>
          <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr' : '1fr 1fr', gap: 10 }}>
            {EMPLACEMENTS.map(emp => {
              const patient = patients.find(p => p.emplacement === emp.id);
              const enAttente = patient?.statut === 'attente_medecin';
              return (
                <div key={emp.id}
                  onClick={() => { if (patient) { setSelected(patient); majStatut(patient.id, 'en_cours'); } }}
                  style={{
                    background: patient ? '#1e293b' : '#0f172a',
                    border: `1px solid ${patient ? (enAttente ? '#f59e0b' : emp.couleur + '66') : '#1e293b'}`,
                    borderLeft: `4px solid ${patient ? emp.couleur : '#1e293b'}`,
                    borderRadius: 12, padding: '14px',
                    cursor: patient ? 'pointer' : 'default',
                    animation: enAttente ? 'glow 2s infinite' : 'none',
                    transition: 'all 0.2s',
                  }}>
                  <style>{`@keyframes glow { 0%,100%{border-color:#f59e0b} 50%{border-color:#fcd34d} }`}</style>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ color: '#64748b', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
                        {emp.salle}
                      </div>
                      <div style={{ color: emp.couleur, fontSize: 14, fontWeight: 700, marginTop: 2 }}>{emp.label}</div>
                    </div>
                    {patient && (
                      <span style={{
                        background: couleurStatut[patient.statut] || '#334155',
                        color: '#fff', fontSize: 10, fontWeight: 700,
                        padding: '2px 8px', borderRadius: 99
                      }}>
                        {patient.statut === 'attente_medecin' ? '⚡ EN ATTENTE' : patient.statut === 'en_cours' ? '▶ EN COURS' : 'VU'}
                      </span>
                    )}
                  </div>

                  {patient ? (
                    <div style={{ marginTop: 10 }}>
                      <div style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 15 }}>
                        {patient.nom} {patient.prenom}
                        <span style={{ color: '#94a3b8', fontWeight: 400, fontSize: 13, marginLeft: 6 }}>{patient.age} ans</span>
                      </div>
                      <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 2 }}>
                        {patient.motifPrincipal || 'Motif non précisé'}
                        {patient.douleur_zones && JSON.parse(patient.douleur_zones || '[]').length > 0 &&
                          ` — EVA ${patient.douleur_eva}/10`}
                      </div>
                      <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                        {patient.sat && <span style={{ fontSize: 12 }}>SpO2 {constante(patient.sat, 'sat')}%</span>}
                        {patient.fc && <span style={{ fontSize: 12 }}>FC {constante(patient.fc, 'fc')}</span>}
                        {patient.temp && <span style={{ fontSize: 12 }}>T° {constante(patient.temp, 'temp')}°C</span>}
                      </div>
                      <div style={{ color: '#64748b', fontSize: 11, marginTop: 6 }}>
                        {dureePresence(patient.arrivee)}
                        {patient.allergie === 'Oui' && (
                          <span style={{ color: '#ef4444', fontWeight: 700, marginLeft: 8 }}>
                            ⚠️ ALLERGIE : {patient.allergie_detail}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div style={{ color: '#1e293b', fontSize: 13, marginTop: 8 }}>—</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {selected && (
          <div style={{
            flex: 1, background: '#1e293b', borderLeft: '1px solid #334155',
            padding: '1.5rem', overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <h2 style={{ color: '#f1f5f9', fontSize: 20, fontWeight: 700 }}>
                  {selected.nom} {selected.prenom}
                </h2>
                <div style={{ color: '#94a3b8', fontSize: 14, marginTop: 2 }}>
                  {selected.age} ans — {selected.sexe === 'F' ? 'Femme' : 'Homme'} — IPP : {selected.ipp || 'non renseigné'}
                </div>
                {selected.allergie === 'Oui' && (
                  <div style={{ background: '#450a0a', border: '1px solid #b91c1c', borderRadius: 6, padding: '6px 10px', marginTop: 8, color: '#fca5a5', fontSize: 13, fontWeight: 600 }}>
                    ⚠️ ALLERGIE : {selected.allergie_detail}
                  </div>
                )}
              </div>
              <button onClick={() => setSelected(null)} style={{ background: '#334155', color: '#94a3b8', padding: '6px 12px', borderRadius: 6, fontSize: 13 }}>✕ Fermer</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
              {[
                { k: 'sat', label: 'SpO2', u: '%' }, { k: 'fc', label: 'FC', u: 'bpm' },
                { k: 'ta_sys', label: 'PAS', u: 'mmHg' }, { k: 'ta_dia', label: 'PAD', u: 'mmHg' },
                { k: 'temp', label: 'T°', u: '°C' }, { k: 'dextro', label: 'Dextro', u: 'g/L' },
              ].map(({ k, label, u }) => (
                <div key={k} style={{ background: '#0f172a', borderRadius: 8, padding: '10px', textAlign: 'center' }}>
                  <div style={{ color: '#64748b', fontSize: 11 }}>{label}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>{constante(selected[k], k)}</div>
                  <div style={{ color: '#475569', fontSize: 11 }}>{u}</div>
                </div>
              ))}
            </div>

            <div style={{ background: '#0f172a', borderRadius: 10, padding: '12px', marginBottom: 16 }}>
              <div style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>MOTIF</div>
              <div style={{ color: '#f1f5f9', fontSize: 14 }}>{selected.motifPrincipal || '—'}</div>
              {selected.douleur_zones && JSON.parse(selected.douleur_zones || '[]').length > 0 && (
                <div style={{ color: '#94a3b8', fontSize: 13, marginTop: 4 }}>
                  Zones : {JSON.parse(selected.douleur_zones).join(', ')} — EVA {selected.douleur_eva}/10
                </div>
              )}
              {selected.fievre_depuis && <div style={{ color: '#f59e0b', fontSize: 13, marginTop: 4 }}>Fièvre depuis : {selected.fievre_depuis}</div>}
              {selected.plaie_vaccin && <div style={{ color: '#94a3b8', fontSize: 13, marginTop: 4 }}>Vaccin tétanos : {selected.plaie_vaccin} — Quick test : {selected.quicktest_tetanos || 'non fait'}</div>}
              {selected.bu_urine && <div style={{ color: '#8b5cf6', fontSize: 13, marginTop: 4 }}>BU en cours — bHCG : {selected.bhcg ? 'réalisé' : 'en attente'}</div>}
              {selected.notes_as && <div style={{ color: '#94a3b8', fontSize: 13, marginTop: 6, fontStyle: 'italic' }}>Note AS : {selected.notes_as}</div>}
            </div>

            <div style={{ background: '#0f172a', borderRadius: 10, padding: '12px', marginBottom: 16 }}>
              <div style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>PRESCRIPTIONS</div>
              {selected.prescriptions && JSON.parse(selected.prescriptions || '[]').map((p, i) => (
                <div key={i} style={{ background: '#1e293b', borderRadius: 6, padding: '8px 10px', marginBottom: 6 }}>
                  <div style={{ color: '#f1f5f9', fontSize: 13 }}>{p.texte}</div>
                  <div style={{ color: '#475569', fontSize: 11, marginTop: 2 }}>
                    {new Date(p.heure).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <input value={prescription} onChange={e => setPrescription(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && ajouterPrescription(selected.id)}
                  placeholder="Nouvelle prescription (Entrée pour valider)..."
                  style={{ flex: 1, padding: '10px 12px', borderRadius: 8, border: '1px solid #334155', background: '#1e293b', color: '#fff', fontSize: 14 }} />
                <button onClick={() => ajouterPrescription(selected.id)}
                  style={{ padding: '10px 16px', borderRadius: 8, background: '#3b82f6', color: '#fff', fontSize: 13, fontWeight: 600 }}>
                  + Ajouter
                </button>
              </div>
            </div>

            <div style={{ background: '#0f172a', borderRadius: 10, padding: '12px', marginBottom: 16 }}>
              <div style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>ACTES IDE RÉALISÉS</div>
              {selected.actes && JSON.parse(selected.actes || '[]').map((a, i) => (
                <span key={i} style={{ display: 'inline-block', background: '#1e3a5f', color: '#93c5fd', fontSize: 12, padding: '3px 8px', borderRadius: 99, margin: '0 4px 4px 0' }}>
                  {a.label} {new Date(a.heure).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              ))}
            </div>

            <div style={{ background: '#0f172a', borderRadius: 10, padding: '12px', marginBottom: 16 }}>
              <div style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>DIAGNOSTIC & ORIENTATION</div>
              <textarea value={diagnostic} onChange={e => setDiagnostic(e.target.value)}
                placeholder="Diagnostic..."
                style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #334155', background: '#1e293b', color: '#fff', fontSize: 14, minHeight: 60, resize: 'vertical', marginBottom: 10 }} />
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {['sortie', 'rdv_consultation', 'transfert_CHM', 'transfert_SMUR', 'hospitalisation'].map(o => (
                  <button key={o} onClick={() => setOrientation(o)} style={{
                    padding: '8px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                    background: orientation === o ? '#3b82f6' : '#334155',
                    color: '#fff', border: orientation === o ? '2px solid #60a5fa' : '1px solid #475569'
                  }}>
                    {o === 'sortie' ? '→ Sortie' : o === 'rdv_consultation' ? '📅 RDV Cslt' : o === 'transfert_CHM' ? '🚑 CHM' : o === 'transfert_SMUR' ? '🚨 SMUR' : '🏥 Hospi'}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={() => finaliserPrise(selected.id)}
              disabled={!diagnostic || !orientation}
              style={{
                width: '100%', padding: '14px', borderRadius: 10,
                background: (!diagnostic || !orientation) ? '#334155' : '#16a34a',
                color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer'
              }}>
              ✓ Finaliser la prise en charge
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
