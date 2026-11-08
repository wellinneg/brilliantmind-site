// Mapa de conquista: Bairro → Cidade → Estado → País → Mundo.
import { el, aviso, navegar } from '../ui.js';
import * as estado from '../estado.js';
import { MATERIAS } from '../rodizio.js';
import {
  CAMADAS, HEROIS, LOJA, RIVAL, EU, lerJogo, gravarJogo, donoDe, moedasNaCamada, metaDaCamada,
  totalDaCamada, comprar, alternarItem, calcularTerritorio, nomeDoDono, resumoDoExtrato,
} from '../jogo.js';
import { lerFamilia, sincronizar, sincronizarDepois } from '../familia.js';

let sincronizouAgora = false; // evita sincronizar de novo ao redesenhar depois da sincronização
import { desenharHeroi, cenarioDoHeroi } from '../herois.js';
import { desenharTabuleiro, corDoDono } from '../tabuleiro.js';
import { apresentarPersonagem } from '../apresentacao.js';
import { PODERES } from '../batalha.js';
import { sons, somLigado, alternarSom } from '../sons.js';

export async function render(raiz, [camadaTxt, acao]) {
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
      el('span', { class: 'carteira' }, `💵 ${jogo.carteira} notas`)),
    botaoSom));

  if (jogo.chefao?.camada === jogo.camada) {
    raiz.append(el('button', { class: 'cartao bloco desafio-chefao', onclick: () => navegar('#/chefao') },
      el('span', { class: 'icone' }, RIVAL.icone),
      el('span', { class: 'textos' }, el('small', {}, 'Desafio!'), el('strong', {}, `O ${RIVAL.nome} quer ${CAMADAS[jogo.camada].nome}. Vença a batalha para liberar a próxima camada`)),
      el('span', {}, '⚔️')));
  }

  // Camadas
  raiz.append(el('div', { class: 'camadas' }, CAMADAS.map((c, k) => el('button', {
    class: `camada ${k === vendo ? 'ativa' : ''}`,
    disabled: k > jogo.camada,
    onclick: () => navegarDeNovo(`#/mapa/${k}/ir`),
  }, el('span', {}, k > jogo.camada ? '🔒' : c.icone), el('small', {}, c.tipo)))));

  // Tabuleiro de conquista: a camada como um continente, cada região com o dono em cima
  raiz.append(el('div', { class: 'tabuleiro-conquista' },
    el('h2', { class: 'titulo-tabuleiro' }, `Mapa de Conquistas · ${camada.icone} ${camada.nome}`),
    desenharTabuleiro(jogo, vendo, t => {
      const r = document.querySelector(`[data-territorio="${t.id}"]`); if (r) r.style.viewTransitionName = 'lugar-ativo';
      navegar(`#/lugar/${t.id}`);
    }),
    legendaTabuleiro(jogo)));

  const minhas = moedasNaCamada(jogo, vendo);
  const meta = metaDaCamada(vendo);
  const ultima = vendo === CAMADAS.length - 1;
  raiz.append(el('section', { class: 'cartao' },
    el('h1', {}, `${camada.icone} ${camada.nome}`),
    el('p', { class: 'dica' }, vendo < jogo.camada
      ? 'Camada já vencida. Suas lições agora disputam a próxima camada, mas aqui seus territórios continuam seus.'
      : (ultima ? 'A camada final! Domine o mundo inteiro.' : `Junte ${meta} notas aqui (60%) para liberar ${CAMADAS[vendo + 1].tipo}.`)),
    barra(minhas, ultima || vendo < jogo.camada ? totalDaCamada(vendo) : meta),
    el('p', { class: 'subtitulo' }, `Você tem ${minhas} de ${totalDaCamada(vendo)} notas desta camada`)));

  if (familia?.codigo) raiz.append(placarDaFamilia(jogo, familia));

  // Tabuleiro
  const tabuleiro = el('div', { class: `tabuleiro tabuleiro-${camada.id}` }, camada.territorios.map(t => {
    const est = calcularTerritorio(jogo, t);
    const dono = donoDe(est);
    const meu = est.donos[EU] || 0;
    const irmao = dono && dono !== EU && dono !== RIVAL.id ? jogo.outros[dono] : null;
    return el('button', {
      class: `territorio ${dono === EU ? 'meu' : (irmao ? 'irmao' : (dono ? 'rival' : 'livre'))}`,
      onclick: e => { e.currentTarget.style.viewTransitionName = 'lugar-ativo'; navegar(`#/lugar/${t.id}`); }, // o quadrado "cresce" e vira a cena
    },
      el('span', { class: 'bandeira' }, dono === EU ? '🚩' : (dono === RIVAL.id ? RIVAL.icone : (irmao ? '⭐' : '🏳️'))),
      irmao ? el('small', { class: 'dono-irmao' }, `de ${irmao.apelido}`) : null,
      el('span', { class: 'icone-territorio' }, t.icone),
      el('strong', {}, t.nome),
      el('small', {}, t.materias.map(m => MATERIAS[m]?.icone).join(' ')),
      el('small', {}, `💵 ${meu} seu · pote ${est.pote}/${camada.pote}`));
  }));
  raiz.append(tabuleiro, mapaDeTerritorios(jogo));
  // Veio de um toque no panorama: desce até o tabuleiro (depois que a tela voltou ao topo).
  if (acao === 'ir') addEventListener('tela-pronta', () => tabuleiro.scrollIntoView({ behavior: 'smooth', block: 'start' }), { once: true });

  raiz.append(el('details', { class: 'cartao' },
    el('summary', {}, '❓ Como funciona'),
    el('ul', {},
      el('li', {}, 'Cada lição que você consegue vale notas (🍼 5, 🙂 10, 💪 15, 👑 25, +5 se acertar tudo).'),
      el('li', {}, 'As notas saem do pote do território da matéria, na camada em que você está.'),
      el('li', {}, `Quem tiver mais notas num território é o dono. O ${RIVAL.nome} ${RIVAL.icone}, empresário rival que quer comprar a cidade inteira, começa com um pouco de cada pote.`),
      el('li', {}, 'Pote vazio? Só uma lição 👑 Supremo rouba notas de quem é dono.'),
      el('li', {}, 'Com 60% das notas da camada, libera a próxima: Bairro, Cidade, Estado, País e Mundo.'),
      el('li', {}, 'Fechar o dia dá +20 notas para gastar na loja. Gastar na loja não tira seus territórios.'))));

  raiz.append(secaoLoja(jogo, redesenhar), secaoExtrato(jogo));

  if (jogo.historico.length) {
    raiz.append(el('h2', {}, '📜 Últimas conquistas'), el('ul', { class: 'historico' }, jogo.historico.slice(0, 6).map(h => {
      const t = CAMADAS.flatMap(c => c.territorios).find(x => x.id === h.territorio);
      return el('li', {}, `${t?.icone || ''} ${t?.nome || ''}: +${h.doPote + h.roubou} 💵${h.roubou ? ` (roubou ${h.roubou} de ${nomeDoDono(jogo, h.de)})` : ''}${h.conquistou ? ' · 🚩 conquistou!' : ''}`);
    })));
  }
  raiz.append(el('button', { class: 'link', onclick: async () => {
    if (!confirm('Trocar de herói? Notas, territórios e itens continuam.')) return;
    jogo.heroi = null; await gravarJogo(jogo); redesenhar();
  } }, 'Trocar de herói ou apelido'));
}

