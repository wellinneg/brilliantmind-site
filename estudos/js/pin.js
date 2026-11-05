export function pinValido(pin) { return /^\d{4}$/.test(pin); }
export async function hashPin(pin) {
  const dados = new TextEncoder().encode('trilha-bm:' + pin);
  const h = await crypto.subtle.digest('SHA-256', dados);
  return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join('');
}

// Senha master do responsável (pedida pelo Wellington): abre o painel em qualquer celular,
// mesmo se a senha normal for trocada ou esquecida. Guardada só como hash.
const HASH_MASTER = 'd0ac5c6ba3eefb1c1ecf3b3254b7e3ab7b18761d1d9922cddf34949c7c95f710';

/** Confere a senha dos pais: a cadastrada no celular ou a master. */
export async function senhaDosPaisConfere(pin, hashCadastrado) {
  const h = await hashPin(String(pin || ''));
  return h === HASH_MASTER || (!!hashCadastrado && h === hashCadastrado);
}
