export type FileRiskLevel = "safe_candidate" | "code_or_archive" | "high_risk";

export type FileRiskPolicy = {
  level: FileRiskLevel;
  label: string;
  summary: string;
  recommendation: string;
  requiresManualReview: boolean;
};

const highRiskExtensions = [
  ".exe",
  ".dll",
  ".bat",
  ".cmd",
  ".ps1",
  ".vbs",
  ".scr",
  ".msi",
  ".apk",
  ".dmg",
  ".pkg",
  ".jar",
  ".com",
  ".reg",
  ".hta",
  ".iso",
];

const codeOrArchiveExtensions = [
  ".zip",
  ".rar",
  ".7z",
  ".tar",
  ".gz",
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".json",
  ".html",
  ".css",
  ".py",
  ".php",
  ".rb",
  ".go",
  ".java",
  ".cs",
  ".sh",
  ".sql",
  ".xml",
  ".yml",
  ".yaml",
];

function lowerName(fileName: string) {
  return fileName.toLowerCase();
}

export function hasFileExtension(fileName: string, extensions: string[]) {
  const lower = lowerName(fileName);
  return extensions.some((extension) => lower.endsWith(extension));
}

export function getFileRiskPolicy(fileName: string): FileRiskPolicy {
  if (hasFileExtension(fileName, highRiskExtensions)) {
    return {
      level: "high_risk",
      label: "Yüksek Riskli Dosya",
      summary: "Çalıştırılabilir veya sistem seviyesinde risk taşıyan dosya türü.",
      recommendation: "Admin incelemesi olmadan yayına alınmamalı.",
      requiresManualReview: true,
    };
  }

  if (hasFileExtension(fileName, codeOrArchiveExtensions)) {
    return {
      level: "code_or_archive",
      label: "Kod / Arşiv Dosyası",
      summary: "Kod, proje veya arşiv içeriği taşıyabilir; içerik taraması gerekir.",
      recommendation: "Otomatik tarama temizse yayına alınabilir, bulgu varsa admin inceler.",
      requiresManualReview: false,
    };
  }

  return {
    level: "safe_candidate",
    label: "Düşük Riskli Dijital Dosya",
    summary: "Belge, görsel veya genel dijital dosya adayı.",
    recommendation: "Otomatik tarama temizse yayına alınabilir.",
    requiresManualReview: false,
  };
}

export function policyIssueFor(fileName: string) {
  const policy = getFileRiskPolicy(fileName);

  if (policy.level !== "high_risk") return null;

  return {
    level: "critical" as const,
    file: fileName,
    message: `${policy.label}: ${policy.recommendation}`,
  };
}

export function summaryForScanResult(status: string, policy: FileRiskPolicy) {
  if (status === "Güvenli") {
    return `${policy.label}: otomatik taramada yayın engeli bulunmadı. ${policy.recommendation}`;
  }

  if (status === "Manuel İnceleme") {
    return `${policy.label}: otomatik taramada şüpheli bulgular bulundu. Admin incelemesi gerekiyor.`;
  }

  return `${policy.label}: yüksek riskli bulgular bulundu. Dosya yayına alınmadı.`;
}
