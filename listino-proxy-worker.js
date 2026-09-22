/*
 * Proxy personale per Listino — Cloudflare Worker (piano gratuito: 100.000 richieste al giorno)
 *
 * Come usarlo:
 * 1. dash.cloudflare.com → Workers & Pages → Create → Worker → Deploy
 * 2. Edit code, incolla tutto questo al posto del contenuto, Deploy
 * 3. Copia l'indirizzo del worker e in Listino: Impostazioni → Proxy → "Proxy personale"
 *    → incolla l'indirizzo con ?url= in fondo, per esempio:
 *    https://listino-proxy.tuonome.workers.dev/?url=
 *
 * Passa solo ai domini elencati qui sotto: non è un proxy aperto usabile da altri.
 */

const CONSENTITI = [
  'query1.finance.yahoo.com',
  'query2.finance.yahoo.com',
  'feeds.finance.yahoo.com',
  'news.google.com'
];

export default {
  async fetch(request) {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': '*'
    };

    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

    const destinazione = new URL(request.url).searchParams.get('url');
    if (!destinazione) {
      return new Response('Manca il parametro ?url=', { status: 400, headers: cors });
    }

    let target;
    try {
      target = new URL(destinazione);
    } catch (e) {
      return new Response('Indirizzo non valido', { status: 400, headers: cors });
    }

    if (target.protocol !== 'https:' || CONSENTITI.indexOf(target.hostname) === -1) {
      return new Response('Dominio non consentito', { status: 403, headers: cors });
    }

    try {
      const risposta = await fetch(target.toString(), {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Listino/1.0)' },
        /* 60 secondi di cache sul bordo: ricariche ravvicinate non ripartono da Yahoo */
        cf: { cacheTtl: 60, cacheEverything: true }
      });

      const corpo = await risposta.arrayBuffer();
      return new Response(corpo, {
        status: risposta.status,
        headers: Object.assign({}, cors, {
          'Content-Type': risposta.headers.get('Content-Type') || 'application/json',
          'Cache-Control': 'public, max-age=60'
        })
      });
    } catch (e) {
      return new Response('Origine non raggiungibile', { status: 502, headers: cors });
    }
  }
};
