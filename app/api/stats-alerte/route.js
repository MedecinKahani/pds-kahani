import { kv } from '@vercel/kv';

export async function GET() {
  try {
    const val = await kv.get('stats:alerte');
    const now = new Date();
    const isFirst = now.getDate() === 1;
    return Response.json({ alerte: val === true || isFirst });
  } catch {
    return Response.json({ alerte: false });
  }
}

export async function POST(req) {
  try {
    const { action } = await req.json();
    if (action === 'marquer_imprime') {
      await kv.set('stats:alerte', false);
      return Response.json({ ok: true });
    }
    if (action === 'activer') {
      await kv.set('stats:alerte', true);
      return Response.json({ ok: true });
    }
    return Response.json({ error: 'Action inconnue' }, { status: 400 });
  } catch {
    return Response.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
