'use client';
import { useState, useEffect, memo } from 'react';

function calcAge(ddn) {
  if (!ddn) return null;
  const parts = ddn.split('/');
  if (parts.length !== 3) return null;
  const d = new Date(parts[2]+'-'+parts[1]+'-'+parts[0]);
  if (isNaN(d)) return null;
  return Math.floor((Date.now()-d.getTime())/(365.25*24*3600*1000));
}

function ddnToISO(ddn) {
  const p = (ddn||'').split('/');
  return p.length===3 ? p[2]+'-'+p[1]+'-'+p[0] : ddn;
}

const Btn = memo(function Btn({onClick,style,disabled,children}) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{...style,cursor:disabled?'not-allowed':'pointer',opacity:disabled?0.5:1}}
      onMouseEnter={e=>{if(!disabled)e.currentTarget.style.filter='brightness(0.88)';}}
      onMouseLeave={e=>{e.currentTarget.style.filter='none';}}>
      {children}
    </button>
  );
});

const lbl = {fontSize:11,fontWeight:700,color:'#6b7280',display:'block',marginBottom:4,textTransform:'uppercase',letterSpacing:0.4};
const inp = {width:'100%',padding:'10px 12px',borderRadius:8,border:'1.5px solid #e5e7eb',fontSize:14,outline:'none',boxSizing:'border-box',background:'#fff'};
const card = {background:'#fff',borderRadius:12,border:'1px solid #e5e7eb',padding:'1rem 1.25rem',marginBottom:12};

const EMPLACEMENTS = [
  {id:'brancard1',l:'Brancard 1',c:'#ef4444'},{id:'brancard2',l:'Brancard 2',c:'#ef4444'},
  {id:'fauteuil1',l:'Fauteuil 1',c:'#16a34a'},{id:'fauteuil2',l:'Fauteuil 2',c:'#16a34a'},
  {id:'obs1',l:'Observation 1',c:'#3b82f6'},{id:'obs2',l:'Observation 2',c:'#3b82f6'},
  {id:'lit1',l:'Lit 1',c:'#3b82f6'},{id:'lit2',l:'Lit 2',c:'#3b82f6'},
  {id:'pansement',l:'Pansement',c:'#f59e0b'},{id:'dehors',l:'Dehors',c:'#9ca3af'},
];

function prefPlace(pref, occ) {
  for (const id of pref) { if (!occ.includes(id)) return id; }
  return pref[pref.length-1];
}

function BtnOuiNon({valeur,onChange,labelOui,labelNon,couleurOui,couleurNon}) {
  const co = couleurOui||'#16a34a';
  const cn = couleurNon||'#ef4444';
  return (
    <div style={{display:'flex',gap:8}}>
      <Btn onClick={()=>onChange(true)} style={{flex:1,padding:'10px',borderRadius:8,fontWeight:600,fontSize:13,background:valeur===true?co:'#fff',color:valeur===true?'#fff':'#374151',border:'2px solid '+(valeur===true?co:'#e5e7eb')}}>
        {labelOui||'Oui'}
      </Btn>
      <Btn onClick={()=>onChange(false)} style={{flex:1,padding:'10px',borderRadius:8,fontWeight:600,fontSize:13,background:valeur===false?cn:'#fff',color:valeur===false?'#fff':'#374151',border:'2px solid '+(valeur===false?cn:'#e5e7eb')}}>
        {labelNon||'Non'}
      </Btn>
    </div>
  );
}

function AlerteBox({couleur,texte}) {
  const bg = couleur==='rouge'?'#7f1d1d':couleur==='orange'?'#fffbeb':'#fef2f2';
  const cl = couleur==='rouge'?'#fff':couleur==='orange'?'#d97706':'#dc2626';
  const bo = couleur==='rouge'?'none':couleur==='orange'?'1px solid #fde68a':'1px solid #fecaca';
  return <div style={{padding:'8px 12px',background:bg,borderRadius:8,color:cl,fontWeight:700,fontSize:12,border:bo,marginTop:8}}>{texte}</div>;
}

