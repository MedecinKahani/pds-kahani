// Journal d'audit des dossiers patients.
//
// Trace qui a fait quoi et quand sur un dossier (création, modification,
// sortie, prescriptions...). Stocké séparément des données patient dans
// une liste Redis dédiée, jamais purgée en même temps que le dossier lui-même
// (utile même après archivage/suppression du patient).
//
// LIMITE CONNUE : l'identité ("matricule") vient de ce que le client envoie
// dans la requête. Tant qu'il n'y a pas de session serveur vérifiée, ce
// journal est un historique utile mais pas une preuve infalsifiable.

import { kv } from '@vercel/kv';

export async function logAudit(patientId, action, matricule, details = {}) {
  try {
    const entry = {
      ts: Date.now(),
      matricule: matricule || 'inconnu',
      action,
      details,
    };
    await kv.lpush(`audit:patient:${patientId}`, JSON.stringify(entry));
  } catch (e) {
    // Un incident de journalisation ne doit jamais bloquer un acte médical.
    console.error('logAudit error', e);
  }
}

export async function getAudit(patientId) {
  const raw = await kv.lrange(`audit:patient:${patientId}`, 0, -1);
  return raw
    .map((r) => {
      try {
        return JSON.parse(r);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}
