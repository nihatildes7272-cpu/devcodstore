import crypto from "crypto";

const defaultIyzicoBaseUrl = "https://sandbox-api.iyzipay.com";

type IyzicoRequestOptions = {
  path: string;
  body: Record<string, unknown>;
};

export function getIyzicoBaseUrl() {
  return (process.env.IYZICO_BASE_URL || defaultIyzicoBaseUrl).replace(/\/$/, "");
}

export function getIyzicoCredentials() {
  const apiKey = process.env.IYZICO_API_KEY;
  const secretKey = process.env.IYZICO_SECRET_KEY;

  if (!apiKey || !secretKey) {
    throw new Error("IYZICO_API_KEY ve IYZICO_SECRET_KEY ortam değişkenleri tanımlı olmalı.");
  }

  return { apiKey, secretKey };
}

export function createIyzicoHeaders({ path, body }: IyzicoRequestOptions) {
  const { apiKey, secretKey } = getIyzicoCredentials();
  const requestBody = JSON.stringify(body);
  const randomKey = `${Date.now()}${crypto.randomBytes(8).toString("hex")}`;
  const signature = crypto
    .createHmac("sha256", secretKey)
    .update(randomKey + path + requestBody)
    .digest("hex");
  const authorization = Buffer.from(
    `apiKey:${apiKey}&randomKey:${randomKey}&signature:${signature}`,
    "utf8"
  ).toString("base64");

  return {
    body: requestBody,
    headers: {
      Authorization: `IYZWSv2 ${authorization}`,
      "Content-Type": "application/json",
      "x-iyzi-rnd": randomKey,
    },
  };
}

export async function iyzicoPost<T>({ path, body }: IyzicoRequestOptions) {
  const request = createIyzicoHeaders({ path, body });
  const response = await fetch(`${getIyzicoBaseUrl()}${path}`, {
    method: "POST",
    headers: request.headers,
    body: request.body,
  });
  const data = (await response.json()) as T;

  if (!response.ok) {
    throw new Error(`iyzico isteği başarısız oldu (${response.status}).`);
  }

  return data;
}

export function getIyzicoCallbackUrl() {
  const callbackUrl = process.env.IYZICO_CALLBACK_URL;

  if (callbackUrl) {
    return callbackUrl;
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  if (siteUrl) {
    return `${siteUrl.replace(/\/$/, "")}/api/checkout/webhook`;
  }

  throw new Error("IYZICO_CALLBACK_URL veya NEXT_PUBLIC_SITE_URL ortam değişkeni tanımlı olmalı.");
}
