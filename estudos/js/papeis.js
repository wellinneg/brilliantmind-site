// 👨‍👩‍👧 Quem é quem na família: Filho ou Pai/Mãe. Os pais classificam em 🔒 Pais → Família.
// Pai/Mãe continua com lições e jogo, só sem a lição escrita (caderno + foto).
// Cada celular só grava o próprio registro: a classificação de OUTRO celular vai em `papeis` do meu
// registro ({ uid: { papel, em } }); cada celular lê e aplica a mais recente sobre ele mesmo.
import { lerJogo, gravarJogo } from './jogo.js';

export const PAPEIS = { filho: '🎒 Filho', pai: '👨‍👩‍👧 Pai/Mãe' };
const maisRecente = lista => lista.filter(x => x?.papel).sort((a, b) => (b.em || 0) - (a.em || 0))[0] || null;

/** O papel deste celular (vale a decisão mais recente, minha ou de quem me classificou). */
export function meuPapel(jogo) {
  const de = Object.values(jogo.outros || {}).map(o => o?.papeis?.[jogo.uid]);
  return maisRecente([jogo.meuPapel, ...de])?.papel || 'filho';
}

/** O papel de outro celular da família, do jeito que eu enxergo. */
export function papelDe(jogo, uid) {
  const de = Object.entries(jogo.outros || {}).filter(([id]) => id !== uid).map(([, o]) => o?.papeis?.[uid]);
  return maisRecente([jogo.papeis?.[uid], jogo.outros?.[uid]?.papel, ...de])?.papel || 'filho';
}

/** Define o papel de alguém (`'eu'` = este celular). */
export async function definirPapel(quem, papel, agora = Date.now()) {
  const jogo = await lerJogo();
  const marca = { papel, em: agora };
  if (quem === 'eu' || quem === jogo.uid) jogo.meuPapel = marca;
  else jogo.papeis = { ...(jogo.papeis || {}), [quem]: marca };
  await gravarJogo(jogo);
  return jogo;
}

export const semEscrita = jogo => meuPapel(jogo) === 'pai';
