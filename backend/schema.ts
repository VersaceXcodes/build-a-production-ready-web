import { z } from 'zod';

// ============================================
// USERS & AUTHENTICATION
// ============================================

// User roles enum
export const userRoleSchema = z.enum(['ADMIN', 'STAFF', 'CUSTOMER']);

// Main user entity
export const userSchema = z.object({
  id: z.string(),
  email: z.string(),
  password_hash: z.string(),
  name: z.string(),
  role: userRoleSchema,
  phone: z.string().nullable(),
  company_name: z.string().nullable(),
  address: z.string().nullable(),
  active: z.boolean(),
  email_verified: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

// Create user input
export const createUserInputSchema = z.object({
  email: z.string().email().min(1).max(255),
  password: z.string().min(8).max(100),
  name: z.string().min(1).max(255),
  role: userRoleSchema.default('CUSTOMER'),
  phone: z.string().max(50).nullable(),
  company_name: z.string().max(255).nullable(),
  address: z.string().nullable(),
  active: z.boolean().default(true)
});

// Update user input
export const updateUserInputSchema = z.object({
  id: z.string(),
  email: z.string().email().min(1).max(255).optional(),
  name: z.string().min(1).max(255).optional(),
  role: userRoleSchema.optional(),
  phone: z.string().max(50).nullable().optional(),
  company_name: z.string().max(255).nullable().optional(),
  address: z.string().nullable().optional(),
  active: z.boolean().optional()
});

// Search users
export const searchUsersInputSchema = z.object({
  query: z.string().optional(),
  role: userRoleSchema.optional(),
  active: z.boolean().optional(),
  limit: z.number().int().positive().default(20),
  offset: z.number().int().nonnegative().default(0),
  sort_by: z.enum(['name', 'email', 'created_at']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc')
});

export type User = z.infer<typeof userSchema>;
export type CreateUserInput = z.infer<typeof createUserInputSchema>;
export type UpdateUserInput = z.infer<typeof updateUserInputSchema>;
export type SearchUsersInput = z.infer<typeof searchUsersInputSchema>;

// ============================================
// STAFF PERMISSIONS
// ============================================

export const staffPermissionsSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  can_view_all_jobs: z.boolean(),
  can_finalize_quotes: z.boolean(),
  can_manage_calendar: z.boolean(),
  can_access_inventory: z.boolean(),
  can_upload_proofs: z.boolean(),
  can_update_order_status: z.boolean(),
  department: z.string().nullable()
});

export const createStaffPermissionsInputSchema = z.object({
  user_id: z.string(),
  can_view_all_jobs: z.boolean().default(false),
  can_finalize_quotes: z.boolean().default(false),
  can_manage_calendar: z.boolean().default(false),
  can_access_inventory: z.boolean().default(false),
  can_upload_proofs: z.boolean().default(true),
  can_update_order_status: z.boolean().default(true),
  department: z.string().max(100).nullable()
});

export const updateStaffPermissionsInputSchema = z.object({
  id: z.string(),
  can_view_all_jobs: z.boolean().optional(),
  can_finalize_quotes: z.boolean().optional(),
  can_manage_calendar: z.boolean().optional(),
  can_access_inventory: z.boolean().optional(),
  can_upload_proofs: z.boolean().optional(),
  can_update_order_status: z.boolean().optional(),
  department: z.string().max(100).nullable().optional()
});

export type StaffPermissions = z.infer<typeof staffPermissionsSchema>;
export type CreateStaffPermissionsInput = z.infer<typeof createStaffPermissionsInputSchema>;
export type UpdateStaffPermissionsInput = z.infer<typeof updateStaffPermissionsInputSchema>;

// ============================================
// SERVICE CATEGORIES
// ============================================

export const serviceCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  sort_order: z.number().int(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export const createServiceCategoryInputSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/),
  description: z.string().nullable(),
  sort_order: z.number().int().nonnegative().default(0),
  is_active: z.boolean().default(true)
});

export const updateServiceCategoryInputSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(255).optional(),
  slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().nullable().optional(),
  sort_order: z.number().int().nonnegative().optional(),
  is_active: z.boolean().optional()
});

export const searchServiceCategoriesInputSchema = z.object({
  query: z.string().optional(),
  is_active: z.boolean().optional(),
  limit: z.number().int().positive().default(20),
  offset: z.number().int().nonnegative().default(0),
  sort_by: z.enum(['name', 'sort_order', 'created_at']).default('sort_order'),
  sort_order: z.enum(['asc', 'desc']).default('asc')
});

export type ServiceCategory = z.infer<typeof serviceCategorySchema>;
export type CreateServiceCategoryInput = z.infer<typeof createServiceCategoryInputSchema>;
export type UpdateServiceCategoryInput = z.infer<typeof updateServiceCategoryInputSchema>;
export type SearchServiceCategoriesInput = z.infer<typeof searchServiceCategoriesInputSchema>;

// ============================================
// SERVICES
// ============================================

export const serviceSchema = z.object({
  id: z.string(),
  category_id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  short_description: z.string().nullable(),
  requires_booking: z.boolean(),
  requires_proof: z.boolean(),
  is_top_seller: z.boolean(),
  is_active: z.boolean(),
  base_price: z.number().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export const createServiceInputSchema = z.object({
  category_id: z.string(),
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/),
  description: z.string().min(1),
  short_description: z.string().max(500).nullable(),
  requires_booking: z.boolean().default(false),
  requires_proof: z.boolean().default(false),
  is_top_seller: z.boolean().default(false),
  is_active: z.boolean().default(true),
  base_price: z.number().positive().nullable()
});

export const updateServiceInputSchema = z.object({
  id: z.string(),
  category_id: z.string().optional(),
  name: z.string().min(1).max(255).optional(),
  slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().min(1).optional(),
  short_description: z.string().max(500).nullable().optional(),
  requires_booking: z.boolean().optional(),
  requires_proof: z.boolean().optional(),
  is_top_seller: z.boolean().optional(),
  is_active: z.boolean().optional(),
  base_price: z.number().positive().nullable().optional()
});

export const searchServicesInputSchema = z.object({
  query: z.string().optional(),
  category_id: z.string().optional(),
  is_active: z.boolean().optional(),
  is_top_seller: z.boolean().optional(),
  requires_booking: z.boolean().optional(),
  limit: z.number().int().positive().default(20),
  offset: z.number().int().nonnegative().default(0),
  sort_by: z.enum(['name', 'base_price', 'created_at']).default('name'),
  sort_order: z.enum(['asc', 'desc']).default('asc')
});

export type Service = z.infer<typeof serviceSchema>;
export type CreateServiceInput = z.infer<typeof createServiceInputSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceInputSchema>;
export type SearchServicesInput = z.infer<typeof searchServicesInputSchema>;

// ============================================
// SERVICE OPTIONS
// ============================================

export const serviceOptionFieldTypeSchema = z.enum(['text', 'number', 'select', 'radio', 'checkbox', 'textarea']);

export const serviceOptionSchema = z.object({
  id: z.string(),
  service_id: z.string(),
  field_key: z.string(),
  label: z.string(),
  field_type: serviceOptionFieldTypeSchema,
  is_required: z.boolean(),
  help_text: z.string().nullable(),
  choices: z.string().nullable(), // JSON string
  pricing_impact: z.string().nullable(), // JSON string
  validation_rules: z.string().nullable(), // JSON string
  sort_order: z.number().int()
});

export const createServiceOptionInputSchema = z.object({
  service_id: z.string(),
  field_key: z.string().min(1).max(100).regex(/^[a-z0-9_]+$/),
  label: z.string().min(1).max(255),
  field_type: serviceOptionFieldTypeSchema,
  is_required: z.boolean().default(false),
  help_text: z.string().nullable(),
  choices: z.string().nullable(),
  pricing_impact: z.string().nullable(),
  validation_rules: z.string().nullable(),
  sort_order: z.number().int().nonnegative().default(0)
});

export const updateServiceOptionInputSchema = z.object({
  id: z.string(),
  field_key: z.string().min(1).max(100).regex(/^[a-z0-9_]+$/).optional(),
  label: z.string().min(1).max(255).optional(),
  field_type: serviceOptionFieldTypeSchema.optional(),
  is_required: z.boolean().optional(),
  help_text: z.string().nullable().optional(),
  choices: z.string().nullable().optional(),
  pricing_impact: z.string().nullable().optional(),
  validation_rules: z.string().nullable().optional(),
  sort_order: z.number().int().nonnegative().optional()
});

export type ServiceOption = z.infer<typeof serviceOptionSchema>;
export type CreateServiceOptionInput = z.infer<typeof createServiceOptionInputSchema>;
export type UpdateServiceOptionInput = z.infer<typeof updateServiceOptionInputSchema>;

// ============================================
// TIERS
// ============================================

export const tierSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  tagline: z.string().nullable(),
  description: z.string(),
  is_active: z.boolean(),
  turnaround_days_min: z.number().int().nullable(),
  turnaround_days_max: z.number().int().nullable(),
  revisions_allowed: z.number().int().nullable(),
  rush_fee_percentage: z.number().nullable(),
  deposit_percentage: z.number().nullable(),
  price_multiplier: z.number().nullable(),
  sla_response_hours: z.number().int().nullable(),
  sort_order: z.number().int(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export const createTierInputSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/),
  tagline: z.string().max(500).nullable(),
  description: z.string().min(1),
  is_active: z.boolean().default(true),
  turnaround_days_min: z.number().int().positive().nullable(),
  turnaround_days_max: z.number().int().positive().nullable(),
  revisions_allowed: z.number().int().nonnegative().nullable(),
  rush_fee_percentage: z.number().min(0).max(100).nullable(),
  deposit_percentage: z.number().min(0).max(100).nullable(),
  price_multiplier: z.number().positive().nullable(),
  sla_response_hours: z.number().int().positive().nullable(),
  sort_order: z.number().int().nonnegative().default(0)
});

