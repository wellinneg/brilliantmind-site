// Disputa entre os irmãos (etapa 3): Firebase pela API web (REST), sem biblioteca extra.
// Vai para a internet só o necessário para o jogo: apelido, herói, itens usados, camada,
// moedas tiradas dos potes e roubos, mais o resumo de notas das lições (0 a 5) para a tarefa de
// reforço do pai. Nada de nome completo, respostas, fotos ou áudios.
// Cada celular escreve só familias/<codigo>/jogadores/<uid> (login anônimo) e lê os outros.
import * as db from './db.js';
import { FIREBASE } from './familia-config.js';
import { lerJogo, gravarJogo } from './jogo.js';
import { patrimonioDe } from './patrimonio.js';
import { resumoDeEstudo } from './resumo-estudo.js';
import { desempatesPublicos, aplicarVitorias } from './desempate.js';

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
    apelido: String(jogo.apelido || '').slice(0, 16), heroi: jogo.heroi, heroiEm: jogo.heroiEm || 0, usando: jogo.usando || {},
    camada: jogo.camada, doPote: jogo.meu.doPote, roubos: jogo.meu.roubos, temporada: jogo.temporadaXP || null,
    patrimonio: patrimonioDe(jogo),
    desempates: desempatesPublicos(jogo),   // ⚔️ pontuação nos desempates de território em aberto       // 🏆 ranking de patrimônio (dinheiro + empresa + banco)
    // ⚔️ duelo em andamento (só entre irmãos; o treino contra o Magnata fica no celular)
    duelo: jogo.duelo && !jogo.duelo.contra
      ? (({ id, semente, jogo: qual, de, para, estado, marcadoPara, criado, pronto, inicio, pontos, respostas, fimEm, concluiu }) =>
        ({ id, semente, jogo: qual, de, para, estado, marcadoPara, criado, pronto, inicio, pontos, respostas, fimEm, concluiu }))(jogo.duelo)
      : null,
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
/** Registro público + resumo de estudo; se passar do limite das regras (20 mil), vai sem o resumo. */
async function dadosParaEnviar(jogo) {
  const publico = registroPublico(jogo);
  const comResumo = JSON.stringify({ ...publico, estudo: await resumoDeEstudo().catch(() => null) });
  return comResumo.length < 19000 ? comResumo : JSON.stringify(publico);
}

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
        // 📊 o resumo de acertos vai DENTRO de "dados" (as regras do Firebase só aceitam dados + atualizado)
        dados: { stringValue: await dadosParaEnviar(jogo) },
        atualizado: { timestampValue: new Date(agora()).toISOString() },
      } }),
    });
    const lista = await pedir(http, `${base(cfg, familia.codigo)}?pageSize=20`, { headers: auth });
    const outros = {};
    for (const doc of lista.documents || []) {
      const uid = doc.name.split('/').pop();
      if (uid === familia.uid) continue;
      try { const { estudo, ...publico } = JSON.parse(doc.fields?.dados?.stringValue || '{}'); outros[uid] = { ...publico, atualizado: doc.fields?.atualizado?.timestampValue || null }; }   // o resumo de estudo do irmão não fica no meu celular
      catch { /* registro estragado de outro celular: ignora */ }
    }
    // Relê o jogo: uma lição pode ter terminado enquanto a internet respondia.
    const atual = await lerJogo();
    atual.uid = familia.uid; atual.outros = outros;
    await gravarJogo(atual);
    // ⚔️ se eu venci um desempate que acabou de fechar, aplico a nota e aviso os irmãos
    const { ganhos } = await aplicarVitorias().catch(() => ({ ganhos: [] }));
    if (ganhos.length) setTimeout(() => sincronizar({ http, cfg, agora }).catch(() => {}), 500);
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
export async function entrarNaFamilia(texto, opcoes = {}) {
  const codigo = normalizarCodigo(texto);
  if (!codigo) throw new Error('Código inválido. Ele tem 8 letras/números, como ABCD-2345.');
  // confere antes se a família existe (evita criar uma família vazia com um código digitado errado)
  const existentes = await jogadoresDaFamilia(codigo, opcoes);
  if (existentes === 0) throw new Error('Não achei nenhuma família com esse código. Confira as letras e os números no outro celular.');
  await gravarFamilia({ ...(await lerFamilia()), codigo });
  return { codigo, ...(await sincronizar(opcoes)) };
}

/** Quantos jogadores já existem com esse código (null se não deu para perguntar, sem internet). */
export async function jogadoresDaFamilia(codigo, { http = (...a) => fetch(...a), cfg = FIREBASE, agora = () => Date.now() } = {}) {
  if (!firebaseConfigurado(cfg)) return null;
  try {
    const familia = (await lerFamilia()) || {};
    const tk = await token(familia, { http, cfg, agora });
    const lista = await pedir(http, `${base(cfg, codigo)}?pageSize=20`, { headers: { Authorization: `Bearer ${tk}` } });
    return (lista.documents || []).filter(d => !familia.uid || !d.name.endsWith(`/${familia.uid}`)).length;
  } catch { return null; }
}

// ---- animal único na família ----
/** Animais que os irmãos já escolheram: { heroi: apelido }. */
export function heroisDosIrmaos(jogo) {
  const usados = {};
  for (const o of Object.values(jogo.outros || {})) if (o?.heroi) usados[o.heroi] = o.apelido || 'seu irmão';
  return usados;
}
/** Se um irmão escolheu o MESMO animal antes de mim, devolve o apelido dele (aí eu troco). Empate: decide o uid. */
export function conflitoDeHeroi(jogo) {
  if (!jogo.heroi) return null;
  for (const [uid, o] of Object.entries(jogo.outros || {})) {
    if (o?.heroi !== jogo.heroi) continue;
    const meu = jogo.heroiEm || 0, dele = o.heroiEm || 0;
    if (dele < meu || (dele === meu && String(uid) < String(jogo.uid || ''))) return o.apelido || 'seu irmão';
  }
  return null;
}
export async function sairDaFamilia() {
  const familia = await lerFamilia();
  if (familia) await gravarFamilia({ ...familia, codigo: null });
  const jogo = await lerJogo();
  jogo.outros = {};
  await gravarJogo(jogo);
}
