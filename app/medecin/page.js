'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const NORMES = {
  sat: [94, 100], fc: [50, 100],
  ta_sys: [90, 150], ta_dia: [60, 95],
  temp: [36, 38.4], dextro: [0.7, 2.0]
};

function estHorsNormes(patient) {
  const champs = ['sat','fc','ta_sys','ta_dia','temp'];
  return champs.some(k => {
    const v = parseFloat(patient[k]);
    if (isNaN(v)) return false;
    const [min,max] = NORMES[k];
    return v < min || v > max;
  });
}

function dureePresence(ts) {
  const diff = Date.now() - parseInt(ts);
  const min = Math.floor(diff / 60000);
  if (min < 60) return `${min} min`;
  return `${Math.floor(min/60)}h${(min%60).toString().padStart(2,'0')}`;
}

function Constante({ val, k }) {
  if (!val) return <span style={{color:'#475569'}}>—</span>;
  const [min,max] = NORMES[k] || [0,9999];
  const v = parseFloat(val);
  const bad = v < min || v > max;
  return <span style={{color: bad ? '#ef4444' : '#10b981', fontWeight: bad ? 700 : 400}}>{val}{bad ? ' ⚠️' : ''}</span>;
}

const MOTIFS_URGENTS = ['coma','asthme','douleur_thorax','traumatisme'];

const LAYOUT = [
  { row: 0, cols: [
    { id: 'pansement', label: 'P1', fullLabel: 'Pansement', couleur: '#f59e0b', col: 0 },
    { id: null, label: '', col: 1 },
    { id: null, label: '', col: 2 },
    { id: 'brancard1', label: 'B1', fullLabel: 'Brancard 1', couleur: '#ef4444', urgence: true, col: 3 },
  ]},
  { row: 1, cols: [
    { id: 'obs1', label: 'O1', fullLabel: 'Observation 1', couleur: '#10b981', col: 0 },
    { id: 'lit2', label: 'L2', fullLabel: 'Lit 2', couleur: '#3b82f6', col: 1 },
    { id: 'fauteuil1', label: 'F1', fullLabel: 'Fauteuil 1', couleur: '#8b5cf6', o2: true, col: 2 },
    { id: 'brancard2', label: 'B2', fullLabel: 'Brancard 2', couleur: '#ef4444', urgence: true, col: 3 },
  ]},
  { row: 2, cols: [
    { id: 'obs2', label: 'O2', fullLabel: 'Observation 2', couleur: '#10b981', col: 0 },
    { id: 'fauteuil2', label: 'F2', fullLabel: 'Fauteuil 2', couleur: '#8b5cf6', o2: true, col: 1 },
    { id: 'lit1', label: 'L1', fullLabel: 'Lit 1', couleur: '#3b82f6', col: 2 },
    { id: 'consultation', label: 'CS', fullLabel: 'Consultation', couleur: '#64748b', col: 3 },
  ]},
];

