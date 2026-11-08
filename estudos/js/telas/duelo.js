// ⚔️ Duelo (#/duelo): contra um irmão (ao vivo, pelo Firebase) ou contra o Magnata (treino).
import { el, aviso, navegar } from '../ui.js';
import { lerJogo, gravarJogo, RIVAL } from '../jogo.js';
import { lerFamilia, sincronizar, firebaseConfigurado } from '../familia.js';
import { desenharHeroi } from '../herois.js';
import {
  DUELO, perguntasDoDuelo, pontuar, resultado, respostasDoMagnata, novoDuelo, aceitarConvite,
  conviteParaMim, premiarDuelo,
} from '../duelo.js';
import { registrarEvento } from '../missoes.js';
import { situacao } from '../minijogos/motor.js';
import { carregarContexto } from './hoje.js';
import { sons } from '../sons.js';
import { confete, pop } from '../efeitos.js';

let tique = null;                       // um laço de atualização por vez
const parar = () => { clearInterval(tique); tique = null; };
addEventListener('hashchange', () => { if (!location.hash.startsWith('#/duelo')) parar(); });
const espera = ms => new Promise(r => setTimeout(r, ms));

export async function render(raiz) {
  parar();
  const familia = await lerFamilia();
  const temFamilia = !!(familia?.codigo && firebaseConfigurado());
  if (temFamilia) await sincronizar().catch(() => {});
  const jogo = await lerJogo();
  raiz.append(el('button', { class: 'voltar', onclick: () => navegar('#/jogos') }, '← 🎮 Jogos'), el('h1', {}, '⚔️ Duelo'));
  if (!jogo.heroi) { raiz.append(el('p', {}, 'Escolha seu animal primeiro.')); return; }
  let reg = null;
  try { ({ reg } = await carregarContexto()); } catch { /* sem conteúdo */ }
  if (!(await situacao(reg)).liberado) {
    raiz.append(el('section', { class: 'cartao' }, el('p', {}, '🔒 O duelo libera depois que você termina os blocos de lição de hoje.'),
      el('button', { class: 'botao grande', onclick: () => navegar('#/hoje') }, 'Ir para as lições de hoje')));
    return;
  }
  const area = el('div', {});
  raiz.append(area);

  // duelo em andamento com irmão: retoma
  if (jogo.duelo && !jogo.duelo.contra && jogo.duelo.estado !== 'fim' && Date.now() - jogo.duelo.criado < DUELO.validadeConvite) {
    return jogo.duelo.estado === 'convite' ? esperarAceite(area) : jogar(area, false);
  }

  const convite = temFamilia ? conviteParaMim(jogo) : null;
  if (convite) {
    area.append(el('section', { class: 'cartao convite-duelo' },
      el('div', { class: 'linha-duelo' }, desenharHeroi(convite.heroi, {}, 'medio'), el('strong', {}, `⚔️ ${convite.apelido} desafiou você!`)),
      el('p', { class: 'dica' }, '10 perguntas iguais para os dois, ao mesmo tempo. Acerto vale 10; rapidez dá até +5.'),
      el('button', { class: 'botao grande', onclick: async () => {
        const j = await lerJogo(); j.duelo = aceitarConvite(convite.duelo); await gravarJogo(j);
        sincronizar().catch(() => {});
        jogar(area, false);
      } }, '⚔️ Aceitar o desafio')));
  }
  const irmaos = Object.entries(jogo.outros || {});
  area.append(el('section', { class: 'cartao' },
    el('h2', {}, '👨‍👩‍👧 Desafiar irmão'),
    !temFamilia ? el('p', { class: 'dica' }, 'Liguem a família (Pais → Disputa da família) para duelar ao vivo entre irmãos.')
      : !irmaos.length ? el('p', { class: 'dica' }, 'Ainda não há irmão na família. No outro celular, entre com o mesmo código.')
        : el('div', {}, irmaos.map(([uid, o]) => el('button', { class: 'botao grande linha-duelo', onclick: async () => {
          const j = await lerJogo();
          j.duelo = novoDuelo({ eu: j.uid, adversario: uid });
          await gravarJogo(j); await sincronizar().catch(() => {});
          esperarAceite(area);
        } }, desenharHeroi(o.heroi, o.usando, 'pequeno'), `Desafiar ${o.apelido}`)))),
  el('section', { class: 'cartao' },
    el('h2', {}, `${RIVAL.icone} Treino contra o ${RIVAL.nome}`),
    el('p', { class: 'dica' }, 'Funciona sem internet. O Magnata responde sozinho e erra às vezes.'),
    el('button', { class: 'botao secundario grande', onclick: async () => {
      const j = await lerJogo();
      j.duelo = { ...novoDuelo({ eu: 'eu', adversario: RIVAL.id }), estado: 'jogando', contra: RIVAL.id };
      await gravarJogo(j);
      jogar(area, true);
    } }, `⚔️ Duelar contra o ${RIVAL.nome}`)),
  el('p', { class: 'dica' }, `Prêmio: vitória +${DUELO.premio.vitoria} 💵 · empate +${DUELO.premio.empate} · derrota +${DUELO.premio.derrota}. Até ${DUELO.premiadosPorDia} duelos premiados por dia.`));
}

