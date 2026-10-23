/**
 * Cliente mínimo de la API de contenidos de GitHub. El panel de /admin no
 * guarda nada por su cuenta: escribe el fichero de fechas en el repositorio y
 * deja que Netlify redespliegue con ese commit.
 */

export const FECHAS_PATH = "src/data/fechas.json";

const API_ROOT = "https://api.github.com";
const API_VERSION = "2022-11-28";

export type GitHubConfig = {
  token: string;
  repo: string;
  branch: string;
};

type FetchLike = typeof fetch;

export class GitHubError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "GitHubError";
    this.status = status;
  }
}

function headers(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": API_VERSION,
    "Content-Type": "application/json",
    "User-Agent": "espai-la-kalma-admin",
  };
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: unknown };
    if (typeof body.message === "string" && body.message.length > 0) return body.message;
  } catch {
    // El cuerpo no era JSON: se usa el mensaje genérico.
  }
  return `respuesta ${response.status} de GitHub`;
}

/**
 * Lee el fichero de fechas de la rama configurada.
 * Devuelve el contenido ya parseado y el `sha`, necesario para escribir.
 */
export async function readFechasFile(
  config: GitHubConfig,
  fetchImpl: FetchLike = fetch,
): Promise<{ content: unknown; sha: string }> {
  const url = `${API_ROOT}/repos/${config.repo}/contents/${FECHAS_PATH}?ref=${encodeURIComponent(config.branch)}`;
  const response = await fetchImpl(url, { headers: headers(config.token) });

  if (!response.ok) {
    throw new GitHubError(
      `No se han podido leer las fechas publicadas: ${await readErrorMessage(response)}`,
      response.status,
    );
  }

  const body = (await response.json()) as { content?: unknown; sha?: unknown; encoding?: unknown };
  if (typeof body.sha !== "string" || typeof body.content !== "string") {
    throw new GitHubError("GitHub ha devuelto el fichero de fechas incompleto.", 502);
  }

  const decoded = Buffer.from(body.content, "base64").toString("utf8");
  let content: unknown;
  try {
    content = JSON.parse(decoded);
  } catch {
    throw new GitHubError("El fichero de fechas del repositorio no es JSON válido.", 502);
  }

  return { content, sha: body.sha };
}

/** Crea un commit con el fichero de fechas y devuelve el sha del commit. */
export async function commitFechasFile(
  config: GitHubConfig,
  serialized: string,
  sha: string,
  message: string,
  fetchImpl: FetchLike = fetch,
): Promise<{ commitSha: string }> {
  const url = `${API_ROOT}/repos/${config.repo}/contents/${FECHAS_PATH}`;
  const response = await fetchImpl(url, {
    method: "PUT",
    headers: headers(config.token),
    body: JSON.stringify({
      message,
      content: Buffer.from(serialized, "utf8").toString("base64"),
      sha,
      branch: config.branch,
    }),
  });

  if (!response.ok) {
    throw new GitHubError(
      `No se han podido guardar las fechas: ${await readErrorMessage(response)}`,
      response.status,
    );
  }

  const body = (await response.json()) as { commit?: { sha?: unknown } };
  const commitSha = body.commit?.sha;
  if (typeof commitSha !== "string") {
    throw new GitHubError("GitHub ha confirmado el guardado sin devolver el commit.", 502);
  }

  return { commitSha };
}
