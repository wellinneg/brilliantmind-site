// Mapa de conquista: Bairro → Cidade → Estado → País → Mundo.
import { el, aviso, navegar } from '../ui.js';
import * as estado from '../estado.js';
import { MATERIAS } from '../rodizio.js';
import {
  CAMADAS, HEROIS, LOJA, RIVAL, EU, lerJogo, gravarJogo, donoDe, moedasNaCamada, metaDaCamada,
  totalDaCamada, comprar, alternarItem, calcularTerritorio, nomeDoDono,
} from '../jogo.js';
import { lerFamilia, sincronizar, sincronizarDepois } from '../familia.js';

let sincronizouAgora = false; // evita sincronizar de novo ao redesenhar depois da sincronização
import { desenharHeroi } from '../herois.js';
import { sons, somLigado, alternarSom } from '../sons.js';

export async function render(raiz, [camadaTxt]) {
  const familia = await lerFamilia();
  if (familia?.codigo && !sincronizouAgora) {
    // Mostra o que já tem e atualiza com os irmãos em segundo plano.
    sincronizar().then(r => { if (r.ok && location.hash.startsWith('#/mapa')) { sincronizouAgora = true; navegarDeNovo(location.hash); } });
  }
  sincronizouAgora = false;
  const jogo = await lerJogo();
  const perfil = await estado.perfil();
  if (!jogo.heroi) return escolherHeroi(raiz, jogo, perfil);

  const vendo = Math.min(Number.isInteger(Number(camadaTxt)) ? Number(camadaTxt) : jogo.camada, jogo.camada);
  const camada = CAMADAS[vendo];
  const redesenhar = () => navegarDeNovo(`#/mapa/${vendo}`);

  // Topo: herói, carteira e som
  const botaoSom = el('button', { class: 'botao secundario pequeno', onclick: () => { botaoSom.textContent = alternarSom() ? '🔊' : '🔇'; } }, somLigado() ? '🔊' : '🔇');
  raiz.append(el('header', { class: 'topo-jogo' },
    desenharHeroi(jogo.heroi, jogo.usando, 'medio'),
    el('div', { class: 'textos' },
      el('strong', {}, jogo.apelido || perfil.nome),
      el('small', {}, `${HEROIS[jogo.heroi].nome}, ${HEROIS[jogo.heroi].titulo}`),
      el('span', { class: 'carteira' }, `🪙 ${jogo.carteira} moedas`)),
    botaoSom));

  // Camadas
  raiz.append(el('div', { class: 'camadas' }, CAMADAS.map((c, k) => el('button', {
    class: `camada ${k === vendo ? 'ativa' : ''}`,
    disabled: k > jogo.camada,
    onclick: () => navegar(`#/mapa/${k}`),
  }, el('span', {}, k > jogo.camada ? '🔒' : c.icone), el('small', {}, c.tipo)))));

  const minhas = moedasNaCamada(jogo, vendo);
  const meta = metaDaCamada(vendo);
  const ultima = vendo === CAMADAS.length - 1;
  raiz.append(el('section', { class: 'cartao' },
    el('h1', {}, `${camada.icone} ${camada.nome}`),
    el('p', { class: 'dica' }, vendo < jogo.camada
      ? 'Camada já vencida. Suas lições agora disputam a próxima camada, mas aqui seus territórios continuam seus.'
      : (ultima ? 'A camada final! Domine o mundo inteiro.' : `Junte ${meta} moedas aqui (60%) para liberar ${CAMADAS[vendo + 1].tipo}.`)),
    barra(minhas, ultima || vendo < jogo.camada ? totalDaCamada(vendo) : meta),
    el('p', { class: 'subtitulo' }, `Você tem ${minhas} de ${totalDaCamada(vendo)} moedas desta camada`)));

  if (familia?.codigo) raiz.append(placarDaFamilia(jogo, familia));

  // Tabuleiro
  const detalhe = el('div', {});
  raiz.append(el('div', { class: `tabuleiro tabuleiro-${camada.id}` }, camada.territorios.map(t => {
    const est = calcularTerritorio(jogo, t);
    const dono = donoDe(est);
    const meu = est.donos[EU] || 0;
    const irmao = dono && dono !== EU && dono !== RIVAL.id ? jogo.outros[dono] : null;
    return el('button', {
      class: `territorio ${dono === EU ? 'meu' : (irmao ? 'irmao' : (dono ? 'rival' : 'livre'))}`,
      onclick: () => mostrarDetalhe(detalhe, jogo, t, camada),
    },
      el('span', { class: 'bandeira' }, dono === EU ? '🚩' : (dono === RIVAL.id ? RIVAL.icone : (irmao ? '⭐' : '🏳️'))),
      irmao ? el('small', { class: 'dono-irmao' }, `de ${irmao.apelido}`) : null,
      el('span', { class: 'icone-territorio' }, t.icone),
      el('strong', {}, t.nome),
      el('small', {}, t.materias.map(m => MATERIAS[m]?.icone).join(' ')),
      el('small', {}, `🪙 ${meu} seu · pote ${est.pote}/${camada.pote}`));
  })), detalhe);

  raiz.append(el('details', { class: 'cartao' },
    el('summary', {}, '❓ Como funciona'),
    el('ul', {},
      el('li', {}, 'Cada lição que você consegue vale moedas (🍼 5, 🙂 10, 💪 15, 👑 25, +5 se acertar tudo).'),
      el('li', {}, 'As moedas saem do pote do território da matéria, na camada em que você está.'),
      el('li', {}, `Quem tiver mais moedas num território é o dono. O ${RIVAL.nome} ${RIVAL.icone}, empresário rival que quer comprar a cidade inteira, começa com um pouco de cada pote.`),
      el('li', {}, 'Pote vazio? Só uma lição 👑 Supremo rouba moedas de quem é dono.'),
      el('li', {}, 'Com 60% das moedas da camada, libera a próxima: Bairro, Cidade, Estado, País e Mundo.'),
      el('li', {}, 'Fechar o dia dá +20 moedas para gastar na loja. Gastar na loja não tira seus territórios.'))));

  raiz.append(secaoLoja(jogo, redesenhar));

  if (jogo.historico.length) {
    raiz.append(el('h2', {}, '📜 Últimas conquistas'), el('ul', { class: 'historico' }, jogo.historico.slice(0, 6).map(h => {
      const t = CAMADAS.flatMap(c => c.territorios).find(x => x.id === h.territorio);
      return el('li', {}, `${t?.icone || ''} ${t?.nome || ''}: +${h.doPote + h.roubou} 🪙${h.roubou ? ` (roubou ${h.roubou} de ${nomeDoDono(jogo, h.de)})` : ''}${h.conquistou ? ' · 🚩 conquistou!' : ''}`);
    })));
  }
  raiz.append(el('button', { class: 'link', onclick: async () => {
    if (!confirm('Trocar de herói? Moedas, territórios e itens continuam.')) return;
    jogo.heroi = null; await gravarJogo(jogo); redesenhar();
  } }, 'Trocar de herói ou apelido'));
}

