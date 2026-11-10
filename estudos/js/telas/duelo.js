// ⚔️ Duelo (#/duelo): contra um irmão AO VIVO (Firebase) ou treino contra o Magnata.
// Convite com jogo + horário → o irmão aceita ou recusa → na hora marcada, com os dois na tela,
// contagem de 1 minuto → os dois jogam ao mesmo tempo, cada um na sua tela.
// Jogos de pontos: vence quem fizer mais. Jogos de terminar: quem terminar primeiro vence e a
// partida acaba na hora para os dois. Dá para cancelar, recusar e desistir.
import { el, aviso, navegar } from '../ui.js';
import { CAMADAS, lerJogo, gravarJogo, RIVAL } from '../jogo.js';
import { lerFamilia, sincronizar, firebaseConfigurado } from '../familia.js';
import { desenharHeroi } from '../herois.js';
import {
  DUELO, JOGOS_DUELO, perguntasDoDuelo, rodadasDoDuelo, pontuar, resultadoPorPontos, respostasDoMagnata, acertosDoMagnata,
  tempoDoMagnata, novoDuelo, aceitarConvite, conviteParaMim, faseDaSala, vencedorTerminar, premiarDuelo, sorteador,
} from '../duelo.js';
import { registrarEvento } from '../missoes.js';
import { situacao, definirGanchoDuelo } from '../minijogos/motor.js';
import { corrida } from '../minijogos/rapidos.js';
import { carregarContexto } from './hoje.js';
import { sons } from '../sons.js';
import { confete, pop } from '../efeitos.js';

const MODULOS_TERMINAR = {
  palavras: () => import('../minijogos/palavras.js'),
  memoria: () => import('../minijogos/memoria.js'),
  pares: () => import('../minijogos/logica.js').then(m => ({ iniciar: m.ligarPares })),
  objetos: () => import('../minijogos/objetos.js'),
};

let timers = [];
const parar = () => { timers.forEach(t => clearInterval(t)); timers = []; definirGanchoDuelo(null); };
const repetir = (fn, ms) => { const t = setInterval(fn, ms); timers.push(t); return t; };
addEventListener('hashchange', () => { if (!location.hash.startsWith('#/duelo')) parar(); });
const espera = ms => new Promise(r => setTimeout(r, ms));
const hora = ts => new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
const mmss = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const advDe = (jogo, d) => (d.de === jogo.uid ? d.para : d.de);
const redesenhar = () => dispatchEvent(new HashChangeEvent('hashchange'));

async function temFamilia() { return !!((await lerFamilia())?.codigo && firebaseConfigurado()); }
async function sync() { if (await temFamilia()) await sincronizar().catch(() => {}); }
async function mudarMeu(fn) { const j = await lerJogo(); if (j.duelo) { fn(j.duelo, j); await gravarJogo(j); } return j; }

export async function render(raiz) {
  parar();
  await sync();
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

  // duelo com irmão em andamento: volta para a sala
  const d = jogo.duelo;
  if (d && !d.contra && !['fim', 'cancelado', 'recusado', 'desistiu'].includes(d.estado)
      && faseDaSala(d, jogo.outros?.[advDe(jogo, d)]?.duelo, jogo.uid).fase !== 'expirado') return sala(area);

  const convite = (await temFamilia()) ? conviteParaMim(jogo) : null;
  if (convite) area.append(cartaoConvite(convite));
  area.append(menu(jogo, await temFamilia(), area));
}

// ---------- convite recebido ----------
function cartaoConvite(c) {
  const info = JOGOS_DUELO[c.duelo.jogo || 'perguntas'];
  const quando = c.duelo.marcadoPara <= Date.now() + 30000 ? 'agora' : `às ${hora(c.duelo.marcadoPara)}`;
  return el('section', { class: 'cartao convite-duelo' },
    el('div', { class: 'linha-duelo' }, desenharHeroi(c.heroi, {}, 'medio'), el('strong', {}, `⚔️ ${c.apelido} desafiou você!`)),
    el('p', {}, `${info.icone} ${info.nome}, ${quando}.`), el('p', { class: 'dica' }, info.desc),
    el('div', { class: 'linha' },
      el('button', { class: 'botao', onclick: async () => {
        const j = await lerJogo(); j.duelo = aceitarConvite(c.duelo); await gravarJogo(j); await sync(); sons.moeda(); redesenhar();
      } }, '✅ Aceitar'),
      el('button', { class: 'botao secundario', onclick: async () => {
        const j = await lerJogo(); j.duelo = { ...aceitarConvite(c.duelo), estado: 'recusado' }; await gravarJogo(j); await sync(); aviso('Desafio recusado.'); redesenhar();
      } }, '✖ Recusar')));
}

