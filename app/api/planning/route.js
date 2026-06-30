import { Redis } from '@upstash/redis';
const redis = Redis.fromEnv();

const STANDS_DEFAUT = {
  pansement: { label: 'Pansement', icon: '🩹', couleur: '#f59e0b', dureeMin: 20, strict: false,
    jours: [0,1,2,3,4,5,6],
    horaires: { debut: '08:00', fin: '18:00' } },
  bio: { label: 'Prélèvement bio', icon: '🧪', couleur: '#3b82f6', dureeMin: 60, strict: false,
    jours: [1,2,3,4,5],
    horaires: { debut: '09:00', fin: '12:00' },
    capacitePlace: 5 }, // 5 places par heure, 9h/10h/11h
  vaccin: { label: 'Vaccin', icon: '💉', couleur: '#16a34a', dureeMin: 0, strict: false,
    jours: [3,4,5],
    horaires: { debut: '12:00', fin: '12:00' }, // créneau unique groupé
    nbCreneaux: 1, capacitePlace: 5 },
  k2: { label: 'K2 — Consultation aiguë', icon: '🩺', couleur: '#dc2626', dureeMin: 15, strict: true,
    jours: [1,2,3,4,5],
    horaires: { debut: '13:00', fin: '17:00' }, barrableK2: true },
  chronique: { label: 'Consultation chronique', icon: '📋', couleur: '#7c3aed', dureeMin: 60, strict: false,
    jours: [1,2,3,4,5],
    horaires: { debut: '07:00', fin: '13:00' }, capacitePlace: 4, barrableIPA: true, barrableMed: true },
};

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');

  if (action === 'config') {
    const stored = await redis.get('planning:config');
    const config = stored ? (typeof stored === 'string' ? JSON.parse(stored) : stored) : STANDS_DEFAUT;
    return Response.json({ config });
  }

  if (action === 'semaine') {
    const debut = searchParams.get('debut'); // YYYY-MM-DD lundi de la semaine
    const keys = await redis.keys(`rdv:${debut?.slice(0,7)}*`);
    if (!keys.length) return Response.json({ rdv: [] });
    const vals = await Promise.all(keys.map(k => redis.get(k)));
    const rdv = vals.map(v => typeof v === 'string' ? JSON.parse(v) : v).filter(Boolean);
    return Response.json({ rdv });
  }

  if (action === 'modulation') {
    const stored = await redis.get('planning:modulation');
    const modulation = stored ? (typeof stored === 'string' ? JSON.parse(stored) : stored) : {};
    return Response.json({ modulation });
  }

  if (action === 'jours_barres') {
    const stored = await redis.get('planning:jours_barres');
    const barres = stored ? (typeof stored === 'string' ? JSON.parse(stored) : stored) : {};
    return Response.json({ barres });
  }

  return Response.json({ error: 'action inconnue' }, { status: 400 });
}

export async function POST(req) {
  const data = await req.json();

  if (data.action === 'reserver') {
    const id = `rdv:${data.date}:${data.stand}:${data.heure}:${Date.now()}`;
    const rdv = {
      id, date: data.date, stand: data.stand, heure: data.heure,
      nom: data.nom, prenom: data.prenom, ddn: data.ddn || '', ipp: data.ipp || '',
      motif: data.motif || '', creePar: data.creePar, creeParNom: data.creeParNom,
      ts: Date.now(),
    };
    await redis.set(id, JSON.stringify(rdv), { ex: 90 * 24 * 3600 }); // 90 jours
    return Response.json({ ok: true, rdv });
  }

  if (data.action === 'annuler') {
    await redis.del(data.id);
    return Response.json({ ok: true });
  }

  if (data.action === 'set_config') {
    await redis.set('planning:config', JSON.stringify(data.config));
    return Response.json({ ok: true });
  }

  if (data.action === 'set_modulation') {
    // { mois: 'YYYY-MM', stand: 'chronique', nbCreneaux: N }
    const stored = await redis.get('planning:modulation');
    const modulation = stored ? (typeof stored === 'string' ? JSON.parse(stored) : stored) : {};
    const key = data.mois + ':' + data.stand;
    modulation[key] = data.nbCreneaux;
    await redis.set('planning:modulation', JSON.stringify(modulation));
    return Response.json({ ok: true, modulation });
  }

  if (data.action === 'toggle_jour_barre') {
    // { date: 'YYYY-MM-DD', stand: 'chronique_med' }
    const stored = await redis.get('planning:jours_barres');
    const barres = stored ? (typeof stored === 'string' ? JSON.parse(stored) : stored) : {};
    const key = data.stand + ':' + data.date;
    if (barres[key]) delete barres[key];
    else barres[key] = true;
    await redis.set('planning:jours_barres', JSON.stringify(barres));
    return Response.json({ ok: true, barres });
  }

  return Response.json({ error: 'action inconnue' }, { status: 400 });
}
