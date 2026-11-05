import { DIFICULDADES } from './rodizio.js';

export const PONTOS = { perfeito: 5, dia: 20 };

export function corrigir(q, resposta) {
  if (q.tipo === 'ordenar') return JSON.stringify(resposta) === JSON.stringify(q.itens);
  return resposta === q.correta;
}

export function embaralhar(lista, aleatorio = Math.random) {
  const a = [...lista];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(aleatorio() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function prepararQuestao(q, aleatorio) {
  if (q.tipo === 'ordenar') return { ...q, embaralhados: embaralhar(q.itens, aleatorio) };
  const ordem = embaralhar(q.alternativas.map((_, k) => k), aleatorio);
  return { ...q, alternativas: ordem.map(k => q.alternativas[k]), correta: ordem.indexOf(q.correta) };
}

export function prepararQuiz(quiz, origemBase, aleatorio = Math.random) {
  const comOrigem = quiz.map((q, j) => ({ ...q, origem: { ...origemBase, q: j } }));
  return embaralhar(comOrigem, aleatorio).map(q => prepararQuestao(q, aleatorio));
}

// Ajuda da revisão: 1 = dica; 2 = dica + 1 errada riscada (ou 1º item fixo); 3 = dica + 2.
export const nivelDeAjuda = voltas => Math.min((voltas || 0) + 1, 3);

export function aplicarAjuda(questoes, nivel, aleatorio = Math.random) {
  const tirar = Math.max(0, Math.min(nivel - 1, 2));
  return questoes.map(q => {
    const nova = { ...q, mostrarDica: nivel >= 1 };
    if (q.tipo === 'ordenar') nova.fixos = Math.min(tirar, q.itens.length - 1);
    else nova.riscadas = embaralhar(q.alternativas.map((_, k) => k).filter(k => k !== q.correta), aleatorio).slice(0, tirar);
    return nova;
  });
}

export function resultadoQuiz(acertos, total) {
  return { acertos, total, aprovado: acertos >= 3, perfeito: acertos === total };
}

export function pontosDoBloco(r, dificuldade, { bonusPerfeito = true } = {}) {
  if (!r.aprovado) return 0;
  return (DIFICULDADES[dificuldade]?.pontos || 0) + (bonusPerfeito && r.perfeito ? PONTOS.perfeito : 0);
}
