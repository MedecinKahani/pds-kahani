'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

function lundiDeLaSemaine(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset * 7);
  const jour = d.getDay();
  const diff = jour === 0 ? -6 : 1 - jour;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function dateStr(d) {
  return d.toISOString().slice(0, 10);
}

function genererCreneaux(standId, stand, dateObj, modulation) {
  const jourSemaine = dateObj.getDay();
  if (!stand.jours.includes(jourSemaine)) return [];

  const [hDeb, mDeb] = stand.horaires.debut.split(':').map(Number);
  const [hFin, mFin] = stand.horaires.fin.split(':').map(Number);
  const debutMin = hDeb * 60 + mDeb;
  const finMin = hFin * 60 + mFin;

  // Créneau unique groupé (vaccin) : un seul horaire, capacité multiple
  if (stand.nbCreneaux === 1) {
    return [`${String(hDeb).padStart(2,'0')}:${String(mDeb).padStart(2,'0')}`];
  }

  // Créneaux horaires réguliers avec capacité par créneau (bio, chronique)
  if (stand.capacitePlace && stand.dureeMin) {
    const creneaux = [];
    let t = debutMin;
    while (t < finMin) {
      const h = Math.floor(t / 60);
      const m = t % 60;
      creneaux.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
      t += stand.dureeMin;
    }
    return creneaux;
  }

  // Créneaux standards (K2, pansement)
  const nbCreneaux = Math.floor((finMin - debutMin) / stand.dureeMin);
  const creneaux = [];
  let t = debutMin;
  for (let i = 0; i < nbCreneaux && t < finMin; i++) {
    const h = Math.floor(t / 60);
    const m = t % 60;
    creneaux.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    t += stand.dureeMin;
  }
  return creneaux;
}

