// All email HTML templates for WorkPilot automations

const BASE_STYLE = `font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1e293b; line-height: 1.6;`
const BUTTON_STYLE = `display: inline-block; background: #1E3A5F; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;`
const CARD_STYLE = `background: #f8fafc; border-radius: 12px; padding: 24px; margin: 24px 0;`

function layout(content: string) {
  return `
    <div style="${BASE_STYLE} max-width: 600px; margin: 0 auto; padding: 32px 16px;">
      <div style="margin-bottom: 32px;">
        <span style="font-size: 20px; font-weight: 700; color: #1E3A5F;">WorkPilot</span>
      </div>
      ${content}
      <div style="margin-top: 48px; padding-top: 24px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8;">
        WorkPilot — Field Service Management
      </div>
    </div>
  `
}

export function estimateSentEmail(opts: {
  clientName: string
  estimateNumber: string
  total: string
  validUntil: string | null
  notes: string | null
  contractorName: string
  portalUrl?: string
}) {
  return layout(`
    <h1 style="font-size: 24px; font-weight: 700; margin-bottom: 8px;">Your Estimate is Ready</h1>
    <p style="color: #64748b; margin-bottom: 0;">Hi ${opts.clientName},</p>
    <p>Please find your estimate details below from <strong>${opts.contractorName}</strong>.</p>

    <div style="${CARD_STYLE}">
      <table style="width: 100%; font-size: 14px;">
        <tr><td style="color: #64748b; padding: 4px 0;">Estimate #</td><td style="text-align: right; font-weight: 600;">${opts.estimateNumber}</td></tr>
        <tr><td style="color: #64748b; padding: 4px 0;">Total</td><td style="text-align: right; font-weight: 700; font-size: 18px; color: #1E3A5F;">$${parseFloat(opts.total).toLocaleString()}</td></tr>
        ${opts.validUntil ? `<tr><td style="color: #64748b; padding: 4px 0;">Valid Until</td><td style="text-align: right;">${new Date(opts.validUntil).toLocaleDateString()}</td></tr>` : ''}
      </table>
    </div>

    ${opts.notes ? `<p style="color: #64748b; font-size: 14px;"><strong>Notes:</strong> ${opts.notes}</p>` : ''}

    ${opts.portalUrl ? `
    <div style="margin: 24px 0; text-align: center;">
      <a href="${opts.portalUrl}" style="${BUTTON_STYLE}">Review &amp; Approve Estimate →</a>
    </div>
    <p style="color: #94a3b8; font-size: 12px; text-align: center;">Or copy this link: ${opts.portalUrl}</p>
    ` : `<p style="color: #64748b; font-size: 14px;">Please review and contact us if you have any questions.</p>`}
  `)
}

export function estimateFollowUpEmail(opts: {
  clientName: string
  estimateNumber: string
  total: string
  contractorName: string
  daysSinceSent: number
}) {
  return layout(`
    <h1 style="font-size: 22px; font-weight: 700; margin-bottom: 8px;">Following Up on Your Estimate</h1>
    <p>Hi ${opts.clientName},</p>
    <p>Just checking in — we sent you estimate <strong>${opts.estimateNumber}</strong> ${opts.daysSinceSent} days ago and haven't heard back yet.</p>

    <div style="${CARD_STYLE}">
      <p style="margin: 0; font-size: 14px; color: #64748b;">Estimate Total</p>
      <p style="margin: 4px 0 0; font-size: 22px; font-weight: 700; color: #1E3A5F;">$${parseFloat(opts.total).toLocaleString()}</p>
    </div>

    <p>If you have any questions or need adjustments, we're happy to help. Just reply to this email.</p>
    <p style="color: #64748b; font-size: 14px;">— ${opts.contractorName}</p>
  `)
}