export default function NouveauPatient() {
  const [user, setUser] = useState(null);
  const [occupees, setOccupees] = useState([]);
  const [saving, setSaving] = useState(false);
  const [showAutreEmplacement, setShowAutreEmplacement] = useState(false);

  const [f, setF] = useState({
    sexe:'', nom:'', prenom:'', ddn:'', age:'', ipp:'',
    fc:'', sat:'', temp:'', tas:'', tad:'', poids:'', taille:'',
    symptome:'',
    respire:null, dextro:'', hemocue:'',
    avc_depuis:null,
    asthme_connu:null, parle_ok:null, drp_fait:false,
    carnet:'', quicktest:'', plaie_depuis:null,
    fievre_depuis:'',
    crp_fait:false, crp_rupture:false, crp_resultat:'',
    tdr_palu_fait:false, tdr_palu_rupture:false, tdr_palu_resultat:'',
    tdr_dengue_fait:false, tdr_dengue_rupture:false, tdr_dengue_resultat:'',
    douleur_zones:[], ecg_fait:false,
    vomissement:null, tache_peau:null,
    bu_fait:false, bhcg_fait:false, bhcg_pas_regles:false,
    autre_motif:'', douleur_autre:'', soins_type:'',
  });

  const set = (k,v) => setF(prev=>({...prev,[k]:v}));
  const toggleZone = id => set('douleur_zones', f.douleur_zones.includes(id) ? f.douleur_zones.filter(z=>z!==id) : [...f.douleur_zones,id]);

  useEffect(() => {
    const s = sessionStorage.getItem('pds_user');
    if (!s) { window.location.href='/login'; return; }
    setUser(JSON.parse(s));
    fetch('/api/patients').then(r=>r.json()).then(d=>{
      setOccupees((d.patients||[]).filter(p=>p.emplacement).map(p=>p.emplacement));
    }).catch(()=>{});
  }, []);

  const age = f.age ? parseFloat(f.age) : null;
  const adulte = age===null || age>=15;
  const fc = parseFloat(f.fc);
  const sat = parseFloat(f.sat);
  const tas = parseFloat(f.tas);
  const tad = parseFloat(f.tad);
  const pam = f.tas&&f.tad ? Math.round(tad+(tas-tad)/3) : null;
  const fcMax = !age?100:age<(1/12)?180:age<1?160:age<2?150:age<5?140:age<12?130:120;
  const fcMin = !age?60:age<(1/12)?100:age<1?100:age<2?90:age<5?80:age<12?70:60;

  const fcCrit  = !isNaN(fc)  && (fc>fcMax||fc<fcMin);
  const satCrit = !isNaN(sat) && sat<90;
  const pamCrit = pam!==null  && pam<65;
  const satAlt  = !isNaN(sat) && sat<95 && sat>=90;
  const fcAlt   = !isNaN(fc)  && (adulte?fc>120:fc>fcMax*0.9);
  const tasAlt  = !isNaN(tas) && tas>200;
  const urgence = fcCrit||satCrit||pamCrit;
  const alerte  = !urgence&&(satAlt||fcAlt||tasAlt);

  function getPlacement() {
    const s = f.symptome;
    const B = prefPlace(['brancard1','brancard2'], occupees);
    const Blabel = B==='brancard1'?'Brancard 1':'Brancard 2';
    const heure = new Date().getHours();
    if (urgence) return {place:B, label:Blabel, urgence:true, msg:'Constantes critiques — Prevenir médecin EN URGENCE'};
    if (alerte)  return {place:B, label:Blabel, urgence:true, msg:'Constantes anormales — Prevenir médecin immédiatement'};
    if (s==='coma') {
      if (f.respire===false) return {place:B, label:Blabel, urgence:true, msg:'Alerter médecin + IDE — Massage cardiaque — Dextro + Hémocue dès que possible'};
      if (f.respire===true)  return {place:B, label:Blabel, urgence:true, msg:'Prevenir médecin — Dextro + Hémocue obligatoires'};
      return null;
    }
    if (s==='avc') {
      if (f.avc_depuis==='<4h') return {place:B, label:Blabel, urgence:true, msg:'AVC < 4h — Alerter médecin EN URGENCE — Brancard 1 — ECG + Dextro obligatoires'};
      if (f.avc_depuis==='>4h') return {place:prefPlace(['lit1','lit2','brancard2'],occupees), label:'Lit 1 (ou Lit 2, Brancard 2)', urgence:false, msg:'Avertir médecin — Lit 1 ou 2 — ECG + Dextro obligatoires'};
      return null;
    }
    if (s==='detresse_respi') {
      if (f.asthme_connu===true) {
        if (f.parle_ok===false) return {place:prefPlace(['fauteuil1'],occupees), label:'Fauteuil 1', urgence:true, msg:'Alerter médecin — Oxygène — Nébulisation selon poids — Scopé'};
        if (f.parle_ok===true)  return {place:prefPlace(['obs1','obs2'],occupees), label:'Observation 1', urgence:false, msg:'Nebulisation sous air selon poids — ETP asthme TV'};
      }
      if (f.asthme_connu===false) {
        if (f.parle_ok===false) return {place:B, label:Blabel, urgence:true, msg:'Prevenir médecin — Oxygène si sat < 95%'};
        if (f.parle_ok===true)  return {place:prefPlace(['lit1','lit2'],occupees), label:'Lit 1 (ou Lit 2)', urgence:false, msg:'Surveillance saturation'};
      }
      return null;
    }
    if (s==='plaie') {
      const p1ok = heure>=19||heure<6;
      if (f.plaie_depuis==='>24h') return {place:'dehors', label:'Dehors', urgence:false, msg:'Plaie ancienne — Faire patienter'};
      const b1libre = !occupees.includes('brancard1');
      const b2libre = !occupees.includes('brancard2');
      // B1 libre : B2 disponible pour plaie (déchocage non saturé)
      if (b1libre) return {place:'brancard2', label:'Brancard 2', urgence:false, msg:'Plaie recente — Brancard 2'};
      // B1 occupé : ne pas utiliser B2 (garder le déchocage disponible)
      if (p1ok) return {place:'pansement', label:'Pansement', urgence:false, msg:'Brancard 1 occupé — Salle de pansement (nuit)'};
      const obs = prefPlace(['obs1','obs2'], occupees);
      return {place:obs, label:obs==='obs1'?'Observation 1':'Observation 2', urgence:false, msg:'Brancard 1 occupé — En observation en attendant libération'};
    }
    if (s==='fievre') {
      const ancienne = ['3j','>3j'].includes(f.fievre_depuis);
      if (ancienne) return {place:prefPlace(['lit1','lit2','fauteuil2'],occupees), label:'Lit 1 (ou Lit 2, Fauteuil 2)', urgence:false, msg:'Fievre > 3j — Installer en salle'};
      if (s==='soins_ide') return {place:'dehors', label:'Dehors', urgence:false, msg:'File attente soins IDE'};
    return {place:'dehors', label:'Dehors', urgence:false, msg:'Faire patienter'};
    }
    if (s==='vertige') return {place:prefPlace(['lit1','lit2','brancard2','brancard1'],occupees), label:'Lit 1 (ou Lit 2, Brancard 2)', urgence:false, msg:'Allonger le patient'};
    if (s==='douleur') {
      const z = f.douleur_zones;
      if (z.includes('thorax')) return {place:B, label:Blabel, urgence:true, msg:'ECG obligatoire — Prevenir médecin'};
      if (z.includes('tete')&&(f.vomissement===true||f.tache_peau===true)) return {place:B, label:Blabel, urgence:true, msg:'Alerter médecin immédiatement'};
      if (z.includes('tete')) return {place:prefPlace(['lit1','lit2'],occupees), label:'Lit 1 (ou Lit 2)', urgence:false, msg:'Surveiller'};
      if (f.sexe==='F'&&z.includes('abdomen')) return {place:prefPlace(['lit1','lit2','brancard2'],occupees), label:'Lit 1 (ou Lit 2, Brancard 2)', urgence:false, msg:'BU + bHCG — Prevenir médecin'};
      return {place:'dehors', label:'Dehors', urgence:false, msg:'Constantes normales — Faire patienter'};
    }
    return {place:'dehors', label:'Dehors', urgence:false, msg:'Faire patienter'};
  }

  const placement = (f.symptome&&f.fc&&f.sat&&f.temp) ? getPlacement() : null;

  const canSubmit = (()=>{
    const s = f.symptome;
    if (!f.sexe||!f.nom||!s) return false;
    if (!f.fc||!f.sat||!f.temp) { if (s!=='soins_ide') return false; }
    if (s==='coma') { if (f.respire===null) return false; if (f.respire===true) return !!(f.dextro&&f.hemocue); return true; }
    if (s==='avc') { if (!f.avc_depuis) return false; return !!(f.dextro && f.ecg_fait); }
    if (s==='detresse_respi') { if (f.asthme_connu===null||f.parle_ok===null) return false; if (age!==null&&age<2&&!f.drp_fait) return false; return true; }
    if (s==='plaie') { if (!f.plaie_depuis||!f.carnet) return false; if ((f.carnet==='absent'||f.carnet==='illisible')&&!f.quicktest) return false; return true; }
    if (s==='fievre') {
      if (!f.fievre_depuis) return false;
      if (['3j','>3j'].includes(f.fievre_depuis)) return (f.crp_fait||f.crp_rupture)&&(f.tdr_palu_fait||f.tdr_palu_rupture)&&(f.tdr_dengue_fait||f.tdr_dengue_rupture);
      return true;
    }
    if (s==='soins_ide') return !!f.soins_type;
    if (s==='vertige') return !!(f.dextro&&f.hemocue);
    if (s==='douleur') {
      if (!f.douleur_zones.length) return false;
      if (f.douleur_zones.includes('thorax')&&!f.ecg_fait) return false;
      if (f.douleur_zones.includes('tete')&&(f.vomissement===null||f.tache_peau===null)) return false;
      if (f.sexe==='F'&&f.douleur_zones.includes('abdomen')&&(!f.bu_fait||(!f.bhcg_fait&&!f.bhcg_pas_regles))) return false;
      return true;
    }
    return true;
  })();

  async function enregistrer(pl_force) {
    if (!canSubmit||saving) return;
    setSaving(true);
    const pl = pl_force||placement||{place:'dehors'};
    const rxAuto = [];
    if (f.symptome==='plaie'&&(f.carnet==='absent'||f.carnet==='illisible')&&f.quicktest==='neg') {
      rxAuto.push({texte:'Rappel vaccin antiTetanique SC',categorie:'therapeutique',fait:false,nonRealise:false,ts:Date.now(),par:'',parNom:'Auto'});
    }
    // Asthme modéré — prescription nébulisation retirée de l'automatisation
    // (risque de confusion si consultation pour OAP chez un patient au terrain asthmatique)
    // À prescrire manuellement par le médecin après examen clinique.
    const patient = {
      sexe:f.sexe, nom:f.nom, prenom:f.prenom, ddn:ddnToISO(f.ddn), age:String(calcAge(f.ddn)??f.age??''), ipp:f.ipp,
      fc:f.fc, sat:f.sat, temp:f.temp, tas:f.tas, tad:f.tad, pam:pam?String(pam):'',
      poids:f.poids, taille:f.taille, symptome:f.symptome,
      respire:f.respire!==null?String(f.respire):'',
      avc_depuis:f.avc_depuis||'',
      asthme_connu:f.asthme_connu!==null?String(f.asthme_connu):'',
      parle_ok:f.parle_ok!==null?String(f.parle_ok):'',
      plaie_depuis:f.plaie_depuis||'', plaie_vaccin:f.carnet, quicktest:f.quicktest,
      fievre_depuis:f.fievre_depuis, dextro:f.dextro, hemocue:f.hemocue,
      douleur_zones:JSON.stringify(f.douleur_zones), ecg_fait:f.ecg_fait,
      vomissement:f.vomissement!==null?String(f.vomissement):'',
      tache_peau:f.tache_peau!==null?String(f.tache_peau):'',
      drp_fait:f.drp_fait, autre_motif:f.autre_motif, douleur_autre:f.douleur_autre, soins_type:f.soins_type,
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

  const ZONES_DOULEUR = [
    {id:'tete',l:'Tete'},{id:'cou',l:'Cou'},{id:'thorax',l:'Thorax/Poitrine'},
    {id:'abdomen',l:'Abdomen'},{id:'dos',l:'Dos'},{id:'bras_d',l:'Bras D'},
    {id:'bras_g',l:'Bras G'},{id:'jambe_d',l:'Jambe D'},{id:'jambe_g',l:'Jambe G'},
    {id:'autre',l:'Autre'},
  ];

  const pSt = (active,col) => ({
    flex:1,padding:'10px',borderRadius:8,fontWeight:600,fontSize:13,
    background:active?(col||'#0d9488'):'#fff',
    color:active?'#fff':'#374151',
    border:'2px solid '+(active?(col||'#0d9488'):'#e5e7eb'),
  });

  const TESTS_FIEVRE = [
    {k:'crp',l:'CRP rapide (Actim)',type:'barres'},
    {k:'tdr_palu',l:'TDR Paludisme',type:'posneg'},
    {k:'tdr_dengue',l:'TDR Dengue',type:'posneg'},
  ];

  return (
    <div style={{minHeight:'100vh',background:'#f3f4f6',fontFamily:'system-ui'}}>
      <div style={{maxWidth:680,margin:'0 auto',padding:'1.5rem 1rem 5rem'}}>

        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
          <h2 style={{fontSize:18,fontWeight:700,color:'#111827',margin:0}}>Nouveau patient</h2>
          <Btn onClick={()=>window.location.href='/vueglobale'} style={{padding:'8px 16px',borderRadius:8,background:'#f3f4f6',color:'#6b7280',fontSize:13,border:'1px solid #e5e7eb'}}>Annuler</Btn>
        </div>

        <div style={card}>
          <div style={{fontWeight:700,fontSize:14,color:'#111827',marginBottom:12}}>Identite</div>
          <div style={{display:'flex',gap:8,marginBottom:12}}>
            <Btn onClick={()=>set('sexe','M')} style={pSt(f.sexe==='M','#3b82f6')}>Homme</Btn>
            <Btn onClick={()=>set('sexe','F')} style={pSt(f.sexe==='F','#ec4899')}>Femme</Btn>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
            <div>
              <label style={lbl}>Nom *</label>
              <input value={f.nom} onChange={e=>set('nom',e.target.value.toUpperCase())} style={inp} placeholder="NOM" autoComplete="off"/>
            </div>
            <div>
              <label style={lbl}>Prenom</label>
              <input value={f.prenom} onChange={e=>{const v=e.target.value;set('prenom',v.charAt(0).toUpperCase()+v.slice(1).toLowerCase());}} style={inp} placeholder="Prenom" autoComplete="off"/>
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:10}}>
            <div>
              <label style={lbl}>DDN</label>
              <input value={f.ddn} onChange={e=>{
                const raw=e.target.value.replace(/[^0-9]/g,'');
                let v=raw;
                if(v.length>2) v=v.slice(0,2)+'/'+v.slice(2);
                if(v.length>5) v=v.slice(0,5)+'/'+v.slice(5);
                if(v.length>10) v=v.slice(0,10);
                set('ddn',v);
                if(v.length===10){const a=calcAge(v);if(a!==null)set('age',String(a));}
              }} style={inp} placeholder="JJ/MM/AAAA" maxLength={10} inputMode="numeric"/>
            </div>
            <div>
              <label style={lbl}>Age</label>
              <input value={f.age} onChange={e=>set('age',e.target.value)} style={inp} placeholder="ans" type="number"/>
            </div>
            <div>
              <label style={lbl}>IPP</label>
              <input value={f.ipp} onChange={e=>set('ipp',e.target.value)} style={inp} placeholder="IPP"/>
            </div>
          </div>
        </div>

        <div style={card}>
          <div style={{fontWeight:700,fontSize:14,color:'#111827',marginBottom:12}}>Constantes *</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:8}}>
            {[
              {k:'fc',l:'FC *',u:'bpm',warn:(v)=>parseFloat(v)<fcMin||parseFloat(v)>fcMax},
              {k:'sat',l:'SpO2 *',u:'%',warn:(v)=>parseFloat(v)<95},
              {k:'temp',l:'T° *',u:'°C',warn:(v)=>parseFloat(v)<36||parseFloat(v)>38.4},
              {k:'tas',l:'TAS',u:'mmHg',warn:(v)=>parseFloat(v)<90||parseFloat(v)>160},
              {k:'tad',l:'TAD',u:'mmHg',warn:()=>false},
              {k:'poids',l:'Poids',u:'kg',warn:()=>false},
            ].map(function(item) {
              const k=item.k; const l=item.l; const u=item.u; const warn=item.warn;
              return (
                <div key={k}>
                  <label style={lbl}>{l}</label>
                  <div style={{position:'relative'}}>
                    <input value={f[k]} onChange={e=>set(k,e.target.value)} inputMode="decimal"
                      style={{...inp,paddingRight:32,borderColor:f[k]&&warn(f[k])?'#ef4444':'#e5e7eb',color:f[k]&&warn(f[k])?'#dc2626':'#111827'}}
                      placeholder="--"/>
                    <span style={{position:'absolute',right:8,top:'50%',transform:'translateY(-50%)',fontSize:10,color:'#9ca3af'}}>{u}</span>
                  </div>
                </div>
              );
            })}
          </div>
          {pam!==null && <div style={{fontSize:12,color:'#6b7280'}}>PAM: <strong style={{color:pam<65?'#dc2626':'#374151'}}>{pam} mmHg</strong>{pam<65?' — choc':''}</div>}
          {urgence && <AlerteBox couleur="rouge" texte="CONSTANTES CRITIQUES — Prevenir médecin EN URGENCE"/>}
          {alerte  && <AlerteBox couleur="orange" texte="Constantes anormales — Prevenir médecin immédiatement"/>}
        </div>

        <div style={card}>
          <div style={{fontWeight:700,fontSize:14,color:'#111827',marginBottom:12}}>Motif *</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
            {[
              {id:'coma',l:'Trouble de la conscience'},
              {id:'avc',l:'Paralysie / Suspicion AVC'},
              {id:'detresse_respi',l:'Difficulte respiratoire'},
              {id:'plaie',l:'Plaie'},
              {id:'fievre',l:'Fievre'},
              {id:'vertige',l:'Vertige / Malaise'},
              {id:'douleur',l:'Douleur'},
              {id:'soins_ide',l:'Soins infirmiers'},
              {id:'autre',l:'Autre'},
            ].map(function(s) {
              return (
                <Btn key={s.id} onClick={()=>set('symptome',s.id)}
                  style={{padding:'12px',borderRadius:8,fontWeight:600,fontSize:13,textAlign:'left',
                    background:f.symptome===s.id?'#0d9488':'#f9fafb',
                    color:f.symptome===s.id?'#fff':'#374151',
                    border:'2px solid '+(f.symptome===s.id?'#0d9488':'#e5e7eb')}}>
                  {s.l}
                </Btn>
              );
            })}
          </div>
        </div>

        {f.symptome==='coma' && (
          <div style={card}>
            <label style={lbl}>Le patient respire ? *</label>
            <BtnOuiNon valeur={f.respire} onChange={v=>set('respire',v)} labelOui="Oui — respire" labelNon="Non — Arret cardiaque" couleurOui="#16a34a" couleurNon="#ef4444"/>
            {f.respire===false && <AlerteBox couleur="rouge" texte="Alerter médecin + IDE — Massage cardiaque — Dextro + Hemocue des que possible"/>}
            {f.respire===true && (
              <div style={{marginTop:10}}>
                <AlerteBox couleur="orange" texte="Prevenir médecin — Dextro + Hemocue obligatoires"/>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:8}}>
                  {[{k:'dextro',l:'Dextro *',u:'g/L'},{k:'hemocue',l:'Hemocue *',u:'g/dL'}].map(function(item) {
                    return (
                      <div key={item.k}>
                        <label style={lbl}>{item.l}</label>
                        <div style={{position:'relative'}}>
                          <input value={f[item.k]} onChange={e=>set(item.k,e.target.value)} inputMode="decimal" style={{...inp,paddingRight:36}} placeholder="--"/>
                          <span style={{position:'absolute',right:8,top:'50%',transform:'translateY(-50%)',fontSize:10,color:'#9ca3af'}}>{item.u}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {f.symptome==='avc' && (
          <div style={card}>
            <label style={lbl}>Depuis combien de temps ? *</label>
            <div style={{display:'flex',gap:8,marginBottom:8}}>
              <Btn onClick={()=>set('avc_depuis','<4h')} style={pSt(f.avc_depuis==='<4h','#ef4444')}>Moins de 4h</Btn>
              <Btn onClick={()=>set('avc_depuis','>4h')} style={pSt(f.avc_depuis==='>4h','#f59e0b')}>Plus de 4h</Btn>
            </div>
            {f.avc_depuis==='<4h' && (
              <div>
                <AlerteBox couleur="rouge" texte="AVC recent — Alerter médecin EN URGENCE — Brancard 1 — ECG + Dextro obligatoires"/>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:8}}>
                  <div>
                    <label style={lbl}>Dextro *</label>
                    <div style={{position:'relative'}}>
                      <input value={f.dextro} onChange={e=>set('dextro',e.target.value)} inputMode="decimal" style={{...inp,paddingRight:36}} placeholder="--"/>
                      <span style={{position:'absolute',right:8,top:'50%',transform:'translateY(-50%)',fontSize:10,color:'#9ca3af'}}>g/L</span>
                    </div>
                  </div>
                  <div>
                    <label style={lbl}>ECG réalisé *</label>
                    <Btn onClick={()=>set('ecg_fait',!f.ecg_fait)} style={{...pSt(f.ecg_fait,'#ef4444'),width:'100%'}}>
                      {f.ecg_fait?'✓ ECG réalisé':'ECG réalisé ?'}
                    </Btn>
                  </div>
                </div>
              </div>
            )}
            {f.avc_depuis==='>4h' && (
              <div>
                <AlerteBox couleur="orange" texte="Avertir médecin — Lit 1 ou 2 — ECG + Dextro obligatoires"/>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:8}}>
                  <div>
                    <label style={lbl}>Dextro *</label>
                    <div style={{position:'relative'}}>
                      <input value={f.dextro} onChange={e=>set('dextro',e.target.value)} inputMode="decimal" style={{...inp,paddingRight:36}} placeholder="--"/>
                      <span style={{position:'absolute',right:8,top:'50%',transform:'translateY(-50%)',fontSize:10,color:'#9ca3af'}}>g/L</span>
                    </div>
                  </div>
                  <div>
                    <label style={lbl}>ECG réalisé *</label>
                    <Btn onClick={()=>set('ecg_fait',!f.ecg_fait)} style={{...pSt(f.ecg_fait,'#f59e0b'),width:'100%'}}>
                      {f.ecg_fait?'✓ ECG réalisé':'ECG réalisé ?'}
                    </Btn>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {f.symptome==='detresse_respi' && (
          <div style={card}>
            <label style={lbl}>Antecedent d asthme ? *</label>
            <div style={{display:'flex',gap:8,marginBottom:12}}>
              <Btn onClick={()=>set('asthme_connu',true)}  style={pSt(f.asthme_connu===true)}>Oui — asthmatique connu</Btn>
              <Btn onClick={()=>set('asthme_connu',false)} style={pSt(f.asthme_connu===false,'#6b7280')}>Non</Btn>
            </div>
            {f.asthme_connu!==null && (
              <div>
                <label style={lbl}>Arrive a parler correctement ? *</label>
                <div style={{display:'flex',gap:8,marginBottom:8}}>
                  <Btn onClick={()=>set('parle_ok',true)}  style={pSt(f.parle_ok===true,'#16a34a')}>Oui — parle normalement</Btn>
                  <Btn onClick={()=>set('parle_ok',false)} style={pSt(f.parle_ok===false,'#ef4444')}>Non — difficultes</Btn>
                </div>
                {f.parle_ok===false && <AlerteBox couleur="orange" texte={f.asthme_connu?"Alerter médecin — Fauteuil 1 — Oxygène — Nebulisation selon poids":"Prevenir médecin — Brancard 1/2 — Oxygène si sat < 95%"}/>}
                {f.parle_ok===true  && <AlerteBox couleur="orange" texte={f.asthme_connu?"Prevenir médecin — Fauteuil 2 ou Lit — Nebulisation sous air":"Lit 1 ou 2 — Surveillance saturation"}/>}
              </div>
            )}
            {age!==null && age<2 && (
              <div style={{background:'#eff6ff',borderRadius:8,padding:'10px 12px',border:'2px solid #bfdbfe',marginTop:8}}>
                <div style={{color:'#1d4ed8',fontWeight:700,fontSize:12,marginBottom:6}}>Nourrisson de moins de 2 ans — DRP OBLIGATOIRE</div>
                <div style={{color:'#3b82f6',fontSize:11,marginBottom:8}}>Faire lavage de nez, puis reprendre la saturation</div>
                <Btn onClick={()=>set('drp_fait',!f.drp_fait)} style={{padding:'8px 16px',borderRadius:7,fontSize:12,fontWeight:700,background:f.drp_fait?'#3b82f6':'#fff',color:f.drp_fait?'#fff':'#1d4ed8',border:'2px solid '+(f.drp_fait?'#3b82f6':'#bfdbfe')}}>
                  {f.drp_fait?'DRP realise — saturation verifiee':'DRP realise ?'}
                </Btn>
              </div>
            )}
          </div>
        )}

        {f.symptome==='plaie' && (
          <div style={card}>
            <label style={lbl}>Depuis quand ? *</label>
            <div style={{display:'flex',gap:8,marginBottom:12}}>
              <Btn onClick={()=>set('plaie_depuis','<24h')} style={pSt(f.plaie_depuis==='<24h')}>Moins de 24h</Btn>
              <Btn onClick={()=>set('plaie_depuis','>24h')} style={pSt(f.plaie_depuis==='>24h','#6b7280')}>Plus de 24h</Btn>
            </div>
            <label style={lbl}>Carnet vaccinal ? *</label>
            <div style={{display:'flex',gap:6,flexDirection:'column',marginBottom:12}}>
              {[['ok','Present et lisible','#16a34a'],['illisible','Illisible ou incomplet','#f59e0b'],['absent','Absent','#ef4444']].map(function(item) {
                return (
                  <Btn key={item[0]} onClick={()=>set('carnet',item[0])} style={{...pSt(f.carnet===item[0],item[2]),textAlign:'left'}}>
                    {item[1]}
                  </Btn>
                );
              })}
            </div>
            {(f.carnet==='absent'||f.carnet==='illisible') && (
              <div>
                <label style={lbl}>Quick test tetanos *</label>
                <div style={{display:'flex',gap:8}}>
                  <Btn onClick={()=>set('quicktest','pos')} style={pSt(f.quicktest==='pos','#ef4444')}>Positif</Btn>
                  <Btn onClick={()=>set('quicktest','neg')} style={pSt(f.quicktest==='neg','#16a34a')}>Negatif — Rappel tetanos auto</Btn>
                </div>
              </div>
            )}
          </div>
        )}

        {f.symptome==='fievre' && (
          <div style={card}>
            <label style={lbl}>Depuis quand ? *</label>
            <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:12}}>
              {['<1j','1j','2j','3j','>3j'].map(function(d) {
                return (
                  <Btn key={d} onClick={()=>set('fievre_depuis',d)} style={{padding:'8px 14px',borderRadius:99,fontSize:12,fontWeight:600,background:f.fievre_depuis===d?'#0d9488':'#fff',color:f.fievre_depuis===d?'#fff':'#374151',border:'1px solid '+(f.fievre_depuis===d?'#0d9488':'#e5e7eb')}}>
                    {d}
                  </Btn>
                );
              })}
            </div>
            {['3j','>3j'].includes(f.fievre_depuis) && (
              <div style={{background:'#fef9f0',borderRadius:8,padding:'10px 12px',border:'1px solid #fde68a'}}>
                <div style={{fontWeight:700,fontSize:12,color:'#d97706',marginBottom:8}}>Fievre de plus de 3 jours — Tests obligatoires *</div>
                {TESTS_FIEVRE.map(function(test) {
                  const k=test.k; const l=test.l; const type=test.type;
                  return (
                    <div key={k} style={{marginBottom:8}}>
                      <div style={{display:'flex',gap:6,alignItems:'center',marginBottom:4}}>
                        <Btn onClick={()=>set(k+'_fait',!f[k+'_fait'])} style={{padding:'5px 12px',borderRadius:6,fontSize:11,fontWeight:600,background:f[k+'_fait']?'#16a34a':'#fff',color:f[k+'_fait']?'#fff':'#374151',border:'1px solid '+(f[k+'_fait']?'#16a34a':'#e5e7eb')}}>
                          {f[k+'_fait']?'Fait: '+l:l}
                        </Btn>
                        <Btn onClick={()=>set(k+'_rupture',!f[k+'_rupture'])} style={{padding:'5px 10px',borderRadius:6,fontSize:10,fontWeight:600,background:f[k+'_rupture']?'#6b7280':'#f3f4f6',color:f[k+'_rupture']?'#fff':'#6b7280',border:'1px solid '+(f[k+'_rupture']?'#6b7280':'#e5e7eb')}}>
                          {f[k+'_rupture']?'Rupture confirmee':'Rupture de stock'}
                        </Btn>
                      </div>
                      {f[k+'_fait'] && type==='barres' && (
                        <div style={{paddingLeft:4}}>
                          <div style={{fontSize:10,color:'#6b7280',marginBottom:4}}>Nombre de barres:</div>
                          <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                            {['1 barre (<10mg/L)','2 barres (10-40mg/L)','3 barres (40-80mg/L)','4 barres (>80mg/L)'].map(function(r,i) {
                              const rc = i===0?'#16a34a':i===1?'#f59e0b':'#ef4444';
                              return (
                                <Btn key={r} onClick={()=>set(k+'_resultat',r)} style={{padding:'4px 8px',borderRadius:6,fontSize:10,fontWeight:600,background:f[k+'_resultat']===r?rc:'#fff',color:f[k+'_resultat']===r?'#fff':'#374151',border:'1px solid '+(f[k+'_resultat']===r?rc:'#e5e7eb')}}>
                                  {'|'.repeat(i+1)}
                                </Btn>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      {f[k+'_fait'] && type==='posneg' && (
                        <div style={{display:'flex',gap:6,paddingLeft:4}}>
                          {['Positif','Negatif'].map(function(r) {
                            const rc = r==='Positif'?'#ef4444':'#16a34a';
                            return (
                              <Btn key={r} onClick={()=>set(k+'_resultat',r)} style={{padding:'4px 12px',borderRadius:6,fontSize:11,fontWeight:600,background:f[k+'_resultat']===r?rc:'#fff',color:f[k+'_resultat']===r?'#fff':'#374151',border:'1px solid '+(f[k+'_resultat']===r?rc:'#e5e7eb')}}>
                                {r}
                              </Btn>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {f.symptome==='vertige' && (
          <div style={card}>
            <div style={{fontWeight:600,fontSize:13,color:'#374151',marginBottom:10}}>Dextro et Hemocue obligatoires</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              {[{k:'dextro',l:'Dextro *',u:'g/L'},{k:'hemocue',l:'Hemocue *',u:'g/dL'}].map(function(item) {
                return (
                  <div key={item.k}>
                    <label style={lbl}>{item.l}</label>
                    <div style={{position:'relative'}}>
                      <input value={f[item.k]} onChange={e=>set(item.k,e.target.value)} inputMode="decimal" style={{...inp,paddingRight:36}} placeholder="--"/>
                      <span style={{position:'absolute',right:8,top:'50%',transform:'translateY(-50%)',fontSize:10,color:'#9ca3af'}}>{item.u}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {f.symptome==='douleur' && (
          <div style={card}>
            <label style={lbl}>Localisation * (plusieurs choix)</label>
            <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:12}}>
              {ZONES_DOULEUR.map(function(z) {
                const actif = f.douleur_zones.includes(z.id);
                return (
                  <Btn key={z.id} onClick={()=>toggleZone(z.id)} style={{padding:'6px 12px',borderRadius:99,fontSize:12,fontWeight:600,background:actif?'#0d9488':'#f9fafb',color:actif?'#fff':'#374151',border:'1.5px solid '+(actif?'#0d9488':'#e5e7eb')}}>
                    {z.l}
                  </Btn>
                );
              })}
            </div>
            {f.douleur_zones.includes('autre') && (
              <div style={{marginBottom:8}}>
                <label style={lbl}>Preciser la localisation</label>
                <input value={f.douleur_autre||''} onChange={e=>set('douleur_autre',e.target.value)} style={inp} placeholder="Localisation de la douleur..."/>
              </div>
            )}
            {f.sexe==='F' && f.douleur_zones.includes('abdomen') && (
              <div style={{background:'#fdf4ff',borderRadius:8,padding:'10px 12px',border:'1px solid #e9d5ff',marginBottom:8}}>
                <div style={{color:'#7c3aed',fontWeight:700,fontSize:12,marginBottom:8}}>Femme + douleur abdominale — BU et bHCG obligatoires</div>
                <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                  {[{k:'bu_fait',l:'BU'},{k:'bhcg_fait',l:'bHCG urinaire'}].map(function(item) {
                    return (
                      <Btn key={item.k} onClick={()=>set(item.k,!f[item.k])} style={{padding:'5px 12px',borderRadius:6,fontSize:11,fontWeight:600,background:f[item.k]?'#7c3aed':'#fff',color:f[item.k]?'#fff':'#7c3aed',border:'1px solid '+(f[item.k]?'#7c3aed':'#e9d5ff')}}>
                        {f[item.k]?'Fait: '+item.l:item.l}
                      </Btn>
                    );
                  })}
                  {age!==null && age<16 && (
                    <Btn onClick={()=>set('bhcg_pas_regles',!f.bhcg_pas_regles)}
                      style={{padding:'5px 12px',borderRadius:6,fontSize:11,fontWeight:600,
                        background:f.bhcg_pas_regles?'#6b7280':'#fff',color:f.bhcg_pas_regles?'#fff':'#6b7280',
                        border:'1px solid '+(f.bhcg_pas_regles?'#6b7280':'#e9d5ff')}}>
                      {f.bhcg_pas_regles?'✓ bHCG non fait — pas encore de règles':'bHCG non fait — pas encore de règles'}
                    </Btn>
                  )}
                </div>
              </div>
            )}
            {f.douleur_zones.includes('thorax') && (
              <div style={{background:'#fef2f2',borderRadius:8,padding:'10px 12px',border:'1px solid #fecaca',marginBottom:8}}>
                <div style={{color:'#dc2626',fontWeight:700,fontSize:12,marginBottom:8}}>ECG obligatoire — Prevenir médecin</div>
                <Btn onClick={()=>set('ecg_fait',!f.ecg_fait)} style={{padding:'6px 14px',borderRadius:6,fontSize:12,fontWeight:600,background:f.ecg_fait?'#16a34a':'#fff',color:f.ecg_fait?'#fff':'#374151',border:'1px solid '+(f.ecg_fait?'#16a34a':'#e5e7eb')}}>
                  {f.ecg_fait?'ECG realise':'ECG realise ?'}
                </Btn>
              </div>
            )}
            {f.douleur_zones.includes('tete') && (
              <div style={{background:'#fffbeb',borderRadius:8,padding:'10px 12px',border:'1px solid #fde68a',marginBottom:8}}>
                <label style={{...lbl,marginBottom:6}}>Vomissements ? *</label>
                <div style={{display:'flex',gap:8,marginBottom:8}}>
                  <Btn onClick={()=>set('vomissement',true)}  style={pSt(f.vomissement===true,'#ef4444')}>Oui</Btn>
                  <Btn onClick={()=>set('vomissement',false)} style={pSt(f.vomissement===false,'#16a34a')}>Non</Btn>
                </div>
                <label style={{...lbl,marginBottom:6}}>Nouvelle tache sur la peau ? *</label>
                <div style={{display:'flex',gap:8}}>
                  <Btn onClick={()=>set('tache_peau',true)}  style={pSt(f.tache_peau===true,'#ef4444')}>Oui</Btn>
                  <Btn onClick={()=>set('tache_peau',false)} style={pSt(f.tache_peau===false,'#16a34a')}>Non</Btn>
                </div>
                {(f.vomissement===true||f.tache_peau===true) && <AlerteBox couleur="rouge" texte="Alerter médecin immédiatement"/>}
              </div>
            )}
          </div>
        )}

        {f.symptome==='soins_ide' && (
          <div style={card}>
            <label style={lbl}>Type de soins *</label>
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              {[['bio','Biologie (prise de sang, ECBU...)'],['injection','Injection (IM, SC, IV...)'],['autre','Autre soin']].map(function(item) {
                return (
                  <Btn key={item[0]} onClick={()=>set('soins_type',item[0])} style={{...{flex:1,padding:'10px',borderRadius:8,fontWeight:600,fontSize:13,textAlign:'left'},background:f.soins_type===item[0]?'#3b82f6':'#f9fafb',color:f.soins_type===item[0]?'#fff':'#374151',border:'2px solid '+(f.soins_type===item[0]?'#3b82f6':'#e5e7eb')}}>
                    {item[1]}
                  </Btn>
                );
              })}
            </div>
          </div>
        )}
        {f.symptome==='autre' && (
          <div style={card}>
            <label style={lbl}>Preciser le motif</label>
            <textarea value={f.autre_motif||''} onChange={e=>set('autre_motif',e.target.value)} rows={3} placeholder="Decrire le motif de consultation..." style={{...inp,resize:'none'}}/>
          </div>
        )}

        {placement && (
          <div style={{...card,border:'2px solid '+(placement.urgence?'#ef4444':'#0d9488'),background:placement.urgence?'#fef2f2':'#f0fdfa'}}>
            <div style={{fontWeight:800,fontSize:15,color:placement.urgence?'#dc2626':'#0d9488',marginBottom:4}}>
              {placement.urgence?'Urgence: ':'Placement suggere: '}{placement.label}
            </div>
            {placement.msg && <div style={{fontSize:13,color:placement.urgence?'#991b1b':'#065f46'}}>{placement.msg}</div>}
          </div>
        )}

        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          <Btn onClick={()=>enregistrer(null)} disabled={!canSubmit||saving}
            style={{width:'100%',padding:'14px',borderRadius:12,fontSize:15,fontWeight:700,background:canSubmit?'#0d9488':'#e5e7eb',color:canSubmit?'#fff':'#9ca3af',border:'none'}}>
            {saving?'Enregistrement...':(placement?'Enregistrer — '+placement.label:'Enregistrer le patient')}
          </Btn>
          {canSubmit && !saving && !showAutreEmplacement && (
            <Btn onClick={()=>setShowAutreEmplacement(true)} style={{width:'100%',padding:'12px',borderRadius:12,fontSize:13,fontWeight:600,background:'#fff',color:'#6b7280',border:'1.5px solid #e5e7eb'}}>
              Enregistrer sur un autre emplacement
            </Btn>
          )}
          {canSubmit && !saving && showAutreEmplacement && (
            <div style={{background:'#fff',borderRadius:12,border:'1.5px solid #e5e7eb',padding:'12px'}}>
              <div style={{fontSize:12,fontWeight:700,color:'#6b7280',marginBottom:8}}>Choisir un autre emplacement:</div>
              <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                {EMPLACEMENTS.map(function(e) {
                  const libre = e.id==='dehors'||!occupees.includes(e.id);
                  return (
                    <Btn key={e.id} onClick={()=>libre&&enregistrer({place:e.id,label:e.l,urgence:false,msg:''})}
                      style={{padding:'8px 14px',borderRadius:8,fontSize:12,fontWeight:600,background:libre?e.c:'#e5e7eb',color:libre?'#fff':'#9ca3af',border:'none',opacity:libre?1:0.5}}>
                      {e.l}{libre?'':' (occupe)'}
                    </Btn>
                  );
                })}
                <Btn onClick={()=>setShowAutreEmplacement(false)} style={{padding:'8px 12px',borderRadius:8,fontSize:12,fontWeight:600,background:'#f3f4f6',color:'#6b7280',border:'1px solid #e5e7eb'}}>
                  Annuler
                </Btn>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
