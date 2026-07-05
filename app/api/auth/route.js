import { kv } from '@vercel/kv';
import { cookies } from 'next/headers';
import { creerJetonSession } from '@/lib/session';
import { SESSION_COOKIE } from '@/lib/auth-server';

const MAX_TENTATIVES = 10;
const FENETRE_SECONDES = 15 * 60; // 15 minutes

function getIp(req) {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'inconnu';
}

export async function POST(req) {
  try {
    const ip = getIp(req);
    const cleTentatives = `login_fail:${ip}`;

    // Blocage temporaire si trop de tentatives ratées récemment depuis cette IP
    const tentatives = await kv.get(cleTentatives);
    if (tentatives && tentatives >= MAX_TENTATIVES) {
      return Response.json(
        { error: 'Trop de tentatives. Réessayez dans quelques minutes.' },
        { status: 429 }
      );
    }

    const { matricule } = await req.json();
    if (!matricule) return Response.json({ error: 'Matricule requis' }, { status: 400 });

    const user = await kv.hgetall(`user:${matricule.toUpperCase()}`);
    if (!user) {
      // Tentative ratée : incrémente le compteur, avec expiration si c'est la première
      const nouveauCompte = await kv.incr(cleTentatives);
      if (nouveauCompte === 1) await kv.expire(cleTentatives, FENETRE_SECONDES);
      return Response.json({ error: 'Matricule non reconnu' }, { status: 401 });
    }

    // Connexion réussie : on efface le compteur d'échecs pour cette IP
    await kv.del(cleTentatives);

    const sessionUser = { matricule: matricule.toUpperCase(), role: user.role, nom: user.nom };
    const token = creerJetonSession(sessionUser);

    cookies().set(SESSION_COOKIE, token, {
      httpOnly: true, // inaccessible en JS côté navigateur, protège contre le vol via XSS
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 24h, aligné sur la durée du jeton
      path: '/',
    });

    return Response.json({ ok: true, user: sessionUser });
  } catch (e) {
    return Response.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// Déconnexion : supprime le cookie de session côté serveur.
export async function DELETE() {
  cookies().delete(SESSION_COOKIE);
  return Response.json({ ok: true });
}
