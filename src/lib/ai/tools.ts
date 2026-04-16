// Tool definitions for Claude API tool use
// Only safe, non-destructive operations + create/update actions
// NO delete operations exposed to the AI

const str = (desc: string) => ({ type: 'string' as const, description: desc })
const num = (desc: string) => ({ type: 'number' as const, description: desc })
const optStr = (desc: string) => ({ type: 'string' as const, description: `(Optional) ${desc}` })

// Tools that duplicate the snapshot (general reads) — excluded from default set to save tokens
const SNAPSHOT_TOOLS = new Set([
  'get_jobs', 'get_estimates', 'get_invoices', 'get_clients',
  'get_dashboard_stats', 'get_technicians', 'get_catalog_items',
  'get_overdue_invoices', 'get_pending_estimates',
])

export const assistantTools = [
  // ===== READ OPERATIONS =====
  {
    name: 'get_jobs',
    description: 'Get all jobs. Can filter by status. Returns job name, client, status, dates, budget, actual cost.',
    input_schema: {
      type: 'object' as const,
      properties: { status: optStr('Filter: lead, active, on_hold, completed, cancelled') },
      required: [],
    },
  },
  {
    name: 'get_estimates',
    description: 'Get all estimates. Can filter by status. Returns number, client, status, total.',
    input_schema: {
      type: 'object' as const,
      properties: { status: optStr('Filter: draft, sent, approved, rejected, converted') },
      required: [],
    },
  },
  {
    name: 'get_invoices',
    description: 'Get all invoices with revenue summary. Can filter by status.',
    input_schema: {
      type: 'object' as const,
      properties: { status: optStr('Filter: draft, sent, paid, overdue, cancelled') },
      required: [],
    },
  },
  {
    name: 'get_clients',
    description: 'Get all clients with contact info, or search by name.',
    input_schema: {
      type: 'object' as const,
      properties: { search: optStr('Search by client name') },
      required: [],
    },
  },
  {
    name: 'get_client_history',
    description: 'Get full history for a specific client: all jobs, estimates, and invoices.',
    input_schema: {
      type: 'object' as const,
      properties: { clientName: str('Client name to look up') },
      required: ['clientName'],
    },
  },
  {
    name: 'get_expenses',
    description: 'Get expenses for a specific job. Returns description, type, amount, date, and total.',
    input_schema: {
      type: 'object' as const,
      properties: { jobId: str('The job ID') },
      required: ['jobId'],
    },
  },
  {
    name: 'get_estimate_line_items',
    description: 'Get the line items (materials/labor/work breakdown) of a specific estimate. Use when the user asks "what\'s in estimate EST-X" or "what materials/items does this estimate include". Can resolve by UUID or by number like EST-002.',
    input_schema: {
      type: 'object' as const,
      properties: {
        estimateId: optStr('The estimate UUID'),
        estimateNumber: optStr('The estimate number like EST-002'),
      },
      required: [],
    },
  },
  {
    name: 'get_invoice_line_items',
    description: 'Get the line items of a specific invoice. Use when the user asks what is in invoice INV-X or what items it contains. Can resolve by UUID or by number like INV-001.',
    input_schema: {
      type: 'object' as const,
      properties: {
        invoiceId: optStr('The invoice UUID'),
        invoiceNumber: optStr('The invoice number like INV-001'),
      },
      required: [],
    },
  },
  {
    name: 'get_dashboard_stats',
    description: 'Get business KPIs: active jobs, open invoices, revenue this month, average margin, overdue invoices.',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'get_technicians',
    description: 'Get all crew members/technicians with their rates.',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'get_change_orders',
    description: 'Get change orders for a specific job.',
    input_schema: {
      type: 'object' as const,
      properties: { jobId: str('The job ID') },
      required: ['jobId'],
    },
  },
  {
    name: 'get_work_orders',
    description: 'Get work orders for a specific job.',
    input_schema: {
      type: 'object' as const,
      properties: { jobId: str('The job ID') },
      required: ['jobId'],
    },
  },
  {
    name: 'get_catalog_items',
    description: 'Get the item catalog (saved materials, labor rates, etc.)',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'get_job_profitability',
    description: 'Calculate profitability for a specific job: budget vs actual costs, margin, expenses breakdown.',
    input_schema: {
      type: 'object' as const,
      properties: { jobId: str('The job ID') },
      required: ['jobId'],
    },
  },
  {
    name: 'get_overdue_invoices',
    description: 'Get all overdue invoices with client info and days overdue.',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'get_pending_estimates',
    description: 'Get estimates that are sent but not yet approved, with days waiting.',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },

  // ===== CREATE OPERATIONS =====
  {
    name: 'create_job',
    description: 'Create a new job/project.',
    input_schema: {
      type: 'object' as const,
      properties: {
        name: str('Job name/title'),
        clientName: str('Client full name'),
        clientEmail: optStr('Client email'),
        clientPhone: optStr('Client phone'),
        address: optStr('Job site address'),
        status: { type: 'string' as const, enum: ['lead', 'active'], description: 'Initial status (default: lead)' },
        budgetedCost: optStr('Budget amount'),
        notes: optStr('Job notes'),
      },
      required: ['name', 'clientName'],
    },
  },
  {
    name: 'create_estimate',
    description: 'Create a new estimate for a client with line items.',
    input_schema: {
      type: 'object' as const,
      properties: {
        clientName: str('Client full name'),
        clientEmail: optStr('Client email'),
        clientPhone: optStr('Client phone'),
        jobId: optStr('Link to existing job ID'),
        notes: optStr('Estimate notes'),
        items: {
          type: 'array' as const,
          description: 'Line items',
          items: {
            type: 'object' as const,
            properties: {
              type: { type: 'string' as const, enum: ['labor', 'material', 'subcontractor', 'other'] },
              description: str('Item description'),
              quantity: num('Quantity'),
              unitPrice: num('Price per unit'),
            },
            required: ['type', 'description', 'quantity', 'unitPrice'],
          },
        },
      },
      required: ['clientName', 'items'],
    },
  },
  {
    name: 'create_invoice_from_estimate',
    description: 'Convert an approved estimate into an invoice. Can use ID or number.',
    input_schema: {
      type: 'object' as const,
      properties: {
        estimateId: optStr('The estimate UUID'),
        estimateNumber: optStr('The estimate number like EST-001'),
      },
      required: [],
    },
  },
  {
    name: 'create_client',
    description: 'Create a new client.',
    input_schema: {
      type: 'object' as const,
      properties: {
        name: str('Client full name'),
        email: optStr('Email address'),
        phone: optStr('Phone number'),
        address: optStr('Address'),
        notes: optStr('Notes about this client'),
      },
      required: ['name'],
    },
  },
  {
    name: 'create_expense',
    description: 'Log an expense for a job.',
    input_schema: {
      type: 'object' as const,
      properties: {
        jobId: str('The job ID'),
        description: str('Expense description'),
        type: { type: 'string' as const, enum: ['labor', 'material', 'subcontractor', 'other'] },
        amount: num('Amount in dollars'),
      },
      required: ['jobId', 'description', 'type', 'amount'],
    },
  },
  {
    name: 'record_payment',
    description: 'Record a payment received for an invoice.',
    input_schema: {
      type: 'object' as const,
      properties: {
        invoiceId: str('The invoice ID'),
        amount: num('Payment amount'),
        method: { type: 'string' as const, enum: ['card', 'ach', 'check', 'cash'], description: 'Payment method' },
        referenceNumber: optStr('Check number or reference'),
      },
      required: ['invoiceId', 'amount', 'method'],
    },
  },

  // ===== UPDATE OPERATIONS (safe) =====
  {
    name: 'update_job_status',
    description: 'Update the status of a job.',
    input_schema: {
      type: 'object' as const,
      properties: {
        jobId: str('The job ID'),
        status: { type: 'string' as const, enum: ['lead', 'active', 'on_hold', 'completed', 'cancelled'] },
      },
      required: ['jobId', 'status'],
    },
  },
  {
    name: 'update_estimate_status',
    description: 'Update estimate status (e.g. mark as sent). Can use ID or number.',
    input_schema: {
      type: 'object' as const,
      properties: {
        estimateId: optStr('The estimate UUID'),
        estimateNumber: optStr('The estimate number like EST-002'),
        status: { type: 'string' as const, enum: ['draft', 'sent'] },
      },
      required: ['status'],
    },
  },
  {
    name: 'send_estimate_email',
    description: 'Send an estimate to the client via email. Can use estimate ID or estimate number (e.g. EST-002).',
    input_schema: {
      type: 'object' as const,
      properties: {
        estimateId: optStr('The estimate UUID. Use this if you have it.'),
        estimateNumber: optStr('The estimate number like EST-002. Use this if the user refers to an estimate by number.'),
      },
      required: [],
    },
  },
  {
    name: 'send_invoice_email',
    description: 'Send an invoice to the client via email. LEVEL 2 ACTION — always confirm with user before calling.',
    input_schema: {
      type: 'object' as const,
      properties: { invoiceId: str('The invoice ID to send') },
      required: ['invoiceId'],
    },
  },

  // ===== NEW TOOLS — Extended capabilities =====
  {
    name: 'update_client',
    description: 'Update a client\'s details (name, email, phone, address, notes). Level 1 — execute directly.',
    input_schema: {
      type: 'object' as const,
      properties: {
        clientId: str('The client ID'),
        name: optStr('Updated name'),
        email: optStr('Updated email'),
        phone: optStr('Updated phone'),
        address: optStr('Updated address'),
        notes: optStr('Updated notes'),
      },
      required: ['clientId'],
    },
  },
  {
    name: 'update_job',
    description: 'Update job details (name, budget, dates, address, notes). For status changes use update_job_status instead.',
    input_schema: {
      type: 'object' as const,
      properties: {
        jobId: str('The job ID'),
        name: optStr('Updated job name'),
        budgetedCost: optStr('Updated budget amount'),
        address: optStr('Updated address'),
        notes: optStr('Updated notes'),
        startDate: optStr('Start date ISO string'),
        endDate: optStr('End date ISO string'),
      },
      required: ['jobId'],
    },
  },
  {
    name: 'update_estimate',
    description: 'Update estimate details (notes, validUntil, markup, discount). For status changes use update_estimate_status.',
    input_schema: {
      type: 'object' as const,
      properties: {
        estimateId: str('The estimate ID'),
        notes: optStr('Updated notes'),
        validUntil: optStr('Expiration date ISO string'),
        markupPercent: optStr('Global markup percentage'),
        discountAmount: optStr('Discount amount'),
        discountPercent: optStr('Discount percentage'),
      },
      required: ['estimateId'],
    },
  },
  {
    name: 'create_invoice',
    description: 'Create a new invoice directly (not from estimate) with line items.',
    input_schema: {
      type: 'object' as const,
      properties: {
        clientName: str('Client full name'),
        clientEmail: optStr('Client email'),
        jobId: optStr('Link to existing job ID'),
        dueDate: optStr('Due date ISO string'),
        notes: optStr('Invoice notes'),
        items: {
          type: 'array' as const,
          description: 'Line items',
          items: {
            type: 'object' as const,
            properties: {
              type: { type: 'string' as const, enum: ['labor', 'material', 'subcontractor', 'other'] },
              description: str('Item description'),
              quantity: num('Quantity'),
              unitPrice: num('Price per unit'),
            },
            required: ['type', 'description', 'quantity', 'unitPrice'],
          },
        },
      },
      required: ['clientName', 'items'],
    },
  },
  {
    name: 'update_invoice',
    description: 'Update invoice details (dueDate, notes, status).',
    input_schema: {
      type: 'object' as const,
      properties: {
        invoiceId: str('The invoice ID'),
        dueDate: optStr('Updated due date ISO string'),
        notes: optStr('Updated notes'),
        status: optStr('Updated status: draft, sent, paid, cancelled'),
      },
      required: ['invoiceId'],
    },
  },
  {
    name: 'create_change_order',
    description: 'Create a change order for a job (Pro plan only). Adds/modifies scope and adjusts budget.',
    input_schema: {
      type: 'object' as const,
      properties: {
        jobId: str('The job ID'),
        description: str('Description of the change'),
        notes: optStr('Additional notes'),
        items: {
          type: 'array' as const,
          description: 'Change order line items',
          items: {
            type: 'object' as const,
            properties: {
              type: { type: 'string' as const, enum: ['labor', 'material', 'subcontractor', 'other'] },
              description: str('Item description'),
              quantity: num('Quantity'),
              unitPrice: num('Price per unit'),
            },
            required: ['type', 'description', 'quantity', 'unitPrice'],
          },
        },
      },
      required: ['jobId', 'description', 'items'],
    },
  },
  {
    name: 'create_work_order',
    description: 'Create a work order for a job (Pro plan only). Assigns tasks to technicians.',
    input_schema: {
      type: 'object' as const,
      properties: {
        jobId: str('The job ID'),
        title: str('Work order title'),
        instructions: optStr('Detailed instructions for the crew'),
        scheduledDate: optStr('Scheduled date ISO string'),
        technicianIds: { type: 'array' as const, items: { type: 'string' as const }, description: '(Optional) Technician IDs to assign' },
      },
      required: ['jobId', 'title'],
    },
  },
  {
    name: 'create_catalog_item',
    description: 'Add an item to the reusable catalog (materials, labor rates, etc.)',
    input_schema: {
      type: 'object' as const,
      properties: {
        name: str('Item name'),
        type: { type: 'string' as const, enum: ['labor', 'material', 'subcontractor', 'other'] },
        unitPrice: str('Default unit price'),
        description: optStr('Item description'),
        category: optStr('Category for organization'),
      },
      required: ['name', 'type', 'unitPrice'],
    },
  },
  {
    name: 'create_technician',
    description: 'Add a new crew member/technician.',
    input_schema: {
      type: 'object' as const,
      properties: {
        name: str('Full name'),
        email: str('Email address'),
        phone: optStr('Phone number'),
        hourlyRate: optStr('Hourly rate in dollars'),
      },
      required: ['name', 'email'],
    },
  },
  {
    name: 'assign_technician',
    description: 'Assign a technician to a job. Will warn about scheduling conflicts.',
    input_schema: {
      type: 'object' as const,
      properties: {
        jobId: str('The job ID'),
        technicianId: str('The technician ID'),
      },
      required: ['jobId', 'technicianId'],
    },
  },

  // ===== PREFERENCES =====
  {
    name: 'get_preferences',
    description: 'Get saved user preferences (default markup, tax rate, pricing habits, etc.)',
    input_schema: { type: 'object' as const, properties: {}, required: [] },
  },
  {
    name: 'save_preference',
    description: 'Save a user preference for future use. Call when user says "always", "by default", "from now on", or when you detect a repeated pattern.',
    input_schema: {
      type: 'object' as const,
      properties: {
        key: str('Preference key (e.g. default_markup, default_tax_rate, pricing_kitchen_remodel)'),
        value: str('Preference value'),
        learnedFrom: optStr('How this was learned (e.g. "User said: always use 20% markup")'),
      },
      required: ['key', 'value'],
    },
  },
  {
    name: 'create_shopping_list',
    description: 'Create a shopping/materials list for a job. Items are things the contractor needs to buy.',
    input_schema: {
      type: 'object' as const,
      properties: {
        name: str('List name (e.g. "Materiales Baño - Mendoza")'),
        jobId: optStr('Job ID to link this list to'),
        items: {
          type: 'array' as const,
          description: 'Items to buy',
          items: {
            type: 'object' as const,
            properties: {
              description: str('Item description'),
              quantity: optStr('Quantity'),
              unit: optStr('Unit (m², unidad, galón, etc.)'),
              estimatedCost: str('Estimated cost'),
            },
            required: ['description', 'estimatedCost'],
          },
        },
      },
      required: ['name', 'items'],
    },
  },
]

// Essential tools: detail queries + all actions (excludes general reads that duplicate snapshot)
// ~24 tools instead of ~37 — saves ~2,000 tokens per request
export const essentialTools = assistantTools.filter(t => !SNAPSHOT_TOOLS.has(t.name))
