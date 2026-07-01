import { kv } from '@vercel/kv';

// Une panne est identifiée par sa date (YYYY-MM-DD) et son créneau : 'jour' (7h-19h) ou 'nuit' (19h-7h le lendemain)

export async function GET() {
  try {
    const keys = await kv.keys('panne:*');
    if (!keys.length) return Response.json({ pannes: [] });
    const vals = await Promise.all(keys.map(k => kv.get(k)));
    const pannes = vals.filter(Boolean).sort((a, b) => (b.ts || 0) - (a.ts || 0));
    return Response.json({ pannes });
  } catch {
    return Response.json({ pannes: [] });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { date, creneau, par } = body;
    if (!date || !['jour', 'nuit'].includes(creneau)) {
      return Response.json({ error: 'Paramètres invalides' }, { status: 400 });
    }
    const data = { date, creneau, par: par || '?', ts: Date.now() };
    await kv.set(`panne:${date}:${creneau}`, data);
    return Response.json({ ok: true, panne: data });
  } catch {
    return Response.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { date, creneau } = await req.json();
    if (!date || !creneau) return Response.json({ error: 'Paramètres invalides' }, { status: 400 });
    await kv.del(`panne:${date}:${creneau}`);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
