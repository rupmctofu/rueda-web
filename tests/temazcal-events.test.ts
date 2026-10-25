import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  FINISHED_FALLBACK,
  formatEventDate,
  isFinished,
  todayInMadrid,
  upcomingEvents,
} from "../src/lib/temazcal-events.ts";

const event = (overrides = {}) => ({
  id: "temazcal-1",
  startDate: "2026-12-20",
  endDate: "2026-12-20",
  title: "Temazcal de solsticio invierno",
  description: "",
  ...overrides,
});

describe("todayInMadrid", () => {
  it("usa el día de Madrid, no el de UTC", () => {
    assert.equal(todayInMadrid(new Date("2026-12-31T23:30:00Z")), "2027-01-01");
  });

  it("por la mañana de UTC sigue siendo el mismo día en Madrid", () => {
    assert.equal(todayInMadrid(new Date("2026-12-20T09:00:00Z")), "2026-12-20");
  });
});

describe("isFinished", () => {
  it("un evento de un solo día sigue visible ese día", () => {
    assert.equal(isFinished(event(), "2026-12-20"), false);
  });

  it("un evento desaparece al día siguiente de su último día", () => {
    assert.equal(isFinished(event(), "2026-12-21"), true);
  });

  it("manda la fecha final, no la inicial", () => {
    const range = event({ startDate: "2026-10-24", endDate: "2026-10-25" });
    assert.equal(isFinished(range, "2026-10-25"), false);
    assert.equal(isFinished(range, "2026-10-26"), true);
  });

  it("un evento sin fechas válidas no se oculta nunca", () => {
    assert.equal(isFinished(event({ startDate: "", endDate: "" }), "2030-01-01"), false);
    assert.equal(isFinished(event({ startDate: "2026-13-01", endDate: "2026-13-02" }), "2030-01-01"), false);
  });
});

describe("upcomingEvents", () => {
  it("quita los terminados y conserva los que están por delante", () => {
    const finished = event({ id: "viejo", startDate: "2026-10-24", endDate: "2026-10-25" });
    const next = event({ id: "nuevo", startDate: "2026-12-20", endDate: "2026-12-20" });
    assert.deepEqual(
      upcomingEvents([finished, next], "2026-10-25").map((item) => item.id),
      ["viejo", "nuevo"],
    );
    assert.deepEqual(
      upcomingEvents([finished, next], "2026-10-26").map((item) => item.id),
      ["nuevo"],
    );
  });

  it("ordena por fecha de inicio sin tocar el orden recibido en empate", () => {
    const later = event({ id: "b", startDate: "2027-04-08", endDate: "2027-04-11" });
    const sooner = event({ id: "a", startDate: "2026-12-20", endDate: "2026-12-20" });
    const sameStart = event({ id: "c", startDate: "2026-12-20", endDate: "2026-12-21" });
    assert.deepEqual(
      upcomingEvents([later, sooner, sameStart], "2026-10-25").map((item) => item.id),
      ["a", "c", "b"],
    );
  });

  it("deja vacía la lista cuando no queda ninguno", () => {
    assert.deepEqual(upcomingEvents([event()], "2027-01-01"), []);
  });
});

describe("formatEventDate", () => {
  it("un solo día", () => {
    assert.equal(formatEventDate({ startDate: "2026-12-20", endDate: "2026-12-20" }), "20 de diciembre 2026");
  });

  it("dos días seguidos usan «y»", () => {
    assert.equal(
      formatEventDate({ startDate: "2026-10-24", endDate: "2026-10-25" }),
      "24 y 25 de octubre 2026",
    );
  });

  it("un rango dentro del mismo mes usa «al»", () => {
    assert.equal(
      formatEventDate({ startDate: "2027-04-08", endDate: "2027-04-11" }),
      "8 al 11 de abril 2027",
    );
  });

  it("un rango entre dos meses del mismo año", () => {
    assert.equal(
      formatEventDate({ startDate: "2026-12-28", endDate: "2027-01-03" }),
      "28 de diciembre 2026 al 3 de enero 2027",
    );
    assert.equal(
      formatEventDate({ startDate: "2026-11-28", endDate: "2026-12-03" }),
      "28 de noviembre al 3 de diciembre 2026",
    );
  });

  it("escribe el mes en minúscula y sin abreviar", () => {
    assert.equal(
      formatEventDate({ startDate: "2026-01-05", endDate: "2026-01-05" }),
      "5 de enero 2026",
    );
    assert.equal(
      formatEventDate({ startDate: "2026-09-05", endDate: "2026-09-05" }),
      "5 de septiembre 2026",
    );
  });

  it("rechaza un rango al revés", () => {
    assert.throws(
      () => formatEventDate({ startDate: "2026-12-21", endDate: "2026-12-20" }),
      RangeError,
    );
  });
});

describe("FINISHED_FALLBACK", () => {
  it("es el texto exacto que pidió el usuario", () => {
    assert.equal(FINISHED_FALLBACK, "Fechas por confirmar");
  });
});