// ---------- montar um desafio ----------
function menu(jogo, comFamilia, area) {
  let escolhido = 'perguntas', daqui = 0;
  const botoesJogo = Object.entries(JOGOS_DUELO).map(([id, j]) => el('button', { class: `opcao-duelo ${id === escolhido ? 'ativa' : ''}`, type: 'button', onclick: e => {
    escolhido = id; botoesJogo.forEach(b => b.classList.remove('ativa')); e.currentTarget.classList.add('ativa'); desc.textContent = j.desc;
  } }, el('span', {}, j.icone), el('small', {}, j.nome)));
  const desc = el('p', { class: 'dica' }, JOGOS_DUELO[escolhido].desc);
  const botoesHora = DUELO.horarios.map(m => el('button', { class: `opcao-duelo hora ${m === daqui ? 'ativa' : ''}`, type: 'button', onclick: e => {
    daqui = m; botoesHora.forEach(b => b.classList.remove('ativa')); e.currentTarget.classList.add('ativa');
  } }, m ? `Daqui a ${m} min` : 'Agora'));
  const irmaos = Object.entries(jogo.outros || {});
  return el('div', {},
    el('section', { class: 'cartao' }, el('h2', {}, '1. Qual jogo?'), el('div', { class: 'grade-duelo' }, botoesJogo), desc),
    el('section', { class: 'cartao' },
      el('h2', {}, '2. 👨‍👩‍👧 Desafiar irmão'),
      !comFamilia ? el('p', { class: 'dica' }, 'Liguem a família para duelar ao vivo entre irmãos.')
        : !irmaos.length ? el('p', { class: 'dica' }, 'Ainda não há irmão na família.')
          : el('div', {},
            el('p', { class: 'dica' }, 'Quando?'), el('div', { class: 'linha horarios-duelo' }, botoesHora),
            irmaos.map(([uid, o]) => el('button', { class: 'botao grande linha-duelo', onclick: async () => {
              const j = await lerJogo();
              j.duelo = novoDuelo({ eu: j.uid, adversario: uid, jogo: escolhido, daquiMin: daqui });
              await gravarJogo(j); await sync(); sons.moeda(); redesenhar();
            } }, desenharHeroi(o.heroi, o.usando, 'pequeno'), `Desafiar ${o.apelido}`)))),
    el('section', { class: 'cartao' },
      el('h2', {}, `${RIVAL.icone} Treino contra o ${RIVAL.nome}`),
      el('p', { class: 'dica' }, 'Funciona sem internet, no jogo escolhido acima.'),
      el('button', { class: 'botao secundario grande', onclick: async () => {
        const j = await lerJogo();
        j.duelo = { ...novoDuelo({ eu: 'eu', adversario: RIVAL.id, jogo: escolhido }), estado: 'jogando', contra: RIVAL.id, inicio: Date.now() };
        await gravarJogo(j);
        partida(area, true);
      } }, `⚔️ Treinar contra o ${RIVAL.nome}`)),
    el('p', { class: 'dica' }, `Prêmio: vitória +${DUELO.premio.vitoria} 💵 · empate +${DUELO.premio.empate} · derrota +${DUELO.premio.derrota}. Até ${DUELO.premiadosPorDia} duelos premiados por dia.`));
}

