import type { DirectionKey, Fechas, TemazcalEvent } from "@/lib/types";

/**
 * Validación del formulario del panel de /admin. Es estricta a propósito:
 * solo se aceptan los campos editables, con longitudes acotadas, y todo lo
 * demás se rechaza con un mensaje que la clienta pueda entender.
 */

export const MAX_TEXT_LENGTH = 80;
export const MAX_TITLE_LENGTH = 120;
export const MAX_DESCRIPTION_LENGTH = 300;
export const MAX_EVENTS = 10;

const DIRECTION_KEYS: Array<DirectionKey> = ["sur", "oeste", "norte", "este"];
const PAYLOAD_KEYS = ["directions", "temazcalEvents", "maestria"];
const EVENT_KEYS = ["id", "startDate", "endDate", "title", "description"];

/** Identificador estable de un temazcal: minúsculas, números y guiones. */
const ID_PATTERN = /^[a-z0-9][a-z0-9-]{2,39}$/;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export type FechasPayload = {
  directions: Record<DirectionKey, string>;
  temazcalEvents: Array<TemazcalEvent>;
  maestria: string;
};

export type ParseResult =
  | { ok: true; value: FechasPayload }
  | { ok: false; error: string };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: Array<string>): boolean {
  return Object.keys(value).every((key) => allowed.includes(key));
}

/**
 * Normaliza un texto editable: recorta espacios y valida longitud y
 * caracteres. Las fechas pueden quedar vacías (se renderizan en blanco).
 * En la descripción los saltos de línea se convierten en espacios porque la
 * web pinta un solo párrafo.
 */
function parseText(
  value: unknown,
  options: {
    label: string;
    maxLength: number;
    required: boolean;
    collapseNewlines?: boolean;
  },
): { ok: true; value: string } | { ok: false; error: string } {
  if (typeof value !== "string") {
    return { ok: false, error: `${options.label}: se esperaba texto.` };
  }
  const text = options.collapseNewlines
    ? value.replace(/\s+/g, " ").trim()
    : value.trim();
  if (options.required && text.length === 0) {
    return { ok: false, error: `${options.label}: no puede quedar vacío.` };
  }
  if (text.length > options.maxLength) {
    return {
      ok: false,
      error: `${options.label}: no puede superar los ${options.maxLength} caracteres.`,
    };
  }
  if (/[\u0000-\u001f\u007f<>]/.test(text)) {
    return {
      ok: false,
      error: `${options.label}: no admite saltos de línea ni los caracteres < o >.`,
    };
  }
  return { ok: true, value: text };
}

/** Acepta solo fechas reales en formato `YYYY-MM-DD`. */
function parseIsoDate(
  value: unknown,
  label: string,
): { ok: true; value: string } | { ok: false; error: string } {
  const invalid = { ok: false as const, error: `${label} no es válida.` };
  if (typeof value !== "string") return invalid;

  const text = value.trim();
  const match = ISO_DATE.exec(text);
  if (!match) return invalid;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1) return invalid;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day > daysInMonth) return invalid;

  return { ok: true, value: text };
}

