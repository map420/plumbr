# Plan — Deploy to Production (Plumbr → workpilot.mrlabs.io)

## Context

Llevamos semanas de trabajo acumulado local sin push a producción. Necesitamos subir todo con mínimo riesgo de outage y preservando bookmarks de clientes (URLs `/jobs/*` → `/projects/*`).

**Estado actual del repo `plumbr/` (branch `master`):**

- **39 commits** ya committeados localmente pero sin pushear (shopping-list rewrite, expense filters, layout fixes, DB retry para Supabase pooler, etc.)
- **162 archivos modificados sin committear** — combinación de:
  - Rename Jobs → Projects + fix NotificationBell dark theme (esta sesión, verificado con `pnpm tsc --noEmit` y `pnpm build`)
  - Cambios pre-sesión del usuario: adaptador Stripe, payments mock, db adapter, layout, sign-in page, etc.
- **1 migración Drizzle pendiente** en los commits: `manual_0012_shopping_list_vendor.sql` (agrega `vendor` + `aisle` a `shopping_list_items`)
- Hotfix reciente: retry de `users.findById` contra Supabase pooler (commit `1d84286`)

**Target de producción:**
- Proyecto Vercel: `plumbr` (team `Vj1Y3r2Zz4dpzaHv3SB4vcsK`, prj `Den0Ng7XwBDN1fM2xHzngZD5TViZ`)
- Auto-deploy en push a `master` (Vercel GitHub integration)
- URL canónica: `workpilot.mrlabs.io` (redirect desde `plumbr.mrlabs.io` configurado en `vercel.json`)
- DB: Supabase PostgreSQL (migraciones manuales vía SQL editor, NO auto-applied)
- Cron: Vercel Cron daily 08:00 UTC

---

## Secuencia de ejecución

Orden importa. Cada paso es auditable y revertible.

### Paso 1 — Commit atómico del rename Jobs → Projects

Los cambios del rename se consolidan en **1 commit bundled** (no 6 separados) porque ya están todos juntos en el working tree y un solo commit con mensaje claro mantiene trazabilidad sin fragmentar.

Archivos del rename (detectable por grep `projects|Project` en el diff):
- `messages/en.json`, `messages/es.json`
- `next.config.ts` (redirects 308)
- `src/app/[locale]/(dashboard)/projects/**` (folder renombrada)
- `src/app/[locale]/(dashboard)/field/[projectId]/**` (folder renombrada)
- Todos los `Link href` y `router.push` actualizados de `/jobs/` → `/projects/`
- Copy user-facing en dashboard/marketing/features/assistant
- `src/lib/ai/assistant.ts` (AI labels + system prompt)
- `src/lib/actions/jobs.ts` (revalidatePath paths)
- Fix NotificationBell dark theme (`--wp-primary` → `--wp-accent`)

Mensaje de commit:
```
feat(ux): rename Jobs → Projects across UI + routes + fix dark theme icons

- i18n: Jobs/Trabajos → Projects/Proyectos in en.json + es.json (34 values)
- Routes: /jobs → /projects, /field/[jobId] → /field/[projectId]
- 308 redirects in next.config.ts preserve legacy bookmarks (/jobs/*, /en/jobs/*, /es/jobs/*)
- AI assistant: user-facing language updated; get_jobs tool name kept for compat
- Dark theme: NotificationBell icon now uses --wp-accent (was invisible with --wp-primary = surface)

DB, types (Job, JobStatus), functions (getJobs, updateJob), and `jobs` table unchanged.
Plan: docs/rename-jobs-to-projects.md
```

### Paso 2 — Commit del trabajo pre-sesión

Los cambios pre-sesión (payments adapter, DB types, layout, sign-in) son del usuario, no míos. No los conozco en detalle. Antes de committear hay que:

1. Abrir `git diff -- src/lib/adapters/payments/ src/lib/adapters/db/ src/app/[locale]/(auth) src/app/[locale]/(dashboard)/layout.tsx src/app/[locale]/(dashboard)/error.tsx` y confirmar que son cambios que SÍ querés llevar a prod.
2. Si algo es WIP (work in progress) y no debe shippearse, stash o revert esos archivos antes del commit.
3. Para los cambios que van, usar un commit (o varios pequeños) con mensajes descriptivos según el área:
   - `feat(payments): <descripción concreta>`
   - `feat(db): <descripción concreta>`
   - `chore(layout): <descripción>`

