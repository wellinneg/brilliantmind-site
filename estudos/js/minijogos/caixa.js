// Corrida do caixa: contas de preço, troco e desconto contra o relógio (60 segundos).
import { el } from '../ui.js';
import { cronometro, encerrarPartida, mostrarResultado } from './motor.js';
import { sons } from '../sons.js';
import { pop } from '../efeitos.js';

const PRODUTOS = [['🍎', 'maçã'], ['🥖', 'pão'], ['🥛', 'leite'], ['🧀', 'queijo'], ['🍫', 'chocolate'], ['🧃', 'suco'], ['🍌', 'banana'], ['🥚', 'ovos'], ['🍉', 'melancia'], ['🥫', 'molho']];
const TEMPO = 60;
export const reais = centavos => (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/** Gera uma conta de caixa; `nivel` 0 (6º/7º) ou 1 (8º/9º). Resposta sempre em centavos. */
export function gerarConta(nivel, aleatorio = Math.random) {
  const n = k => Math.floor(aleatorio() * k);
  const preco = () => (n(nivel ? 40 : 18) + 2) * 25;          // múltiplos de R$ 0,25
  const [e1, nome1] = PRODUTOS[n(PRODUTOS.length)];
  const [e2, nome2] = PRODUTOS[n(PRODUTOS.length)];
  const p1 = preco(), p2 = preco();
  const tipos = nivel ? ['soma', 'troco', 'vezes', 'desconto'] : ['soma', 'troco', 'vezes'];
  const tipo = tipos[n(tipos.length)];
  if (tipo === 'soma') return { texto: `${e1} ${nome1} ${reais(p1)} + ${e2} ${nome2} ${reais(p2)}. Quanto dá?`, certa: p1 + p2 };
  if (tipo === 'vezes') { const q = n(4) + 2; return { texto: `${q} × ${e1} ${nome1} de ${reais(p1)}. Quanto dá?`, certa: q * p1 }; }
  if (tipo === 'desconto') { const pct = [10, 20, 50][n(3)]; const p = (n(8) + 2) * 500; return { texto: `${e1} ${nome1} de ${reais(p)} com ${pct}% de desconto. Quanto fica?`, certa: p - (p * pct) / 100 }; }
  const total = p1 + p2;
  const nota = [1000, 2000, 5000].find(v => v > total) || 10000;
  return { texto: `Compra de ${reais(total)}. Pagou com ${reais(nota)}. Qual o troco?`, certa: nota - total };
}

/** 4 alternativas próximas da certa (diferentes entre si e positivas). */
export function alternativas(certa, aleatorio = Math.random) {
  const desvios = [25, 50, 100, 150, 200, 500].sort(() => aleatorio() - 0.5);
  const opcoes = new Set([certa]);
  for (const d of desvios) {
    if (opcoes.size === 4) break;
    const v = certa + (aleatorio() < 0.5 ? -d : d);
    if (v > 0) opcoes.add(v);
  }
  return [...opcoes].sort(() => aleatorio() - 0.5);
}

export function iniciar(area, { t, ano }) {
  const nivel = ['8ano', '9ano'].includes(ano) ? 1 : 0;
  let acertos = 0, erros = 0, acabou = false;
  const visor = el('span', { class: 'cronometro' });
  const placar = el('span', {}, '✅ 0');
  const pergunta = el('div', { class: 'conta-caixa' });
  area.replaceChildren(el('div', { class: 'barra-jogo' }, placar, visor), el('div', { class: 'caixa-registradora' }, '🧾 CAIXA'), pergunta);
  cronometro(visor, { limite: TEMPO, aoAcabar: terminar });
  proxima();

  function proxima() {
    if (acabou) return;
    const c = gerarConta(nivel);
    pergunta.replaceChildren(el('p', { class: 'enunciado-caixa' }, c.texto),
      el('div', { class: 'opcoes-caixa' }, alternativas(c.certa).map(v => el('button', {
        class: 'botao secundario', type: 'button',
        onclick: e => {
          if (acabou) return;
          if (v === c.certa) { acertos++; sons.moeda(); pop(placar); }
          else { erros++; sons.erro(); pop(e.currentTarget, 'tremer'); }
          placar.textContent = `✅ ${acertos}`;
          setTimeout(proxima, v === c.certa ? 150 : 450);
        },
      }, reais(v)))));
  }

  async function terminar() {
    acabou = true;
    const moedas = Math.min(15, acertos + (acertos >= 8 ? 5 : 0));
    const fim = await encerrarPartida({ tipo: 'caixa', t, moedas, recorde: { valor: acertos, menorMelhor: false } });
    mostrarResultado(area, {
      titulo: '⏰ Tempo esgotado!',
      linhas: [`Contas certas: ${acertos}`, `Erradas: ${erros}`, acertos >= 8 ? '⚡ 8 ou mais certas vale +5!' : 'Dica: com 8 ou mais certas ganha +5.'],
      fim, t, tipo: 'caixa', jogarDeNovo: () => iniciar(area, { t, ano }),
    });
  }
}
