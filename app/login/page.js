'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const ROLES = [
  { id:'as',      label:'Aide-soignant', icon:'🩺', color:'#f59e0b', bg:'#fffbeb', border:'#fde68a' },
  { id:'ide',     label:'Infirmier',     icon:'💉', color:'#3b82f6', bg:'#eff6ff', border:'#bfdbfe' },
  { id:'medecin', label:'Medecin',       icon:'👨‍⚕️', color:'#0d9488', bg:'#f0fdfa', border:'#99f6e4' },
];

export default function Login() {
  const [roleChoisi, setRoleChoisi] = useState(null);
  const [matricule, setMatricule] = useState('');
  const [erreur, setErreur] = useState('');
  const [chargement, setChargement] = useState(false);
  const router = useRouter();

  async function handleLogin(e) {
    e.preventDefault();
    if (!matricule.trim()) return;
    setChargement(true); setErreur('');
    try {
      const res = await fetch('/api/auth', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ matricule: matricule.trim() })
      });
      const data = await res.json();
      if (!res.ok) { setErreur(data.error || 'Matricule non reconnu'); setChargement(false); return; }

      sessionStorage.setItem('pds_user', JSON.stringify(data.user));
      const role = data.user.role;

      if (role === 'as') router.push('/medecin');
      else if (role === 'ide') router.push('/medecin');
      else if (role === 'medecin') router.push('/medecin');
      else if (role === 'cadre' || role === 'chef') router.push('/medecin');
      else { setErreur('Role non reconnu'); setChargement(false); }
    } catch { setErreur('Erreur de connexion'); setChargement(false); }
  }

  const role = ROLES.find(r => r.id === roleChoisi);

  return (
    <div style={{minHeight:'100vh',background:'linear-gradient(135deg, #f0fdfa 0%, #eff6ff 100%)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'1.5rem',fontFamily:'system-ui'}}>

      <div style={{marginBottom:'2rem',textAlign:'center'}}>
        <div style={{width:56,height:56,borderRadius:'50%',background:'#0d9488',display:'flex',alignItems:'center',justifyContent:'center',fontSize:26,margin:'0 auto 12px',boxShadow:'0 8px 24px rgba(13,148,136,0.25)'}}>+</div>
        <h1 style={{fontSize:22,fontWeight:700,color:'#111827',letterSpacing:'-0.5px'}}>PDS Kahani</h1>
        <p style={{color:'#6b7280',fontSize:13,marginTop:4}}>Permanence de soins — CMR Kahani</p>
      </div>

      {!roleChoisi ? (
        <div style={{width:'100%',maxWidth:480}}>
          <p style={{textAlign:'center',color:'#6b7280',fontSize:13,marginBottom:16}}>Qui etes-vous ?</p>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            {ROLES.map(r => (
              <button key={r.id} onClick={()=>setRoleChoisi(r.id)} style={{
                background:r.bg, border:'2px solid '+r.border, borderRadius:14,
                padding:'1.25rem 1rem', display:'flex', flexDirection:'column',
                alignItems:'center', gap:8, cursor:'pointer',
                transition:'transform 0.1s, box-shadow 0.1s',
              }}
              onMouseEnter={e=>{e.currentTarget.style.transform='scale(1.02)';e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,0.08)';}}
              onMouseLeave={e=>{e.currentTarget.style.transform='scale(1)';e.currentTarget.style.boxShadow='none';}}>
                <span style={{fontSize:28}}>{r.icon}</span>
                <span style={{fontSize:13,fontWeight:600,color:r.color}}>{r.label}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div style={{width:'100%',maxWidth:360}}>
          <button onClick={()=>{setRoleChoisi(null);setMatricule('');setErreur('');}}
            style={{display:'flex',alignItems:'center',gap:6,color:'#6b7280',fontSize:13,background:'none',cursor:'pointer',marginBottom:16,padding:0}}>
            <span style={{fontSize:16}}>←</span> Retour
          </button>

          <div style={{background:'#fff',borderRadius:16,padding:'2rem',boxShadow:'0 4px 24px rgba(0,0,0,0.07)',border:'1px solid #e5e7eb'}}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:20,padding:'10px 14px',background:role.bg,borderRadius:10,border:'1px solid '+role.border}}>
              <span style={{fontSize:22}}>{role.icon}</span>
              <span style={{fontWeight:600,color:role.color,fontSize:14}}>{role.label}</span>
            </div>

            <form onSubmit={handleLogin}>
              <label style={{display:'block',fontWeight:600,color:'#374151',fontSize:13,marginBottom:8}}>
                Votre matricule
              </label>
              <input
                type="text" value={matricule}
                onChange={e=>setMatricule(e.target.value.toUpperCase())}
                placeholder="Ex : 023799" autoFocus
                style={{
                  width:'100%', padding:'14px 16px', borderRadius:10,
                  border:erreur?'2px solid #ef4444':'1.5px solid #e5e7eb',
                  fontSize:22, letterSpacing:6, textAlign:'center',
                  outline:'none', marginBottom:14, boxSizing:'border-box',
                  background:'#f9fafb', color:'#111827'
                }}
                onFocus={e=>{if(!erreur)e.target.style.borderColor=role.color;}}
                onBlur={e=>{if(!erreur)e.target.style.borderColor='#e5e7eb';}}
              />
              {erreur && (
                <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:8,padding:'8px 12px',color:'#dc2626',fontSize:13,marginBottom:14,textAlign:'center'}}>
                  {erreur}
                </div>
              )}
              <button type="submit" disabled={chargement||!matricule.trim()} style={{
                width:'100%', padding:'13px', borderRadius:10,
                background:chargement||!matricule.trim()?'#e5e7eb':role.color,
                color:chargement||!matricule.trim()?'#9ca3af':'#fff',
                fontSize:14, fontWeight:600, cursor:'pointer', transition:'background 0.2s'
              }}>
                {chargement ? 'Connexion...' : 'Se connecter'}
              </button>
            </form>
          </div>
        </div>
      )}

      <p style={{color:'#9ca3af',fontSize:11,marginTop:24}}>CMR Kahani · Mayotte · v1.0</p>
    </div>
  );
}
