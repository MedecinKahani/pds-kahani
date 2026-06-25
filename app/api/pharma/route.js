import { kv } from '@vercel/kv';

const MEDICAMENTS_DEFAUT = [
  { id: 'morphine', nom: 'Morphine 10mg/mL', unite: 'ampoules', stock: 0 },
  { id: 'midazolam', nom: 'Midazolam 5mg/mL', unite: 'ampoules', stock: 0 },
  { id: 'ketamine', nom: 'Kétamine 500mg', unite: 'flacons', stock: 0 },
  { id: 'naloxone', nom: 'Naloxone 0.4mg', unite: 'ampoules', stock: 0 },
  { id: 'diazepam', nom: 'Diazépam 10mg', unite: 'ampoules', stock: 0 },
  { id: 'adre1', nom: 'Adrénaline 1mg', unite: 'ampoules', stock: 0 },
  { id: 'atropine', nom: 'Atropine 1mg', unite: 'ampoules', stock: 0 },
];

export async function GET() {
  try {
    const stocks = await kv.get('pharma:stocks');
    const mouvements = await kv.lrange('pharma:mouvements', 0, 49);
    return Response.json({
      stocks: stocks || MEDICAMENTS_DEFAUT,
      mouvements: mouvements || []
    });
  } catch (e) {
    return Response.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'sortie') {
      const { medId, quantite, patientId, patientNom, matricule, motif } = body;
      const stocks = await kv.get('pharma:stocks') || MEDICAMENTS_DEFAUT;
      const idx = stocks.findIndex(m => m.id === medId);
      if (idx === -1) return Response.json({ error: 'Médicament inconnu' }, { status: 404 });
      if (stocks[idx].stock < quantite) return Response.json({ error: 'Stock insuffisant' }, { status: 400 });
      stocks[idx].stock -= quantite;
      await kv.set('pharma:stocks', stocks);
      const mvt = { heure: Date.now(), type: 'sortie', medId, nom: stocks[idx].nom, quantite, patientId, patientNom, matricule, motif };
      await kv.lpush('pharma:mouvements', JSON.stringify(mvt));
      return Response.json({ ok: true, stocks });
    }

    if (action === 'entree') {
      const { medId, quantite, matricule } = body;
      const stocks = await kv.get('pharma:stocks') || MEDICAMENTS_DEFAUT;
      const idx = stocks.findIndex(m => m.id === medId);
      if (idx === -1) return Response.json({ error: 'Médicament inconnu' }, { status: 404 });
      stocks[idx].stock += quantite;
      await kv.set('pharma:stocks', stocks);
      const mvt = { heure: Date.now(), type: 'entree', medId, nom: stocks[idx].nom, quantite, matricule };
      await kv.lpush('pharma:mouvements', JSON.stringify(mvt));
      return Response.json({ ok: true, stocks });
    }

    return Response.json({ error: 'Action inconnue' }, { status: 400 });
  } catch (e) {
    return Response.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
