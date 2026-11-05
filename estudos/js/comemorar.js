// Mostra o que a lição rendeu no jogo de conquista, com som.
import { el, navegar } from './ui.js';
import { RIVAL } from './jogo.js';
import { sons } from './sons.js';

export function comemorarJogo(res) {
  if (!res || !res.territorio) return null;
  const t = res.territorio;
  const linhas = [el('strong', { class: 'moedas-pulando' }, `+${res.moedas} 🪙`)];
  if (res.doPote) linhas.push(el('p', {}, `${res.doPote} moedas do pote de ${t.icone} ${t.nome}.`));
  if (res.roubou) linhas.push(el('p', {}, `👑 Golpe Supremo! Você roubou ${res.roubou} moedas ${res.de === RIVAL.id ? `do ${RIVAL.nome} ${RIVAL.icone}` : `de ${res.deNome} ⭐`}.`));
  if (!res.doPote && !res.roubou) linhas.push(el('p', {}, `O pote de ${t.icone} ${t.nome} está vazio. As moedas foram para a sua carteira; só lição 👑 Supremo rouba território.`));
  if (res.conquistou) linhas.push(el('p', { class: 'conquista-nova' }, `🚩 ${t.nome} agora é território seu!`));
  if (res.liberou) linhas.push(el('p', { class: 'conquista-nova' }, `${res.liberou.icone} Nova camada liberada: ${res.liberou.nome}!`));

  if (res.liberou) sons.camada();
  else if (res.conquistou) sons.conquista();
  else if (res.roubou) sons.roubo();
  else sons.moeda();

  return el('div', { class: 'cartao premio-jogo' }, ...linhas,
    el('button', { class: 'botao secundario', onclick: () => navegar('#/mapa') }, '🗺️ Ver no mapa'));
}
