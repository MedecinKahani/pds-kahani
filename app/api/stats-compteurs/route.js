import { kv } from '@/lib/kv';

export async function GET() {
  try {
    const now = new Date();
    const compteurs = {};
    for (let i = 0; i <= 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `stats:compteurs:${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      const moisKey = `${d.getFullYear()}-${d.getMonth()}`;
      const val = await kv.get(key);
      if (val) compteurs[moisKey] = val;
    }
    return Response.json({ compteurs });
  } catch {
    return Response.json({ compteurs: {} });
  }
}
