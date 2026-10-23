import type { DirectionKey, Fechas, TemazcalEvent } from "@/lib/types";

/**
 * Validación del formulario del panel de /admin. Es estricta a propósito:
 * solo se aceptan los campos editables, con longitudes acotadas, y todo lo
 * demás se rechaza con un mensaje que la clienta pueda entender.
 */

export const MAX_TEXT_LENGTH = 80;
export const MAX_TITLE_LENGTH = 120;
export const MAX_EVENTS = 10;

const DIRECTION_KEYS: Array<DirectionKey> = ["sur", "oeste", "norte", "este"];
const PAYLOAD_KEYS = ["directions", "temazcalEvents", "maestria"];
const EVENT_KEYS = ["date", "title"];

export type FechasPayload = {
  directions: Record<DirectionKey, string>;
  temazcalEvents: Array<{ date: string; title: string }>;
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
 */
function parseText(
  value: unknown,
  options: { label: string; maxLength: number; required: boolean },
): { ok: true; value: string } | { ok: false; error: string } {
  if (typeof value !== "string") {
    return { ok: false, error: `${options.label}: se esperaba texto.` };
  }
  const text = value.trim();
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
    return { ok: false, error: `El temazcal no puede tener más de ${MAX_EVENTS} fechas.` };
  }

  const temazcalEvents: Array<{ date: string; title: string }> = [];
  for (const [index, event] of eventsInput.entries()) {
    if (!isPlainObject(event) || !hasOnlyKeys(event, EVENT_KEYS)) {
      return { ok: false, error: `El temazcal número ${index + 1} no es válido.` };
    }
    const date = parseText(event.date, {
      label: `La fecha del temazcal número ${index + 1}`,
      maxLength: MAX_TEXT_LENGTH,
      required: false,
    });
    if (!date.ok) return date;
    const title = parseText(event.title, {
      label: `El título del temazcal número ${index + 1}`,
      maxLength: MAX_TITLE_LENGTH,
      required: true,
    });
    if (!title.ok) return title;
    temazcalEvents.push({ date: date.value, title: title.value });
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
 * Aplica el formulario sobre el contenido actual del fichero de fechas,
 * conservando los campos que el panel no edita (la descripción de cada
 * temazcal). Devuelve un objeto nuevo, listo para serializar.
 */
export function mergeFechas(current: unknown, payload: FechasPayload): Fechas {
  const stored = isPlainObject(current) ? current : {};
  const storedEvents = Array.isArray(stored.temazcalEvents) ? stored.temazcalEvents : [];

  const temazcalEvents: Array<TemazcalEvent> = payload.temazcalEvents.map((event, index) => {
    const previous = storedEvents[index];
    const description =
      isPlainObject(previous) && typeof previous.description === "string"
        ? previous.description
        : "";
    return { date: event.date, title: event.title, description };
  });

  return {
    directions: payload.directions,
    temazcalEvents,
    maestria: payload.maestria,
  };
}

/**
 * Proyecta el contenido guardado a la forma editable que consume el panel:
 * solo los campos que la clienta puede cambiar.
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

  return {
    directions,
    temazcalEvents: storedEvents.map((event) => ({
      date: isPlainObject(event) && typeof event.date === "string" ? event.date : "",
      title: isPlainObject(event) && typeof event.title === "string" ? event.title : "",
    })),
    maestria: typeof stored.maestria === "string" ? stored.maestria : "",
  };
}

/** Serializa el fichero de fechas con el formato que ya usa el repositorio. */
export function serializeFechas(fechas: Fechas): string {
  return `${JSON.stringify(fechas, null, 2)}\n`;
}