export const updateTierInputSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(255).optional(),
  slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/).optional(),
  tagline: z.string().max(500).nullable().optional(),
  description: z.string().min(1).optional(),
  is_active: z.boolean().optional(),
  turnaround_days_min: z.number().int().positive().nullable().optional(),
  turnaround_days_max: z.number().int().positive().nullable().optional(),
  revisions_allowed: z.number().int().nonnegative().nullable().optional(),
  rush_fee_percentage: z.number().min(0).max(100).nullable().optional(),
  deposit_percentage: z.number().min(0).max(100).nullable().optional(),
  price_multiplier: z.number().positive().nullable().optional(),
  sla_response_hours: z.number().int().positive().nullable().optional(),
  sort_order: z.number().int().nonnegative().optional()
});

export const searchTiersInputSchema = z.object({
  query: z.string().optional(),
  is_active: z.boolean().optional(),
  limit: z.number().int().positive().default(20),
  offset: z.number().int().nonnegative().default(0),
  sort_by: z.enum(['name', 'sort_order', 'price_multiplier']).default('sort_order'),
  sort_order: z.enum(['asc', 'desc']).default('asc')
});

export type Tier = z.infer<typeof tierSchema>;
export type CreateTierInput = z.infer<typeof createTierInputSchema>;
export type UpdateTierInput = z.infer<typeof updateTierInputSchema>;
export type SearchTiersInput = z.infer<typeof searchTiersInputSchema>;

// ============================================
// TIER FEATURES
// ============================================

export const tierFeatureSchema = z.object({
  id: z.string(),
  tier_id: z.string(),
  group_name: z.string(),
  feature_key: z.string(),
  feature_label: z.string(),
  feature_value: z.string(),
  is_included: z.boolean(),
  sort_order: z.number().int()
});

export const createTierFeatureInputSchema = z.object({
  tier_id: z.string(),
  group_name: z.string().min(1).max(255),
  feature_key: z.string().min(1).max(100).regex(/^[a-z0-9_]+$/),
  feature_label: z.string().min(1).max(255),
  feature_value: z.string().min(1),
  is_included: z.boolean().default(true),
  sort_order: z.number().int().nonnegative().default(0)
});

export const updateTierFeatureInputSchema = z.object({
  id: z.string(),
  group_name: z.string().min(1).max(255).optional(),
  feature_key: z.string().min(1).max(100).regex(/^[a-z0-9_]+$/).optional(),
  feature_label: z.string().min(1).max(255).optional(),
  feature_value: z.string().min(1).optional(),
  is_included: z.boolean().optional(),
  sort_order: z.number().int().nonnegative().optional()
});

export type TierFeature = z.infer<typeof tierFeatureSchema>;
export type CreateTierFeatureInput = z.infer<typeof createTierFeatureInputSchema>;
export type UpdateTierFeatureInput = z.infer<typeof updateTierFeatureInputSchema>;

// ============================================
// TIER DELIVERABLES
// ============================================

export const tierDeliverableSchema = z.object({
  id: z.string(),
  tier_id: z.string(),
  description: z.string(),
  service_category_filter: z.string().nullable(),
  sort_order: z.number().int()
});

export const createTierDeliverableInputSchema = z.object({
  tier_id: z.string(),
  description: z.string().min(1),
  service_category_filter: z.string().nullable(),
  sort_order: z.number().int().nonnegative().default(0)
});

export const updateTierDeliverableInputSchema = z.object({
  id: z.string(),
  description: z.string().min(1).optional(),
  service_category_filter: z.string().nullable().optional(),
  sort_order: z.number().int().nonnegative().optional()
});

export type TierDeliverable = z.infer<typeof tierDeliverableSchema>;
export type CreateTierDeliverableInput = z.infer<typeof createTierDeliverableInputSchema>;
export type UpdateTierDeliverableInput = z.infer<typeof updateTierDeliverableInputSchema>;

// ============================================
// QUOTES
// ============================================

export const quoteStatusSchema = z.enum([
  'QUOTE_REQUESTED',
  'UNDER_REVIEW',
  'PENDING_APPROVAL',
  'FINALIZED',
  'REJECTED',
  'EXPIRED'
]);

