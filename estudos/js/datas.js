const doisDigitos = n => String(n).padStart(2, '0');
export function hojeISO(d = new Date()) {
  return `${d.getFullYear()}-${doisDigitos(d.getMonth() + 1)}-${doisDigitos(d.getDate())}`;
}
export function deISO(s) { const [a, m, d] = s.split('-').map(Number); return new Date(a, m - 1, d); }
export function diaAnterior(s) { const d = deISO(s); d.setDate(d.getDate() - 1); return hojeISO(d); }
export function ehFimDeSemana(s) { const w = deISO(s).getDay(); return w === 0 || w === 6; }
export function exibir(s) { const [a, m, d] = s.split('-'); return `${d}/${m}/${a}`; }
