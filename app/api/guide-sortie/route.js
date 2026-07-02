import { kv } from '@vercel/kv';
import { getSession } from '@/lib/auth-server';

// Popup d'aide affiché au médecin lors de sa première sortie patient, pour lui
// indiquer où enregistrer le PDF de sortie (dossier partagé accessible à la
// secrétaire). Affiché une seule fois par médecin, sauf s'il demande à le
// revoir à la prochaine sortie.
export async function GET() {
  try {
    const session = getSession();
    if (!session) return Response.json({ error: 'Non authentifié' }, { status: 401 });
    if (session.role !== 'medecin') return Response.json({ afficher: false });

    const vu = await kv.get(`guide_sortie:${session.matricule}`);
    return Response.json({ afficher: !vu });
  } catch (e) {
    return Response.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const session = getSession();
    if (!session) return Response.json({ error: 'Non authentifié' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    if (body.revoir) {
      // L'utilisateur veut revoir le message à la prochaine sortie : on ne
      // marque rien comme vu, il réapparaîtra naturellement.
      await kv.del(`guide_sortie:${session.matricule}`);
    } else {
      await kv.set(`guide_sortie:${session.matricule}`, true);
    }
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
