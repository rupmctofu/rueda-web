import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  MAX_EVENTS,
  MAX_TEXT_LENGTH,
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
    { date: "24 y 25 de octubre 2026", title: "TEMAZCAL MIXTO" },
    { date: "20 de diciembre 2026, 11h", title: "Temazcal de solsticio invierno" },
  ],
  maestria: "Fechas por confirmar",
});

const storedFile = () => ({
  directions: validPayload().directions,
  temazcalEvents: [
    { date: "24 y 25 de octubre 2026", title: "TEMAZCAL MIXTO", description: "Nota interna" },
    { date: "20 de diciembre 2026, 11h", title: "Temazcal de solsticio invierno", description: "" },
  ],
  maestria: "Fechas por confirmar",
});

const errorOf = (input: unknown): string => {
  const result = parseFechasPayload(input);
  assert.equal(result.ok, false, "se esperaba un payload rechazado");
  return result.ok ? "" : result.error;
};

describe("parseFechasPayload", () => {
  it("acepta el formulario completo y normaliza los espacios sobrantes", () => {
    const payload = validPayload();
    payload.directions.sur = "  4 al 8 de diciembre 2026  ";
    const result = parseFechasPayload(payload);
    assert.equal(result.ok, true);
    assert.deepEqual(result.ok && result.value, validPayload());
  });

  it("permite dejar una dirección, un temazcal o la maestría sin fecha", () => {
    const payload = validPayload();
    payload.directions.este = "";
    payload.maestria = "";
    payload.temazcalEvents[0].date = "";

    const result = parseFechasPayload(payload);
    assert.equal(result.ok, true);
    assert.equal(result.ok && result.value.directions.este, "");
    assert.equal(result.ok && result.value.maestria, "");
    assert.equal(result.ok && result.value.temazcalEvents[0].date, "");
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
    title.temazcalEvents[1].title = "x".repeat(121);
    assert.equal(
      errorOf(title),
      "El título del temazcal número 2: no puede superar los 120 caracteres.",
    );
  });

  it("rechaza saltos de línea y los caracteres < o >", () => {
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

  it("exige el título del temazcal pero no mezcla campos de más", () => {
    const emptyTitle = validPayload();
    emptyTitle.temazcalEvents[0].title = "   ";
    assert.equal(
      errorOf(emptyTitle),
      "El título del temazcal número 1: no puede quedar vacío.",
    );

    const withDescription = validPayload() as Record<string, any>;
    withDescription.temazcalEvents[0].description = "texto que no se edita aquí";
    assert.equal(errorOf(withDescription), "El temazcal número 1 no es válido.");
  });

  it(`rechaza más de ${MAX_EVENTS} temazcales y un listado que no sea lista`, () => {
    const tooMany = validPayload() as Record<string, any>;
    tooMany.temazcalEvents = Array.from({ length: MAX_EVENTS + 1 }, () => ({
      date: "2027",
      title: "Temazcal",
    }));
    assert.equal(
      errorOf(tooMany),
      `El temazcal no puede tener más de ${MAX_EVENTS} fechas.`,
    );

    const notList = validPayload() as Record<string, any>;
    notList.temazcalEvents = { 0: { date: "2027", title: "Temazcal" } };
    assert.equal(errorOf(notList), "Faltan las fechas del temazcal.");
  });
});

describe("mergeFechas", () => {
  it("aplica las fechas nuevas y conserva la descripción que el panel no edita", () => {
    const payload = validPayload();
    payload.directions.norte = "1 al 5 de mayo 2027";

    const merged = mergeFechas(storedFile(), payload);

    assert.equal(merged.directions.norte, "1 al 5 de mayo 2027");
    assert.equal(merged.temazcalEvents[0].description, "Nota interna");
    assert.equal(merged.temazcalEvents[0].title, "TEMAZCAL MIXTO");
    assert.deepEqual(Object.keys(merged), ["directions", "temazcalEvents", "maestria"]);
    assert.deepEqual(Object.keys(merged.temazcalEvents[0]), ["date", "title", "description"]);
  });

  it("no falla si el fichero actual está vacío o no tiene eventos", () => {
    const merged = mergeFechas(undefined, validPayload());
    assert.equal(merged.temazcalEvents.length, 2);
    assert.deepEqual(merged.temazcalEvents[0], {
      date: "24 y 25 de octubre 2026",
      title: "TEMAZCAL MIXTO",
      description: "",
    });
  });

  it("al añadir un temazcal nuevo le deja la descripción vacía", () => {
    const payload = validPayload();
    payload.temazcalEvents.push({ date: "1 de marzo 2027", title: "Temazcal de primavera" });

    const merged = mergeFechas(storedFile(), payload);

    assert.deepEqual(merged.temazcalEvents[2], {
      date: "1 de marzo 2027",
      title: "Temazcal de primavera",
      description: "",
    });
  });
});

describe("toPayload y serializeFechas", () => {
  it("proyecta el fichero guardado a la forma editable, sin descripciones", () => {
    assert.deepEqual(toPayload(storedFile()), validPayload());
  });

  it("proyecta un fichero incompleto a valores vacíos sin romperse", () => {
    assert.deepEqual(toPayload({}), {
      directions: { sur: "", oeste: "", norte: "", este: "" },
      temazcalEvents: [],
      maestria: "",
    });
  });

  it("serializa con sangría de dos espacios y salto de línea final", () => {
    const serialized = serializeFechas(storedFile() as any);
    assert.ok(serialized.endsWith("}\n"));
    assert.ok(serialized.includes('\n  "directions": {'));
    assert.deepEqual(JSON.parse(serialized), storedFile());
  });

  it("ida y vuelta: guardar y volver a leer no pierde nada de lo editable", () => {
    const payload = validPayload();
    const saved = JSON.parse(serializeFechas(mergeFechas(storedFile(), payload)));
    assert.deepEqual(toPayload(saved), payload);
  });
});