export default function PlanningPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [config, setConfig] = useState(null);
  const [modulation, setModulation] = useState({});
  const [semaineOffset, setSemaineOffset] = useState(0);
  const [rdvSemaine, setRdvSemaine] = useState([]);
  const [standActif, setStandActif] = useState('pansement');
  const [loading, setLoading] = useState(true);
  const [modaleSlot, setModaleSlot] = useState(null);
  const [modaleAnnuler, setModaleAnnuler] = useState(null);
  const [matricule, setMatricule] = useState('');
  const [patientTrouve, setPatientTrouve] = useState(null);
  const [nomManuel, setNomManuel] = useState('');
  const [prenomManuel, setPrenomManuel] = useState('');
  const [ddnManuel, setDdnManuel] = useState('');
  const [collerFait, setCollerFait] = useState(false);
  const [motifManuel, setMotifManuel] = useState('');
  const [showModulation, setShowModulation] = useState(false);
  const [joursBarres, setJoursBarres] = useState({});

  useEffect(() => {
    const s = sessionStorage.getItem('pds_user');
    if (!s) { router.push('/login'); return; }
    setUser(JSON.parse(s));
    charger();
  }, []);

  useEffect(() => {
    if (user) chargerSemaine();
  }, [semaineOffset, user]);

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      chargerSemaine();
    }, 60000);
    return () => clearInterval(interval);
  }, [user, semaineOffset]);

  async function charger() {
    setLoading(true);
    const [cfgRes, modRes, barRes] = await Promise.all([
      fetch('/api/planning?action=config').then(r => r.json()),
      fetch('/api/planning?action=modulation').then(r => r.json()),
      fetch('/api/planning?action=jours_barres').then(r => r.json()),
    ]);
    setConfig(cfgRes.config);
    setModulation(modRes.modulation || {});
    setJoursBarres(barRes.barres || {});
    setLoading(false);
  }

  async function toggleJourBarre(dStr, type) {
    await fetch('/api/planning', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle_jour_barre', date: dStr, stand: standActif + ':' + type }),
    });
    const r = await fetch('/api/planning?action=jours_barres').then(r => r.json());
    setJoursBarres(r.barres || {});
  }

  async function chargerSemaine() {
    const lundi = lundiDeLaSemaine(semaineOffset);
    const r = await fetch(`/api/planning?action=semaine&debut=${dateStr(lundi)}`);
    const d = await r.json();
    setRdvSemaine(d.rdv || []);
  }

  if (!config) return null;

  const lundi = lundiDeLaSemaine(semaineOffset);
  const jours = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(lundi);
    d.setDate(d.getDate() + i);
    return d;
  });

  const stand = config[standActif];
  const JOURS_LABEL = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

  function rdvPourSlot(dStr, heure) {
    return rdvSemaine.filter(r => r.stand === standActif && r.date === dStr && r.heure === heure);
  }

  async function chercherParMatricule() {
    if (!matricule) return;
    const r = await fetch(`/api/patients?all=1`);
    const d = await r.json();
    const trouve = (d.patients || []).find(p => p.ipp === matricule || p.id === matricule);
    if (trouve) {
      setPatientTrouve(trouve);
      setNomManuel(trouve.nom || '');
      setPrenomManuel(trouve.prenom || '');
    } else {
      setPatientTrouve(null);
    }
  }

  function imprimerTicket(rdv) {
    const dateLabel = new Date(rdv.date).toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Convocation</title>
      <style>
        @page { size: 58mm auto; margin: 0; }
        body { width: 54mm; margin: 0 auto; padding: 2mm; font-family: monospace; font-size: 11px; color: #000; }
        .center { text-align: center; }
        .titre { font-weight: bold; font-size: 13px; margin-bottom: 4px; }
        .ligne { border-top: 1px dashed #000; margin: 4px 0; }
        .label { font-size: 9px; color: #444; text-transform: uppercase; }
        .val { font-weight: bold; font-size: 13px; margin-bottom: 3px; }
        .gros { font-weight: bold; font-size: 18px; text-align: center; margin: 6px 0; }
      </style></head><body>
        <div class="center titre">CMR KAHANI</div>
        <div class="center" style="font-size:10px">Convocation rendez-vous</div>
        <div class="ligne"></div>
        <div class="label">Patient</div>
        <div class="val">${rdv.nom} ${rdv.prenom}</div>
        ${rdv.ddn ? `<div class="label">Date de naissance</div><div class="val">${rdv.ddn}</div>` : ''}
        ${rdv.ipp ? `<div class="label">IPP</div><div class="val">${rdv.ipp}</div>` : ''}
        <div class="ligne"></div>
        <div class="label">Motif</div>
        <div class="val">${rdv.standLabel}</div>
        <div class="ligne"></div>
        <div class="center" style="font-size:10px;text-transform:capitalize">${dateLabel}</div>
        <div class="gros">${rdv.heure}</div>
        <div class="ligne"></div>
        ${rdv.motif ? `<div class="label">Précision</div><div style="font-size:10px">${rdv.motif}</div>` : ''}
        <div class="center" style="font-size:8px;margin-top:6px;color:#666">Se présenter 5 min avant</div>
      </body></html>`;
    const w = window.open('', '_blank', 'width=300,height=500');
    w.document.write(html);
    w.document.close();
    setTimeout(() => { w.print(); }, 250);
  }

  async function confirmerReservation() {
    if (!modaleSlot) return;
    const nom = patientTrouve ? patientTrouve.nom : nomManuel;
    const prenom = patientTrouve ? patientTrouve.prenom : prenomManuel;
    if (!nom) return;

    const standLabel = stand.label;
    const rdvData = {
      date: modaleSlot.date, stand: standActif, heure: modaleSlot.heure,
      nom, prenom, ddn: patientTrouve?.ddn || ddnManuel || '', ipp: patientTrouve?.ipp || matricule,
      motif: motifManuel,
      creePar: user?.matricule, creeParNom: user?.nom,
    };

    await fetch('/api/planning', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reserver', ...rdvData }),
    });

    imprimerTicket({ ...rdvData, standLabel });

    setModaleSlot(null);
    setMatricule(''); setPatientTrouve(null); setNomManuel(''); setPrenomManuel(''); setDdnManuel(''); setMotifManuel('');
    chargerSemaine();
  }

  async function annulerRdv(id) {
    await fetch('/api/planning', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'annuler', id }),
    });
    setModaleAnnuler(null);
    chargerSemaine();
  }

  async function changerModulation(mois, standId, nb) {
    await fetch('/api/planning', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set_modulation', mois, stand: standId, nbCreneaux: nb }),
    });
    const r = await fetch('/api/planning?action=modulation').then(r => r.json());
    setModulation(r.modulation || {});
  }

  const moisActuelKey = dateStr(lundi).slice(0, 7) + ':' + standActif;
  const nbCreneauxActuel = modulation[moisActuelKey] || stand?.nbCreneauxParDefaut || 10;

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6', fontFamily: 'system-ui' }}>
      <nav style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '0 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.push('/vueglobale')} style={{ padding: '7px 14px', borderRadius: 8, background: '#f3f4f6', color: '#6b7280', fontSize: 12, border: '1px solid #e5e7eb', cursor: 'pointer' }}>← Retour</button>
          <span style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>📅 Planning RDV — Bêta</span>
        </div>
      </nav>

      <div style={{ maxWidth: 1100, margin: '1.5rem auto', padding: '0 1rem' }}>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {Object.entries(config).map(([id, s]) => (
            <button key={id} onClick={() => setStandActif(id)}
              style={{ padding: '10px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                background: standActif === id ? s.couleur : '#fff', color: standActif === id ? '#fff' : s.couleur,
                border: '2px solid ' + s.couleur }}>
              {s.icon} {s.label} {s.strict && <span style={{ fontSize: 9, opacity: 0.8 }}>(strict)</span>}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: '10px 16px', marginBottom: 16 }}>
          <button onClick={() => setSemaineOffset(o => o - 1)} style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 18 }}>←</button>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>
            Semaine du {jours[0].toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' })} au {jours[6].toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
          </div>
          <button onClick={() => setSemaineOffset(o => o + 1)} style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 18 }}>→</button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#9ca3af' }}>Chargement...</div>
        ) : (
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', minWidth: 700 }}>
              {jours.map((d, i) => {
                const dStr = dateStr(d);
                const creneaux = genererCreneaux(standActif, stand, d, modulation);
                const estAujourdhui = dStr === dateStr(new Date());
                const keyIPA = standActif + ':ipa:' + dStr;
                const keyMed = standActif + ':med:' + dStr;
                const keyK2 = standActif + ':k2:' + dStr;
                const ipaBarre = stand.barrableIPA && joursBarres[keyIPA];
                const medBarre = stand.barrableMed && joursBarres[keyMed];
                const k2Barre = stand.barrableK2 && joursBarres[keyK2];
                const capaciteJour = (stand.capacitePlace || 1) - (ipaBarre?2:0) - (medBarre?2:0);
                const peutBarrer = user?.role === 'ide' || user?.role === 'secretaire';
                return (
                  <div key={i} style={{ borderRight: i < 6 ? '1px solid #e5e7eb' : 'none' }}>
                    <div style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '1px solid #e5e7eb', background: estAujourdhui ? stand.couleur + '18' : '#f9fafb' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: estAujourdhui ? stand.couleur : '#6b7280' }}>{JOURS_LABEL[d.getDay()]}</div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#111827' }}>{d.getDate()}</div>
                      {peutBarrer && (stand.barrableIPA||stand.barrableMed) && (
                        <div style={{ display:'flex', gap:3, marginTop:4, justifyContent:'center' }}>
                          {stand.barrableIPA && <button onClick={() => toggleJourBarre(dStr,'ipa')}
                            style={{ fontSize: 8, padding: '2px 5px', borderRadius: 4, border: '1px solid ' + (ipaBarre ? '#fecaca' : '#e5e7eb'), background: ipaBarre ? '#fef2f2' : '#fff', color: ipaBarre ? '#dc2626' : '#9ca3af', cursor: 'pointer' }}>
                            IPA{ipaBarre?' ✕':''}
                          </button>}
                          {stand.barrableMed && <button onClick={() => toggleJourBarre(dStr,'med')}
                            style={{ fontSize: 8, padding: '2px 5px', borderRadius: 4, border: '1px solid ' + (medBarre ? '#fecaca' : '#e5e7eb'), background: medBarre ? '#fef2f2' : '#fff', color: medBarre ? '#dc2626' : '#9ca3af', cursor: 'pointer' }}>
                            Méd{medBarre?' ✕':''}
                          </button>}
                        </div>
                      )}
                      {peutBarrer && stand.barrableK2 && (
                        <div style={{ marginTop:4 }}>
                          <button onClick={() => toggleJourBarre(dStr,'k2')}
                            style={{ fontSize: 8, padding: '2px 6px', borderRadius: 4, border: '1px solid ' + (k2Barre ? '#fecaca' : '#e5e7eb'), background: k2Barre ? '#fef2f2' : '#fff', color: k2Barre ? '#dc2626' : '#9ca3af', cursor: 'pointer' }}>
                            {k2Barre ? '✕ Fermé' : 'Barrer'}
                          </button>
                        </div>
                      )}
                    </div>
                    <div style={{ padding: 6, display: 'flex', flexDirection: 'column', gap: 4, minHeight: 200 }}>
                      {(ipaBarre&&medBarre)||k2Barre ? <div style={{ fontSize: 10, color: '#dc2626', textAlign: 'center', padding: '8px 4px', background: '#fef2f2', borderRadius: 6, fontWeight: 600 }}>{k2Barre?'K2 fermé ce jour':'IPA et médecin indisponibles'}</div> : null}
                      {!((ipaBarre&&medBarre)||k2Barre) && creneaux.length === 0 && <div style={{ fontSize: 10, color: '#d1d5db', textAlign: 'center', padding: '8px 0' }}>Fermé</div>}
                      {!((ipaBarre&&medBarre)||k2Barre) && creneaux.map(heure => {
                        const occupants = rdvPourSlot(dStr, heure);
                        const capacite = capaciteJour > 0 ? capaciteJour : (stand.capacitePlace || 1);
                        const plein = occupants.length >= capacite;
                        return (
                          <div key={heure}>
                            <button onClick={() => !plein && setModaleSlot({ date: dStr, heure })}
                              disabled={plein}
                              style={{ width: '100%', padding: '5px 6px', borderRadius: 6, fontSize: 10, fontWeight: 600, textAlign: 'left', cursor: plein ? 'default' : 'pointer',
                                background: plein ? stand.couleur + '22' : '#fff', color: plein ? stand.couleur : '#9ca3af',
                                border: '1px solid ' + (plein ? stand.couleur + '55' : '#e5e7eb') }}>
                              {heure}{stand.capacitePlace ? ` · ${occupants.length}/${capacite}` : ''}
                            </button>
                            {occupants.map(o => (
                              <div key={o.id} onClick={() => setModaleAnnuler(o)}
                                style={{ marginTop: 2, padding: '4px 6px', borderRadius: 5, background: stand.couleur, color: '#fff', fontSize: 9, cursor: 'pointer' }}>
                                {o.nom} {o.prenom}
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {modaleSlot && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 24, width: 380, boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: stand.couleur, marginBottom: 4 }}>{stand.icon} {stand.label}</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>
              {new Date(modaleSlot.date).toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long' })} à {modaleSlot.heure}
            </div>

            <button onClick={async () => {
              try {
                const txt = await navigator.clipboard.readText();
                const parts = txt.split('\t');
                if (parts.length >= 4) {
                  const [ipp, ddn, nom, prenom] = parts;
                  if (ipp && ipp !== '--') setMatricule(ipp);
                  if (ddn && ddn !== '--') setDdnManuel(ddn);
                  if (nom && nom !== '--') setNomManuel(nom);
                  if (prenom && prenom !== '--') setPrenomManuel(prenom);
                  setPatientTrouve(null);
                  setCollerFait(true);
                  setTimeout(() => setCollerFait(false), 2000);
                }
              } catch (e) {}
            }} style={{ width: '100%', padding: '8px', borderRadius: 8, background: collerFait ? '#16a34a' : '#eff6ff', color: collerFait ? '#fff' : '#2563eb', fontSize: 12, fontWeight: 700, border: '1px solid ' + (collerFait ? '#16a34a' : '#bfdbfe'), cursor: 'pointer', marginBottom: 12 }}>
              {collerFait ? '✓ Champs remplis' : '📋 Coller infos patient (depuis PDS)'}
            </button>

            <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4 }}>IPP ou matricule (optionnel)</label>
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              <input value={matricule} onChange={e => setMatricule(e.target.value)} placeholder="IPP du patient"
                style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 13, outline: 'none' }} />
              <button onClick={chercherParMatricule} style={{ padding: '8px 12px', borderRadius: 8, background: '#374151', color: '#fff', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer' }}>Chercher</button>
            </div>
            {patientTrouve && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '6px 10px', fontSize: 12, color: '#166534', marginBottom: 10 }}>
                ✓ {patientTrouve.nom} {patientTrouve.prenom} — {patientTrouve.ddn}
              </div>
            )}

            {!patientTrouve && (
              <>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4 }}>Nom *</label>
                <input value={nomManuel} onChange={e => setNomManuel(e.target.value.toUpperCase())} placeholder="NOM"
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 13, outline: 'none', marginBottom: 10, boxSizing: 'border-box' }} />
                <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4 }}>Prénom</label>
                <input value={prenomManuel} onChange={e => setPrenomManuel(e.target.value)} placeholder="Prénom"
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 13, outline: 'none', marginBottom: 10, boxSizing: 'border-box' }} />
                <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4 }}>Date de naissance</label>
                <input value={ddnManuel} onChange={e => {
                  const raw = e.target.value.replace(/[^0-9]/g,'');
                  let v = raw;
                  if(v.length>2) v = v.slice(0,2)+'/'+v.slice(2);
                  if(v.length>5) v = v.slice(0,5)+'/'+v.slice(5);
                  if(v.length>10) v = v.slice(0,10);
                  setDdnManuel(v);
                }} placeholder="JJ/MM/AAAA" maxLength={10} inputMode="numeric"
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 13, outline: 'none', marginBottom: 10, boxSizing: 'border-box' }} />
              </>
            )}

            <label style={{ fontSize: 11, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4 }}>Motif (optionnel)</label>
            <input value={motifManuel} onChange={e => setMotifManuel(e.target.value)} placeholder="Motif du RDV"
              style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1.5px solid #e5e7eb', fontSize: 13, outline: 'none', marginBottom: 20, boxSizing: 'border-box' }} />

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setModaleSlot(null); setMatricule(''); setPatientTrouve(null); setNomManuel(''); setPrenomManuel(''); setDdnManuel(''); setMotifManuel(''); }}
                style={{ flex: 1, padding: '10px', borderRadius: 8, background: '#f3f4f6', color: '#6b7280', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer' }}>Annuler</button>
              <button onClick={confirmerReservation} disabled={!patientTrouve && !nomManuel}
                style={{ flex: 2, padding: '10px', borderRadius: 8, background: (!patientTrouve && !nomManuel) ? '#e5e7eb' : stand.couleur, color: '#fff', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer' }}>
                ✓ Réserver le créneau
              </button>
            </div>
          </div>
        </div>
      )}

      {modaleAnnuler && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 24, width: 340, boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#111827', marginBottom: 4 }}>{modaleAnnuler.nom} {modaleAnnuler.prenom}</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>{modaleAnnuler.date} à {modaleAnnuler.heure}</div>
            {modaleAnnuler.motif && <div style={{ fontSize: 12, color: '#374151', marginBottom: 4 }}>Motif : {modaleAnnuler.motif}</div>}
            <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 20 }}>Pris par {modaleAnnuler.creeParNom}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setModaleAnnuler(null)} style={{ flex: 1, padding: '10px', borderRadius: 8, background: '#f3f4f6', color: '#6b7280', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer' }}>Fermer</button>
              <button onClick={() => annulerRdv(modaleAnnuler.id)} style={{ flex: 1, padding: '10px', borderRadius: 8, background: '#fef2f2', color: '#dc2626', fontSize: 13, fontWeight: 700, border: '1px solid #fecaca', cursor: 'pointer' }}>✕ Annuler le RDV</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