export function jobCompletedInvoiceDueEmail(opts: {
  contractorEmail: string
  jobName: string
  clientName: string
  invoiceNumber: string
  total: string
  appUrl: string
}) {
  return layout(`
    <h1 style="font-size: 22px; font-weight: 700; margin-bottom: 8px;">Job Completed — Invoice Ready to Send</h1>
    <p>The job <strong>${opts.jobName}</strong> has been marked as completed.</p>
    <p>There's an invoice in <strong>Draft</strong> status waiting to be sent to your client.</p>

    <div style="${CARD_STYLE}">
      <table style="width: 100%; font-size: 14px;">
        <tr><td style="color: #64748b; padding: 4px 0;">Client</td><td style="text-align: right; font-weight: 600;">${opts.clientName}</td></tr>
        <tr><td style="color: #64748b; padding: 4px 0;">Invoice #</td><td style="text-align: right; font-weight: 600;">${opts.invoiceNumber}</td></tr>
        <tr><td style="color: #64748b; padding: 4px 0;">Amount</td><td style="text-align: right; font-weight: 700; color: #1E3A5F;">$${parseFloat(opts.total).toLocaleString()}</td></tr>
      </table>
    </div>

    <a href="${opts.appUrl}" style="${BUTTON_STYLE}">View Invoice →</a>
  `)
}

export function invoiceSentEmail(opts: {
  clientName: string
  invoiceNumber: string
  total: string
  dueDate: string | null
  notes: string | null
  contractorName: string
  portalUrl: string
}) {
  return layout(`
    <h1 style="font-size: 24px; font-weight: 700; margin-bottom: 8px;">Invoice from ${opts.contractorName}</h1>
    <p style="color: #64748b;">Hi ${opts.clientName},</p>
    <p>Please find your invoice details below.</p>

    <div style="${CARD_STYLE}">
      <table style="width: 100%; font-size: 14px;">
        <tr><td style="color: #64748b; padding: 4px 0;">Invoice #</td><td style="text-align: right; font-weight: 600;">${opts.invoiceNumber}</td></tr>
        <tr><td style="color: #64748b; padding: 4px 0;">Amount Due</td><td style="text-align: right; font-weight: 700; font-size: 20px; color: #1E3A5F;">$${parseFloat(opts.total).toLocaleString()}</td></tr>
        ${opts.dueDate ? `<tr><td style="color: #64748b; padding: 4px 0;">Due Date</td><td style="text-align: right;">${new Date(opts.dueDate).toLocaleDateString()}</td></tr>` : ''}
      </table>
    </div>

    ${opts.notes ? `<p style="color: #64748b; font-size: 14px;"><strong>Notes:</strong> ${opts.notes}</p>` : ''}

    <div style="margin: 24px 0; text-align: center;">
      <a href="${opts.portalUrl}" style="${BUTTON_STYLE}">View Invoice →</a>
    </div>

    <p style="color: #94a3b8; font-size: 13px; margin-top: 24px;">If you have questions, please reply to this email. Thank you for your business!</p>
  `)
}

export function invoiceOverdueEmail(opts: {
  clientName: string
  invoiceNumber: string
  total: string
  dueDate: string
  contractorName: string
  portalUrl: string
}) {
  return layout(`
    <h1 style="font-size: 22px; font-weight: 700; margin-bottom: 8px; color: #dc2626;">Invoice Overdue</h1>
    <p>Hi ${opts.clientName},</p>
    <p>This is a notice that invoice <strong>${opts.invoiceNumber}</strong> from <strong>${opts.contractorName}</strong> was due on <strong>${new Date(opts.dueDate).toLocaleDateString()}</strong> and remains unpaid.</p>

    <div style="${CARD_STYLE} border-left: 4px solid #dc2626;">
      <table style="width: 100%; font-size: 14px;">
        <tr><td style="color: #64748b; padding: 4px 0;">Invoice #</td><td style="text-align: right; font-weight: 600;">${opts.invoiceNumber}</td></tr>
        <tr><td style="color: #64748b; padding: 4px 0;">Amount Due</td><td style="text-align: right; font-weight: 700; font-size: 18px; color: #dc2626;">$${parseFloat(opts.total).toLocaleString()}</td></tr>
        <tr><td style="color: #64748b; padding: 4px 0;">Was Due</td><td style="text-align: right;">${new Date(opts.dueDate).toLocaleDateString()}</td></tr>
      </table>
    </div>

    <div style="margin: 24px 0; text-align: center;">
      <a href="${opts.portalUrl}" style="${BUTTON_STYLE}">View Invoice →</a>
    </div>

    <p style="color: #64748b; font-size: 14px;">Please arrange payment at your earliest convenience. If you have any questions, please reply to this email.</p>
    <p style="color: #64748b; font-size: 14px;">— ${opts.contractorName}</p>
  `)
}

