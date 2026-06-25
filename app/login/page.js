'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Login() {
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
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matricule: matricule.trim() })
      });
      const data = await res.json();
      if (!res.ok) { setErreur(data.error || 'Matricule non reconnu'); setChargement(false); return; }
      sessionStorage.setItem('pds_user', JSON.stringify(data.user));
      if (data.user.role === 'as') router.push('/as');
      else if (data.user.role === 'ide') router.push('/ide');
      else if (data.user.role === 'medecin') router.push('/medecin');
    } catch { setErreur('Erreur de connexion'); setChargement(false); }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'linear-gradient(135deg, #f0fdfa 0%, #e0f2fe 100%)',
      padding: '1rem'
    }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: '#0d9488', display: 'flex', alignItems: 'center',
            justifyContent: 'center', margin: '0 auto 1rem',
            boxShadow: '0 8px 24px rgba(13,148,136,0.3)'
          }}>
            <span style={{ fontSize: 28 }}>🏥</span>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', letterSpacing: '-0.5px' }}>
            PDS Kahani
          </h1>
          <p style={{ color: '#6b7280', fontSize: 14, marginTop: 4 }}>
            Permanence de soins — CMR Kahani
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: '#fff', borderRadius: 16,
          padding: '2rem', boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
          border: '1px solid #e5e7eb'
        }}>
          <form onSubmit={handleLogin}>
            <label style={{ display: 'block', fontWeight: 600, color: '#374151', marginBottom: 8 }}>
              Votre matricule
            </label>
            <input
              type="text"
              value={matricule}
              onChange={e => setMatricule(e.target.value.toUpperCase())}
              placeholder="Ex : 023799"
              autoFocus
              style={{
                width: '100%', padding: '14px 16px',
                borderRadius: 10, border: erreur ? '2px solid #ef4444' : '1.5px solid #e5e7eb',
                background: '#f9fafb', color: '#111827',
                fontSize: 22, letterSpacing: 6, textAlign: 'center',
                outline: 'none', marginBottom: 16,
                transition: 'border-color 0.2s'
              }}
              onFocus={e => { if (!erreur) e.target.style.borderColor = '#0d9488'; }}
              onBlur={e => { if (!erreur) e.target.style.borderColor = '#e5e7eb'; }}
            />

            {erreur && (
              <div style={{
                background: '#fef2f2', border: '1px solid #fecaca',
                borderRadius: 8, padding: '10px 14px',
                color: '#dc2626', fontSize: 13, marginBottom: 16, textAlign: 'center'
              }}>
                {erreur}
              </div>
            )}

            <button type="submit" disabled={chargement || !matricule.trim()} style={{
              width: '100%', padding: 14, borderRadius: 10,
              background: chargement || !matricule.trim() ? '#e5e7eb' : '#0d9488',
              color: chargement || !matricule.trim() ? '#9ca3af' : '#fff',
              fontSize: 15, fontWeight: 600, transition: 'all 0.2s'
            }}>
              {chargement ? 'Connexion...' : 'Se connecter →'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: 12, marginTop: 24 }}>
          CMR Kahani · Mayotte · v1.0
        </p>
      </div>
    </div>
  );
}
