/**
 * Lógica de los temazcales publicados: cuáles siguen por delante y cómo se
 * escribe su fecha en la web.
 *
 * Las fechas se guardan como `YYYY-MM-DD` (las escribe el panel con un
 * calendario) y el texto visible se genera aquí, para que no haya dos fuentes
 * de verdad que se puedan contradecir.
 */

import type { TemazcalEvent } from "@/lib/types";

/** Lo que se muestra cuando ya no queda ningún temazcal por delante. */
export const FINISHED_FALLBACK = "Fechas por confirmar";

const MONTHS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

type DateParts = { year: number; month: number; day: number };

export type EventRange = { startDate: string; endDate: string };

/** Día del calendario en Madrid: es la zona horaria del espacio. */
export function todayInMadrid(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

/** Convierte `YYYY-MM-DD` en sus partes, o `null` si no es una fecha real. */
function parseDate(value: string): DateParts | null {
  const match = ISO_DATE.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1) return null;

  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day > daysInMonth) return null;

  return { year, month, day };
}

/** Compara dos fechas ISO; `null` cuando alguna no es válida. */
function compareDates(a: string, b: string): number | null {
  if (!parseDate(a) || !parseDate(b)) return null;
  return a < b ? -1 : a > b ? 1 : 0;
}

function isFinishedOn(endDate: string, today: string): boolean {
  const order = compareDates(endDate, today);
  // Si la fecha guardada no se puede leer, el evento se queda visible: es
  // preferible mostrar una fecha dudosa que esconder contenido en silencio.
  if (order === null) return false;
  return order < 0;
}

/** `true` cuando la fecha final ya pasó: el día final todavía se muestra. */
export function isFinished(event: EventRange, today: string): boolean {
  return isFinishedOn(event.endDate, today);
}

/**
 * Los eventos que aún no han terminado, ordenados por fecha de inicio. Los que
 * no tienen fechas válidas van al final para que no salten de sitio.
 */
export function upcomingEvents(
  events: ReadonlyArray<TemazcalEvent>,
  today: string,
): Array<TemazcalEvent> {
  return events
    .filter((event) => !isFinished(event, today))
    .slice()
    .sort((a, b) => {
      const aValid = parseDate(a.startDate) !== null;
      const bValid = parseDate(b.startDate) !== null;
      if (!aValid || !bValid) {
        if (aValid === bValid) return 0;
        return aValid ? -1 : 1;
      }
      return compareDates(a.startDate, b.startDate) ?? 0;
    });
}

/** Texto visible de la fecha, con el estilo que ya usaba la web. */
export function formatEventDate({ startDate, endDate }: EventRange): string {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  if (!start || !end) {
    throw new RangeError(`Fecha de temazcal no válida: ${startDate} – ${endDate}`);
  }
  if (compareDates(startDate, endDate) === 1) {
    throw new RangeError(`La fecha final es anterior a la inicial: ${startDate} – ${endDate}`);
  }

  const startMonth = MONTHS[start.month - 1];
  const endMonth = MONTHS[end.month - 1];

  if (startDate === endDate) {
    return `${start.day} de ${startMonth} ${start.year}`;
  }

  if (start.year === end.year && start.month === end.month) {
    const joiner = end.day === start.day + 1 ? "y" : "al";
    return `${start.day} ${joiner} ${end.day} de ${startMonth} ${start.year}`;
  }

  if (start.year === end.year) {
    return `${start.day} de ${startMonth} al ${end.day} de ${endMonth} ${start.year}`;
  }

  return `${start.day} de ${startMonth} ${start.year} al ${end.day} de ${endMonth} ${end.year}`;
}
