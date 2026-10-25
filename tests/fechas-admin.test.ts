import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  MAX_DESCRIPTION_LENGTH,
  MAX_EVENTS,
  MAX_TEXT_LENGTH,
  MAX_TITLE_LENGTH,
  mergeFechas,
  parseFechasPayload,
  serializeFechas,
  toPayload,
} from "../src/lib/admin/fechas.ts";

const validPayload = () => ({
  directions: {
    sur: "4 al 8 de diciembre 2026",
    oeste: "4 al 8 de diciembre 2026",
    norte: "8 al 11 de abril 2027",
    este: "23 al 27 de junio 2027",
  },
  temazcalEvents: [
    {
      id: "temazcal-9f2c1a",
      startDate: "2026-10-24",
      endDate: "2026-10-25",
      title: "TEMAZCAL MIXTO",
      description: "",
    },
    {
      id: "temazcal-4d7e0b",
      startDate: "2026-12-20",
      endDate: "2026-12-20",
      title: "Temazcal de solsticio invierno",
      description: "A las 11h, trae ropa de cambio.",
    },
  ],
  maestria: "Fechas por confirmar",
});

const errorOf = (input: unknown): string => {
  const result = parseFechasPayload(input);
  assert.equal(result.ok, false, "se esperaba un payload rechazado");
  return result.ok ? "" : result.error;
};

const withEvent = (changes: Record<string, unknown>) => {
  const payload = validPayload() as Record<string, any>;
  payload.temazcalEvents[0] = { ...payload.temazcalEvents[0], ...changes };
  return payload;
};

