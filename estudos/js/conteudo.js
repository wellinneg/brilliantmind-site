export async function carregarIndice() {
  const r = await fetch('conteudo/indice.json', { cache: 'no-cache' });
  if (!r.ok) throw new Error('Não encontrei o índice de conteúdo.');
  return r.json();
}
export async function carregarDia(ano, dia) {
  const r = await fetch(`conteudo/${ano}/dia-${String(dia).padStart(2, '0')}.json`);
  if (!r.ok) throw new Error(`Conteúdo do dia ${dia} não encontrado. Conecte à internet e tente de novo.`);
  return r.json();
}
