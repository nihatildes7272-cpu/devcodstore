import "dotenv/config";
import fs from "fs-extra";
import path from "path";
import os from "os";
import http from "http";
import { execFile } from "child_process";
import { promisify } from "util";
import StreamZip from "node-stream-zip";
import { createClient } from "@supabase/supabase-js";

const execFileAsync = promisify(execFile);

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const WORKER_ID = process.env.SCANNER_WORKER_ID || `scanner-${os.hostname()}`;
const SCAN_INTERVAL_MS = Number(process.env.SCAN_INTERVAL_MS || 15000);
const WORKDIR = process.env.WORKDIR || "/tmp/devcodstore-scans";
const PORT = process.env.PORT ? Number(process.env.PORT) : null;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("NEXT_PUBLIC_SUPABASE_URL veya SUPABASE_SERVICE_ROLE_KEY eksik.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

function startHealthServer() {
  if (!PORT) return;

  const server = http.createServer((req, res) => {
    if (req.url === "/health" || req.url === "/") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          ok: true,
          workerId: WORKER_ID,
          uptime: Math.round(process.uptime())
        })
      );
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: false }));
  });

  server.on("error", (error) => {
    console.error("Health server başlatılamadı:", error?.message || error);
  });

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Health server ${PORT} portunda dinliyor.`);
  });
}

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
  ".jar"
];

const textExtensions = [
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
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
  ".sql"
];

function nowIso() {
  return new Date().toISOString();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendHeartbeat(status = "idle", currentJobId = null) {
  try {
    await supabase.from("scanner_worker_heartbeats").upsert(
      {
        worker_id: WORKER_ID,
        status,
        current_job_id: currentJobId,
        last_seen_at: nowIso(),
        meta: {
          hostname: os.hostname(),
          intervalMs: SCAN_INTERVAL_MS,
          workdir: WORKDIR
        },
        updated_at: nowIso()
      },
      {
        onConflict: "worker_id"
      }
    );
  } catch (error) {
    console.error("Heartbeat gönderilemedi:", error?.message || error);
  }
}

function hasExtension(fileName, extensions) {
  const lower = fileName.toLowerCase();
  return extensions.some((ext) => lower.endsWith(ext));
}

function isPathTraversal(fileName) {
  return (
    fileName.includes("../") ||
    fileName.includes("..\\") ||
    fileName.startsWith("/") ||
    fileName.startsWith("\\") ||
    /^[a-zA-Z]:\\/.test(fileName)
  );
}

function addIssue(issues, tool, level, file, message) {
  issues.push({
    tool,
    level,
    file,
    message
  });
}

function scoreIssue(level) {
  if (level === "critical") return 60;
  if (level === "high") return 25;
  if (level === "medium") return 10;
  return 3;
}

function calculateScore(issues) {
  return issues.reduce((sum, issue) => sum + scoreIssue(issue.level), 0);
}

function decideStatus(score, issues) {
  const hasCritical = issues.some((issue) => issue.level === "critical");
  const hasHigh = issues.some((issue) => issue.level === "high");

  if (hasCritical || score >= 60) return "Riskli";
  if (hasHigh || score >= 20) return "Manuel İnceleme";
  return "Güvenli";
}

async function runCommand(command, args, cwd) {
  try {
    const { stdout, stderr } = await execFileAsync(command, args, {
      cwd,
      timeout: 120000,
      maxBuffer: 50 * 1024 * 1024
    });

    return {
      ok: true,
      stdout,
      stderr,
      code: 0
    };
  } catch (error) {
    return {
      ok: false,
      stdout: error.stdout || "",
      stderr: error.stderr || error.message || "",
      code: error.code || 1
    };
  }
}

async function recoverStuckJobs() {
  try {
    const { data, error } = await supabase.rpc("recover_stuck_scan_jobs");

    if (error) {
      console.error("Stuck job recovery hatası:", error.message);
      return;
    }

    const recovered = Number(data?.recovered_count || 0);
    const failed = Number(data?.failed_count || 0);

    if (recovered > 0 || failed > 0) {
      console.log(
        `[${new Date().toISOString()}] Stuck job recovery: recovered=${recovered}, failed=${failed}`
      );
    }
  } catch (error) {
    console.error("Stuck job recovery exception:", error?.message || error);
  }
}

async function claimJob() {
  const { data: jobs, error } = await supabase
    .from("security_scan_jobs")
    .select("*")
    .eq("status", "queued")
    .or(`next_retry_at.is.null,next_retry_at.lte.${nowIso()}`)
    .order("priority", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(1);

  if (error) {
    console.error("Kuyruk okunamadı:", error.message);
    return null;
  }

  const job = jobs?.[0];

  if (!job) return null;

  const { data: updated, error: updateError } = await supabase
    .from("security_scan_jobs")
    .update({
      status: "running",
      worker_id: WORKER_ID,
      started_at: nowIso(),
      updated_at: nowIso()
    })
    .eq("id", job.id)
    .eq("status", "queued")
    .select("*")
    .single();

  if (updateError) {
    return null;
  }

  await supabase
    .from("products")
    .update({
      strong_scan_status: "running",
      strong_scan_job_id: job.id,
      strong_scan_started_at: nowIso()
    })
    .eq("id", job.product_id);

  return updated;
}

async function getProduct(productId) {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", productId)
    .single();

  if (error || !data) {
    throw new Error("Ürün bulunamadı: " + (error?.message || ""));
  }

  if (!data.file_path && !data.quarantine_file_path) {
    throw new Error("Üründe taranacak dosya yok.");
  }

  return data;
}

async function downloadZip(filePath, targetPath, bucket = "product-files") {
  const { data, error } = await supabase.storage
    .from(bucket)
    .download(filePath);

  if (error || !data) {
    throw new Error(`Dosya indirilemedi (${bucket}): ` + (error?.message || ""));
  }

  const buffer = Buffer.from(await data.arrayBuffer());
  await fs.writeFile(targetPath, buffer);
}

async function inspectZip(zipPath, extractDir, originalFileName = "product-file") {
  const issues = [];
  const lowerName = originalFileName.toLowerCase();

  if (!lowerName.endsWith(".zip")) {
    const targetPath = path.join(extractDir, path.basename(originalFileName));
    await fs.copy(zipPath, targetPath);

    if (hasExtension(originalFileName, dangerousExtensions)) {
      addIssue(
        issues,
        "file",
        "high",
        originalFileName,
        "Riskli çalıştırılabilir dosya uzantısı tespit edildi."
      );
    }

    return {
      checkedFiles: 1,
      issues
    };
  }

  const zip = new StreamZip.async({ file: zipPath });
  const entries = await zip.entries();

  const fileEntries = Object.values(entries).filter((entry) => !entry.isDirectory);

  if (fileEntries.length > 1000) {
    addIssue(
      issues,
      "zip",
      "high",
      "ZIP",
      "ZIP içinde 1000’den fazla dosya var. Manuel inceleme önerilir."
    );
  }

  for (const entry of fileEntries) {
    if (isPathTraversal(entry.name)) {
      addIssue(
        issues,
        "zip",
        "critical",
        entry.name,
        "Zip Slip / path traversal riski tespit edildi."
      );
    }

    if (hasExtension(entry.name, dangerousExtensions)) {
      addIssue(
        issues,
        "zip",
        "high",
        entry.name,
        "Riskli çalıştırılabilir dosya uzantısı tespit edildi."
      );
    }

    if (entry.size > 25 * 1024 * 1024) {
      addIssue(
        issues,
        "zip",
        "low",
        entry.name,
        "Büyük dosya tespit edildi."
      );
    }
  }

  await zip.extract(null, extractDir);
  await zip.close();

  return {
    checkedFiles: fileEntries.length,
    issues
  };
}

async function scanCustomRules(rootDir) {
  const issues = [];
  let scannedTextFiles = 0;

  async function walk(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      const relativePath = path.relative(rootDir, fullPath);

      if (entry.isDirectory()) {
        if (
          ["node_modules", ".git", ".next", "dist", "build", "vendor"].includes(
            entry.name
          )
        ) {
          continue;
        }

        await walk(fullPath);
        continue;
      }

      if (!hasExtension(relativePath, textExtensions)) {
        continue;
      }

      const stats = await fs.stat(fullPath);

      if (stats.size > 750000) {
        continue;
      }

      scannedTextFiles += 1;

      const content = await fs.readFile(fullPath, "utf8").catch(() => "");

      const patterns = [
        {
          level: "critical",
          regex: /SUPABASE_SERVICE_ROLE_KEY|service_role/i,
          message: "Supabase service role veya benzeri kritik secret olabilir."
        },
        {
          level: "critical",
          regex: /-----BEGIN (RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/i,
          message: "Private key tespit edildi."
        },
        {
          level: "high",
          regex: /AKIA[0-9A-Z]{16}/,
          message: "AWS Access Key benzeri anahtar tespit edildi."
        },
        {
          level: "high",
          regex: /sk-[a-zA-Z0-9]{20,}/,
          message: "API key benzeri gizli anahtar tespit edildi."
        },
        {
          level: "high",
          regex: /STRIPE_SECRET_KEY|PAYTR_MERCHANT_KEY|OPENAI_API_KEY|GITHUB_TOKEN/i,
          message: "Ödeme/API/GitHub secret anahtarı tespit edildi."
        },
        {
          level: "high",
          regex: /child_process|execSync|spawn\s*\(|exec\s*\(/,
          message: "Shell/komut çalıştırma kullanımı tespit edildi."
        },
        {
          level: "medium",
          regex: /\beval\s*\(/,
          message: "eval() kullanımı tespit edildi."
        },
        {
          level: "medium",
          regex: /\bnew Function\s*\(/,
          message: "Dinamik Function çalıştırma tespit edildi."
        },
        {
          level: "medium",
          regex: /rm\s+-rf|del\s+\/s|format\s+[a-z]:/i,
          message: "Riskli dosya silme komutu tespit edildi."
        },
        {
          level: "medium",
          regex: /curl\s+http|wget\s+http/i,
          message: "Uzak adresten dosya/komut çekme davranışı tespit edildi."
        },
        {
          level: "medium",
          regex: /document\.cookie|localStorage\.getItem|sessionStorage\.getItem/,
          message: "Cookie veya tarayıcı depolama erişimi tespit edildi."
        }
      ];

      for (const pattern of patterns) {
        if (pattern.regex.test(content)) {
          addIssue(issues, "custom", pattern.level, relativePath, pattern.message);
        }
      }

      if (relativePath.toLowerCase().includes(".env")) {
        addIssue(
          issues,
          "custom",
          "high",
          relativePath,
          ".env dosyası ZIP içinde yer alıyor. Gizli bilgi riski var."
        );
      }

      if (relativePath.toLowerCase().endsWith("package.json")) {
        try {
          const packageJson = JSON.parse(content);
          const scripts = packageJson.scripts || {};

          for (const scriptName of ["preinstall", "postinstall", "prepare"]) {
            if (scripts[scriptName]) {
              addIssue(
                issues,
                "custom",
                "high",
                relativePath,
                `package.json içinde riskli "${scriptName}" scripti var.`
              );
            }
          }
        } catch {
          addIssue(
            issues,
            "custom",
            "low",
            relativePath,
            "package.json okunamadı veya bozuk."
          );
        }
      }
    }
  }

  await walk(rootDir);

  return {
    scannedTextFiles,
    issues
  };
}

async function scanClamAV(rootDir) {
  const result = await runCommand(
    "clamscan",
    ["-r", "--infected", "--no-summary", rootDir],
    rootDir
  );

  const issues = [];

  if (result.code === 127) {
    addIssue(
      issues,
      "clamav",
      "low",
      "system",
      "ClamAV yüklü değil veya clamscan komutu bulunamadı."
    );
    return { available: false, issues, raw: result.stderr };
  }

  if (result.code === 1) {
    const lines = result.stdout.split("\n").filter(Boolean);

    for (const line of lines) {
      addIssue(
        issues,
        "clamav",
        "critical",
        line.split(":")[0] || "unknown",
        "ClamAV zararlı dosya imzası tespit etti."
      );
    }
  }

  if (result.code > 1) {
    addIssue(
      issues,
      "clamav",
      "medium",
      "system",
      "ClamAV taraması hata ile tamamlandı: " + result.stderr
    );
  }

  return {
    available: result.code !== 127,
    issues,
    raw: result.stdout || result.stderr
  };
}

async function scanTrivy(rootDir) {
  const result = await runCommand(
    "trivy",
    [
      "fs",
      "--scanners",
      "vuln,secret,misconfig",
      "--format",
      "json",
      "--quiet",
      rootDir
    ],
    rootDir
  );

  const issues = [];

  if (result.code === 127) {
    addIssue(
      issues,
      "trivy",
      "low",
      "system",
      "Trivy yüklü değil veya trivy komutu bulunamadı."
    );
    return { available: false, issues, raw: result.stderr };
  }

  if (!result.stdout) {
    return { available: true, issues, raw: result.stderr };
  }

  try {
    const parsed = JSON.parse(result.stdout);
    const results = parsed.Results || [];

    for (const item of results) {
      const target = item.Target || "unknown";

      for (const vuln of item.Vulnerabilities || []) {
        const severity = String(vuln.Severity || "").toLowerCase();
        const level =
          severity === "critical"
            ? "critical"
            : severity === "high"
            ? "high"
            : severity === "medium"
            ? "medium"
            : "low";

        addIssue(
          issues,
          "trivy",
          level,
          target,
          `${vuln.VulnerabilityID || "vulnerability"}: ${
            vuln.Title || "Bağımlılık güvenlik açığı"
          }`
        );
      }

      for (const secret of item.Secrets || []) {
        const severity = String(secret.Severity || "").toLowerCase();
        const level = severity === "critical" ? "critical" : "high";

        addIssue(
          issues,
          "trivy",
          level,
          target,
          `${secret.RuleID || "secret"}: Gizli anahtar veya secret tespit edildi.`
        );
      }

      for (const misconfig of item.Misconfigurations || []) {
        const severity = String(misconfig.Severity || "").toLowerCase();
        const level =
          severity === "critical"
            ? "critical"
            : severity === "high"
            ? "high"
            : severity === "medium"
            ? "medium"
            : "low";

        addIssue(
          issues,
          "trivy",
          level,
          target,
          `${misconfig.ID || "misconfig"}: ${
            misconfig.Title || "Yanlış yapılandırma"
          }`
        );
      }
    }
  } catch {
    addIssue(
      issues,
      "trivy",
      "medium",
      "system",
      "Trivy JSON çıktısı okunamadı."
    );
  }

  return {
    available: true,
    issues,
    raw: result.stdout.slice(0, 20000)
  };
}

async function scanSemgrep(rootDir) {
  const result = await runCommand(
    "semgrep",
    ["scan", "--config", "auto", "--json", "--quiet", rootDir],
    rootDir
  );

  const issues = [];

  if (result.code === 127) {
    addIssue(
      issues,
      "semgrep",
      "low",
      "system",
      "Semgrep yüklü değil veya semgrep komutu bulunamadı."
    );
    return { available: false, issues, raw: result.stderr };
  }

  if (!result.stdout) {
    return { available: true, issues, raw: result.stderr };
  }

  try {
    const parsed = JSON.parse(result.stdout);
    const findings = parsed.results || [];

    for (const finding of findings) {
      const severity = String(finding.extra?.severity || "").toLowerCase();
      const level =
        severity === "error"
          ? "high"
          : severity === "warning"
          ? "medium"
          : "low";

      addIssue(
        issues,
        "semgrep",
        level,
        finding.path || "unknown",
        finding.extra?.message || finding.check_id || "Semgrep bulgusu"
      );
    }
  } catch {
    addIssue(
      issues,
      "semgrep",
      "medium",
      "system",
      "Semgrep JSON çıktısı okunamadı."
    );
  }

  return {
    available: true,
    issues,
    raw: result.stdout.slice(0, 20000)
  };
}

async function processJob(job) {
  const scanRoot = path.join(WORKDIR, job.id);
  const zipPath = path.join(scanRoot, "product-file");
  const extractDir = path.join(scanRoot, "unzipped");

  await fs.remove(scanRoot);
  await fs.ensureDir(extractDir);

  const product = await getProduct(job.product_id);

  const sourceFilePath = product.quarantine_file_path || product.file_path;

  if (!sourceFilePath) {
    throw new Error("Üründe taranacak dosya yok.");
  }

  const sourceBucket = product.quarantine_file_path ? "product-quarantine" : "product-files";
  const originalFileName = product.file_name || path.basename(sourceFilePath);

  await downloadZip(sourceFilePath, zipPath, sourceBucket);

  const allIssues = [];
  const tools = {};

  const zipInspection = await inspectZip(zipPath, extractDir, originalFileName);
  allIssues.push(...zipInspection.issues);

  const customScan = await scanCustomRules(extractDir);
  allIssues.push(...customScan.issues);

  const clamavScan = await scanClamAV(extractDir);
  allIssues.push(...clamavScan.issues);
  tools.clamav = {
    available: clamavScan.available,
    issues: clamavScan.issues.length
  };

  const trivyScan = await scanTrivy(extractDir);
  allIssues.push(...trivyScan.issues);
  tools.trivy = {
    available: trivyScan.available,
    issues: trivyScan.issues.length
  };

  const semgrepScan = await scanSemgrep(extractDir);
  allIssues.push(...semgrepScan.issues);
  tools.semgrep = {
    available: semgrepScan.available,
    issues: semgrepScan.issues.length
  };

  const score = calculateScore(allIssues);
  const resultStatus = decideStatus(score, allIssues);

  const report = {
    workerId: WORKER_ID,
    productId: product.id,
    productTitle: product.title,
    checkedFiles: zipInspection.checkedFiles,
    scannedTextFiles: customScan.scannedTextFiles,
    tools,
    issues: allIssues,
    sourceBucket,
    sourceFilePath,
    summary:
      resultStatus === "Güvenli"
        ? "Güçlü taramada kritik risk bulunmadı. Dosya onaylı alana taşındı."
        : resultStatus === "Manuel İnceleme"
        ? "Güçlü taramada şüpheli bulgular bulundu. Dosya karantinada manuel inceleme bekliyor."
        : "Güçlü taramada yüksek riskli bulgular bulundu. Dosya karantinada tutuluyor.",
    scannedAt: nowIso()
  };

  const { data: sellerProfile } = await supabase
    .from("profiles")
    .select("id,seller_trust_score,seller_clean_product_count,seller_risky_product_count,auto_publish_enabled")
    .eq("id", product.seller_id)
    .maybeSingle();

  const canAutoPublish =
    resultStatus === "Güvenli" &&
    sellerProfile?.auto_publish_enabled === true &&
    Number(sellerProfile?.seller_trust_score || 0) >= 80 &&
    Number(sellerProfile?.seller_clean_product_count || 0) >= 10 &&
    Number(sellerProfile?.seller_risky_product_count || 0) === 0;

  const autoPublishReason = canAutoPublish
    ? "Satıcı güvenilir seviyede olduğu için güvenli ürün otomatik yayına alındı."
    : resultStatus === "Güvenli"
    ? "Ürün güvenli bulundu fakat satıcı otomatik yayın eşiğinde değil. Admin onayı bekliyor."
    : resultStatus === "Manuel İnceleme"
    ? "Ürün şüpheli bulgular nedeniyle karantinaya alındı."
    : "Ürün riskli bulgular nedeniyle reddedildi.";

  const { data: scanReportData } = await supabase
    .from("scan_reports")
    .insert({
      product_id: product.id,
      job_id: job.id,
      status: resultStatus,
      score,
      tools,
      issues: allIssues,
      summary: report.summary,
      report
    })
    .select("id")
    .single();

  let approvedFilePath = product.file_path || null;

  if (resultStatus === "Güvenli" && product.quarantine_file_path) {
    approvedFilePath = product.quarantine_file_path;

    const originalBuffer = await fs.readFile(zipPath);

    const { error: uploadApprovedError } = await supabase.storage
      .from("product-files")
      .upload(approvedFilePath, originalBuffer, {
        upsert: true,
        contentType: "application/octet-stream"
      });

    if (uploadApprovedError) {
      throw new Error(
        "Temiz dosya product-files bucket içine taşınamadı: " +
          uploadApprovedError.message
      );
    }

    await supabase.storage
      .from("product-quarantine")
      .remove([product.quarantine_file_path]);
  }

  await supabase
    .from("security_scan_jobs")
    .update({
      status: "completed",
      result_status: resultStatus,
      score,
      report,
      finished_at: nowIso(),
      updated_at: nowIso()
    })
    .eq("id", job.id);

  const productUpdate = {
    strong_scan_status: "completed",
    strong_scan_finished_at: nowIso(),
    security_status: resultStatus,
    security_note: report.summary,
    security_scan_score: score,
    security_scan_report: report,
    security_scanned_at: nowIso(),
    last_scan_report_id: scanReportData?.id || null
  };

  if (resultStatus === "Güvenli") {
    productUpdate.status = canAutoPublish ? "Yayında" : "Onay Bekliyor";
    productUpdate.file_path = approvedFilePath;
    productUpdate.approved_file_path = approvedFilePath;
    productUpdate.approved_bucket = "product-files";
    productUpdate.quarantine_file_path = null;
    productUpdate.auto_publish_decision = canAutoPublish;
    productUpdate.auto_publish_reason = autoPublishReason;
    productUpdate.auto_published_at = canAutoPublish ? nowIso() : null;
  } else if (resultStatus === "Manuel İnceleme") {
    productUpdate.status = "Karantina";
    productUpdate.auto_publish_decision = false;
    productUpdate.auto_publish_reason = autoPublishReason;
  } else if (resultStatus === "Riskli") {
    productUpdate.status = "Reddedildi";
    productUpdate.auto_publish_decision = false;
    productUpdate.auto_publish_reason = autoPublishReason;
  }

  await supabase.rpc("update_seller_trust_after_scan", {
    p_seller_id: product.seller_id,
    p_result_status: resultStatus
  });

  await supabase
    .from("products")
    .update(productUpdate)
    .eq("id", product.id);

  await supabase.from("admin_logs").insert({
    actor_id: job.requested_by,
    action: "strong_product_scan_completed",
    entity_type: "product",
    entity_id: product.id,
    title: "Güçlü ürün güvenlik taraması tamamlandı",
    details: `"${product.title}" güçlü taramadan geçti. Sonuç: ${resultStatus}. Skor: ${score}.`,
    metadata: report
  });

  await fs.remove(scanRoot);
}
async function failJob(job, error) {
  const message = error instanceof Error ? error.message : String(error);

  const retryCount = Number(job.retry_count || 0);
  const maxRetries = Number(job.max_retries || 3);
  const nextRetryCount = retryCount + 1;

  if (nextRetryCount <= maxRetries) {
    const delayMs = Math.min(15 * 60 * 1000, nextRetryCount * 60 * 1000);
    const nextRetryAt = new Date(Date.now() + delayMs).toISOString();

    await supabase
      .from("security_scan_jobs")
      .update({
        status: "queued",
        retry_count: nextRetryCount,
        last_error: message,
        error_message: `Geçici hata. ${nextRetryCount}/${maxRetries} yeniden deneme planlandı: ${message}`,
        next_retry_at: nextRetryAt,
        worker_id: null,
        updated_at: nowIso()
      })
      .eq("id", job.id);

    await supabase
      .from("products")
      .update({
        strong_scan_status: "queued",
        security_status: "Manuel İnceleme",
        security_note: `Güçlü tarama geçici hata verdi. ${nextRetryCount}/${maxRetries} yeniden deneme planlandı.`
      })
      .eq("id", job.product_id);

    console.log(
      `[${new Date().toISOString()}] Job tekrar kuyruğa alındı: ${job.id} (${nextRetryCount}/${maxRetries})`
    );

    return;
  }

  await supabase
    .from("security_scan_jobs")
    .update({
      status: "failed",
      result_status: "Tarama Hatası",
      retry_count: nextRetryCount,
      last_error: message,
      error_message: message,
      finished_at: nowIso(),
      updated_at: nowIso(),
      report: {
        error: message,
        workerId: WORKER_ID,
        retryCount: nextRetryCount,
        maxRetries
      }
    })
    .eq("id", job.id);

  await supabase
    .from("products")
    .update({
      strong_scan_status: "failed",
      strong_scan_finished_at: nowIso(),
      security_status: "Manuel İnceleme",
      security_note: "Güçlü tarama 3 denemeden sonra hata verdi. Manuel inceleme gerekiyor."
    })
    .eq("id", job.product_id);
}

async function tick() {
  const job = await claimJob();

  if (!job) {
    await sendHeartbeat("idle", null);
    return;
  }

  console.log(`[${new Date().toISOString()}] Job alındı: ${job.id}`);
  await sendHeartbeat("running", job.id);

  try {
    await processJob(job);
    console.log(`[${new Date().toISOString()}] Job tamamlandı: ${job.id}`);
    await sendHeartbeat("idle", null);
  } catch (error) {
    console.error("Job hata:", error);
    await failJob(job, error);
    await sendHeartbeat("error", job.id);
  }
}

async function main() {
  startHealthServer();
  await fs.ensureDir(WORKDIR);

  console.log("devcodstore Scanner Worker başladı");
  console.log("Worker ID:", WORKER_ID);
  console.log("Interval:", SCAN_INTERVAL_MS);

  await sendHeartbeat("idle", null);
  await recoverStuckJobs();

  while (true) {
    await recoverStuckJobs();
    await tick();
    await sleep(SCAN_INTERVAL_MS);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
