'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

function getCreneauActuel() {
  const h = new Date().getHours();
  const today = new Date().toLocaleDateString('fr-FR');
  if (h >= 7 && h < 19) return { label: 'Journee 7h-19h', debut: 7, fin: 19, date: today, type: 'jour' };
  return { label: 'Nuit 19h-7h', debut: 19, fin: 7, date: today, type: 'nuit' };
}

function getCreneauTimestamps(creneau) {
  const now = new Date();
  const today = new Date(now);
  if (creneau.type === 'jour') {
    const debut = new Date(today); debut.setHours(7,0,0,0);
    const fin = new Date(today); fin.setHours(19,0,0,0);
    return { debut: debut.getTime(), fin: fin.getTime() };
  } else {
    const debut = new Date(today); debut.setDate(debut.getDate()-1); debut.setHours(19,0,0,0);
    const fin = new Date(today); fin.setHours(7,0,0,0);
    return { debut: debut.getTime(), fin: fin.getTime() };
  }
}

function safeJSON(val, fallback=[]) {
  if (!val) return fallback;
  if (Array.isArray(val)) return val;
  try { return JSON.parse(val); } catch { return fallback; }
}

function Ligne({ label, valeur, sub }) {
  return (
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',padding:'8px 10px',borderBottom:'1px solid #f3f4f6'}}>
      <div>
        <span style={{fontSize:13,color:'#374151'}}>{label}</span>
        {sub&&<div style={{fontSize:11,color:'#9ca3af',marginTop:2}}>{sub}</div>}
      </div>
      <span style={{fontWeight:800,color:valeur>0?'#111827':'#d1d5db',fontSize:18,minWidth:32,textAlign:'right',flexShrink:0}}>{valeur}</span>
    </div>
  );
}

function Section({ titre, couleur, children }) {
  return (
    <div style={{background:'#fff',borderRadius:12,border:'1px solid #e5e7eb',marginBottom:14,overflow:'hidden'}}>
      <div style={{background:couleur+'18',padding:'10px 14px',borderBottom:'1px solid '+couleur+'22'}}>
        <span style={{fontWeight:700,color:couleur,fontSize:13}}>{titre}</span>
      </div>
      <div>{children}</div>
    </div>
  );
}

