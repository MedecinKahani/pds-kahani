'use client';
import { useState } from 'react';

const lbl = {fontSize:11,fontWeight:600,color:'#6b7280',textTransform:'uppercase',letterSpacing:0.5,marginBottom:4,display:'block'};
const inp = {width:'100%',padding:'8px 10px',borderRadius:8,border:'1.5px solid #e5e7eb',fontSize:13,outline:'none',background:'#fff',color:'#111827',boxSizing:'border-box',fontFamily:'system-ui'};

function isAnormal(val,k){
  const NORMES={sat:[94,100],fc:[50,100],ta_sys:[90,150],ta_dia:[60,95],temp:[36,38.4]};
  const v=parseFloat(val);if(isNaN(v))return false;
  const[mn,mx]=NORMES[k]||[0,9999];return v<mn||v>mx;
}

function Const({label,value,unit,k}){
  const bad=value&&isAnormal(value,k);
  return(
    <div style={{background:bad?'#fef2f2':'#f9fafb',borderRadius:8,padding:'8px 10px',border:'1px solid '+(bad?'#fecaca':'#e5e7eb'),textAlign:'center'}}>
      <div style={{fontSize:9,color:'#9ca3af',marginBottom:2,textTransform:'uppercase'}}>{label}</div>
      <div style={{fontSize:16,fontWeight:700,color:bad?'#ef4444':value?'#111827':'#d1d5db'}}>{value||'--'}</div>
      <div style={{fontSize:9,color:'#9ca3af'}}>{unit}</div>
    </div>
  );
}