export const quoteSchema = z.object({
  id: z.string(),
  quote_number: z.string(),
  customer_id: z.string(),
  service_id: z.string(),
  tier_id: z.string().nullable(),
  status: quoteStatusSchema,
  estimate_min: z.number().nullable(),
  estimate_max: z.number().nullable(),
  final_subtotal: z.number().nullable(),
  tax_rate: z.number().nullable(),
  tax_amount: z.number().nullable(),
  total_amount: z.number().nullable(),
  customer_notes: z.string().nullable(),
  admin_notes: z.string().nullable(),
  no_design_files: z.boolean(),
  finalized_at: z.coerce.date().nullable(),
  expires_at: z.coerce.date().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export const createQuoteInputSchema = z.object({
  customer_id: z.string(),
  service_id: z.string(),
  tier_id: z.string().nullable(),
  customer_notes: z.string().nullable(),
  no_design_files: z.boolean().default(false)
});

export const updateQuoteInputSchema = z.object({
  id: z.string(),
  tier_id: z.string().nullable().optional(),
  status: quoteStatusSchema.optional(),
  estimate_min: z.number().positive().nullable().optional(),
  estimate_max: z.number().positive().nullable().optional(),
  final_subtotal: z.number().nonnegative().nullable().optional(),
  tax_rate: z.number().min(0).max(100).nullable().optional(),
  tax_amount: z.number().nonnegative().nullable().optional(),
  total_amount: z.number().nonnegative().nullable().optional(),
  admin_notes: z.string().nullable().optional()
});

export const searchQuotesInputSchema = z.object({
  query: z.string().optional(),
  customer_id: z.string().optional(),
  service_id: z.string().optional(),
  status: quoteStatusSchema.optional(),
  limit: z.number().int().positive().default(20),
  offset: z.number().int().nonnegative().default(0),
  sort_by: z.enum(['quote_number', 'created_at', 'total_amount']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc')
});

export type Quote = z.infer<typeof quoteSchema>;
export type CreateQuoteInput = z.infer<typeof createQuoteInputSchema>;
export type UpdateQuoteInput = z.infer<typeof updateQuoteInputSchema>;
export type SearchQuotesInput = z.infer<typeof searchQuotesInputSchema>;

// ============================================
// QUOTE ANSWERS
// ============================================

export const quoteAnswerSchema = z.object({
  id: z.string(),
  quote_id: z.string(),
  option_key: z.string(),
  option_label: z.string(),
  answer_value: z.string()
});

export const createQuoteAnswerInputSchema = z.object({
  quote_id: z.string(),
  option_key: z.string().min(1).max(100),
  option_label: z.string().min(1).max(255),
  answer_value: z.string().min(1)
});

export type QuoteAnswer = z.infer<typeof quoteAnswerSchema>;
export type CreateQuoteAnswerInput = z.infer<typeof createQuoteAnswerInputSchema>;

// ============================================
// ORDERS
// ============================================

export const orderStatusSchema = z.enum([
  'DEPOSIT_PAID',
  'DESIGN_IN_PROGRESS',
  'WAITING_APPROVAL',
  'IN_PRODUCTION',
  'QUALITY_CHECK',
  'READY_FOR_PICKUP',
  'SHIPPED',
  'COMPLETED',
  'CANCELLED'
]);

export const orderSchema = z.object({
  id: z.string(),
  order_number: z.string(),
  quote_id: z.string(),
  customer_id: z.string(),
  service_id: z.string(),
  tier_id: z.string(),
  assigned_staff_id: z.string().nullable(),
  status: orderStatusSchema,
  subtotal: z.number(),
  emergency_fee: z.number(),
  rush_fee: z.number(),
  tax_rate: z.number(),
  tax_amount: z.number(),
  total_amount: z.number(),
  deposit_percentage: z.number(),
  deposit_amount: z.number(),
  balance_due: z.number(),
  revisions_used: z.number().int(),
  due_at: z.coerce.date().nullable(),
  completed_at: z.coerce.date().nullable(),
  sla_breached: z.boolean(),
  priority: z.number().int(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export const createOrderInputSchema = z.object({
  quote_id: z.string(),
  customer_id: z.string(),
  service_id: z.string(),
  tier_id: z.string(),
  assigned_staff_id: z.string().nullable(),
  subtotal: z.number().positive(),
  emergency_fee: z.number().nonnegative().default(0),
  rush_fee: z.number().nonnegative().default(0),
  tax_rate: z.number().min(0).max(100),
  priority: z.number().int().min(1).max(5).default(3)
});

export const updateOrderInputSchema = z.object({
  id: z.string(),
  assigned_staff_id: z.string().nullable().optional(),
  status: orderStatusSchema.optional(),
  revisions_used: z.number().int().nonnegative().optional(),
  priority: z.number().int().min(1).max(5).optional(),
  sla_breached: z.boolean().optional()
});

export const searchOrdersInputSchema = z.object({
  query: z.string().optional(),
  customer_id: z.string().optional(),
  service_id: z.string().optional(),
  assigned_staff_id: z.string().optional(),
  status: orderStatusSchema.optional(),
  priority: z.number().int().min(1).max(5).optional(),
  sla_breached: z.boolean().optional(),
  limit: z.number().int().positive().default(20),
  offset: z.number().int().nonnegative().default(0),
  sort_by: z.enum(['order_number', 'created_at', 'due_at', 'priority']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc')
});

export type Order = z.infer<typeof orderSchema>;
export type CreateOrderInput = z.infer<typeof createOrderInputSchema>;
export type UpdateOrderInput = z.infer<typeof updateOrderInputSchema>;
export type SearchOrdersInput = z.infer<typeof searchOrdersInputSchema>;

// ============================================
// UPLOADS
// ============================================

export const uploadSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  quote_id: z.string().nullable(),
  order_id: z.string().nullable(),
  file_url: z.string(),
  file_name: z.string(),
  file_type: z.string(),
  file_size: z.number().int(),
  dpi_warning: z.boolean(),
  created_at: z.coerce.date()
});

export const createUploadInputSchema = z.object({
  user_id: z.string(),
  quote_id: z.string().nullable(),
  order_id: z.string().nullable(),
  file_url: z.string().url(),
  file_name: z.string().min(1).max(255),
  file_type: z.string().min(1).max(100),
  file_size: z.number().int().positive(),
  dpi_warning: z.boolean().default(false)
});

export const searchUploadsInputSchema = z.object({
  user_id: z.string().optional(),
  quote_id: z.string().optional(),
  order_id: z.string().optional(),
  file_type: z.string().optional(),
  limit: z.number().int().positive().default(20),
  offset: z.number().int().nonnegative().default(0),
  sort_by: z.enum(['file_name', 'created_at', 'file_size']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc')
});

export type Upload = z.infer<typeof uploadSchema>;
export type CreateUploadInput = z.infer<typeof createUploadInputSchema>;
export type SearchUploadsInput = z.infer<typeof searchUploadsInputSchema>;

// ============================================
// BOOKINGS
// ============================================

export const bookingStatusSchema = z.enum(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'RESCHEDULED']);

export const bookingSchema = z.object({
  id: z.string(),
  quote_id: z.string(),
  customer_id: z.string(),
  booking_date: z.coerce.date(),
  time_slot: z.string().nullable(),
  status: bookingStatusSchema,
  is_emergency: z.boolean(),
  emergency_fee_percentage: z.number().nullable(),
  emergency_fee_amount: z.number().nullable(),
  reschedule_count: z.number().int(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export const createBookingInputSchema = z.object({
  quote_id: z.string(),
  customer_id: z.string(),
  booking_date: z.coerce.date(),
  time_slot: z.string().max(50).nullable(),
  is_emergency: z.boolean().default(false),
  emergency_fee_percentage: z.number().min(0).max(100).nullable(),
  emergency_fee_amount: z.number().nonnegative().nullable()
});

export const updateBookingInputSchema = z.object({
  id: z.string(),
  booking_date: z.coerce.date().optional(),
  time_slot: z.string().max(50).nullable().optional(),
  status: bookingStatusSchema.optional(),
  reschedule_count: z.number().int().nonnegative().optional()
});

export const searchBookingsInputSchema = z.object({
  customer_id: z.string().optional(),
  status: bookingStatusSchema.optional(),
  is_emergency: z.boolean().optional(),
  date_from: z.coerce.date().optional(),
  date_to: z.coerce.date().optional(),
  limit: z.number().int().positive().default(20),
  offset: z.number().int().nonnegative().default(0),
  sort_by: z.enum(['booking_date', 'created_at']).default('booking_date'),
  sort_order: z.enum(['asc', 'desc']).default('asc')
});

export type Booking = z.infer<typeof bookingSchema>;
export type CreateBookingInput = z.infer<typeof createBookingInputSchema>;
export type UpdateBookingInput = z.infer<typeof updateBookingInputSchema>;
export type SearchBookingsInput = z.infer<typeof searchBookingsInputSchema>;

// ============================================
// ORDER CHECKLIST ITEMS
// ============================================

export const orderChecklistItemSchema = z.object({
  id: z.string(),
  order_id: z.string(),
  deliverable_id: z.string(),
  description: z.string(),
  is_completed: z.boolean(),
  completed_at: z.coerce.date().nullable(),
  completed_by_staff_id: z.string().nullable(),
  notes: z.string().nullable(),
  sort_order: z.number().int()
});

export const createOrderChecklistItemInputSchema = z.object({
  order_id: z.string(),
  deliverable_id: z.string(),
  description: z.string().min(1),
  is_completed: z.boolean().default(false),
  notes: z.string().nullable(),
  sort_order: z.number().int().nonnegative().default(0)
});

export const updateOrderChecklistItemInputSchema = z.object({
  id: z.string(),
  is_completed: z.boolean().optional(),
  completed_by_staff_id: z.string().nullable().optional(),
  notes: z.string().nullable().optional()
});

export type OrderChecklistItem = z.infer<typeof orderChecklistItemSchema>;
export type CreateOrderChecklistItemInput = z.infer<typeof createOrderChecklistItemInputSchema>;
export type UpdateOrderChecklistItemInput = z.infer<typeof updateOrderChecklistItemInputSchema>;

// ============================================
// PROOF VERSIONS
// ============================================

export const proofStatusSchema = z.enum(['SENT', 'VIEWED', 'APPROVED', 'REVISION_REQUESTED']);

export const proofVersionSchema = z.object({
  id: z.string(),
  order_id: z.string(),
  version_number: z.number().int(),
  file_url: z.string(),
  created_by_staff_id: z.string(),
  status: proofStatusSchema,
  staff_message: z.string().nullable(),
  customer_comment: z.string().nullable(),
  approved_at: z.coerce.date().nullable(),
  created_at: z.coerce.date()
});

export const createProofVersionInputSchema = z.object({
  order_id: z.string(),
  version_number: z.number().int().positive(),
  file_url: z.string().url(),
  created_by_staff_id: z.string(),
  staff_message: z.string().nullable(),
  status: proofStatusSchema.default('SENT')
});

export const updateProofVersionInputSchema = z.object({
  id: z.string(),
  status: proofStatusSchema.optional(),
  customer_comment: z.string().nullable().optional()
});

export type ProofVersion = z.infer<typeof proofVersionSchema>;
export type CreateProofVersionInput = z.infer<typeof createProofVersionInputSchema>;
export type UpdateProofVersionInput = z.infer<typeof updateProofVersionInputSchema>;

// ============================================
// MESSAGE THREADS
// ============================================

export const messageThreadSchema = z.object({
  id: z.string(),
  quote_id: z.string().nullable(),
  order_id: z.string().nullable(),
  customer_id: z.string(),
  last_message_at: z.coerce.date().nullable(),
  created_at: z.coerce.date()
});

export const createMessageThreadInputSchema = z.object({
  quote_id: z.string().nullable(),
  order_id: z.string().nullable(),
  customer_id: z.string()
});

export type MessageThread = z.infer<typeof messageThreadSchema>;
export type CreateMessageThreadInput = z.infer<typeof createMessageThreadInputSchema>;

// ============================================
// MESSAGES
// ============================================

export const messageSchema = z.object({
  id: z.string(),
  thread_id: z.string(),
  sender_id: z.string(),
  body: z.string(),
  is_read: z.boolean(),
  read_at: z.coerce.date().nullable(),
  created_at: z.coerce.date()
});

export const createMessageInputSchema = z.object({
  thread_id: z.string(),
  sender_id: z.string(),
  body: z.string().min(1)
});

export const updateMessageInputSchema = z.object({
  id: z.string(),
  is_read: z.boolean()
});

export type Message = z.infer<typeof messageSchema>;
export type CreateMessageInput = z.infer<typeof createMessageInputSchema>;
export type UpdateMessageInput = z.infer<typeof updateMessageInputSchema>;

// ============================================
// PAYMENTS
// ============================================

export const paymentMethodSchema = z.enum(['CREDIT_CARD', 'BANK_TRANSFER', 'CHECK', 'CASH']);
export const paymentStatusSchema = z.enum(['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED']);

export const paymentSchema = z.object({
  id: z.string(),
  payment_number: z.string(),
  order_id: z.string(),
  amount: z.number(),
  method: paymentMethodSchema,
  status: paymentStatusSchema,
  transaction_ref: z.string().nullable(),
  payment_date: z.coerce.date().nullable(),
  receipt_url: z.string().nullable(),
  verified_by_admin_id: z.string().nullable(),
  verified_at: z.coerce.date().nullable(),
  refund_amount: z.number().nullable(),
  refund_reason: z.string().nullable(),
  refunded_at: z.coerce.date().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export const createPaymentInputSchema = z.object({
  order_id: z.string(),
  amount: z.number().positive(),
  method: paymentMethodSchema,
  transaction_ref: z.string().max(255).nullable(),
  payment_date: z.coerce.date().nullable()
});

export const updatePaymentInputSchema = z.object({
  id: z.string(),
  status: paymentStatusSchema.optional(),
  receipt_url: z.string().url().nullable().optional(),
  verified_by_admin_id: z.string().nullable().optional(),
  refund_amount: z.number().positive().nullable().optional(),
  refund_reason: z.string().nullable().optional()
});

export const searchPaymentsInputSchema = z.object({
  order_id: z.string().optional(),
  method: paymentMethodSchema.optional(),
  status: paymentStatusSchema.optional(),
  limit: z.number().int().positive().default(20),
  offset: z.number().int().nonnegative().default(0),
  sort_by: z.enum(['payment_number', 'payment_date', 'amount']).default('payment_date'),
  sort_order: z.enum(['asc', 'desc']).default('desc')
});

export type Payment = z.infer<typeof paymentSchema>;
export type CreatePaymentInput = z.infer<typeof createPaymentInputSchema>;
export type UpdatePaymentInput = z.infer<typeof updatePaymentInputSchema>;
export type SearchPaymentsInput = z.infer<typeof searchPaymentsInputSchema>;

// ============================================
// INVOICES
// ============================================

export const invoiceSchema = z.object({
  id: z.string(),
  invoice_number: z.string(),
  order_id: z.string(),
  customer_id: z.string(),
  subtotal: z.number(),
  tax_rate: z.number(),
  tax_amount: z.number(),
  total_amount: z.number(),
  amount_paid: z.number(),
  amount_due: z.number(),
  issued_at: z.coerce.date(),
  due_date: z.coerce.date().nullable(),
  paid_at: z.coerce.date().nullable(),
  invoice_url: z.string().nullable()
});

export const createInvoiceInputSchema = z.object({
  order_id: z.string(),
  customer_id: z.string(),
  subtotal: z.number().nonnegative(),
  tax_rate: z.number().min(0).max(100),
  due_date: z.coerce.date().nullable()
});

export const updateInvoiceInputSchema = z.object({
  id: z.string(),
  amount_paid: z.number().nonnegative().optional(),
  paid_at: z.coerce.date().nullable().optional(),
  invoice_url: z.string().url().nullable().optional()
});

export const searchInvoicesInputSchema = z.object({
  customer_id: z.string().optional(),
  order_id: z.string().optional(),
  is_paid: z.boolean().optional(),
  limit: z.number().int().positive().default(20),
  offset: z.number().int().nonnegative().default(0),
  sort_by: z.enum(['invoice_number', 'issued_at', 'due_date']).default('issued_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc')
});

export type Invoice = z.infer<typeof invoiceSchema>;
export type CreateInvoiceInput = z.infer<typeof createInvoiceInputSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceInputSchema>;
export type SearchInvoicesInput = z.infer<typeof searchInvoicesInputSchema>;

// ============================================
// GALLERY ITEMS
// ============================================

export const galleryItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  description: z.string(),
  service_category_id: z.string().nullable(),
  service_id: z.string().nullable(),
  tier_used: z.string().nullable(),
  client_name: z.string().nullable(),
  client_approved_display: z.boolean(),
  testimonial_quote: z.string().nullable(),
  timeline_description: z.string().nullable(),
  is_featured: z.boolean(),
  is_visible: z.boolean(),
  sort_order: z.number().int(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export const createGalleryItemInputSchema = z.object({
  title: z.string().min(1).max(255),
  slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/),
  description: z.string().min(1),
  service_category_id: z.string().nullable(),
  service_id: z.string().nullable(),
  tier_used: z.string().max(100).nullable(),
  client_name: z.string().max(255).nullable(),
  client_approved_display: z.boolean().default(false),
  testimonial_quote: z.string().nullable(),
  timeline_description: z.string().nullable(),
  is_featured: z.boolean().default(false),
  is_visible: z.boolean().default(true),
  sort_order: z.number().int().nonnegative().default(0)
});

export const updateGalleryItemInputSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(255).optional(),
  slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().min(1).optional(),
  is_featured: z.boolean().optional(),
  is_visible: z.boolean().optional(),
  sort_order: z.number().int().nonnegative().optional()
});

export const searchGalleryItemsInputSchema = z.object({
  query: z.string().optional(),
  service_category_id: z.string().optional(),
  service_id: z.string().optional(),
  is_featured: z.boolean().optional(),
  is_visible: z.boolean().optional(),
  limit: z.number().int().positive().default(20),
  offset: z.number().int().nonnegative().default(0),
  sort_by: z.enum(['title', 'sort_order', 'created_at']).default('sort_order'),
  sort_order: z.enum(['asc', 'desc']).default('asc')
});

export type GalleryItem = z.infer<typeof galleryItemSchema>;
export type CreateGalleryItemInput = z.infer<typeof createGalleryItemInputSchema>;
export type UpdateGalleryItemInput = z.infer<typeof updateGalleryItemInputSchema>;
export type SearchGalleryItemsInput = z.infer<typeof searchGalleryItemsInputSchema>;

// ============================================
// GALLERY IMAGES
// ============================================

export const galleryImageSchema = z.object({
  id: z.string(),
  gallery_item_id: z.string(),
  image_url: z.string(),
  caption: z.string().nullable(),
  is_primary: z.boolean(),
  sort_order: z.number().int()
});

export const createGalleryImageInputSchema = z.object({
  gallery_item_id: z.string(),
  image_url: z.string().url(),
  caption: z.string().max(500).nullable(),
  is_primary: z.boolean().default(false),
  sort_order: z.number().int().nonnegative().default(0)
});

export const updateGalleryImageInputSchema = z.object({
  id: z.string(),
  caption: z.string().max(500).nullable().optional(),
  is_primary: z.boolean().optional(),
  sort_order: z.number().int().nonnegative().optional()
});

export type GalleryImage = z.infer<typeof galleryImageSchema>;
export type CreateGalleryImageInput = z.infer<typeof createGalleryImageInputSchema>;
export type UpdateGalleryImageInput = z.infer<typeof updateGalleryImageInputSchema>;

// ============================================
// MATERIALS
// ============================================

export const materialSchema = z.object({
  id: z.string(),
  sku: z.string(),
  name: z.string(),
  category: z.string(),
  unit: z.string(),
  cost_per_unit: z.number(),
  supplier_name: z.string().nullable(),
  notes: z.string().nullable(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export const createMaterialInputSchema = z.object({
  sku: z.string().min(1).max(100),
  name: z.string().min(1).max(255),
  category: z.string().min(1).max(100),
  unit: z.string().min(1).max(50),
  cost_per_unit: z.number().nonnegative(),
  supplier_name: z.string().max(255).nullable(),
  notes: z.string().nullable(),
  is_active: z.boolean().default(true)
});

export const updateMaterialInputSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(255).optional(),
  cost_per_unit: z.number().nonnegative().optional(),
  supplier_name: z.string().max(255).nullable().optional(),
  notes: z.string().nullable().optional(),
  is_active: z.boolean().optional()
});

export const searchMaterialsInputSchema = z.object({
  query: z.string().optional(),
  category: z.string().optional(),
  is_active: z.boolean().optional(),
  limit: z.number().int().positive().default(20),
  offset: z.number().int().nonnegative().default(0),
  sort_by: z.enum(['name', 'sku', 'category']).default('name'),
  sort_order: z.enum(['asc', 'desc']).default('asc')
});

export type Material = z.infer<typeof materialSchema>;
export type CreateMaterialInput = z.infer<typeof createMaterialInputSchema>;
export type UpdateMaterialInput = z.infer<typeof updateMaterialInputSchema>;
export type SearchMaterialsInput = z.infer<typeof searchMaterialsInputSchema>;

// ============================================
// CAPACITY SETTINGS
// ============================================

export const capacitySettingSchema = z.object({
  id: z.string(),
  day_of_week: z.number().int(),
  is_working_day: z.boolean(),
  start_time: z.string().nullable(),
  end_time: z.string().nullable(),
  default_slots: z.number().int(),
  emergency_slots_max: z.number().int(),
  emergency_fee_percentage: z.number()
});

export const createCapacitySettingInputSchema = z.object({
  day_of_week: z.number().int().min(0).max(6),
  is_working_day: z.boolean().default(true),
  start_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).nullable(),
  end_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).nullable(),
  default_slots: z.number().int().nonnegative().default(5),
  emergency_slots_max: z.number().int().nonnegative().default(2),
  emergency_fee_percentage: z.number().min(0).max(100).default(20)
});

export const updateCapacitySettingInputSchema = z.object({
  id: z.string(),
  is_working_day: z.boolean().optional(),
  start_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).nullable().optional(),
  end_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).nullable().optional(),
  default_slots: z.number().int().nonnegative().optional(),
  emergency_slots_max: z.number().int().nonnegative().optional(),
  emergency_fee_percentage: z.number().min(0).max(100).optional()
});

export type CapacitySetting = z.infer<typeof capacitySettingSchema>;
export type CreateCapacitySettingInput = z.infer<typeof createCapacitySettingInputSchema>;
export type UpdateCapacitySettingInput = z.infer<typeof updateCapacitySettingInputSchema>;

// ============================================
// CAPACITY OVERRIDES
// ============================================

export const capacityOverrideSchema = z.object({
  id: z.string(),
  override_date: z.coerce.date(),
  slots_available: z.number().int(),
  reason: z.string().nullable(),
  created_at: z.coerce.date()
});

export const createCapacityOverrideInputSchema = z.object({
  override_date: z.coerce.date(),
  slots_available: z.number().int().nonnegative(),
  reason: z.string().max(500).nullable()
});

export type CapacityOverride = z.infer<typeof capacityOverrideSchema>;
export type CreateCapacityOverrideInput = z.infer<typeof createCapacityOverrideInputSchema>;

// ============================================
// BLACKOUT DATES
// ============================================

export const blackoutDateSchema = z.object({
  id: z.string(),
  start_date: z.coerce.date(),
  end_date: z.coerce.date(),
  reason: z.string().nullable(),
  created_at: z.coerce.date()
});

export const createBlackoutDateInputSchema = z.object({
  start_date: z.coerce.date(),
  end_date: z.coerce.date(),
  reason: z.string().max(500).nullable()
});

export type BlackoutDate = z.infer<typeof blackoutDateSchema>;
export type CreateBlackoutDateInput = z.infer<typeof createBlackoutDateInputSchema>;

// ============================================
// CONTACT INQUIRIES
// ============================================

export const contactInquiryStatusSchema = z.enum(['NEW', 'REPLIED', 'RESOLVED', 'SPAM']);

export const contactInquirySchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  phone: z.string().nullable(),
  subject: z.string(),
  message: z.string(),
  status: contactInquiryStatusSchema,
  replied_at: z.coerce.date().nullable(),
  resolved_at: z.coerce.date().nullable(),
  created_at: z.coerce.date()
});

export const createContactInquiryInputSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email(),
  phone: z.string().max(50).nullable(),
  subject: z.string().min(1).max(255),
  message: z.string().min(1)
});

export const updateContactInquiryInputSchema = z.object({
  id: z.string(),
  status: contactInquiryStatusSchema.optional()
});

export const searchContactInquiriesInputSchema = z.object({
  query: z.string().optional(),
  status: contactInquiryStatusSchema.optional(),
  limit: z.number().int().positive().default(20),
  offset: z.number().int().nonnegative().default(0),
  sort_by: z.enum(['name', 'created_at']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc')
});

export type ContactInquiry = z.infer<typeof contactInquirySchema>;
export type CreateContactInquiryInput = z.infer<typeof createContactInquiryInputSchema>;
export type UpdateContactInquiryInput = z.infer<typeof updateContactInquiryInputSchema>;
export type SearchContactInquiriesInput = z.infer<typeof searchContactInquiriesInputSchema>;

// ============================================
// CONTENT SECTIONS
// ============================================

export const contentSectionTypeSchema = z.enum(['HERO', 'TEXT', 'FEATURES', 'JSON']);

export const contentSectionSchema = z.object({
  id: z.string(),
  section_key: z.string(),
  section_type: contentSectionTypeSchema,
  content: z.string(),
  updated_at: z.coerce.date()
});

export const createContentSectionInputSchema = z.object({
  section_key: z.string().min(1).max(100).regex(/^[a-z0-9_]+$/),
  section_type: contentSectionTypeSchema,
  content: z.string().min(1)
});

export const updateContentSectionInputSchema = z.object({
  id: z.string(),
  content: z.string().min(1)
});

export type ContentSection = z.infer<typeof contentSectionSchema>;
export type CreateContentSectionInput = z.infer<typeof createContentSectionInputSchema>;
export type UpdateContentSectionInput = z.infer<typeof updateContentSectionInputSchema>;

// ============================================
// TEAM MEMBERS
// ============================================

export const teamMemberSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(),
  photo_url: z.string().nullable(),
  bio: z.string(),
  sort_order: z.number().int(),
  is_visible: z.boolean()
});

