import type { APIRoute } from "astro";

import {
  SESSION_COOKIE,
  checkPassword,
  clearSessionCookie,
  createSession,
  isSameOrigin,
  readCookie,
  sessionCookie,
  verifySession,
} from "@/lib/admin/auth";
import { adminConfig } from "@/lib/admin/config";

export const prerender = false;

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
};

function json(
  body: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...JSON_HEADERS, ...extraHeaders },
  });
}

/** Retraso ante una contraseña fallida: frena los intentos por fuerza bruta. */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const GET: APIRoute = async ({ request }) => {
  const result = adminConfig();
  if (!result.ok) return json({ authenticated: false });

  const token = readCookie(request.headers.get("cookie"), SESSION_COOKIE);
  return json({ authenticated: verifySession(token, result.config.sessionSecret) });
};

export const POST: APIRoute = async ({ request }) => {
  if (!isSameOrigin(request)) {
    return json({ error: "Origen no permitido." }, 403);
  }

  const result = adminConfig();
  if (!result.ok) {
    console.error("[admin] configuración incompleta:", result.problems.join(" "));
    return json(
      { error: "El panel no está configurado. Revisa las variables de entorno." },
      500,
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Petición no válida." }, 400);
  }

  const password =
    typeof body === "object" && body !== null
      ? (body as { password?: unknown }).password
      : undefined;

  if (!checkPassword(password, result.config.password)) {
    await delay(500);
    return json({ error: "Contraseña incorrecta." }, 401);
  }

  const session = createSession(result.config.sessionSecret);
  return json({ ok: true }, 200, {
    "set-cookie": sessionCookie(session.token, session.maxAge),
  });
};

export const DELETE: APIRoute = async () => {
  return json({ ok: true }, 200, { "set-cookie": clearSessionCookie() });
};
