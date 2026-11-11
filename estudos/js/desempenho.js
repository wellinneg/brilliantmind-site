// 📊 Acerto dos filhos para o painel dos pais: percentual global e por matéria (1ª tentativa de cada lição).
// Deste celular: pelos registros guardados aqui. Dos irmãos: pelo resumo de estudo que chega pela família.
import { carregarDia } from './conteudo.js';

const vazio = () => ({ certas: 0, perguntas: 0, licoes: 0 });
const pct = g => (g.perguntas ? Math.round((g.certas / g.perguntas) * 100) : null);

function fechar(porMateria) {
  const global = vazio();
  const lista = Object.entries(porMateria).map(([materia, g]) => {
    global.certas += g.certas; global.perguntas += g.perguntas; global.licoes += g.licoes;
    return { materia, acerto: pct(g), licoes: g.licoes };
  }).sort((a, b) => b.licoes - a.licoes || a.materia.localeCompare(b.materia));
  return { global: pct(global), licoes: global.licoes, materias: lista };
}

/** Dos registros deste celular (cada bloco feito guarda a matéria e a nota de 0 a 5). */
export function desempenhoLocal(registros, ano) {
  const porMateria = {};
  for (const r of registros) {
    if (r.ano !== ano || r.continuadoEm) continue;   // dia continuado conta uma vez só
    for (const b of [...(r.blocos || []), ...(r.atrasadas || [])]) {
      if (!b.feito || !b.materia) continue;
      const g = (porMateria[b.materia] ||= vazio());
      g.certas += b.nota ?? 0; g.perguntas += b.total || 5; g.licoes += 1;
    }
  }
  return fechar(porMateria);
}

/** Do resumo de estudo de um irmão: [dia, bloco, nota, nível, passou, revisão]; a matéria sai do conteúdo. */
export async function desempenhoDoResumo(estudo, carregar = carregarDia) {
  if (!estudo?.ano || !estudo.blocos?.length) return fechar({});
  const porMateria = {}, cache = {};
  for (const [dia, bloco, nota, , , revisao] of estudo.blocos) {
    if (revisao) continue;                           // só a 1ª tentativa
    cache[dia] ||= carregar(estudo.ano, dia).catch(() => null);
    const materia = (await cache[dia])?.blocos?.[bloco]?.materia;
    if (!materia) continue;
    const g = (porMateria[materia] ||= vazio());
    g.certas += nota ?? 0; g.perguntas += 5; g.licoes += 1;
  }
  return fechar(porMateria);
}
