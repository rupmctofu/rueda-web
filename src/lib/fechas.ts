import data from "@/data/fechas.json";
import type { Fechas } from "@/lib/types";

/**
 * Fechas de la landing. Viven en `src/data/fechas.json` porque el panel de
 * /admin las edita y las guarda como commit en el repositorio; el resto del
 * contenido sigue en sus módulos de siempre.
 */
export const fechas: Fechas = data as Fechas;