/** Desafiei: espero o irmão aceitar (atualiza a cada 3 s). */
function esperarAceite(area) {
  const status = el('p', { class: 'dica' }, 'Esperando o irmão aceitar… (peça para ele abrir Jogos → Duelo)');
  area.replaceChildren(el('section', { class: 'cartao' }, el('h2', {}, '⏳ Desafio enviado!'), status,
    el('button', { class: 'link', onclick: async () => { parar(); const j = await lerJogo(); j.duelo = null; await gravarJogo(j); sincronizar().catch(() => {}); dispatchEvent(new HashChangeEvent('hashchange')); } }, 'Cancelar desafio')));
  tique = setInterval(async () => {
    await sincronizar().catch(() => {});
    const j = await lerJogo();
    const adv = j.outros?.[j.duelo?.para];
    if (adv?.duelo?.id === j.duelo?.id && adv.duelo.estado !== 'convite') {
      parar(); j.duelo.estado = 'jogando'; await gravarJogo(j); sons.roubo(); jogar(area, false);
    } else if (Date.now() - (j.duelo?.criado || 0) > DUELO.validadeConvite) {
      parar(); status.textContent = 'O convite expirou. Tente de novo mais tarde.';
    }
  }, 3000);
}

/** A partida: as mesmas 10 perguntas; placar do adversário ao vivo. */
async function jogar(area, contraMagnata) {
  let jogo = await lerJogo();
  const d = jogo.duelo;
  const perguntas = perguntasDoDuelo(d.semente);
  const advUid = contraMagnata ? null : (d.de === jogo.uid ? d.para : d.de);
  const adv = contraMagnata ? { apelido: RIVAL.nome, heroi: null } : jogo.outros?.[advUid] || { apelido: 'Irmão' };
  const magnata = contraMagnata ? respostasDoMagnata(d.semente) : null;
  const inicio = Date.now();
  let respostasAdv = [];
  const placarEu = el('strong', {}, '0'), placarAdv = el('strong', {}, '0');
  const progEu = el('small', {}, `0/${DUELO.perguntas}`), progAdv = el('small', {}, `0/${DUELO.perguntas}`);
  const palco = el('div', {});
  area.replaceChildren(
    el('div', { class: 'placar-duelo' },
      el('div', { class: 'lado-duelo' }, desenharHeroi(jogo.heroi, jogo.usando, 'medio'), el('span', {}, jogo.apelido || 'Você'), placarEu, progEu),
      el('div', { class: 'versus' }, 'VS'),
      el('div', { class: 'lado-duelo' }, adv.heroi ? desenharHeroi(adv.heroi, adv.usando, 'medio') : el('div', { class: 'magnata-pequeno' }, RIVAL.icone), el('span', {}, adv.apelido), placarAdv, progAdv)),
    palco);

  const atualizarAdv = () => {
    placarAdv.textContent = String(pontuar(respostasAdv));
    progAdv.textContent = `${respostasAdv.length}/${DUELO.perguntas}`;
  };
  // adversário ao vivo: Magnata no relógio; irmão pela internet a cada 2 s
  tique = setInterval(async () => {
    if (contraMagnata) {
      let t = 0; respostasAdv = magnata.filter(r => (t += r.ms) <= Date.now() - inicio);
      atualizarAdv();
    } else {
      await sincronizar().catch(() => {});
      const j = await lerJogo();
      const dd = j.outros?.[advUid]?.duelo;
      if (dd?.id === d.id) { respostasAdv = dd.respostas || []; atualizarAdv(); }
    }
  }, contraMagnata ? 500 : 2000);

  let i = (d.respostas || []).length;
  const minhas = [...(d.respostas || [])];
  placarEu.textContent = String(pontuar(minhas)); progEu.textContent = `${minhas.length}/${DUELO.perguntas}`;
  const proxima = () => {
    if (i >= perguntas.length) return terminar();
    const q = perguntas[i];
    const t0 = Date.now();
    const botoes = q.opcoes.map((op, k) => el('button', { class: 'alternativa', type: 'button', onclick: async () => {
      botoes.forEach(b => { b.disabled = true; });
      const certo = k === q.correta;
      botoes[q.correta].classList.add('certa'); if (!certo) botoes[k].classList.add('errada');
      const r = { certo, ms: Date.now() - t0 };
      minhas.push(r); i++;
      placarEu.textContent = String(pontuar(minhas)); progEu.textContent = `${minhas.length}/${DUELO.perguntas}`;
      if (certo) { sons.moeda(); pop(placarEu); } else sons.erro();
      const j = await lerJogo(); j.duelo.respostas = minhas; if (i >= perguntas.length) j.duelo.estado = 'fim'; await gravarJogo(j);
      if (!contraMagnata) sincronizar().catch(() => {});
      setTimeout(proxima, certo ? 350 : 900);
    } }, op));
    palco.replaceChildren(el('p', { class: 'contador' }, `Pergunta ${i + 1} de ${perguntas.length}`),
      el('h2', {}, q.texto), el('div', { class: 'alternativas' }, botoes));
  };

  async function terminar() {
    palco.replaceChildren(el('p', { class: 'dica' }, `Você terminou! Esperando ${adv.apelido} terminar…`));
    const fimEspera = Date.now() + DUELO.esperaFinal;
    while (respostasAdv.length < DUELO.perguntas && Date.now() < fimEspera) await espera(1000);
    parar();
    if (contraMagnata) respostasAdv = magnata;
    atualizarAdv();
    const r = resultado(minhas, respostasAdv);
    const premio = await premiarDuelo(r.fim);
    await registrarEvento('duelo', { fim: r.fim });
    if (r.fim === 'vitoria') { sons.camada(); confete(); } else if (r.fim === 'empate') sons.moeda(); else sons.erro();
    palco.replaceChildren(el('div', { class: r.fim === 'derrota' ? 'retorno errado' : 'celebracao' },
      r.fim === 'vitoria' ? `🏆 Você venceu! ${r.meus} a ${r.deles}` : r.fim === 'empate' ? `🤝 Empate! ${r.meus} a ${r.deles}` : `${adv.apelido} venceu desta vez: ${r.deles} a ${r.meus}`),
      premio.notas ? el('p', { class: 'conquista-nova' }, `+${premio.notas} 💵`) : el('p', { class: 'dica' }, `Os ${DUELO.premiadosPorDia} duelos premiados de hoje já foram. Este valeu pela diversão!`),
      el('button', { class: 'botao grande', onclick: () => dispatchEvent(new HashChangeEvent('hashchange')) }, '⚔️ Novo duelo'));
  }
  proxima();
}
