// ⚔️ Batalha contra o Magnata (#/chefao): vence → libera a próxima camada. Uma tentativa por dia.
import { el, navegar } from '../ui.js';
import * as estado from '../estado.js';
import { CAMADAS, RIVAL, HEROIS, lerJogo, gravarJogo, vencerChefao } from '../jogo.js';
import { carregarDia } from '../conteudo.js';
import { prepararQuiz } from '../quiz.js';
import { hojeISO } from '../datas.js';
import { desenharHeroi } from '../herois.js';
import { PODERES, BATALHA, perguntasNecessarias, criarBatalha, antesDaPergunta, responder } from '../batalha.js';
import { sons } from '../sons.js';
import { confete, pop } from '../efeitos.js';

/** Perguntas das lições já estudadas no ano, no nível da camada (só múltipla escolha). */
async function juntarPerguntas(ano, ateDia, nivel, quantas) {
  const todas = [];
  for (let d = 1; d <= Math.max(1, ateDia); d++) {
    const c = await carregarDia(ano, d).catch(() => null);
    for (const b of c?.blocos || []) for (const q of b.quiz?.[nivel] || []) if (q.tipo === 'escolha') todas.push(q);
  }
  const misturadas = todas.map(q => [Math.random(), q]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
  return prepararQuiz(misturadas.slice(0, quantas), { chefao: true });
}

export async function render(raiz) {
  const jogo = await lerJogo();
  const perfil = await estado.perfil();
  raiz.append(el('button', { class: 'voltar', onclick: () => navegar('#/mapa') }, '← 🗺️ Mapa'));
  const camada = CAMADAS[jogo.camada];
  if (!jogo.chefao || jogo.chefao.camada !== jogo.camada) {
    raiz.append(el('h1', {}, `${RIVAL.icone} ${RIVAL.nome}`),
      el('p', {}, `Junte 60% das notas de ${camada.nome} e o ${RIVAL.nome} vai desafiar você para uma batalha. Vencendo, você libera a próxima camada.`));
    return;
  }
  const poder = PODERES[jogo.heroi];
  const hoje = hojeISO();
  const arena = el('div', { class: 'arena' },
    el('div', { class: 'lutador lutador-eu' }, desenharHeroi(jogo.heroi, jogo.usando, 'grande'), el('strong', {}, jogo.apelido || HEROIS[jogo.heroi]?.nome)),
    el('div', { class: 'versus' }, 'VS'),
    el('div', { class: 'lutador lutador-chefao' }, el('div', { class: 'magnata' }, RIVAL.icone), el('strong', {}, RIVAL.nome)));
  const area = el('div', { class: 'area-batalha' });
  raiz.append(el('h1', { class: 'titulo-batalha' }, `⚔️ Batalha por ${camada.nome}`), arena, area);

  if (jogo.chefao.ultimaTentativa === hoje) {
    area.append(el('section', { class: 'cartao' }, el('p', {}, `Você já enfrentou o ${RIVAL.nome} hoje. Estude e volte amanhã para a revanche! 💪`)));
    return;
  }
  area.append(el('section', { class: 'cartao' },
    el('p', {}, `O ${RIVAL.nome} quer comprar ${camada.nome} inteira! Ele tem ${BATALHA.vida[jogo.camada]} de vida. Cada acerto tira ${BATALHA.dano}; cada erro (ou tempo esgotado) tira um coração seu.`),
    poder ? el('p', { class: 'poder' }, `${poder.icone} Seu poder: `, el('strong', {}, poder.nome), ` — ${poder.desc}`) : null,
    el('p', { class: 'dica' }, `Perguntas das lições que você já estudou. ${BATALHA.tempo} segundos para cada uma. Só uma tentativa por dia.`),
    el('button', { class: 'botao grande', onclick: comecar }, '⚔️ Começar a batalha')));

  async function comecar() {
    jogo.chefao.ultimaTentativa = hoje;
    jogo.chefao.tentativas = (jogo.chefao.tentativas || 0) + 1;
    await gravarJogo(jogo);
    const proximo = await estado.proximoDia(perfil.ano);
    const perguntas = await juntarPerguntas(perfil.ano, proximo - 1 || 1, BATALHA.nivelDaCamada[jogo.camada], perguntasNecessarias(jogo.camada));
    const b = criarBatalha({ camada: jogo.camada, heroi: jogo.heroi, perguntas });
    sons.roubo();
    rodada(b);
  }

  function placar(b) {
    const pct = Math.round((b.vidaChefao / b.vidaMax) * 100);
    return el('div', { class: 'placar-batalha' },
      el('div', { class: 'vida-chefao' }, el('div', { class: 'vida-cheia', style: `width:${pct}%` }), el('span', {}, `${RIVAL.icone} ${b.vidaChefao}/${b.vidaMax}`)),
      el('div', { class: 'coracoes' }, '❤️'.repeat(Math.max(0, b.coracoes)), b.couraca ? el('span', {}, ` ${'🛡️'.repeat(b.couraca)}`) : null,
        b.rugidoPronto ? el('span', { class: 'rugido' }, ' 🦁 Rugido pronto!') : null));
  }

  function rodada(b) {
    if (b.fim) return terminar(b);
    const { q, tempo, riscada } = antesDaPergunta(b);
    const inicio = performance.now();
    const barraTempo = el('div', { class: 'tempo-cheio' });
    let respondeu = false;
    const botoes = q.alternativas.map((txt, k) => el('button', {
      class: `alternativa ${k === riscada ? 'riscada' : ''}`, disabled: k === riscada, type: 'button',
      onclick: () => resolver(k === q.correta, k),
    }, txt));
    area.replaceChildren(placar(b),
      el('div', { class: 'tempo-batalha' }, barraTempo),
      el('p', { class: 'contador' }, `Pergunta ${b.i + 1}`), el('h2', {}, q.pergunta),
      el('div', { class: 'alternativas' }, botoes));
    const relogio = setInterval(() => {
      if (!document.body.contains(barraTempo)) { clearInterval(relogio); return; }
      const resta = tempo - (performance.now() - inicio) / 1000;
      barraTempo.style.width = `${Math.max(0, (resta / tempo) * 100)}%`;
      barraTempo.classList.toggle('acabando', resta < 5);
      if (resta <= 0) resolver(false, -1);
    }, 100);

    function resolver(certo, k) {
      if (respondeu) return;
      respondeu = true; clearInterval(relogio);
      botoes.forEach(x => { x.disabled = true; });
      botoes[q.correta].classList.add('certa');
      if (k >= 0 && !certo) botoes[k].classList.add('errada');
      const ev = responder(b, { certo, segundos: (performance.now() - inicio) / 1000 });
      const alvo = arena.querySelector(certo ? '.lutador-chefao' : '.lutador-eu');
      pop(alvo, 'golpe');
      if (certo) sons.moeda(); else sons.erro();
      const texto = certo ? `-${ev.dano}` : (ev.perdeu ? '-❤️' : '🛡️');
      const flutua = el('span', { class: `dano ${certo ? 'no-chefao' : 'em-mim'}` }, texto);
      alvo.append(flutua); setTimeout(() => flutua.remove(), 1000);
      area.append(el('p', { class: certo ? 'acerto-batalha' : 'erro-batalha' },
        k < 0 ? '⏰ Tempo esgotado!' : (certo ? 'Acertou! 💥' : 'Errou!'), ev.poder ? ` ${ev.poder}` : ''));
      setTimeout(() => rodada(b), certo ? 900 : 1600);
    }
  }

  async function terminar(b) {
    area.replaceChildren(placar(b));
    if (b.fim === 'vitoria') {
      const liberou = vencerChefao(jogo, BATALHA.premio);
      await gravarJogo(jogo);
      sons.camada(); confete();
      arena.querySelector('.lutador-chefao').classList.add('derrotado');
      area.append(el('div', { class: 'celebracao' }, `🏆 Você venceu o ${RIVAL.nome}!`),
        el('p', { class: 'conquista-nova' }, `${liberou.icone} ${liberou.nome} liberada! +${BATALHA.premio} 💵`),
        el('button', { class: 'botao grande', onclick: () => navegar(`#/mapa/${jogo.camada}/ir`) }, `🗺️ Ir para ${liberou.nome}`));
    } else {
      sons.erro();
      const acertos = b.log.filter(x => x.certo).length;
      area.append(el('div', { class: 'retorno errado' }, el('strong', {}, `O ${RIVAL.nome} venceu desta vez.`),
        el('p', {}, `Você acertou ${acertos} e tirou ${b.vidaMax - b.vidaChefao} de vida dele. Revise as lições e tente de novo amanhã!`)),
        el('button', { class: 'botao grande', onclick: () => navegar('#/hoje') }, 'Voltar para Hoje'));
    }
  }
}
