# Panel de fechas (`/admin`)

Página protegida por contraseña para que la clienta cambie las fechas de las
direcciones, del temazcal y de la maestría sin tocar el repositorio.

## Cómo funciona

1. La clienta entra en `https://www.espailakalmashamanic.com/admin/` y escribe
   la contraseña.
2. Edita las fechas y pulsa **Guardar cambios**.
3. El servidor valida los datos y hace un commit de `src/data/fechas.json` en
   la rama `master` mediante la API de GitHub.
4. Netlify detecta el commit y redespliega: la web nueva tarda un par de
   minutos en estar publicada.

No hay base de datos ni estado paralelo: la fuente de verdad es el propio
repositorio, y el panel solo escribe ese único fichero.

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
