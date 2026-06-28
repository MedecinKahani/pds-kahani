'use client';
import { useState, useEffect, useRef, memo } from 'react';
import { useRouter } from 'next/navigation';

function calcAge(ddn) {
  if (!ddn) return null;
  const [j,m,a] = ddn.split('/');
  if (!j||!m||!a) return null;
  const d = new Date(`${a}-${m}-${j}`);
  if (isNaN(d)) return null;
  return Math.floor((Date.now()-d.getTime())/(365.25*24*3600*1000));
}
function ddnToISO(ddn) {
  const [j,m,a] = (ddn||'').split('/');
  return j&&m&&a ? `${a}-${m}-${j}` : ddn;
}

const Btn = memo(function Btn({onClick,style,disabled,children}) {
  return <button onClick={onClick} disabled={disabled}
    style={{...style,cursor:disabled?'not-allowed':'pointer',opacity:disabled?0.5:1,transition:'filter 0.12s'}}
    onMouseEnter={e=>{if(!disabled)e.currentTarget.style.filter='brightness(0.88)';}}
    onMouseLeave={e=>{e.currentTarget.style.filter='none';}}>
    {children}
  </button>;
});

const lbl = {fontSize:11,fontWeight:700,color:'#6b7280',display:'block',marginBottom:4,textTransform:'uppercase',letterSpacing:0.4};
const inp = {width:'100%',padding:'10px 12px',borderRadius:8,border:'1.5px solid #e5e7eb',fontSize:14,outline:'none',boxSizing:'border-box',background:'#fff'};
const card = {background:'#fff',borderRadius:12,border:'1px solid #e5e7eb',padding:'1rem 1.25rem',marginBottom:12};

const EMPLACEMENTS = [
  {id:'brancard1',l:'B1',c:'#ef4444'},{id:'brancard2',l:'B2',c:'#ef4444'},
  {id:'fauteuil1',l:'F1',c:'#16a34a'},{id:'fauteuil2',l:'F2',c:'#16a34a'},
  {id:'obs1',l:'O1',c:'#3b82f6'},{id:'obs2',l:'O2',c:'#3b82f6'},
  {id:'lit1',l:'L1',c:'#3b82f6'},{id:'lit2',l:'L2',c:'#3b82f6'},
  {id:'pansement',l:'P1',c:'#f59e0b'},{id:'dehors',l:'Dehors',c:'#9ca3af'},
];

// Préférence emplacement : retourne le premier disponible dans la liste
function prefPlace(pref, occupees) {
  for (const id of pref) {
    if (!occupees.includes(id)) return id;
  }
  return pref[pref.length-1];
}

