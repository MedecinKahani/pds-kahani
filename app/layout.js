'use client';
import { useEffect } from 'react';
import './globals.css';

export default function RootLayout({ children }) {
  // Présence temps réel : un seul point centralisé, actif sur TOUTES les pages
  // (pas seulement /vueglobale). Ainsi un IDE/AS/médecin est détecté "connecté"
  // quelle que soit la page qu'il utilise réellement. Si la session n'est pas
  // authentifiée (ex: page /login), l'API renvoie une 401 silencieuse — sans
  // conséquence, pas de bruit dans la console.
  useEffect(() => {
    function battement() {
      fetch('/api/presence', { method: 'POST' }).catch(() => {});
    }
    battement();
    const iv = setInterval(battement, 20000);
    return () => clearInterval(iv);
  }, []);

  return (
    <html lang="fr">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>PDS Kahani</title>
      </head>
      <body>{children}</body>
    </html>
  );
}
