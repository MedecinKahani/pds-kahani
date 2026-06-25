import { kv } from '@vercel/kv';

export async function POST(req) {
  try {
    const { matricule } = await req.json();
    if (!matricule) return Response.json({ error: 'Matricule requis' }, { status: 400 });

    const user = await kv.hgetall(`user:${matricule.toUpperCase()}`);
    if (!user) return Response.json({ error: 'Matricule non reconnu' }, { status: 401 });

    return Response.json({ ok: true, user: { matricule: matricule.toUpperCase(), role: user.role, nom: user.nom } });
  } catch (e) {
    return Response.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
