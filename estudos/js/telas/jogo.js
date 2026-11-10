// Tela de um minijogo: #/jogo/<tipo>/<lugar>. Só libera depois das lições do dia.
import { el, navegar } from '../ui.js';
import * as estado from '../estado.js';
import { CAMADAS, lerJogo } from '../jogo.js';
import { carregarContexto } from './hoje.js';
import { MINIJOGOS, situacao } from '../minijogos/motor.js';

const MODULOS = {
  palavras: () => import('../minijogos/palavras.js'),
  objetos: () => import('../minijogos/objetos.js'),
  memoria: () => import('../minijogos/memoria.js'),
  caixa: () => import('../minijogos/caixa.js'),
  tabuada: () => import('../minijogos/rapidos.js').then(m => ({ iniciar: m.tabuada })),
  vf: () => import('../minijogos/rapidos.js').then(m => ({ iniciar: m.verdadeiroFalso })),
  desejo: () => import('../minijogos/rapidos.js').then(m => ({ iniciar: m.necessidadeDesejo })),
  embaralhada: () => import('../minijogos/logica.js').then(m => ({ iniciar: m.palavraEmbaralhada })),
  pares: () => import('../minijogos/logica.js').then(m => ({ iniciar: m.ligarPares })),
  cofre: () => import('../minijogos/logica.js').then(m => ({ iniciar: m.cofre })),
  quente: () => import('../minijogos/quente.js'),
};

export async function render(raiz, [tipo, id]) {
  const jogo = await lerJogo();
  const t = CAMADAS.flatMap(c => c.territorios).find(x => x.id === id);
  const k = CAMADAS.findIndex(c => c.territorios.includes(t));
  if (!MODULOS[tipo] || !t || !jogo.heroi || k > jogo.camada) { navegar('#/mapa'); return; }
  const info = MINIJOGOS[tipo];
  raiz.append(el('button', { class: 'voltar', onclick: () => navegar(`#/lugar/${t.id}`) }, `← ${t.icone} ${t.nome}`),
    el('h1', {}, `${info.icone} ${info.nome}`));

  const { reg } = await carregarContexto();
  const sit = await situacao(reg);
  if (!sit.liberado) {
    raiz.append(el('section', { class: 'cartao' },
      el('p', {}, '🔒 Os minijogos liberam depois que você termina os blocos de lição de hoje.'),
      el('button', { class: 'botao grande', onclick: () => navegar('#/hoje') }, 'Ir para as lições de hoje')));
    return;
  }
  const area = el('div', { class: 'area-jogo' });
  raiz.append(area);
  const perfil = await estado.perfil();
  const modulo = await MODULOS[tipo]();
  modulo.iniciar(area, { t, ano: perfil.ano, grupo: t.grupo });
}