export const createTeamMemberInputSchema = z.object({
  name: z.string().min(1).max(255),
  role: z.string().min(1).max(255),
  photo_url: z.string().url().nullable(),
  bio: z.string().min(1),
  sort_order: z.number().int().nonnegative().default(0),
  is_visible: z.boolean().default(true)
});

export const updateTeamMemberInputSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(255).optional(),
  role: z.string().min(1).max(255).optional(),
  photo_url: z.string().url().nullable().optional(),
  bio: z.string().min(1).optional(),
  sort_order: z.number().int().nonnegative().optional(),
  is_visible: z.boolean().optional()
});

export type TeamMember = z.infer<typeof teamMemberSchema>;
export type CreateTeamMemberInput = z.infer<typeof createTeamMemberInputSchema>;
export type UpdateTeamMemberInput = z.infer<typeof updateTeamMemberInputSchema>;

// ============================================
// FAQS
// ============================================

export const faqSchema = z.object({
  id: z.string(),
  question: z.string(),
  answer: z.string(),
  category: z.string(),
  is_active: z.boolean(),
  sort_order: z.number().int()
});

export const createFaqInputSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
  category: z.string().min(1).max(100),
  is_active: z.boolean().default(true),
  sort_order: z.number().int().nonnegative().default(0)
});

