'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const ACTES = [
  { id: 'perf', label: 'Perfusion VVP', emoji: '💉' },
  { id: 'ecg', label: 'ECG', emoji: '❤️' },
  { id: 'aerosol_ventoline', label: 'Aérosol Ventoline', emoji: '💨' },
  { id: 'aerosol_atrovent', label: 'Aérosol Atrovent', emoji: '💨' },
  { id: 'hemocue', label: 'Hémocue', emoji: '🩸' },
  { id: 'dextro', label: 'Dextro', emoji: '🩸' },
  { id: 'bu', label: 'BU', emoji: '🧪' },
  { id: 'bhcg', label: 'bHCG urinaire', emoji: '🧪' },
  { id: 'quicktest', label: 'Quick test tétanos', emoji: '🧪' },
  { id: 'prelevement', label: 'Prélèvement sanguin', emoji: '🩸' },
  { id: 'injection_im', label: 'Injection IM', emoji: '💉' },
  { id: 'injection_iv', label: 'Injection IV', emoji: '💉' },
  { id: 'pansement', label: 'Pansement', emoji: '🩹' },
  { id: 'o2', label: 'Oxygénothérapie', emoji: '💨' },
  { id: 'scope', label: 'Scope posé', emoji: '📊' },
  { id: 'meopa', label: 'MEOPA', emoji: '😮‍💨' },
  { id: 'radio', label: 'Radio prescrite', emoji: '🩻' },
  { id: 'suture', label: 'Suture réalisée', emoji: '🪡' },
];

const EMPLACEMENTS = [
  { id: 'brancard1', label: 'Brancard 1' },
  { id: 'brancard2', label: 'Brancard 2' },
  { id: 'lit1', label: 'Lit 1' },
  { id: 'fauteuil1', label: 'Fauteuil 1' },
  { id: 'lit2', label: 'Lit 2' },
  { id: 'fauteuil2', label: 'Fauteuil 2' },
  { id: 'obs', label: 'Salle obs' },
  { id: 'pansement', label: 'Salle pansement' },
];