**No ejecuto este paso de corrido** — lo hacemos juntos, archivo por archivo, para decidir qué va y qué no.

### Paso 3 — Validación local (pre-push)

```bash
cd c:/Users/Moises/Documents/plumbr
rm -rf .next              # limpia cache stale
pnpm tsc --noEmit         # verifica tipos (ya pasó antes del rename)
pnpm build                # build completo (ya pasó antes — rutas /projects y /field/[projectId] registradas)
```

Si ambos son verdes, continuamos. Si `pnpm build` falla, abortar y diagnosticar.

### Paso 4 — Push a origin/master

```bash
git push origin master
```

Esto empuja los 39 commits existentes + los 1-2 nuevos. Vercel detecta el push y arranca deploy automáticamente.

Vercel URL del deploy: `https://vercel.com/<team>/plumbr/deployments` — ahí se sigue en tiempo real.

### Paso 5 — Ejecutar migración Drizzle pendiente en Supabase

**Antes** de que el nuevo código pegue la DB, hay que aplicar `manual_0012_shopping_list_vendor.sql`:

```sql
-- drizzle/manual_0012_shopping_list_vendor.sql
ALTER TABLE "shopping_list_items" ADD COLUMN IF NOT EXISTS "vendor" varchar(120);
ALTER TABLE "shopping_list_items" ADD COLUMN IF NOT EXISTS "aisle" varchar(50);
CREATE INDEX IF NOT EXISTS "shopping_list_items_vendor_idx" ON "shopping_list_items" ("vendor");
```

**Dónde:** Supabase dashboard → SQL Editor → pegar y Run.
**Cuándo:** idealmente ANTES del deploy, pero como el SQL usa `IF NOT EXISTS` es idempotente — si corre después del deploy funciona igual.
**Quién:** tú (requiere credenciales Supabase que no tengo).

Verificación en Supabase SQL Editor después:
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'shopping_list_items' AND column_name IN ('vendor', 'aisle');
```
Debe devolver las 2 filas.

### Paso 6 — Monitoreo del deploy en Vercel

Mientras Vercel builda (~3-5 min típico en este proyecto):
- Watch `vercel logs --follow` o el dashboard
- Buscar errores de build (falla de tipos no vista localmente, env var faltante, import broken)
- Si Build falla → Vercel mantiene el deploy anterior, cero downtime

Cuando Vercel reporte "Ready":
```bash
curl -I https://workpilot.mrlabs.io/en/projects
# Esperado: HTTP/2 307 (redirige a /sign-in si no estás autenticado — eso es correcto)

