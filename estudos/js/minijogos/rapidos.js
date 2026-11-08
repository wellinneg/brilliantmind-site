// Minijogos rápidos de 60 segundos: Tabuada relâmpago, Verdadeiro ou falso e Necessidade ou desejo.
import { el } from '../ui.js';
import { VOCABULARIO } from './vocabulario.js';
import { cronometro, encerrarPartida, mostrarResultado } from './motor.js';
import { sons } from '../sons.js';
import { pop } from '../efeitos.js';

const sorteio = n => Math.floor(Math.random() * n);
const misturar = a => a.map(x => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map(x => x[1]);

// ---------- motor comum: perguntas em sequência contra o relógio ----------
function corrida(area, { titulo, tempo, proxima, aoFim, cabecalho }) {
  let acertos = 0, erros = 0, acabou = false;
  const visor = el('span', { class: 'cronometro' });
  const placar = el('span', {}, '✅ 0');
  const palco = el('div', { class: 'palco-rapido' });
  area.replaceChildren(...[el('div', { class: 'barra-jogo' }, placar, visor), cabecalho, palco].filter(Boolean)); // sem cabeçalho não pode virar "null" na tela
  cronometro(visor, { limite: tempo, aoAcabar: () => { acabou = true; aoFim({ acertos, erros }); } });
  const seguir = () => {
    if (acabou) return;
    const p = proxima();
    palco.replaceChildren(el('p', { class: 'enunciado-rapido' }, p.texto),
      el('div', { class: `opcoes-rapido ${p.opcoes.length === 2 ? 'duas' : ''}` }, p.opcoes.map(o => el('button', {
        class: 'botao secundario', type: 'button',
        onclick: e => {
          if (acabou) return;
          const certo = o.certo;
          if (certo) { acertos++; sons.moeda(); pop(placar); } else { erros++; sons.erro(); pop(e.currentTarget, 'tremer'); }
          placar.textContent = `✅ ${acertos}`;
          if (p.explica && !certo) palco.append(el('p', { class: 'erro-batalha' }, p.explica));
          setTimeout(seguir, certo ? 150 : 700);
        },
      }, o.texto))));
  };
  seguir();
}

// ---------- ✖️ Tabuada relâmpago ----------
export function tabuada(area, { t, ano }) {
  const forte = ['8ano', '9ano'].includes(ano);
  corrida(area, {
    tempo: 60,
    proxima: () => {
      const a = sorteio(forte ? 11 : 8) + 2, b = sorteio(forte ? 11 : 8) + 2;
      const divide = forte && Math.random() < 0.4;
      const certa = divide ? b : a * b;
      const texto = divide ? `${a * b} ÷ ${a} = ?` : `${a} × ${b} = ?`;
      const opcoes = new Set([certa]);
      for (const d of misturar([1, 2, a, b, 10, -1, -2, -a])) { if (opcoes.size === 4) break; if (certa + d > 0) opcoes.add(certa + d); }
      return { texto, opcoes: misturar([...opcoes]).map(v => ({ texto: String(v), certo: v === certa })) };
    },
    aoFim: async ({ acertos, erros }) => {
      const moedas = Math.min(15, acertos);
      const fim = await encerrarPartida({ tipo: 'tabuada', t, moedas, recorde: { valor: acertos, menorMelhor: false } });
      mostrarResultado(area, { titulo: '⏰ Tempo!', linhas: [`Contas certas: ${acertos}`, `Erradas: ${erros}`], fim, t, tipo: 'tabuada', jogarDeNovo: () => tabuada(area, { t, ano }) });
    },
  });
}

// ---------- ✅ Verdadeiro ou falso ----------
export function verdadeiroFalso(area, { t, ano, grupo }) {
  const pares = VOCABULARIO[grupo];
  corrida(area, {
    tempo: 60,
    proxima: () => {
      const [palavra, def] = pares[sorteio(pares.length)];
      const verdade = Math.random() < 0.5;
      let mostrada = def;
      if (!verdade) { let outro; do { outro = pares[sorteio(pares.length)]; } while (outro[0] === palavra); mostrada = outro[1]; }
      return {
        texto: `${palavra}: ${mostrada.charAt(0).toLowerCase()}${mostrada.slice(1)}.`,
        explica: `${palavra} = ${def}.`,
        opcoes: [{ texto: '✅ Verdadeiro', certo: verdade }, { texto: '❌ Falso', certo: !verdade }],
      };
    },
    aoFim: async ({ acertos, erros }) => {
      const moedas = Math.min(15, acertos);
      const fim = await encerrarPartida({ tipo: 'vf', t, moedas, recorde: { valor: acertos, menorMelhor: false } });
      mostrarResultado(area, { titulo: '⏰ Tempo!', linhas: [`Certas: ${acertos}`, `Erradas: ${erros}`], fim, t, tipo: 'vf', jogarDeNovo: () => verdadeiroFalso(area, { t, ano, grupo }) });
    },
  });
}

// ---------- 🛒 Necessidade ou desejo ----------
export const ITENS_NECESSIDADE = ['Arroz e feijão', 'Conta de luz', 'Remédio receitado pelo médico', 'Material escolar', 'Aluguel da casa',
  'Conta de água', 'Passagem de ônibus para a escola', 'Sabonete e pasta de dente', 'Gás de cozinha', 'Agasalho para o frio'];
export const ITENS_DESEJO = ['Tênis de marca famosa', 'Videogame novo', 'Skin de jogo online', 'Sorvete todo dia', 'Celular do último modelo',
  'Brinquedo da propaganda', 'Lanche no shopping', 'Boné colecionável', 'Mais um streaming', 'Fone novo tendo um que funciona'];

export function necessidadeDesejo(area, { t, ano }) {
  const fila = misturar([...ITENS_NECESSIDADE.map(i => [i, true]), ...ITENS_DESEJO.map(i => [i, false])]);
  let k = 0;
  corrida(area, {
    tempo: 45,
    cabecalho: el('p', { class: 'dica' }, 'Necessidade: sem isso fica difícil viver ou estudar. Desejo: é bom, mas dá para viver sem.'),
    proxima: () => {
      const [item, nec] = fila[k++ % fila.length];
      return {
        texto: item,
        explica: nec ? `${item} é necessidade.` : `${item} é desejo.`,
        opcoes: [{ texto: '🏠 Necessidade', certo: nec }, { texto: '🎁 Desejo', certo: !nec }],
      };
    },
    aoFim: async ({ acertos, erros }) => {
      const moedas = Math.min(15, acertos);
      const fim = await encerrarPartida({ tipo: 'desejo', t, moedas, recorde: { valor: acertos, menorMelhor: false } });
      mostrarResultado(area, { titulo: '⏰ Tempo!', linhas: [`Certas: ${acertos}`, `Erradas: ${erros}`, 'Antes de comprar, pergunte: preciso ou só quero?'], fim, t, tipo: 'desejo', jogarDeNovo: () => necessidadeDesejo(area, { t, ano }) });
    },
  });
}
