'use server'

import { requireUser } from './auth-helpers'
import { db } from '@/db'
import { clients } from '@/db/schema/clients'
import { jobs } from '@/db/schema/jobs'
import { estimates } from '@/db/schema/estimates'
import { invoices } from '@/db/schema/invoices'
import { technicians, jobTechnicians } from '@/db/schema/technicians'
import { lineItems } from '@/db/schema/line-items'
import { expenses } from '@/db/schema/expenses'
import { catalogItems } from '@/db/schema/catalog-items'
import { shoppingLists, shoppingListItems } from '@/db/schema/shopping-lists'
import { payments } from '@/db/schema/payments'
import { changeOrders } from '@/db/schema/change-orders'
import { workOrders } from '@/db/schema/work-orders'
import { contracts } from '@/db/schema/contracts'
import { notifications } from '@/db/schema/notifications'
import { referrals } from '@/db/schema/referrals'
import { aiPreferences } from '@/db/schema/ai-preferences'
import { jobChecklistItems } from '@/db/schema/job-checklists'
import { sql } from 'drizzle-orm'
import { invalidateUserData } from '@/lib/cache-tags'
import { revalidatePath } from 'next/cache'

function assertDev() {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEV_TOOLS !== 'true') {
    throw new Error('Dev tools disabled in production')
  }
}

type SeedResult = {
  clients: number
  jobs: number
  estimates: number
  invoices: number
  technicians: number
  expenses: number
  lineItems: number
  catalogItems: number
  shoppingLists: number
  shoppingListItems: number
  payments: number
  changeOrders: number
  workOrders: number
  contracts: number
  notifications: number
  referrals: number
  aiPreferences: number
  jobChecklistItems: number
}

function daysAgo(n: number) { const d = new Date(); d.setDate(d.getDate() - n); return d }
function daysFromNow(n: number) { const d = new Date(); d.setDate(d.getDate() + n); return d }
function money(n: number): string { return n.toFixed(2) }
function token() { return crypto.randomUUID().replace(/-/g, '') }

