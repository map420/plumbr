# plumbr v2 — Estrategia de commits

Tu repo tiene **180 archivos modificados** y varios untracked. Mezcla cambios míos (rediseño v2) + cambios tuyos previos. Esta guía separa mis cambios en **commits atómicos por fase** para tener un historial limpio y poder revertir si algo sale mal.

## ⚠️ Antes de empezar

Revisa primero lo que YA tenías sin commitear de tu trabajo anterior:

```bash
# Ver todo lo modificado
git status

# Archivos que ya están en repo modificados por TI (no por mí)
# son los que no están en la lista de fases abajo
```

Si tienes cambios tuyos que necesitas commitear primero, hazlo antes de aplicar mi estrategia. Yo refactoricé estos archivos específicos — todo lo demás es tuyo.

---

## 📦 Fase 1 — Design system base

**Archivos:**
- `src/app/globals.css`
- `src/components/ui/` (carpeta nueva — 11 files + index.ts)

**Commands:**
```bash
git add src/app/globals.css
git add src/components/ui/
git commit -m "feat(design-system): v2 tokens + 11 reusable UI primitives

- Add v2 palette (navy brand, muted status colors, subtle elevations)
- Keep legacy tokens as aliases — existing classes still work
- New components: StatusPill, KpiCard, Toggle, ClientAvatar,
  Segmented, DocHero, DetailSidebar, TimelineList, TotalsCard,
  Toolbar, EmptyState"
```

---

## 📦 Fase 2 — Estimates refactor (piloto)

**Archivos:**
- `src/app/[locale]/(dashboard)/estimates/_components/EstimatesClient.tsx`
- `src/app/[locale]/(dashboard)/estimates/_components/EstimateDetailClient.tsx`
- `src/app/[locale]/(dashboard)/estimates/_components/EstimateFormClient.tsx`
- `src/app/[locale]/(dashboard)/estimates/[id]/print/page.tsx`
- `src/app/[locale]/(dashboard)/estimates/[id]/edit/page.tsx` (solo quité h1 duplicado)
- `src/app/[locale]/(dashboard)/estimates/new/page.tsx` (solo quité h1 duplicado)

**Commands:**
```bash
git add src/app/\[locale\]/\(dashboard\)/estimates/
git commit -m "feat(estimates): v2 redesign — list, detail, form, print

- List: KPI row, toolbar, segmented filters, avatars, hover actions
- Detail: DocHero + DetailSidebar (TotalsCard, TimelineList, portal)
- Form: stepper enabled in desktop too, reusable Toggle, live total sidebar
- Print: two-column parties, logo box, navy CTA, type chips
- Fixed: duplicate titles, truncated email input, singular Job label"
```

---

## 📦 Fase 3 — Core views

**Archivos:**
- `src/app/[locale]/(dashboard)/invoices/_components/InvoicesClient.tsx`
- `src/app/[locale]/(dashboard)/invoices/_components/InvoiceDetailClient.tsx`
- `src/app/[locale]/(dashboard)/clients/_components/ClientsClient.tsx`
- `src/app/[locale]/(dashboard)/jobs/_components/JobsClient.tsx`
- `src/app/[locale]/(dashboard)/dashboard/_components/DashboardClient.tsx`
- `src/app/[locale]/(dashboard)/dashboard/_components/DashboardStats.tsx`

**Commands:**
```bash
git add src/app/\[locale\]/\(dashboard\)/invoices/_components/InvoicesClient.tsx
git add src/app/\[locale\]/\(dashboard\)/invoices/_components/InvoiceDetailClient.tsx
git add src/app/\[locale\]/\(dashboard\)/clients/_components/ClientsClient.tsx
git add src/app/\[locale\]/\(dashboard\)/jobs/_components/JobsClient.tsx
git add src/app/\[locale\]/\(dashboard\)/dashboard/_components/DashboardClient.tsx
git add src/app/\[locale\]/\(dashboard\)/dashboard/_components/DashboardStats.tsx
git commit -m "feat(core-views): v2 redesign — invoices, clients, jobs, dashboard

- Invoices list: KPI row, overdue banner, avatars
- Invoices detail: payment progress bar, timeline with real payments
- Clients: KPI row, grid/table toggle, deterministic avatars
- Jobs: KPI row (Active/Leads/Hold/Done), segmented status filter
- Dashboard: navy hero AI insight card (was warning amber)"
```

