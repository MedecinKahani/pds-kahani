import { kv } from '@vercel/kv';

export async function GET() {
  try {
    const keys = await kv.keys('user:*');
    if (!keys.length) return Response.json({ users: [] });
    const users = await Promise.all(keys.map(async k => {
      const u = await kv.hgetall(k);
      return { ...u, matricule: k.replace('user:', '') };
    }));
    return Response.json({ users: users.filter(Boolean) });
  } catch (e) {
    return Response.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { action, matricule, nom, role } = await req.json();
    if (action === 'add') {
      await kv.hset(`user:${matricule.toUpperCase()}`, { nom, role });
      return Response.json({ ok: true });
    }
    if (action === 'delete') {
      await kv.del(`user:${matricule.toUpperCase()}`);
      return Response.json({ ok: true });
    }
    return Response.json({ error: 'Action inconnue' }, { status: 400 });
  } catch (e) {
    return Response.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
