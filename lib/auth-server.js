// Helper pour lire la session vérifiée dans une route API (App Router).
//
// À utiliser dans chaque route sensible :
//   const session = getSession();
//   if (!session) return Response.json({ error: 'Non authentifié' }, { status: 401 });
//   // session.matricule, session.role, session.nom sont fiables (signés serveur)

import { cookies } from 'next/headers';
import { verifierJetonSession } from './session';

export const SESSION_COOKIE = 'pds_session';

export function getSession() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  return verifierJetonSession(token);
}
