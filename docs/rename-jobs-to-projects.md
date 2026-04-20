# Plan — Rename Jobs → Projects (UI + rutas)

## Context

Plumbr llama "Job" a la entidad que el mercado de contractors US suele llamar "Project". Cambiar el vocabulario alinea el producto con el lenguaje de los usuarios y diferencia de competencia (JobTread, Jobber) posicionándose más cerca de Procore/Buildertrend.

**Alcance elegido: UI + rutas.** La DB, los tipos TypeScript y los nombres de funciones (`Job`, `getJobs`, columna `jobId`, tabla `jobs`) se quedan como están. Solo cambia lo que el usuario ve: copy, URLs y labels.

**Trade-off consciente:** el código interno quedará bilingüe (variable `job` / URL `project`). Es aceptable porque el costo de renombrar el código completo no justifica el beneficio cuando el alineamiento de marca se logra con el 20% del esfuerzo.

---

## Alcance del cambio

### 1. i18n copy (`messages/*.json`)

- [messages/en.json](../messages/en.json) — 20 ocurrencias de "job"/"Job"/"Jobs"
- [messages/es.json](../messages/es.json) — 14 ocurrencias de "trabajo"/"Trabajo"/"Trabajos" (o el término que se use)

Reemplazos:
- `"Jobs"` → `"Projects"` (nav, page titles)
- `"Job"` → `"Project"` (singular page titles, forms)
- `"job"` → `"project"` (inline copy, descriptions)
- `"Trabajos"` → `"Proyectos"`, `"Trabajo"` → `"Proyecto"`, `"trabajo"` → `"proyecto"`

También la key namespace `"jobs": { ... }` queda igual (es un identificador técnico); solo cambian los values.

### 2. Hardcoded strings en UI

Strings user-facing hardcodeados (no i18n) a localizar vía grep y reemplazar:

- [src/app/[locale]/(dashboard)/dashboard/page.tsx](../src/app/[locale]/(dashboard)/dashboard/page.tsx)
  - `'Create Job'` → `'Create Project'` (línea ~259)
  - `'${n} job${s}'` en alerts (líneas 127, 151) → `'project${s}'`
- Cualquier `aria-label`, `title`, placeholder, empty state, toast o mensaje de error que contenga "job" como palabra inglesa user-facing.

Comando para encontrar todos:
```
git grep -nE "[\"'][^\"']*\\bjobs?\\b[^\"']*[\"']" src/app src/components -- '*.tsx' '*.ts'
```
Filtrar manualmente: variables como `jobId`, identificadores técnicos, comentarios y docstrings NO se tocan. Solo strings que terminan renderizados al usuario.

### 3. Route folders (rename)

- [src/app/[locale]/(dashboard)/jobs/](../src/app/[locale]/(dashboard)/jobs/) → `projects/`
- [src/app/[locale]/(dashboard)/field/[jobId]/](../src/app/[locale]/(dashboard)/field/[jobId]/) → `field/[projectId]/`

Archivos afectados por el rename del route param `[jobId]` → `[projectId]`:
- `page.tsx`: `params.jobId` → `params.projectId`
- `_components/FieldJobClient.tsx`: prop destructuring si lee `jobId` del params

### 4. Links y navegación

Reemplazos de strings de URL hardcodeados:
- `'/jobs'` → `'/projects'`
- `'/jobs/'` → `'/projects/'`
- `/jobs/${id}` → `/projects/${id}`
- `/jobs/new` → `/projects/new`
- `/jobs/${id}/edit` → `/projects/${id}/edit`
- `/field/${jobId}` → `/field/${projectId}` (en los callers)

Comando:
```
git grep -nE "[\"'\`]/jobs" src -- '*.tsx' '*.ts'
git grep -nE "/field/\\\$\\{job" src -- '*.tsx' '*.ts'
```

Archivos conocidos a tocar (no exhaustivo — el grep los revela todos):
- `src/app/[locale]/(dashboard)/dashboard/page.tsx` (hrefs en alerts/insights)
- Cualquier componente de Sidebar/Nav que apunte a `/jobs`
- Cualquier redirect post-submit en `.actions.ts` o forms

### 5. Redirects legacy (backward-compat)

Añadir en [next.config.ts](../next.config.ts):

```ts
async redirects() {
  return [
    { source: '/jobs', destination: '/projects', permanent: true },
    { source: '/jobs/:path*', destination: '/projects/:path*', permanent: true },
    { source: '/:locale(en|es)/jobs', destination: '/:locale/projects', permanent: true },
    { source: '/:locale(en|es)/jobs/:path*', destination: '/:locale/projects/:path*', permanent: true },
  ]
}
```

Preservar bookmarks y links externos (correos enviados a clientes, share tokens de estimates/invoices).

### 6. AI assistant — labels user-facing

