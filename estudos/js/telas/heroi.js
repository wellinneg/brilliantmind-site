// Trocar de animal (#/heroi), pelo botão do rodapé. Notas, territórios e itens continuam.
import { lerJogo } from '../jogo.js';
import * as estado from '../estado.js';
import { escolherHeroi } from './mapa.js';

export async function render(raiz) {
  const jogo = await lerJogo();
  escolherHeroi(raiz, jogo, await estado.perfil());
}
