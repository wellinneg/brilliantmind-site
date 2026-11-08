import { lerConfig } from './db.js';
import { el } from './ui.js';
import { trocarComTransicao } from './efeitos.js';
import { zerarDemonstracaoSePreciso } from './inicio-oficial.js';

const ROTAS = {
  configuracao: () => import('./telas/configuracao.js'),
  hoje: () => import('./telas/hoje.js'),
  mapa: () => import('./telas/mapa.js'),
  lugar: () => import('./telas/lugar.js'),
  jogo: () => import('./telas/jogo.js'),
  jogos: () => import('./telas/jogos.js'),
  missoes: () => import('./telas/missoes.js'),
  duelo: () => import('./telas/duelo.js'),
  heroi: () => import('./telas/heroi.js'),
  ouvir: () => import('./telas/ouvir.js'),
  empresa: () => import('./telas/empresa.js'),
  chefao: () => import('./telas/chefao.js'),
  prova: () => import('./telas/prova.js'),
  banco: () => import('./telas/banco.js'),
  licao: () => import('./telas/licao.js'),
  fechamento: () => import('./telas/fechamento.js'),
  conquistas: () => import('./telas/conquistas.js'),
  revisao: () => import('./telas/revisao.js'),
  retorno: () => import('./telas/retorno.js'),
  pais: () => import('./telas/pais.js'),
  biblioteca: () => import('./telas/biblioteca.js'),
};

// botão do rodapé com a foto do animal atual (toque para trocar)
async function atualizarBotaoHeroi() {
  const jogo = await lerConfig('jogo');
  const icone = document.getElementById('nav-heroi');
  if (!icone) return;
  const { imagemDoHeroi } = await import('./herois.js');
  const { HEROIS } = await import('./jogo.js');
  icone.replaceChildren();
  if (jogo?.heroi && HEROIS[jogo.heroi]) icone.append(el('img', { src: imagemDoHeroi(jogo.heroi), alt: '' }));
  else icone.textContent = '🦁';
}

async function rotear() {
  const raiz = document.getElementById('app');
  const nav = document.getElementById('navegacao');
  let [nome, ...args] = location.hash.replace(/^#\/?/, '').split('/');
  // 🚀 1º dia oficial: zera o progresso da demonstração (uma vez só) e começa do zero na tela Hoje
  if (await zerarDemonstracaoSePreciso().catch(() => false)) { nome = 'hoje'; history.replaceState(null, '', '#/hoje'); }
  const perfil = await lerConfig('perfil');
  if (!perfil) nome = 'configuracao';
  else if (!ROTAS[nome] || nome === 'configuracao') nome = 'hoje';
  nav.hidden = nome === 'configuracao';
  const rotaDoRodape = nome === 'conquistas' ? 'missoes' : nome; // Medalhas fica dentro de Missões
  nav.querySelectorAll('a').forEach(a => a.classList.toggle('ativo', a.dataset.rota === rotaDoRodape));
  atualizarBotaoHeroi();
  // Só mostra "Carregando…" se demorar; a troca de tela é animada (transição de jogo).
  const aviso = setTimeout(() => raiz.replaceChildren(el('p', { class: 'subtitulo' }, 'Carregando…')), 300);
  try {
    const tela = await ROTAS[nome]();
    const conteudo = document.createDocumentFragment();
    await tela.render(conteudo, args);
    clearTimeout(aviso);
    trocarComTransicao(() => {
      raiz.replaceChildren(conteudo);
      window.scrollTo(0, 0);
      dispatchEvent(new Event('tela-pronta')); // a tela já está no lugar (ex.: o mapa desce até o tabuleiro)
    });
  } catch (e) {
    clearTimeout(aviso);
    raiz.replaceChildren(
      el('h1', {}, 'Ops, algo deu errado'),
      el('p', { class: 'erro' }, e.message),
      el('button', { class: 'botao', onclick: () => rotear() }, 'Tentar de novo'));
    window.scrollTo(0, 0);
  }
}

addEventListener('hashchange', rotear);
rotear();
navigator.storage?.persist?.();
// No computador de desenvolvimento (localhost) o cache só liga com ?sw=1, para não esconder edições.
const emDesenvolvimento = location.hostname === 'localhost' && !location.search.includes('sw=1');
if ('serviceWorker' in navigator && !emDesenvolvimento) navigator.serviceWorker.register('sw.js').catch(() => {});