export const updateFaqInputSchema = z.object({
  id: z.string(),
  question: z.string().min(1).optional(),
  answer: z.string().min(1).optional(),
  category: z.string().min(1).max(100).optional(),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().nonnegative().optional()
});

export const searchFaqsInputSchema = z.object({
  query: z.string().optional(),
  category: z.string().optional(),
  is_active: z.boolean().optional(),
  limit: z.number().int().positive().default(20),
  offset: z.number().int().nonnegative().default(0),
  sort_by: z.enum(['category', 'sort_order']).default('sort_order'),
  sort_order: z.enum(['asc', 'desc']).default('asc')
});

export type Faq = z.infer<typeof faqSchema>;
export type CreateFaqInput = z.infer<typeof createFaqInputSchema>;
export type UpdateFaqInput = z.infer<typeof updateFaqInputSchema>;
export type SearchFaqsInput = z.infer<typeof searchFaqsInputSchema>;

// ============================================
// APP SETTINGS
// ============================================

export const appSettingTypeSchema = z.enum(['STRING', 'NUMBER', 'BOOLEAN', 'JSON']);

export const appSettingSchema = z.object({
  id: z.string(),
  setting_key: z.string(),
  setting_value: z.string(),
  setting_type: appSettingTypeSchema,
  description: z.string().nullable(),
  updated_at: z.coerce.date()
});