export default function NouveauPatient() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [occupees, setOccupees] = useState([]);
  const [saving, setSaving] = useState(false);
  const [showAutreEmplacement, setShowAutreEmplacement] = useState(false);

  // Un seul state form pour tout
  const [f, setF] = useState({
    sexe:'', nom:'', prenom:'', ddn:'', age:'', ipp:'',
    fc:'', sat:'', temp:'', tas:'', tad:'',
    poids:'', taille:'',
    symptome:'',
    // coma
    respire: null,
    // avc
    avc_depuis: null, // '<4h' | '>4h'
    // respi
    asthme_connu: null, parle_ok: null,
    // plaie
    plaie_depuis: null, carnet: '', quicktest: '',
    // fievre
    fievre_depuis: '', crp_fait: false, tdr_palu_fait: false, tdr_dengue_fait: false,
    crp_rupture: false, tdr_palu_rupture: false, tdr_dengue_rupture: false,
    crp_resultat: '', tdr_palu_resultat: '', tdr_dengue_resultat: '',
    // vertige
    dextro: '', hemocue: '',
    // douleur
    douleur_zones: [],
    ecg_fait: false, bu_fait: false, bhcg_fait: false,
    vomissement: null, tache_peau: null,
    // DRP bronchio
    drp_fait: false,
  });

  const set = (k, v) => setF(prev => ({...prev, [k]: v}));

  useEffect(() => {
    const s = sessionStorage.getItem('pds_user');
    if (!s) { router.push('/login'); return; }
    setUser(JSON.parse(s));
    fetch('/api/patients').then(r=>r.json()).then(d=>{
      setOccupees((d.patients||[]).filter(p=>p.emplacement).map(p=>p.emplacement));
    }).catch(()=>{});
  }, []);

  const age = f.age ? parseFloat(f.age) : null;
  const adulte = age === null || age >= 15;
  const fc = parseFloat(f.fc);
  const sat = parseFloat(f.sat);
  const tas = parseFloat(f.tas);
  const tad = parseFloat(f.tad);
  const pam = f.tas && f.tad ? Math.round(tad+(tas-tad)/3) : null;

  // Seuils FC selon âge
  const fcMax = !age ? 100 : age<(1/12)?180:age<1?160:age<2?150:age<5?140:age<12?130:120;
  const fcMin = !age ? 60  : age<(1/12)?100:age<1?100:age<2?90 :age<5?80 :age<12?70 :60;

  const fcCritique  = !isNaN(fc)  && (fc>fcMax||fc<fcMin);
  const satCritique = !isNaN(sat) && sat<90;
  const pamCritique = pam!==null  && pam<65;
  const satAlerte   = !isNaN(sat) && sat<95 && sat>=90;
  const fcAlerte    = !isNaN(fc)  && (adulte ? fc>120 : fc>fcMax*0.9);
  const tasAlerte   = !isNaN(tas) && tas>200;

  const urgenceVitale = fcCritique || satCritique || pamCritique;
  const alerteConst   = !urgenceVitale && (satAlerte || fcAlerte || tasAlerte);

  // Placement suggéré
  function getPlacement() {
    const s = f.symptome;
    const B = prefPlace(['brancard1','brancard2'], occupees);
    const heure = new Date().getHours();

    if (urgenceVitale) return {place:B, label:B==='brancard1'?'B1':'B2', urgence:true, msg:'⚠️ CONSTANTES CRITIQUES — Prévenir médecin EN URGENCE'};
    if (alerteConst)   return {place:B, label:B==='brancard1'?'B1':'B2', urgence:true, msg:'⚠️ Constantes anormales — Prévenir médecin immédiatement'};

    if (s==='coma') {
      if (f.respire===false) return {place:B, label:B==='brancard1'?'B1':'B2', urgence:true, msg:'Alerter médecin + IDE — Massage cardiaque — Dextro + Hémocue dès que possible'};
      if (f.respire===true)  return {place:B, label:B==='brancard1'?'B1':'B2', urgence:true, msg:'Prévenir médecin — Dextro + Hémocue obligatoires'};
      return null;
    }

    if (s==='avc') {
      if (f.avc_depuis==='<4h') return {place:B, label:B==='brancard1'?'B1':'B2', urgence:true, msg:'⚠️ AVC < 4h — Alerter médecin EN URGENCE — Dextro + Hémocue dès que possible'};
      if (f.avc_depuis==='>4h') return {place:prefPlace(['lit1','lit2','brancard2'], occupees), label:'L1 (ou L2, B2)', urgence:false, msg:'Prévenir médecin — Dextro + Hémocue obligatoires'};
      return null;
    }

    if (s==='detresse_respi') {
      if (f.asthme_connu===true) {
        if (f.parle_ok===false) return {place:prefPlace(['fauteuil1'], occupees), label:'F1', urgence:true, msg:'Alerter médecin — Oxygène — Nébulisation selon poids — Scopé'};
        if (f.parle_ok===true)  return {place:prefPlace(['fauteuil2','lit1','lit2'], occupees), label:'F2 (ou L1, L2)', urgence:false, msg:'Prévenir médecin — Nébulisation sous air selon poids'};
      }
      if (f.asthme_connu===false) {
        if (f.parle_ok===false) return {place:B, label:B==='brancard1'?'B1':'B2', urgence:true, msg:'Prévenir médecin — Oxygène si sat < 95%'};
        if (f.parle_ok===true)  return {place:prefPlace(['lit1','lit2'], occupees), label:'L1 (ou L2)', urgence:false, msg:'Surveillance saturation'};
      }
      return null;
    }

    if (s==='plaie') {
      const p1ok = heure>=19||heure<6;
      if (f.plaie_depuis==='>24h') return {place:'dehors', label:'Dehors', urgence:false, msg:'Attendre — plaie ancienne'};
      const b2libre = !occupees.includes('brancard2');
      const b1libre = !occupees.includes('brancard1');
      if (b1libre&&b2libre) return {place:'brancard2', label:'B2', urgence:false, msg:'Plaie récente — B2 si B1 libre'};
      if (!b1libre&&b2libre) return {place:'brancard2', label:'B2', urgence:false, msg:'Plaie récente — B2'};
      if (p1ok) return {place:'pansement', label:'P1', urgence:false, msg:'Salle de pansement'};
      return {place:'dehors', label:'Dehors (attente B2)', urgence:false, msg:'B1 et B2 occupés — attendre disponibilité ou P1 à 19h'};
    }

    if (s==='fievre') {
      const ancienne = ['3j','>3j'].includes(f.fievre_depuis);
      if (ancienne) return {place:prefPlace(['lit1','lit2','fauteuil2'], occupees), label:'L1 (ou L2, F2)', urgence:false, msg:'Fièvre > 3j — installer en salle'};
      return {place:'dehors', label:'Dehors', urgence:false, msg:'Faire patienter'};
    }

    if (s==='vertige') return {place:prefPlace(['lit1','lit2','brancard2','brancard1'], occupees), label:'L1 (ou L2, B2)', urgence:false, msg:'Allonger le patient'};

    if (s==='douleur') {
      const z = f.douleur_zones;
      if (z.includes('thorax')) return {place:B, label:B==='brancard1'?'B1':'B2', urgence:true, msg:'ECG obligatoire — Prévenir médecin'};
      if (z.includes('tete') && (f.vomissement===true||f.tache_peau===true)) return {place:B, label:B==='brancard1'?'B1':'B2', urgence:true, msg:'Alerter médecin immédiatement'};
      if (z.includes('tete')) return {place:prefPlace(['lit1','lit2'], occupees), label:'L1 (ou L2)', urgence:false, msg:'Surveiller'};
      if (f.sexe==='F'&&z.includes('abdomen')) return {place:prefPlace(['lit1','lit2','brancard2'], occupees), label:'L1 (ou L2, B2)', urgence:false, msg:'BU + bHCG — Prévenir médecin'};
      return {place:'dehors', label:'Dehors', urgence:false, msg:'Constantes normales — Faire patienter'};
    }

    return {place:'dehors', label:'Dehors', urgence:false, msg:'Faire patienter'};
  }

  const placement = f.symptome && f.fc && f.sat && f.temp ? getPlacement() : null;

  // canSubmit
  const canSubmit = (() => {
    const s = f.symptome;
    if (!f.sexe || !f.nom || !s) return false;
    if (!f.fc || !f.sat || !f.temp) return false;
    if (s==='coma') {
      if (f.respire===null) return false;
      if (f.respire===true) return !!(f.dextro && f.hemocue);
      return true; // respire===false, urgence vitale, on n'attend pas
    }
    if (s==='avc') {
      if (!f.avc_depuis) return false;
      if (f.avc_depuis==='>4h') return !!(f.dextro && f.hemocue);
      return true; // <4h on n'attend pas, urgence vitale
    }
    if (s==='detresse_respi') {
      if (f.asthme_connu===null) return false;
      if (f.parle_ok===null) return false;
      if (age!==null && age<2 && !f.drp_fait) return false;
      return true;
    }
    if (s==='plaie') {
      if (!f.plaie_depuis) return false;
      if (!f.carnet) return false;
      if ((f.carnet==='absent'||f.carnet==='illisible') && !f.quicktest) return false;
      return true;
    }
    if (s==='fievre') {
      if (!f.fievre_depuis) return false;
      const ancienne = ['3j','>3j'].includes(f.fievre_depuis);
      if (ancienne) {
        // Au moins un test fait ou déclaré en rupture
        const crpOk = f.crp_fait || f.crp_rupture;
        const paluOk = f.tdr_palu_fait || f.tdr_palu_rupture;
        const dengueOk = f.tdr_dengue_fait || f.tdr_dengue_rupture;
        return crpOk && paluOk && dengueOk;
      }
      return true;
    }
    if (s==='vertige') return !!(f.dextro && f.hemocue);
    if (s==='douleur') {
      if (!f.douleur_zones.length) return false;
      if (f.douleur_zones.includes('thorax') && !f.ecg_fait) return false;
      if (f.douleur_zones.includes('tete') && (f.vomissement===null||f.tache_peau===null)) return false;
      if (f.sexe==='F' && f.douleur_zones.includes('abdomen') && (!f.bu_fait||!f.bhcg_fait)) return false;
      return true;
    }
    return true;
  })();

  async function enregistrer(placementForce) {
    if (!canSubmit || saving) return;
    setSaving(true);
    const pl = placementForce || placement || {place:'dehors'};
    const ddnISO = f.ddn ? ddnToISO(f.ddn) : '';
    const ageCalc = calcAge(f.ddn) ?? f.age;

    const rxAuto = [];
    if (f.symptome==='plaie' && (f.carnet==='absent'||f.carnet==='illisible') && f.quicktest==='neg') {
      rxAuto.push({texte:'Rappel vaccin antitétanique SC [Tétanos-quicktest négatif]',categorie:'therapeutique',fait:false,nonRealise:false,ts:Date.now(),par:'',parNom:'Auto'});
    }

    const patient = {
      sexe:f.sexe, nom:f.nom, prenom:f.prenom, ddn:ddnISO, age:String(ageCalc||''), ipp:f.ipp,
      fc:f.fc, sat:f.sat, temp:f.temp, tas:f.tas, tad:f.tad, pam:pam?String(pam):'',
      poids:f.poids, taille:f.taille,
      symptome:f.symptome,
      respire:f.respire!==null?String(f.respire):'',
      avc_depuis:f.avc_depuis||'',
      asthme_connu:f.asthme_connu!==null?String(f.asthme_connu):'',
      parle_ok:f.parle_ok!==null?String(f.parle_ok):'',
      plaie_depuis:f.plaie_depuis||'',
      plaie_vaccin:f.carnet, quicktest:f.quicktest,
      fievre_depuis:f.fievre_depuis,
      dextro:f.dextro, hemocue:f.hemocue,
      douleur_zones:JSON.stringify(f.douleur_zones),
      ecg_fait:f.ecg_fait,
      vomissement:f.vomissement!==null?String(f.vomissement):'',
      tache_peau:f.tache_peau!==null?String(f.tache_peau):'',
      drp_fait:f.drp_fait,
      crp_resultat:f.crp_resultat, tdr_palu_resultat:f.tdr_palu_resultat, tdr_dengue_resultat:f.tdr_dengue_resultat,
      statut:pl.place!=='dehors'?'attente_medecin':'dehors',
      emplacement:pl.place!=='dehors'?pl.place:null,
      emplacement_suggere:pl.place,
      prescriptions:rxAuto.length?JSON.stringify(rxAuto):'[]',
      creePar:user?.matricule||'',
    };

    await fetch('/api/patients',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'create',patient})});
    window.location.href='/vueglobale';
  }

  function enregistrerAvec(pl) { enregistrer(pl); }
    {id:'tete',l:'Tête'},{id:'cou',l:'Cou'},{id:'thorax',l:'Thorax/Poitrine'},
    {id:'abdomen',l:'Abdomen'},{id:'dos',l:'Dos'},{id:'bras_d',l:'Bras D'},
    {id:'bras_g',l:'Bras G'},{id:'jambe_d',l:'Jambe D'},{id:'jambe_g',l:'Jambe G'},
    {id:'autre',l:'Autre'},
  ];

  function toggleZone(id) {
    set('douleur_zones', f.douleur_zones.includes(id)
      ? f.douleur_zones.filter(z=>z!==id)
      : [...f.douleur_zones, id]);
  }

  const pStyle = (active, col='#0d9488') => ({
    flex:1, padding:'10px', borderRadius:8, fontWeight:600, fontSize:13,
    background: active ? col : '#fff',
    color: active ? '#fff' : '#374151',
    border: '2px solid '+(active ? col : '#e5e7eb'),
  });

  return (
    <div style={{minHeight:'100vh',background:'#f3f4f6',fontFamily:'system-ui'}}>
      <div style={{maxWidth:680,margin:'0 auto',padding:'1.5rem 1rem 5rem'}}>

        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
          <h2 style={{fontSize:18,fontWeight:700,color:'#111827',margin:0}}>Nouveau patient</h2>
          <Btn onClick={()=>window.location.href='/vueglobale'}
            style={{padding:'8px 16px',borderRadius:8,background:'#f3f4f6',color:'#6b7280',fontSize:13,border:'1px solid #e5e7eb'}}>
            Annuler
          </Btn>
        </div>

        {/* IDENTITÉ */}
        <div style={card}>
          <div style={{fontWeight:700,fontSize:14,color:'#111827',marginBottom:12}}>🪪 Identité</div>
          <div style={{display:'flex',gap:8,marginBottom:12}}>
            {[['M','Homme ♂','#3b82f6'],['F','Femme ♀','#ec4899']].map(([v,l,c])=>(
              <Btn key={v} onClick={()=>set('sexe',v)} style={pStyle(f.sexe===v,c)}>{l}</Btn>
            ))}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
            <div>
              <label style={lbl}>Nom *</label>
              <input value={f.nom} onChange={e=>set('nom',e.target.value.toUpperCase())} style={inp} placeholder="NOM" autoComplete="off"/>
            </div>
            <div>
              <label style={lbl}>Prénom</label>
              <input value={f.prenom} onChange={e=>{const v=e.target.value;set('prenom',v.charAt(0).toUpperCase()+v.slice(1).toLowerCase());}} style={inp} placeholder="Prénom" autoComplete="off"/>
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:10}}>
            <div>
              <label style={lbl}>DDN (JJ/MM/AAAA)</label>
              <input value={f.ddn} onChange={e=>{const v=e.target.value;set('ddn',v);const a=calcAge(v);if(a!==null)set('age',String(a));}} style={inp} placeholder="JJ/MM/AAAA"/>
            </div>
            <div>
              <label style={lbl}>Âge</label>
              <input value={f.age} onChange={e=>set('age',e.target.value)} style={inp} placeholder="ans" type="number"/>
            </div>
            <div>
              <label style={lbl}>IPP</label>
              <input value={f.ipp} onChange={e=>set('ipp',e.target.value)} style={inp} placeholder="IPP"/>
            </div>
          </div>
        </div>

        {/* CONSTANTES */}
        <div style={card}>
          <div style={{fontWeight:700,fontSize:14,color:'#111827',marginBottom:12}}>📊 Constantes *</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:8}}>
            {[
              {k:'fc',  l:'FC *',  u:'bpm', warn:v=>parseFloat(v)<fcMin||parseFloat(v)>fcMax},
              {k:'sat', l:'SpO2 *',u:'%',   warn:v=>parseFloat(v)<95},
              {k:'temp',l:'T° *',  u:'°C',  warn:v=>parseFloat(v)<36||parseFloat(v)>38.4},
              {k:'tas', l:'TAS',   u:'mmHg',warn:v=>parseFloat(v)<90||parseFloat(v)>160},
              {k:'tad', l:'TAD',   u:'mmHg',warn:v=>false},
              {k:'poids',l:'Poids',u:'kg',  warn:()=>false},
            ].map(({k,l,u,warn})=>(
              <div key={k}>
                <label style={lbl}>{l}</label>
                <div style={{position:'relative'}}>
                  <input value={f[k]} onChange={e=>set(k,e.target.value)} type={k==='poids'?'number':'text'} inputMode="decimal"
                    style={{...inp,paddingRight:32,borderColor:f[k]&&warn(f[k])?'#ef4444':'#e5e7eb',color:f[k]&&warn(f[k])?'#dc2626':'#111827'}}
                    placeholder="--"/>
                  <span style={{position:'absolute',right:8,top:'50%',transform:'translateY(-50%)',fontSize:10,color:'#9ca3af'}}>{u}</span>
                </div>
              </div>
            ))}
          </div>
          {pam!==null&&<div style={{fontSize:12,color:'#6b7280'}}>PAM : <strong style={{color:pam<65?'#dc2626':'#374151'}}>{pam} mmHg</strong>{pam<65&&' — ⚠️ choc'}</div>}
          {urgenceVitale&&<div style={{marginTop:8,padding:'8px 12px',background:'#7f1d1d',borderRadius:8,color:'#fff',fontWeight:700,fontSize:13}}>
            ⚠️ CONSTANTES CRITIQUES — Prévenir médecin EN URGENCE
          </div>}
          {alerteConst&&<div style={{marginTop:8,padding:'8px 12px',background:'#fef2f2',borderRadius:8,color:'#dc2626',fontWeight:700,fontSize:13,border:'1px solid #fecaca'}}>
            ⚠️ Constantes anormales — Prévenir médecin, ne pas faire patienter dehors
          </div>}
        </div>

        {/* MOTIF */}
        <div style={card}>
          <div style={{fontWeight:700,fontSize:14,color:'#111827',marginBottom:12}}>🏥 Motif *</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
            {[
              {id:'coma',          l:'Trouble conscience', ic:'🚨'},
              {id:'avc',           l:'Paralysie / AVC',    ic:'🧠'},
              {id:'detresse_respi',l:'Difficulté respi.',  ic:'😮'},
              {id:'plaie',         l:'Plaie',              ic:'🩹'},
              {id:'fievre',        l:'Fièvre',             ic:'🌡️'},
              {id:'vertige',       l:'Vertige / Malaise',  ic:'💫'},
              {id:'douleur',       l:'Douleur',            ic:'😣'},
              {id:'autre',         l:'Autre',              ic:'❓'},
            ].map(s=>(
              <Btn key={s.id} onClick={()=>set('symptome',s.id)}
                style={{padding:'12px',borderRadius:8,fontWeight:600,fontSize:13,textAlign:'left',
                  background:f.symptome===s.id?'#0d9488':'#f9fafb',
                  color:f.symptome===s.id?'#fff':'#374151',
                  border:'2px solid '+(f.symptome===s.id?'#0d9488':'#e5e7eb')}}>
                {s.ic} {s.l}
              </Btn>
            ))}
          </div>
        </div>

        {/* QUESTIONS PAR MOTIF */}

        {/* COMA */}
        {f.symptome==='coma'&&(
          <div style={card}>
            <label style={lbl}>Le patient respire ? *</label>
            <div style={{display:'flex',gap:8}}>
              <Btn onClick={()=>set('respire',true)}  style={pStyle(f.respire===true, '#16a34a')}>✓ Oui</Btn>
              <Btn onClick={()=>set('respire',false)} style={pStyle(f.respire===false,'#ef4444')}>✗ Non — Arrêt cardiaque</Btn>
            </div>
            {f.respire===false&&<div style={{marginTop:8,padding:'10px 12px',background:'#7f1d1d',borderRadius:8,color:'#fff',fontWeight:700,fontSize:13}}>
              🚨 Alerter médecin + IDE — Commencer massage cardiaque — Dextro + Hémocue dès que possible
            </div>}
            {f.respire===true&&(
              <>
                <div style={{padding:'8px 12px',background:'#fef2f2',borderRadius:8,color:'#dc2626',fontWeight:700,fontSize:12,border:'1px solid #fecaca',marginBottom:10}}>
                  Prévenir médecin — Dextro + Hémocue obligatoires
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                  {[{k:'dextro',l:'Dextro *',u:'g/L'},{k:'hemocue',l:'Hémocue *',u:'g/dL'}].map(({k,l,u})=>(
                    <div key={k}>
                      <label style={lbl}>{l}</label>
                      <div style={{position:'relative'}}>
                        <input value={f[k]} onChange={e=>set(k,e.target.value)} inputMode="decimal"
                          style={{...inp,paddingRight:36}} placeholder="--"/>
                        <span style={{position:'absolute',right:8,top:'50%',transform:'translateY(-50%)',fontSize:10,color:'#9ca3af'}}>{u}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* AVC */}
        {f.symptome==='avc'&&(
          <div style={card}>
            <label style={lbl}>Depuis combien de temps ? *</label>
            <div style={{display:'flex',gap:8,marginBottom:8}}>
              <Btn onClick={()=>set('avc_depuis','<4h')} style={pStyle(f.avc_depuis==='<4h','#ef4444')}>Moins de 4h</Btn>
              <Btn onClick={()=>set('avc_depuis','>4h')} style={pStyle(f.avc_depuis==='>4h','#f59e0b')}>Plus de 4h</Btn>
            </div>
            {f.avc_depuis==='<4h'&&<div style={{padding:'10px 12px',background:'#7f1d1d',borderRadius:8,color:'#fff',fontWeight:700,fontSize:13}}>
              🚨 AVC &lt; 4h — Alerter médecin EN URGENCE — Dextro + Hémocue dès que possible
            </div>}
            {f.avc_depuis==='>4h'&&(
              <>
                <div style={{padding:'8px 12px',background:'#fffbeb',borderRadius:8,color:'#d97706',fontWeight:600,fontSize:12,border:'1px solid #fde68a',marginBottom:8}}>
                  Prévenir médecin — Dextro + Hémocue obligatoires
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                  {[{k:'dextro',l:'Dextro',u:'g/L'},{k:'hemocue',l:'Hémocue',u:'g/dL'}].map(({k,l,u})=>(
                    <div key={k}>
                      <label style={lbl}>{l} *</label>
                      <div style={{position:'relative'}}>
                        <input value={f[k]} onChange={e=>set(k,e.target.value)} inputMode="decimal"
                          style={{...inp,paddingRight:36}} placeholder="--"/>
                        <span style={{position:'absolute',right:8,top:'50%',transform:'translateY(-50%)',fontSize:10,color:'#9ca3af'}}>{u}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* DÉTRESSE RESPI */}
        {f.symptome==='detresse_respi'&&(
          <div style={card}>
            <label style={lbl}>Antécédent d'asthme ? *</label>
            <div style={{display:'flex',gap:8,marginBottom:12}}>
              <Btn onClick={()=>set('asthme_connu',true)}  style={pStyle(f.asthme_connu===true)}>Oui — asthmatique connu</Btn>
              <Btn onClick={()=>set('asthme_connu',false)} style={pStyle(f.asthme_connu===false,'#6b7280')}>Non</Btn>
            </div>
            {f.asthme_connu!==null&&(
              <>
                <label style={lbl}>Arrive à parler correctement ? *</label>
                <div style={{display:'flex',gap:8,marginBottom:8}}>
                  <Btn onClick={()=>set('parle_ok',true)}  style={pStyle(f.parle_ok===true,'#16a34a')}>Oui — parle normalement</Btn>
                  <Btn onClick={()=>set('parle_ok',false)} style={pStyle(f.parle_ok===false,'#ef4444')}>Non — difficultés</Btn>
                </div>
                {f.parle_ok===false&&<div style={{padding:'8px 12px',background:'#fef2f2',borderRadius:8,color:'#dc2626',fontWeight:700,fontSize:12,border:'1px solid #fecaca',marginBottom:8}}>
                  {f.asthme_connu?'Alerter médecin — F1 — Oxygène — Nébulisation selon poids — Scopé':'Prévenir médecin — B1/B2 — Oxygène si sat < 95%'}
                </div>}
                {f.parle_ok===true&&<div style={{padding:'8px 12px',background:'#f0fdf4',borderRadius:8,color:'#16a34a',fontWeight:600,fontSize:12,border:'1px solid #bbf7d0',marginBottom:8}}>
                  {f.asthme_connu?'Prévenir médecin — F2 ou L1/L2 — Nébulisation sous air':'L1 ou L2 — Surveillance saturation'}
                </div>}
              </>
            )}
            {age!==null&&age<2&&(
              <div style={{background:'#eff6ff',borderRadius:8,padding:'10px 12px',border:'2px solid #bfdbfe',marginTop:8}}>
                <div style={{color:'#1d4ed8',fontWeight:700,fontSize:12,marginBottom:6}}>🚿 Nourrisson &lt; 2 ans — DRP OBLIGATOIRE</div>
                <div style={{color:'#3b82f6',fontSize:11,marginBottom:8}}>Faire lavage de nez, puis reprendre la saturation</div>
                <Btn onClick={()=>set('drp_fait',!f.drp_fait)}
                  style={{padding:'8px 16px',borderRadius:7,fontSize:12,fontWeight:700,
                    background:f.drp_fait?'#3b82f6':'#fff',color:f.drp_fait?'#fff':'#1d4ed8',
                    border:'2px solid '+(f.drp_fait?'#3b82f6':'#bfdbfe')}}>
                  {f.drp_fait?'✓ DRP réalisé — saturation vérifiée':'DRP réalisé ?'}
                </Btn>
              </div>
            )}
          </div>
        )}

        {/* PLAIE */}
        {f.symptome==='plaie'&&(
          <div style={card}>
            <label style={lbl}>Depuis quand ? *</label>
            <div style={{display:'flex',gap:8,marginBottom:12}}>
              <Btn onClick={()=>set('plaie_depuis','<24h')} style={pStyle(f.plaie_depuis==='<24h')}>Moins de 24h</Btn>
              <Btn onClick={()=>set('plaie_depuis','>24h')} style={pStyle(f.plaie_depuis==='>24h','#6b7280')}>Plus de 24h</Btn>
            </div>
            <label style={lbl}>Carnet vaccinal ? *</label>
            <div style={{display:'flex',gap:8,flexDirection:'column',marginBottom:12}}>
              {[['ok','✓ Présent et lisible','#16a34a'],['illisible','⚠️ Illisible / incomplet','#f59e0b'],['absent','✗ Absent','#ef4444']].map(([v,l,c])=>(
                <Btn key={v} onClick={()=>set('carnet',v)} style={{...pStyle(f.carnet===v,c),textAlign:'left'}}>{l}</Btn>
              ))}
            </div>
            {(f.carnet==='absent'||f.carnet==='illisible')&&(
              <>
                <label style={lbl}>Quick test tétanos *</label>
                <div style={{display:'flex',gap:8}}>
                  <Btn onClick={()=>set('quicktest','pos')} style={pStyle(f.quicktest==='pos','#ef4444')}>Positif</Btn>
                  <Btn onClick={()=>set('quicktest','neg')} style={pStyle(f.quicktest==='neg','#16a34a')}>Négatif → Rappel tétanos auto</Btn>
                </div>
              </>
            )}
          </div>
        )}

        {/* FIÈVRE */}
        {f.symptome==='fievre'&&(
          <div style={card}>
            <label style={lbl}>Depuis quand ? *</label>
            <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:12}}>
              {['<1j','1j','2j','3j','>3j'].map(d=>(
                <Btn key={d} onClick={()=>set('fievre_depuis',d)}
                  style={{padding:'8px 14px',borderRadius:99,fontSize:12,fontWeight:600,
                    background:f.fievre_depuis===d?'#0d9488':'#fff',
                    color:f.fievre_depuis===d?'#fff':'#374151',
                    border:'1px solid '+(f.fievre_depuis===d?'#0d9488':'#e5e7eb')}}>
                  {d}
                </Btn>
              ))}
            </div>
            {['3j','>3j'].includes(f.fievre_depuis)&&(
              <div style={{background:'#fef9f0',borderRadius:8,padding:'10px 12px',border:'1px solid #fde68a'}}>
                <div style={{fontWeight:700,fontSize:12,color:'#d97706',marginBottom:8}}>Fièvre {'>'} 3j — Tests obligatoires *</div>
                {[
                  {k:'crp',       l:'CRP rapide (Actim)', u:'', type:'barres'},
                  {k:'tdr_palu',  l:'TDR Paludisme', u:'',     type:'posneg'},
                  {k:'tdr_dengue',l:'TDR Dengue',    u:'',     type:'posneg'},
                ].map(({k,l,u,type})=>(
                  <div key={k} style={{marginBottom:8}}>
                    <div style={{display:'flex',gap:6,alignItems:'center',marginBottom:4}}>
                      <Btn onClick={()=>set(k+'_fait',!f[k+'_fait'])}
                        style={{padding:'5px 12px',borderRadius:6,fontSize:11,fontWeight:600,
                          background:f[k+'_fait']?'#16a34a':'#fff',color:f[k+'_fait']?'#fff':'#374151',
                          border:'1px solid '+(f[k+'_fait']?'#16a34a':'#e5e7eb')}}>
                        {f[k+'_fait']?'✓ '+l:l}
                      </Btn>
                      <Btn onClick={()=>set(k+'_rupture',!f[k+'_rupture'])}
                        style={{padding:'5px 10px',borderRadius:6,fontSize:10,fontWeight:600,
                          background:f[k+'_rupture']?'#6b7280':'#f3f4f6',color:f[k+'_rupture']?'#fff':'#6b7280',
                          border:'1px solid '+(f[k+'_rupture']?'#6b7280':'#e5e7eb')}}>
                        {f[k+'_rupture']?'✓ Rupture':'Rupture de stock'}
                      </Btn>
                    </div>
                    {f[k+'_fait']&&(
                      type==='barres'
                        ? <div style={{paddingLeft:4}}>
                            <div style={{fontSize:10,color:'#6b7280',marginBottom:4}}>Nombre de barres :</div>
                            <div style={{display:'flex',gap:4}}>
                              {['1 barre (<10mg/L)','2 barres (10-40mg/L)','3 barres (40-80mg/L)','4 barres (>80mg/L)'].map((r,i)=>(
                                <Btn key={r} onClick={()=>set(k+'_resultat',r)}
                                  style={{padding:'4px 8px',borderRadius:6,fontSize:10,fontWeight:600,
                                    background:f[k+'_resultat']===r?(i===0?'#16a34a':i===1?'#f59e0b':'#ef4444'):'#fff',
                                    color:f[k+'_resultat']===r?'#fff':'#374151',
                                    border:'1px solid '+(f[k+'_resultat']===r?(i===0?'#16a34a':i===1?'#f59e0b':'#ef4444'):'#e5e7eb')}}>
                                  {'▌'.repeat(i+1)}
                                </Btn>
                              ))}
                            </div>
                            {f[k+'_resultat']&&<div style={{fontSize:10,color:'#6b7280',marginTop:3}}>{f[k+'_resultat']}</div>}
                          </div>
                        : type==='nombre'
                        ? <div style={{display:'flex',alignItems:'center',gap:6,paddingLeft:4}}>
                            <input value={f[k+'_resultat']||''} onChange={e=>set(k+'_resultat',e.target.value)} inputMode="decimal"
                              style={{width:80,padding:'4px 8px',borderRadius:6,border:'1.5px solid #16a34a',fontSize:12,outline:'none',textAlign:'center'}}
                              placeholder="--"/>
                            <span style={{fontSize:11,color:'#6b7280'}}>{u}</span>
                          </div>
                        : <div style={{display:'flex',gap:6,paddingLeft:4}}>
                            {['Positif','Négatif'].map(r=>(
                              <Btn key={r} onClick={()=>set(k+'_resultat',r)}
                                style={{padding:'4px 12px',borderRadius:6,fontSize:11,fontWeight:600,
                                  background:f[k+'_resultat']===r?(r==='Positif'?'#ef4444':'#16a34a'):'#fff',
                                  color:f[k+'_resultat']===r?'#fff':'#374151',
                                  border:'1px solid '+(f[k+'_resultat']===r?(r==='Positif'?'#ef4444':'#16a34a'):'#e5e7eb')}}>
                                {r}
                              </Btn>
                            ))}
                          </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* VERTIGE */}
        {f.symptome==='vertige'&&(
          <div style={card}>
            <div style={{fontWeight:600,fontSize:13,color:'#374151',marginBottom:10}}>Dextro et Hémocue obligatoires</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              {[{k:'dextro',l:'Dextro *',u:'g/L'},{k:'hemocue',l:'Hémocue *',u:'g/dL'}].map(({k,l,u})=>(
                <div key={k}>
                  <label style={lbl}>{l}</label>
                  <div style={{position:'relative'}}>
                    <input value={f[k]} onChange={e=>set(k,e.target.value)} inputMode="decimal"
                      style={{...inp,paddingRight:36}} placeholder="--"/>
                    <span style={{position:'absolute',right:8,top:'50%',transform:'translateY(-50%)',fontSize:10,color:'#9ca3af'}}>{u}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* DOULEUR */}
        {f.symptome==='douleur'&&(
          <div style={card}>
            <label style={lbl}>Localisation de la douleur * (plusieurs choix)</label>
            <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:12}}>
              {ZONES_DOULEUR.map(z=>(
                <Btn key={z.id} onClick={()=>toggleZone(z.id)}
                  style={{padding:'6px 12px',borderRadius:99,fontSize:12,fontWeight:600,
                    background:f.douleur_zones.includes(z.id)?'#0d9488':'#f9fafb',
                    color:f.douleur_zones.includes(z.id)?'#fff':'#374151',
                    border:'1.5px solid '+(f.douleur_zones.includes(z.id)?'#0d9488':'#e5e7eb')}}>
                  {z.l}
                </Btn>
              ))}
            </div>
            {f.sexe==='F'&&f.douleur_zones.includes('abdomen')&&(
              <div style={{background:'#fdf4ff',borderRadius:8,padding:'10px 12px',border:'1px solid #e9d5ff',marginBottom:8}}>
                <div style={{color:'#7c3aed',fontWeight:700,fontSize:12,marginBottom:8}}>Femme + douleur abdominale — BU et bHCG urinaire obligatoires</div>
                <div style={{display:'flex',gap:6}}>
                  {[{k:'bu_fait',l:'BU'},{k:'bhcg_fait',l:'bHCG urinaire'}].map(({k,l})=>(
                    <Btn key={k} onClick={()=>set(k,!f[k])}
                      style={{padding:'5px 12px',borderRadius:6,fontSize:11,fontWeight:600,
                        background:f[k]?'#7c3aed':'#fff',color:f[k]?'#fff':'#7c3aed',
                        border:'1px solid '+(f[k]?'#7c3aed':'#e9d5ff')}}>
                      {f[k]?'✓ '+l:l}
                    </Btn>
                  ))}
                </div>
              </div>
            )}
            {f.douleur_zones.includes('thorax')&&(
              <div style={{background:'#fef2f2',borderRadius:8,padding:'10px 12px',border:'1px solid #fecaca',marginBottom:8}}>
                <div style={{color:'#dc2626',fontWeight:700,fontSize:12,marginBottom:8}}>ECG obligatoire — Prévenir médecin</div>
                <Btn onClick={()=>set('ecg_fait',!f.ecg_fait)}
                  style={{padding:'6px 14px',borderRadius:6,fontSize:12,fontWeight:600,
                    background:f.ecg_fait?'#16a34a':'#fff',color:f.ecg_fait?'#fff':'#374151',
                    border:'1px solid '+(f.ecg_fait?'#16a34a':'#e5e7eb')}}>
                  {f.ecg_fait?'✓ ECG réalisé':'ECG réalisé ?'}
                </Btn>
              </div>
            )}
            {f.douleur_zones.includes('tete')&&(
              <div style={{background:'#fffbeb',borderRadius:8,padding:'10px 12px',border:'1px solid #fde68a',marginBottom:8}}>
                <label style={{...lbl,marginBottom:6}}>Vomissements ? *</label>
                <div style={{display:'flex',gap:8,marginBottom:8}}>
                  <Btn onClick={()=>set('vomissement',true)}  style={pStyle(f.vomissement===true,'#ef4444')}>Oui</Btn>
                  <Btn onClick={()=>set('vomissement',false)} style={pStyle(f.vomissement===false,'#16a34a')}>Non</Btn>
                </div>
                <label style={{...lbl,marginBottom:6}}>Nouvelle tache sur la peau ? *</label>
                <div style={{display:'flex',gap:8}}>
                  <Btn onClick={()=>set('tache_peau',true)}  style={pStyle(f.tache_peau===true,'#ef4444')}>Oui</Btn>
                  <Btn onClick={()=>set('tache_peau',false)} style={pStyle(f.tache_peau===false,'#16a34a')}>Non</Btn>
                </div>
                {(f.vomissement===true||f.tache_peau===true)&&<div style={{marginTop:8,padding:'8px 12px',background:'#7f1d1d',borderRadius:8,color:'#fff',fontWeight:700,fontSize:12}}>
                  🚨 Alerter médecin immédiatement
                </div>}
              </div>
            )}
          </div>
        )}

        {/* PLACEMENT SUGGÉRÉ */}
        {placement&&(
          <div style={{...card,border:'2px solid '+(placement.urgence?'#ef4444':'#0d9488'),background:placement.urgence?'#fef2f2':'#f0fdfa'}}>
            <div style={{fontWeight:800,fontSize:15,color:placement.urgence?'#dc2626':'#0d9488',marginBottom:4}}>
              {placement.urgence?'🚨':'✓'} Placement suggéré : {placement.label}
            </div>
            {placement.msg&&<div style={{fontSize:13,color:placement.urgence?'#991b1b':'#065f46'}}>{placement.msg}</div>}
          </div>
        )}

        {/* BOUTONS ENREGISTRER */}
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          <Btn onClick={enregistrer} disabled={!canSubmit||saving}
            style={{width:'100%',padding:'14px',borderRadius:12,fontSize:15,fontWeight:700,
              background:canSubmit?'#0d9488':'#e5e7eb',color:canSubmit?'#fff':'#9ca3af',border:'none'}}>
            {saving?'Enregistrement...':`Enregistrer le patient${placement?' → '+placement.label:''}`}
          </Btn>
          {canSubmit&&!saving&&(
            showAutreEmplacement
              ? <div style={{background:'#fff',borderRadius:12,border:'1.5px solid #e5e7eb',padding:'12px'}}>
                  <div style={{fontSize:12,fontWeight:700,color:'#6b7280',marginBottom:8}}>Choisir un autre emplacement :</div>
                  <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                    {EMPLACEMENTS.filter(e=>e.id!=='dehors').map(e=>{
                      const libre = !occupees.includes(e.id);
                      return (
                        <Btn key={e.id} onClick={()=>{
                          if(!libre) return;
                          const p2 = {place:e.id, label:e.l, urgence:false, msg:''};
                          enregistrerAvec(p2);
                        }}
                          style={{padding:'8px 14px',borderRadius:8,fontSize:12,fontWeight:600,
                            background:libre?e.c:'#e5e7eb',color:libre?'#fff':'#9ca3af',
                            border:'none',opacity:libre?1:0.5,cursor:libre?'pointer':'not-allowed'}}>
                          {e.l} {libre?'':'(occupé)'}
                        </Btn>
                      );
                    })}
                    <Btn onClick={()=>setShowAutreEmplacement(false)}
                      style={{padding:'8px 12px',borderRadius:8,fontSize:12,fontWeight:600,
                        background:'#f3f4f6',color:'#6b7280',border:'1px solid #e5e7eb'}}>
                      Annuler
                    </Btn>
                  </div>
                </div>
              : <Btn onClick={()=>setShowAutreEmplacement(true)}
                  style={{width:'100%',padding:'12px',borderRadius:12,fontSize:13,fontWeight:600,
                    background:'#fff',color:'#6b7280',border:'1.5px solid #e5e7eb'}}>
                  Enregistrer sur un autre emplacement
                </Btn>
          )}
        </div>

      </div>
    </div>
  );
}