// ---------- sala de espera: aceite, horário, os dois na tela, contagem de 1 minuto ----------
function sala(area) {
  const titulo = el('h2', {}), status = el('p', {}), relogio = el('p', { class: 'contagem-duelo' });
  const cancelar = el('button', { class: 'botao secundario', onclick: async () => {
    if (!confirm('Cancelar este duelo?')) return;
    parar(); await mudarMeu(d => { d.estado = 'cancelado'; }); await sync(); aviso('Duelo cancelado.'); redesenhar();
  } }, '✖ Cancelar duelo');
  area.replaceChildren(el('section', { class: 'cartao sala-duelo' }, titulo, status, relogio, cancelar));
  let fase = null, alvo = 0;
  repetir(() => { if (alvo) relogio.textContent = mmss(alvo - Date.now()); }, 250);
  let ocupado = false;
  const ciclo = async () => {
    if (ocupado) return;                                    // internet lenta: não sobrepor verificações
    ocupado = true;
    try { await cicloSala(); } finally { ocupado = false; }
  };
  const cicloSala = async () => {
    await mudarMeu(d => { d.pronto = Date.now(); });        // sinal de que estou com o duelo aberto
    await sync();
    const j = await lerJogo();
    const d = j.duelo; if (!d) { parar(); return redesenhar(); }
    const adv = advDe(j, d), o = j.outros?.[adv] || {}, dele = o.duelo;
    const info = JOGOS_DUELO[d.jogo || 'perguntas'];
    titulo.textContent = `${info.icone} ${info.nome} contra ${o.apelido || 'irmão'}`;
    if (d.de === j.uid && d.estado === 'convite' && dele?.id === d.id && dele.estado !== 'convite') { d.estado = 'aceito'; await gravarJogo(j); }
    const f = faseDaSala(d, dele, j.uid);
    fase = f.fase;
    if (f.fase === 'cancelado') {
      parar(); sons.erro();
      area.replaceChildren(el('section', { class: 'cartao' }, el('p', {}, f.por === 'ele' ? `${o.apelido || 'O irmão'} ${f.motivo === 'recusado' ? 'recusou' : 'cancelou'} o duelo.` : 'Duelo cancelado.'),
        el('button', { class: 'botao grande', onclick: async () => { await mudarMeu(x => { x.estado = 'cancelado'; }); redesenhar(); } }, 'Novo duelo')));
      return;
    }
    if (f.fase === 'expirado') { parar(); await mudarMeu(x => { x.estado = 'cancelado'; }); aviso('O horário do duelo passou.'); return redesenhar(); }
    alvo = 0; relogio.textContent = '';
    if (f.fase === 'esperando-aceite') status.textContent = `Desafio enviado para ${d.marcadoPara > Date.now() + 30000 ? hora(d.marcadoPara) : 'agora'}. Esperando ${o.apelido || 'o irmão'} aceitar…`;
    else if (f.fase === 'aguardando-horario') { status.textContent = `Marcado para ${hora(d.marcadoPara)}. Deixe esta tela aberta perto da hora.`; alvo = d.marcadoPara; }
    else if (f.fase === 'esperando-irmao') status.textContent = `Esperando ${o.apelido || 'o irmão'} abrir o duelo (🎮 Jogos → ⚔️ Duelo)…`;
    else if (f.fase === 'pronto-para-contar') {
      status.textContent = 'Os dois estão prontos!';
      if (f.euMarco) { await mudarMeu(x => { x.inicio = Date.now() + DUELO.contagem; x.estado = 'jogando'; }); await sync(); }
    } else if (f.fase === 'contagem') { status.textContent = '⏱ Os dois estão prontos! Começa em:'; alvo = f.inicio; sons.moeda(); }
    else if (f.fase === 'jogando') { parar(); await mudarMeu(x => { x.estado = 'jogando'; x.inicio = x.inicio || f.inicio; }); return partida(area, false); }
  };
  ciclo();
  repetir(ciclo, 2500);
}