curl -I https://workpilot.mrlabs.io/en/jobs
# Esperado: HTTP/2 308 Permanent Redirect → /en/projects
# Este es el test crítico de los redirects legacy.
```

### Paso 7 — Smoke test post-deploy

Login real con una cuenta de prueba, verificar:

1. **Nav**: sidebar muestra "Projects" (no "Jobs")
2. **Lista**: `/en/projects` carga con datos reales
3. **Detail**: click a un project → `/en/projects/{id}` carga
4. **Create**: botón "+ New Project" → `/en/projects/new` carga formulario
5. **Edit**: editar un project → save → redirect a detail
6. **Bookmark legacy**: navegar manualmente a `/en/jobs` → debe redirigir a `/en/projects` (308)
7. **Bookmark legacy con ID**: `/en/jobs/{id-real}` → `/en/projects/{id-real}` (308)
8. **Field route**: `/en/field/{id-real}` carga vista de campo
9. **i18n switch**: cambiar a ES → label "Proyectos" / "Nuevo Proyecto"
10. **AI assistant**: preguntar "what are my projects this week" → debe responder usando "project" (no "job")
11. **NotificationBell dark theme**: abrir en dark mode → íconos de notificación ya se ven (amber sobre fondo oscuro)
12. **Shopping list vendor field** (si la migración ya corrió): crear una lista → agregar item con vendor — debe persistir

---

## Riesgos identificados

| Riesgo | Mitigación |
|--------|------------|
| Build de Vercel falla por diferencia de Node/pnpm vs local | Ya funciona local en Node v24; Vercel usa Node 22 por defecto. `package.json` no pinea engines — bajo riesgo. |
| Env var faltante en Vercel que el nuevo código necesita | Los commits recientes no introducen nuevas env vars. `.env.example` solo lista Clerk (ya seteado). Bajo riesgo. |
| Migración Drizzle 0012 no aplicada → código nuevo falla al leer `vendor` | SQL con `IF NOT EXISTS` es idempotente. Si falla, Drizzle query devuelve null para columnas inexistentes (no explota). |
| Usuarios activos durante el swap ven error 500 durante 5-10s | Inherente a Next.js + Vercel. No se puede evitar. Hacer el deploy fuera de hora pico (ya es tarde noche PE). |
| Redirects 308 fallan si el regex de locale no matchea | Tested localmente. Si falla, el usuario ve 404 en `/en/jobs` — grave pero reparable en <1min cambiando `next.config.ts`. |
| Algún Link hardcodeado `/jobs` que no detecté → navegación rota en app | Grepé a fondo, cero resultados. Si aparece algo, 308 redirect lo salva. |
| Commit "bundled" del Paso 2 mezcla cambios no relacionados → hard to revert | Por eso el Paso 2 se hace con `git add -p` o archivo-por-archivo, no `git add .`. |

---

## Rollback

Si algo rompe post-deploy:

1. **Rollback instantáneo sin redeploy**: Vercel → Deployments → click en el deployment anterior (el que funcionaba) → "Promote to Production". Tarda ~30 segundos.
2. **Rollback de migración** (si aplicamos 0012 y el nuevo código lo necesita pero falla):
   ```sql
   ALTER TABLE "shopping_list_items" DROP COLUMN IF EXISTS "vendor";
   ALTER TABLE "shopping_list_items" DROP COLUMN IF EXISTS "aisle";
   DROP INDEX IF EXISTS "shopping_list_items_vendor_idx";
   ```
   Pero **esto borra datos** si ya se ingresaron vendors. Solo ejecutar si el deploy está caído Y necesitamos revertir TODO.
3. **Rollback en git**: `git reset --hard bba00bc` (último commit antes de mi sesión) + `git push --force-with-lease origin master`. **Destructivo** — último recurso.

---

## Archivos críticos a tocar (resumen)

| Archivo / área | Acción |
|----------------|--------|
| 162 archivos con `git status -M/-D` | Commit (Paso 1 + Paso 2) |
| [next.config.ts](c:/Users/Moises/Documents/plumbr/next.config.ts) | Ya modificado (redirects 308) — commit |
| [messages/en.json](c:/Users/Moises/Documents/plumbr/messages/en.json), [messages/es.json](c:/Users/Moises/Documents/plumbr/messages/es.json) | Commit |
| [drizzle/manual_0012_shopping_list_vendor.sql](c:/Users/Moises/Documents/plumbr/drizzle/manual_0012_shopping_list_vendor.sql) | Ejecutar en Supabase SQL editor (Paso 5) |
| Supabase prod | Correr migración 0012 |
| Vercel dashboard | Watch deploy logs (Paso 6) |

## Referencias

- Plan del rename: [docs/rename-jobs-to-projects.md](c:/Users/Moises/Documents/plumbr/docs/rename-jobs-to-projects.md)
- Memoria Mr Labs `feedback_vercel_deploy.md`: bloqueos comunes en deploys Vercel (email git config, CVE Next.js, CSS @import, middleware→proxy) — proxy.ts ya aplicado en este repo, no bloqueo.
- Vercel project config: [.vercel/project.json](c:/Users/Moises/Documents/plumbr/.vercel/project.json)
- Redirect dominio: [vercel.json](c:/Users/Moises/Documents/plumbr/vercel.json) (`plumbr.mrlabs.io` → `workpilot.mrlabs.io`)
