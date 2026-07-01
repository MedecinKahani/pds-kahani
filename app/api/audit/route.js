import { getAudit } from '@/lib/audit';
import { getSession } from '@/lib/auth-server';

export async function GET(req) {
  try {
    const session = getSession();
    if (!session) return Response.json({ error: 'Non authentifié' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return Response.json({ error: 'id requis' }, { status: 400 });

    const historique = await getAudit(id);
    return Response.json({ historique });
  } catch (e) {
    return Response.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
