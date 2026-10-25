# Panel de fechas (`/admin`)

Página protegida por contraseña para que la clienta cambie las fechas de las
direcciones, del temazcal y de la maestría sin tocar el repositorio, y para que
gestione la lista de temazcales (título, descripción y fechas).

## Cómo funciona

1. La clienta entra en `https://www.espailakalmashamanic.com/admin/` y escribe
   la contraseña.
2. Edita las fechas, añade o quita temazcales y pulsa **Guardar cambios**.
3. El servidor valida los datos y hace un commit de `src/data/fechas.json` en
   la rama `master` mediante la API de GitHub.
4. Netlify detecta el commit y redespliega: la web nueva tarda un par de
   minutos en estar publicada.

No hay base de datos ni estado paralelo: la fuente de verdad es el propio
repositorio, y el panel solo escribe ese único fichero.

## Temazcales

Cada temazcal del fichero tiene cinco campos:

```json
{
  "id": "temazcal-9f2c1a",
  "startDate": "2026-10-24",
  "endDate": "2026-10-25",
  "title": "TEMAZCAL MIXTO",
  "description": ""
}
```

- **`id`** es un identificador estable que pone el panel. No depende del título
  ni de la posición, así que renombrar o reordenar no rompe nada.
- **`startDate` y `endDate`** son fechas ISO que se eligen con un calendario.
  La fecha final no puede ser anterior a la inicial; para un temazcal de un
  solo día se repite la misma fecha en las dos.
- **El texto que se lee en la web se genera solo** (`src/lib/temazcal-events.ts`),
  con el estilo que ya usaba el sitio: `20 de diciembre 2026`,
  `24 y 25 de octubre 2026`, `8 al 11 de abril 2027`,
  `28 de diciembre 2026 al 3 de enero 2027`.

No hay campo de hora: si un temazcal empieza a una hora concreta, se escribe en
la descripción.

### Caducidad

Un temazcal sigue visible **todo su último día** y desaparece a partir del día
siguiente. El filtro se aplica al construir el sitio
(`SectionTemazcal.astro` usa `upcomingEvents`), así que el HTML publicado nunca
contiene temazcales terminados y la web sigue siendo estática, sin JavaScript
de por medio.

Como el sitio es estático, la desaparición necesita un build nuevo. Hay dos
caminos y los dos están activos:

1. **Al guardar** desde el panel, el commit provoca el redespliegue.
2. **Cada día**, la función programada `netlify/functions/rebuild-diario.mjs`
   dispara el build hook de Netlify, así que un temazcal caduca solo aunque
   nadie abra el panel.

Si no queda ningún temazcal por delante, la sección muestra
`Fechas por confirmar`.

### Reconstrucción diaria

| Pieza | Valor |
| --- | --- |
| Función | `netlify/functions/rebuild-diario.mjs` |
| Horario | `0 4 * * *` (04:00 UTC, 05:00 o 06:00 en Madrid según la época) |
| Build hook | `Rebuild diario (temazcales caducados)`, rama `master` |
| Variable | `BUILD_HOOK_URL` con la URL del build hook |
| Configuración | `netlify.toml` declara `[functions] directory = "netlify/functions"` |

`netlify.toml` no es opcional: sin él, Netlify solo empaqueta
`.netlify/functions-internal` (las funciones que genera el adaptador de Astro) y
la función programada no llega al despliegue. Con la sección `[functions]`
conviven las dos: el panel sigue respondiendo y el cron aparece en
`function_schedules` del deploy.

Para cambiar la hora, edita `config.schedule` y vuelve a desplegar.

Para comprobar que está registrada, mira el objeto del deploy (`function_schedules`)
o **Netlify → Functions**, y al día siguiente busca en **Deploys** el deploy con
origen `build_hook`.

Invocarla a mano con `curl` devuelve `403` (las funciones programadas solo
aceptan al planificador de Netlify). Para probar el build hook sin esperar:

```sh
curl -X POST "$BUILD_HOOK_URL"
```

La URL del build hook es un secreto: cualquiera que la tenga puede lanzar
builds. Vive en `BUILD_HOOK_URL` (variable secreta) y no se escribe en el
repositorio. Si se filtra, se borra el hook en Netlify, se crea otro y se
actualiza la variable.

## Por qué las fechas están en un JSON

Las fechas viven en `src/data/fechas.json` y el resto del contenido sigue en
sus módulos (`directions.ts`, `temazcal.ts`, `maestria.ts`). Es la única forma
de que el panel edite un dato sin reescribir código TypeScript.

## Variables de entorno

Se configuran en **Netlify → Site settings → Environment variables** (y en un
`.env` local, que está en `.gitignore`, para `npm run dev`).

| Variable | Obligatoria | Contenido |
| --- | --- | --- |
| `ADMIN_PASSWORD` | sí | Contraseña única de la clienta. Mínimo 12 caracteres; recomendado 24 o más. |
| `ADMIN_SESSION_SECRET` | sí | Secreto para firmar la cookie de sesión. Mínimo 32 caracteres aleatorios. |
| `GITHUB_TOKEN` | sí | Token con permiso de escritura de contenidos en el repositorio. |
| `GITHUB_REPO` | no | Por defecto `rupmctofu/rueda-web`. |
| `GITHUB_BRANCH` | no | Por defecto `master`. |
| `BUILD_HOOK_URL` | sí, para la reconstrucción diaria | URL del build hook de Netlify que dispara el build de madrugada. |

Generar el secreto de sesión:

```sh
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Crear el token de GitHub:

1. GitHub → Settings → Developer settings → Personal access tokens →
   **Fine-grained tokens** → Generate new token.
2. Repository access: solo `rupmctofu/rueda-web`.
3. Repository permissions → **Contents: Read and write**.
4. Copiar el token en la variable `GITHUB_TOKEN` de Netlify.

Si falta alguna variable, el panel responde con
«El panel no está configurado» y el detalle se escribe en los logs de la
función, no en el navegador.

## Seguridad

- La contraseña se compara en tiempo constante; nunca se guarda ni se registra.
- La sesión es una cookie `HttpOnly`, `Secure`, `SameSite=Strict`, firmada con
  HMAC-SHA256 y con caducidad de 2 horas.
- Los endpoints rechazan peticiones de otro origen (`Origin` distinto) y exigen
  `Content-Type: application/json`.
- Un intento fallido de contraseña espera 500 ms. No hay limitación de intentos
  distribuida: por eso la contraseña debe ser larga y aleatoria.
- La página lleva `noindex, nofollow` y `robots.txt` excluye `/admin/`.

## Cambiar la contraseña o revocar el acceso

1. Cambiar `ADMIN_PASSWORD` en Netlify y volver a desplegar.
2. Opcional: cambiar `ADMIN_SESSION_SECRET` para invalidar todas las sesiones
   abiertas de golpe.
3. Si se sospecha del token, revocarlo en GitHub y generar otro.

## Desarrollo local

```sh
npm run dev
# abrir http://localhost:4321/admin/index.html
```

El servidor de desarrollo de Astro no sirve `index.html` para la ruta de una
carpeta, así que hay que entrar con `/admin/index.html`.
