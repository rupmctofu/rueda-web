/**
 * Reconstruye el sitio una vez al día.
 *
 * El panel ya deja la web al día cuando se guarda un cambio, pero un temazcal
 * también "caduca" solo con el paso del tiempo: el día después de su último
 * día tiene que desaparecer del HTML. Esta función programada dispara el build
 * hook de Netlify para que el sitio se regenere sin que nadie entre al panel.
 *
 * La URL del build hook vive en `BUILD_HOOK_URL` (variable secreta de Netlify).
 */

export const config = {
  // Todos los días a las 04:00 UTC (05:00 o 06:00 en Madrid, según la época).
  schedule: "0 4 * * *",
};

export default async () => {
  const hook = process.env.BUILD_HOOK_URL;
  if (!hook) {
    console.error("[rebuild-diario] falta la variable BUILD_HOOK_URL");
    return new Response("Falta la variable BUILD_HOOK_URL", { status: 500 });
  }

  const respuesta = await fetch(hook, { method: "POST" });
  const cuerpo = await respuesta.text();

  console.log(`[rebuild-diario] build hook: ${respuesta.status} ${cuerpo.slice(0, 200)}`);

  return new Response(`Build hook: ${respuesta.status}`, { status: respuesta.ok ? 200 : 502 });
};
