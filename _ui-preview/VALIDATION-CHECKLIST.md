# plumbr v2 — Checklist de validación

Corre `pnpm build && pnpm dev` y sigue esta lista. Cualquier ❌ abre un ticket para que lo arregle.

## 🏗️ 1. Build production

```bash
pnpm build
```

**Esperado:** build completa sin errores de type ni de ESLint. Si sale algún error, pégamelo y lo arreglo.

---

## 🎨 2. Pase visual por las 15 vistas

Abre `pnpm dev` → `http://localhost:3000/en` (o `/es`).

### Dashboard (`/dashboard`)
- [ ] Stat cards ahora usan el nuevo KpiCard con dots de color
- [ ] AI Insight card — cuando aparece, es **navy gradient con indigo accent** (antes era warning amber)
- [ ] Revenue chart conserva su comportamiento
- [ ] Botones "New estimate"/"New job" son navy oscuro (antes orange)

### Estimates — 4 vistas
- [ ] **`/estimates`** — KPI row de 4 tarjetas arriba + toolbar unificada + avatares con iniciales por cliente + drafts collapsible con border + quick actions (share/delete) aparecen al hover
- [ ] **`/estimates/[id]`** — desktop: 2 columnas con sidebar de 300px (Total card navy + Timeline + Portal link); mobile intacto al estilo Joist
- [ ] **`/estimates/new` y `/estimates/[id]/edit`** — stepper horizontal en desktop (una sección a la vez, no todas apiladas); sidebar sticky con Live Total; sin títulos duplicados
- [ ] **`/estimates/[id]/print`** — header con logo box + "From / Billed to" dos columnas + totals en card + CTA "Approve online" navy + QR

### Invoices — 2 vistas
- [ ] **`/invoices`** — KPI row con Paid MTD / Outstanding / Overdue / Paid count + banner rojo si hay overdue + quick actions (mark paid + share) al hover
- [ ] **`/invoices/[id]`** — DocHero + **payment progress bar** si hay pagos parciales + sidebar con TotalsCard mostrando Paid y Balance + Timeline con payments reales

### Clients — 1 vista
- [ ] **`/clients`** — KPI row (Total / Active / Avg LTV / Billed) + grid view default con avatares + table view alternativa + sort dropdown

### Jobs — 1 vista
- [ ] **`/jobs`** — KPI row (Active / Leads / On hold / Done MTD) + segmented por estado + avatares de cliente + TechAvatars preservados

### Operations — 4 vistas
- [ ] **`/payments`** — KPI row (Revenue YTD / Month / Win rate / Outstanding) + lista de due invoices con avatares + reports con iconos coloreados
- [ ] **`/expenses`** — type chips ahora v2 (Labor azul, Material verde, Subcontractor ámbar, Other gris)
- [ ] **`/shopping-list`** — KPI row + Segmented para Active/Drafts/Completed + progress bars v2 en cada lista
- [ ] **`/field`** — Segmented para filtro técnico + avatares en jobs de hoy + EmptyState si no hay jobs
- [ ] **`/team`** — grid de cards con avatar grande + Edit/Remove footer + KPI row cuando hay techs

### AI & Referrals — 2 vistas
- [ ] **`/referrals`** — **Hero card navy** con código mono + copy button + stats de "Paying" a la derecha
- [ ] **`/assistant`** — empty state: logo navy con bot indigo pastel + grid 3×2 de quick actions con atajos `/est`, `/pulse`, `/follow`, `/margin`, `/shop`, `/draft`

---

## ✅ 3. Smoke tests funcionales

Lo importante: los flujos siguen funcionando.

### Estimates
- [ ] Crear un estimate nuevo desde cero
- [ ] Editar uno existente
- [ ] Enviar email al cliente
- [ ] Convert to invoice desde un estimate aprobado
- [ ] Print preview imprime

### Invoices
- [ ] Crear una invoice
- [ ] Registrar un pago (modal)
- [ ] Mark as paid
- [ ] Enviar recordatorio

### Clients & Jobs
- [ ] Crear un cliente
- [ ] Crear un job vinculado a un cliente
- [ ] Editar un job existente

### Operations
- [ ] Registrar un expense
- [ ] Crear una shopping list
- [ ] Invitar a un technician (requiere plan Pro)
- [ ] Enviar invitación de referral por email

### AI
- [ ] Hacer click en una Quick Action → AI responde
- [ ] Activar voice mode → UI de voz aparece

---

## 📱 4. Mobile (375px en DevTools)

- [ ] Dashboard navegable, KPIs en grid 2×2
- [ ] Estimates list — swipeable rows con acciones (share/delete)
- [ ] Estimates detail mobile — Joist pattern preservado (back + #number + edit, action strip de 4)
- [ ] Form wizard mobile funciona como antes (step-by-step)
- [ ] Field mode se ve como app móvil

---

## 🌐 5. Idiomas

- [ ] Cambiar a `/es` → todos los textos relevantes en español
- [ ] Cambiar a `/en` → todos los textos en inglés
- [ ] No hay textos hardcoded en un solo idioma donde debería ser bilingüe

---

## 🐛 Si algo falla

1. **Error de build** → pégame el output completo de `pnpm build`
2. **Error en runtime** → consola del navegador (F12 → Console)
3. **Se ve mal** → screenshot + qué vista + desktop/mobile
4. **Regression funcional** → describe el flujo que se rompió

## 📊 Estado esperado al terminar

| Área | Estado |
|---|---|
| 29 archivos refactorizados | ✅ compilando sin errors |
| Paleta v2 aplicada global | ✅ visible en todas las vistas |
| Componentes `ui/*` reutilizables | ✅ 11 componentes + barrel export |
| Lógica de negocio | ✅ intacta (server actions, DB, Stripe, Clerk) |
| Mobile layout | ✅ preservado (patrón Joist donde aplicaba) |
| i18n (es/en) | ✅ sin strings hardcoded nuevos |
