export function suportaGravacao() {
  return !!(navigator.mediaDevices?.getUserMedia && window.MediaRecorder);
}

export async function iniciarGravacao(limiteMs = 5 * 60 * 1000) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const tipo = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find(t => MediaRecorder.isTypeSupported(t));
  const gravador = new MediaRecorder(stream, tipo ? { mimeType: tipo } : {});
  const pedacos = [];
  const inicio = Date.now();
  gravador.ondataavailable = e => { if (e.data.size) pedacos.push(e.data); };
  const fim = new Promise(ok => {
    gravador.onstop = () => {
      stream.getTracks().forEach(t => t.stop());
      ok({ blob: new Blob(pedacos, { type: gravador.mimeType }), duracaoSeg: Math.round((Date.now() - inicio) / 1000) });
    };
  });
  gravador.start(1000);
  const limite = setTimeout(() => { if (gravador.state !== 'inactive') gravador.stop(); }, limiteMs);
  return {
    fim,
    parar() { clearTimeout(limite); if (gravador.state !== 'inactive') gravador.stop(); return fim; },
  };
}
