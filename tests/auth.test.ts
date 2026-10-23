import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  SESSION_COOKIE,
  checkPassword,
  clearSessionCookie,
  createSession,
  isSameOrigin,
  readCookie,
  safeEqual,
  sessionCookie,
  verifySession,
} from "../src/lib/admin/auth.ts";

const SECRET = "secreto-de-pruebas-con-suficiente-entropia";
const NOW = Date.UTC(2027, 0, 1, 12, 0, 0);

describe("checkPassword", () => {
  it("acepta la contraseña configurada", () => {
    assert.equal(checkPassword("clave correcta", "clave correcta"), true);
  });

  it("rechaza una contraseña distinta", () => {
    assert.equal(checkPassword("clave incorrecta", "clave correcta"), false);
  });

  it("rechaza cualquier entrada si no hay contraseña configurada", () => {
    assert.equal(checkPassword("lo que sea", undefined), false);
    assert.equal(checkPassword("", ""), false);
  });

  it("rechaza entradas que no son cadenas o están vacías", () => {
    assert.equal(checkPassword("", "clave correcta"), false);
    assert.equal(checkPassword(null, "clave correcta"), false);
    assert.equal(checkPassword(1234, "clave correcta"), false);
    assert.equal(checkPassword({ password: "clave correcta" }, "clave correcta"), false);
  });

  it("rechaza entradas desmesuradamente largas sin comparar", () => {
    assert.equal(checkPassword("x".repeat(513), "clave correcta"), false);
  });
});

describe("safeEqual", () => {
  it("compara cadenas iguales y distintas, también de longitudes diferentes", () => {
    assert.equal(safeEqual("abc", "abc"), true);
    assert.equal(safeEqual("abc", "abd"), false);
    assert.equal(safeEqual("abc", "abc mas largo"), false);
    assert.equal(safeEqual("", ""), true);
  });
});

describe("createSession y verifySession", () => {
  it("acepta la sesión que acaba de crear", () => {
    const { token, maxAge } = createSession(SECRET, 7200, NOW);
    assert.equal(maxAge, 7200);
    assert.equal(verifySession(token, SECRET, NOW), true);
  });

  it("acepta la sesión justo antes de caducar y la rechaza al caducar", () => {
    const { token } = createSession(SECRET, 60, NOW);
    assert.equal(verifySession(token, SECRET, NOW + 59_000), true);
    assert.equal(verifySession(token, SECRET, NOW + 61_000), false);
  });

  it("rechaza una sesión manipulada, con otro secreto o mal formada", () => {
    const { token } = createSession(SECRET, 7200, NOW);
    const [version, expiresAt, signature] = token.split(".");
    const retraso = `${version}.${Number(expiresAt) + 9999}.${signature}`;

    assert.equal(verifySession(retraso, SECRET, NOW), false);
    assert.equal(verifySession(token, "otro secreto distinto", NOW), false);
    assert.equal(verifySession(`${version}.${expiresAt}`, SECRET, NOW), false);
    assert.equal(verifySession(`${version}.no-es-un-numero.${signature}`, SECRET, NOW), false);
    assert.equal(verifySession(`${version}.0.${signature}`, SECRET, NOW), false);
    assert.equal(verifySession(`v2.${expiresAt}.${signature}`, SECRET, NOW), false);
    assert.equal(verifySession("", SECRET, NOW), false);
    assert.equal(verifySession(undefined, SECRET, NOW), false);
    assert.equal(verifySession(token, "", NOW), false);
  });

  it("no crea sesiones sin secreto configurado", () => {
    assert.throws(() => createSession("", 7200, NOW), /ADMIN_SESSION_SECRET/);
  });
});

describe("readCookie", () => {
  it("encuentra la cookie entre otras", () => {
    assert.equal(readCookie(`otra=1; ${SESSION_COOKIE}=abc.def.ghi; ultima=2`, SESSION_COOKIE), "abc.def.ghi");
  });

  it("no confunde una cookie con otra cuyo nombre empieza igual", () => {
    assert.equal(readCookie(`${SESSION_COOKIE}_otra=valor`, SESSION_COOKIE), undefined);
  });

  it("devuelve undefined si no hay cookie o está vacía", () => {
    assert.equal(readCookie(null, SESSION_COOKIE), undefined);
    assert.equal(readCookie("otra=1", SESSION_COOKIE), undefined);
    assert.equal(readCookie(`${SESSION_COOKIE}=`, SESSION_COOKIE), undefined);
  });
});

describe("cookies de sesión", () => {
  it("marca la cookie como HttpOnly, Secure, SameSite=Strict y con caducidad", () => {
    const cookie = sessionCookie("token.de.prueba", 7200);
    assert.match(cookie, new RegExp(`^${SESSION_COOKIE}=token\\.de\\.prueba`));
    for (const atributo of ["Path=/", "HttpOnly", "Secure", "SameSite=Strict", "Max-Age=7200"]) {
      assert.ok(cookie.includes(atributo), `falta ${atributo}`);
    }
  });

  it("borra la cookie con Max-Age=0", () => {
    const cookie = clearSessionCookie();
    assert.match(cookie, new RegExp(`^${SESSION_COOKIE}=;`));
    assert.ok(cookie.includes("Max-Age=0"));
  });
});

describe("isSameOrigin", () => {
  const request = (headers: Record<string, string>) =>
    new Request("https://www.espailakalmashamanic.com/api/admin/session", {
      method: "POST",
      headers,
    });

  it("acepta peticiones sin Origin y con el mismo host", () => {
    assert.equal(isSameOrigin(request({})), true);
    assert.equal(isSameOrigin(request({ origin: "https://www.espailakalmashamanic.com" })), true);
  });

  it("rechaza otro host y un Origin inválido", () => {
    assert.equal(isSameOrigin(request({ origin: "https://evil.example" })), false);
    assert.equal(isSameOrigin(request({ origin: "no-es-una-url" })), false);
  });
});
