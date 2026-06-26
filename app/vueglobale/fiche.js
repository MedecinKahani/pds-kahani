'use client';
import { useState } from 'react';

function safeJSON(val, fallback=[]) {
  if(!val) return fallback;
  if(typeof val === 'string') {
    if(val.includes('[object')) return fallback;
    try { return JSON.parse(val); } catch(e) { return fallback; }
  }
  if(Array.isArray(val)) return val;
  if(typeof val === 'object') return val;
  return fallback;
}

const inp = {width:'100%',padding:'8px 10px',borderRadius:8,border:'1.5px solid #e5e7eb',fontSize:13,outline:'none',background:'#fff',color:'#111827',boxSizing:'border-box',fontFamily:'system-ui'};
const lbl = {fontSize:11,fontWeight:600,color:'#6b7280',textTransform:'uppercase',letterSpacing:0.5,marginBottom:4,display:'block'};

function isAnormal(val,k){
  const N={sat:[94,100],fc:[50,100],ta_sys:[90,150],ta_dia:[60,95],temp:[36,38.4]};
  const v=parseFloat(val);if(isNaN(v))return false;
  const[mn,mx]=N[k]||[0,9999];return v<mn||v>mx;
}

const EXAM_NORMAL = {
  neuro: "Examen neurologique sans anomalie : Glasgow 15, pas de deficit sensitivo-moteur des 4 membres, pas de paralysie des paires des nerfs craniens, pas de syndrome cerebelleux",
  cardio: "Examen cardio-vasculaire sans anomalie : Bruits du coeur reguliers sans signe de surcharge, pouls peripheriques des 4 membres percus, auscultation sans souffle, pas de douleur thoracique, pas d'oedeme des membres inferieurs",
  respi: "Examen pulmonaire sans anomalie : Eupneique en air ambiant, pas de signe de detresse respiratoire aigue, pas de tirage, pas de balancement thoraco-abdominal, murmures vesiculaires presents et symetriques",
  abdo: "Examen abdominal sans anomalie : Abdomen souple depressible indolore, orifices herniaires libres, pas de signe fonctionnel urinaire",
};

function TagList({value, onChange}) {
  const items = value ? value.split(',').map(s=>s.trim()).filter(Boolean) : [];
  return(
    <div style={{display:'flex',flexWrap:'wrap',gap:5,padding:'6px 0'}}>
      {items.map((item,i)=>(
        <span key={i} style={{background:'#f0fdfa',border:'1px solid #99f6e4',color:'#0d9488',fontSize:12,padding:'3px 8px',borderRadius:99,display:'flex',alignItems:'center',gap:4}}>
          {item}
          <button onClick={()=>{
            const newItems=[...items];newItems.splice(i,1);
            onChange(newItems.join(', '));
          }} style={{background:'none',border:'none',color:'#9ca3af',cursor:'pointer',fontSize:14,lineHeight:1,padding:0}}>×</button>
        </span>
      ))}
    </div>
  );
}

function ExamAppareil({label, stateKey, data, setData}) {
  const checked = data[stateKey+'_ok'];
  const text = data[stateKey+'_texte'] || '';
  const normal = EXAM_NORMAL[stateKey];

  return(
    <div style={{background:'#f9fafb',borderRadius:10,padding:'10px 12px',marginBottom:8,border:'1px solid #e5e7eb'}}>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:checked?8:0}}>
        <button onClick={()=>{
          const newChecked=!checked;
          setData(d=>({...d,[stateKey+'_ok']:newChecked,[stateKey+'_texte']:newChecked?normal:d[stateKey+'_texte']||''}));
        }} style={{
          width:22,height:22,borderRadius:5,border:'2px solid '+(checked?'#0d9488':'#d1d5db'),
          background:checked?'#0d9488':'#fff',color:'#fff',fontSize:13,display:'flex',
          alignItems:'center',justifyContent:'center',cursor:'pointer',flexShrink:0
        }}>{checked?'✓':''}</button>
        <span style={{fontWeight:600,fontSize:13,color:'#111827'}}>{label}</span>
        {checked&&<span style={{fontSize:11,color:'#0d9488',marginLeft:'auto'}}>Normal</span>}
      </div>
      {!checked&&(
        <textarea value={text} onChange={e=>setData(d=>({...d,[stateKey+'_texte']:e.target.value}))}
          placeholder={`Preciser les anomalies ${label.toLowerCase()}...`}
          rows={2} style={{...inp,resize:'vertical',fontSize:12,marginTop:4}}/>
      )}
      {checked&&text&&(
        <div style={{fontSize:11,color:'#6b7280',lineHeight:1.5,paddingLeft:32}}>{text}</div>
      )}
    </div>
  );
}

