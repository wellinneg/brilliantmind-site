// Depois que o responsável digita a senha, as telas dos pais ficam abertas por 30 minutos
// (só na memória: fechar ou recarregar o app pede a senha de novo).
const DURACAO = 30 * 60 * 1000;
let ate = 0;
export function liberarPais() { ate = Date.now() + DURACAO; }
export function paisLiberado() { return Date.now() < ate; }
