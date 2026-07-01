// Jeton de session signé (badge infalsifiable).
//
// Contrairement à l'ancien système (le navigateur "déclare" qui il est),
// ce jeton est signé cryptographiquement par le serveur au moment du login.
// Toute tentative de modification du contenu (matricule, rôle) invalide
// la signature — le serveur le détecte et rejette le jeton.
//
// Pas de dépendance externe (pas de JWT lib) : HMAC-SHA256 natif de Node.

import crypto from 'crypto';

const SECRET = process.env.SESSION_SECRET;
const DUREE_MS = 12 * 60 * 60 * 1000; // 12h, à ajuster selon la durée d'une garde

if (!SECRET && process.env.NODE_ENV === 'production') {
  // On ne bloque pas le démarrage, mais on alerte fort : sans secret dédié,
  // n'importe qui pourrait forger un jeton valide.
  console.error(
    'ATTENTION SÉCURITÉ : SESSION_SECRET non défini en production. ' +
    'Définissez une variable d\'environnement SESSION_SECRET (chaîne aléatoire longue).'
  );
}

const secretEffectif = SECRET || 'dev-secret-ne-pas-utiliser-en-prod';

function signer(payloadB64) {
  return crypto.createHmac('sha256', secretEffectif).update(payloadB64).digest('base64url');
}

export function creerJetonSession(user) {
  const payload = {
    matricule: user.matricule,
    role: user.role,
    nom: user.nom,
    iat: Date.now(),
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = signer(payloadB64);
  return `${payloadB64}.${signature}`;
}

export function verifierJetonSession(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;

  const [payloadB64, signature] = token.split('.');
  if (!payloadB64 || !signature) return null;

  const signatureAttendue = signer(payloadB64);
  const bufReçu = Buffer.from(signature);
  const bufAttendu = Buffer.from(signatureAttendue);

  // Comparaison à temps constant : évite qu'un attaquant devine la
  // signature octet par octet en mesurant le temps de réponse.
  if (bufReçu.length !== bufAttendu.length) return null;
  if (!crypto.timingSafeEqual(bufReçu, bufAttendu)) return null;

  let payload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  } catch {
    return null;
  }

  if (!payload.iat || Date.now() - payload.iat > DUREE_MS) return null; // expiré

  return payload;
}