export const createAppSettingInputSchema = z.object({
  setting_key: z.string().min(1).max(100).regex(/^[a-z0-9_]+$/),
  setting_value: z.string().min(1),
  setting_type: appSettingTypeSchema,
  description: z.string().max(500).nullable()
});

export const updateAppSettingInputSchema = z.object({
  id: z.string(),
  setting_value: z.string().min(1),
  description: z.string().max(500).nullable().optional()
});

export type AppSetting = z.infer<typeof appSettingSchema>;
export type CreateAppSettingInput = z.infer<typeof createAppSettingInputSchema>;
export type UpdateAppSettingInput = z.infer<typeof updateAppSettingInputSchema>;

// ============================================
// FEATURE FLAGS
// ============================================

export const featureFlagSchema = z.object({
  id: z.string(),
  flag_key: z.string(),
  flag_name: z.string(),
  is_enabled: z.boolean(),
  description: z.string().nullable(),
  updated_at: z.coerce.date()
});

export const createFeatureFlagInputSchema = z.object({
  flag_key: z.string().min(1).max(100).regex(/^[a-z0-9_]+$/),
  flag_name: z.string().min(1).max(255),
  is_enabled: z.boolean().default(false),
  description: z.string().max(500).nullable()
});

export const updateFeatureFlagInputSchema = z.object({
  id: z.string(),
  flag_name: z.string().min(1).max(255).optional(),
  is_enabled: z.boolean().optional(),
  description: z.string().max(500).nullable().optional()
});

export type FeatureFlag = z.infer<typeof featureFlagSchema>;
export type CreateFeatureFlagInput = z.infer<typeof createFeatureFlagInputSchema>;
export type UpdateFeatureFlagInput = z.infer<typeof updateFeatureFlagInputSchema>;

// ============================================
// AUDIT LOGS
// ============================================

export const auditLogSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  action: z.string(),
  target_type: z.string(),
  target_id: z.string(),
  changes: z.string().nullable(),
  ip_address: z.string().nullable(),
  user_agent: z.string().nullable(),
  created_at: z.coerce.date()
});

export const createAuditLogInputSchema = z.object({
  user_id: z.string(),
  action: z.string().min(1).max(100),
  target_type: z.string().min(1).max(100),
  target_id: z.string(),
  changes: z.string().nullable(),
  ip_address: z.string().max(50).nullable(),
  user_agent: z.string().max(500).nullable()
});

export const searchAuditLogsInputSchema = z.object({
  user_id: z.string().optional(),
  action: z.string().optional(),
  target_type: z.string().optional(),
  target_id: z.string().optional(),
  date_from: z.coerce.date().optional(),
  date_to: z.coerce.date().optional(),
  limit: z.number().int().positive().default(50),
  offset: z.number().int().nonnegative().default(0),
  sort_by: z.enum(['created_at']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc')
});

export type AuditLog = z.infer<typeof auditLogSchema>;
export type CreateAuditLogInput = z.infer<typeof createAuditLogInputSchema>;
export type SearchAuditLogsInput = z.infer<typeof searchAuditLogsInputSchema>;

// ============================================
// NOTIFICATIONS
// ============================================

export const notificationTypeSchema = z.enum([
  'ORDER_COMPLETED',
  'PROOF_READY',
  'QUOTE_APPROVED',
  'ORDER_IN_PRODUCTION',
  'MESSAGE_RECEIVED',
  'PAYMENT_RECEIVED',
  'NEW_ORDER'
]);

export const notificationSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  notification_type: notificationTypeSchema,
  title: z.string(),
  message: z.string(),
  link_url: z.string().nullable(),
  is_read: z.boolean(),
  read_at: z.coerce.date().nullable(),
  created_at: z.coerce.date()
});

export const createNotificationInputSchema = z.object({
  user_id: z.string(),
  notification_type: notificationTypeSchema,
  title: z.string().min(1).max(255),
  message: z.string().min(1),
  link_url: z.string().max(500).nullable()
});

export const updateNotificationInputSchema = z.object({
  id: z.string(),
  is_read: z.boolean()
});

