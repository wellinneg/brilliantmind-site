// Painel dos pais → "Disputa da família": criar a família, entrar com o código, sincronizar.
import { el, aviso } from '../ui.js';
import { lerJogo } from '../jogo.js';
import { firebaseConfigurado, lerFamilia, criarFamilia, entrarNaFamilia, sairDaFamilia, sincronizar } from '../familia.js';

export async function secaoFamilia() {
  const caixa = el('div', {});
  await desenhar(caixa);
  return el('section', {}, el('h2', {}, '👨‍👩‍👧 Disputa da família (internet)'), caixa);
}

function resultado(r) {
  if (r.ok) return `Sincronizado: ${r.jogadores} jogador(es) na família.`;
  return `Sem sincronizar agora (${r.erro || 'sem internet'}). O app tenta de novo sozinho.`;
}

async function desenhar(caixa) {
  const de_novo = () => desenhar(caixa);
  if (!firebaseConfigurado()) {
    caixa.replaceChildren(el('p', { class: 'dica' },
      'Ainda falta ligar o Firebase da família (passo a passo no FIREBASE_PASSO_A_PASSO.pdf). Até lá, cada celular joga sozinho contra o Magnata, o empresário rival do jogo.'));
    return;
  }
  const familia = await lerFamilia();
  const jogo = await lerJogo();
  if (!jogo.heroi) {
    caixa.replaceChildren(el('p', { class: 'dica' }, 'Primeiro a criança escolhe o herói e o apelido na aba 🗺️ Mapa.'));
    return;
  }
  if (familia?.codigo) {
    const nomes = Object.values(jogo.outros || {}).map(o => o.apelido).filter(Boolean);
    caixa.replaceChildren(
      el('p', {}, 'Código da família: ', el('strong', { class: 'codigo-familia' }, familia.codigo)),
      el('p', { class: 'dica' }, 'No celular do irmão: Pais → Disputa da família → Entrar com código. Não divulgue o código fora de casa.'),
      el('p', {}, nomes.length ? `Disputando com: ${nomes.join(', ')}` : 'Nenhum irmão entrou ainda.'),
      el('p', { class: 'dica' }, 'Vai para a internet só: apelido, herói, itens, camada e moedas do jogo. Notas, respostas, fotos e áudios ficam só neste celular.'),
      el('div', { class: 'linha' },
        el('button', { class: 'botao', onclick: async e => {
          e.currentTarget.disabled = true;
          aviso(resultado(await sincronizar())); de_novo();
        } }, '🔄 Sincronizar agora'),
        el('button', { class: 'botao secundario', onclick: async () => {
          if (!confirm('Sair da disputa da família? As moedas deste celular continuam; o placar dos irmãos some daqui.')) return;
          await sairDaFamilia(); de_novo();
        } }, 'Sair da família')));
    return;
  }
  const campo = el('input', { id: 'codigo-familia', maxlength: 9, autocomplete: 'off', placeholder: 'ABCD-2345', style: 'text-transform:uppercase' });
  caixa.replaceChildren(
    el('p', { class: 'dica' }, 'Faça isto uma vez: no 1º celular, "Criar a família" mostra um código. No celular do irmão, digite o mesmo código.'),
    el('button', { class: 'botao grande', onclick: async e => {
      e.currentTarget.disabled = true;
      const r = await criarFamilia();
      aviso(r.ok ? `Família criada! Código ${r.codigo}` : `Família criada (${r.codigo}), mas sem internet agora. Tenta de novo depois.`);
      de_novo();
    } }, '✨ Criar a família (1º celular)'),
    el('form', { onsubmit: async e => {
      e.preventDefault();
      try { const r = await entrarNaFamilia(campo.value); aviso(resultado(r)); de_novo(); }
      catch (err) { aviso(err.message); }
    } },
      el('div', { class: 'campo' }, el('label', { for: 'codigo-familia' }, 'Já tem o código? Digite aqui'), campo),
      el('button', { class: 'botao secundario grande', type: 'submit' }, 'Entrar com código')));
}