function placarDaFamilia(jogo, familia) {
  const jogadores = [
    { id: EU, apelido: jogo.apelido, heroi: jogo.heroi, usando: jogo.usando, camada: jogo.camada },
    ...Object.entries(jogo.outros || {}).map(([id, o]) => ({ id, ...o })),
  ];
  const todos = CAMADAS.flatMap(c => c.territorios).map(t => calcularTerritorio(jogo, t));
  for (const j of jogadores) {
    j.moedas = todos.reduce((s, t) => s + (t.donos[j.id] || 0), 0);
    j.territorios = todos.filter(t => donoDe(t) === j.id).length;
  }
  jogadores.sort((a, b) => b.moedas - a.moedas);
  const quando = familia.ultimaSincronizacao ? new Date(familia.ultimaSincronizacao).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'ainda não';
  return el('section', { class: 'cartao placar-familia' },
    el('h2', {}, '🏆 Placar da família'),
    el('ol', {}, jogadores.map((j, k) => el('li', { class: j.id === EU ? 'eu' : '' },
      el('span', { class: 'posicao' }, ['🥇', '🥈', '🥉'][k] || `${k + 1}º`),
      desenharHeroi(j.heroi, j.usando, 'pequeno'),
      el('span', { class: 'textos' }, el('strong', {}, j.id === EU ? `${j.apelido} (você)` : j.apelido),
        el('small', {}, `${CAMADAS[j.camada || 0].icone} ${CAMADAS[j.camada || 0].tipo} · 🚩 ${j.territorios} territórios`)),
      el('span', { class: 'carteira' }, `🪙 ${j.moedas}`)))),
    jogadores.length === 1 ? el('p', { class: 'dica' }, 'Ainda não chegou nenhum irmão. No outro celular, entre com o mesmo código da família (Pais → Disputa da família).') : null,
    el('p', { class: 'dica' }, `Atualizado: ${quando}`));
}

function navegarDeNovo(rota) {
  if (location.hash === rota) dispatchEvent(new HashChangeEvent('hashchange'));
  else navegar(rota);
}

