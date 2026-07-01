// Compatibilité @vercel/kv -> ioredis (migration HDS)
//
// Comportement reproduit à l'identique par rapport à @vercel/kv :
// - get/set (clé -> valeur simple) : sérialisation/désérialisation JSON automatique,
//   pour préserver le fait que le code existant lit/écrit directement des objets,
//   tableaux et booléens (ex: kv.get('pharma:stocks') -> tableau).
// - hset/hgetall (hash) : PAS de sérialisation automatique, les champs sont stockés
//   tels quels (déjà le comportement natif d'ioredis). C'est cohérent avec le code
//   existant qui fait lui-même JSON.stringify/JSON.parse sur les champs 'actes' et
//   'prescriptions'.
// - hgetall renvoie null (et non un objet vide) quand la clé n'existe pas, pour
//   préserver les tests `if (patient) { ... }` déjà présents dans le code.
// - lpush/lrange : passthrough direct (le code existant stringifie déjà lui-même
//   avant lpush).

import { Redis } from 'ioredis';

const client = new Redis(process.env.REDIS_URL);

client.on('error', (err) => {
  console.error('Redis connection error:', err);
});

function tryParseJSON(value) {
  if (value === null || value === undefined) return null;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export const kv = {
  async get(key) {
    const val = await client.get(key);
    return tryParseJSON(val);
  },

  async set(key, value) {
    const toStore = typeof value === 'string' ? value : JSON.stringify(value);
    return client.set(key, toStore);
  },

  async hset(key, obj) {
    const flat = {};
    for (const [field, value] of Object.entries(obj)) {
      if (value === null || value === undefined) {
        flat[field] = '';
      } else if (typeof value === 'object') {
        flat[field] = JSON.stringify(value);
      } else {
        flat[field] = value;
      }
    }
    return client.hset(key, flat);
  },

  async hgetall(key) {
    const res = await client.hgetall(key);
    return Object.keys(res).length ? res : null;
  },

  async keys(pattern) {
    return client.keys(pattern);
  },

  async del(key) {
    return client.del(key);
  },

  async expire(key, seconds) {
    return client.expire(key, seconds);
  },

  async lpush(key, value) {
    return client.lpush(key, value);
  },

  async lrange(key, start, stop) {
    return client.lrange(key, start, stop);
  },
};

export default client;