---

## 📦 Fase 4 — Operations

**Archivos:**
- `src/app/[locale]/(dashboard)/payments/_components/PaymentsClient.tsx`
- `src/app/[locale]/(dashboard)/expenses/_components/ExpensesGlobalClient.tsx` (swap minimal)
- `src/app/[locale]/(dashboard)/shopping-list/_components/ShoppingListsClient.tsx`
- `src/app/[locale]/(dashboard)/field/_components/FieldClient.tsx`
- `src/app/[locale]/(dashboard)/team/_components/TeamClient.tsx`
- `src/app/[locale]/(dashboard)/referrals/_components/ReferralsClient.tsx`

**Commands:**
```bash
git add src/app/\[locale\]/\(dashboard\)/payments/_components/PaymentsClient.tsx
git add src/app/\[locale\]/\(dashboard\)/expenses/_components/ExpensesGlobalClient.tsx
git add src/app/\[locale\]/\(dashboard\)/shopping-list/_components/ShoppingListsClient.tsx
git add src/app/\[locale\]/\(dashboard\)/field/_components/FieldClient.tsx
git add src/app/\[locale\]/\(dashboard\)/team/_components/TeamClient.tsx
git add src/app/\[locale\]/\(dashboard\)/referrals/_components/ReferralsClient.tsx
git commit -m "feat(operations): v2 redesign — payments, expenses, shopping, field, team, referrals

- Payments: KPI row (Revenue/Win rate/Outstanding), avatars in due list
- Expenses: v2 type chips (Labor/Material/Sub/Other)
- Shopping lists: segmented tabs, progress bars
- Field mode: segmented tech filter, avatars in jobs
- Team: grid cards with Edit/Remove footer, KPI row
- Referrals: navy hero card with share code"
```

---

## 📦 Fase 5 — AI surfaces

**Archivos:**
- `src/app/[locale]/(dashboard)/assistant/_components/AssistantPageClient.tsx`

**Commands:**
```bash
git add src/app/\[locale\]/\(dashboard\)/assistant/_components/AssistantPageClient.tsx
git commit -m "feat(assistant): v2 redesign — empty state with shortcuts

- 6 quick actions (added Shopping List + Draft Message)
- Keyboard-style shortcuts (/est, /pulse, /follow, /margin, /shop, /draft)
- Navy logo with indigo accent (Linear/Raycast feel)
- Grid 3×2 on desktop instead of horizontal flex"
```

---

## 📦 Opcional — Mockups + docs

Los HTML de mockups y este checklist viven en `_ui-preview/`. Quizás no quieres commitearlos en el repo principal.

**Si decides incluirlos:**
```bash
git add _ui-preview/
git commit -m "docs(ui-preview): v2 design mockups + validation checklist + git strategy"
```

**Si prefieres excluirlos:**
```bash
echo "_ui-preview/" >> .gitignore
git add .gitignore
git commit -m "chore: ignore _ui-preview/ (design mockups, not production code)"
```

---

## 🚀 Push cuando estés listo

```bash
# Ver lo que vas a subir
git log --oneline origin/master..HEAD

# Si se ve bien
git push origin master

# Si prefieres PR, crea una branch primero
git checkout -b ui/v2-redesign
git push -u origin ui/v2-redesign
# Luego abre PR en GitHub
```

---

## 🔙 Rollback si algo falla

Cada fase es un commit independiente. Puedes revertir una fase específica:

```bash
# Ver hashes
git log --oneline -10

# Revertir fase X (crea un commit inverso, historia intacta)
git revert <hash-de-la-fase>

# O si quieres borrar el commit completamente (antes de push)
git reset --hard <hash-anterior>
```

## ⚠️ Notas

- **NO** voy a ejecutar `git commit` por ti — es tu trabajo y tus decisiones finales.
- Si al hacer `pnpm build` falla algo, dime el error y lo arreglo ANTES de commitear.
- Los commits en fases separadas te dan rollback granular — si la Fase 4 rompe algo, puedes revertir solo esa sin perder Fases 1-3.
