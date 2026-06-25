import { kv } from '@vercel/kv';

function genId() {
  return 'pt_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
}

export async function GET() {
  try {
    const keys = await kv.keys('patient:*');
    if (!keys.length) return Response.json({ patients: [] });
    const patients = await Promise.all(keys.map(k => kv.hgetall(k)));
    const sorted = patients.filter(Boolean).sort((a, b) => (a.arrivee || 0) - (b.arrivee || 0));
    return Response.json({ patients: sorted });
  } catch (e) {
    return Response.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'create') {
      const id = genId();
      const patient = {
        id,
        arrivee: Date.now(),
        statut: 'attente_medecin',
        ...body.patient
      };
      await kv.hset(`patient:${id}`, patient);
      const all = await getAllPatients();
      return Response.json({ ok: true, id, patients: all });
    }

    if (action === 'update') {
      const { id, patch } = body;
      await kv.hset(`patient:${id}`, patch);
      const all = await getAllPatients();
      return Response.json({ ok: true, patients: all });
    }

    if (action === 'discharge') {
      const { id } = body;
      const patient = await kv.hgetall(`patient:${id}`);
      if (patient) {
        patient.sortie = Date.now();
        patient.statut = 'sorti';
        await kv.hset(`archive:${id}`, patient);
        await kv.del(`patient:${id}`);
      }
      const all = await getAllPatients();
      return Response.json({ ok: true, patients: all });
    }

    if (action === 'addActe') {
      const { id, acte } = body;
      const patient = await kv.hgetall(`patient:${id}`);
      const actes = patient.actes ? JSON.parse(patient.actes) : [];
      actes.push({ ...acte, heure: Date.now() });
      await kv.hset(`patient:${id}`, { actes: JSON.stringify(actes) });
      const all = await getAllPatients();
      return Response.json({ ok: true, patients: all });
    }

    if (action === 'addPrescription') {
      const { id, prescription } = body;
      const patient = await kv.hgetall(`patient:${id}`);
      const prescriptions = patient.prescriptions ? JSON.parse(patient.prescriptions) : [];
      prescriptions.push({ ...prescription, heure: Date.now() });
      await kv.hset(`patient:${id}`, { prescriptions: JSON.stringify(prescriptions) });
      const all = await getAllPatients();
      return Response.json({ ok: true, patients: all });
    }

    return Response.json({ error: 'Action inconnue' }, { status: 400 });
  } catch (e) {
    console.error(e);
    return Response.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

async function getAllPatients() {
  const keys = await kv.keys('patient:*');
  if (!keys.length) return [];
  const patients = await Promise.all(keys.map(k => kv.hgetall(k)));
  return patients.filter(Boolean).sort((a, b) => (a.arrivee || 0) - (b.arrivee || 0));
}
