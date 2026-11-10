// Minijogos de pensar: Palavra embaralhada, Ligar os pares e Cofre secreto.
import { DIFICULDADES } from '../rodizio.js';
import { el } from '../ui.js';
import { VOCABULARIO, INGLES, semAcento } from './vocabulario.js';
import { cronometro, encerrarPartida, mostrarResultado, formatarTempo } from './motor.js';
import { sons } from '../sons.js';
import { pop, confete } from '../efeitos.js';

const misturar = a => a.map(x => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map(x => x[1]);

// ---------- 🔀 Palavra embaralhada ----------
export function embaralhar(palavra, aleatorio = Math.random) {
  const letras = [...semAcento(palavra)];
  for (let t = 0; t < 20; t++) {
    const m = letras.map(x => [aleatorio(), x]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
    if (m.join('') !== letras.join('')) return m;
  }
  return letras.reverse();
}

export function palavraEmbaralhada(area, { t, ano, grupo }) {
  // 10 palavras: 5 em português (do vocabulário do lugar) e 5 em inglês, misturadas
  const cabe = ([p]) => semAcento(p).length >= 4 && semAcento(p).length <= 10;
  const portugues = misturar(VOCABULARIO[grupo].filter(cabe)).slice(0, 5).map(([p, d]) => [p, d, false]);
  const ingles = misturar(INGLES.filter(cabe)).slice(0, 10 - portugues.length).map(([p, d]) => [p, `🇬🇧 Em inglês: ${d}`, true]);
  const palavras = misturar([...portugues, ...ingles]);
  let i = 0, acertos = 0;
  const visor = el('span', { class: 'cronometro' });
  const palco = el('div', {});
  area.replaceChildren(el('div', { class: 'barra-jogo' }, el('strong', {}, `🔀 ${palavras.length} palavras`), visor), palco);
  const relogio = cronometro(visor);
  const proxima = () => {
    if (i >= palavras.length) return terminar();
    const [palavra, def, emIngles] = palavras[i];
    const alvo = semAcento(palavra);
    let montada = [];
    const resposta = el('div', { class: 'resposta-letras' });
    const pecas = embaralhar(palavra).map(letra => el('button', { class: 'letra', type: 'button', onclick: e => {
      e.currentTarget.disabled = true; montada.push([letra, e.currentTarget]); desenhar();
      if (montada.length === alvo.length) conferir();
    } }, letra));
    // 🟩 letra no lugar certo fica verde na hora
    const desenhar = () => resposta.replaceChildren(...alvo.split('').map((certa, k) => el('span', { class: `casa-letra ${montada[k] ? (montada[k][0] === certa ? 'no-lugar' : 'fora-do-lugar') : ''}` }, montada[k]?.[0] || '')));
    const conferir = () => {
      if (montada.map(x => x[0]).join('') === alvo) { acertos++; sons.moeda(); pop(resposta); i++; setTimeout(proxima, 500); }
      else { sons.erro(); pop(resposta, 'tremer'); setTimeout(() => { montada.forEach(x => { x[1].disabled = false; }); montada = []; desenhar(); }, 600); }
    };
    desenhar();
    palco.replaceChildren(el('p', { class: 'contador' }, `Palavra ${i + 1} de ${palavras.length}`),
      el('p', { class: `caixa-dica ${emIngles ? 'dica-ingles' : ''}` }, '💡 ', def), resposta,
      el('div', { class: 'pecas-letras' }, pecas),
      el('div', { class: 'linha' },
        el('button', { class: 'botao secundario', onclick: () => { const ultima = montada.pop(); if (ultima) ultima[1].disabled = false; desenhar(); } }, '↩ Apagar'),   // uma letra por vez
        el('button', { class: 'botao secundario', onclick: () => { sons.erro(); palco.append(el('p', { class: 'erro-batalha' }, `Era: ${palavra}`)); i++; setTimeout(proxima, 900); } }, '⏭ Pular')));
  };
  async function terminar() {
    const s = relogio.parar();
    const moedas = acertos * 2;               // 10 palavras: até 20 notas
    const fim = await encerrarPartida({ tipo: 'embaralhada', t, moedas, recorde: acertos === palavras.length ? { valor: s, menorMelhor: true } : null });
    mostrarResultado(area, { titulo: acertos === palavras.length ? '🎉 Montou todas!' : 'Boa tentativa!', linhas: [`Palavras: ${acertos} de ${palavras.length}`, `Tempo: ${formatarTempo(s)}`], fim, t, tipo: 'embaralhada', jogarDeNovo: () => palavraEmbaralhada(area, { t, ano, grupo }) });
  }
  proxima();
}

// ---------- 🔗 Ligar os pares ----------
export function ligarPares(area, { t, ano, grupo }) {
  const pares = misturar(VOCABULARIO[grupo]).slice(0, 5);
  let escolhida = null, feitos = 0, erros = 0;
  const visor = el('span', { class: 'cronometro' });
  const contador = el('span', {}, 'Erros: 0');
  const palavras = pares.map(([p], k) => el('button', { class: 'item-par palavra', type: 'button', onclick: e => escolher(k, e.currentTarget) }, p));
  const defs = misturar(pares.map(([, d], k) => [d, k])).map(([d, k]) => el('button', { class: 'item-par definicao', type: 'button', onclick: e => ligar(k, e.currentTarget) }, d));
  area.replaceChildren(el('div', { class: 'barra-jogo' }, contador, visor),
    el('p', { class: 'dica' }, 'Toque numa palavra e depois no significado dela.'),
    el('div', { class: 'colunas-pares' }, el('div', {}, palavras), el('div', {}, defs)));
  const relogio = cronometro(visor);
  const cores = ['#43A047', '#1E88E5', '#8E24AA', '#FB8C00', '#00897B'];
  function escolher(k, b) {
    palavras.forEach(x => x.classList.remove('escolhida'));
    escolhida = k; b.classList.add('escolhida');
  }
  function ligar(k, b) {
    if (escolhida == null) { pop(b, 'tremer'); return; }
    if (k === escolhida) {
      const cor = cores[feitos % cores.length];
      for (const x of [palavras[k], b]) { x.disabled = true; x.style.background = cor; x.classList.remove('escolhida'); }
      feitos++; escolhida = null; sons.moeda();
      if (feitos === pares.length) terminar();
    } else { erros++; contador.textContent = `Erros: ${erros}`; sons.erro(); pop(b, 'tremer'); }
  }
  async function terminar() {
    const s = relogio.parar();
    const moedas = erros === 0 ? 15 : (erros <= 2 ? 12 : 8);
    const fim = await encerrarPartida({ tipo: 'pares', t, moedas, recorde: { valor: s, menorMelhor: true } });
    mostrarResultado(area, { titulo: '🔗 Tudo ligado!', linhas: [`Erros: ${erros}`, `Tempo: ${formatarTempo(s)}`], fim, t, tipo: 'pares', jogarDeNovo: () => ligarPares(area, { t, ano, grupo }) });
  }
}

// ---------- 🔐 Cofre secreto ----------
/** Pistas de cada dígito: 'certo' (lugar certo), 'existe' (está em outro lugar) ou 'nao'. */
export function pistas(codigo, tentativa) {
  return tentativa.map((d, k) => (codigo[k] === d ? 'certo' : (codigo.includes(d) ? 'existe' : 'nao')));
}
/** Níveis do cofre, iguais aos das lições: quantos números o código tem e quantas tentativas. */
export const NIVEIS_COFRE = {
  fraldinha: { digitos: 3, tentativas: 8, bonus: 1 },
  moderado: { digitos: 4, tentativas: 10, bonus: 1.3 },
  dificil: { digitos: 5, tentativas: 12, bonus: 1.6 },
  supremo: { digitos: 6, tentativas: 14, bonus: 2 },
};
export function novoCodigo(aleatorio = Math.random, digitos = 3) {
  const lista = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => [aleatorio(), d]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
  return lista.slice(0, digitos);
}
/** Notas ao abrir: quanto menos tentativas (em relação ao máximo do nível), mais notas; nível difícil multiplica. */
export function notasDoCofre(nivel, tentativas) {
  const n = NIVEIS_COFRE[nivel] || NIVEIS_COFRE.fraldinha;
  const fracao = tentativas / n.tentativas;
  const base = fracao <= 0.5 ? 15 : fracao <= 0.75 ? 12 : 8;
  return Math.round(base * n.bonus);
}

export function cofre(area, { t, ano, nivel }) {
  if (!NIVEIS_COFRE[nivel]) return escolherNivelCofre(area, { t, ano });
  const { digitos: N, tentativas: MAX } = NIVEIS_COFRE[nivel];
  const codigo = novoCodigo(Math.random, N);
  const historico = [];
  let atual = [];
  const visor = el('span', { class: 'cronometro' });
  const linhas = el('div', { class: 'tentativas-cofre' });
  const entrada = el('div', { class: 'entrada-cofre' });
  const teclado = el('div', { class: 'teclado-cofre' }, [1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => el('button', { class: 'botao secundario', type: 'button', onclick: () => digitar(d) }, String(d))));
  area.replaceChildren(el('div', { class: 'barra-jogo' }, el('strong', {}, `${DIFICULDADES[nivel].icone} ${MAX} tentativas`), visor),
    el('p', { class: 'dica' }, `O código tem ${N} números diferentes, de 1 a 9. 🟢 = número certo no lugar certo · 🟡 = está no código, mas em outro lugar · ⚫ = não está.`),
    linhas, entrada, teclado,
    el('div', { class: 'linha' },
      el('button', { class: 'botao secundario', onclick: () => { atual.pop(); desenhar(); } }, '↩ Apagar'),
      el('button', { class: 'botao', onclick: enviar }, '🔓 Tentar')));
  const relogio = cronometro(visor);
  const desenhar = () => entrada.replaceChildren(...Array.from({ length: N }, (_, k) => el('span', { class: 'casa-letra' }, atual[k] ?? '')));
  desenhar();
  function digitar(d) { if (atual.length < N && !atual.includes(d)) { atual.push(d); desenhar(); } }
  function enviar() {
    if (atual.length < N) { pop(entrada, 'tremer'); return; }
    const p = pistas(codigo, atual);
    historico.push(atual);
    linhas.append(el('div', { class: 'linha-cofre' }, atual.map((d, k) => el('span', { class: `pista ${p[k]}` }, d)),
      el('small', {}, p.map(x => (x === 'certo' ? '🟢' : x === 'existe' ? '🟡' : '⚫')).join(''))));
    atual = []; desenhar();
    if (p.every(x => x === 'certo')) { sons.conquista(); confete(); terminar(true); }
    else if (historico.length >= MAX) terminar(false);
    else sons.moeda();
  }
  async function terminar(abriu) {
    const s = relogio.parar();
    const n = historico.length;
    const moedas = abriu ? notasDoCofre(nivel, n) : 0;
    const fim = await encerrarPartida({ tipo: 'cofre', t, moedas, recorde: abriu ? { valor: n, menorMelhor: true } : null });
    mostrarResultado(area, { titulo: abriu ? '🔓 Cofre aberto!' : `🔒 O código era ${codigo.join('')}`, linhas: [`Nível: ${DIFICULDADES[nivel].icone} ${DIFICULDADES[nivel].nome} (${N} números)`, `Tentativas: ${n} de ${MAX}`, `Tempo: ${formatarTempo(s)}`], fim, t, tipo: 'cofre', jogarDeNovo: () => cofre(area, { t, ano }) });
  }
}

/** Antes de começar: escolher o nível, como nas lições. */
function escolherNivelCofre(area, { t, ano }) {
  area.replaceChildren(
    el('p', {}, 'Escolha o nível do cofre:'),
    el('div', { class: 'niveis-cofre' }, Object.entries(NIVEIS_COFRE).map(([id, n]) => el('button', { class: 'botao secundario grande', type: 'button', onclick: () => { sons.moeda(); cofre(area, { t, ano, nivel: id }); } },
      `${DIFICULDADES[id].icone} ${DIFICULDADES[id].nome}`, el('small', {}, `${n.digitos} números · ${n.tentativas} tentativas`)))));
}
