// Escolha da série (ano escolar), usada na tela inicial e no painel dos pais.
import { el, aviso, navegar } from '../ui.js';
import * as db from '../db.js';
import * as estado from '../estado.js';
import { senhaDosPaisConfere } from '../pin.js';
import { liberarPais } from '../sessao-pais.js';
import { ANOS } from '../rodizio.js';

async function botoesDeAno(anoAtual) {
  const botoes = [];
  for (const [ano, nome] of Object.entries(ANOS)) {
    const dia = await estado.proximoDia(ano);
    botoes.push(el('button', {
      class: `botao ${ano === anoAtual ? 'feito' : 'secundario'}`,
      disabled: ano === anoAtual,
      onclick: async () => {
        await estado.trocarAno(ano);
        aviso(`Agora é ${nome}.`);
        if (location.hash === '#/hoje') dispatchEvent(new HashChangeEvent('hashchange'));
        else navegar('#/hoje');
      },
    }, `${nome}${ano === anoAtual ? ' (atual)' : ''} · dia ${dia}`));
  }
  return [el('p', { class: 'dica' }, 'Cada série guarda o próprio progresso: dá para trocar e voltar sem perder nada.'),
    el('div', { class: 'opcoes grade' }, botoes)];
}

/** Abre/fecha a escolha de série dentro de `caixa`. Com `pedirSenha`, exige a senha dos pais antes. */
export async function alternarSeletorDeSerie(caixa, anoAtual, { pedirSenha = false } = {}) {
  if (caixa.childElementCount) { caixa.replaceChildren(); return; }
  if (!pedirSenha) { caixa.append(...await botoesDeAno(anoAtual)); return; }
  const pin = el('input', { id: 'pin-serie', type: 'password', inputmode: 'numeric', maxlength: 4, autocomplete: 'off' });
  caixa.append(el('form', {
    class: 'cartao',
    onsubmit: async e => {
      e.preventDefault();
      if (!(await senhaDosPaisConfere(pin.value, await db.lerConfig('pinHash')))) { pin.value = ''; return aviso('Senha errada.'); }
      liberarPais();
      caixa.replaceChildren(el('div', { class: 'cartao' }, ...await botoesDeAno(anoAtual)));
    },
  }, el('div', { class: 'campo' }, el('label', { for: 'pin-serie' }, 'Senha do responsável para mudar a série'), pin),
    el('button', { class: 'botao', type: 'submit' }, 'Continuar')));
  pin.focus();
}
