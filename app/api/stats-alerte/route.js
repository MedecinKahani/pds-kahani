import { kv } from '@/lib/kv';

export async function GET() {
  try {
    const now = new Date();
    const isFirst = now.getDate() === 1;
    const alerte = await kv.get('stats:alerte');
    const impressions = await kv.get('stats:impressions') || {};
    return Response.json({ alerte: alerte === true || isFirst, impressions });
  } catch {
    return Response.json({ alerte: false, impressions: {} });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    if (body.action === 'marquer_imprime') {
      await kv.set('stats:alerte', false);
      await kv.set('stats:impressions', body.impressions || {});
      return Response.json({ ok: true });
    }
    return Response.json({ error: 'Action inconnue' }, { status: 400 });
  } catch {
    return Response.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