describe("parseFechasPayload", () => {
  it("acepta el formulario completo y normaliza los espacios sobrantes", () => {
    const payload = validPayload();
    payload.directions.sur = "  4 al 8 de diciembre 2026  ";
    const result = parseFechasPayload(payload);
    assert.equal(result.ok, true);
    assert.deepEqual(result.ok && result.value, validPayload());
  });

  it("permite dejar las direcciones y la maestría sin fecha", () => {
    const payload = validPayload();
    payload.directions.este = "";
    payload.maestria = "";

    const result = parseFechasPayload(payload);
    assert.equal(result.ok, true);
    assert.equal(result.ok && result.value.directions.este, "");
    assert.equal(result.ok && result.value.maestria, "");
  });

  it("permite quedarse sin ningún temazcal programado", () => {
    const payload = validPayload();
    payload.temazcalEvents = [];

    const result = parseFechasPayload(payload);
    assert.equal(result.ok, true);
    assert.deepEqual(result.ok && result.value.temazcalEvents, []);
  });

  it("rechaza cuerpos que no son un objeto o traen campos de más", () => {
    assert.equal(errorOf(null), "Los datos enviados no son válidos.");
    assert.equal(errorOf([validPayload()]), "Los datos enviados no son válidos.");
    assert.equal(
      errorOf({ ...validPayload(), extra: true }),
      "Los datos enviados contienen campos desconocidos.",
    );
  });

  it("exige las cuatro direcciones y ningún campo ajeno", () => {
    const missing = validPayload() as Record<string, unknown>;
    delete (missing.directions as Record<string, unknown>).norte;
    assert.equal(errorOf(missing), "Faltan las fechas de alguna dirección.");

    const extra = validPayload();
    (extra.directions as Record<string, unknown>).extra = "x";
    assert.equal(errorOf(extra), "Las fechas de las direcciones no son válidas.");
  });

  it("rechaza valores que no son texto", () => {
    const payload = validPayload() as Record<string, any>;
    payload.directions.sur = 2026;
    assert.equal(errorOf(payload), "La dirección sur: se esperaba texto.");
  });

  it(`rechaza textos de más de ${MAX_TEXT_LENGTH} caracteres`, () => {
    const payload = validPayload();
    payload.directions.oeste = "x".repeat(MAX_TEXT_LENGTH + 1);
    assert.equal(
      errorOf(payload),
      `La dirección oeste: no puede superar los ${MAX_TEXT_LENGTH} caracteres.`,
    );

    const title = validPayload();
    title.temazcalEvents[1].title = "x".repeat(MAX_TITLE_LENGTH + 1);
    assert.equal(
      errorOf(title),
      `El título del temazcal número 2: no puede superar los ${MAX_TITLE_LENGTH} caracteres.`,
    );
  });

  it("rechaza saltos de línea y los caracteres < o > en las fechas de las direcciones", () => {
    const newline = validPayload();
    newline.directions.sur = "4 al 8\nde diciembre";
    assert.equal(
      errorOf(newline),
      "La dirección sur: no admite saltos de línea ni los caracteres < o >.",
    );

    const html = validPayload();
    html.maestria = "<script>alert(1)</script>";
    assert.equal(
      errorOf(html),
      "La fecha de la maestría: no admite saltos de línea ni los caracteres < o >.",
    );
  });

  it("exige el título del temazcal y no acepta campos de más en el evento", () => {
    assert.equal(
      errorOf(withEvent({ title: "   " })),
      "El título del temazcal número 1: no puede quedar vacío.",
    );

    assert.equal(errorOf(withEvent({ date: "24 y 25 de octubre 2026" })), "El temazcal número 1 no es válido.");
  });

  it("acepta la descripción vacía y convierte los saltos de línea en espacios", () => {
    const empty = validPayload();
    empty.temazcalEvents[0].description = "";
    assert.equal(parseFechasPayload(empty).ok, true);

    const multiline = validPayload();
    multiline.temazcalEvents[0].description = "Trae ropa de cambio.\nY toalla.";
    const result = parseFechasPayload(multiline);
    assert.equal(result.ok, true);
    assert.equal(
      result.ok && result.value.temazcalEvents[0].description,
      "Trae ropa de cambio. Y toalla.",
    );
  });

  it(`rechaza descripciones de más de ${MAX_DESCRIPTION_LENGTH} caracteres`, () => {
    assert.equal(
      errorOf(withEvent({ description: "x".repeat(MAX_DESCRIPTION_LENGTH + 1) })),
      `La descripción del temazcal número 1: no puede superar los ${MAX_DESCRIPTION_LENGTH} caracteres.`,
    );
  });

  it("rechaza fechas que no son YYYY-MM-DD o no existen en el calendario", () => {
    assert.equal(
      errorOf(withEvent({ startDate: "24/10/2026" })),
      "La fecha de inicio del temazcal número 1 no es válida.",
    );
    assert.equal(
      errorOf(withEvent({ endDate: "2026-13-01" })),
      "La fecha final del temazcal número 1 no es válida.",
    );
    assert.equal(
      errorOf(withEvent({ endDate: "2026-02-30" })),
      "La fecha final del temazcal número 1 no es válida.",
    );
    assert.equal(
      errorOf(withEvent({ startDate: "" })),
      "La fecha de inicio del temazcal número 1 no es válida.",
    );
  });

  it("rechaza una fecha final anterior a la inicial y acepta el mismo día", () => {
    assert.equal(
      errorOf(withEvent({ startDate: "2026-10-25", endDate: "2026-10-24" })),
      "La fecha final del temazcal número 1 no puede ser anterior a la de inicio.",
    );
    assert.equal(
      parseFechasPayload(withEvent({ startDate: "2026-10-24", endDate: "2026-10-24" })).ok,
      true,
    );
  });

  it("rechaza identificadores mal formados o repetidos", () => {
    assert.equal(
      errorOf(withEvent({ id: "Temazcal 1" })),
      "El identificador del temazcal número 1 no es válido.",
    );
    assert.equal(
      errorOf(withEvent({ id: "" })),
      "El identificador del temazcal número 1 no es válido.",
    );

    const duplicated = validPayload();
    duplicated.temazcalEvents[1].id = duplicated.temazcalEvents[0].id;
    assert.equal(errorOf(duplicated), "Hay dos temazcales con el mismo identificador.");
  });

  it(`rechaza más de ${MAX_EVENTS} temazcales y un listado que no sea lista`, () => {
    const tooMany = validPayload() as Record<string, any>;
    tooMany.temazcalEvents = Array.from({ length: MAX_EVENTS + 1 }, (_, index) => ({
      id: `temazcal-${index}`,
      startDate: "2027-03-01",
      endDate: "2027-03-02",
      title: "Temazcal",
      description: "",
    }));
    assert.equal(errorOf(tooMany), `No se pueden programar más de ${MAX_EVENTS} temazcales.`);

    const notList = validPayload() as Record<string, any>;
    notList.temazcalEvents = { 0: { id: "temazcal-1" } };
    assert.equal(errorOf(notList), "Faltan las fechas del temazcal.");
  });
});

