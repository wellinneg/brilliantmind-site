// Versão 2: o registro do dia passou a ter chave "<ano>|<data>" (antes era só a data).
// Na troca de versão os dados antigos (só testes no computador) são recriados do zero.
const VERSAO = 2;
const STORES = ['config', 'dias', 'midias'];
let nomeAtual = 'trilha-bm';
let conexao = null;

export function configurarBanco(nome) { if (conexao) conexao.close(); conexao = null; nomeAtual = nome; }

function abrir() {
  if (conexao) return Promise.resolve(conexao);
  return new Promise((ok, erro) => {
    const req = indexedDB.open(nomeAtual, VERSAO);
    req.onupgradeneeded = () => {
      const banco = req.result;
      for (const nome of [...banco.objectStoreNames]) banco.deleteObjectStore(nome);
      banco.createObjectStore('config', { keyPath: 'chave' });
      banco.createObjectStore('dias', { keyPath: 'id' });
      banco.createObjectStore('midias', { keyPath: 'id' });
    };
    req.onsuccess = () => { conexao = req.result; ok(conexao); };
    req.onerror = () => erro(req.error);
  });
}

function operar(store, modo, fn) {
  return abrir().then(banco => new Promise((ok, erro) => {
    const t = banco.transaction(store, modo);
    const req = fn(t.objectStore(store));
    t.oncomplete = () => ok(req ? req.result : undefined);
    t.onerror = () => erro(t.error);
    t.onabort = () => erro(t.error || new Error('Transação abortada'));
  }));
}

export const lerConfig = chave => operar('config', 'readonly', s => s.get(chave)).then(r => r?.valor);
export const gravarConfig = (chave, valor) => operar('config', 'readwrite', s => s.put({ chave, valor }));
export const listarConfig = () => operar('config', 'readonly', s => s.getAll());
export const lerDia = id => operar('dias', 'readonly', s => s.get(id));
export const gravarDia = reg => operar('dias', 'readwrite', s => s.put(reg));
export const listarDias = () => operar('dias', 'readonly', s => s.getAll());
export const apagarDia = id => operar('dias', 'readwrite', s => s.delete(id));
export const gravarMidia = (id, blob, info = {}) =>
  operar('midias', 'readwrite', s => s.put({ id, blob, ...info, criadoEm: new Date().toISOString() }));
export const lerMidia = id => operar('midias', 'readonly', s => s.get(id));
export const listarMidias = () => operar('midias', 'readonly', s => s.getAll());
export const colocar = (store, obj) => operar(store, 'readwrite', s => s.put(obj));
export const apagarTudo = () => Promise.all(STORES.map(n => operar(n, 'readwrite', s => s.clear())));
