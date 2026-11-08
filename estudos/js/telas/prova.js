// ⚡ Prova surpresa (#/prova): 8 perguntas das lições dos últimos 3 dias da trilha, no nível que a
// criança escolheu em cada uma. Cada acerto vale 50% a mais do que na lição normal.
import { el, navegar } from '../ui.js';
import * as db from '../db.js';
import * as estado from '../estado.js';
import { DIFICULDADES, BONUS_PROVA } from '../rodizio.js';
import { carregarDia } from '../conteudo.js';
import { carregarContexto } from './hoje.js';
import { prepararQuiz } from '../quiz.js';
import { rodarQuiz } from '../quiz-ui.js';
import { comemorarJogo } from '../comemorar.js';
import { confete } from '../efeitos.js';

export const PERGUNTAS_PROVA = 8;

/** Sorteio repetível (mesma prova se fechar e abrir de novo no mesmo dia). */
function sorteador(semente) {
  let s = [...semente].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7) || 1;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

/** Monta a prova a partir dos dias de conteúdo (cada um com o nível que a criança escolheu). */
export function montarProva(dias, aleatorio) {
  const candidatas = [];
  for (const { conteudo, niveis } of dias) {
    conteudo.blocos.forEach((b, i) => {
      const nivel = niveis[i] || 'moderado';
      (b.quiz?.[nivel] || []).forEach(q => candidatas.push({ q, materia: b.materia, nivel, valor: (DIFICULDADES[nivel].pontos / 5) * BONUS_PROVA }));
    });
  }
  // mistura e evita mais de 2 perguntas do mesmo bloco seguidas no começo
  const misturadas = candidatas.map(c => [aleatorio(), c]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
  const porMateria = {};
  const escolhidas = [];
  for (const c of misturadas) {
    if (escolhidas.length === PERGUNTAS_PROVA) break;
    if ((porMateria[c.materia] || 0) >= 2) continue;   // variedade: no máximo 2 por matéria
    porMateria[c.materia] = (porMateria[c.materia] || 0) + 1;
    escolhidas.push(c);
  }
  for (const c of misturadas) { if (escolhidas.length >= PERGUNTAS_PROVA) break; if (!escolhidas.includes(c)) escolhidas.push(c); }
  return escolhidas;
}

export async function render(raiz) {
  const { reg, perfil } = await carregarContexto();
  if (!reg?.prova) { navegar('#/hoje'); return; }
  const registros = await db.listarDias();
  const dias = [];
  for (let d = Math.max(1, reg.diaConteudo - 2); d <= reg.diaConteudo; d++) {
    const conteudo = await carregarDia(perfil.ano, d).catch(() => null);
    if (!conteudo) continue;
    const feito = registros.filter(r => r.ano === perfil.ano && r.diaConteudo === d).sort((a, b) => b.data.localeCompare(a.data))[0];
    dias.push({ conteudo, niveis: (feito?.blocos || []).map(b => b.dificuldade) });
  }
  const provas = montarProva(dias, sorteador(reg.id));
  const area = el('div', {});
  raiz.append(
    el('button', { class: 'voltar', onclick: () => navegar('#/hoje') }, '← Voltar'),
    el('div', { class: 'prova-topo', style: 'background-image:url(midia/prova/tempestade.webp)' },
      el('span', { class: 'prova-raio' }, '⚡'),
      el('h1', {}, 'Prova surpresa!'),
      el('p', {}, `${provas.length} perguntas das lições dos últimos dias, no nível que você escolheu.`),
      el('p', { class: 'prova-bonus' }, 'Cada acerto vale 50% a mais 💵 · acertou tudo, +10')),
    area);
  if (reg.prova.feito) {
    area.append(el('div', { class: 'retorno certo' }, el('strong', {}, `Você já fez: ${reg.prova.nota} de ${reg.prova.total} · +${reg.prova.pontos} 💵`)),
      el('button', { class: 'botao secundario grande', onclick: iniciar }, 'Refazer (só treino)'));
  } else {
    area.append(el('button', { class: 'botao grande', onclick: iniciar }, '⚡ Começar a prova'));
  }

  function iniciar() {
    rodarQuiz(area, prepararQuiz(provas.map(p => p.q), { prova: reg.diaConteudo }), async ({ acertos, total, respostas }) => {
      const r = await estado.registrarProva(reg, provas, respostas);
      area.replaceChildren();
      if (r.treino) area.append(el('div', { class: 'retorno certo' }, el('strong', {}, `Treino: ${acertos} de ${total}.`)));
      else {
        if (r.acertos >= 5) confete();
        area.append(el('div', { class: 'celebracao' }, `Prova: ${r.acertos} de ${r.total}! +${r.pontos} 💵${r.perfeita ? ' · gabaritou! 🏆' : ''}`), comemorarJogo(r.jogo));
      }
      area.append(el('button', { class: 'botao grande', onclick: () => navegar('#/hoje') }, 'Voltar para Hoje'));
    });
  }
}
