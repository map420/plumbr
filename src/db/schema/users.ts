import { pgTable, text, timestamp, varchar, boolean, json } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: text('id').primaryKey(), // Clerk user ID
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }),
  companyName: varchar('company_name', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  plan: varchar('plan', { length: 20 }).default('starter'), // starter | pro
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  logoUrl: text('logo_url'),
  taxRate: varchar('tax_rate', { length: 10 }),
  documentFooter: text('document_footer'),
  paymentTerms: varchar('payment_terms', { length: 20 }).default('net30'),
  acceptAch: boolean('accept_ach').default(false),
  coverProcessingFee: boolean('cover_processing_fee').default(false),
  licenseNumber: varchar('license_number', { length: 100 }),
  licenseState: varchar('license_state', { length: 50 }),
  insuranceInfo: text('insurance_info'),
  websiteUrl: text('website_url'),
  socialLinks: json('social_links').default({}),
  showCredentialsOnDocs: boolean('show_credentials_on_docs').default(false),
  smsEnabled: boolean('sms_enabled').default(false),
  smsPhoneNumber: varchar('sms_phone_number', { length: 20 }),
  businessTaxId: varchar('business_tax_id', { length: 50 }),
  businessAddress: text('business_address'),
  businessType: varchar('business_type', { length: 50 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
