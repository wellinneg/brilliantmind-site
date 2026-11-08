export async function carregarIndice() {
  const r = await fetch('conteudo/indice.json', { cache: 'no-cache' });
  if (!r.ok) throw new Error('Não encontrei o índice de conteúdo.');
  return r.json();
}
export async function carregarDia(ano, dia) {
  const r = await fetch(`conteudo/${ano}/dia-${String(dia).padStart(2, '0')}.json`, { cache: 'no-cache' });   // sempre confere se mudou
  if (!r.ok) throw new Error(`Conteúdo do dia ${dia} não encontrado. Conecte à internet e tente de novo.`);
  return r.json();
}

/** Episódio do 🎧 Ouvir (história/tema narrado). */
export async function carregarEpisodio(ep) {
  const r = await fetch(`conteudo/ouvir/ep-${String(ep).padStart(2, '0')}.json`, { cache: 'no-cache' });
  if (!r.ok) throw new Error('Episódio não encontrado. Conecte à internet e tente de novo.');
  return r.json();
}