describe("mergeFechas", () => {
  it("guarda exactamente lo editable, sin campos ocultos ni herencias por posición", () => {
    const payload = validPayload();
    payload.directions.norte = "1 al 5 de mayo 2027";

    const merged = mergeFechas(payload);

    assert.equal(merged.directions.norte, "1 al 5 de mayo 2027");
    assert.deepEqual(merged.temazcalEvents[0], payload.temazcalEvents[0]);
    assert.deepEqual(Object.keys(merged), ["directions", "temazcalEvents", "maestria"]);
    assert.deepEqual(Object.keys(merged.temazcalEvents[0]), [
      "id",
      "startDate",
      "endDate",
      "title",
      "description",
    ]);
  });

  it("ordena el fichero por fecha de inicio", () => {
    const payload = validPayload();
    payload.temazcalEvents.reverse();

    const merged = mergeFechas(payload);

    assert.deepEqual(
      merged.temazcalEvents.map((event) => event.id),
      ["temazcal-9f2c1a", "temazcal-4d7e0b"],
    );
  });

  it("al quitar un temazcal desaparece del fichero sin arrastrar su descripción", () => {
    const payload = validPayload();
    payload.temazcalEvents = [payload.temazcalEvents[1]];

    const merged = mergeFechas(payload);

    assert.equal(merged.temazcalEvents.length, 1);
    assert.equal(merged.temazcalEvents[0].id, "temazcal-4d7e0b");
    assert.equal(merged.temazcalEvents[0].description, "A las 11h, trae ropa de cambio.");
  });
});

describe("toPayload y serializeFechas", () => {
  it("proyecta el fichero guardado a la forma editable, con descripciones", () => {
    assert.deepEqual(toPayload(validPayload()), validPayload());
  });

  it("proyecta un fichero incompleto a valores vacíos sin romperse", () => {
    assert.deepEqual(toPayload({}), {
      directions: { sur: "", oeste: "", norte: "", este: "" },
      temazcalEvents: [],
      maestria: "",
    });

    const halfEvent = toPayload({
      temazcalEvents: [{ id: "temazcal-1", title: "Solo título" }],
    });
    assert.deepEqual(halfEvent.temazcalEvents[0], {
      id: "temazcal-1",
      startDate: "",
      endDate: "",
      title: "Solo título",
      description: "",
    });
  });

  it("serializa con sangría de dos espacios y salto de línea final", () => {
    const serialized = serializeFechas(mergeFechas(validPayload()));
    assert.ok(serialized.endsWith("}\n"));
    assert.ok(serialized.includes('\n  "directions": {'));
    assert.deepEqual(JSON.parse(serialized), validPayload());
  });

  it("ida y vuelta: guardar y volver a leer no pierde nada de lo editable", () => {
    const payload = validPayload();
    const saved = JSON.parse(serializeFechas(mergeFechas(payload)));
    assert.deepEqual(toPayload(saved), payload);
  });
});
