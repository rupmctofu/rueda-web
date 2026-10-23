import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DEFAULT_BRANCH,
  DEFAULT_REPO,
  MIN_PASSWORD_LENGTH,
  MIN_SECRET_LENGTH,
  resolveAdminConfig,
} from "../src/lib/admin/config.ts";

const validEnv = () => ({
  ADMIN_PASSWORD: "contrasena-larga-de-ejemplo",
  ADMIN_SESSION_SECRET: "s".repeat(MIN_SECRET_LENGTH),
  GITHUB_TOKEN: "ghp_ejemplo",
});

describe("resolveAdminConfig", () => {
  it("acepta una configuración completa y aplica repo y rama por defecto", () => {
    const result = resolveAdminConfig(validEnv());
    assert.equal(result.ok, true);
    assert.deepEqual(result.ok && result.config, {
      password: "contrasena-larga-de-ejemplo",
      sessionSecret: "s".repeat(MIN_SECRET_LENGTH),
      githubToken: "ghp_ejemplo",
      repo: DEFAULT_REPO,
      branch: DEFAULT_BRANCH,
    });
    assert.equal(DEFAULT_REPO, "rupmctofu/rueda-web");
    assert.equal(DEFAULT_BRANCH, "master");
  });

  it("respeta un repo y una rama distintos si están definidos", () => {
    const result = resolveAdminConfig({
      ...validEnv(),
      GITHUB_REPO: "otro/proyecto",
      GITHUB_BRANCH: "develop",
    });
    assert.equal(result.ok && result.config.repo, "otro/proyecto");
    assert.equal(result.ok && result.config.branch, "develop");
  });

  it("enumera todas las variables que faltan", () => {
    const result = resolveAdminConfig({});
    assert.equal(result.ok, false);
    assert.deepEqual(result.ok ? [] : result.problems, [
      "ADMIN_PASSWORD no está definida.",
      "ADMIN_SESSION_SECRET no está definida.",
      "GITHUB_TOKEN no está definida.",
    ]);
  });

  it("rechaza una contraseña y un secreto demasiado cortos", () => {
    const result = resolveAdminConfig({
      ...validEnv(),
      ADMIN_PASSWORD: "corta",
      ADMIN_SESSION_SECRET: "corto",
    });
    assert.equal(result.ok, false);
    assert.deepEqual(result.ok ? [] : result.problems, [
      `ADMIN_PASSWORD debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`,
      `ADMIN_SESSION_SECRET debe tener al menos ${MIN_SECRET_LENGTH} caracteres.`,
    ]);
  });

  it("ignora los espacios sobrantes pero no acepta valores en blanco", () => {
    const result = resolveAdminConfig({ ...validEnv(), GITHUB_TOKEN: "   " });
    assert.equal(result.ok, false);
    assert.deepEqual(result.ok ? [] : result.problems, ["GITHUB_TOKEN no está definida."]);
  });
});
