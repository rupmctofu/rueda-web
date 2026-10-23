import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  FECHAS_PATH,
  GitHubError,
  commitFechasFile,
  readFechasFile,
} from "../src/lib/admin/github.ts";

const config = { token: "ghp_ejemplo", repo: "rupmctofu/rueda-web", branch: "master" };

type Call = { url: string; init: RequestInit };

function fakeFetch(responses: Array<Response>): { fetchImpl: typeof fetch; calls: Array<Call> } {
  const calls: Array<Call> = [];
  const fetchImpl = (async (url: any, init: any = {}) => {
    calls.push({ url: String(url), init });
    const next = responses.shift();
    if (!next) throw new Error("llamada de red inesperada");
    return next;
  }) as unknown as typeof fetch;
  return { fetchImpl, calls };
}

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("readFechasFile", () => {
  it("lee el fichero de la rama configurada y lo devuelve parseado", async () => {
    const stored = { directions: { sur: "4 al 8 de diciembre 2026" }, maestria: "" };
    const { fetchImpl, calls } = fakeFetch([
      jsonResponse(200, {
        sha: "abc123",
        content: Buffer.from(JSON.stringify(stored)).toString("base64"),
        encoding: "base64",
      }),
    ]);

    const result = await readFechasFile(config, fetchImpl);

    assert.deepEqual(result, { content: stored, sha: "abc123" });
    assert.equal(
      calls[0].url,
      "https://api.github.com/repos/rupmctofu/rueda-web/contents/src/data/fechas.json?ref=master",
    );
    const sent = calls[0].init.headers as Record<string, string>;
    assert.equal(sent.Authorization, "Bearer ghp_ejemplo");
    assert.equal(sent.Accept, "application/vnd.github+json");
    assert.equal(calls[0].init.method, undefined);
  });

  it("falla con un mensaje claro si GitHub responde con error", async () => {
    const { fetchImpl } = fakeFetch([jsonResponse(404, { message: "Not Found" })]);

    await assert.rejects(
      () => readFechasFile(config, fetchImpl),
      (error: unknown) => {
        assert.ok(error instanceof GitHubError);
        assert.equal(error.status, 404);
        assert.equal(
          error.message,
          "No se han podido leer las fechas publicadas: Not Found",
        );
        return true;
      },
    );
  });

  it("falla si el fichero del repositorio no es JSON válido", async () => {
    const { fetchImpl } = fakeFetch([
      jsonResponse(200, { sha: "abc123", content: Buffer.from("no soy json").toString("base64") }),
    ]);

    await assert.rejects(
      () => readFechasFile(config, fetchImpl),
      /El fichero de fechas del repositorio no es JSON válido\./,
    );
  });
});

describe("commitFechasFile", () => {
  it("hace commit con el contenido en base64, el sha y el mensaje", async () => {
    const serialized = '{\n  "maestria": ""\n}\n';
    const { fetchImpl, calls } = fakeFetch([jsonResponse(200, { commit: { sha: "commit456" } })]);

    const result = await commitFechasFile(
      config,
      serialized,
      "abc123",
      "content(fechas): actualizar fechas desde el panel",
      fetchImpl,
    );

    assert.deepEqual(result, { commitSha: "commit456" });
    assert.equal(
      calls[0].url,
      "https://api.github.com/repos/rupmctofu/rueda-web/contents/src/data/fechas.json",
    );
    assert.equal(calls[0].init.method, "PUT");
    assert.deepEqual(JSON.parse(String(calls[0].init.body)), {
      message: "content(fechas): actualizar fechas desde el panel",
      content: Buffer.from(serialized, "utf8").toString("base64"),
      sha: "abc123",
      branch: "master",
    });
  });

  it("falla con un mensaje claro si GitHub rechaza el commit", async () => {
    const { fetchImpl } = fakeFetch([jsonResponse(409, { message: "sha does not match" })]);

    await assert.rejects(
      () => commitFechasFile(config, "{}", "sha-viejo", "mensaje", fetchImpl),
      (error: unknown) => {
        assert.ok(error instanceof GitHubError);
        assert.equal(error.status, 409);
        assert.equal(
          error.message,
          "No se han podido guardar las fechas: sha does not match",
        );
        return true;
      },
    );
  });

  it("falla si la respuesta no trae el sha del commit", async () => {
    const { fetchImpl } = fakeFetch([jsonResponse(200, { content: {} })]);

    await assert.rejects(
      () => commitFechasFile(config, "{}", "abc123", "mensaje", fetchImpl),
      /GitHub ha confirmado el guardado sin devolver el commit\./,
    );
  });
});

describe("ruta del fichero", () => {
  it("es la que importa la web", () => {
    assert.equal(FECHAS_PATH, "src/data/fechas.json");
  });
});