function legendaTabuleiro(jogo) {
  const donos = [[EU, jogo.apelido || 'Você', jogo.heroi], ...Object.entries(jogo.outros || {}).map(([id, o]) => [id, o.apelido, o.heroi]), [RIVAL.id, RIVAL.nome, null]];
  return el('div', { class: 'legenda-tabuleiro' }, donos.map(([id, nome, heroi]) => el('span', {},
    el('i', { style: `background:${corDoDono(jogo, id)}` }),
    heroi ? desenharHeroi(heroi, {}, 'pequeno') : el('b', {}, RIVAL.icone), nome)));
}

/** Quadro de todos os 30 territórios, pintados pela cor do dono, com o placar de quem domina. */
function mapaDeTerritorios(jogo) {
  const CORES_IRMAOS = ['#4F8BFF', '#26C6DA', '#AB47BC', '#FF7043'];
  const irmaos = Object.keys(jogo.outros || {});
  const corDe = dono => (dono === EU ? 'var(--lime)' : dono === RIVAL.id ? '#E53935' : dono ? CORES_IRMAOS[irmaos.indexOf(dono) % CORES_IRMAOS.length] : '#607D8B');
  const nomeCurto = dono => (dono === EU ? 'Você' : dono === RIVAL.id ? RIVAL.nome : dono ? (jogo.outros[dono]?.apelido || 'Irmão') : 'Livre');
  const contagem = {};
  const linhas = CAMADAS.map((c, k) => el('div', { class: 'linha-territorios' },
    el('span', { class: 'rotulo-camada', title: c.nome }, k > jogo.camada ? '🔒' : c.icone),
    ...c.territorios.map(t => {
      const dono = donoDe(calcularTerritorio(jogo, t));
      contagem[dono ?? 'livre'] = (contagem[dono ?? 'livre'] || 0) + 1;
      return el('button', {
        class: `celula-territorio ${dono === EU ? 'minha' : ''}`, type: 'button',
        style: `--cor-dono:${corDe(dono)}`, title: `${t.nome}: ${nomeCurto(dono)}`,
        disabled: k > jogo.camada,
        onclick: () => navegar(`#/lugar/${t.id}`),
      }, el('span', {}, t.icone), el('small', {}, dono === RIVAL.id ? RIVAL.icone : nomeCurto(dono)));
    })));
  const ordem = [EU, ...irmaos, RIVAL.id, 'livre'].filter(d => contagem[d]);
  return el('section', { class: 'cartao mapa-territorios' },
    el('h2', {}, '🏴 Mapa de territórios'),
    el('div', { class: 'placar-territorios' }, ordem.map(d => el('span', { style: `--cor-dono:${corDe(d === 'livre' ? null : d)}` },
      el('i', {}), `${nomeCurto(d === 'livre' ? null : d)}: ${contagem[d]}`))),
    el('div', { class: 'barra-dominio' }, ordem.map(d => el('div', { style: `flex:${contagem[d]};background:${corDe(d === 'livre' ? null : d)}`, title: `${nomeCurto(d === 'livre' ? null : d)}: ${contagem[d]}` }))),
    ...linhas,
    el('p', { class: 'dica' }, `Você domina ${contagem[EU] || 0} de 30 territórios. Toque num lugar para ver quem manda e conquistar.`));
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
      el('span', { class: 'carteira' }, `💵 ${j.moedas}`)))),
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