/** Comprehensive QA seed — every scenario end-to-end for manual certification. */
export async function seedTestData(): Promise<SeedResult> {
  assertDev()
  const userId = await requireUser()
  const ts = Date.now()

  // Asegurar que el user tenga taxRate configurada para que todos los cálculos de tax funcionen.
  // Sin esto, createEstimate/createInvoice recomputan tax=0 y A1/A4 parecen fallar.
  const { users: usersTable } = await import('@/db/schema/users')
  const { eq } = await import('drizzle-orm')
  await db.update(usersTable).set({ taxRate: '8' }).where(eq(usersTable.id, userId)).catch(() => null)

  // ═══════════════════════════════════════════════════════════════
  // 1. CATALOG ITEMS (12) — labor, material, sub, equipment
  // ═══════════════════════════════════════════════════════════════
  const catalogRows = await db.insert(catalogItems).values([
    { userId, name: 'Licensed plumber labor',    type: 'labor',         unitPrice: '95.00',  unit: 'hour', category: 'Labor' },
    { userId, name: 'Apprentice labor',           type: 'labor',         unitPrice: '55.00',  unit: 'hour', category: 'Labor' },
    { userId, name: 'Emergency call-out fee',     type: 'labor',         unitPrice: '150.00', unit: 'flat', category: 'Labor' },
    { userId, name: 'Copper pipe ½"',             type: 'material',      unitPrice: '4.80',   unit: 'ft',   category: 'Pipes' },
    { userId, name: 'PEX tubing ¾"',              type: 'material',      unitPrice: '1.20',   unit: 'ft',   category: 'Pipes' },
    { userId, name: 'Ball valve brass ½"',        type: 'material',      unitPrice: '12.50',  unit: 'each', category: 'Fittings' },
    { userId, name: 'Water heater 40gal',         type: 'material',      unitPrice: '620.00', unit: 'each', category: 'Fixtures' },
    { userId, name: 'Toilet Kohler standard',     type: 'material',      unitPrice: '240.00', unit: 'each', category: 'Fixtures' },
    { userId, name: 'Pressure tank 20gal',        type: 'material',      unitPrice: '180.00', unit: 'each', category: 'Fixtures' },
    { userId, name: 'Drain snake rental (day)',   type: 'other',         unitPrice: '45.00',  unit: 'day',  category: 'Equipment' },
    { userId, name: 'Hydro-jetting service',      type: 'subcontractor', unitPrice: '380.00', unit: 'flat', category: 'Subcontractor' },
    { userId, name: 'Excavation crew',            type: 'subcontractor', unitPrice: '85.00',  unit: 'hour', category: 'Subcontractor' },
  ]).returning()

  // ═══════════════════════════════════════════════════════════════
  // 2. CONTRACTS — default + signed template
  // ═══════════════════════════════════════════════════════════════
  const contractRows = await db.insert(contracts).values([
    { userId, name: 'Standard service contract', isDefault: true, content: 'This contract outlines the terms of plumbing services provided. Payment due within 30 days of invoice. All work guaranteed for 90 days.' },
    { userId, name: 'Commercial maintenance contract', isDefault: false, content: 'Annual service agreement for commercial properties. Includes 4 preventive visits and emergency response within 4 hours.' },
  ]).returning()

  // ═══════════════════════════════════════════════════════════════
  // 3. TECHNICIANS (6 — all role states)
  // ═══════════════════════════════════════════════════════════════
  const techRows = await db.insert(technicians).values([
    { userId, name: 'Moises (tú)',       email: `moi.${ts}@ex.com`,  phone: '(555) 100-0001', hourlyRate: '95', type: 'employee',      role: 'Owner',         tier: 'Master plumber', rating: '4.9', availabilityStatus: 'available', availabilityNote: 'En oficina' },
    { userId, name: 'Carlos Pérez',      email: `cp.${ts}@ex.com`,   phone: '(555) 100-0002', hourlyRate: '75', type: 'employee',      role: 'Technician',    tier: 'Certified',      rating: '4.7', availabilityStatus: 'available', availabilityNote: 'libre hasta 3pm' },
    { userId, name: 'Diego López',       email: `dl.${ts}@ex.com`,   phone: '(555) 100-0003', hourlyRate: '55', type: 'employee',      role: 'Apprentice',    tier: 'Year 2',         rating: '4.8', availabilityStatus: 'busy',      availabilityNote: null },
    { userId, name: 'Luis Ramírez',      email: `lr.${ts}@ex.com`,   phone: '(555) 100-0004', hourlyRate: '60', type: 'employee',      role: 'Technician',    tier: 'Part-time',      rating: '4.6', availabilityStatus: 'off',       availabilityNote: 'Off today' },
    { userId, name: 'Ana Martínez',      email: `am.${ts}@ex.com`,   phone: '(555) 100-0005', hourlyRate: '72', type: 'employee',      role: 'Technician',    tier: 'Certified',      rating: '4.9', availabilityStatus: 'busy',      availabilityNote: null },
    { userId, name: 'ABC Plumbing Subs', email: `abc.${ts}@ex.com`,  phone: '(555) 100-0006', hourlyRate: null, type: 'subcontractor', role: 'Subcontractor', tier: '1099',           rating: '4.5', availabilityStatus: 'available', availabilityNote: null },
  ]).returning()
  const [owner, techCert, techApp, techPT, techCert2, techSub] = techRows

  // ═══════════════════════════════════════════════════════════════
  // 4. CLIENTS (12 — QA personas)
  // ═══════════════════════════════════════════════════════════════
  const clientRows = await db.insert(clients).values([
    { userId, name: 'Carlos Mendoza',  email: `carlos.${ts}@ex.com`,  phone: '(555) 111-2233', address: '456 Oak Ave, Miami, FL 33101',       notes: 'VIP. Residencial. Prefiere email.' },
    { userId, name: 'Linda Park',      email: `linda.${ts}@ex.com`,   phone: '(555) 222-3344', address: '88 Birch St, Brooklyn, NY 11211',    notes: 'Happy path comercial. Oficinas.' },
    { userId, name: 'Javier Torres',   email: `javier.${ts}@ex.com`,  phone: '(555) 333-4455', address: '2200 Maple Dr, Austin, TX 73301',    notes: 'Residencial. Historial de pagos tardíos.' },
    { userId, name: 'Sarah Johnson',   email: `sarah.${ts}@ex.com`,   phone: '(555) 444-5566', address: '15 Pine Rd, Seattle, WA 98101',      notes: 'Property manager — 32 unidades.' },
    { userId, name: 'Miguel Herrera',  email: `miguel.${ts}@ex.com`,  phone: '(555) 555-6677', address: '780 Elm St, Denver, CO 80201',       notes: 'Cliente nuevo. Lead pendiente.' },
    { userId, name: 'Emily Chen',      email: `emily.${ts}@ex.com`,   phone: '(555) 666-7788', address: '12 Cedar Ln, San Jose, CA 95101',    notes: 'Restaurante. Estimate rechazado.' },
    { userId, name: 'Roberto Silva',   email: `roberto.${ts}@ex.com`, phone: '(555) 777-8899', address: '340 Willow Ave, Tampa, FL 33601',    notes: 'Inactivo 90+ días.' },
    { userId, name: 'Aisha Patel',     email: `aisha.${ts}@ex.com`,   phone: '(555) 888-9900', address: '555 Spruce Blvd, Atlanta, GA 30301', notes: 'Clínica dental. Contract firmado + deposit.' },
    { userId, name: 'Daniel Cooper',   email: `daniel.${ts}@ex.com`,  phone: '(555) 999-0011', address: '9 Redwood Ct, Portland, OR 97201',   notes: 'VIP. Active con change order aprobado.' },
    { userId, name: 'Lucía Ramírez',   email: `lucia.${ts}@ex.com`,   phone: '(555) 000-1122', address: '42 Aspen Way, Phoenix, AZ 85001',    notes: 'Hotel boutique. Job on hold + cancelled.' },
    { userId, name: 'Kevin Walsh',     email: `kevin.${ts}@ex.com`,   phone: '(555) 123-4567', address: '11 Oak Park, Chicago, IL 60601',     notes: 'Viene de referral.' },
    { userId, name: 'Test Empty',      email: `empty.${ts}@ex.com`,   phone: '(555) 000-0000', address: null,                                  notes: 'Empty state — sin jobs, sin dirección (caso QA).' },
  ]).returning()
  const [
    cMendoza, cPark, cTorres, cJohnson, cHerrera, cChen,
    cSilva, cPatel, cCooper, cRamirez, cWalsh, /*cEmpty*/
  ] = clientRows

  // ═══════════════════════════════════════════════════════════════
  // 5. JOBS — 25+ con todos los estados
  // ═══════════════════════════════════════════════════════════════
  const jobValues: typeof jobs['$inferInsert'][] = [
    // Mendoza (VIP) — 3 jobs
    { userId, clientId: cMendoza.id,  name: 'Renovación baño principal',     clientName: cMendoza.name,  clientEmail: cMendoza.email,  clientPhone: cMendoza.phone,  address: cMendoza.address,  status: 'active',    budgetedCost: '4500', actualCost: '1200', startDate: daysAgo(5), endDate: daysFromNow(10) },
    { userId, clientId: cMendoza.id,  name: 'Reparación fuga cocina',        clientName: cMendoza.name,  clientEmail: cMendoza.email,  clientPhone: cMendoza.phone,  address: cMendoza.address,  status: 'completed', budgetedCost: '350',  actualCost: '325',  startDate: daysAgo(20), endDate: daysAgo(19) },
    { userId, clientId: cMendoza.id,  name: 'Ampliación cuarto lavado',      clientName: cMendoza.name,  clientEmail: cMendoza.email,  clientPhone: cMendoza.phone,  address: cMendoza.address,  status: 'lead',      budgetedCost: '2200', actualCost: '0',    startDate: daysFromNow(15), endDate: null },
    // Park (Happy path) — 2 jobs
    { userId, clientId: cPark.id,     name: 'Instalación calentador',        clientName: cPark.name,     clientEmail: cPark.email,     clientPhone: cPark.phone,     address: cPark.address,     status: 'completed', budgetedCost: '1800', actualCost: '1650', startDate: daysAgo(10), endDate: daysAgo(8) },
    { userId, clientId: cPark.id,     name: 'Mantenimiento anual',           clientName: cPark.name,     clientEmail: cPark.email,     clientPhone: cPark.phone,     address: cPark.address,     status: 'active',    budgetedCost: '600',  actualCost: '0',    startDate: daysAgo(1), endDate: null,     createdAt: daysAgo(5),  updatedAt: daysAgo(1) },
    { userId, clientId: cPark.id,     name: 'Revisión trimestral (Q3)',      clientName: cPark.name,     clientEmail: cPark.email,     clientPhone: cPark.phone,     address: cPark.address,     status: 'lead',      budgetedCost: '450',  actualCost: '0',    startDate: null,     endDate: null,     createdAt: daysAgo(3),  updatedAt: daysAgo(3) }, // ← CLI-002 lead en histórico Park
    // Torres (Overdue) — 1 job
    { userId, clientId: cTorres.id,   name: 'Drenaje principal obstruido',   clientName: cTorres.name,   clientEmail: cTorres.email,   clientPhone: cTorres.phone,   address: cTorres.address,   status: 'completed', budgetedCost: '480',  actualCost: '475',  startDate: daysAgo(35), endDate: daysAgo(34), createdAt: daysAgo(40), updatedAt: daysAgo(34) },
    // Johnson (volume) — 4 jobs completed
    { userId, clientId: cJohnson.id,  name: 'Unit 12 — fuga baño',           clientName: cJohnson.name,  clientEmail: cJohnson.email,  clientPhone: cJohnson.phone,  address: cJohnson.address,  status: 'completed', budgetedCost: '340',  actualCost: '320',  startDate: daysAgo(45), endDate: daysAgo(44) },
    { userId, clientId: cJohnson.id,  name: 'Unit 18 — calentador',          clientName: cJohnson.name,  clientEmail: cJohnson.email,  clientPhone: cJohnson.phone,  address: cJohnson.address,  status: 'completed', budgetedCost: '1800', actualCost: '1720', startDate: daysAgo(30), endDate: daysAgo(28) },
    { userId, clientId: cJohnson.id,  name: 'Unit 07 — grifo cocina',        clientName: cJohnson.name,  clientEmail: cJohnson.email,  clientPhone: cJohnson.phone,  address: cJohnson.address,  status: 'completed', budgetedCost: '260',  actualCost: '245',  startDate: daysAgo(22), endDate: daysAgo(21) },
    { userId, clientId: cJohnson.id,  name: 'Lobby — drenaje',               clientName: cJohnson.name,  clientEmail: cJohnson.email,  clientPhone: cJohnson.phone,  address: cJohnson.address,  status: 'completed', budgetedCost: '420',  actualCost: '395',  startDate: daysAgo(15), endDate: daysAgo(14) },
    // Herrera (new lead)
    { userId, clientId: cHerrera.id,  name: 'Diagnóstico presión baja',      clientName: cHerrera.name,  clientEmail: cHerrera.email,  clientPhone: cHerrera.phone,  address: cHerrera.address,  status: 'lead',      budgetedCost: '220',  actualCost: '0',    startDate: null, endDate: null },
    // Chen (rejected + cancelled) — 2 jobs
    { userId, clientId: cChen.id,     name: 'Urgencia desagüe cocina',       clientName: cChen.name,     clientEmail: cChen.email,     clientPhone: cChen.phone,     address: cChen.address,     status: 'completed', budgetedCost: '195',  actualCost: '210',  startDate: daysAgo(3), endDate: daysAgo(2) },
    { userId, clientId: cChen.id,     name: 'Remodelación cocina principal', clientName: cChen.name,     clientEmail: cChen.email,     clientPhone: cChen.phone,     address: cChen.address,     status: 'cancelled', budgetedCost: '8500', actualCost: '0',    startDate: null, endDate: null },
    // Silva (inactive) — 1 job hace 90+ días
    { userId, clientId: cSilva.id,    name: 'Válvula ducha',                 clientName: cSilva.name,    clientEmail: cSilva.email,    clientPhone: cSilva.phone,    address: cSilva.address,    status: 'completed', budgetedCost: '280',  actualCost: '275',  startDate: daysAgo(100), endDate: daysAgo(99) },
    // Patel (signed + deposit) — 1 active + 1 scheduled
    { userId, clientId: cPatel.id,    name: 'Instalación equipo dental',     clientName: cPatel.name,    clientEmail: cPatel.email,    clientPhone: cPatel.phone,    address: cPatel.address,    status: 'active',    budgetedCost: '3200', actualCost: '800', startDate: daysAgo(2), endDate: daysFromNow(5) },
    { userId, clientId: cPatel.id,    name: 'Preventivo trimestral',         clientName: cPatel.name,    clientEmail: cPatel.email,    clientPhone: cPatel.phone,    address: cPatel.address,    status: 'lead',      budgetedCost: '420',  actualCost: '0',    startDate: daysFromNow(30), endDate: null },
    // Cooper (change order + over budget) — 1 active
    { userId, clientId: cCooper.id,   name: 'Sustitución tubería galvan.',   clientName: cCooper.name,   clientEmail: cCooper.email,   clientPhone: cCooper.phone,   address: cCooper.address,   status: 'active',    budgetedCost: '1900', actualCost: '2496', startDate: daysAgo(8), endDate: daysAgo(1) }, // ← OVER BUDGET (2496 = expenses 2150 + CO aprobado 346)
    // Ramírez (on_hold + cancelled) — 2 jobs
    { userId, clientId: cRamirez.id,  name: 'Hotel — sistema riego',         clientName: cRamirez.name,  clientEmail: cRamirez.email,  clientPhone: cRamirez.phone,  address: cRamirez.address,  status: 'on_hold',   budgetedCost: '1450', actualCost: '200',  startDate: daysAgo(14), endDate: null },
    { userId, clientId: cRamirez.id,  name: 'Spa — calentador grande',       clientName: cRamirez.name,  clientEmail: cRamirez.email,  clientPhone: cRamirez.phone,  address: cRamirez.address,  status: 'cancelled', budgetedCost: '3800', actualCost: '0',    startDate: null, endDate: null },
    // Walsh (from referral) — 1 job
    { userId, clientId: cWalsh.id,    name: 'Inspección pre-compra',         clientName: cWalsh.name,    clientEmail: cWalsh.email,    clientPhone: cWalsh.phone,    address: cWalsh.address,    status: 'active',    budgetedCost: '320',  actualCost: '0',    startDate: daysFromNow(2), endDate: null }, // ← SCHEDULED (future)
    // Extra — bomba sumidero on_hold (lead pero pausada)
    { userId, clientId: cTorres.id,   name: 'Bomba sumidero',                clientName: cTorres.name,   clientEmail: cTorres.email,   clientPhone: cTorres.phone,   address: cTorres.address,   status: 'on_hold',   budgetedCost: '620',  actualCost: '0',    startDate: null, endDate: null },
  ]
  const jobRows = await db.insert(jobs).values(jobValues).returning()

  const jobByKey = (fn: (j: typeof jobRows[number]) => boolean) => jobRows.find(fn)

  // ═══════════════════════════════════════════════════════════════
  // 6. ESTIMATES — todos los estados + features
  // ═══════════════════════════════════════════════════════════════
  let estSeq = 1
  const nextEst = () => `EST-${String(estSeq++).padStart(3, '0')}`
  const estimateValues: typeof estimates['$inferInsert'][] = []

  // Mendoza — 3 estimates (converted from completed, approved + sent on active, draft on lead)
  const mendozaActive = jobByKey(j => j.clientId === cMendoza.id && j.status === 'active')!
  const mendozaDone   = jobByKey(j => j.clientId === cMendoza.id && j.status === 'completed')!
  const mendozaLead   = jobByKey(j => j.clientId === cMendoza.id && j.status === 'lead')!
  estimateValues.push(
    { userId, number: nextEst(), jobId: mendozaDone.id,   clientId: cMendoza.id, clientName: cMendoza.name, clientEmail: cMendoza.email, status: 'converted', subtotal: '300',  tax: '25',  total: '325',  validUntil: daysAgo(15), shareToken: token() },
    { userId, number: nextEst(), jobId: mendozaActive.id, clientId: cMendoza.id, clientName: cMendoza.name, clientEmail: cMendoza.email, status: 'approved',  subtotal: '4200', tax: '340', total: '4540', validUntil: daysFromNow(20), shareToken: token(), markupPercent: '15' },
    { userId, number: nextEst(), jobId: mendozaLead.id,   clientId: cMendoza.id, clientName: cMendoza.name, clientEmail: cMendoza.email, status: 'draft',     subtotal: '2000', tax: '160', total: '2160', validUntil: daysFromNow(30) },
  )

  // Park — completed converted + active sent (happy path)
  const parkDone   = jobByKey(j => j.clientId === cPark.id && j.status === 'completed')!
  const parkActive = jobByKey(j => j.clientId === cPark.id && j.status === 'active')!
  estimateValues.push(
    { userId, number: nextEst(), jobId: parkDone.id,   clientId: cPark.id, clientName: cPark.name, clientEmail: cPark.email, status: 'converted', subtotal: '1550', tax: '124', total: '1674', validUntil: daysAgo(5), shareToken: token() },
    { userId, number: nextEst(), jobId: parkActive.id, clientId: cPark.id, clientName: cPark.name, clientEmail: cPark.email, status: 'sent',      subtotal: '560',  tax: '45',  total: '605',  validUntil: daysFromNow(14), shareToken: token() },
  )

  // Torres — completed converted (invoice será overdue)
  const torresDone = jobByKey(j => j.clientId === cTorres.id && j.status === 'completed')!
  estimateValues.push(
    { userId, number: nextEst(), jobId: torresDone.id, clientId: cTorres.id, clientName: cTorres.name, clientEmail: cTorres.email, status: 'converted', subtotal: '440', tax: '35', total: '475', validUntil: daysAgo(30), createdAt: daysAgo(40), updatedAt: daysAgo(30) },
  )

  // Johnson — 4 converted
  const johnsonJobs = jobRows.filter(j => j.clientId === cJohnson.id)
  for (let i = 0; i < johnsonJobs.length; i++) {
    const j = johnsonJobs[i]
    const total = parseFloat(j.budgetedCost ?? '0')
    estimateValues.push({ userId, number: nextEst(), jobId: j.id, clientId: cJohnson.id, clientName: cJohnson.name, clientEmail: cJohnson.email, status: 'converted', subtotal: money(total * 0.92), tax: money(total * 0.08), total: money(total) })
  }

  // Herrera — 1 sent (new lead has pending estimate)
  const herreraJob = jobByKey(j => j.clientId === cHerrera.id)!
  estimateValues.push(
    { userId, number: nextEst(), jobId: herreraJob.id, clientId: cHerrera.id, clientName: cHerrera.name, clientEmail: cHerrera.email, status: 'sent', subtotal: '200', tax: '16', total: '216', validUntil: daysFromNow(7), shareToken: token() },
  )

  // Chen — converted (urgency) + REJECTED (cancelled job had estimate)
  const chenDone   = jobByKey(j => j.clientId === cChen.id && j.status === 'completed')!
  const chenCancel = jobByKey(j => j.clientId === cChen.id && j.status === 'cancelled')!
  estimateValues.push(
    { userId, number: nextEst(), jobId: chenDone.id,   clientId: cChen.id, clientName: cChen.name, clientEmail: cChen.email, status: 'converted', subtotal: '195', tax: '15', total: '210', validUntil: daysAgo(1), createdAt: daysAgo(4), updatedAt: daysAgo(1) },
    { userId, number: nextEst(), jobId: chenCancel.id, clientId: cChen.id, clientName: cChen.name, clientEmail: cChen.email, status: 'rejected',  subtotal: '7800', tax: '624', total: '8424', validUntil: daysAgo(3), discountType: 'percent', discountValue: '10', createdAt: daysAgo(12), updatedAt: daysAgo(3) },
  )

  // Silva — old converted (inactive)
  const silvaJob = jobByKey(j => j.clientId === cSilva.id)!
  estimateValues.push(
    { userId, number: nextEst(), jobId: silvaJob.id, clientId: cSilva.id, clientName: cSilva.name, clientEmail: cSilva.email, status: 'converted', subtotal: '255', tax: '20', total: '275', validUntil: daysAgo(90), createdAt: daysAgo(100), updatedAt: daysAgo(90) },
  )

  // Patel — SIGNED + DEPOSIT PAID
  const patelActive = jobByKey(j => j.clientId === cPatel.id && j.status === 'active')!
  estimateValues.push(
    { userId, number: nextEst(), jobId: patelActive.id, clientId: cPatel.id, clientName: cPatel.name, clientEmail: cPatel.email, status: 'approved',
      subtotal: '2960', tax: '237', total: '3197', validUntil: daysFromNow(25), shareToken: token(),
      signatureDataUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciLz4=',
      signedByName: 'Aisha Patel', signedByEmail: cPatel.email, signedAt: daysAgo(3), signedIp: '192.168.1.1',
      contractId: contractRows[0].id,
      depositType: 'percent', depositAmount: '25', depositPaid: true, depositPaidAt: daysAgo(3),
    },
  )

  // Cooper — approved (will have change order)
  const cooperJob = jobByKey(j => j.clientId === cCooper.id)!
  estimateValues.push(
    { userId, number: nextEst(), jobId: cooperJob.id, clientId: cCooper.id, clientName: cCooper.name, clientEmail: cCooper.email, status: 'approved', subtotal: '1750', tax: '140', total: '1890', validUntil: daysFromNow(10), markupPercent: '10', discountType: 'fixed', discountValue: '50' },
  )

  // Ramírez — expired (validUntil past pero >= createdAt) + rejected
  const ramirezHold = jobByKey(j => j.clientId === cRamirez.id && j.status === 'on_hold')!
  const ramirezCancel = jobByKey(j => j.clientId === cRamirez.id && j.status === 'cancelled')!
  estimateValues.push(
    // EXPIRED: created hace 20 días con validUntil = daysAgo(5) → fue válido 15 días, ahora expirado (TRV-006 + TRV-007)
    { userId, number: nextEst(), jobId: ramirezHold.id,   clientId: cRamirez.id, clientName: cRamirez.name, clientEmail: cRamirez.email, status: 'sent',     subtotal: '1340', tax: '107', total: '1447', validUntil: daysAgo(5), allowExpire: true, createdAt: daysAgo(20), updatedAt: daysAgo(20) },
    { userId, number: nextEst(), jobId: ramirezCancel.id, clientId: cRamirez.id, clientName: cRamirez.name, clientEmail: cRamirez.email, status: 'rejected', subtotal: '3500', tax: '280', total: '3780', validUntil: daysAgo(10), createdAt: daysAgo(25), updatedAt: daysAgo(15) },
  )

  // Walsh — sent + 1 no-expire (D7: allowExpire=false con validUntil pasada → sigue Sent, no degrada)
  const walshJob = jobByKey(j => j.clientId === cWalsh.id)!
  estimateValues.push(
    { userId, number: nextEst(), jobId: walshJob.id, clientId: cWalsh.id, clientName: cWalsh.name, clientEmail: cWalsh.email, status: 'sent', subtotal: '295', tax: '24', total: '319', validUntil: daysFromNow(7), shareToken: token() },
    // D7 fixture: allowExpire=false + validUntil past → NO debe derivar a 'expired'
    { userId, number: nextEst(), jobId: walshJob.id, clientId: cWalsh.id, clientName: cWalsh.name, clientEmail: cWalsh.email, status: 'sent', subtotal: '800', tax: '64', total: '864', validUntil: daysAgo(30), allowExpire: false, createdAt: daysAgo(60), updatedAt: daysAgo(60), shareToken: token() },
  )

  const estimateRows = await db.insert(estimates).values(estimateValues).returning()

  // ═══════════════════════════════════════════════════════════════
  // 7. LINE ITEMS (2-3 per estimate + per invoice later)
  // ═══════════════════════════════════════════════════════════════
  const catalogLabor = catalogRows.filter(c => c.type === 'labor')
  const catalogMaterial = catalogRows.filter(c => c.type === 'material')
  const lineItemValues: typeof lineItems['$inferInsert'][] = []
  for (let idx = 0; idx < estimateRows.length; idx++) {
    const est = estimateRows[idx]
    const labor = catalogLabor[idx % catalogLabor.length]
    const mat1 = catalogMaterial[idx % catalogMaterial.length]
    const mat2 = catalogMaterial[(idx + 2) % catalogMaterial.length]
    const hours = 2 + (idx % 6)
    lineItemValues.push(
      { parentId: est.id, parentType: 'estimate', type: 'labor',    description: labor.name, quantity: money(hours), unitPrice: labor.unitPrice, total: money(hours * parseFloat(labor.unitPrice)), section: 'Labor', sortOrder: 0 },
      { parentId: est.id, parentType: 'estimate', type: 'material', description: mat1.name,  quantity: '1',          unitPrice: mat1.unitPrice,  total: mat1.unitPrice,                              section: 'Materials', sortOrder: 1 },
      { parentId: est.id, parentType: 'estimate', type: 'material', description: mat2.name,  quantity: money(1 + (idx % 3)), unitPrice: mat2.unitPrice, total: money((1 + (idx % 3)) * parseFloat(mat2.unitPrice)), section: 'Materials', sortOrder: 2 },
    )
  }

  // ═══════════════════════════════════════════════════════════════
  // 8. INVOICES — all states (draft, sent, paid, overdue w/reminder, cancelled)
  // ═══════════════════════════════════════════════════════════════
  let invSeq = 1
  const nextInv = () => `INV-${String(invSeq++).padStart(3, '0')}`
  const invoiceValues: typeof invoices['$inferInsert'][] = []
  const invoiceEstimateMap = new Map<string, string>() // invoice.id → estimate.id (later)

  // Mendoza completed → paid (Stripe). createdAt antes de paidAt (TRV-005)
  const mendozaEst0 = estimateRows.find(e => e.jobId === mendozaDone.id && e.status === 'converted')!
  invoiceValues.push({ userId, number: nextInv(), jobId: mendozaDone.id, estimateId: mendozaEst0.id, clientName: cMendoza.name, clientEmail: cMendoza.email, status: 'paid', subtotal: '300', tax: '25', total: '325', dueDate: daysAgo(5), paidAt: daysAgo(10), stripePaymentIntentId: `pi_test_${ts}_1`, shareToken: token(), createdAt: daysAgo(15), updatedAt: daysAgo(10) })

  // Park completed → paid (manual/check)
  const parkEst0 = estimateRows.find(e => e.jobId === parkDone.id && e.status === 'converted')!
  invoiceValues.push({ userId, number: nextInv(), jobId: parkDone.id, estimateId: parkEst0.id, clientName: cPark.name, clientEmail: cPark.email, status: 'paid', subtotal: '1550', tax: '124', total: '1674', dueDate: daysAgo(3), paidAt: daysAgo(1), shareToken: token(), createdAt: daysAgo(7), updatedAt: daysAgo(1) })

  // Torres completed → OVERDUE with reminderSentAt. createdAt antes de reminder (CLI-005)
  const torresEst = estimateRows.find(e => e.jobId === torresDone.id)!
  invoiceValues.push({ userId, number: nextInv(), jobId: torresDone.id, estimateId: torresEst.id, clientName: cTorres.name, clientEmail: cTorres.email, status: 'overdue', subtotal: '440', tax: '35', total: '475', dueDate: daysAgo(20), reminderSentAt: daysAgo(3), createdAt: daysAgo(25), updatedAt: daysAgo(3) })

  // Johnson — 4 paid
  const johnsonEstimates = estimateRows.filter(e => e.clientId === cJohnson.id)
  for (let i = 0; i < johnsonEstimates.length; i++) {
    const e = johnsonEstimates[i]
    invoiceValues.push({ userId, number: nextInv(), jobId: e.jobId, estimateId: e.id, clientName: cJohnson.name, clientEmail: cJohnson.email, status: 'paid', subtotal: e.subtotal, tax: e.tax, total: e.total, dueDate: daysAgo(5 + i), paidAt: daysAgo(3 + i), createdAt: daysAgo(10 + i), updatedAt: daysAgo(3 + i) })
  }

  // Chen urgency → paid
  const chenEst = estimateRows.find(e => e.jobId === chenDone.id)!
  invoiceValues.push({ userId, number: nextInv(), jobId: chenDone.id, estimateId: chenEst.id, clientName: cChen.name, clientEmail: cChen.email, status: 'paid', subtotal: '195', tax: '15', total: '210', dueDate: daysFromNow(7), paidAt: new Date(), stripePaymentIntentId: `pi_test_${ts}_2`, createdAt: daysAgo(2), updatedAt: new Date() })

  // Silva old → paid (long ago)
  const silvaEst = estimateRows.find(e => e.clientId === cSilva.id)!
  invoiceValues.push({ userId, number: nextInv(), jobId: silvaJob.id, estimateId: silvaEst.id, clientName: cSilva.name, clientEmail: cSilva.email, status: 'paid', subtotal: '255', tax: '20', total: '275', dueDate: daysAgo(85), paidAt: daysAgo(80), createdAt: daysAgo(90), updatedAt: daysAgo(80) })

  // Mendoza active approved → SENT (pending payment)
  const mendozaEst1 = estimateRows.find(e => e.jobId === mendozaActive.id && e.status === 'approved')!
  invoiceValues.push({ userId, number: nextInv(), jobId: mendozaActive.id, estimateId: mendozaEst1.id, clientName: cMendoza.name, clientEmail: cMendoza.email, status: 'sent', subtotal: '2100', tax: '168', total: '2268', dueDate: daysFromNow(14), shareToken: token(), createdAt: daysAgo(3), updatedAt: daysAgo(3) })

  // Patel (deposit paid) → SENT (balance invoice)
  const patelEst = estimateRows.find(e => e.clientId === cPatel.id)!
  invoiceValues.push({ userId, number: nextInv(), jobId: patelActive.id, estimateId: patelEst.id, clientName: cPatel.name, clientEmail: cPatel.email, status: 'sent', subtotal: '2220', tax: '178', total: '2398', dueDate: daysFromNow(10), createdAt: daysAgo(3), updatedAt: daysAgo(3) })

  // Cooper active with change order → SENT
  const cooperEst = estimateRows.find(e => e.jobId === cooperJob.id)!
  invoiceValues.push({ userId, number: nextInv(), jobId: cooperJob.id, estimateId: cooperEst.id, clientName: cCooper.name, clientEmail: cCooper.email, status: 'sent', subtotal: '1900', tax: '152', total: '2052', dueDate: daysFromNow(7), createdAt: daysAgo(2), updatedAt: daysAgo(2) })

  // DRAFT invoice (not yet sent)
  invoiceValues.push({ userId, number: nextInv(), jobId: mendozaLead.id, clientName: cMendoza.name, clientEmail: cMendoza.email, status: 'draft', subtotal: '2000', tax: '160', total: '2160', dueDate: null, createdAt: daysAgo(1) })

  // CANCELLED invoice
  invoiceValues.push({ userId, number: nextInv(), jobId: chenCancel.id, clientName: cChen.name, clientEmail: cChen.email, status: 'cancelled', subtotal: '500', tax: '40', total: '540', dueDate: daysAgo(20), createdAt: daysAgo(25), updatedAt: daysAgo(20) })

  const invoiceRows = await db.insert(invoices).values(invoiceValues).returning()
  void invoiceEstimateMap

  // D8 fixture: linkear convertedToInvoiceId en estimates con status='converted' → su invoice
  // para que el reverse link "Converted to INV-NNN" aparezca en EstimateDetail.
  const { eq: eqDrizzle } = await import('drizzle-orm')
  const { estimates: estimatesTable } = await import('@/db/schema/estimates')
  for (const inv of invoiceRows) {
    if (!inv.estimateId) continue
    await db.update(estimatesTable)
      .set({ convertedToInvoiceId: inv.id })
      .where(eqDrizzle(estimatesTable.id, inv.estimateId))
      .catch(() => null)
  }

  // Line items for invoices
  for (let idx = 0; idx < invoiceRows.length; idx++) {
    const inv = invoiceRows[idx]
    const labor = catalogLabor[idx % catalogLabor.length]
    const mat = catalogMaterial[idx % catalogMaterial.length]
    const hours = 2 + (idx % 5)
    lineItemValues.push(
      { parentId: inv.id, parentType: 'invoice', type: 'labor',    description: labor.name, quantity: money(hours), unitPrice: labor.unitPrice, total: money(hours * parseFloat(labor.unitPrice)), section: 'Labor', sortOrder: 0 },
      { parentId: inv.id, parentType: 'invoice', type: 'material', description: mat.name,   quantity: '1',          unitPrice: mat.unitPrice,   total: mat.unitPrice,                              section: 'Materials', sortOrder: 1 },
    )
  }
  await db.insert(lineItems).values(lineItemValues)

  // TRV-001 — Recomputar totales desde line items para estimates + invoices del seed
  const { recomputeAndPersistTotals } = await import('@/lib/services/totals')
  await Promise.all([
    ...estimateRows.map(e => recomputeAndPersistTotals('estimate', e.id).catch(() => null)),
    ...invoiceRows.map(i => recomputeAndPersistTotals('invoice', i.id).catch(() => null)),
  ])

  // ═══════════════════════════════════════════════════════════════
  // 9. PAYMENTS — deposit, final, partial, various methods
  // ═══════════════════════════════════════════════════════════════
  const paymentValues: typeof payments['$inferInsert'][] = [
    // Patel deposit (25%)
    { userId, estimateId: patelEst.id, type: 'deposit', amount: '740', status: 'paid', method: 'card', stripePaymentIntentId: `pi_dep_${ts}`, paidAt: daysAgo(3) },
    // Mendoza paid invoice (final via Stripe)
    { userId, invoiceId: invoiceRows[0].id, type: 'final', amount: '325', status: 'paid', method: 'card', stripePaymentIntentId: `pi_test_${ts}_1`, paidAt: daysAgo(10) },
    // Park paid invoice (manual check)
    { userId, invoiceId: invoiceRows[1].id, type: 'final', amount: '1674', status: 'paid', method: 'check', referenceNumber: 'Check #1204', paidAt: daysAgo(1) },
    // Johnson — ACH
    { userId, invoiceId: invoiceRows[3].id, type: 'final', amount: invoiceRows[3].total, status: 'paid', method: 'ach', referenceNumber: `ACH-${ts}`, paidAt: daysAgo(3) },
    // Partial payment pending
    { userId, invoiceId: invoiceRows[6].id, type: 'partial', amount: '500', status: 'paid', method: 'cash', paidAt: daysAgo(2) },
    // Pending milestone (not yet paid)
    { userId, invoiceId: invoiceRows[8].id, type: 'milestone', amount: '1000', status: 'pending', method: 'card' },
    // Failed payment — INV-011 Patel $2,398 (CLI-013: fix de mapping, antes apuntaba a Chen $210)
    { userId, invoiceId: invoiceRows[10].id, type: 'final', amount: '2398', status: 'failed', method: 'card', stripePaymentIntentId: `pi_fail_${ts}` },
  ]
  const paymentRows = await db.insert(payments).values(paymentValues).returning()

  // ═══════════════════════════════════════════════════════════════
  // 10. JOB ↔ TECHNICIAN assignments
  // ═══════════════════════════════════════════════════════════════
  const jobTechValues: typeof jobTechnicians['$inferInsert'][] = [
    // Mendoza active — 2 techs (Owner + Ana busy)
    { jobId: mendozaActive.id, technicianId: owner.id },
    { jobId: mendozaActive.id, technicianId: techCert2.id },
    // Park active
    { jobId: parkActive.id, technicianId: techCert.id },
    // Patel active
    { jobId: patelActive.id, technicianId: owner.id },
    { jobId: patelActive.id, technicianId: techSub.id },
    // Cooper active — Apprentice is "busy" on this
    { jobId: cooperJob.id, technicianId: techApp.id },
    // Walsh scheduled
    { jobId: walshJob.id, technicianId: techCert.id },
    // Completed jobs historical
    { jobId: mendozaDone.id, technicianId: techCert.id },
    { jobId: parkDone.id, technicianId: owner.id },
    { jobId: torresDone.id, technicianId: techApp.id },
    { jobId: chenDone.id, technicianId: owner.id },
  ]
  await db.insert(jobTechnicians).values(jobTechValues)

  // ═══════════════════════════════════════════════════════════════
  // 11. EXPENSES — labor, material, subcontractor, equipment, over-budget
  // ═══════════════════════════════════════════════════════════════
  const expenseValues: typeof expenses['$inferInsert'][] = []
  const now = new Date()
  // LST-007: skip jobs con startDate futura (job no iniciado aún — no debe tener expenses)
  const activeAndDone = jobRows.filter(j =>
    (j.status === 'active' || j.status === 'completed')
    && (!j.startDate || j.startDate <= now)
  )
  for (let idx = 0; idx < activeAndDone.length; idx++) {
    const job = activeAndDone[idx]
    const tech = techRows[idx % (techRows.length - 1)]
    const hours = 2 + (idx % 5)
    const rate = tech.hourlyRate ? parseFloat(tech.hourlyRate) : 65
    // Fecha de expense: startDate si existe y es pasada, sino daysAgo(idx+1)
    const expenseDate = job.startDate && job.startDate <= now ? job.startDate : daysAgo(idx + 1)
    expenseValues.push({
      userId, jobId: job.id,
      description: `Labor — ${tech.name}`,
      type: 'labor',
      amount: money(hours * rate),
      technicianId: tech.id,
      hours: money(hours),
      ratePerHour: money(rate),
      date: expenseDate,
    })
    expenseValues.push({
      userId, jobId: job.id,
      description: catalogMaterial[idx % catalogMaterial.length].name,
      type: 'material',
      amount: money(50 + (idx * 23) % 380),
      technicianId: null, hours: null, ratePerHour: null,
      date: expenseDate,
    })
    if (idx % 4 === 0) {
      expenseValues.push({
        userId, jobId: job.id,
        description: 'Hydro-jetting subcontractor',
        type: 'subcontractor',
        amount: '380',
        technicianId: techSub.id,
        hours: null, ratePerHour: null,
        date: expenseDate,
      })
    }
    if (idx % 5 === 0) {
      expenseValues.push({
        userId, jobId: job.id,
        description: 'Equipment rental — snake',
        type: 'other',
        amount: '45',
        technicianId: null, hours: null, ratePerHour: null,
        date: expenseDate,
      })
    }
  }
  // Extra pipe on Cooper — triggers over-budget scenario cuando se suma CO aprobado
  expenseValues.push({
    userId, jobId: cooperJob.id,
    description: 'Extra pipe — rework galvanizada',
    type: 'material', amount: '350',
    technicianId: null, hours: null, ratePerHour: null,
    date: daysAgo(2),
  })
  await db.insert(expenses).values(expenseValues)

  // ═══════════════════════════════════════════════════════════════
  // 12. SHOPPING LISTS — 6 scenarios
  // ═══════════════════════════════════════════════════════════════
  const shoppingListRows: typeof shoppingLists['$inferSelect'][] = []
  const shoppingListItemValues: typeof shoppingListItems['$inferInsert'][] = []

  // A. Active linked to Mendoza active (50% purchased, multi-vendor)
  const listA = (await db.insert(shoppingLists).values({ userId, name: 'Compras baño Mendoza', jobId: mendozaActive.id, status: 'active' }).returning())[0]
  shoppingListRows.push(listA)
  ;['Copper pipe ½"', 'Ball valve brass ½"', 'Toilet Kohler standard', 'PEX tubing ¾"', 'Drain snake rental (day)', 'Pressure tank 20gal'].forEach((n, k) => {
    const m = catalogRows.find(c => c.name === n)!
    shoppingListItemValues.push({
      shoppingListId: listA.id, description: m.name,
      quantity: money(k + 1), unit: m.unit, estimatedCost: money(parseFloat(m.unitPrice) * (k + 1)),
      status: k < 3 ? 'purchased' : 'pending',
      purchasedAt: k < 3 ? daysAgo(k) : null,
      vendor: k % 2 === 0 ? 'Home Depot' : 'Ferguson',
      aisle: `A${10 + k}`, sortOrder: k,
    })
  })

  // B. Active standalone (no job)
  const listB = (await db.insert(shoppingLists).values({ userId, name: 'Stock general — Q2', jobId: null, status: 'active' }).returning())[0]
  shoppingListRows.push(listB)
  shoppingListItemValues.push(
    { shoppingListId: listB.id, description: 'PEX tubing ¾"',        quantity: '100', unit: 'ft',   estimatedCost: '120', status: 'pending', vendor: 'Home Depot', aisle: 'B12', sortOrder: 0 },
    { shoppingListId: listB.id, description: 'Copper pipe ½"',       quantity: '50',  unit: 'ft',   estimatedCost: '240', status: 'pending', vendor: 'Ferguson',  aisle: 'B14', sortOrder: 1 },
    { shoppingListId: listB.id, description: 'Ball valve brass ½"',  quantity: '20',  unit: 'each', estimatedCost: '250', status: 'pending', vendor: 'Lowes',     aisle: 'C05', sortOrder: 2 },
  )

  // C. Completed (all purchased)
  const listC = (await db.insert(shoppingLists).values({ userId, name: 'Park — calentador', jobId: parkDone.id, status: 'completed' }).returning())[0]
  shoppingListRows.push(listC)
  shoppingListItemValues.push(
    { shoppingListId: listC.id, description: 'Water heater 40gal', quantity: '1', unit: 'each', estimatedCost: '620', status: 'purchased', purchasedAt: daysAgo(9), vendor: 'Home Depot', aisle: 'H02', sortOrder: 0 },
    { shoppingListId: listC.id, description: 'Copper pipe ½"',    quantity: '12', unit: 'ft', estimatedCost: '58', status: 'purchased', purchasedAt: daysAgo(9), vendor: 'Home Depot', aisle: 'A10', sortOrder: 1 },
  )

  // D. Empty list
  const listD = (await db.insert(shoppingLists).values({ userId, name: 'Lista vacía (sin items)', jobId: null, status: 'active' }).returning())[0]
  shoppingListRows.push(listD)

  // E. With shareToken (portal access)
  const listE = (await db.insert(shoppingLists).values({ userId, name: 'Cooper — tubería galvanizada', jobId: cooperJob.id, status: 'active', shareToken: token() }).returning())[0]
  shoppingListRows.push(listE)
  shoppingListItemValues.push(
    { shoppingListId: listE.id, description: 'Copper pipe ½"',       quantity: '40', unit: 'ft',   estimatedCost: '192', status: 'pending', vendor: 'Ferguson', aisle: 'A10', sortOrder: 0 },
    { shoppingListId: listE.id, description: 'Ball valve brass ½"',  quantity: '8',  unit: 'each', estimatedCost: '100', status: 'pending', vendor: 'Ferguson', aisle: 'B12', sortOrder: 1 },
  )

  // F. Single vendor (Home Depot only)
  const listF = (await db.insert(shoppingLists).values({ userId, name: 'Patel — clínica dental', jobId: patelActive.id, status: 'active' }).returning())[0]
  shoppingListRows.push(listF)
  shoppingListItemValues.push(
    { shoppingListId: listF.id, description: 'PEX tubing ¾"',        quantity: '30', unit: 'ft',   estimatedCost: '36',  status: 'pending', vendor: 'Home Depot', aisle: 'A05', sortOrder: 0 },
    { shoppingListId: listF.id, description: 'Pressure tank 20gal',  quantity: '1',  unit: 'each', estimatedCost: '180', status: 'pending', vendor: 'Home Depot', aisle: 'H08', sortOrder: 1 },
    { shoppingListId: listF.id, description: 'Toilet Kohler standard', quantity: '2', unit: 'each', estimatedCost: '480', status: 'pending', vendor: 'Home Depot', aisle: 'H15', sortOrder: 2 },
  )

  if (shoppingListItemValues.length > 0) await db.insert(shoppingListItems).values(shoppingListItemValues)

  // ═══════════════════════════════════════════════════════════════
  // 13. CHANGE ORDERS — draft / sent / approved+signed / rejected
  // ═══════════════════════════════════════════════════════════════
  const changeOrderValues: typeof changeOrders['$inferInsert'][] = [
    { userId, jobId: cooperJob.id, estimateId: cooperEst.id, number: 'CO-001', description: 'Add extra copper pipe replacement', status: 'approved', subtotal: '320', tax: '26', total: '346', signatureDataUrl: 'data:image/svg+xml;base64,PHN2Zy8+', signedByName: 'Daniel Cooper', signedAt: daysAgo(1), shareToken: token() },
    { userId, jobId: mendozaActive.id, estimateId: mendozaEst1.id, number: 'CO-002', description: 'Upgrade fixtures to premium line', status: 'sent', subtotal: '450', tax: '36', total: '486', shareToken: token() },
    { userId, jobId: patelActive.id, number: 'CO-003', description: 'Additional dental chair plumbing', status: 'draft', subtotal: '580', tax: '46', total: '626' },
    { userId, jobId: ramirezHold.id, number: 'CO-004', description: 'Expand irrigation zones', status: 'rejected', subtotal: '800', tax: '64', total: '864' },
  ]
  const changeOrderRows = await db.insert(changeOrders).values(changeOrderValues).returning()

  // ═══════════════════════════════════════════════════════════════
  // 14. WORK ORDERS — pending / in_progress / completed
  // ═══════════════════════════════════════════════════════════════
  const workOrderValues: typeof workOrders['$inferInsert'][] = [
    { userId, jobId: walshJob.id,     number: 'WO-001', title: 'Inspección inicial',          instructions: 'Revisar tuberías principales, presión y drenajes.', scheduledDate: daysFromNow(2), status: 'pending',     assignedTechnicianIds: [techCert.id] },
    { userId, jobId: mendozaActive.id, number: 'WO-002', title: 'Demolición baño principal',   instructions: 'Retirar azulejos y tina existente.',                scheduledDate: new Date(),     status: 'in_progress', assignedTechnicianIds: [owner.id, techCert2.id] },
    { userId, jobId: patelActive.id,  number: 'WO-003', title: 'Instalación equipos dental',   instructions: 'Conectar 4 sillones y esterilizador central.',      scheduledDate: daysAgo(1),     status: 'in_progress', assignedTechnicianIds: [owner.id] },
    { userId, jobId: parkDone.id,     number: 'WO-004', title: 'Reemplazo calentador',         instructions: 'Retirar viejo, instalar nuevo 40gal.',              scheduledDate: daysAgo(10),    status: 'completed',   assignedTechnicianIds: [owner.id] },
    { userId, jobId: cooperJob.id,    number: 'WO-005', title: 'Sustitución línea principal',  instructions: 'Reemplazar tubería galvanizada por cobre.',         scheduledDate: daysAgo(8),     status: 'in_progress', assignedTechnicianIds: [techApp.id] },
  ]
  const workOrderRows = await db.insert(workOrders).values(workOrderValues).returning()

  // ═══════════════════════════════════════════════════════════════
  // 15. JOB CHECKLISTS — completed + pending items
  // ═══════════════════════════════════════════════════════════════
  const checklistValues: typeof jobChecklistItems['$inferInsert'][] = []
  for (const job of [mendozaActive, patelActive, cooperJob]) {
    checklistValues.push(
      { jobId: job.id, label: 'Confirmar acceso con cliente',     completed: true,  completedAt: daysAgo(2), sortOrder: 0 },
      { jobId: job.id, label: 'Comprar materiales',               completed: true,  completedAt: daysAgo(1), sortOrder: 1 },
      { jobId: job.id, label: 'Verificar presión inicial',        completed: true,  completedAt: daysAgo(1), sortOrder: 2 },
      { jobId: job.id, label: 'Completar instalación',            completed: false, completedAt: null,       sortOrder: 3 },
      { jobId: job.id, label: 'Prueba de presión final',          completed: false, completedAt: null,       sortOrder: 4 },
      { jobId: job.id, label: 'Limpieza y entrega',               completed: false, completedAt: null,       sortOrder: 5 },
    )
  }
  await db.insert(jobChecklistItems).values(checklistValues)

  // ═══════════════════════════════════════════════════════════════
  // 16. NOTIFICATIONS — unread + read mix
  // ═══════════════════════════════════════════════════════════════
  const notificationValues: typeof notifications['$inferInsert'][] = [
    // UNREAD
    { userId, type: 'invoice_overdue',  title: 'Invoice overdue',   body: `INV-003 (${cTorres.name}) está vencida hace 20 días.`,  href: `/invoices/${invoiceRows[2].id}`, read: false, createdAt: daysAgo(1) },
    { userId, type: 'invoice_paid',     title: 'Invoice paid',      body: `${cPark.name} pagó INV-002 por $1,674.`,                  href: `/invoices/${invoiceRows[1].id}`, read: false, createdAt: daysAgo(1) },
    { userId, type: 'estimate_approved', title: 'Estimate approved', body: `${cPatel.name} aprobó un estimate por $3,197.`,           href: `/estimates/${patelEst.id}`,    read: false, createdAt: daysAgo(3) },
    { userId, type: 'document_viewed',  title: 'Estimate viewed',   body: `${cWalsh.name} abrió tu estimate.`,                       href: `/estimates/${estimateRows.at(-1)!.id}`, read: false, createdAt: daysAgo(1) },
    { userId, type: 'shopping_list_created', title: 'Nueva lista',  body: `Lista "Compras baño Mendoza" creada con 6 items.`,        href: `/shopping-list/${listA.id}`,   read: false, createdAt: daysAgo(2) },
    // READ (older)
    { userId, type: 'invoice_paid',     title: 'Invoice paid',      body: `${cJohnson.name} pagó INV-004 por $367.`,                 href: `/invoices/${invoiceRows[3].id}`, read: true,  createdAt: daysAgo(10) },
    { userId, type: 'job_completed_no_invoice', title: 'Job sin invoice', body: `${cMendoza.name} — Reparación fuga cocina completada sin invoice.`, href: `/projects/${mendozaDone.id}`, read: true, createdAt: daysAgo(18) },
    { userId, type: 'estimate_approved', title: 'Estimate approved', body: `${cPark.name} aprobó un estimate.`,                      href: `/estimates/${parkEst0.id}`,    read: true,  createdAt: daysAgo(12) },
    { userId, type: 'document_viewed',  title: 'Invoice viewed',    body: `${cMendoza.name} abrió el invoice INV-001.`,              href: `/invoices/${invoiceRows[0].id}`, read: true, createdAt: daysAgo(9) },
    { userId, type: 'invoice_overdue',  title: 'Invoice overdue (resolved)', body: `INV antiguo de Silva — pagado desde.`,           href: `/invoices/${invoiceRows[5].id}`, read: true,  createdAt: daysAgo(85) },
  ]
  const notificationRows = await db.insert(notifications).values(notificationValues).returning()

  // ═══════════════════════════════════════════════════════════════
  // 17. REFERRALS — pending / signed_up / subscribed
  // ═══════════════════════════════════════════════════════════════
  const referralRows = await db.insert(referrals).values([
    { referrerId: userId, referredEmail: `pending1.${ts}@ex.com`,    status: 'pending',     reward: '0',   referredUserId: null },
    { referrerId: userId, referredEmail: `signup.${ts}@ex.com`,      status: 'signed_up',   reward: '0',   referredUserId: 'user_pending_reward' },
    { referrerId: userId, referredEmail: `subscribed.${ts}@ex.com`,  status: 'subscribed',  reward: '50',  referredUserId: 'user_paid' },
  ]).returning()

  // ═══════════════════════════════════════════════════════════════
  // 18. AI PREFERENCES — auto-learned + user-added
  // ═══════════════════════════════════════════════════════════════
  const aiPrefRows = await db.insert(aiPreferences).values([
    { userId, key: 'default_markup',           value: '20%',                                 learnedFrom: 'user_added' },
    { userId, key: 'payment_terms',            value: 'Net 30 for commercial, Net 15 residential', learnedFrom: 'conversation_2026_03_10' },
    { userId, key: 'preferred_vendor',         value: 'Ferguson para cobre, Home Depot para PVC', learnedFrom: 'user_edited' },
    { userId, key: 'emergency_call_fee',       value: '$150 flat + hourly rate',             learnedFrom: 'estimate_pattern' },
    { userId, key: 'communication_style',      value: 'Directo, sin rodeos. Siempre en español si el cliente lo habla.', learnedFrom: 'auto_learned' },
  ]).returning()

  // ═══════════════════════════════════════════════════════════════
  // Cleanup & return summary
  // ═══════════════════════════════════════════════════════════════
  invalidateUserData(userId)
  revalidatePath('/[locale]', 'layout')

  return {
    clients: clientRows.length,
    jobs: jobRows.length,
    estimates: estimateRows.length,
    invoices: invoiceRows.length,
    technicians: techRows.length,
    expenses: expenseValues.length,
    lineItems: lineItemValues.length,
    catalogItems: catalogRows.length,
    shoppingLists: shoppingListRows.length,
    shoppingListItems: shoppingListItemValues.length,
    payments: paymentRows.length,
    changeOrders: changeOrderRows.length,
    workOrders: workOrderRows.length,
    contracts: contractRows.length,
    notifications: notificationRows.length,
    referrals: referralRows.length,
    aiPreferences: aiPrefRows.length,
    jobChecklistItems: checklistValues.length,
  }
}

