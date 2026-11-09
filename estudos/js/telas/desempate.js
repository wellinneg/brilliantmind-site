// ⚔️ Desempate de território (#/desempate/<lugar>): Tabuada relâmpago de 60 s, a MESMA tabuada para
// todos (6º e 8º disputam em pé de igualdade). Contra o Magnata: passar a pontuação dele.
// Contra o irmão: cada um joga uma vez; quando os dois jogarem, quem fez mais fica com o lugar.
import { el, navegar } from '../ui.js';
import { CAMADAS, lerJogo, RIVAL } from '../jogo.js';
import { corrida, contaDeTabuada } from '../minijogos/rapidos.js';
import { situacaoDesempate, registrarDesempate, DESEMPATE } from '../desempate.js';
import { lerFamilia, sincronizar } from '../familia.js';
import { confete } from '../efeitos.js';
import { sons } from '../sons.js';

export async function render(raiz, [id]) {
  if ((await lerFamilia())?.codigo) await sincronizar().catch(() => {});
  const jogo = await lerJogo();
  const t = CAMADAS.flatMap(c => c.territorios).find(x => x.id === id);
  if (!t) { navegar('#/mapa'); return; }
  const voltar = el('button', { class: 'voltar', onclick: () => navegar(`#/lugar/${t.id}`) }, `← ${t.icone} ${t.nome}`);
  const s = situacaoDesempate(jogo, t);
  raiz.append(voltar, el('h1', {}, `⚔️ Desempate: ${t.icone} ${t.nome}`));
  if (!s.empate || !s.euNoEmpate) {
    raiz.append(el('p', {}, 'Este lugar não está empatado com você agora.'), el('button', { class: 'botao grande', onclick: () => navegar(`#/lugar/${t.id}`) }, 'Voltar ao lugar'));
    return;
  }
  if (s.eu.jogou) { raiz.append(quadro(s)); return; }

  const area = el('div', { class: 'area-jogo' });
  const adversarios = s.participantes.filter(p => !p.eu).map(p => (p.magnata ? `${RIVAL.icone} ${RIVAL.nome} (${p.pontos} contas)` : `⭐ ${p.nome}`)).join(' e ');
  raiz.append(
    el('section', { class: 'cartao' },
      el('p', {}, `Empate em ${s.notas} notas com ${adversarios}.`),
      el('p', { class: 'dica' }, `Tabuada relâmpago: ${DESEMPATE.tempo} segundos, a mesma para todos. Você só joga uma vez por empate, então capriche!`),
      el('button', { class: 'botao grande', onclick: () => { sons.camada(); comecar(); } }, '⚔️ Começar a disputa')),
    area);

  function comecar() {
    raiz.querySelector('.cartao')?.remove();
    corrida(area, {
      tempo: DESEMPATE.tempo,
      proxima: () => contaDeTabuada(false),
      aoFim: async ({ acertos }) => {
        await registrarDesempate(t, acertos);
        if ((await lerFamilia())?.codigo) await sincronizar().catch(() => {});
        const depois = situacaoDesempate(await lerJogo(), t);
        area.replaceChildren(el('p', { class: 'celebracao' }, `⏰ Tempo! Você acertou ${acertos} contas.`), quadro(depois.empate ? depois : null, t, acertos));
      },
    });
  }
}

function quadro(s, t = null, acertos = null) {
  if (!s) {   // o empate acabou de ser resolvido (eu venci e já tirei a nota)
    sons.camada(); confete();
    return el('section', { class: 'cartao' }, el('p', { class: 'conquista-nova' }, `🏆 Você venceu o desempate! ${t ? `${t.icone} ${t.nome} agora é seu.` : ''}`),
      el('button', { class: 'botao grande', onclick: () => history.back() }, 'Voltar'));
  }
  const linhas = s.participantes.map(p => el('tr', { class: p.eu ? 'linha-eu' : '' },
    el('td', {}, p.magnata ? `${RIVAL.icone} ${RIVAL.nome}` : (p.eu ? `${p.nome} (você)` : `⭐ ${p.nome}`)),
    el('td', {}, p.jogou ? `${p.pontos} contas` : '⏳ ainda não jogou')));
  let msg;
  if (!s.todosJogaram) msg = 'Agora é esperar o seu irmão jogar. Quando ele terminar, o vencedor fica com o lugar.';
  else if (s.vencedor?.eu) msg = '🏆 Você venceu! O lugar fica com você na próxima sincronização.';
  else if (s.vencedor?.magnata) msg = `${RIVAL.icone} O ${RIVAL.nome} ganhou desta vez. O lugar continua empatado: tente de novo quando o empate mudar.`;
  else msg = `⭐ ${s.vencedor?.nome} venceu o desempate e fica com o lugar.`;
  if (s.vencedor && !s.vencedor.eu) sons.erro();
  return el('section', { class: 'cartao' }, el('table', { class: 'tabela' }, el('tr', {}, el('th', {}, 'Quem'), el('th', {}, 'Resultado')), linhas),
    el('p', {}, msg), el('button', { class: 'botao', onclick: () => history.back() }, 'Voltar'));
}
