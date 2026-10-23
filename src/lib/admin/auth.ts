import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/**
 * Autenticación del panel de /admin: una sola contraseña y una cookie de
 * sesión firmada con HMAC-SHA256. Sin usuarios, sin base de datos.
 */

export const SESSION_COOKIE = "kalma_admin";
export const SESSION_TTL_SECONDS = 2 * 60 * 60;
const TOKEN_VERSION = "v1";
const MAX_PASSWORD_LENGTH = 512;

function sha256(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

function sign(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload, "utf8").digest("base64url");
}

/**
 * Compara dos cadenas en tiempo constante. Se comparan los hashes y no las
 * cadenas porque `timingSafeEqual` exige buffers de la misma longitud y la
 * longitud de la contraseña no debe ser deducible por el tiempo de respuesta.
 */
export function safeEqual(a: string, b: string): boolean {
  return timingSafeEqual(sha256(a), sha256(b));
}

/** Comprueba la contraseña recibida contra la configurada. */
export function checkPassword(input: unknown, expected: string | undefined): boolean {
  if (typeof expected !== "string" || expected.length === 0) return false;
  if (typeof input !== "string" || input.length === 0) return false;
  if (input.length > MAX_PASSWORD_LENGTH) return false;
  return safeEqual(input, expected);
}

export type Session = { token: string; maxAge: number };

/** Crea una sesión firmada con caducidad absoluta. */
export function createSession(
  secret: string,
  ttlSeconds: number = SESSION_TTL_SECONDS,
  now: number = Date.now(),
): Session {
  if (typeof secret !== "string" || secret.length === 0) {
    throw new Error("ADMIN_SESSION_SECRET is missing");
  }
  const expiresAt = Math.floor(now / 1000) + ttlSeconds;
  const payload = `${TOKEN_VERSION}.${expiresAt}`;
  return { token: `${payload}.${sign(secret, payload)}`, maxAge: ttlSeconds };
}

/** Verifica la firma y la caducidad de un token de sesión. */
export function verifySession(
  token: unknown,
  secret: string,
  now: number = Date.now(),
): boolean {
  if (typeof secret !== "string" || secret.length === 0) return false;
  if (typeof token !== "string" || token.length === 0 || token.length > 256) return false;

  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [version, expiresAt, signature] = parts;
  if (version !== TOKEN_VERSION) return false;

  const expires = Number(expiresAt);
  if (!Number.isInteger(expires) || expires <= 0) return false;

  if (!safeEqual(signature, sign(secret, `${version}.${expiresAt}`))) return false;

  return expires * 1000 > now;
}

/** Extrae el valor de una cookie del header `Cookie`. */
export function readCookie(header: string | null | undefined, name: string): string | undefined {
  if (typeof header !== "string" || header.length === 0) return undefined;
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    if (part.slice(0, index).trim() !== name) continue;
    const value = part.slice(index + 1).trim();
    return value.length > 0 ? value : undefined;
  }
  return undefined;
}

/** `Set-Cookie` de una sesión recién creada. */
export function sessionCookie(token: string, maxAge: number): string {
  return [
    `${SESSION_COOKIE}=${token}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Strict",
    `Max-Age=${maxAge}`,
  ].join("; ");
}

/** `Set-Cookie` que borra la sesión. */
export function clearSessionCookie(): string {
  return [
    `${SESSION_COOKIE}=`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Strict",
    "Max-Age=0",
  ].join("; ");
}

/**
 * Barrera CSRF de refuerzo: si el navegador manda `Origin`, tiene que ser el
 * mismo host que sirve la petición. La cookie `SameSite=Strict` y exigir
 * `Content-Type: application/json` ya bloquean el resto.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (origin === null) return true;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}
