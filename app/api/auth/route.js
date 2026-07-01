import { kv } from '@vercel/kv';
import { cookies } from 'next/headers';
import { creerJetonSession } from '@/lib/session';
import { SESSION_COOKIE } from '@/lib/auth-server';

export async function POST(req) {
  try {
    const { matricule } = await req.json();
    if (!matricule) return Response.json({ error: 'Matricule requis' }, { status: 400 });

    const user = await kv.hgetall(`user:${matricule.toUpperCase()}`);
    if (!user) return Response.json({ error: 'Matricule non reconnu' }, { status: 401 });

    const sessionUser = { matricule: matricule.toUpperCase(), role: user.role, nom: user.nom };
    const token = creerJetonSession(sessionUser);

    cookies().set(SESSION_COOKIE, token, {
      httpOnly: true, // inaccessible en JS côté navigateur, protège contre le vol via XSS
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 12 * 60 * 60, // 12h, aligné sur la durée du jeton
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
