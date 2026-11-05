import { comprimirFoto } from './fotos.js';

export function el(tag, props = {}, ...filhos) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') n.className = v;
    else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
    else if (v === true) n.setAttribute(k, '');
    else if (v !== false && v != null) n.setAttribute(k, v);
  }
  for (const f of filhos.flat()) {
    if (f == null || f === false) continue;
    n.append(f instanceof Node ? f : document.createTextNode(String(f)));
  }
  return n;
}

export function aviso(texto) {
  const t = el('div', { class: 'aviso', role: 'status' }, texto);
  document.body.append(t);
  setTimeout(() => t.remove(), 3500);
}

export function navegar(rota) { location.hash = rota; }

export function campoFoto(rotulo, jaTem, aoEscolher) {
  const titulo = jaTem ? `✅ ${rotulo} (trocar)` : `📷 ${rotulo}`;
  const botao = el('button', { class: `botao ${jaTem ? 'feito' : ''}`, type: 'button' }, titulo);
  const input = el('input', {
    type: 'file', accept: 'image/*', capture: 'environment', hidden: true,
    onchange: async e => {
      const arquivo = e.target.files[0];
      if (!arquivo) return;
      botao.disabled = true; botao.textContent = 'Salvando…';
      try { await aoEscolher(await comprimirFoto(arquivo)); }
      catch (err) { aviso('Não consegui salvar a foto: ' + err.message); botao.disabled = false; botao.textContent = titulo; }
    },
  });
  botao.addEventListener('click', () => input.click());
  return el('div', { class: 'campo-foto' }, botao, input);
}