/** Valida el cuerpo JSON que envía el panel. */
export function parseFechasPayload(input: unknown): ParseResult {
  if (!isPlainObject(input)) {
    return { ok: false, error: "Los datos enviados no son válidos." };
  }
  if (!hasOnlyKeys(input, PAYLOAD_KEYS)) {
    return { ok: false, error: "Los datos enviados contienen campos desconocidos." };
  }

  const directionsInput = input.directions;
  if (!isPlainObject(directionsInput) || !hasOnlyKeys(directionsInput, DIRECTION_KEYS)) {
    return { ok: false, error: "Las fechas de las direcciones no son válidas." };
  }
  if (DIRECTION_KEYS.some((key) => directionsInput[key] === undefined)) {
    return { ok: false, error: "Faltan las fechas de alguna dirección." };
  }

  const directions = {} as Record<DirectionKey, string>;
  for (const key of DIRECTION_KEYS) {
    const parsed = parseText(directionsInput[key], {
      label: `La dirección ${key}`,
      maxLength: MAX_TEXT_LENGTH,
      required: false,
    });
    if (!parsed.ok) return parsed;
    directions[key] = parsed.value;
  }

  const eventsInput = input.temazcalEvents;
  if (!Array.isArray(eventsInput)) {
    return { ok: false, error: "Faltan las fechas del temazcal." };
  }
  if (eventsInput.length > MAX_EVENTS) {
    return {
      ok: false,
      error: `No se pueden programar más de ${MAX_EVENTS} temazcales.`,
    };
  }

  const temazcalEvents: Array<TemazcalEvent> = [];
  const seenIds = new Set<string>();

  for (const [index, event] of eventsInput.entries()) {
    const position = index + 1;
    if (!isPlainObject(event) || !hasOnlyKeys(event, EVENT_KEYS)) {
      return { ok: false, error: `El temazcal número ${position} no es válido.` };
    }

    if (typeof event.id !== "string" || !ID_PATTERN.test(event.id)) {
      return {
        ok: false,
        error: `El identificador del temazcal número ${position} no es válido.`,
      };
    }
    if (seenIds.has(event.id)) {
      return { ok: false, error: "Hay dos temazcales con el mismo identificador." };
    }
    seenIds.add(event.id);

    const startDate = parseIsoDate(event.startDate, `La fecha de inicio del temazcal número ${position}`);
    if (!startDate.ok) return startDate;

    const endDate = parseIsoDate(event.endDate, `La fecha final del temazcal número ${position}`);
    if (!endDate.ok) return endDate;

    if (endDate.value < startDate.value) {
      return {
        ok: false,
        error: `La fecha final del temazcal número ${position} no puede ser anterior a la de inicio.`,
      };
    }

    const title = parseText(event.title, {
      label: `El título del temazcal número ${position}`,
      maxLength: MAX_TITLE_LENGTH,
      required: true,
    });
    if (!title.ok) return title;

    const description = parseText(event.description, {
      label: `La descripción del temazcal número ${position}`,
      maxLength: MAX_DESCRIPTION_LENGTH,
      required: false,
      collapseNewlines: true,
    });
    if (!description.ok) return description;

    temazcalEvents.push({
      id: event.id,
      startDate: startDate.value,
      endDate: endDate.value,
      title: title.value,
      description: description.value,
    });
  }

  const maestria = parseText(input.maestria, {
    label: "La fecha de la maestría",
    maxLength: MAX_TEXT_LENGTH,
    required: false,
  });
  if (!maestria.ok) return maestria;

  return {
    ok: true,
    value: { directions, temazcalEvents, maestria: maestria.value },
  };
}

/**
 * Contenido del fichero de fechas a partir del formulario. Ya no hay campos
 * que el panel no edite, así que no se hereda nada del fichero anterior: lo
 * que se ve en el panel es exactamente lo que se guarda.
 *
 * Los temazcales se guardan ordenados por fecha de inicio.
 */
export function mergeFechas(payload: FechasPayload): Fechas {
  const temazcalEvents = payload.temazcalEvents
    .map((event) => ({ ...event }))
    .sort((a, b) => (a.startDate < b.startDate ? -1 : a.startDate > b.startDate ? 1 : 0));

  return {
    directions: payload.directions,
    temazcalEvents,
    maestria: payload.maestria,
  };
}

/**
 * Proyecta el contenido guardado a la forma editable que consume el panel.
 */
export function toPayload(current: unknown): FechasPayload {
  const stored = isPlainObject(current) ? current : {};
  const storedDirections = isPlainObject(stored.directions) ? stored.directions : {};
  const storedEvents = Array.isArray(stored.temazcalEvents) ? stored.temazcalEvents : [];

  const directions = {} as Record<DirectionKey, string>;
  for (const key of DIRECTION_KEYS) {
    const value = storedDirections[key];
    directions[key] = typeof value === "string" ? value : "";
  }

  const text = (event: unknown, key: string) =>
    isPlainObject(event) && typeof event[key] === "string" ? (event[key] as string) : "";

  return {
    directions,
    temazcalEvents: storedEvents.map((event) => ({
      id: text(event, "id"),
      startDate: text(event, "startDate"),
      endDate: text(event, "endDate"),
      title: text(event, "title"),
      description: text(event, "description"),
    })),
    maestria: typeof stored.maestria === "string" ? stored.maestria : "",
  };
}

/** Serializa el fichero de fechas con el formato que ya usa el repositorio. */
export function serializeFechas(fechas: Fechas): string {
  return `${JSON.stringify(fechas, null, 2)}\n`;
}