function secaoExtrato(jogo) {
  const { ganhou, gastou, saldo, aplicado } = resumoDoExtrato(jogo);
  const linhas = jogo.extrato || [];
  const quando = iso => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  const lista = el('table', { class: 'tabela extrato' },
    el('tr', {}, el('th', {}, 'Quando'), el('th', {}, 'O quê'), el('th', {}, 'Notas'), el('th', {}, 'Saldo')),
    linhas.slice(0, 30).map(l => el('tr', {},
      el('td', {}, quando(l.quando)),
      el('td', {}, l.descricao),
      el('td', { class: l.valor < 0 ? 'saida' : 'entrada' }, `${l.valor > 0 ? '+' : ''}${l.valor}`),
      el('td', {}, l.saldo))));
  return el('details', { class: 'cartao' },
    el('summary', {}, `📒 Extrato de notas · saldo 💵 ${saldo}`),
    el('div', { class: 'resumo-extrato' },
      el('span', {}, 'Ganhou ', el('strong', { class: 'entrada' }, `+${ganhou}`)),
      el('span', {}, 'Gastou ', el('strong', { class: 'saida' }, `−${gastou}`)),
      el('span', {}, 'Saldo ', el('strong', {}, saldo)),
      aplicado ? el('span', {}, 'Aplicado ', el('strong', {}, `🏦 ${aplicado}`)) : null),
    linhas.length ? lista : el('p', { class: 'dica' }, 'Ainda não tem movimento. Cada lição, bônus e compra aparece aqui.'),
    linhas.length > 30 ? el('p', { class: 'dica' }, `Mostrando os 30 mais recentes de ${linhas.length}.`) : null);
}

