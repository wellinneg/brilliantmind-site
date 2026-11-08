// Minijogos de pensar: Palavra embaralhada, Ligar os pares e Cofre secreto.
import { el } from '../ui.js';
import { VOCABULARIO, semAcento } from './vocabulario.js';
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
  const palavras = misturar(VOCABULARIO[grupo].filter(([p]) => semAcento(p).length >= 4 && semAcento(p).length <= 10)).slice(0, 5);
  let i = 0, acertos = 0;
  const visor = el('span', { class: 'cronometro' });
  const palco = el('div', {});
  area.replaceChildren(el('div', { class: 'barra-jogo' }, el('strong', {}, '🔀 5 palavras'), visor), palco);
  const relogio = cronometro(visor);
  const proxima = () => {
    if (i >= palavras.length) return terminar();
    const [palavra, def] = palavras[i];
    const alvo = semAcento(palavra);
    let montada = [];
    const resposta = el('div', { class: 'resposta-letras' });
    const pecas = embaralhar(palavra).map(letra => el('button', { class: 'letra', type: 'button', onclick: e => {
      e.currentTarget.disabled = true; montada.push([letra, e.currentTarget]); desenhar();
      if (montada.length === alvo.length) conferir();
    } }, letra));
    const desenhar = () => resposta.replaceChildren(...alvo.split('').map((_, k) => el('span', { class: 'casa-letra' }, montada[k]?.[0] || '')));
    const conferir = () => {
      if (montada.map(x => x[0]).join('') === alvo) { acertos++; sons.moeda(); pop(resposta); i++; setTimeout(proxima, 500); }
      else { sons.erro(); pop(resposta, 'tremer'); setTimeout(() => { montada.forEach(x => { x[1].disabled = false; }); montada = []; desenhar(); }, 600); }
    };
    desenhar();
    palco.replaceChildren(el('p', { class: 'contador' }, `Palavra ${i + 1} de ${palavras.length}`),
      el('p', { class: 'caixa-dica' }, '💡 ', def), resposta,
      el('div', { class: 'pecas-letras' }, pecas),
      el('div', { class: 'linha' },
        el('button', { class: 'botao secundario', onclick: () => { montada.forEach(x => { x[1].disabled = false; }); montada = []; desenhar(); } }, '↩ Apagar'),
        el('button', { class: 'botao secundario', onclick: () => { sons.erro(); palco.append(el('p', { class: 'erro-batalha' }, `Era: ${palavra}`)); i++; setTimeout(proxima, 900); } }, '⏭ Pular')));
  };
  async function terminar() {
    const s = relogio.parar();
    const moedas = acertos * 3;
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
export function novoCodigo(aleatorio = Math.random) {
  const digitos = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => [aleatorio(), d]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
  return digitos.slice(0, 3);
}

export function cofre(area, { t, ano }) {
  const MAX = 8;
  const codigo = novoCodigo();
  const historico = [];
  let atual = [];
  const visor = el('span', { class: 'cronometro' });
  const linhas = el('div', { class: 'tentativas-cofre' });
  const entrada = el('div', { class: 'entrada-cofre' });
  const teclado = el('div', { class: 'teclado-cofre' }, [1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => el('button', { class: 'botao secundario', type: 'button', onclick: () => digitar(d) }, String(d))));
  area.replaceChildren(el('div', { class: 'barra-jogo' }, el('strong', {}, `🔐 ${MAX} tentativas`), visor),
    el('p', { class: 'dica' }, 'O código tem 3 números diferentes, de 1 a 9. 🟢 = número certo no lugar certo · 🟡 = está no código, mas em outro lugar · ⚫ = não está.'),
    linhas, entrada, teclado,
    el('div', { class: 'linha' },
      el('button', { class: 'botao secundario', onclick: () => { atual.pop(); desenhar(); } }, '↩ Apagar'),
      el('button', { class: 'botao', onclick: enviar }, '🔓 Tentar')));
  const relogio = cronometro(visor);
  const desenhar = () => entrada.replaceChildren(...[0, 1, 2].map(k => el('span', { class: 'casa-letra' }, atual[k] ?? '')));
  desenhar();
  function digitar(d) { if (atual.length < 3 && !atual.includes(d)) { atual.push(d); desenhar(); } }
  function enviar() {
    if (atual.length < 3) { pop(entrada, 'tremer'); return; }
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
    const moedas = abriu ? (n <= 4 ? 15 : n <= 6 ? 12 : 8) : 0;
    const fim = await encerrarPartida({ tipo: 'cofre', t, moedas, recorde: abriu ? { valor: n, menorMelhor: true } : null });
    mostrarResultado(area, { titulo: abriu ? '🔓 Cofre aberto!' : `🔒 O código era ${codigo.join('')}`, linhas: [`Tentativas: ${n}`, `Tempo: ${formatarTempo(s)}`], fim, t, tipo: 'cofre', jogarDeNovo: () => cofre(area, { t, ano }) });
  }
}