export function estimateApprovedEmail(opts: {
  contractorName: string
  clientName: string
  estimateNumber: string
  total: string
  appUrl: string
}) {
  return layout(`
    <h1 style="font-size: 24px; font-weight: 700; margin-bottom: 8px; color: #16a34a;">Estimate Approved! 🎉</h1>
    <p><strong>${opts.clientName}</strong> just approved estimate <strong>${opts.estimateNumber}</strong>.</p>

    <div style="${CARD_STYLE} border-left: 4px solid #22c55e;">
      <table style="width: 100%; font-size: 14px;">
        <tr><td style="color: #64748b; padding: 4px 0;">Client</td><td style="text-align: right; font-weight: 600;">${opts.clientName}</td></tr>
        <tr><td style="color: #64748b; padding: 4px 0;">Estimate #</td><td style="text-align: right; font-weight: 600;">${opts.estimateNumber}</td></tr>
        <tr><td style="color: #64748b; padding: 4px 0;">Amount</td><td style="text-align: right; font-weight: 700; font-size: 20px; color: #16a34a;">$${parseFloat(opts.total).toLocaleString()}</td></tr>
      </table>
    </div>

    <a href="${opts.appUrl}" style="${BUTTON_STYLE}">View in WorkPilot →</a>
    <p style="color: #64748b; font-size: 14px; margin-top: 24px;">The linked job has been automatically set to Active.</p>
  `)
}

export function invoicePaidEmail(opts: {
  contractorName: string
  clientName: string
  invoiceNumber: string
  total: string
  appUrl: string
}) {
  return layout(`
    <h1 style="font-size: 24px; font-weight: 700; margin-bottom: 8px; color: #16a34a;">Payment Received 💰</h1>
    <p><strong>${opts.clientName}</strong> paid invoice <strong>${opts.invoiceNumber}</strong>.</p>

    <div style="${CARD_STYLE} border-left: 4px solid #22c55e;">
      <table style="width: 100%; font-size: 14px;">
        <tr><td style="color: #64748b; padding: 4px 0;">Client</td><td style="text-align: right; font-weight: 600;">${opts.clientName}</td></tr>
        <tr><td style="color: #64748b; padding: 4px 0;">Invoice #</td><td style="text-align: right; font-weight: 600;">${opts.invoiceNumber}</td></tr>
        <tr><td style="color: #64748b; padding: 4px 0;">Amount</td><td style="text-align: right; font-weight: 700; font-size: 20px; color: #16a34a;">$${parseFloat(opts.total).toLocaleString()}</td></tr>
      </table>
    </div>

    <a href="${opts.appUrl}" style="${BUTTON_STYLE}">View Invoice →</a>
  `)
}

