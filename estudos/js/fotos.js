export async function comprimirFoto(arquivo, maxLado = 1280, qualidade = 0.7) {
  const imagem = await createImageBitmap(arquivo);
  const escala = Math.min(1, maxLado / Math.max(imagem.width, imagem.height));
  const tela = document.createElement('canvas');
  tela.width = Math.round(imagem.width * escala);
  tela.height = Math.round(imagem.height * escala);
  tela.getContext('2d').drawImage(imagem, 0, 0, tela.width, tela.height);
  imagem.close?.();
  return new Promise((ok, erro) =>
    tela.toBlob(b => (b ? ok(b) : erro(new Error('falha ao comprimir'))), 'image/jpeg', qualidade));
}
