import type { NextApiRequest, NextApiResponse } from "next";
import JSZip from "jszip";
import { createClient } from "@supabase/supabase-js";

type ScanIssue = {
  level: "low" | "medium" | "high" | "critical";
  file: string;
  message: string;
};

type ScanReport = {
  checkedFiles: number;
  scannedTextFiles: number;
  issues: ScanIssue[];
  summary: string;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const dangerousExtensions = [
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
];

const textExtensions = [
  ".js",
  ".ts",
  ".tsx",
  ".jsx",
  ".json",
  ".env",
  ".txt",
  ".md",
  ".py",
  ".php",
  ".rb",
  ".go",
  ".java",
  ".cs",
  ".sh",
  ".yml",
  ".yaml",
  ".xml",
  ".html",
  ".css",
];

function hasExtension(fileName: string, extensions: string[]) {
  const lower = fileName.toLowerCase();
  return extensions.some((extension) => lower.endsWith(extension));
}

function isPathTraversal(fileName: string) {
  return (
    fileName.includes("../") ||
    fileName.includes("..\\") ||
    fileName.startsWith("/") ||
    fileName.startsWith("\\") ||
    /^[a-zA-Z]:\\/.test(fileName)
  );
}

function scanTextContent(fileName: string, content: string): ScanIssue[] {
  const issues: ScanIssue[] = [];

  const patterns: Array<{
    level: ScanIssue["level"];
    regex: RegExp;
    message: string;
  }> = [
    {
      level: "critical",
      regex: /SUPABASE_SERVICE_ROLE_KEY|service_role/i,
      message: "Supabase service role anahtarı veya benzeri kritik secret olabilir.",
    },
    {
      level: "critical",
      regex: /-----BEGIN (RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/i,
      message: "Private key tespit edildi.",
    },
    {
      level: "high",
      regex: /AKIA[0-9A-Z]{16}/,
      message: "AWS Access Key benzeri anahtar tespit edildi.",
    },
    {
      level: "high",
      regex: /sk-[a-zA-Z0-9]{20,}/,
      message: "API key benzeri gizli anahtar tespit edildi.",
    },
    {
      level: "high",
      regex: /STRIPE_SECRET_KEY|PAYTR_MERCHANT_KEY|OPENAI_API_KEY/i,
      message: "Ödeme veya API gizli anahtarı tespit edildi.",
    },
    {
      level: "medium",
      regex: /\beval\s*\(/,
      message: "eval() kullanımı tespit edildi.",
    },
    {
      level: "medium",
      regex: /\bnew Function\s*\(/,
      message: "Dinamik Function çalıştırma tespit edildi.",
    },
    {
      level: "high",
      regex: /child_process|execSync|spawn\s*\(|exec\s*\(/,
      message: "Shell/komut çalıştırma kullanımı tespit edildi.",
    },
    {
      level: "medium",
      regex: /rm\s+-rf|del\s+\/s|format\s+[a-z]:/i,
      message: "Dosya silmeye yönelik riskli komut tespit edildi.",
    },
    {
      level: "medium",
      regex: /curl\s+http|wget\s+http/i,
      message: "Uzak adresten komut/dosya çekme davranışı tespit edildi.",
    },
    {
      level: "medium",
      regex: /document\.cookie|localStorage\.getItem|sessionStorage\.getItem/,
      message: "Tarayıcı depolama veya cookie erişimi tespit edildi.",
    },
  ];

  for (const pattern of patterns) {
    if (pattern.regex.test(content)) {
      issues.push({
        level: pattern.level,
        file: fileName,
        message: pattern.message,
      });
    }
  }

  if (fileName.toLowerCase().endsWith("package.json")) {
    try {
      const packageJson = JSON.parse(content);
      const scripts = packageJson.scripts || {};

      for (const scriptName of ["preinstall", "postinstall", "prepare"]) {
        if (scripts[scriptName]) {
          issues.push({
            level: "high",
            file: fileName,
            message: `package.json içinde riskli "${scriptName}" scripti var.`,
          });
        }
      }
    } catch {
      issues.push({
        level: "low",
        file: fileName,
        message: "package.json okunamadı veya bozuk.",
      });
    }
  }

  if (fileName.toLowerCase().includes(".env")) {
    issues.push({
      level: "high",
      file: fileName,
      message: ".env dosyası ZIP içinde yer alıyor. Gizli bilgi riski var.",
    });
  }

  return issues;
}

function calculateScore(issues: ScanIssue[]) {
  return issues.reduce((total, issue) => {
    if (issue.level === "critical") return total + 50;
    if (issue.level === "high") return total + 25;
    if (issue.level === "medium") return total + 10;
    return total + 3;
  }, 0);
}

function decideSecurityStatus(score: number, issues: ScanIssue[]) {
  const hasCritical = issues.some((issue) => issue.level === "critical");
  const hasHigh = issues.some((issue) => issue.level === "high");

  if (hasCritical || score >= 50) return "Riskli";
  if (hasHigh || score >= 15) return "Manuel İnceleme";
  return "Güvenli";
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Sadece POST isteği desteklenir.",
    });
  }

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return res.status(500).json({
      error: "Supabase environment bilgileri eksik.",
    });
  }

  const authorization = req.headers.authorization;

  if (!authorization?.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "Yetkisiz istek. Admin oturumu gerekli.",
    });
  }

  const accessToken = authorization.replace("Bearer ", "");
  const { productId } = req.body || {};

  if (!productId || typeof productId !== "string") {
    return res.status(400).json({
      error: "productId zorunludur.",
    });
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const { data: userData, error: userError } = await userClient.auth.getUser();

  if (userError || !userData.user) {
    return res.status(401).json({
      error: "Kullanıcı doğrulanamadı.",
    });
  }

  const { data: profile } = await userClient
    .from("profiles")
    .select("account_type,email")
    .eq("id", userData.user.id)
    .maybeSingle();

  const isAdmin =
    profile?.account_type === "admin" ||
    userData.user.email === "nihatildes1@gmail.com";

  if (!isAdmin) {
    return res.status(403).json({
      error: "Bu işlem için admin yetkisi gerekir.",
    });
  }

  const { data: product, error: productError } = await adminClient
    .from("products")
    .select("id,title,file_path,file_name,file_type,file_size,status")
    .eq("id", productId)
    .maybeSingle();

  if (productError || !product) {
    return res.status(404).json({
      error: "Ürün bulunamadı.",
    });
  }

  if (!product.file_path) {
    return res.status(400).json({
      error: "Bu üründe ZIP dosyası yok.",
    });
  }

  const { data: fileBlob, error: downloadError } = await adminClient.storage
    .from("product-files")
    .download(product.file_path);

  if (downloadError || !fileBlob) {
    return res.status(500).json({
      error: "ZIP dosyası indirilemedi: " + (downloadError?.message || ""),
    });
  }

  const arrayBuffer = await fileBlob.arrayBuffer();
  const lowerFileName = String(product.file_name || product.file_path || "").toLowerCase();
  const isZipFile = lowerFileName.endsWith(".zip");

  if (!isZipFile) {
    const issues: ScanIssue[] = [];

    const blockedExtensions = [
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
      ".jar"
    ];

    if (blockedExtensions.some((extension) => lowerFileName.endsWith(extension))) {
      issues.push({
        level: "critical",
        file: lowerFileName,
        message: "Çalıştırılabilir veya yüksek riskli dosya türü tespit edildi.",
      });
    }

    const score = calculateScore(issues);
    const securityStatus = decideSecurityStatus(score, issues);

    const report: ScanReport = {
      checkedFiles: 1,
      scannedTextFiles: 0,
      issues,
      summary:
        securityStatus === "Güvenli"
          ? "ZIP olmayan dijital dosyada yasaklı dosya türü tespit edilmedi."
          : "Dosya türü riskli görünüyor. Manuel inceleme gerekiyor.",
    };

    const updatePayload: Record<string, unknown> = {
      security_status: securityStatus,
      security_note: report.summary,
      security_scan_score: score,
      security_scan_report: report,
      security_scanned_at: new Date().toISOString(),
      security_checked_by: userData.user.id,
    };

    if (securityStatus === "Riskli" && product.status === "Yayında") {
      updatePayload.status = "Yayından Kaldırıldı";
    }

    const { error: updateError } = await adminClient
      .from("products")
      .update(updatePayload)
      .eq("id", productId);

    if (updateError) {
      return res.status(500).json({
        error: "Tarama sonucu ürüne yazılamadı: " + updateError.message,
      });
    }

    await adminClient.from("admin_logs").insert({
      actor_id: userData.user.id,
      action: "product_auto_scan",
      entity_type: "product",
      entity_id: productId,
      title: "Ürün otomatik güvenlik taramasından geçti",
      details: `"${product.title}" ürünü otomatik tarandı. Sonuç: ${securityStatus}. Skor: ${score}.`,
      metadata: report,
    });

    return res.status(200).json({
      ok: true,
      securityStatus,
      score,
      report,
    });
  }

  const zip = await JSZip.loadAsync(Buffer.from(arrayBuffer));

  const issues: ScanIssue[] = [];
  let checkedFiles = 0;
  let scannedTextFiles = 0;

  const entries = Object.values(zip.files);

  if (entries.length > 800) {
    issues.push({
      level: "high",
      file: "ZIP",
      message: "ZIP içinde çok fazla dosya var. Manuel inceleme gerekli.",
    });
  }

  for (const entry of entries) {
    if (entry.dir) continue;

    checkedFiles += 1;
    const fileName = entry.name;

    if (isPathTraversal(fileName)) {
      issues.push({
        level: "critical",
        file: fileName,
        message: "Zip Slip / path traversal riski tespit edildi.",
      });
    }

    if (dangerousExtensions.some((extension) => fileName.toLowerCase().endsWith(extension))) {
      issues.push({
        level: "high",
        file: fileName,
        message: "Riskli çalıştırılabilir dosya uzantısı tespit edildi.",
      });
    }

    const maybeSize = (entry as unknown as { _data?: { uncompressedSize?: number } })
      ._data?.uncompressedSize;

    if (typeof maybeSize === "number" && maybeSize > 5 * 1024 * 1024) {
      issues.push({
        level: "low",
        file: fileName,
        message: "Büyük dosya tespit edildi. Manuel kontrol önerilir.",
      });
    }

    if (hasExtension(fileName, textExtensions)) {
      const sizeLimit = typeof maybeSize === "number" ? maybeSize <= 500_000 : true;

      if (sizeLimit) {
        scannedTextFiles += 1;
        const content = await entry.async("string");
        issues.push(...scanTextContent(fileName, content));
      }
    }
  }

  const score = calculateScore(issues);
  const securityStatus = decideSecurityStatus(score, issues);

  const report: ScanReport = {
    checkedFiles,
    scannedTextFiles,
    issues,
    summary:
      securityStatus === "Güvenli"
        ? "Otomatik taramada kritik risk bulunmadı."
        : securityStatus === "Manuel İnceleme"
        ? "Otomatik taramada şüpheli bulgular bulundu. Manuel inceleme önerilir."
        : "Otomatik taramada yüksek riskli bulgular bulundu.",
  };

  const updatePayload: Record<string, unknown> = {
    security_status: securityStatus,
    security_note: report.summary,
    security_scan_score: score,
    security_scan_report: report,
    security_scanned_at: new Date().toISOString(),
    security_checked_by: userData.user.id,
  };

  if (securityStatus === "Riskli" && product.status === "Yayında") {
    updatePayload.status = "Yayından Kaldırıldı";
  }

  const { error: updateError } = await adminClient
    .from("products")
    .update(updatePayload)
    .eq("id", productId);

  if (updateError) {
    return res.status(500).json({
      error: "Tarama sonucu ürüne yazılamadı: " + updateError.message,
    });
  }

  await adminClient.from("admin_logs").insert({
    actor_id: userData.user.id,
    action: "product_auto_scan",
    entity_type: "product",
    entity_id: productId,
    title: "Ürün otomatik güvenlik taramasından geçti",
    details: `"${product.title}" ürünü otomatik tarandı. Sonuç: ${securityStatus}. Skor: ${score}.`,
    metadata: report,
  });

  return res.status(200).json({
    ok: true,
    securityStatus,
    score,
    report,
  });
}