export const searchNotificationsInputSchema = z.object({
  user_id: z.string().optional(),
  notification_type: notificationTypeSchema.optional(),
  is_read: z.boolean().optional(),
  limit: z.number().int().positive().default(20),
  offset: z.number().int().nonnegative().default(0),
  sort_by: z.enum(['created_at']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc')
});

export type Notification = z.infer<typeof notificationSchema>;
export type CreateNotificationInput = z.infer<typeof createNotificationInputSchema>;
export type UpdateNotificationInput = z.infer<typeof updateNotificationInputSchema>;
export type SearchNotificationsInput = z.infer<typeof searchNotificationsInputSchema>;

// ============================================
// EMAIL VERIFICATION TOKENS
// ============================================

export const emailVerificationTokenSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  token: z.string(),
  expires_at: z.coerce.date(),
  used_at: z.coerce.date().nullable(),
  created_at: z.coerce.date()
});

export const createEmailVerificationTokenInputSchema = z.object({
  user_id: z.string(),
  token: z.string().min(1).max(255),
  expires_at: z.coerce.date()
});

export type EmailVerificationToken = z.infer<typeof emailVerificationTokenSchema>;
export type CreateEmailVerificationTokenInput = z.infer<typeof createEmailVerificationTokenInputSchema>;

// ============================================
// PASSWORD RESET TOKENS
// ============================================

export const passwordResetTokenSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  token: z.string(),
  expires_at: z.coerce.date(),
  used_at: z.coerce.date().nullable(),
  created_at: z.coerce.date()
});

export const createPasswordResetTokenInputSchema = z.object({
  user_id: z.string(),
  token: z.string().min(1).max(255),
  expires_at: z.coerce.date()
});

export type PasswordResetToken = z.infer<typeof passwordResetTokenSchema>;
export type CreatePasswordResetTokenInput = z.infer<typeof createPasswordResetTokenInputSchema>;

// ============================================
// B2B ACCOUNTS
// ============================================

export const b2bAccountStatusSchema = z.enum(['ACTIVE', 'SUSPENDED', 'EXPIRED']);