// ---------- a partida ----------
async function partida(area, contraMagnata) {
  parar();
  let jogo = await lerJogo();
  const d = jogo.duelo;
  const info = JOGOS_DUELO[d.jogo || 'perguntas'];
  const advUid = contraMagnata ? null : advDe(jogo, d);
  const adv = contraMagnata ? { apelido: RIVAL.nome } : (jogo.outros?.[advUid] || { apelido: 'Irmão' });
  const inicio = d.inicio || Date.now();
  const placarEu = el('strong', {}, '0'), placarAdv = el('strong', {}, info.tipo === 'terminar' ? '🎮' : '0');
  const statusAdv = el('small', {}, info.tipo === 'terminar' ? 'jogando…' : '');
  const palco = el('div', {});
  let acabou = false;
  const desistir = el('button', { class: 'link', onclick: async () => {
    if (!confirm('Desistir? O outro vence.')) return;
    await mudarMeu(x => { x.estado = 'desistiu'; }); await sync(); terminar('derrota', 'Você desistiu.');
  } }, 'Desistir');
  area.replaceChildren(
    el('div', { class: 'placar-duelo' },
      el('div', { class: 'lado-duelo' }, desenharHeroi(jogo.heroi, jogo.usando, 'medio'), el('span', {}, jogo.apelido || 'Você'), placarEu),
      el('div', { class: 'versus' }, 'VS'),
      el('div', { class: 'lado-duelo' }, contraMagnata ? el('div', { class: 'magnata-pequeno' }, RIVAL.icone) : desenharHeroi(adv.heroi, adv.usando, 'medio'), el('span', {}, adv.apelido), placarAdv, statusAdv)),
    palco, desistir);

  // o que o adversário está fazendo (irmão pela internet a cada 2 s; Magnata pelo relógio)
  let dele = null, vendo = false;
  const verAdversario = async () => {
    if (vendo) return; vendo = true;
    try { await verAdversarioAgora(); } finally { vendo = false; }
  };
  const verAdversarioAgora = async () => {
    const seg = (Date.now() - inicio) / 1000;
    if (contraMagnata) {
      if (d.jogo === 'perguntas') { let t = 0; const r = respostasDoMagnata(d.semente).filter(x => (t += x.ms) <= seg * 1000); dele = { pontos: pontuar(r) }; }
      else if (info.tipo === 'pontos') dele = { pontos: acertosDoMagnata(d.semente, Math.min(seg, info.tempo)) };
      else dele = seg >= tempoDoMagnata(d.semente) ? { estado: 'fim', concluiu: true, fimEm: inicio + tempoDoMagnata(d.semente) * 1000 } : {};
    } else {
      await sync();
      const j = await lerJogo();
      const x = j.outros?.[advUid]?.duelo;
      dele = x?.id === d.id ? x : null;
    }
    if (info.tipo === 'pontos') placarAdv.textContent = String(dele?.pontos || 0);
    else statusAdv.textContent = dele?.concluiu ? '🏁 terminou!' : (dele?.estado === 'desistiu' ? 'desistiu' : 'jogando…');
    if (dele?.estado === 'desistiu' && !acabou) return terminar('vitoria', `${adv.apelido} desistiu.`);
    if (info.tipo === 'terminar' && !acabou) {
      const v = vencedorTerminar(null, dele, Date.now(), inicio);
      if (v === 'ele') return terminar('derrota', `${adv.apelido} terminou primeiro.`);
      if (v === 'empate' || Date.now() > inicio + 5 * 60 * 1000) return terminar('empate', 'Ninguém terminou em 5 minutos.');
    }
  };
  repetir(verAdversario, contraMagnata ? 500 : 2000);

  const salvarPontos = pontos => { placarEu.textContent = String(pontos); pop(placarEu); mudarMeu(x => { x.pontos = pontos; }).then(() => { if (!contraMagnata) sync(); }); };

  if (d.jogo === 'perguntas') jogarPerguntas();
  else if (info.tipo === 'pontos') {
    const rodadas = rodadasDoDuelo(d.jogo, d.semente);
    let k = 0;
    corrida(palco, { tempo: info.tempo, proxima: () => rodadas[k++ % rodadas.length], aoPlacar: ({ acertos }) => salvarPontos(acertos),
      aoFim: async ({ acertos }) => { salvarPontos(acertos); await mudarMeu(x => { x.estado = 'fim'; x.pontos = acertos; }); await fimPorPontos(acertos); } });
  } else {
    const t = CAMADAS[0].territorios[d.semente % CAMADAS[0].territorios.length];
    const modulo = await MODULOS_TERMINAR[d.jogo]();
    definirGanchoDuelo(async ({ recorde }) => {
      if (acabou) return;
      const concluiu = !!recorde;
      await mudarMeu(x => { x.estado = 'fim'; x.concluiu = concluiu; x.fimEm = Date.now(); });
      if (!contraMagnata) { await sync(); await espera(3000); await sync(); }   // confere se o outro não terminou um pouco antes
      const j = await lerJogo();
      const outro = contraMagnata ? dele : (j.outros?.[advUid]?.duelo?.id === d.id ? j.outros[advUid].duelo : null);
      const v = vencedorTerminar(j.duelo, outro, Date.now(), inicio) || (concluiu ? 'eu' : 'ele');
      terminar(v === 'eu' ? 'vitoria' : v === 'ele' ? 'derrota' : 'empate', v === 'eu' ? 'Você terminou primeiro!' : `${adv.apelido} terminou primeiro.`);
    });
    // a MESMA grade para os dois: o sorteio usa a semente do duelo
    const original = Math.random; Math.random = sorteador(d.semente);
    try { modulo.iniciar(palco, { t, ano: '6ano', grupo: t.grupo }); } finally { Math.random = original; }
  }

  function jogarPerguntas() {
    const perguntas = perguntasDoDuelo(d.semente);
    const minhas = [];
    let i = 0;
    const proxima = () => {
      if (i >= perguntas.length) return mudarMeu(x => { x.estado = 'fim'; }).then(() => fimPorPontos(pontuar(minhas)));
      const q = perguntas[i], t0 = Date.now();
      const botoes = q.opcoes.map((op, k) => el('button', { class: 'alternativa', type: 'button', onclick: async () => {
        botoes.forEach(b => { b.disabled = true; });
        const certo = k === q.correta;
        botoes[q.correta].classList.add('certa'); if (!certo) botoes[k].classList.add('errada');
        minhas.push({ certo, ms: Date.now() - t0 }); i++;
        if (certo) sons.moeda(); else sons.erro();
        await mudarMeu(x => { x.respostas = minhas; });
        salvarPontos(pontuar(minhas));
        setTimeout(proxima, certo ? 350 : 900);
      } }, op));
      palco.replaceChildren(el('p', { class: 'contador' }, `Pergunta ${i + 1} de ${perguntas.length}`), el('h2', {}, q.texto), el('div', { class: 'alternativas' }, botoes));
    };
    proxima();
  }

  async function fimPorPontos(meus) {
    if (acabou) return;
    palco.replaceChildren(el('p', { class: 'dica' }, `Você terminou com ${meus} pontos! Esperando ${adv.apelido}…`));
    const limite = Date.now() + DUELO.esperaFinal;
    while (!acabou && Date.now() < limite) {
      await verAdversario();
      if (contraMagnata ? (Date.now() - inicio) / 1000 >= (info.tempo || 60) : dele?.estado === 'fim' || dele?.estado === 'desistiu') break;
      await espera(1500);
    }
    if (acabou) return;
    if (contraMagnata && d.jogo === 'perguntas') dele = { pontos: pontuar(respostasDoMagnata(d.semente)) };
    const r = resultadoPorPontos(meus, dele?.pontos || 0);
    terminar(r.fim, r.fim === 'vitoria' ? `Você venceu: ${r.meus} a ${r.deles}!` : r.fim === 'empate' ? `Empate: ${r.meus} a ${r.deles}.` : `${adv.apelido} venceu: ${r.deles} a ${r.meus}.`);
  }

  async function terminar(fim, texto) {
    if (acabou) return;
    acabou = true;
    parar();
    await mudarMeu(x => { if (x.estado !== 'desistiu') x.estado = 'fim'; });
    if (!contraMagnata) sync();
    const premio = await premiarDuelo(fim);
    await registrarEvento('duelo', { fim });
    if (fim === 'vitoria') { sons.camada(); confete(); } else if (fim === 'empate') sons.moeda(); else sons.erro();
    desistir.remove();
    palco.replaceChildren(el('div', { class: fim === 'derrota' ? 'retorno errado' : 'celebracao' }, `${fim === 'vitoria' ? '🏆' : fim === 'empate' ? '🤝' : '⚔️'} ${texto}`),
      premio.notas ? el('p', { class: 'conquista-nova' }, `+${premio.notas} 💵`) : el('p', { class: 'dica' }, `Os ${DUELO.premiadosPorDia} duelos premiados de hoje já foram. Este valeu pela diversão!`),
      el('button', { class: 'botao grande', onclick: () => redesenhar() }, '⚔️ Novo duelo'));
  }
}
