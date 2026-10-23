/**
 * Configuración del panel de /admin, leída de variables de entorno en tiempo
 * de ejecución. Nunca se expone al navegador: solo la usa el servidor.
 */

export const MIN_PASSWORD_LENGTH = 12;
export const MIN_SECRET_LENGTH = 32;
export const DEFAULT_REPO = "rupmctofu/rueda-web";
export const DEFAULT_BRANCH = "master";

export type AdminConfig = {
  password: string;
  sessionSecret: string;
  githubToken: string;
  repo: string;
  branch: string;
};

export type ConfigResult =
  | { ok: true; config: AdminConfig }
  | { ok: false; problems: Array<string> };

type Env = Record<string, string | undefined>;

/** Valida las variables de entorno y aplica los valores por defecto. */
export function resolveAdminConfig(env: Env): ConfigResult {
  const problems: Array<string> = [];
  const value = (name: string) => (env[name] ?? "").trim();

  const password = value("ADMIN_PASSWORD");
  const sessionSecret = value("ADMIN_SESSION_SECRET");
  const githubToken = value("GITHUB_TOKEN");

  if (password.length === 0) {
    problems.push("ADMIN_PASSWORD no está definida.");
  } else if (password.length < MIN_PASSWORD_LENGTH) {
    problems.push(`ADMIN_PASSWORD debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`);
  }

  if (sessionSecret.length === 0) {
    problems.push("ADMIN_SESSION_SECRET no está definida.");
  } else if (sessionSecret.length < MIN_SECRET_LENGTH) {
    problems.push(`ADMIN_SESSION_SECRET debe tener al menos ${MIN_SECRET_LENGTH} caracteres.`);
  }

  if (githubToken.length === 0) {
    problems.push("GITHUB_TOKEN no está definida.");
  }

  if (problems.length > 0) return { ok: false, problems };

  return {
    ok: true,
    config: {
      password,
      sessionSecret,
      githubToken,
      repo: value("GITHUB_REPO") || DEFAULT_REPO,
      branch: value("GITHUB_BRANCH") || DEFAULT_BRANCH,
    },
  };
}

/**
 * Entorno del servidor: primero `process.env` (Netlify lo inyecta en la
 * función) y, si no está, `import.meta.env` (lo que carga Astro desde `.env`
 * en desarrollo).
 */
export function serverEnv(): Env {
  const fromProcess = typeof process !== "undefined" ? process.env : undefined;
  const fromModule = (import.meta.env ?? {}) as Env;
  return { ...fromModule, ...(fromProcess as Env | undefined) };
}

/** Configuración del panel en el entorno actual. */
export function adminConfig(): ConfigResult {
  return resolveAdminConfig(serverEnv());
}
