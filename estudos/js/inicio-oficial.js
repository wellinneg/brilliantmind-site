// 🚀 Começo oficial da Trilha. Até a véspera é só demonstração; no 1º dia oficial, cada celular
// zera o progresso sozinho, uma única vez. Ficam só as configurações: nome e série (perfil),
// senha dos pais e a ligação com a família (o registro na internet é sobrescrito na próxima sincronização).
import * as db from './db.js';
import { hojeISO } from './datas.js';

export const INICIO_OFICIAL = '2026-11-09';
const MANTER = ['perfil', 'pinHash', 'familia', 'semFamilia'];
const MARCA = 'inicioOficial';

/** Zera o progresso da demonstração se hoje já é o dia oficial e ainda não zerou. Devolve true se zerou. */
export async function zerarDemonstracaoSePreciso(hoje = hojeISO()) {
  if (hoje < INICIO_OFICIAL) return false;
  if ((await db.lerConfig(MARCA)) === INICIO_OFICIAL) return false;
  const guardar = [];
  for (const chave of MANTER) {
    const valor = await db.lerConfig(chave);
    if (valor !== undefined) guardar.push([chave, valor]);
  }
  await db.apagarTudo();
  for (const [chave, valor] of guardar) await db.gravarConfig(chave, valor);
  await db.gravarConfig(MARCA, INICIO_OFICIAL);
  return true;
}