function dureePresence(ts) {
  const diff = Date.now() - parseInt(ts);
  const min = Math.floor(diff / 60000);
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)}h${(min % 60).toString().padStart(2, '0')}`;
}

export default function PageIDE() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [patients, setPatients] = useState([]);
  const [selected, setSelected] = useState(null);
  const [pharma, setPharma] = useState({ stocks: [], mouvements: [] });
  const [vue, setVue] = useState('patients');
  const [medicament, setMedicament] = useState('');
  const [quantiteSortie, setQuantiteSortie] = useState(1);
  const [motifSortie, setMotifSortie] = useState('');

  const charger = useCallback(async () => {
    const res = await fetch('/api/patients');
    const data = await res.json();
    setPatients(data.patients || []);
    if (selected) {
      const updated = (data.patients || []).find(p => p.id === selected.id);
      if (updated) setSelected(updated);
    }
  }, [selected]);

  async function chargerPharma() {
    const res = await fetch('/api/pharma');
    const data = await res.json();
    setPharma(data);
  }

  useEffect(() => {
    const session = sessionStorage.getItem('pds_user');
    if (!session) { router.push('/login'); return; }
    const u = JSON.parse(session);
    if (u.role !== 'ide') { router.push('/'); return; }
    setUser(u);
    charger();
    chargerPharma();
    const interval = setInterval(() => { charger(); chargerPharma(); }, 15000);
    return () => clearInterval(interval);
  }, []);

  async function ajouterActe(patientId, acte) {
    await fetch('/api/patients', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'addActe', id: patientId, acte: { id: acte.id, label: acte.label } })
    });
    charger();
  }

  async function sortiePharma() {
    if (!medicament || !selected) return;
    await fetch('/api/pharma', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'sortie', medId: medicament, quantite: quantiteSortie,
        patientId: selected.id, patientNom: `${selected.nom} ${selected.prenom}`,
        matricule: user.matricule, motif: motifSortie
      })
    });
    chargerPharma();
    setMedicament('');
    setQuantiteSortie(1);
    setMotifSortie('');
  }

  if (!user) return null;

  const actesDuPatient = selected?.actes ? JSON.parse(selected.actes) : [];

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', flexDirection: 'column' }}>
      <nav style={{
        background: '#1e3a5f', borderBottom: '1px solid #1e40af',
        padding: '0 1rem', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', height: 56, flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 22 }}>👩‍⚕️</span>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>PDS Kahani</span>
          <span style={{ background: '#3b82f6', color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4 }}>INFIRMIER</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => setVue('patients')} style={{
            padding: '6px 14px', borderRadius: 6, fontSize: 13,
            background: vue === 'patients' ? '#3b82f6' : '#1e3a5f',
            color: '#fff', border: '1px solid #334155'
          }}>Patients</button>
          <button onClick={() => setVue('pharma')} style={{
            padding: '6px 14px', borderRadius: 6, fontSize: 13,
            background: vue === 'pharma' ? '#3b82f6' : '#1e3a5f',
            color: '#fff', border: '1px solid #334155'
          }}>Pharma sécurisée</button>
          <button onClick={() => { sessionStorage.clear(); router.push('/login'); }}
            style={{ background: '#1e3a5f', color: '#93c5fd', padding: '6px 12px', borderRadius: 6, fontSize: 13, border: '1px solid #334155', marginLeft: 8 }}>
            Déconnexion
          </button>
        </div>
      </nav>

      {vue === 'patients' && (
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <div style={{ width: selected ? '320px' : '100%', flexShrink: 0, padding: '1rem', overflowY: 'auto' }}>
            <h2 style={{ color: '#f1f5f9', fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
              Patients ({patients.length})
            </h2>
            {patients.map(p => (
              <div key={p.id} onClick={() => setSelected(selected?.id === p.id ? null : p)}
                style={{
                  background: selected?.id === p.id ? '#1e3a5f' : '#1e293b',
                  border: `1px solid ${selected?.id === p.id ? '#3b82f6' : '#334155'}`,
                  borderRadius: 10, padding: '12px', marginBottom: 8, cursor: 'pointer'
                }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 14 }}>
                      {p.nom} {p.prenom} <span style={{ color: '#64748b', fontWeight: 400, fontSize: 12 }}>{p.age} ans</span>
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 2 }}>
                      {EMPLACEMENTS.find(e => e.id === p.emplacement)?.label} — {p.motifPrincipal}
                    </div>
                  </div>
                  <span style={{ color: '#64748b', fontSize: 11 }}>{dureePresence(p.arrivee)}</span>
                </div>
                {p.allergie === 'Oui' && (
                  <div style={{ color: '#ef4444', fontSize: 11, fontWeight: 700, marginTop: 4 }}>⚠️ ALLERGIE</div>
                )}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                  {(p.actes ? JSON.parse(p.actes) : []).map((a, i) => (
                    <span key={i} style={{ background: '#1e3a5f', color: '#93c5fd', fontSize: 10, padding: '2px 6px', borderRadius: 99 }}>
                      {a.label}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {selected && (
            <div style={{ flex: 1, background: '#1e293b', borderLeft: '1px solid #334155', padding: '1.5rem', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ color: '#f1f5f9', fontSize: 18, fontWeight: 700 }}>
                  {selected.nom} {selected.prenom}
                  <span style={{ color: '#94a3b8', fontWeight: 400, fontSize: 14, marginLeft: 8 }}>{selected.age} ans</span>
                </h2>
                <button onClick={() => setSelected(null)} style={{ background: '#334155', color: '#94a3b8', padding: '6px 12px', borderRadius: 6, fontSize: 13 }}>✕</button>
              </div>

              {selected.prescriptions && JSON.parse(selected.prescriptions || '[]').length > 0 && (
                <div style={{ background: '#172554', border: '1px solid #3b82f6', borderRadius: 10, padding: '12px', marginBottom: 16 }}>
                  <div style={{ color: '#93c5fd', fontSize: 12, fontWeight: 600, marginBottom: 6 }}>📋 PRESCRIPTIONS MÉDECIN</div>
                  {JSON.parse(selected.prescriptions).map((p, i) => (
                    <div key={i} style={{ color: '#bfdbfe', fontSize: 13, padding: '6px 0', borderBottom: '1px solid #1e3a5f' }}>
                      {p.texte}
                      <span style={{ color: '#475569', fontSize: 11, marginLeft: 8 }}>
                        {new Date(p.heure).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ background: '#0f172a', borderRadius: 10, padding: '12px', marginBottom: 16 }}>
                <div style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600, marginBottom: 10 }}>ACTES RÉALISÉS — cochez ce qui a été fait</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {ACTES.map(a => {
                    const fait = actesDuPatient.some(ac => ac.id === a.id);
                    return (
                      <button key={a.id} onClick={() => !fait && ajouterActe(selected.id, a)}
                        style={{
                          padding: '10px 12px', borderRadius: 8, textAlign: 'left',
                          background: fait ? '#052e16' : '#1e293b',
                          border: `1px solid ${fait ? '#16a34a' : '#334155'}`,
                          color: fait ? '#4ade80' : '#94a3b8',
                          cursor: fait ? 'default' : 'pointer',
                          display: 'flex', alignItems: 'center', gap: 8, fontSize: 13
                        }}>
                        <span>{fait ? '✓' : a.emoji}</span>
                        <span>{a.label}</span>
                        {fait && actesDuPatient.find(ac => ac.id === a.id)?.heure && (
                          <span style={{ color: '#166534', fontSize: 11, marginLeft: 'auto' }}>
                            {new Date(actesDuPatient.find(ac => ac.id === a.id).heure).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ background: '#0f172a', borderRadius: 10, padding: '12px' }}>
                <div style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600, marginBottom: 10 }}>PHARMA SÉCURISÉE — sortie pour ce patient</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <select value={medicament} onChange={e => setMedicament(e.target.value)}
                    style={{ flex: 2, padding: '10px', borderRadius: 8, border: '1px solid #334155', background: '#1e293b', color: '#fff', fontSize: 13 }}>
                    <option value="">Choisir un médicament</option>
                    {pharma.stocks.map(m => (
                      <option key={m.id} value={m.id}>{m.nom} (stock : {m.stock} {m.unite})</option>
                    ))}
                  </select>
                  <input type="number" min="1" value={quantiteSortie} onChange={e => setQuantiteSortie(parseInt(e.target.value))}
                    style={{ width: 60, padding: '10px', borderRadius: 8, border: '1px solid #334155', background: '#1e293b', color: '#fff', fontSize: 13, textAlign: 'center' }} />
                  <input value={motifSortie} onChange={e => setMotifSortie(e.target.value)} placeholder="Motif..."
                    style={{ flex: 2, padding: '10px', borderRadius: 8, border: '1px solid #334155', background: '#1e293b', color: '#fff', fontSize: 13 }} />
                  <button onClick={sortiePharma} disabled={!medicament}
                    style={{ padding: '10px 16px', borderRadius: 8, background: medicament ? '#dc2626' : '#334155', color: '#fff', fontSize: 13, fontWeight: 600 }}>
                    Sortir
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {vue === 'pharma' && (
        <div style={{ padding: '1rem', maxWidth: 700, margin: '0 auto', width: '100%' }}>
          <h2 style={{ color: '#f1f5f9', fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Pharma sécurisée — stocks</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
            {pharma.stocks.map(m => (
              <div key={m.id} style={{
                background: '#1e293b', border: `1px solid ${m.stock <= 2 ? '#ef4444' : '#334155'}`,
                borderRadius: 10, padding: '14px'
              }}>
                <div style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 14 }}>{m.nom}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                  <span style={{ color: m.stock <= 2 ? '#ef4444' : '#10b981', fontSize: 22, fontWeight: 700 }}>{m.stock}</span>
                  <span style={{ color: '#64748b', fontSize: 13 }}>{m.unite}</span>
                </div>
                {m.stock <= 2 && <div style={{ color: '#ef4444', fontSize: 11, marginTop: 4 }}>⚠️ Stock faible</div>}
                <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                  <button onClick={async () => {
                    const q = parseInt(prompt('Quantité à ajouter :'));
                    if (!q || isNaN(q)) return;
                    await fetch('/api/pharma', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'entree', medId: m.id, quantite: q, matricule: user.matricule }) });
                    chargerPharma();
                  }} style={{ flex: 1, padding: '6px', borderRadius: 6, background: '#16a34a', color: '#fff', fontSize: 12, fontWeight: 600 }}>
                    + Entrée
                  </button>
                </div>
              </div>
            ))}
          </div>

          <h3 style={{ color: '#94a3b8', fontSize: 14, fontWeight: 600, marginBottom: 10 }}>Derniers mouvements</h3>
          {pharma.mouvements.map((mvt, i) => {
            const m = typeof mvt === 'string' ? JSON.parse(mvt) : mvt;
            return (
              <div key={i} style={{ background: '#1e293b', borderRadius: 8, padding: '10px 14px', marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ color: m.type === 'sortie' ? '#ef4444' : '#10b981', fontWeight: 600, fontSize: 13 }}>
                    {m.type === 'sortie' ? '▼' : '▲'} {m.nom}
                  </span>
                  <span style={{ color: '#f1f5f9', fontSize: 13, marginLeft: 8 }}>×{m.quantite}</span>
                  {m.patientNom && <span style={{ color: '#94a3b8', fontSize: 12, marginLeft: 8 }}>→ {m.patientNom}</span>}
                </div>
                <span style={{ color: '#475569', fontSize: 11 }}>
                  {new Date(m.heure).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