export default function FichePatient({patient, onClose, onUpdate, user}) {
  const p = patient;
  const poids = parseFloat(p.poids)||70;
  const age = parseInt(p.age)||30;
  const enfant = poids < 16;

  const [exam, setExam] = useState(p.examen_clinique||'');
  const [prescriptions, setPrescriptions] = useState(p.prescriptions?JSON.parse(p.prescriptions):[]);
  const [newRx, setNewRx] = useState('');
  const [section, setSection] = useState(null);
  const [perfVol, setPerfVol] = useState('500');
  const [perfDuree, setPerfDuree] = useState('4');
  const [perfSolute, setPerfSolute] = useState('NaCl 0.9%');

  // Constantes post-thérapeutiques
  const [constPost, setConstPost] = useState({sat:'',fc:'',tas:'',temp:''});

  async function sauvegarder(patch){
    await fetch('/api/patients',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({action:'update',id:p.id,patch})});
    onUpdate();
  }

  async function ajouterRx(texte){
    if(!texte.trim())return;
    const rx=[...prescriptions,{texte,auteur:user.matricule,heure:Date.now()}];
    setPrescriptions(rx);
    await sauvegarder({prescriptions:JSON.stringify(rx)});
  }

  function RxBtn({label,texte,color='#0d9488'}){
    return(
      <button onClick={()=>ajouterRx(texte||label)} style={{padding:'6px 10px',borderRadius:6,fontSize:11,fontWeight:600,background:color+'15',color:color,border:'1px solid '+color+'33',cursor:'pointer',textAlign:'left',lineHeight:1.3}}>
        + {label}
      </button>
    );
  }

  function Section({id,label,icon,children}){
    return(
      <div style={{border:'1px solid #e5e7eb',borderRadius:10,overflow:'hidden',marginBottom:8}}>
        <button onClick={()=>setSection(section===id?null:id)} style={{width:'100%',padding:'10px 14px',display:'flex',alignItems:'center',justifyContent:'space-between',background:section===id?'#f0fdfa':'#f9fafb',border:'none',cursor:'pointer'}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <span style={{fontSize:16}}>{icon}</span>
            <span style={{fontWeight:600,fontSize:13,color:'#111827'}}>{label}</span>
          </div>
          <span style={{color:'#9ca3af',fontSize:16}}>{section===id?'▲':'▼'}</span>
        </button>
        {section===id&&<div style={{padding:'12px 14px',borderTop:'1px solid #e5e7eb',background:'#fff'}}>{children}</div>}
      </div>
    );
  }

  const doseParacetamol = Math.min(Math.round(poids*15/100)*100, 1000);
  const dosePerfalgan = poids<50?500:1000;

  return(
    <div style={{background:'#fff',borderRadius:14,border:'1px solid #e5e7eb',boxShadow:'0 4px 24px rgba(0,0,0,0.08)',overflow:'hidden'}}>

      {/* HEADER */}
      <div style={{background:'#f0fdfa',padding:'14px 18px',borderBottom:'1px solid #e5e7eb',display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={{width:44,height:44,borderRadius:'50%',background:'#ccfbf1',border:'2px solid #5eead4',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,fontWeight:700,color:'#0d9488',flexShrink:0}}>
            {p.sexe==='F'?'F':'M'}
          </div>
          <div>
            <div style={{fontWeight:700,fontSize:17,color:'#111827'}}>{p.nom} {p.prenom}</div>
            <div style={{fontSize:12,color:'#6b7280',marginTop:2}}>{p.age} ans · {p.sexe==='F'?'Femme':'Homme'}{p.ipp?' · IPP '+p.ipp:''}{p.poids?' · '+p.poids+' kg':''}</div>
            {p.allergie==='Oui'&&<div style={{color:'#dc2626',fontWeight:700,fontSize:12,marginTop:3}}>⚠️ Allergie : {p.allergie_detail}</div>}
          </div>
        </div>
        <button onClick={onClose} style={{width:30,height:30,borderRadius:'50%',background:'#e5e7eb',color:'#6b7280',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',border:'none',flexShrink:0}}>×</button>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:0,maxHeight:'75vh',overflow:'auto'}}>

        {/* GAUCHE : rappel AS + examen clinique */}
        <div style={{padding:'14px 16px',borderRight:'1px solid #e5e7eb',overflowY:'auto'}}>

          {/* Constantes initiales */}
          <div style={{marginBottom:14}}>
            <div style={{fontSize:10,fontWeight:700,color:'#9ca3af',textTransform:'uppercase',letterSpacing:1,marginBottom:8}}>Constantes initiales</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6}}>
              <Const label="SpO2" value={p.sat} unit="%" k="sat"/>
              <Const label="FC" value={p.fc} unit="bpm" k="fc"/>
              <Const label="PAS" value={p.tas} unit="mmHg" k="ta_sys"/>
              <Const label="T°" value={p.temp} unit="°C" k="temp"/>
            </div>
            {p.tas&&p.tad&&<div style={{marginTop:6,padding:'4px 8px',background:'#f0fdfa',borderRadius:6,fontSize:11,color:'#0d9488',fontWeight:600,display:'inline-block'}}>
              PAM : {Math.round(parseFloat(p.tad)+(parseFloat(p.tas)-parseFloat(p.tad))/3)} mmHg
              {Math.round(parseFloat(p.tad)+(parseFloat(p.tas)-parseFloat(p.tad))/3)<65&&<span style={{color:'#ef4444',marginLeft:6}}>⚠️ CHOC</span>}
            </div>}
          </div>

          {/* Motif */}
          <div style={{marginBottom:14,padding:'10px 12px',background:'#f9fafb',borderRadius:8,border:'1px solid #e5e7eb'}}>
            <div style={{fontSize:10,fontWeight:700,color:'#9ca3af',textTransform:'uppercase',letterSpacing:1,marginBottom:4}}>Motif d'entree</div>
            <div style={{fontWeight:700,color:'#111827',fontSize:14}}>{p.symptome||p.motifPrincipal||'--'}</div>
            {p.douleur_eva&&<div style={{color:'#6b7280',fontSize:12,marginTop:2}}>EVA {p.douleur_eva}/10</div>}
            {p.notes&&<div style={{color:'#6b7280',fontSize:11,marginTop:4,fontStyle:'italic'}}>{p.notes}</div>}
          </div>

          {/* Premiers actes AS */}
          {p.actes&&JSON.parse(p.actes||'[]').length>0&&(
            <div style={{marginBottom:14}}>
              <div style={{fontSize:10,fontWeight:700,color:'#9ca3af',textTransform:'uppercase',letterSpacing:1,marginBottom:6}}>Actes realises</div>
              <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
                {JSON.parse(p.actes).map((a,i)=>(
                  <span key={i} style={{background:'#f0fdf4',border:'1px solid #bbf7d0',color:'#16a34a',fontSize:11,padding:'3px 8px',borderRadius:99,fontWeight:500}}>✓ {a.label}</span>
                ))}
              </div>
            </div>
          )}

          {/* Constantes post-therapeutiques */}
          <div style={{marginBottom:14}}>
            <div style={{fontSize:10,fontWeight:700,color:'#9ca3af',textTransform:'uppercase',letterSpacing:1,marginBottom:8}}>Constantes post-therapeutiques</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6}}>
              {[['sat','SpO2','%'],['fc','FC','bpm'],['tas','PAS','mmHg'],['temp','T°','°C']].map(([k,l,u])=>(
                <div key={k}>
                  <div style={{fontSize:9,color:'#9ca3af',marginBottom:2,textTransform:'uppercase'}}>{l}</div>
                  <input type="number" step="0.1" value={constPost[k]} onChange={e=>setConstPost(c=>({...c,[k]:e.target.value}))}
                    placeholder="--" style={{...inp,textAlign:'center',padding:'6px 4px',fontSize:13,fontWeight:700}}/>
                </div>
              ))}
            </div>
            <button onClick={()=>sauvegarder({constantes_post:JSON.stringify(constPost)})} style={{marginTop:8,padding:'6px 14px',borderRadius:7,background:'#0d9488',color:'#fff',fontSize:12,fontWeight:600,cursor:'pointer',border:'none'}}>
              Enregistrer constantes
            </button>
          </div>

          {/* Examen clinique */}
          <div>
            <div style={{fontSize:10,fontWeight:700,color:'#9ca3af',textTransform:'uppercase',letterSpacing:1,marginBottom:6}}>Examen clinique</div>
            <textarea value={exam} onChange={e=>setExam(e.target.value)}
              placeholder="Examen clinique..."
              rows={5} style={{...inp,resize:'vertical'}}/>
            <button onClick={()=>sauvegarder({examen_clinique:exam})} style={{marginTop:6,padding:'6px 14px',borderRadius:7,background:'#0d9488',color:'#fff',fontSize:12,fontWeight:600,cursor:'pointer',border:'none'}}>
              Sauvegarder
            </button>
          </div>
        </div>

        {/* DROITE : prescriptions */}
        <div style={{padding:'14px 16px',overflowY:'auto'}}>
          <div style={{fontSize:10,fontWeight:700,color:'#9ca3af',textTransform:'uppercase',letterSpacing:1,marginBottom:10}}>Prescriptions</div>

          {/* Prescriptions existantes */}
          {prescriptions.length>0&&(
            <div style={{marginBottom:12}}>
              {prescriptions.map((rx,i)=>(
                <div key={i} style={{background:'#f9fafb',borderRadius:7,padding:'7px 10px',marginBottom:5,border:'1px solid #e5e7eb',display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:6}}>
                  <span style={{fontSize:12,color:'#111827',flex:1}}>{rx.texte}</span>
                  <span style={{fontSize:10,color:'#9ca3af',flexShrink:0}}>{new Date(rx.heure).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</span>
                </div>
              ))}
            </div>
          )}

          {/* Saisie libre */}
          <div style={{display:'flex',gap:6,marginBottom:14}}>
            <input value={newRx} onChange={e=>setNewRx(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&(ajouterRx(newRx),setNewRx(''))}
              placeholder="Prescription libre (Entrée)..."
              style={{...inp,flex:1}}/>
            <button onClick={()=>{ajouterRx(newRx);setNewRx('');}} style={{padding:'8px 12px',borderRadius:8,background:'#0d9488',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',border:'none'}}>+</button>
          </div>

          {/* SECTIONS PRESCRIPTIONS */}

          <Section id="constantes" label="Constantes supplementaires" icon="📊">
            <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
              <RxBtn label="Dextro"/>
              <RxBtn label="Hemocue"/>
              <RxBtn label="TDR dengue"/>
              <RxBtn label="TDR paludisme"/>
              <RxBtn label="BU"/>
              <RxBtn label="bHCG urinaire"/>
              <RxBtn label="Reprendre constantes vitales"/>
            </div>
          </Section>

          <Section id="installation" label="Installation et surveillance" icon="🛏️">
            <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
              <RxBtn label="Allonger le patient"/>
              <RxBtn label="Position demi-assise"/>
              <RxBtn label="Position assise"/>
              <RxBtn label="Scoper le patient (SpO2 + FC + TA)"/>
              <RxBtn label="O2 lunettes 2L/min"/>
              <RxBtn label="O2 masque 5L/min"/>
              <RxBtn label="O2 masque haute concentration 15L/min"/>
            </div>
          </Section>

          <Section id="aerosol" label="Aerosols" icon="💨">
            <div style={{background:'#f0fdf4',borderRadius:8,padding:'10px',marginBottom:8,fontSize:12,color:'#15803d'}}>
              <div style={{fontWeight:700,marginBottom:4}}>Protocole : 3 aerosols</div>
              <div>1er : Ventoline + Atrovent (1 seule fois)</div>
              <div>2e et 3e : Ventoline seule</div>
              <div style={{marginTop:6,fontWeight:600}}>
                Ventoline : {enfant?'2.5 mL':'5 mL'} · Atrovent : {enfant?'0.25 mg':'0.5 mg'}
                {p.poids&&<span style={{color:'#6b7280',fontWeight:400}}> (poids {p.poids} kg)</span>}
              </div>
            </div>
            <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
              <RxBtn label={`Aerosol 1 : Ventoline ${enfant?'2.5':'5'}mL + Atrovent ${enfant?'0.25':'0.5'}mg sur AIR`}/>
              <RxBtn label={`Aerosol 2 : Ventoline ${enfant?'2.5':'5'}mL sur AIR`}/>
              <RxBtn label={`Aerosol 3 : Ventoline ${enfant?'2.5':'5'}mL sur AIR`}/>
              <RxBtn label={`Aerosol 1 : Ventoline ${enfant?'2.5':'5'}mL + Atrovent ${enfant?'0.25':'0.5'}mg sur O2 5L`} color="#ef4444"/>
              <RxBtn label="Reevaluation saturation + clinique apres chaque aerosol"/>
              <RxBtn label="Video EPT asthme salle observation" color="#8b5cf6"/>
            </div>
          </Section>

          <Section id="ecg" label="ECG" icon="❤️">
            <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
              <RxBtn label="ECG 12 derivations"/>
              <RxBtn label="ECG + avis medecin"/>
            </div>
          </Section>

          <Section id="vvp" label="Voie(s) veineuse(s)" icon="💉">
            <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
              <RxBtn label="VVP 1 voie"/>
              <RxBtn label="VVP 2 voies (urgence)"/>
            </div>
          </Section>

          <Section id="perf" label="Perfusion" icon="💧">
            <div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:10}}>
                <div>
                  <label style={lbl}>Solute</label>
                  <select value={perfSolute} onChange={e=>setPerfSolute(e.target.value)} style={{...inp,padding:'6px 8px'}}>
                    {['NaCl 0.9%','G5%','G10%','G30%','Ringer lactate','NaCl 0.45%'].map(s=><option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Volume (mL)</label>
                  <input type="number" value={perfVol} onChange={e=>setPerfVol(e.target.value)} style={{...inp,padding:'6px 8px'}}/>
                </div>
                <div>
                  <label style={lbl}>Duree (h)</label>
                  <input type="number" step="0.5" value={perfDuree} onChange={e=>setPerfDuree(e.target.value)} style={{...inp,padding:'6px 8px'}}/>
                </div>
              </div>
              {perfVol&&perfDuree&&<div style={{background:'#f0fdfa',borderRadius:7,padding:'8px 10px',marginBottom:8,fontSize:12,color:'#0d9488',fontWeight:600}}>
                Debit : {Math.round(parseFloat(perfVol)/parseFloat(perfDuree))} mL/h
              </div>}
              <button onClick={()=>ajouterRx('Perf '+perfSolute+' '+perfVol+'mL en '+perfDuree+'h → '+Math.round(parseFloat(perfVol)/parseFloat(perfDuree))+' mL/h')} style={{padding:'7px 14px',borderRadius:7,background:'#0d9488',color:'#fff',fontSize:12,fontWeight:600,cursor:'pointer',border:'none'}}>
                + Ajouter cette perfusion
              </button>
            </div>
          </Section>

          <Section id="bio" label="Biologie delocalisee" icon="🧪">
            <div style={{marginBottom:8}}>
              <div style={{fontSize:11,fontWeight:600,color:'#6b7280',marginBottom:6}}>Point of care (sur place)</div>
              <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                <RxBtn label="NFS + CRP"/>
                <RxBtn label="Gaz du sang"/>
                <RxBtn label="Tropo + BNP + DD"/>
                <RxBtn label="BHC + Iono + Creatinine"/>
              </div>
            </div>
            <div>
              <div style={{fontSize:11,fontWeight:600,color:'#6b7280',marginBottom:6}}>Tubes pour CHM Mamoudzou</div>
              <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                <RxBtn label="Tubes Mamoudzou : NFS CRP" color="#8b5cf6"/>
                <RxBtn label="Tubes Mamoudzou : Iono Creat BHC" color="#8b5cf6"/>
                <RxBtn label="Tubes Mamoudzou : Lipase" color="#8b5cf6"/>
                <RxBtn label="Tubes Mamoudzou : Bacteriologie" color="#8b5cf6"/>
                <RxBtn label="Tubes Mamoudzou : Serologie" color="#8b5cf6"/>
                <RxBtn label="Joindre feuille de demande papier CHM" color="#8b5cf6"/>
              </div>
            </div>
          </Section>

          <Section id="antalgiques_po" label="Antalgiques per os" icon="💊">
            <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
              <RxBtn label={`Paracetamol PO ${doseParacetamol}mg (15mg/kg)`} texte={`Paracetamol PO ${doseParacetamol}mg (15mg/kg - poids ${poids}kg)`}/>
              <RxBtn label="Omeprazole 20mg PO"/>
              <RxBtn label="Ibuprofene 200mg PO"/>
              <RxBtn label="Ibuprofene 400mg PO"/>
              <RxBtn label="Diffu-K 1 gel PO"/>
              <RxBtn label="Acupan 20mg PO"/>
              <RxBtn label="Tramadol 50mg PO"/>
              <RxBtn label="Tramadol 100mg PO"/>
            </div>
          </Section>

          <Section id="antalgiques_iv" label="Antalgiques IV" icon="💉">
            <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
              <RxBtn label={`Perfalgan ${dosePerfalgan}mg IV (${poids<50?'poids <50kg':'dose adulte'})`} texte={`Perfalgan ${dosePerfalgan}mg IV en 15min`}/>
              <RxBtn label="Ketoprofene 100mg IV lente"/>
              <RxBtn label="IPP IV (Omeprazole 40mg)"/>
              <RxBtn label="Acupan 20mg IV lente"/>
            </div>
          </Section>

          <Section id="morphine" label="Titration morphine IV" icon="🔴">
            <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:8,padding:'10px',marginBottom:10,fontSize:12,color:'#dc2626'}}>
              <div style={{fontWeight:700,marginBottom:6}}>Protocole titration morphine</div>
              <div>Dilution : 10mg + 9mL NaCl = <b>1mg/mL</b></div>
              <div>Bolus : <b>{Math.round((poids*0.05)*10)/10}mg</b> (0.05mg/kg) toutes les <b>5 min</b></div>
              <div>Conditions : scope + SpO2 ≥93% + O2 3L + Ramsay ≤1</div>
              <div>Arret : EN ≤3 ou somnolence</div>
              <div style={{fontWeight:700,marginTop:4}}>Alerter medecin si dose cumulee &gt;15mg</div>
              <div style={{marginTop:4}}>Antidote : <b>Naloxone</b> prete a proximite</div>
            </div>
            <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
              <RxBtn label={`Morphine titration IV : bolus ${Math.round(poids*0.05*10)/10}mg/5min (0.05mg/kg)`} color="#ef4444"
                texte={`Titration morphine IV : bolus ${Math.round(poids*0.05*10)/10}mg toutes les 5min jusqu'a EN≤3. Diluer 10mg morphine dans 9mL NaCl (1mg/mL). Scope obligatoire. Naloxone prete.`}/>
              <RxBtn label="Scoper + SpO2 + O2 3L min pour morphine" color="#ef4444"/>
              <RxBtn label="Naloxone prete a proximite" color="#ef4444"/>
            </div>
          </Section>

          <Section id="autres" label="Autres actes" icon="🩹">
            <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
              <RxBtn label="MEOPA 15 minutes"/>
              <RxBtn label="Pansement : nettoyage + parage plaie"/>
              <RxBtn label="Pansement post-suture"/>
              <RxBtn label="PSE Ketamine (protocole en cours)" color="#8b5cf6"/>
              <RxBtn label="VNI (parametres en cours)" color="#8b5cf6"/>
            </div>
          </Section>

        </div>
      </div>
    </div>
  );
}
