export const productLicenses = [
  {
    type: "Kişisel Kullanım",
    summary:
      "Kişisel projelerde kullanılabilir. Ticari kullanım ve yeniden satış hakkı vermez.",
    allowsCommercial: false,
    allowsResale: false,
  },
  {
    type: "Ticari Kullanım",
    summary:
      "Ticari projelerde kullanılabilir. Ürünün kendisi yeniden satılamaz.",
    allowsCommercial: true,
    allowsResale: false,
  },
  {
    type: "Eğitim Amaçlı Kullanım",
    summary:
      "Eğitim, ders, öğrenme ve kişisel çalışma amaçlı kullanılabilir.",
    allowsCommercial: false,
    allowsResale: false,
  },
  {
    type: "Tek Proje Lisansı",
    summary:
      "Satın alan kullanıcı ürünü tek bir projede kullanabilir. Yeniden satış hakkı yoktur.",
    allowsCommercial: true,
    allowsResale: false,
  },
  {
    type: "Genişletilmiş Lisans",
    summary:
      "Birden fazla projede kullanılabilir. Ürünün birebir yeniden satışı yasaktır.",
    allowsCommercial: true,
    allowsResale: false,
  },
  {
    type: "Yeniden Satılamaz",
    summary:
      "Ürün yalnızca kullanım hakkı verir. Kopyalama, dağıtma veya yeniden satış yasaktır.",
    allowsCommercial: false,
    allowsResale: false,
  },
  {
    type: "Ücretsiz Kullanım",
    summary:
      "Ürün ücretsiz projelerde kullanılabilir. Kullanım şartları ürün açıklamasına göre değişebilir.",
    allowsCommercial: false,
    allowsResale: false,
  },
];

export function getLicenseInfo(type: string) {
  return (
    productLicenses.find((license) => license.type === type) ||
    productLicenses[0]
  );
}
