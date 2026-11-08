import { el, navegar, aviso } from '../ui.js';
import * as db from '../db.js';
import { hashPin, pinValido } from '../pin.js';
import { ANOS } from '../rodizio.js';

export async function render(raiz) {
  const nome = el('input', { id: 'nome', autocomplete: 'off', maxlength: 30 });
  const pin1 = el('input', { id: 'pin1', type: 'password', inputmode: 'numeric', maxlength: 4, autocomplete: 'off' });
  const pin2 = el('input', { id: 'pin2', type: 'password', inputmode: 'numeric', maxlength: 4, autocomplete: 'off' });
  const opcao = (valor, texto) => el('label', {}, el('input', { type: 'radio', name: 'ano', value: valor }), ' ', texto);
  const form = el('form', {
    onsubmit: async e => {
      e.preventDefault();
      const ano = form.querySelector('input[name=ano]:checked')?.value;
      if (!nome.value.trim()) return aviso('Digite o nome.');
      if (!ano) return aviso('Escolha o ano escolar.');
      if (!pinValido(pin1.value)) return aviso('A senha precisa ter 4 números.');
      if (pin1.value !== pin2.value) return aviso('As duas senhas não são iguais.');
      await db.gravarConfig('pinHash', await hashPin(pin1.value));
      await db.gravarConfig('perfil', { nome: nome.value.trim(), ano });
      navegar('#/hoje');
    },
  },
    el('div', { class: 'campo' }, el('label', { for: 'nome' }, 'Nome de quem vai estudar'), nome),
    el('div', { class: 'campo' }, el('span', {}, 'Ano escolar'), el('div', { class: 'opcoes grade' }, Object.entries(ANOS).map(([v, t]) => opcao(v, t)))),
    el('h2', {}, '🔒 Para o responsável'),
    el('p', { class: 'dica' }, 'Crie uma senha de 4 números para o painel dos pais. Não conte para a criança.'),
    el('div', { class: 'campo' }, el('label', { for: 'pin1' }, 'Senha'), pin1),
    el('div', { class: 'campo' }, el('label', { for: 'pin2' }, 'Repita a senha'), pin2),
    el('button', { class: 'botao grande', type: 'submit' }, 'Começar a trilha'));
  raiz.append(
    el('h1', {}, 'Bem-vindo à Trilha Brilliant Mind! 🚀'),
    el('p', {}, 'Cerca de 50 minutos por dia para aprender o que a escola não ensina.'),
    form,
    el('p', { class: 'dica' }, 'Trocou de celular? Depois de configurar, restaure a cópia de segurança no painel dos pais.'),
    el('p', { class: 'credito' }, 'Sistema desenvolvido pela BMC Contabilidade'));
}