function secaoLoja(jogo, redesenhar) {
  return el('section', { class: 'cartao' },
    el('h2', {}, '🛍️ Loja do herói'),
    el('p', { class: 'dica' }, `Você tem 💵 ${jogo.carteira}. Toque num item comprado para usar ou tirar.`),
    el('div', { class: 'loja' }, LOJA.map(item => {
      const tem = jogo.itens.includes(item.id);
      const usando = jogo.usando[item.parte] === item.id;
      return el('button', {
        class: `item-loja ${tem ? 'tem' : ''} ${usando ? 'usando' : ''}`,
        disabled: !tem && jogo.carteira < item.preco,
        onclick: async () => {
          try {
            if (tem) alternarItem(jogo, item.id);
            else { comprar(jogo, item.id); sons.compra(); aviso(`Comprou ${item.nome} por ${item.preco} 💵. Sobraram ${jogo.carteira} 💵.`); }
            await gravarJogo(jogo); sincronizarDepois(); redesenhar();
          } catch (e) { sons.erro(); aviso(e.message); }
        },
      }, el('span', { class: 'icone-item' }, item.icone), el('small', {}, item.nome),
        el('small', {}, tem ? (usando ? '✅ usando' : 'guardado') : `💵 ${item.preco}`));
    })));
}

export function escolherHeroi(raiz, jogo, perfil) {
  let escolhido = HEROIS[jogo.heroi] ? jogo.heroi : Object.keys(HEROIS)[0];
  const apelido = el('input', { id: 'apelido', maxlength: 16, value: jogo.apelido || perfil.nome, autocomplete: 'off' });
  const cartoes = Object.entries(HEROIS).map(([id, h]) => el('button', {
    class: `escolha-heroi ${id === escolhido ? 'ativa' : ''}`,
    style: `background-image:url(${cenarioDoHeroi(id)})`,
    onclick: e => {
      escolhido = id;
      cartoes.forEach(c => c.classList.remove('ativa'));
      e.currentTarget.classList.add('ativa');
      sons.moeda();
    },
  }, desenharHeroi(id, {}, 'grande'), el('strong', {}, h.nome), el('small', {}, h.titulo),
    el('small', { class: 'poder-card' }, `${PODERES[id].icone} ${PODERES[id].nome}: ${PODERES[id].desc}`)));
  raiz.append(
    el('h1', {}, '🗺️ Escolha seu animal'),
    el('p', { class: 'dica' }, 'Seu animal vai conquistar a Vila Brilliant, a cidade, o estado, o país e o mundo com as notas das lições.'),
    el('div', { class: 'herois' }, cartoes),
    el('div', { class: 'campo' }, el('label', { for: 'apelido' }, 'Apelido no jogo'), apelido),
    el('button', { class: 'botao grande', onclick: async () => {
      const nome = apelido.value.trim();
      if (!nome) return aviso('Escolha um apelido.');
      jogo.heroi = escolhido; jogo.apelido = nome;
      await gravarJogo(jogo);
      await apresentarPersonagem(escolhido, nome); // ~3 s girando em 3D (toque pula)
      navegarDeNovo('#/mapa');
    } }, 'Começar a aventura'));
}
