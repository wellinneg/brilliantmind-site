// Trocar de animal (#/heroi), pelo botão do rodapé. Notas, territórios e itens continuam.
import { lerJogo } from '../jogo.js';
import * as estado from '../estado.js';
import { escolherHeroi } from './mapa.js';
import { lerFamilia, sincronizar } from '../familia.js';

export async function render(raiz) {
  if ((await lerFamilia())?.codigo) await sincronizar().catch(() => {});   // animais dos irmãos atualizados
  const jogo = await lerJogo();
  escolherHeroi(raiz, jogo, await estado.perfil());
}
