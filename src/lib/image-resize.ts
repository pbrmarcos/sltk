/**
 * Compressão client-side de fotos antes do envio pra IA — fotos de celular
 * chegam a 10-15 MB; em base64 isso estoura payload e latência no 4G.
 * Redimensiona para no máx. 1600px (lado maior) e re-encoda em JPEG.
 */
export async function compressImage(
  file: File,
  opts: { maxSide?: number; quality?: number } = {},
): Promise<{ base64: string; mime: string }> {
  const maxSide = opts.maxSide ?? 1600;
  const quality = opts.quality ?? 0.85;

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("Falha ao ler o arquivo."));
    r.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("Arquivo não é uma imagem válida."));
    i.src = dataUrl;
  });

  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  if (scale >= 1 && file.size < 1_500_000) {
    // Já é pequena — manda como está.
    const m = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
    if (m) return { base64: m[2], mime: m[1] };
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponível neste navegador.");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const out = canvas.toDataURL("image/jpeg", quality);
  const m = /^data:([^;]+);base64,(.+)$/.exec(out);
  if (!m) throw new Error("Falha ao comprimir a imagem.");
  return { base64: m[2], mime: m[1] };
}