export function estimateRejectedEmail(opts: {
  contractorName: string
  clientName: string
  estimateNumber: string
  total: string
  appUrl: string
}) {
  return layout(`
    <h1 style="font-size: 22px; font-weight: 700; margin-bottom: 8px; color: #dc2626;">Estimate Declined</h1>
    <p><strong>${opts.clientName}</strong> declined estimate <strong>${opts.estimateNumber}</strong>.</p>

    <div style="${CARD_STYLE} border-left: 4px solid #dc2626;">
      <table style="width: 100%; font-size: 14px;">
        <tr><td style="color: #64748b; padding: 4px 0;">Client</td><td style="text-align: right; font-weight: 600;">${opts.clientName}</td></tr>
        <tr><td style="color: #64748b; padding: 4px 0;">Estimate #</td><td style="text-align: right; font-weight: 600;">${opts.estimateNumber}</td></tr>
        <tr><td style="color: #64748b; padding: 4px 0;">Amount</td><td style="text-align: right; font-weight: 600;">$${parseFloat(opts.total).toLocaleString()}</td></tr>
      </table>
    </div>

    <p style="color: #64748b; font-size: 14px;">You may want to follow up with the client to understand their concerns or offer a revised estimate.</p>
    <a href="${opts.appUrl}" style="${BUTTON_STYLE}">View Estimate →</a>
  `)
}

export function jobUnbilledEmail(opts: {
  contractorName: string
  jobName: string
  clientName: string
  daysSinceCompleted: number
  appUrl: string
}) {
  return layout(`
    <h1 style="font-size: 22px; font-weight: 700; margin-bottom: 8px; color: #d97706;">Job Completed — No Invoice Yet</h1>
    <p>Hi ${opts.contractorName},</p>
    <p>The job <strong>${opts.jobName}</strong> was completed ${opts.daysSinceCompleted} days ago but has no paid invoice yet.</p>

    <div style="${CARD_STYLE} border-left: 4px solid #f59e0b;">
      <table style="width: 100%; font-size: 14px;">
        <tr><td style="color: #64748b; padding: 4px 0;">Job</td><td style="text-align: right; font-weight: 600;">${opts.jobName}</td></tr>
        <tr><td style="color: #64748b; padding: 4px 0;">Client</td><td style="text-align: right; font-weight: 600;">${opts.clientName}</td></tr>
        <tr><td style="color: #64748b; padding: 4px 0;">Days since completed</td><td style="text-align: right; font-weight: 600; color: #d97706;">${opts.daysSinceCompleted}</td></tr>
      </table>
    </div>

    <a href="${opts.appUrl}" style="${BUTTON_STYLE}">Create Invoice →</a>
  `)
}

export function invoiceReminderEmail(opts: {
  clientName: string
  invoiceNumber: string
  total: string
  dueDate: string
  contractorName: string
}) {
  const daysLeft = Math.ceil((new Date(opts.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  return layout(`
    <h1 style="font-size: 22px; font-weight: 700; margin-bottom: 8px;">Payment Reminder</h1>
    <p>Hi ${opts.clientName},</p>
    <p>This is a friendly reminder that invoice <strong>${opts.invoiceNumber}</strong> is due in <strong>${daysLeft} day${daysLeft !== 1 ? 's' : ''}</strong>.</p>

    <div style="${CARD_STYLE}">
      <table style="width: 100%; font-size: 14px;">
        <tr><td style="color: #64748b; padding: 4px 0;">Invoice #</td><td style="text-align: right; font-weight: 600;">${opts.invoiceNumber}</td></tr>
        <tr><td style="color: #64748b; padding: 4px 0;">Amount Due</td><td style="text-align: right; font-weight: 700; font-size: 18px; color: #1E3A5F;">$${parseFloat(opts.total).toLocaleString()}</td></tr>
        <tr><td style="color: #64748b; padding: 4px 0;">Due Date</td><td style="text-align: right;">${new Date(opts.dueDate).toLocaleDateString()}</td></tr>
      </table>
    </div>

    <p style="color: #64748b; font-size: 14px;">If you've already sent payment, please disregard this notice. Thank you!</p>
    <p style="color: #64748b; font-size: 14px;">— ${opts.contractorName}</p>
  `)
}
