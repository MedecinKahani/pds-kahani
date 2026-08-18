import { kv } from '@vercel/kv';

// Endpoint de diagnostic TEMPORAIRE — à supprimer une fois le bug résolu.
export async function GET() {
  try {
    const now = new Date();
    const key = `stats:compteurs:${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    const val = await kv.get(key);
    return Response.json({
      key,
      exists: val !== null && val !== undefined,
      type: typeof val,
      raw: val,
    });
  } catch (e) {
    return Response.json({ error: String(e?.message || e), stack: e?.stack }, { status: 500 });
  }
}
