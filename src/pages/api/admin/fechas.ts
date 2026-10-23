import type { APIRoute } from "astro";

import { SESSION_COOKIE, isSameOrigin, readCookie, verifySession } from "@/lib/admin/auth";
import { adminConfig, type AdminConfig } from "@/lib/admin/config";
import { mergeFechas, parseFechasPayload, serializeFechas, toPayload } from "@/lib/admin/fechas";
import { GitHubError, commitFechasFile, readFechasFile } from "@/lib/admin/github";

export const prerender = false;

const COMMIT_MESSAGE = "content(fechas): actualizar fechas desde el panel";

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

type Guard = { ok: true; config: AdminConfig } | { ok: false; response: Response };

/** Sesión válida y configuración completa, o la respuesta de error ya lista. */
function guard(request: Request): Guard {
  const result = adminConfig();
  if (!result.ok) {
    console.error("[admin] configuración incompleta:", result.problems.join(" "));
    return {
      ok: false,
      response: json(
        { error: "El panel no está configurado. Revisa las variables de entorno." },
        500,
      ),
    };
  }

  const token = readCookie(request.headers.get("cookie"), SESSION_COOKIE);
  if (!verifySession(token, result.config.sessionSecret)) {
    return { ok: false, response: json({ error: "La sesión ha caducado. Vuelve a entrar." }, 401) };
  }

  return { ok: true, config: result.config };
}

function githubClient(config: AdminConfig) {
  return { token: config.githubToken, repo: config.repo, branch: config.branch };
}

function failure(error: unknown): Response {
  if (error instanceof GitHubError && error.status === 409) {
    return json(
      {
        error:
          "Alguien ha guardado cambios mientras editabas. Recarga la página y vuelve a intentarlo.",
      },
      409,
    );
  }
  if (error instanceof GitHubError) {
    console.error("[admin] error de GitHub:", error.message);
    return json({ error: error.message }, 502);
  }
  console.error("[admin] error inesperado:", error);
  return json({ error: "No se han podido guardar las fechas. Inténtalo de nuevo." }, 500);
}

export const GET: APIRoute = async ({ request }) => {
  const access = guard(request);
  if (!access.ok) return access.response;

  try {
    const { content } = await readFechasFile(githubClient(access.config));
    return json({ fechas: toPayload(content) });
  } catch (error) {
    return failure(error);
  }
};

export const POST: APIRoute = async ({ request }) => {
  if (!isSameOrigin(request)) {
    return json({ error: "Origen no permitido." }, 403);
  }

  const access = guard(request);
  if (!access.ok) return access.response;

  if (!(request.headers.get("content-type") ?? "").includes("application/json")) {
    return json({ error: "Petición no válida." }, 400);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Petición no válida." }, 400);
  }

  const parsed = parseFechasPayload(body);
  if (!parsed.ok) return json({ error: parsed.error }, 400);

  const client = githubClient(access.config);
  try {
    const { content, sha } = await readFechasFile(client);
    const merged = mergeFechas(content, parsed.value);
    const { commitSha } = await commitFechasFile(
      client,
      serializeFechas(merged),
      sha,
      COMMIT_MESSAGE,
    );

    return json({ ok: true, commitSha, fechas: toPayload(merged) });
  } catch (error) {
    return failure(error);
  }
};
