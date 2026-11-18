// Fotos dos jogadores: buscadas uma vez e guardadas (não vêm no ranking,
// para não pesar a cada atualização).
import { rpc } from './db.js';
import { fotoSrc } from './avatares.js';

const cache = {};
let buscando = null, ultimaBusca = 0;

export async function garantirFotos(salaId, ids) {
  const faltam = ids.filter((id) => id && !(id in cache));
  if (!faltam.length || buscando) return buscando;
  if (Date.now() - ultimaBusca < 2000) return;
  ultimaBusca = Date.now();
  buscando = rpc('fotos_sala', { p_sala: salaId })
    .then((m) => { for (const [id, img] of Object.entries(m || {})) cache[id] = fotoSrc(img); })
    .catch((e) => console.warn('Não foi possível buscar as fotos dos jogadores (rode o arquivo 08 no Supabase):', e.message))
    .finally(() => { buscando = null; });
  return buscando;
}

// reserva: o avatar pronto ('preset:N') que vem junto com o ranking/mercado
export const foto = (id, reserva) => cache[id] || fotoSrc(reserva || null);
export const todasFotos = () => cache;
export function fotosComReserva(lista) {
  const m = { ...cache };
  for (const [id, f] of lista) if (id && !m[id] && f) m[id] = fotoSrc(f);
  return m;
}