function barra(valor, maximo) {
  const pct = Math.min(100, Math.round((valor / Math.max(1, maximo)) * 100));
  return el('div', { class: 'barra' }, el('div', { class: 'barra-cheia', style: `width:${pct}%` }), el('span', {}, `${valor}/${maximo}`));
}

function mostrarDetalhe(caixa, jogo, t, camada) {
  const est = calcularTerritorio(jogo, t);
  const dono = donoDe(est);
  const nomes = new Proxy({}, { get: (_, id) => (id === EU ? `Você (${jogo.apelido || 'herói'})` : (id === RIVAL.id ? `${RIVAL.icone} ${RIVAL.nome}` : `⭐ ${nomeDoDono(jogo, id)}`)) });
  caixa.replaceChildren(el('section', { class: 'cartao detalhe-territorio' },
    el('h2', {}, `${t.icone} ${t.nome}`),
    el('p', {}, `Matérias que valem aqui: ${t.materias.map(m => `${MATERIAS[m]?.icone} ${MATERIAS[m]?.nome}`).join(', ')}`),
    el('p', {}, dono === EU ? '🚩 Este território é seu!' : (dono ? `Dono atual: ${nomes[dono]}` : 'Ninguém é dono ainda.')),
    el('table', { class: 'tabela' },
      el('tr', {}, el('th', {}, 'Quem'), el('th', {}, 'Moedas')),
      Object.entries(est.donos).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1])
        .map(([id, n]) => el('tr', {}, el('td', {}, nomes[id]), el('td', {}, n))),
      el('tr', {}, el('td', {}, '🪙 Ainda no pote'), el('td', {}, `${est.pote} de ${camada.pote}`))),
    est.pote === 0 && dono !== EU ? el('p', { class: 'caixa-dica' }, '👑 Pote vazio: faça uma lição Supremo dessas matérias para roubar moedas do dono!') : null));
  caixa.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function secaoLoja(jogo, redesenhar) {
  return el('section', { class: 'cartao' },
    el('h2', {}, '🛍️ Loja do herói'),
    el('p', { class: 'dica' }, `Você tem 🪙 ${jogo.carteira}. Toque num item comprado para usar ou tirar.`),
    el('div', { class: 'loja' }, LOJA.map(item => {
      const tem = jogo.itens.includes(item.id);
      const usando = jogo.usando[item.parte] === item.id;
      return el('button', {
        class: `item-loja ${tem ? 'tem' : ''} ${usando ? 'usando' : ''}`,
        disabled: !tem && jogo.carteira < item.preco,
        onclick: async () => {
          try {
            if (tem) alternarItem(jogo, item.id);
            else { comprar(jogo, item.id); sons.compra(); aviso(`Comprou: ${item.nome}!`); }
            await gravarJogo(jogo); sincronizarDepois(); redesenhar();
          } catch (e) { sons.erro(); aviso(e.message); }
        },
      }, el('span', { class: 'icone-item' }, item.icone), el('small', {}, item.nome),
        el('small', {}, tem ? (usando ? '✅ usando' : 'guardado') : `🪙 ${item.preco}`));
    })));
}

function escolherHeroi(raiz, jogo, perfil) {
  let escolhido = Object.keys(HEROIS)[0];
  const apelido = el('input', { id: 'apelido', maxlength: 16, value: jogo.apelido || perfil.nome, autocomplete: 'off' });
  const cartoes = Object.entries(HEROIS).map(([id, h]) => el('button', {
    class: `escolha-heroi ${id === escolhido ? 'ativa' : ''}`,
    onclick: e => {
      escolhido = id;
      cartoes.forEach(c => c.classList.remove('ativa'));
      e.currentTarget.classList.add('ativa');
      sons.moeda();
    },
  }, desenharHeroi(id, {}, 'grande'), el('strong', {}, h.nome), el('small', {}, h.titulo)));
  raiz.append(
    el('h1', {}, '🗺️ Escolha seu herói'),
    el('p', { class: 'dica' }, 'Seu herói vai conquistar a Vila Brilliant, a cidade, o estado, o país e o mundo com as moedas das lições.'),
    el('div', { class: 'herois' }, cartoes),
    el('div', { class: 'campo' }, el('label', { for: 'apelido' }, 'Apelido no jogo'), apelido),
    el('button', { class: 'botao grande', onclick: async () => {
      const nome = apelido.value.trim();
      if (!nome) return aviso('Escolha um apelido.');
      jogo.heroi = escolhido; jogo.apelido = nome;
      await gravarJogo(jogo);
      sons.conquista();
      navegarDeNovo('#/mapa');
    } }, 'Começar a aventura'));
}
