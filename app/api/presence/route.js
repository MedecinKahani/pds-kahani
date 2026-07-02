import { kv } from '@vercel/kv';
import { getSession } from '@/lib/auth-server';

// Présence en temps réel : chaque poste envoie un battement toutes les ~20s,
// stocké avec une expiration courte (TTL Redis). Un agent qui ferme l'onglet
// ou perd la connexion disparaît automatiquement de la liste sans action
// manuelle. L'identité vient de la session signée serveur, jamais du client.
const TTL = 45; // secondes

export async function GET() {
  try {
    const session = getSession();
    if (!session) return Response.json({ error: 'Non authentifié' }, { status: 401 });

    const keys = await kv.keys('presence:*');
    const agents = keys.length ? await Promise.all(keys.map(k => kv.get(k))) : [];
    return Response.json({ agents: agents.filter(Boolean) });
  } catch (e) {
    return Response.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST() {
  try {
    const session = getSession();
    if (!session) return Response.json({ error: 'Non authentifié' }, { status: 401 });

    const entry = {
      matricule: session.matricule,
      nom: session.nom,
      role: session.role,
      lastSeen: Date.now(),
    };
    await kv.set(`presence:${session.matricule}`, entry, { ex: TTL });
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
