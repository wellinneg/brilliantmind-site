import * as db from './db.js';

function blobParaDataUrl(blob) {
  return new Promise((ok, erro) => {
    const leitor = new FileReader();
    leitor.onload = () => ok(leitor.result);
    leitor.onerror = () => erro(leitor.error);
    leitor.readAsDataURL(blob);
  });
}

export async function gerarCopia() {
  const midias = await db.listarMidias();
  return {
    app: 'trilha-brilliant-mind', versao: 2, exportadoEm: new Date().toISOString(),
    config: await db.listarConfig(),
    dias: await db.listarDias(),
    midias: await Promise.all(midias.map(async ({ blob, ...resto }) => ({ ...resto, dataUrl: await blobParaDataUrl(blob) }))),
  };
}

export async function restaurarCopia(obj) {
  if (obj?.app !== 'trilha-brilliant-mind' || obj.versao !== 2 || !Array.isArray(obj.dias)) throw new Error('Este arquivo não é uma cópia da Trilha Brilliant Mind.');
  await db.apagarTudo();
  for (const c of obj.config) await db.colocar('config', c);
  for (const d of obj.dias) await db.colocar('dias', d);
  for (const { dataUrl, ...resto } of obj.midias) {
    const blob = await (await fetch(dataUrl)).blob();
    await db.colocar('midias', { ...resto, blob });
  }
}

export function baixarArquivo(nomeArquivo, texto) {
  const url = URL.createObjectURL(new Blob([texto], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url; a.download = nomeArquivo;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
