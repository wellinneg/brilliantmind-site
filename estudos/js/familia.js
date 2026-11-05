// Disputa entre os irmãos (etapa 3): Firebase pela API web (REST), sem biblioteca extra.
// Vai para a internet só o necessário para o jogo: apelido, herói, itens usados, camada,
// moedas tiradas dos potes e roubos. Nada de nome completo, notas, fotos ou áudios.
// Cada celular escreve só familias/<codigo>/jogadores/<uid> (login anônimo) e lê os outros.
import * as db from './db.js';
import { FIREBASE } from './familia-config.js';
import { lerJogo, gravarJogo } from './jogo.js';

const CHAVE = 'familia';
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem 0/O e 1/I, para não confundir
const TEMPO_LIMITE = 8000;

export const firebaseConfigurado = (cfg = FIREBASE) => !!(cfg.apiKey && cfg.projectId);
export const lerFamilia = async () => (await db.lerConfig(CHAVE)) || null;
const gravarFamilia = f => db.gravarConfig(CHAVE, f);

export function gerarCodigo(aleatorio = n => crypto.getRandomValues(new Uint32Array(n))) {
  const v = aleatorio(8);
  const letras = [...v].map(x => ALFABETO[x % ALFABETO.length]).join('');
  return `${letras.slice(0, 4)}-${letras.slice(4)}`;
}
export function normalizarCodigo(texto) {
  const s = String(texto || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (s.length !== 8 || [...s].some(c => !ALFABETO.includes(c))) return null;
  return `${s.slice(0, 4)}-${s.slice(4)}`;
}

/** O que vai para a internet: só o necessário para o placar e os territórios. */
export function registroPublico(jogo) {
  return {
    apelido: String(jogo.apelido || '').slice(0, 16), heroi: jogo.heroi, usando: jogo.usando || {},
    camada: jogo.camada, doPote: jogo.meu.doPote, roubos: jogo.meu.roubos,
  };
}

async function pedir(http, url, opcoes = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TEMPO_LIMITE);
  try {
    const resp = await http(url, { ...opcoes, signal: ctrl.signal });
    const corpo = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new Error(corpo?.error?.message || `Erro ${resp.status} no Firebase`);
    return corpo;
  } finally { clearTimeout(timer); }
}

/** Login anônimo: cria a conta na 1ª vez e renova o acesso quando vence (1 hora). */
async function token(familia, { http, cfg, agora }) {
  if (familia.idToken && familia.expira > agora() + 60000) return familia.idToken;
  let r;
  if (familia.refreshToken) {
    r = await pedir(http, `https://securetoken.googleapis.com/v1/token?key=${cfg.apiKey}`, {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(familia.refreshToken)}`,
    });
    Object.assign(familia, { idToken: r.id_token, refreshToken: r.refresh_token, uid: r.user_id, expira: agora() + Number(r.expires_in) * 1000 });
  } else {
    r = await pedir(http, `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${cfg.apiKey}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ returnSecureToken: true }),
    });
    Object.assign(familia, { idToken: r.idToken, refreshToken: r.refreshToken, uid: r.localId, expira: agora() + Number(r.expiresIn) * 1000 });
  }
  await gravarFamilia(familia);
  return familia.idToken;
}

const base = (cfg, codigo) => `https://firestore.googleapis.com/v1/projects/${cfg.projectId}/databases/(default)/documents/familias/${codigo}/jogadores`;

/** Envia o meu registro e baixa o dos irmãos. Sem internet, só avisa e tenta na próxima. */
export async function sincronizar({ http = (...a) => fetch(...a), cfg = FIREBASE, agora = () => Date.now() } = {}) {
  const familia = await lerFamilia();
  if (!familia?.codigo || !firebaseConfigurado(cfg)) return { ok: false, motivo: 'sem-familia' };
  const jogo = await lerJogo();
  try {
    const tk = await token(familia, { http, cfg, agora });
    const auth = { Authorization: `Bearer ${tk}` };
    jogo.uid = familia.uid;
    await pedir(http, `${base(cfg, familia.codigo)}/${familia.uid}`, {
      method: 'PATCH', headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: {
        dados: { stringValue: JSON.stringify(registroPublico(jogo)) },
        atualizado: { timestampValue: new Date(agora()).toISOString() },
      } }),
    });
    const lista = await pedir(http, `${base(cfg, familia.codigo)}?pageSize=20`, { headers: auth });
    const outros = {};
    for (const doc of lista.documents || []) {
      const uid = doc.name.split('/').pop();
      if (uid === familia.uid) continue;
      try { outros[uid] = { ...JSON.parse(doc.fields?.dados?.stringValue || '{}'), atualizado: doc.fields?.atualizado?.timestampValue || null }; }
      catch { /* registro estragado de outro celular: ignora */ }
    }
    // Relê o jogo: uma lição pode ter terminado enquanto a internet respondia.
    const atual = await lerJogo();
    atual.uid = familia.uid; atual.outros = outros;
    await gravarJogo(atual);
    familia.ultimaSincronizacao = new Date(agora()).toISOString();
    await gravarFamilia(familia);
    return { ok: true, jogadores: Object.keys(outros).length + 1 };
  } catch (e) {
    return { ok: false, motivo: 'erro', erro: e.name === 'AbortError' ? 'A internet demorou demais.' : e.message };
  }
}

/** Sincroniza sem travar a tela (depois de uma lição, compra etc.). */
export function sincronizarDepois() { sincronizar().catch(() => {}); }

export async function criarFamilia() {
  const codigo = gerarCodigo();
  await gravarFamilia({ ...(await lerFamilia()), codigo });
  return { codigo, ...(await sincronizar()) };
}
export async function entrarNaFamilia(texto) {
  const codigo = normalizarCodigo(texto);
  if (!codigo) throw new Error('Código inválido. Ele tem 8 letras/números, como ABCD-2345.');
  await gravarFamilia({ ...(await lerFamilia()), codigo });
  return { codigo, ...(await sincronizar()) };
}
export async function sairDaFamilia() {
  const familia = await lerFamilia();
  if (familia) await gravarFamilia({ ...familia, codigo: null });
  const jogo = await lerJogo();
  jogo.outros = {};
  await gravarJogo(jogo);
}
