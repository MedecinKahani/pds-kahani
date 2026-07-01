import { getAudit } from '@/lib/audit';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return Response.json({ error: 'id requis' }, { status: 400 });

    const historique = await getAudit(id);
    return Response.json({ historique });
  } catch (e) {
    return Response.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