En [src/lib/ai/assistant.ts](../src/lib/ai/assistant.ts):
- Línea 328: `get_jobs: 'Looking up your jobs'` → `'Looking up your projects'`
- Líneas 93, 106 (system prompt): referencias a "jobs" en prose user-facing → "projects"
- La tool name `get_jobs` **NO se renombra** (es interno, invisible al usuario)
- Comentarios en [src/lib/ai/tools.ts:10](../src/lib/ai/tools.ts#L10) quedan igual (son docs internos)

### 7. Lo que NO cambia

- Tabla DB `jobs` y columna `jobId` en todas las tablas relacionadas
- Todos los schemas Drizzle (`src/db/schema/jobs.ts`, referencias a `jobs` en otros schemas)
- Tipos `Job`, `JobStatus`, interfaces en [src/lib/adapters/db/types.ts](../src/lib/adapters/db/types.ts)
- Funciones `getJobs`, `getJob`, `createJob`, `updateJob` en [src/lib/actions/jobs.ts](../src/lib/actions/jobs.ts) y stores
- Archivos `src/lib/store/jobs.ts`, `src/lib/jobs-date-filter.ts`, `src/components/jobs/JobStatusBadge.tsx`
- Herramienta AI `get_jobs` (nombre interno)
- Límite Stripe `jobs: 5` en [src/lib/stripe.ts](../src/lib/stripe.ts)
- Migraciones Drizzle existentes (histórico, inmutables)
- Seed data en [src/lib/actions/dev-tools.ts](../src/lib/actions/dev-tools.ts) — los nombres de variables (`cooperJob`, `mendozaActive`) son internos; los bodies de notificaciones están en español y no usan "job" literal

---

## Archivos críticos a tocar

| Archivo | Tipo de cambio |
|---------|----------------|
| [messages/en.json](../messages/en.json) | Values con "Job"/"Jobs" → "Project"/"Projects" |
| [messages/es.json](../messages/es.json) | Values con "Trabajo"/"Trabajos" → "Proyecto"/"Proyectos" |
| [next.config.ts](../next.config.ts) | Añadir `async redirects()` con reglas legacy |
| [src/app/[locale]/(dashboard)/jobs/](../src/app/[locale]/(dashboard)/jobs/) | Rename carpeta → `projects/` |
| [src/app/[locale]/(dashboard)/field/[jobId]/](../src/app/[locale]/(dashboard)/field/[jobId]/) | Rename carpeta → `field/[projectId]/` + destructuring |
| [src/app/[locale]/(dashboard)/dashboard/page.tsx](../src/app/[locale]/(dashboard)/dashboard/page.tsx) | Hardcoded 'Create Job', 'N jobs', hrefs `/jobs` |
| [src/lib/ai/assistant.ts](../src/lib/ai/assistant.ts) | Labels y system prompt (user-facing) |
| Cualquier archivo con `href="/jobs..."` hardcodeado | Reemplazo de string |
| Componentes de Sidebar/Nav | Label y href del item "Jobs" |

---

## Secuencia de ejecución

Orden importa para minimizar rotura intermedia:

1. **Copy first** — cambiar `messages/en.json` y `messages/es.json`. App sigue funcionando; solo cambia el texto.
2. **Hardcoded strings UI** — barrer tsx/ts files con grep, actualizar strings user-facing.
3. **Rename folder `jobs/` → `projects/`** — un solo commit. Dentro del mismo commit actualizar todos los hrefs `/jobs` → `/projects`. La app dejará de funcionar hasta que el commit esté completo, por eso va atómico.
4. **Rename folder `field/[jobId]/` → `field/[projectId]/`** — ídem, atómico. Incluir el cambio de `params.jobId` → `params.projectId` en `page.tsx` del route.
5. **Añadir redirects en `next.config.ts`** — último, para que bookmarks viejos sigan funcionando después del deploy.
6. **AI assistant labels** — cambio aislado.

Cada paso es un commit separado. Permite hacer rollback granular si algo rompe.

---

## Verificación

1. **Typecheck**: `pnpm tsc --noEmit` en verde tras cada paso.
2. **Build**: `pnpm build` compila sin warnings nuevos.
3. **Manual smoke test** (dev server `pnpm dev`):
   - Nav sidebar muestra "Projects" (no "Jobs") en en/es
   - Click en "Projects" → URL `/en/projects`, lista carga
   - Click en un item → URL `/en/projects/{id}`, detail carga
   - Botón "Create Project" → URL `/en/projects/new`, form carga
   - Field route: `/en/field/{projectId}` carga correctamente
   - Dashboard alerts mencionan "project" no "job"
   - AI assistant dice "Looking up your projects"
4. **Legacy redirect test**:
   - Navegar manualmente a `/en/jobs` → redirige a `/en/projects` (status 308)
   - `/en/jobs/abc-123` → `/en/projects/abc-123`
   - `/es/jobs` → `/es/projects`
5. **i18n test**: cambiar locale a español, verificar "Proyectos" en nav.
6. **Pre-commit hooks**: ESLint + Prettier pasan.

## Rollback plan

Si algo rompe post-deploy:
- Los renames de carpeta revertibles vía `git revert` del commit específico.
- Los redirects de `next.config.ts` removibles en otro commit.
- La DB no se tocó → cero riesgo de datos inconsistentes.
- Emails/links externos que apunten a `/jobs/{id}` seguirán funcionando porque el redirect permanente está activo.

## Referencias reutilizadas

- Memoria `feedback_design_system_tokens.md` — principios de cambio UI preserving tokens
- [src/middleware.ts](../src/middleware.ts) — patrón de locale routing (no se toca pero relevante para los redirects)
- Convención Mr Labs "Aislamiento de cliente": este es cambio de producto Plumbr, no contamina standards