export const b2bAccountSchema = z.object({
  id: z.string(),
  company_name: z.string(),
  main_contact_id: z.string(),
  account_manager_id: z.string().nullable(),
  contract_start_date: z.coerce.date(),
  contract_end_date: z.coerce.date(),
  contract_terms: z.string().nullable(),
  status: b2bAccountStatusSchema,
  consolidated_invoicing: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export const createB2bAccountInputSchema = z.object({
  company_name: z.string().min(1).max(255),
  main_contact_id: z.string(),
  account_manager_id: z.string().nullable(),
  contract_start_date: z.coerce.date(),
  contract_end_date: z.coerce.date(),
  contract_terms: z.string().nullable(),
  consolidated_invoicing: z.boolean().default(false)
});

export const updateB2bAccountInputSchema = z.object({
  id: z.string(),
  company_name: z.string().min(1).max(255).optional(),
  account_manager_id: z.string().nullable().optional(),
  contract_end_date: z.coerce.date().optional(),
  contract_terms: z.string().nullable().optional(),
  status: b2bAccountStatusSchema.optional(),
  consolidated_invoicing: z.boolean().optional()
});

export type B2bAccount = z.infer<typeof b2bAccountSchema>;
export type CreateB2bAccountInput = z.infer<typeof createB2bAccountInputSchema>;
export type UpdateB2bAccountInput = z.infer<typeof updateB2bAccountInputSchema>;

// ============================================
// B2B LOCATIONS
// ============================================

export const b2bLocationSchema = z.object({
  id: z.string(),
  account_id: z.string(),
  location_name: z.string(),
  address: z.string(),
  contact_person: z.string().nullable(),
  contact_phone: z.string().nullable(),
  contact_email: z.string().nullable(),
  created_at: z.coerce.date()
});

export const createB2bLocationInputSchema = z.object({
  account_id: z.string(),
  location_name: z.string().min(1).max(255),
  address: z.string().min(1),
  contact_person: z.string().max(255).nullable(),
  contact_phone: z.string().max(50).nullable(),
  contact_email: z.string().email().nullable()
});

export const updateB2bLocationInputSchema = z.object({
  id: z.string(),
  location_name: z.string().min(1).max(255).optional(),
  address: z.string().min(1).optional(),
  contact_person: z.string().max(255).nullable().optional(),
  contact_phone: z.string().max(50).nullable().optional(),
  contact_email: z.string().email().nullable().optional()
});

export type B2bLocation = z.infer<typeof b2bLocationSchema>;
export type CreateB2bLocationInput = z.infer<typeof createB2bLocationInputSchema>;
export type UpdateB2bLocationInput = z.infer<typeof updateB2bLocationInputSchema>;

// ============================================
// CONTRACT PRICING
// ============================================

export const contractPricingSchema = z.object({
  id: z.string(),
  account_id: z.string(),
  service_id: z.string(),
  tier_id: z.string(),
  contract_price: z.number().nullable(),
  discount_percentage: z.number().nullable(),
  effective_date: z.coerce.date().nullable(),
  expiry_date: z.coerce.date().nullable(),
  created_at: z.coerce.date()
});

export const createContractPricingInputSchema = z.object({
  account_id: z.string(),
  service_id: z.string(),
  tier_id: z.string(),
  contract_price: z.number().positive().nullable(),
  discount_percentage: z.number().min(0).max(100).nullable(),
  effective_date: z.coerce.date().nullable(),
  expiry_date: z.coerce.date().nullable()
});

export const updateContractPricingInputSchema = z.object({
  id: z.string(),
  contract_price: z.number().positive().nullable().optional(),
  discount_percentage: z.number().min(0).max(100).nullable().optional(),
  effective_date: z.coerce.date().nullable().optional(),
  expiry_date: z.coerce.date().nullable().optional()
});

export type ContractPricing = z.infer<typeof contractPricingSchema>;
export type CreateContractPricingInput = z.infer<typeof createContractPricingInputSchema>;
export type UpdateContractPricingInput = z.infer<typeof updateContractPricingInputSchema>;

// ============================================
// INVENTORY ITEMS
// ============================================

export const inventoryItemSchema = z.object({
  id: z.string(),
  sku: z.string(),
  name: z.string(),
  category: z.string(),
  unit: z.string(),
  qty_on_hand: z.number().int(),
  reorder_point: z.number().int(),
  reorder_qty: z.number().int(),
  supplier_name: z.string().nullable(),
  cost_per_unit: z.number(),
  notes: z.string().nullable(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export const createInventoryItemInputSchema = z.object({
  sku: z.string().min(1).max(100),
  name: z.string().min(1).max(255),
  category: z.string().min(1).max(100),
  unit: z.string().min(1).max(50),
  qty_on_hand: z.number().int().nonnegative().default(0),
  reorder_point: z.number().int().nonnegative(),
  reorder_qty: z.number().int().positive(),
  supplier_name: z.string().max(255).nullable(),
  cost_per_unit: z.number().nonnegative(),
  notes: z.string().nullable(),
  is_active: z.boolean().default(true)
});

export const updateInventoryItemInputSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(255).optional(),
  qty_on_hand: z.number().int().nonnegative().optional(),
  reorder_point: z.number().int().nonnegative().optional(),
  reorder_qty: z.number().int().positive().optional(),
  supplier_name: z.string().max(255).nullable().optional(),
  cost_per_unit: z.number().nonnegative().optional(),
  notes: z.string().nullable().optional(),
  is_active: z.boolean().optional()
});

export const searchInventoryItemsInputSchema = z.object({
  query: z.string().optional(),
  category: z.string().optional(),
  is_active: z.boolean().optional(),
  low_stock: z.boolean().optional(),
  limit: z.number().int().positive().default(20),
  offset: z.number().int().nonnegative().default(0),
  sort_by: z.enum(['name', 'sku', 'qty_on_hand']).default('name'),
  sort_order: z.enum(['asc', 'desc']).default('asc')
});

export type InventoryItem = z.infer<typeof inventoryItemSchema>;
export type CreateInventoryItemInput = z.infer<typeof createInventoryItemInputSchema>;
export type UpdateInventoryItemInput = z.infer<typeof updateInventoryItemInputSchema>;
export type SearchInventoryItemsInput = z.infer<typeof searchInventoryItemsInputSchema>;

// ============================================
// MATERIAL CONSUMPTION RULES
// ============================================

export const materialConsumptionRuleSchema = z.object({
  id: z.string(),
  service_id: z.string(),
  inventory_item_id: z.string(),
  qty_per_unit: z.number(),
  tier_filter: z.string().nullable(),
  created_at: z.coerce.date()
});

export const createMaterialConsumptionRuleInputSchema = z.object({
  service_id: z.string(),
  inventory_item_id: z.string(),
  qty_per_unit: z.number().positive(),
  tier_filter: z.string().max(255).nullable()
});

export type MaterialConsumptionRule = z.infer<typeof materialConsumptionRuleSchema>;
export type CreateMaterialConsumptionRuleInput = z.infer<typeof createMaterialConsumptionRuleInputSchema>;

// ============================================
// INVENTORY TRANSACTIONS
// ============================================

export const inventoryTransactionTypeSchema = z.enum(['PURCHASE', 'CONSUMPTION', 'ADJUSTMENT', 'RETURN']);

export const inventoryTransactionSchema = z.object({
  id: z.string(),
  inventory_item_id: z.string(),
  transaction_type: inventoryTransactionTypeSchema,
  qty_change: z.number().int(),
  reason: z.string(),
  order_id: z.string().nullable(),
  purchase_order_id: z.string().nullable(),
  user_id: z.string().nullable(),
  created_at: z.coerce.date()
});

export const createInventoryTransactionInputSchema = z.object({
  inventory_item_id: z.string(),
  transaction_type: inventoryTransactionTypeSchema,
  qty_change: z.number().int(),
  reason: z.string().min(1),
  order_id: z.string().nullable(),
  purchase_order_id: z.string().nullable(),
  user_id: z.string().nullable()
});

export const searchInventoryTransactionsInputSchema = z.object({
  inventory_item_id: z.string().optional(),
  transaction_type: inventoryTransactionTypeSchema.optional(),
  order_id: z.string().optional(),
  date_from: z.coerce.date().optional(),
  date_to: z.coerce.date().optional(),
  limit: z.number().int().positive().default(50),
  offset: z.number().int().nonnegative().default(0),
  sort_by: z.enum(['created_at']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc')
});

export type InventoryTransaction = z.infer<typeof inventoryTransactionSchema>;
export type CreateInventoryTransactionInput = z.infer<typeof createInventoryTransactionInputSchema>;
export type SearchInventoryTransactionsInput = z.infer<typeof searchInventoryTransactionsInputSchema>;

// ============================================
// PURCHASE ORDERS
// ============================================

export const purchaseOrderStatusSchema = z.enum(['DRAFT', 'SENT', 'RECEIVED', 'CANCELLED']);

export const purchaseOrderSchema = z.object({
  id: z.string(),
  po_number: z.string(),
  supplier_name: z.string(),
  status: purchaseOrderStatusSchema,
  total_cost: z.number(),
  notes: z.string().nullable(),
  created_by_id: z.string(),
  sent_at: z.coerce.date().nullable(),
  received_at: z.coerce.date().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export const createPurchaseOrderInputSchema = z.object({
  supplier_name: z.string().min(1).max(255),
  total_cost: z.number().nonnegative(),
  notes: z.string().nullable(),
  created_by_id: z.string()
});

export const updatePurchaseOrderInputSchema = z.object({
  id: z.string(),
  status: purchaseOrderStatusSchema.optional(),
  total_cost: z.number().nonnegative().optional(),
  notes: z.string().nullable().optional()
});

export const searchPurchaseOrdersInputSchema = z.object({
  supplier_name: z.string().optional(),
  status: purchaseOrderStatusSchema.optional(),
  limit: z.number().int().positive().default(20),
  offset: z.number().int().nonnegative().default(0),
  sort_by: z.enum(['po_number', 'created_at']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc')
});

export type PurchaseOrder = z.infer<typeof purchaseOrderSchema>;
export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderInputSchema>;
export type UpdatePurchaseOrderInput = z.infer<typeof updatePurchaseOrderInputSchema>;
export type SearchPurchaseOrdersInput = z.infer<typeof searchPurchaseOrdersInputSchema>;

// ============================================
// PURCHASE ORDER ITEMS
// ============================================

export const purchaseOrderItemSchema = z.object({
  id: z.string(),
  purchase_order_id: z.string(),
  inventory_item_id: z.string(),
  qty_ordered: z.number().int(),
  qty_received: z.number().int(),
  unit_cost: z.number(),
  line_total: z.number()
});

export const createPurchaseOrderItemInputSchema = z.object({
  purchase_order_id: z.string(),
  inventory_item_id: z.string(),
  qty_ordered: z.number().int().positive(),
  qty_received: z.number().int().nonnegative().default(0),
  unit_cost: z.number().nonnegative(),
  line_total: z.number().nonnegative()
});

export const updatePurchaseOrderItemInputSchema = z.object({
  id: z.string(),
  qty_received: z.number().int().nonnegative()
});

export type PurchaseOrderItem = z.infer<typeof purchaseOrderItemSchema>;
export type CreatePurchaseOrderItemInput = z.infer<typeof createPurchaseOrderItemInputSchema>;
export type UpdatePurchaseOrderItemInput = z.infer<typeof updatePurchaseOrderItemInputSchema>;

// ============================================
// SLA BREACHES
// ============================================

export const slaBreachTypeSchema = z.enum(['PROOF_DELAY', 'PRODUCTION_DELAY', 'RESPONSE_DELAY']);

export const slaBreachSchema = z.object({
  id: z.string(),
  order_id: z.string(),
  breach_type: slaBreachTypeSchema,
  target_time: z.coerce.date(),
  actual_time: z.coerce.date().nullable(),
  breach_duration_hours: z.number().nullable(),
  reason: z.string().nullable(),
  resolved_at: z.coerce.date().nullable(),
  created_at: z.coerce.date()
});

export const createSlaBreachInputSchema = z.object({
  order_id: z.string(),
  breach_type: slaBreachTypeSchema,
  target_time: z.coerce.date(),
  actual_time: z.coerce.date().nullable(),
  breach_duration_hours: z.number().nonnegative().nullable(),
  reason: z.string().nullable()
});

export const updateSlaBreachInputSchema = z.object({
  id: z.string(),
  resolved_at: z.coerce.date().nullable()
});

export type SlaBreach = z.infer<typeof slaBreachSchema>;
export type CreateSlaBreachInput = z.infer<typeof createSlaBreachInputSchema>;
export type UpdateSlaBreachInput = z.infer<typeof updateSlaBreachInputSchema>;

// ============================================
// SLA TIMERS
// ============================================

export const slaTimerTypeSchema = z.enum(['FIRST_PROOF', 'REVISION_TURNAROUND', 'PRODUCTION']);

export const slaTimerSchema = z.object({
  id: z.string(),
  order_id: z.string(),
  timer_type: slaTimerTypeSchema,
  started_at: z.coerce.date(),
  due_at: z.coerce.date(),
  completed_at: z.coerce.date().nullable(),
  is_breached: z.boolean(),
  breach_notified: z.boolean()
});

export const createSlaTimerInputSchema = z.object({
  order_id: z.string(),
  timer_type: slaTimerTypeSchema,
  started_at: z.coerce.date(),
  due_at: z.coerce.date()
});

export const updateSlaTimerInputSchema = z.object({
  id: z.string(),
  completed_at: z.coerce.date().nullable().optional(),
  is_breached: z.boolean().optional(),
  breach_notified: z.boolean().optional()
});

export type SlaTimer = z.infer<typeof slaTimerSchema>;
export type CreateSlaTimerInput = z.infer<typeof createSlaTimerInputSchema>;
export type UpdateSlaTimerInput = z.infer<typeof updateSlaTimerInputSchema>;