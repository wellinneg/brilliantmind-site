// 📅 Calendário do mês para acompanhar: cada dia mostra se estudou (completo), começou (incompleto),
// faltou (dia de semana sem estudo) ou foi fim de semana. Toque num dia para ver o resumo.
import { el } from './ui.js';
import { hojeISO, exibir } from './datas.js';
import { ANOS } from './rodizio.js';

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const dois = n => String(n).padStart(2, '0');

/** Situação de cada data: 'completo' | 'incompleto' (estudou parte) e os registros do dia. */
export function situacaoPorData(registros) {
  const mapa = {};
  for (const r of registros) {
    const m = (mapa[r.data] ||= { registros: [], pontos: 0 });
    m.registros.push(r);
    m.pontos += r.pontos || 0;
    const fez = r.fechado || r.blocos?.some(b => b.feito);
    if (r.fechado) m.estado = 'completo';
    else if (fez && m.estado !== 'completo') m.estado = 'incompleto';
  }
  return mapa;
}

/** Monta o calendário de `ano-mes` ("2026-11"). `inicio` = 1ª data com estudo (antes dela não conta falta). */
export function desenharCalendario(registros, mes = hojeISO().slice(0, 7), aoMudarMes) {
  const hoje = hojeISO();
  const situacao = situacaoPorData(registros);
  const datas = Object.keys(situacao).sort();
  const inicio = datas[0] || hoje;
  const [a, m] = mes.split('-').map(Number);
  const primeiro = new Date(a, m - 1, 1).getDay();
  const diasNoMes = new Date(a, m, 0).getDate();
  const detalhe = el('div', { class: 'detalhe-dia' });
  const celulas = [];
  for (let k = 0; k < primeiro; k++) celulas.push(el('span', { class: 'dia-cal vazio' }));
  let completos = 0, faltas = 0;
  for (let d = 1; d <= diasNoMes; d++) {
    const data = `${a}-${dois(m)}-${dois(d)}`;
    const sem = new Date(a, m - 1, d).getDay();
    const fds = sem === 0 || sem === 6;
    const s = situacao[data];
    let estado = s?.estado || (fds ? 'fds' : (data < hoje && data >= inicio ? 'falta' : 'nada'));
    if (estado === 'completo') completos++;
    if (estado === 'falta') faltas++;
    const icone = { completo: '✅', incompleto: '⏳', falta: '✖', fds: '', nada: '' }[estado];
    celulas.push(el('button', {
      class: `dia-cal ${estado} ${data === hoje ? 'hoje' : ''}`, type: 'button', 'aria-label': exibir(data),
      onclick: () => mostrar(data, s, estado),
    }, el('b', {}, d), el('small', {}, icone)));
  }
  function mostrar(data, s, estado) {
    if (!s) {
      detalhe.replaceChildren(el('p', {}, `${exibir(data)}: ${estado === 'falta' ? 'não estudou ✖' : estado === 'fds' ? 'fim de semana' : 'sem registro'}.`));
      return;
    }
    detalhe.replaceChildren(el('p', {}, el('strong', {}, exibir(data)), ` · ${estado === 'completo' ? '✅ dia completo' : '⏳ começou, não terminou'} · ⭐ ${s.pontos} pontos`),
      ...s.registros.map(r => el('p', { class: 'dica' },
        `${ANOS[r.ano] || r.ano}, dia ${r.diaConteudo} da trilha · blocos ${r.blocos.filter(b => b.feito).length}/${r.blocos.length}`,
        r.ouvir ? ` · 🎧 ${r.ouvir.feito ? '✔' : '—'}` : '', r.prova?.feito ? ` · ⚡ prova ${r.prova.nota}/${r.prova.total}` : '',
        r.continuadoEm ? ` · continuou em ${exibir(r.continuadoEm)}` : '')));
  }
  const ant = `${m === 1 ? a - 1 : a}-${dois(m === 1 ? 12 : m - 1)}`;
  const prox = `${m === 12 ? a + 1 : a}-${dois(m === 12 ? 1 : m + 1)}`;
  return el('section', { class: 'cartao calendario' },
    el('div', { class: 'cal-topo' },
      el('button', { class: 'botao secundario pequeno', type: 'button', onclick: () => aoMudarMes?.(ant) }, '‹'),
      el('h2', {}, `📅 ${MESES[m - 1][0].toUpperCase()}${MESES[m - 1].slice(1)} de ${a}`),
      el('button', { class: 'botao secundario pequeno', type: 'button', disabled: prox > hoje.slice(0, 7), onclick: () => aoMudarMes?.(prox) }, '›')),
    el('div', { class: 'grade-cal' }, SEMANA.map(s => el('span', { class: 'cab-cal' }, s)), celulas),
    el('p', { class: 'legenda-cal' }, `✅ completo · ⏳ começou · ✖ faltou · este mês: ${completos} completo(s), ${faltas} falta(s)`),
    detalhe);
}

/** Calendário que troca de mês sozinho (para pôr em qualquer tela). */
export function calendarioInterativo(registros) {
  const caixa = el('div', {});
  const ir = mes => caixa.replaceChildren(desenharCalendario(registros, mes, ir));
  ir(hojeISO().slice(0, 7));
  return caixa;
}