/** Wipe all data owned by the current user. */
export async function wipeMyData(): Promise<void> {
  assertDev()
  const userId = await requireUser()

  const tables = [
    'payment_milestones',
    'payments',
    'work_orders',
    'change_orders',
    'job_checklist_items', // cascaded via jobs — but try
    'line_items',           // cascaded via parent
    'invoices',
    'estimates',
    'expenses',
    'shopping_list_items',  // cascaded via list
    'shopping_lists',
    'photos',
    'contracts',
    'document_views',
    'notifications',
    'referrals',
    'ai_preferences',
    'qbo_connections',
    'catalog_items',
    'estimate_templates',
    'job_technicians',
    'technicians',
    'jobs',
    'clients',
  ]

  for (const t of tables) {
    try {
      // Some tables have user_id; some don't (line_items, shopping_list_items, etc.).
      // Try with user_id first; if column doesn't exist, try referrer_id (referrals) or skip.
      if (t === 'referrals') {
        await db.execute(sql.raw(`DELETE FROM "${t}" WHERE "referrer_id" = '${userId.replace(/'/g, "''")}'`))
        continue
      }
      if (t === 'line_items' || t === 'shopping_list_items' || t === 'job_checklist_items' || t === 'job_technicians' || t === 'payment_milestones' || t === 'document_views') {
        // These tables don't have user_id — rely on parent FK cascade
        continue
      }
      await db.execute(sql.raw(`DELETE FROM "${t}" WHERE "user_id" = '${userId.replace(/'/g, "''")}'`))
    } catch {
      // ignore errors for tables that may not exist or have different schema
    }
  }

  invalidateUserData(userId)
  revalidatePath('/[locale]', 'layout')
}