export default function FichePatient({patient, onClose, onUpdate, user}) {
  const p = patient;
  const poids = parseFloat(p.poids)||70;
  const enfant = poids < 16;

  const [onglet, setOnglet] = useState('anamnese');
  const [prescriptions, setPrescriptions] = useState(safeJSON(p.prescriptions));
  const [newRx, setNewRx] = useState('');
  const [section, setSection] = useState(null);
  const [showRecap, setShowRecap] = useState(false);

  // Perfusion
  const [perfVol, setPerfVol] = useState('500');
  const [perfDuree, setPerfDuree] = useState('4');
  const [perfSolute, setPerfSolute] = useState('NaCl 0.9%');

  // Onglets data
  const [anamnese, setAnamnese] = useState(p.anamnese||'');
  const [examData, setExamData] = useState(safeJSON(p.exam_data, {
    etat_general:'', neuro_ok:false, neuro_texte:'', cardio_ok:false, cardio_texte:'',
    respi_ok:false, respi_texte:'', abdo_ok:false, abdo_texte:'',
  }));
  const [constPost, setConstPost] = useState(safeJSON(p.constantes_post, {sat:'',fc:'',tas:'',tad:'',temp:''}));
  const [diagnostic, setDiagnostic] = useState(p.diagnostic||'');
  const [priseEnCharge, setPriseEnCharge] = useState(p.prise_en_charge||'');
  const [evolution, setEvolution] = useState(p.evolution||'');
  const [ordonnance, setOrdonnance] = useState(p.ordonnance||'');

  const examEnClair = [
    examData.etat_general&&examData.etat_general,
    examData.neuro_ok ? EXAM_NORMAL.neuro : examData.neuro_texte,
    examData.cardio_ok ? EXAM_NORMAL.cardio : examData.cardio_texte,
    examData.respi_ok ? EXAM_NORMAL.respi : examData.respi_texte,
    examData.abdo_ok ? EXAM_NORMAL.abdo : examData.abdo_texte,
  ].filter(Boolean).join(' / ');

  async function save(patch) {
    await fetch('/api/patients',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({action:'update',id:p.id,patch})});
    onUpdate();
  }

  async function ajouterRx(texte){
    if(!texte.trim())return;
    const rx=[...prescriptions,{texte,auteur:user.matricule,heure:Date.now()}];
    setPrescriptions(rx);
    await save({prescriptions:JSON.stringify(rx)});
  }

  function buildRecap() {
    const lines = [];
    lines.push(`MOTIF DE CONSULTATION : ${p.symptome||p.motifPrincipal||'--'}`);
    if(p.allergie==='Oui') lines.push(`ALLERGIE : ${p.allergie_detail}`);
    if(p.medicaments_today==='Oui') lines.push(`MEDICAMENTS DU JOUR : ${p.medicaments_detail}`);
    if(anamnese) lines.push(`\nANAMNESE :\n${anamnese}`);
    lines.push(`\nCONSTANTES D'ENTREE :`);
    if(p.sat) lines.push(`SpO2 ${p.sat}% - FC ${p.fc||'--'} bpm - PAS ${p.tas||'--'} mmHg - PAD ${p.tad||'--'} mmHg - T ${p.temp||'--'}°C`);
    if(p.poids) lines.push(`Poids ${p.poids}kg - Taille ${p.taille||'--'}cm`);
    if(p.tas&&p.tad) lines.push(`PAM : ${Math.round(parseFloat(p.tad)+(parseFloat(p.tas)-parseFloat(p.tad))/3)} mmHg`);
    if(examEnClair) lines.push(`\nEXAMEN CLINIQUE :\n${examEnClair}`);
    if(constPost.sat) lines.push(`\nCONSTANTES POST-THERAPEUTIQUES :\nSpO2 ${constPost.sat}% - FC ${constPost.fc||'--'} - PAS ${constPost.tas||'--'} - T ${constPost.temp||'--'}°C`);
    if(diagnostic) lines.push(`\nDIAGNOSTIC :\n${diagnostic}`);
    if(priseEnCharge) lines.push(`\nPRISE EN CHARGE :\n${priseEnCharge}`);
    if(prescriptions.length>0) lines.push(`\nPRESCRIPTIONS :\n${prescriptions.map(r=>'- '+r.texte).join('\n')}`);
    if(evolution) lines.push(`\nEVOLUTION :\n${evolution}`);
    if(ordonnance) lines.push(`\nORDONNANCE DE SORTIE :\n${ordonnance}`);
    lines.push(`\nConsignes de retour : Revenir en cas de mauvaise evolution, de majoration des symptomes, ou de tout nouveau symptome inquietant.`);
    return lines.join('\n');
  }

  const ONGLETS = [
    {id:'anamnese',label:'Anamnese'},
    {id:'examen',label:'Examen clinique'},
    {id:'prescriptions',label:'Prescriptions'},
    {id:'diagnostic',label:'Diagnostic & Evolution'},
  ];

  function RxBtn({label,texte,color='#0d9488'}){
    return(
      <button onClick={()=>ajouterRx(texte||label)} style={{padding:'5px 9px',borderRadius:6,fontSize:11,fontWeight:600,background:color+'15',color:color,border:'1px solid '+color+'33',cursor:'pointer',textAlign:'left',lineHeight:1.3}}>
        + {label}
      </button>
    );
  }

  function Section({id,label,icon,children}){
    return(
      <div style={{border:'1px solid #e5e7eb',borderRadius:10,overflow:'hidden',marginBottom:8}}>
        <button onClick={()=>setSection(section===id?null:id)} style={{width:'100%',padding:'9px 12px',display:'flex',alignItems:'center',justifyContent:'space-between',background:section===id?'#f0fdfa':'#f9fafb',border:'none',cursor:'pointer'}}>
          <div style={{display:'flex',alignItems:'center',gap:7}}>
            <span style={{fontSize:15}}>{icon}</span>
            <span style={{fontWeight:600,fontSize:12,color:'#111827'}}>{label}</span>
          </div>
          <span style={{color:'#9ca3af',fontSize:13}}>{section===id?'▲':'▼'}</span>
        </button>
        {section===id&&<div style={{padding:'10px 12px',borderTop:'1px solid #e5e7eb',background:'#fff'}}>{children}</div>}
      </div>
    );
  }

  const doseParacetamol = Math.min(Math.round(poids*15/100)*100,1000);
  const dosePerfalgan = poids<50?500:1000;

  return(
    <div style={{background:'#fff',borderRadius:14,border:'1px solid #e5e7eb',boxShadow:'0 4px 24px rgba(0,0,0,0.08)',overflow:'hidden'}}>

      {/* HEADER */}
      <div style={{background:'#f0fdfa',padding:'12px 16px',borderBottom:'1px solid #e5e7eb',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:40,height:40,borderRadius:'50%',background:'#ccfbf1',border:'2px solid #5eead4',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,fontWeight:700,color:'#0d9488',flexShrink:0}}>{p.sexe==='F'?'F':'M'}</div>
          <div>
            <div style={{fontWeight:700,fontSize:15,color:'#111827'}}>{p.nom} {p.prenom}</div>
            <div style={{fontSize:11,color:'#6b7280'}}>{p.age} ans{p.ipp?' · '+p.ipp:''}{p.poids?' · '+p.poids+'kg':''}{p.allergie==='Oui'?' · ⚠️ '+p.allergie_detail:''}</div>
          </div>
        </div>
        <div style={{display:'flex',gap:6,alignItems:'center'}}>
          <button onClick={()=>setShowRecap(!showRecap)} style={{padding:'6px 12px',borderRadius:7,background:'#111827',color:'#fff',fontSize:11,fontWeight:600,cursor:'pointer',border:'none'}}>
            Recap DxCare
          </button>
          <button onClick={onClose} style={{width:28,height:28,borderRadius:'50%',background:'#e5e7eb',color:'#6b7280',fontSize:15,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',border:'none'}}>×</button>
        </div>
      </div>

      {/* RECAP MODAL */}
      {showRecap&&(
        <div style={{background:'#1e293b',padding:'14px 16px',borderBottom:'1px solid #334155'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
            <span style={{color:'#fff',fontWeight:600,fontSize:13}}>Resume pour DxCare — copier-coller</span>
            <button onClick={()=>{navigator.clipboard.writeText(buildRecap());}} style={{padding:'5px 12px',borderRadius:6,background:'#0d9488',color:'#fff',fontSize:11,fontWeight:600,cursor:'pointer',border:'none'}}>Copier</button>
          </div>
          <pre style={{color:'#cbd5e1',fontSize:11,lineHeight:1.6,whiteSpace:'pre-wrap',margin:0,maxHeight:200,overflowY:'auto'}}>{buildRecap()}</pre>
        </div>
      )}

      {/* CONSTANTES RAPIDES */}
      <div style={{padding:'10px 16px',borderBottom:'1px solid #f3f4f6',display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
        {[['sat','SpO2','%','💧'],['fc','FC','bpm','❤️'],['tas','PAS','','🩸'],['temp','T°','°C','🌡️']].map(([k,l,u,ic])=>{
          const bad=p[k]&&isAnormal(p[k],k==='tas'?'ta_sys':k);
          return(
            <div key={k} style={{background:bad?'#fef2f2':'#f9fafb',border:'1px solid '+(bad?'#fecaca':'#e5e7eb'),borderRadius:7,padding:'4px 8px',display:'flex',alignItems:'center',gap:4}}>
              <span style={{fontSize:10}}>{ic}</span>
              <div>
                <div style={{fontSize:8,color:'#9ca3af',lineHeight:1}}>{l}</div>
                <div style={{fontSize:12,fontWeight:700,color:bad?'#ef4444':'#111827'}}>{p[k]||'--'}<span style={{fontSize:9,color:'#9ca3af'}}>{u}</span></div>
              </div>
            </div>
          );
        })}
        {p.tas&&p.tad&&<div style={{background:'#f0fdfa',border:'1px solid #99f6e4',borderRadius:7,padding:'4px 8px'}}>
          <div style={{fontSize:8,color:'#9ca3af',lineHeight:1}}>PAM</div>
          <div style={{fontSize:12,fontWeight:700,color:Math.round(parseFloat(p.tad)+(parseFloat(p.tas)-parseFloat(p.tad))/3)<65?'#ef4444':'#0d9488'}}>
            {Math.round(parseFloat(p.tad)+(parseFloat(p.tas)-parseFloat(p.tad))/3)}<span style={{fontSize:9,color:'#9ca3af'}}>mmHg</span>
          </div>
        </div>}
        <div style={{marginLeft:'auto',fontSize:12,fontWeight:600,color:'#374151',background:'#f9fafb',border:'1px solid #e5e7eb',borderRadius:7,padding:'4px 10px'}}>
          {p.symptome||p.motifPrincipal}
          {p.douleur_eva&&<span style={{color:'#9ca3af',fontSize:10,marginLeft:4}}>EVA {p.douleur_eva}/10</span>}
        </div>
      </div>

      {/* ONGLETS */}
      <div style={{display:'flex',borderBottom:'1px solid #e5e7eb',background:'#f9fafb'}}>
        {ONGLETS.map(o=>(
          <button key={o.id} onClick={()=>setOnglet(o.id)} style={{
            padding:'9px 14px',fontSize:12,fontWeight:600,border:'none',cursor:'pointer',
            background:onglet===o.id?'#fff':'transparent',
            color:onglet===o.id?'#0d9488':'#6b7280',
            borderBottom:onglet===o.id?'2px solid #0d9488':'2px solid transparent',
            marginBottom:-1
          }}>{o.label}</button>
        ))}
      </div>

      {/* CONTENU ONGLETS */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',maxHeight:'55vh',overflow:'hidden'}}>

        {/* COLONNE GAUCHE : onglet actif */}
        <div style={{padding:'14px 16px',borderRight:'1px solid #e5e7eb',overflowY:'auto'}}>

          {onglet==='anamnese'&&(
            <div>
              <label style={lbl}>Anamnese</label>
              <textarea value={anamnese} onChange={e=>setAnamnese(e.target.value)}
                placeholder="Histoire de la maladie, antecedents, contexte..."
                rows={8} style={{...inp,resize:'vertical'}}/>
              <button onClick={()=>save({anamnese})} style={{marginTop:8,padding:'7px 14px',borderRadius:7,background:'#0d9488',color:'#fff',fontSize:12,fontWeight:600,cursor:'pointer',border:'none'}}>
                Sauvegarder
              </button>
            </div>
          )}

          {onglet==='examen'&&(
            <div>
              <div style={{marginBottom:10}}>
                <label style={lbl}>Etat general</label>
                <input value={examData.etat_general} onChange={e=>setExamData(d=>({...d,etat_general:e.target.value}))}
                  placeholder="Ex: Patient conscient et oriente, etat general conserve..."
                  style={inp}/>
              </div>
              <ExamAppareil label="Neurologique" stateKey="neuro" data={examData} setData={setExamData}/>
              <ExamAppareil label="Cardio-vasculaire" stateKey="cardio" data={examData} setData={setExamData}/>
              <ExamAppareil label="Pulmonaire" stateKey="respi" data={examData} setData={setExamData}/>
              <ExamAppareil label="Abdominal" stateKey="abdo" data={examData} setData={setExamData}/>
              <button onClick={()=>save({exam_data:JSON.stringify(examData)})} style={{marginTop:8,padding:'7px 14px',borderRadius:7,background:'#0d9488',color:'#fff',fontSize:12,fontWeight:600,cursor:'pointer',border:'none'}}>
                Sauvegarder
              </button>
            </div>
          )}

          {onglet==='prescriptions'&&(
            <div>
              {prescriptions.length>0&&(
                <div style={{marginBottom:10}}>
                  {prescriptions.map((rx,i)=>(
                    <div key={i} style={{background:'#f9fafb',borderRadius:7,padding:'6px 10px',marginBottom:4,border:'1px solid #e5e7eb',display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:6}}>
                      <span style={{fontSize:12,color:'#111827',flex:1}}>{rx.texte}</span>
                      <div style={{display:'flex',gap:4,alignItems:'center',flexShrink:0}}>
                        <span style={{fontSize:10,color:'#9ca3af'}}>{new Date(rx.heure).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</span>
                        <button onClick={()=>{const r=[...prescriptions];r.splice(i,1);setPrescriptions(r);save({prescriptions:JSON.stringify(r)});}} style={{background:'none',border:'none',color:'#d1d5db',cursor:'pointer',fontSize:14}}>×</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div style={{display:'flex',gap:6,marginBottom:10}}>
                <input value={newRx} onChange={e=>setNewRx(e.target.value)}
                  onKeyDown={e=>e.key==='Enter'&&(ajouterRx(newRx),setNewRx(''))}
                  placeholder="Prescription libre (Entree)..."
                  style={{...inp,flex:1}}/>
                <button onClick={()=>{ajouterRx(newRx);setNewRx('');}} style={{padding:'8px 12px',borderRadius:8,background:'#0d9488',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',border:'none'}}>+</button>
              </div>

              {/* Constantes post-therapeutiques */}
              <div style={{background:'#f9fafb',borderRadius:10,padding:'10px',marginBottom:10,border:'1px solid #e5e7eb'}}>
                <div style={{fontSize:11,fontWeight:600,color:'#6b7280',marginBottom:8,textTransform:'uppercase',letterSpacing:0.5}}>Constantes post-therapeutiques</div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6}}>
                  {[['sat','SpO2'],['fc','FC'],['tas','PAS'],['temp','T°']].map(([k,l])=>(
                    <div key={k}>
                      <div style={{fontSize:9,color:'#9ca3af',marginBottom:2,textTransform:'uppercase'}}>{l}</div>
                      <input type="number" step="0.1" value={constPost[k]||''} onChange={e=>setConstPost(c=>({...c,[k]:e.target.value}))}
                        placeholder="--" style={{...inp,textAlign:'center',padding:'5px 4px',fontSize:12,fontWeight:700}}/>
                    </div>
                  ))}
                </div>
                <button onClick={()=>save({constantes_post:JSON.stringify(constPost)})} style={{marginTop:6,padding:'5px 12px',borderRadius:6,background:'#0d9488',color:'#fff',fontSize:11,fontWeight:600,cursor:'pointer',border:'none'}}>
                  Enregistrer
                </button>
              </div>
            </div>
          )}

          {onglet==='diagnostic'&&(
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              <div>
                <label style={lbl}>Diagnostic</label>
                <textarea value={diagnostic} onChange={e=>setDiagnostic(e.target.value)} rows={3} style={{...inp,resize:'vertical'}}
                  placeholder="Diagnostic retenu..."/>
              </div>
              <div>
                <label style={lbl}>Prise en charge au dispensaire</label>
                <textarea value={priseEnCharge} onChange={e=>setPriseEnCharge(e.target.value)} rows={3} style={{...inp,resize:'vertical'}}
                  placeholder="Therapeutiques mises en place..."/>
              </div>
              <div>
                <label style={lbl}>Evolution apres therapeutique</label>
                <textarea value={evolution} onChange={e=>setEvolution(e.target.value)} rows={3} style={{...inp,resize:'vertical'}}
                  placeholder="Evolution clinique, constantes de controle..."/>
              </div>
              <div>
                <label style={lbl}>Ordonnance de sortie</label>
                <textarea value={ordonnance} onChange={e=>setOrdonnance(e.target.value)} rows={3} style={{...inp,resize:'vertical'}}
                  placeholder="Medicaments, posologies, duree..."/>
              </div>
              <button onClick={()=>save({diagnostic,prise_en_charge:priseEnCharge,evolution,ordonnance})} style={{padding:'8px 16px',borderRadius:8,background:'#0d9488',color:'#fff',fontSize:12,fontWeight:600,cursor:'pointer',border:'none',alignSelf:'flex-start'}}>
                Sauvegarder
              </button>
            </div>
          )}
        </div>

        {/* COLONNE DROITE : prescriptions rapides */}
        <div style={{padding:'14px 16px',overflowY:'auto',background:'#fafafa'}}>
          <div style={{fontSize:10,fontWeight:700,color:'#9ca3af',textTransform:'uppercase',letterSpacing:1,marginBottom:10}}>Prescriptions rapides</div>

          <Section id="constantes" label="Constantes supplementaires" icon="📊">
            <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
              <RxBtn label="Dextro"/><RxBtn label="Hemocue"/><RxBtn label="TDR dengue"/>
              <RxBtn label="TDR paludisme"/><RxBtn label="BU"/><RxBtn label="bHCG urinaire"/>
              <RxBtn label="Reprendre constantes vitales"/>
            </div>
          </Section>

          <Section id="installation" label="Installation et surveillance" icon="🛏️">
            <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
              <RxBtn label="Allonger"/><RxBtn label="Position demi-assise"/>
              <RxBtn label="Scoper (SpO2+FC+TA)"/><RxBtn label="O2 2L lunettes"/>
              <RxBtn label="O2 5L masque"/><RxBtn label="O2 15L MHC"/>
            </div>
          </Section>

          <Section id="aerosol" label="Aerosols" icon="💨">
            <div style={{background:'#f0fdf4',borderRadius:7,padding:'8px',marginBottom:8,fontSize:11,color:'#15803d'}}>
              Ventoline {enfant?'2.5':'5'}mL · Atrovent {enfant?'0.25':'0.5'}mg (1x) · poids {poids}kg
            </div>
            <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
              <RxBtn label={`Aerosol 1 : Ventoline ${enfant?'2.5':'5'}mL + Atrovent ${enfant?'0.25':'0.5'}mg sur AIR`}/>
              <RxBtn label={`Aerosol 2 : Ventoline ${enfant?'2.5':'5'}mL sur AIR`}/>
              <RxBtn label={`Aerosol 3 : Ventoline ${enfant?'2.5':'5'}mL sur AIR`}/>
              <RxBtn label={`Aerosol sur O2 5L`} color="#ef4444"/>
              <RxBtn label="Video EPT asthme" color="#8b5cf6"/>
            </div>
          </Section>

          <Section id="ecg_vvp" label="ECG / VVP" icon="💉">
            <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
              <RxBtn label="ECG 12 derivations"/>
              <RxBtn label="VVP 1 voie"/><RxBtn label="VVP 2 voies (urgence)"/>
            </div>
          </Section>

          <Section id="perf" label="Perfusion" icon="💧">
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6,marginBottom:8}}>
              <div>
                <div style={lbl}>Solute</div>
                <select value={perfSolute} onChange={e=>setPerfSolute(e.target.value)} style={{...inp,padding:'5px 6px',fontSize:12}}>
                  {['NaCl 0.9%','G5%','G10%','G30%','Ringer lactate'].map(s=><option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <div style={lbl}>Volume (mL)</div>
                <input type="number" value={perfVol} onChange={e=>setPerfVol(e.target.value)} style={{...inp,padding:'5px 6px',fontSize:12}}/>
              </div>
              <div>
                <div style={lbl}>Duree (h)</div>
                <input type="number" step="0.5" value={perfDuree} onChange={e=>setPerfDuree(e.target.value)} style={{...inp,padding:'5px 6px',fontSize:12}}/>
              </div>
            </div>
            {perfVol&&perfDuree&&<div style={{background:'#f0fdfa',borderRadius:6,padding:'6px 8px',marginBottom:6,fontSize:11,color:'#0d9488',fontWeight:600}}>
              Debit : {Math.round(parseFloat(perfVol)/parseFloat(perfDuree))} mL/h
            </div>}
            <button onClick={()=>ajouterRx('Perf '+perfSolute+' '+perfVol+'mL en '+perfDuree+'h → '+Math.round(parseFloat(perfVol)/parseFloat(perfDuree))+' mL/h')}
              style={{padding:'6px 12px',borderRadius:6,background:'#0d9488',color:'#fff',fontSize:11,fontWeight:600,cursor:'pointer',border:'none'}}>
              + Ajouter
            </button>
          </Section>

          <Section id="bio" label="Biologie" icon="🧪">
            <div style={{marginBottom:6,fontSize:11,fontWeight:600,color:'#6b7280'}}>Sur place</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:5,marginBottom:8}}>
              <RxBtn label="NFS + CRP"/><RxBtn label="Gaz du sang"/>
              <RxBtn label="Tropo + BNP + DD"/><RxBtn label="BHC + Iono + Creat"/>
            </div>
            <div style={{fontSize:11,fontWeight:600,color:'#6b7280',marginBottom:5}}>Tubes CHM Mamoudzou</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
              <RxBtn label="NFS CRP" color="#8b5cf6" texte="Tubes Mamoudzou : NFS CRP"/>
              <RxBtn label="Iono Creat BHC" color="#8b5cf6" texte="Tubes Mamoudzou : Iono Creat BHC"/>
              <RxBtn label="Lipase" color="#8b5cf6" texte="Tubes Mamoudzou : Lipase"/>
              <RxBtn label="Bacteriologie" color="#8b5cf6" texte="Tubes Mamoudzou : Bacteriologie"/>
              <RxBtn label="Feuille CHM" color="#8b5cf6" texte="Joindre feuille de demande CHM Mamoudzou"/>
            </div>
          </Section>

          <Section id="antalgiques" label="Antalgiques" icon="💊">
            <div style={{fontSize:11,fontWeight:600,color:'#6b7280',marginBottom:5}}>Per os</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:5,marginBottom:8}}>
              <RxBtn label={`Paracetamol ${doseParacetamol}mg PO`} texte={`Paracetamol ${doseParacetamol}mg PO (15mg/kg, poids ${poids}kg)`}/>
              <RxBtn label="Omeprazole 20mg PO"/><RxBtn label="Ibuprofene 400mg PO"/>
              <RxBtn label="Diffu-K 1 gel PO"/><RxBtn label="Acupan 20mg PO"/>
              <RxBtn label="Tramadol 50mg PO"/><RxBtn label="Tramadol 100mg PO"/>
            </div>
            <div style={{fontSize:11,fontWeight:600,color:'#6b7280',marginBottom:5}}>IV</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
              <RxBtn label={`Perfalgan ${dosePerfalgan}mg IV`} texte={`Perfalgan ${dosePerfalgan}mg IV en 15min`}/>
              <RxBtn label="Ketoprofene 100mg IV"/><RxBtn label="IPP IV Omeprazole 40mg"/>
              <RxBtn label="Acupan 20mg IV lente"/>
            </div>
          </Section>

          <Section id="morphine" label="Titration morphine IV" icon="🔴">
            <div style={{background:'#fef2f2',borderRadius:7,padding:'8px',marginBottom:8,fontSize:11,color:'#dc2626'}}>
              <div style={{fontWeight:700}}>Dilution : 10mg + 9mL NaCl = 1mg/mL</div>
              <div>Bolus : {Math.round(poids*0.05*10)/10}mg (0.05mg/kg) / 5min</div>
              <div>Conditions : scope + SpO2 ≥93% + O2 3L + Ramsay ≤1</div>
              <div style={{fontWeight:700}}>Alerter medecin si &gt;15mg cumules</div>
            </div>
            <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
              <RxBtn label={`Morphine titration ${Math.round(poids*0.05*10)/10}mg/5min`}
                texte={`Titration morphine IV : ${Math.round(poids*0.05*10)/10}mg toutes les 5min (0.05mg/kg). Dil: 10mg+9mL NaCl=1mg/mL. Scope+SpO2+O2 3L. Naloxone proximite.`}
                color="#ef4444"/>
              <RxBtn label="Naloxone prete" color="#ef4444"/>
              <RxBtn label="MEOPA 15 min"/>
              <RxBtn label="PSE Ketamine (protocole en cours)" color="#8b5cf6"/>
            </div>
          </Section>

          <Section id="pansement" label="Pansements" icon="🩹">
            <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
              <RxBtn label="Nettoyage + parage plaie + pansement"/>
              <RxBtn label="Pansement post-suture"/>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
