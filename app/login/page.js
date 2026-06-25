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
    setChargement(true);
    setErreur('');
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matricule: matricule.trim() })
      });
      const data = await res.json();
      if (!res.ok) {
        setErreur(data.error || 'Matricule non reconnu');
        setChargement(false);
        return;
      }
      sessionStorage.setItem('pds_user', JSON.stringify(data.user));
      if (data.user.role === 'as') router.push('/as');
      else if (data.user.role === 'ide') router.push('/ide');
      else if (data.user.role === 'medecin') router.push('/medecin');
    } catch {
      setErreur('Erreur de connexion');
      setChargement(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#0f172a', padding: '1rem'
    }}>
      <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🏥</div>
        <h1 style={{ color: '#fff', fontSize: 28, fontWeight: 700, letterSpacing: '-0.5px' }}>PDS Kahani</h1>
        <p style={{ color: '#94a3b8', fontSize: 15, marginTop: 6 }}>Permanence de soins — CMR Kahani</p>
      </div>

      <form onSubmit={handleLogin} style={{
        background: '#1e293b', borderRadius: 16, padding: '2rem',
        width: '100%', maxWidth: 360, border: '1px solid #334155'
      }}>
        <label style={{ display: 'block', color: '#cbd5e1', fontSize: 14, marginBottom: 8, fontWeight: 500 }}>
          Matricule
        </label>
        <input
          type="text"
          value={matricule}
          onChange={e => setMatricule(e.target.value.toUpperCase())}
          placeholder="Ex: 123456"
          autoFocus
          style={{
            width: '100%', padding: '14px 16px', borderRadius: 10,
            border: erreur ? '2px solid #ef4444' : '1px solid #334155',
            background: '#0f172a', color: '#fff', fontSize: 20,
            letterSpacing: 4, textAlign: 'center', outline: 'none',
            marginBottom: 16
          }}
        />
        {erreur && (
          <div style={{
            background: '#450a0a', border: '1px solid #b91c1c',
            borderRadius: 8, padding: '10px 14px',
            color: '#fca5a5', fontSize: 14, marginBottom: 16, textAlign: 'center'
          }}>
            {erreur}
          </div>
        )}
        <button
          type="submit"
          disabled={chargement || !matricule.trim()}
          style={{
            width: '100%', padding: '14px', borderRadius: 10,
            background: chargement || !matricule.trim() ? '#334155' : '#3b82f6',
            color: '#fff', fontSize: 16, fontWeight: 600,
            transition: 'background 0.2s', cursor: chargement ? 'wait' : 'pointer'
          }}
        >
          {chargement ? 'Connexion...' : 'Se connecter'}
        </button>
      </form>

      <p style={{ color: '#475569', fontSize: 12, marginTop: 24 }}>
        CMR Kahani — Mayotte — v1.0
      </p>
    </div>
  );
}