const TOUS_EMPLACEMENTS = LAYOUT.flatMap(r => r.cols).filter(c => c.id);

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
    const ps = data.patients || [];
    setPatients(ps);
    if (selected) {
      const u = ps.find(p => p.id === selected.id);
      if (u) setSelected(u);
    }
  }, [selected?.id]);

  useEffect(() => {
    const session = sessionStorage.getItem('pds_user');
    if (!session) { router.push('/login'); return; }
    const u = JSON.parse(session);
    if (u.role !== 'medecin') { router.push('/'); return; }
    setUser(u);
    charger();
    const iv = setInterval(charger, 8000);
    return () => clearInterval(iv);
  }, []);

  async function majStatut(id, statut) {
    await fetch('/api/patients', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({action:'update', id, patch:{statut}})
    });
    charger();
  }

  async function faireRentrer(patient) {
    await fetch('/api/patients', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({action:'update', id: patient.id, patch:{statut:'en_cours', emplacement: patient.emplacement_suggere || 'consultation'}})
    });
    setSelected(patient);
    charger();
  }

  async function ajouterPrescription(id) {
    if (!prescription.trim()) return;
    await fetch('/api/patients', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({action:'addPrescription', id, prescription:{texte: prescription, auteur: user.matricule}})
    });
    setPrescription('');
    charger();
  }

  async function finaliser(id) {
    await fetch('/api/patients', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({action:'update', id, patch:{diagnostic, orientation, statut: orientation === 'transfert_CHM' || orientation === 'transfert_SMUR' ? 'transfert' : 'vu'}})
    });
    if (orientation === 'sortie' || orientation === 'rdv_consultation') {
      await fetch('/api/patients', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({action:'discharge', id})
      });
    }
    setSelected(null); setDiagnostic(''); setOrientation('');
    charger();
  }

  if (!user) return null;

  const patientsPreau = patients.filter(p => p.statut === 'preau');
  const patientsInstallés = patients.filter(p => p.statut !== 'preau');

  const couleurStatut = {
    attente_medecin: '#f59e0b',
    en_cours: '#3b82f6',
    vu: '#10b981',
    transfert: '#8b5cf6',
    preau: '#64748b',
  };

  return (
    <div style={{minHeight:'100vh', background:'#0f172a', display:'flex', flexDirection:'column'}}>
      <nav style={{
        background:'#064e3b', borderBottom:'1px solid #065f46',
        padding:'0 1rem', display:'flex', alignItems:'center',
        justifyContent:'space-between', height:56, flexShrink:0
      }}>
        <div style={{display:'flex', alignItems:'center', gap:12}}>
          <span style={{fontSize:22}}>🩺</span>
          <span style={{color:'#fff', fontWeight:700, fontSize:18}}>PDS Kahani</span>
          <span style={{background:'#10b981', color:'#fff', fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:4}}>MÉDECIN</span>
        </div>
        <div style={{display:'flex', alignItems:'center', gap:12}}>
          <span style={{color:'#6ee7b7', fontSize:13}}>Dr {user.nom} — {user.matricule}</span>
          <button onClick={() => {sessionStorage.clear(); router.push('/login');}}
            style={{background:'#065f46', color:'#6ee7b7', padding:'6px 12px', borderRadius:6, fontSize:13, border:'1px solid #059669'}}>
            Déconnexion
          </button>
        </div>
      </nav>

      <div style={{display:'flex', flex:1, overflow:'hidden'}}>

        {/* PLAN DE SALLE */}
        <div style={{
          width: selected ? 420 : '100%',
          flexShrink:0, padding:'1rem',
          overflowY:'auto', transition:'width 0.2s'
        }}>

          {/* FILE D'ATTENTE PRÉAU */}
          {patientsPreau.length > 0 && (
            <div style={{
              background:'#1e293b', border:'1px solid #334155',
              borderRadius:12, padding:'12px 16px', marginBottom:16
            }}>
              <div style={{color:'#94a3b8', fontSize:12, fontWeight:600, marginBottom:10, textTransform:'uppercase', letterSpacing:1}}>
                Préau — en attente ({patientsPreau.length})
              </div>
              <div style={{display:'flex', flexDirection:'column', gap:6}}>
                {patientsPreau.map(p => (
                  <div key={p.id} style={{
                    display:'flex', alignItems:'center', justifyContent:'space-between',
                    background:'#0f172a', borderRadius:8, padding:'10px 14px'
                  }}>
                    <div>
                      <span style={{color:'#f1f5f9', fontWeight:600, fontSize:14}}>{p.nom} {p.prenom}</span>
                      <span style={{color:'#64748b', fontSize:12, marginLeft:8}}>{p.age} ans — {p.motifPrincipal}</span>
                      <span style={{color:'#475569', fontSize:11, marginLeft:8}}>{dureePresence(p.arrivee)}</span>
                    </div>
                    <button onClick={() => faireRentrer(p)} style={{
                      padding:'6px 14px', borderRadius:6, fontSize:12, fontWeight:600,
                      background:'#3b82f6', color:'#fff', cursor:'pointer'
                    }}>
                      Faire rentrer →
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PLAN GÉOGRAPHIQUE */}
          <div style={{color:'#475569', fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:1, marginBottom:8}}>
            Plan de salle
          </div>

          {/* POSTE CENTRAL */}
          <div style={{
            background:'#1e293b', border:'1px solid #334155',
            borderRadius:8, padding:'10px 16px', marginBottom:12,
            display:'flex', alignItems:'center', gap:16
          }}>
            <span style={{fontSize:16}}>🖥️</span>
            <span style={{color:'#64748b', fontSize:13}}>Poste IDE</span>
            <span style={{fontSize:16}}>🖥️</span>
            <span style={{color:'#10b981', fontSize:13, fontWeight:600}}>Poste médecin</span>
            <span style={{fontSize:16}}>🖥️</span>
            <span style={{color:'#64748b', fontSize:13}}>Poste AS</span>
            <div style={{marginLeft:'auto', color:'#475569', fontSize:12}}>← Entrée préau</div>
          </div>

          {/* GRILLE GÉOGRAPHIQUE */}
          <div style={{display:'flex', flexDirection:'column', gap:8}}>
            {LAYOUT.map((row, ri) => (
              <div key={ri} style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:8}}>
                {row.cols.map((cell, ci) => {
                  if (!cell.id) return (
                    <div key={ci} style={{
                      background:'transparent',
                      border:'1px dashed #1e293b',
                      borderRadius:10, minHeight:80
                    }} />
                  );

                  const patient = patientsInstallés.find(p => p.emplacement === cell.id);
                  const enAttente = patient?.statut === 'attente_medecin';
                  const enCours = patient?.statut === 'en_cours';
                  const horsNormes = patient && estHorsNormes(patient);

                  return (
                    <div key={ci}
                      onClick={() => {
                        if (patient) {
                          setSelected(selected?.id === patient.id ? null : patient);
                          if (patient.statut === 'attente_medecin') majStatut(patient.id, 'en_cours');
                        }
                      }}
                      style={{
                        background: patient ? '#1e293b' : '#0f172a',
                        border: `2px solid ${patient ? cell.couleur : '#1e293b'}`,
                        borderRadius:10, padding:'10px',
                        cursor: patient ? 'pointer' : 'default',
                        minHeight:80,
                        position:'relative',
                        transition:'all 0.15s',
                        animation: enAttente ? 'blink 1.5s infinite' : 'none',
                        boxShadow: selected?.id === patient?.id ? `0 0 0 2px ${cell.couleur}` : 'none',
                      }}>
                      <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.6} }`}</style>

                      {/* Label fixe */}
                      <div style={{
                        display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:4
                      }}>
                        <span style={{
                          color: cell.couleur, fontSize:16, fontWeight:800, letterSpacing:0.5
                        }}>{cell.label}</span>
                        {patient && (
                          <span style={{
                            width:8, height:8, borderRadius:'50%',
                            background: enAttente ? '#f59e0b' : enCours ? '#3b82f6' : '#10b981',
                            flexShrink:0, marginTop:2
                          }} />
                        )}
                      </div>

                      {patient ? (
                        <>
                          <div style={{color:'#f1f5f9', fontWeight:600, fontSize:12, lineHeight:1.2}}>
                            {patient.nom} {patient.prenom}
                          </div>
                          <div style={{color:'#94a3b8', fontSize:11, marginTop:2}}>
                            {patient.motifPrincipal}
                          </div>
                          <div style={{display:'flex', gap:6, marginTop:4, flexWrap:'wrap'}}>
                            {patient.sat && (
                              <span style={{fontSize:10, color: parseFloat(patient.sat) < 94 ? '#ef4444' : '#64748b'}}>
                                SpO2 {patient.sat}%
                              </span>
                            )}
                            {horsNormes && (
                              <span style={{fontSize:10, color:'#ef4444', fontWeight:700}}>⚠️ anormal</span>
                            )}
                          </div>
                          <div style={{color:'#475569', fontSize:10, marginTop:4}}>
                            {dureePresence(patient.arrivee)}
                          </div>
                        </>
                      ) : (
                        <div style={{color:'#1e293b', fontSize:11, marginTop:4}}>{cell.fullLabel}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* LÉGENDE */}
          <div style={{display:'flex', gap:16, marginTop:16, padding:'10px', flexWrap:'wrap'}}>
            {[
              {c:'#ef4444', l:'Déchocage'},
              {c:'#3b82f6', l:'Lits'},
              {c:'#8b5cf6', l:'Fauteuils O2'},
              {c:'#10b981', l:'Observation'},
              {c:'#f59e0b', l:'Pansement'},
              {c:'#64748b', l:'Consultation'},
            ].map(({c,l}) => (
              <div key={l} style={{display:'flex', alignItems:'center', gap:6}}>
                <div style={{width:10, height:10, borderRadius:2, background:c}} />
                <span style={{color:'#64748b', fontSize:11}}>{l}</span>
              </div>
            ))}
          </div>
        </div>

        {/* FICHE PATIENT */}
        {selected && (
          <div style={{
            flex:1, background:'#1e293b', borderLeft:'1px solid #334155',
            padding:'1.5rem', overflowY:'auto'
          }}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16}}>
              <div>
                <h2 style={{color:'#f1f5f9', fontSize:20, fontWeight:700}}>
                  {selected.nom} {selected.prenom}
                </h2>
                <div style={{color:'#94a3b8', fontSize:14, marginTop:2}}>
                  {selected.age} ans — {selected.sexe === 'F' ? 'Femme' : 'Homme'} — IPP : {selected.ipp || '—'}
                </div>
                {selected.allergie === 'Oui' && (
                  <div style={{
                    background:'#450a0a', border:'1px solid #b91c1c',
                    borderRadius:6, padding:'6px 10px', marginTop:8,
                    color:'#fca5a5', fontSize:13, fontWeight:700
                  }}>
                    ⚠️ ALLERGIE : {selected.allergie_detail}
                  </div>
                )}
              </div>
              <button onClick={() => setSelected(null)}
                style={{background:'#334155', color:'#94a3b8', padding:'6px 12px', borderRadius:6, fontSize:13}}>
                ✕
              </button>
            </div>

            {/* CONSTANTES */}
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:16}}>
              {[
                {k:'sat', l:'SpO2', u:'%'}, {k:'fc', l:'FC', u:'bpm'},
                {k:'ta_sys', l:'PAS', u:'mmHg'}, {k:'ta_dia', l:'PAD', u:'mmHg'},
                {k:'temp', l:'T°', u:'°C'}, {k:'dextro', l:'Dextro', u:'g/L'},
              ].map(({k,l,u}) => (
                <div key={k} style={{background:'#0f172a', borderRadius:8, padding:'10px', textAlign:'center'}}>
                  <div style={{color:'#64748b', fontSize:11}}>{l}</div>
                  <div style={{fontSize:18, fontWeight:700, marginTop:2}}>
                    <Constante val={selected[k]} k={k} />
                  </div>
                  <div style={{color:'#475569', fontSize:11}}>{u}</div>
                </div>
              ))}
            </div>

            {/* MOTIF */}
            <div style={{background:'#0f172a', borderRadius:10, padding:'12px', marginBottom:12}}>
              <div style={{color:'#64748b', fontSize:11, fontWeight:600, marginBottom:6, textTransform:'uppercase'}}>Motif</div>
              <div style={{color:'#f1f5f9', fontSize:14}}>{selected.motifPrincipal || '—'}</div>
              {selected.douleur_eva && (
                <div style={{color:'#94a3b8', fontSize:13, marginTop:4}}>EVA {selected.douleur_eva}/10</div>
              )}
              {selected.fievre_depuis && (
                <div style={{color:'#f59e0b', fontSize:13, marginTop:4}}>Fièvre depuis : {selected.fievre_depuis}</div>
              )}
              {selected.plaie_vaccin && (
                <div style={{color:'#94a3b8', fontSize:13, marginTop:4}}>
                  Vaccin : {selected.plaie_vaccin} — Quick test : {selected.quicktest_tetanos || 'non fait'}
                </div>
              )}
              {selected.bu_urine && (
                <div style={{color:'#8b5cf6', fontSize:13, marginTop:4}}>
                  BU en cours — bHCG : {selected.bhcg ? 'réalisé' : 'en attente'}
                </div>
              )}
              {selected.notes_as && (
                <div style={{color:'#64748b', fontSize:13, marginTop:6, fontStyle:'italic'}}>
                  Note AS : {selected.notes_as}
                </div>
              )}
            </div>

            {/* ACTES IDE */}
            {selected.actes && JSON.parse(selected.actes || '[]').length > 0 && (
              <div style={{background:'#0f172a', borderRadius:10, padding:'12px', marginBottom:12}}>
                <div style={{color:'#64748b', fontSize:11, fontWeight:600, marginBottom:6, textTransform:'uppercase'}}>Actes réalisés</div>
                <div style={{display:'flex', flexWrap:'wrap', gap:4}}>
                  {JSON.parse(selected.actes).map((a,i) => (
                    <span key={i} style={{
                      background:'#1e3a5f', color:'#93c5fd',
                      fontSize:12, padding:'3px 8px', borderRadius:99
                    }}>
                      {a.label} {new Date(a.heure).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* PRESCRIPTIONS */}
            <div style={{background:'#0f172a', borderRadius:10, padding:'12px', marginBottom:12}}>
              <div style={{color:'#64748b', fontSize:11, fontWeight:600, marginBottom:8, textTransform:'uppercase'}}>Prescriptions</div>
              {selected.prescriptions && JSON.parse(selected.prescriptions || '[]').map((p,i) => (
                <div key={i} style={{background:'#1e293b', borderRadius:6, padding:'8px 10px', marginBottom:6}}>
                  <div style={{color:'#f1f5f9', fontSize:13}}>{p.texte}</div>
                  <div style={{color:'#475569', fontSize:11, marginTop:2}}>
                    {new Date(p.heure).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}
                  </div>
                </div>
              ))}
              <div style={{display:'flex', gap:8, marginTop:8}}>
                <input value={prescription} onChange={e => setPrescription(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && ajouterPrescription(selected.id)}
                  placeholder="Nouvelle prescription..."
                  style={{
                    flex:1, padding:'10px 12px', borderRadius:8,
                    border:'1px solid #334155', background:'#1e293b',
                    color:'#fff', fontSize:14
                  }} />
                <button onClick={() => ajouterPrescription(selected.id)}
                  style={{padding:'10px 16px', borderRadius:8, background:'#3b82f6', color:'#fff', fontSize:13, fontWeight:600}}>
                  +
                </button>
              </div>
            </div>

            {/* DIAGNOSTIC & ORIENTATION */}
            <div style={{background:'#0f172a', borderRadius:10, padding:'12px', marginBottom:12}}>
              <div style={{color:'#64748b', fontSize:11, fontWeight:600, marginBottom:8, textTransform:'uppercase'}}>Diagnostic & orientation</div>
              <textarea value={diagnostic} onChange={e => setDiagnostic(e.target.value)}
                placeholder="Diagnostic..."
                style={{
                  width:'100%', padding:'10px', borderRadius:8,
                  border:'1px solid #334155', background:'#1e293b',
                  color:'#fff', fontSize:14, minHeight:60, resize:'vertical', marginBottom:10
                }} />
              <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
                {[
                  {id:'sortie', label:'→ Sortie'},
                  {id:'rdv_consultation', label:'📅 RDV cslt'},
                  {id:'transfert_CHM', label:'🚑 CHM'},
                  {id:'transfert_SMUR', label:'🚨 SMUR'},
                  {id:'hospitalisation', label:'🏥 Hospi'},
                ].map(o => (
                  <button key={o.id} onClick={() => setOrientation(o.id)} style={{
                    padding:'8px 12px', borderRadius:6, fontSize:12, fontWeight:600,
                    background: orientation === o.id ? '#3b82f6' : '#334155',
                    color:'#fff',
                    border: orientation === o.id ? '2px solid #60a5fa' : '1px solid #475569'
                  }}>{o.label}</button>
                ))}
              </div>
            </div>

            <button onClick={() => finaliser(selected.id)}
              disabled={!diagnostic || !orientation}
              style={{
                width:'100%', padding:'14px', borderRadius:10,
                background: (!diagnostic || !orientation) ? '#334155' : '#16a34a',
                color:'#fff', fontSize:15, fontWeight:700, cursor:'pointer'
              }}>
              ✓ Finaliser la prise en charge
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
