// Tela do Banco Brilliant (#/banco): aplicar na Selic do jogo e resgatar.
import { el, aviso, navegar } from '../ui.js';
import { lerJogo, gravarJogo } from '../jogo.js';
import { SELIC, simular, aplicar, resgatar, aplicacoesAtivas } from '../banco.js';
import { exibir, hojeISO, somarDias } from '../datas.js';
import { sons } from '../sons.js';
import { confete } from '../efeitos.js';

export async function render(raiz) {
  const jogo = await lerJogo();
  const hoje = hojeISO();
  const ativas = aplicacoesAtivas(jogo, hoje);
  const totalAplicado = ativas.reduce((s, a) => s + a.valor, 0);
  const valeHoje = ativas.reduce((s, a) => s + a.valorHoje, 0);
  const redesenhar = () => dispatchEvent(new HashChangeEvent('hashchange'));

  raiz.append(
    el('button', { class: 'voltar', onclick: () => navegar('#/mapa') }, '← 🗺️ Mapa'),
    el('div', { class: 'banco-topo' },
      el('h1', {}, '🏦 Banco Brilliant'),
      el('p', { class: 'selic-taxa' }, 'Selic do jogo: ', el('strong', {}, '1% por semana'))),
    el('div', { class: 'banco-saldos' },
      el('div', {}, el('small', {}, 'Carteira'), el('strong', {}, `🪙 ${jogo.carteira}`)),
      el('div', {}, el('small', {}, 'Aplicado'), el('strong', {}, `🏦 ${totalAplicado}`)),
      el('div', {}, el('small', {}, 'Vale hoje'), el('strong', { class: 'entrada' }, `📈 ${valeHoje}`))));

  // aplicações em andamento
  if (ativas.length) {
    raiz.append(el('h2', {}, 'Minhas aplicações'));
    for (const a of ativas.sort((x, y) => x.vencimento.localeCompare(y.vencimento))) {
      const pct = Math.round(((a.prazo - a.faltam) / a.prazo) * 100);
      const noVencimento = simular(a.valor, a.prazo);
      raiz.append(el('section', { class: `cartao aplicacao ${a.vencida ? 'vencida' : ''}` },
        el('div', { class: 'linha-aplicacao' },
          el('strong', {}, `${a.prazo} dias · aplicou 🪙 ${a.valor}`),
          el('span', { class: a.rendimento ? 'entrada' : '' }, `hoje vale ${a.valorHoje}`)),
        el('small', {}, `De ${exibir(a.inicio)} até ${exibir(a.vencimento)} · ${a.semanas} semana(s) rendendo`),
        el('div', { class: 'barra' }, el('div', { class: 'barra-cheia', style: `width:${pct}%` }),
          el('span', {}, a.vencida ? '✅ pronta para resgatar' : `faltam ${a.faltam} dia(s) · no fim: ${noVencimento.valor}`)),
        a.vencida
          ? el('button', { class: 'botao grande', onclick: async () => {
            const r = resgatar(jogo, a.id, hoje); await gravarJogo(jogo);
            sons.conquista(); confete(); aviso(`Resgatou ${r.recebe} 🪙 (rendimento +${r.rendimento})!`); redesenhar();
          } }, `💰 Resgatar ${a.valorHoje} 🪙`)
          : el('button', { class: 'link', onclick: async () => {
            if (!confirm(`Resgatar antes do vencimento devolve só os ${a.valor} aplicados, SEM rendimento. Se esperar até ${exibir(a.vencimento)}, recebe ${noVencimento.valor}. Resgatar mesmo assim?`)) return;
            resgatar(jogo, a.id, hoje); await gravarJogo(jogo); sons.erro(); aviso(`Resgatou ${a.valor} 🪙, sem rendimento.`); redesenhar();
          } }, 'Resgatar antes (perde o rendimento)')));
    }
  }

  // nova aplicação
  const campo = el('input', { id: 'valor-aplicar', type: 'number', inputmode: 'numeric', min: SELIC.minimo, max: jogo.carteira, step: 1, value: Math.min(jogo.carteira, Math.max(SELIC.minimo, Math.floor(jogo.carteira / 2))) });
  let prazo = 30;
  const opcoes = el('div', { class: 'prazos' });
  const desenharPrazos = () => {
    const v = Math.floor(Number(campo.value) || 0);
    opcoes.replaceChildren(...SELIC.prazos.map(p => {
      const sim = simular(v, p);
      return el('button', {
        class: `prazo ${p === prazo ? 'ativo' : ''}`, type: 'button',
        onclick: () => { prazo = p; desenharPrazos(); },
      }, el('strong', {}, `${p} dias`), el('small', {}, `vence ${exibir(somarDias(hoje, p))}`),
        el('span', { class: 'entrada' }, `recebe ${sim.valor}`), el('small', {}, `+${sim.rendimento} (${sim.semanas} semanas)`));
    }));
  };
  campo.addEventListener('input', desenharPrazos);
  desenharPrazos();
  const atalho = frac => el('button', { class: 'botao secundario pequeno', type: 'button', onclick: () => { campo.value = Math.max(SELIC.minimo, Math.floor(jogo.carteira * frac)); desenharPrazos(); } }, frac === 1 ? 'Tudo' : `${frac * 100}%`);

  raiz.append(el('section', { class: 'cartao' },
    el('h2', {}, '➕ Nova aplicação'),
    jogo.carteira < SELIC.minimo
      ? el('p', { class: 'dica' }, `Você precisa de pelo menos ${SELIC.minimo} 🪙 na carteira para aplicar. Faça as lições e os minijogos!`)
      : el('div', {},
        el('div', { class: 'campo' }, el('label', { for: 'valor-aplicar' }, `Quanto aplicar (mínimo ${SELIC.minimo}, você tem ${jogo.carteira})`), campo),
        el('div', { class: 'linha atalhos' }, atalho(0.25), atalho(0.5), atalho(1)),
        el('p', {}, 'Prazo para resgatar:'), opcoes,
        el('button', { class: 'botao grande', onclick: async () => {
          try {
            const ap = aplicar(jogo, campo.value, prazo, hoje); await gravarJogo(jogo);
            sons.compra(); aviso(`Aplicou ${ap.valor} 🪙 por ${prazo} dias. Resgate em ${exibir(ap.vencimento)}!`); redesenhar();
          } catch (e) { sons.erro(); aviso(e.message); }
        } }, '🏦 Aplicar')),
    el('details', { class: 'explica-selic' },
      el('summary', {}, '❓ O que é a Selic?'),
      el('p', {}, 'A Selic de verdade é a taxa básica de juros do Brasil, definida pelo Banco Central a cada 45 dias. Ela influencia quanto rendem os investimentos e quanto custam os empréstimos.'),
      el('p', {}, 'No jogo, para ficar rápido, o dinheiro aplicado rende 1% por semana, com juros sobre juros: cada semana rende 1% sobre o valor que já cresceu.'),
      el('p', {}, 'Quem espera o prazo ganha o rendimento; quem tira antes recebe só o que colocou. Na vida real também é assim em muitos investimentos!'))));
}