export default function StatsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [tousPts, setTousPts] = useState([]);
  const [creneau] = useState(getCreneauActuel);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const s = sessionStorage.getItem('pds_user');
    if (!s) { router.push('/login'); return; }
    const u = JSON.parse(s);
    setUser(u);
    charger();
  }, []);

  async function charger() {
    setLoading(true);
    const ts = getCreneauTimestamps(creneau);
    const r = await fetch('/api/patients?all=1');
    const d = await r.json();
    const pts = (d.patients||[]).filter(p => {
      const t = parseInt(p.arrivee);
      return t >= ts.debut && t <= ts.fin;
    });
    setTousPts(pts);
    setLoading(false);
  }

  const dateStr = new Date().toLocaleDateString('fr-FR',{day:'2-digit',month:'long',year:'numeric'});

  // ---- Calculs communs ----
  const nbTotal = tousPts.length;

  // Prescriptions de tous les patients (réalisées ou non)
  const toutesRx = tousPts.flatMap(p => safeJSON(p.prescriptions, []));
  const rxFaites = toutesRx.filter(r => r.fait);

  function countRxTexte(needle) {
    return rxFaites.filter(r => r.texte?.toLowerCase().includes(needle.toLowerCase())).length;
  }
  function countRxExact(needle) {
    return rxFaites.filter(r => r.texte === needle).length;
  }

  // ---- Calculs AS ----
  const nbConstStd = tousPts.filter(p => p.fc || p.sat || p.tas || p.temp).length;
  const nbDextro = tousPts.filter(p => p.dextro).length + countRxTexte('Dextro');
  const nbHemocue = tousPts.filter(p => p.hemocue).length + countRxTexte('Hémocue');
  const nbTetanos = tousPts.filter(p => p.quicktest).length + countRxTexte('quick test');
  const nbTdrDengue = tousPts.filter(p => p.tdr_dengue).length + countRxTexte('TDR Dengue');
  const nbTdrPalu = tousPts.filter(p => p.tdr_palu).length + countRxTexte('TDR Paludisme');
  const nbBU = tousPts.filter(p => p.bu_fait).length + countRxTexte('BU');
  const nbBhcg = tousPts.filter(p => p.bhcg_fait).length + countRxTexte('bHCG');
  const nbECG_AS = tousPts.filter(p => p.ecg_fait).length + countRxTexte('ECG');

  // ---- Calculs IDE ----
  const nbPerf = countRxTexte('VVP') + countRxTexte('Perfusion') + countRxTexte('NaCl') + countRxTexte('G5%') + countRxTexte('G10%') + countRxTexte('Ringer');
  const nbMamoudzou = rxFaites.filter(r => r.texte?.includes('Prélèvement Mamoudzou')).length;

  // Bio délocalisée — détail
  const bioDelocItems = {};
  rxFaites.filter(r => r.texte?.includes('Bio délocalisée')).forEach(r => {
    const item = r.texte.replace('Bio délocalisée : ', '').replace('Bio délocalisée','').trim() || 'Non précisé';
    bioDelocItems[item] = (bioDelocItems[item]||0) + 1;
  });
  const nbBioDeloc = Object.values(bioDelocItems).reduce((a,b)=>a+b,0);

  const nbECG_IDE = rxFaites.filter(r => r.texte?.includes('ECG')).length + tousPts.filter(p=>p.ecg_fait).length;

  // Traitements PO par classe
  const traitPO = {};
  const traitIV = {};
  rxFaites.filter(r => r.categorie === 'therapeutique').forEach(r => {
    const t = r.texte || '';
    const voie = t.includes(' IV') || t.includes(' IM') ? 'IV' : t.includes(' PO') ? 'PO' : null;
    if (!voie) return;
    let classe = 'Autres';
    if (t.includes('Paracétamol')||t.includes('Perfalgan')) classe = 'Antalgiques palier 1';
    else if (t.includes('Ibuprofène')||t.includes('Kétoprofène')) classe = 'AINS';
    else if (t.includes('Tramadol')||t.includes('Acupan')) classe = 'Antalgiques palier 2';
    else if (t.includes('Morphine')||t.includes('MEOPA')) classe = 'Antalgiques palier 3 / MEOPA';
    else if (t.includes('Ventoline')||t.includes('Atrovent')||t.includes('Salbutamol')||t.includes('O2')) classe = 'Respiratoire';
    else if (t.includes('Amoxicilline')||t.includes('Augmentin')||t.includes('Azithromycine')||t.includes('Ceftriaxone')||t.includes('Métronidazole')) classe = 'Antibiotiques';
    else if (t.includes('Artéméther')||t.includes('Artésunate')||t.includes('Albendazole')) classe = 'Antiparasitaires';
    else if (t.includes('Ondansétron')||t.includes('Métoclopramide')) classe = 'Antiémétiques';
    else if (t.includes('NaCl')||t.includes('G5%')||t.includes('G10%')||t.includes('G30%')||t.includes('Ringer')||t.includes('Potassium')) classe = 'Hydratation / Remplissage';
    else if (t.includes('Insuline')) classe = 'Insuline';
    else if (t.includes('Adrénaline')) classe = 'Adrénaline';
    const target = voie === 'PO' ? traitPO : traitIV;
    target[classe] = (target[classe]||0) + 1;
  });
  const nbNebu = countRxTexte('Aérosol');

  // Ordonnances sécurisées
  const ordonSecurisees = rxFaites.filter(r => {
    const t = r.texte||'';
    return t.includes('Tramadol')||t.includes('Morphine')||t.includes('MEOPA')||t.includes('Kétoprofène');
  });

  if (loading) return <div style={{padding:'2rem',textAlign:'center',color:'#6b7280'}}>Chargement...</div>;
  if (!user) return null;

  const isAS = user.role === 'as';
  const isIDE = user.role === 'ide';

  return (
    <div style={{fontFamily:'system-ui',background:'#f3f4f6',minHeight:'100vh'}}>
      <nav style={{background:'#fff',borderBottom:'1px solid #e5e7eb',padding:'0 1.5rem',display:'flex',alignItems:'center',justifyContent:'space-between',height:56}} className="no-print">
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <button onClick={()=>router.back()} style={{padding:'7px 14px',borderRadius:8,background:'#f3f4f6',color:'#6b7280',fontSize:12,border:'1px solid #e5e7eb',cursor:'pointer'}}>Retour</button>
          <span style={{fontWeight:700,fontSize:15,color:'#111827'}}>Récap session — {creneau.label}</span>
        </div>
        <button onClick={()=>window.print()} style={{padding:'9px 20px',borderRadius:8,background:'#0d9488',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',border:'none'}}>
          Exporter PDF
        </button>
      </nav>

      <div id="print-zone" style={{maxWidth:680,margin:'2rem auto',padding:'0 1rem'}}>

        {/* EN-TÊTE */}
        <div style={{background:'#fff',borderRadius:12,border:'1px solid #e5e7eb',padding:'1.25rem 1.5rem',marginBottom:14,display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
          <div>
            <div style={{fontWeight:800,fontSize:16,color:'#111827'}}>CMR Kahani — Permanence de Soins</div>
            <div style={{color:'#6b7280',fontSize:12,marginTop:3}}>Récap {isAS?'AS':isIDE?'IDE':'Médecin'} — {creneau.label} — {dateStr}</div>
          </div>
          <div style={{textAlign:'right',fontSize:12,color:'#6b7280'}}>
            <div>{user.nom} ({user.matricule})</div>
          </div>
        </div>

        {/* TOTAL PATIENTS */}
        <div style={{background:'#0d9488',borderRadius:12,padding:'1.25rem 1.5rem',marginBottom:14,display:'flex',alignItems:'center',gap:16}}>
          <div>
            <div style={{color:'rgba(255,255,255,0.7)',fontSize:11}}>Total passages</div>
            <div style={{color:'#fff',fontWeight:800,fontSize:48,lineHeight:1}}>{nbTotal}</div>
          </div>
          <div style={{width:1,height:50,background:'rgba(255,255,255,0.2)'}}/>
          <div style={{color:'rgba(255,255,255,0.85)',fontSize:12}}>
            <div>{creneau.label}</div>
            <div>{dateStr}</div>
          </div>
        </div>

        {/* VUE AS */}
        {isAS && <>
          <Section titre="📊 Constantes et examens AS" couleur="#f59e0b">
            <Ligne label="Prises de paramètres standard (FC, Sat, TA, T°)" valeur={nbConstStd}/>
            <Ligne label="Dextro" valeur={nbDextro}/>
            <Ligne label="Hémocue" valeur={nbHemocue}/>
            <Ligne label="TDR Paludisme" valeur={nbTdrPalu}/>
            <Ligne label="TDR Dengue" valeur={nbTdrDengue}/>
            <Ligne label="Quick test Tétanos" valeur={nbTetanos}/>
            <Ligne label="BU (bandelette urinaire)" valeur={nbBU}/>
            <Ligne label="bHCG urinaire" valeur={nbBhcg}/>
            <Ligne label="ECG" valeur={nbECG_AS}/>
          </Section>
        </>}

        {/* VUE IDE */}
        {isIDE && <>
          <Section titre="💉 Actes infirmiers" couleur="#3b82f6">
            <Ligne label="Perfusions / VVP" valeur={nbPerf}/>
            <Ligne label="Prélèvements Mamoudzou" valeur={nbMamoudzou}/>
            <Ligne label="ECG" valeur={nbECG_IDE}/>
            <Ligne label="Nébulisations (aérosols)" valeur={nbNebu}/>
          </Section>

          <Section titre="🔬 Bio délocalisée" couleur="#0891b2">
            <Ligne label="Total bio délocalisée" valeur={nbBioDeloc}/>
            {Object.entries(bioDelocItems).map(([item, n]) => (
              <Ligne key={item} label={item} valeur={n}/>
            ))}
            {nbBioDeloc === 0 && <div style={{padding:'10px 14px',color:'#9ca3af',fontSize:13}}>Aucune bio délocalisée</div>}
          </Section>

          <Section titre="💊 Traitements PO" couleur="#16a34a">
            {Object.entries(traitPO).length === 0 && <div style={{padding:'10px 14px',color:'#9ca3af',fontSize:13}}>Aucun traitement PO</div>}
            {Object.entries(traitPO).sort((a,b)=>b[1]-a[1]).map(([c,n]) => <Ligne key={c} label={c} valeur={n}/>)}
          </Section>

          <Section titre="💉 Traitements IV / IM" couleur="#7c3aed">
            {Object.entries(traitIV).length === 0 && <div style={{padding:'10px 14px',color:'#9ca3af',fontSize:13}}>Aucun traitement IV/IM</div>}
            {Object.entries(traitIV).sort((a,b)=>b[1]-a[1]).map(([c,n]) => <Ligne key={c} label={c} valeur={n}/>)}
          </Section>

          <Section titre="🔴 Ordonnances sécurisées (palier 2/3 + MEOPA + Kétoprofène)" couleur="#dc2626">
            {ordonSecurisees.length === 0 && <div style={{padding:'10px 14px',color:'#9ca3af',fontSize:13}}>Aucune</div>}
            {ordonSecurisees.map((r,i) => (
              <div key={i} style={{padding:'8px 14px',borderBottom:'1px solid #f3f4f6',fontSize:12,color:'#374151',display:'flex',justifyContent:'space-between'}}>
                <span>{r.texte}</span>
                <span style={{color:'#9ca3af',fontSize:11}}>{r.faitPar||''}</span>
              </div>
            ))}
          </Section>
        </>}

        <div style={{fontSize:11,color:'#9ca3af',textAlign:'center',padding:'8px'}}>
          Document généré automatiquement — CMR Kahani PDS v1.0 — {dateStr}
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; margin: 0; }
          #print-zone { margin: 0 !important; padding: 0.5rem !important; max-width: 100% !important; }
        }
      `}</style>
    </div>
  );
}
