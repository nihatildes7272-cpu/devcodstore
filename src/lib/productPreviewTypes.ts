export const productPreviewTypes = [
  {
    type: "Kapak + Galeri",
    description:
      "Ürün kapak görseli ve galeri görselleriyle önizlenir. Dosyanın tamamı gösterilmez.",
  },
  {
    type: "Canlı Demo",
    description:
      "Satıcının eklediği demo linki üzerinden ürün devcodstore içinde veya yeni sekmede önizlenir.",
  },
  {
    type: "PDF Örnek Sayfa",
    description:
      "PDF ürünler için örnek sayfa veya kapak görseliyle tanıtım yapılır. Tam dosya satın alma sonrası açılır.",
  },
  {
    type: "Görsel Önizleme",
    description:
      "Tasarım, görsel, UI kit veya şablon ürünleri kapak/galeri görselleriyle önizlenir.",
  },
  {
    type: "Önizleme Yok",
    description:
      "Bu ürün için satın alma öncesi dosya önizlemesi sunulmaz.",
  },
];

export function getPreviewInfo(type: string) {
  return (
    productPreviewTypes.find((item) => item.type === type) ||
    productPreviewTypes[0]
  );
}
