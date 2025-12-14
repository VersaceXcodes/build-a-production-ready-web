import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import morgan from 'morgan';
import jwt from 'jsonwebtoken';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import crypto from 'crypto';
import multer from 'multer';
import sharp from 'sharp';
import { z } from 'zod';

import {
  userSchema,
  createUserInputSchema,
  updateUserInputSchema,
  searchUsersInputSchema,
  customerProfileSchema,
  updateCustomerProfileInputSchema,
  staffProfileSchema,
  serviceCategorySchema,
  createServiceCategoryInputSchema,
  updateServiceCategoryInputSchema,
  searchServiceCategoriesInputSchema,
  serviceSchema,
  createServiceInputSchema,
  updateServiceInputSchema,
  searchServicesInputSchema,
  serviceOptionSchema,
  createServiceOptionInputSchema,
  updateServiceOptionInputSchema,
  tierPackageSchema,
  createTierPackageInputSchema,
  updateTierPackageInputSchema,
  tierFeatureSchema,
  createTierFeatureInputSchema,
  updateTierFeatureInputSchema,
  tierDeliverableSchema,
  createTierDeliverableInputSchema,
  updateTierDeliverableInputSchema,
  quoteSchema,
  updateQuoteInputSchema,
  searchQuotesInputSchema,
  quoteAnswerSchema,
  createQuoteAnswerInputSchema,
  orderSchema,
  updateOrderInputSchema,
  searchOrdersInputSchema,
  orderDeliverablesProgressSchema,
  updateOrderDeliverablesProgressInputSchema,
  uploadSchema,
  searchUploadsInputSchema,
  bookingSchema,
  createBookingInputSchema,
  updateBookingInputSchema,
  searchBookingsInputSchema,
  proofVersionSchema,
  updateProofVersionInputSchema,
  invoiceSchema,
  createInvoiceInputSchema,
  updateInvoiceInputSchema,
  searchInvoicesInputSchema,
  paymentSchema,
  createPaymentInputSchema,
  updatePaymentInputSchema,
  searchPaymentsInputSchema,
  messageThreadSchema,
  createMessageThreadInputSchema,
  messageSchema,
  updateMessageInputSchema,
  searchMessagesInputSchema,
  galleryItemSchema,
  createGalleryItemInputSchema,
  updateGalleryItemInputSchema,
  searchGalleryItemsInputSchema,
  caseStudySchema,
  createCaseStudyInputSchema,
  updateCaseStudyInputSchema,
  searchCaseStudiesInputSchema,
  notificationSchema,
  searchNotificationsInputSchema,
  updateNotificationInputSchema,
  systemSettingSchema,
  calendarBlackoutDateSchema,
  createCalendarBlackoutDateInputSchema,
  updateCalendarBlackoutDateInputSchema,
  calendarCapacitySchema,
  createCalendarCapacityInputSchema,
  updateCalendarCapacityInputSchema,
  inquiryFormSchema,
  createInquiryFormInputSchema,
  updateInquiryFormInputSchema,
  searchInquiryFormsInputSchema,
  contentPageSchema,
  pricingRuleSchema,
  createPricingRuleInputSchema,
  updatePricingRuleInputSchema,
  auditLogSchema,
  searchAuditLogsInputSchema,
  b2bAccountSchema,
  createB2bAccountInputSchema,
  updateB2bAccountInputSchema,
  searchB2bAccountsInputSchema,
  b2bLocationSchema,
  createB2bLocationInputSchema,
  updateB2bLocationInputSchema,
  contractPricingSchema,
  createContractPricingInputSchema,
  updateContractPricingInputSchema,
  inventoryItemSchema,
  createInventoryItemInputSchema,
  updateInventoryItemInputSchema,
  searchInventoryItemsInputSchema,
  materialConsumptionRuleSchema,
  createMaterialConsumptionRuleInputSchema,
  updateMaterialConsumptionRuleInputSchema,
  purchaseOrderSchema,
  updatePurchaseOrderInputSchema,
  reorderTemplateSchema,
  createReorderTemplateInputSchema,
  slaConfigurationSchema,
  createSlaConfigurationInputSchema,
  updateSlaConfigurationInputSchema,
} from './schema.ts';

import { Pool } from 'pg';
const { DATABASE_URL, PGHOST, PGDATABASE, PGUSER, PGPASSWORD, PGPORT = 5432 } = process.env;

const pool = new Pool(
  DATABASE_URL
    ? {
        connectionString: DATABASE_URL,
        ssl: { require: true }
      }
    : {
        host: PGHOST,
        database: PGDATABASE,
        user: PGUSER,
        password: PGPASSWORD,
        port: Number(PGPORT),
        ssl: { require: true },
      }
);

dotenv.config();

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDist = path.basename(__dirname) === 'dist';
const publicDir = isDist
  ? path.resolve(__dirname, '..', 'public')
  : path.resolve(__dirname, 'public');

const storageDir = path.resolve(isDist ? path.resolve(__dirname, '..') : __dirname, 'storage');
fs.mkdirSync(storageDir, { recursive: true });

const { PORT = '3000', JWT_SECRET = 'dev-secret', FRONTEND_URL } = process.env;

function create_error(message, field, code) {
  const out = { message };
  if (field) out.field = field;
  if (code) out.code = code;
  return out;
}

function num(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function json_value(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'object') return v;
  if (typeof v === 'string') {
    const trimmed = v.trim();
    if (trimmed === '') return null;
    const as_num = Number(trimmed);
    if (!Number.isNaN(as_num) && trimmed.match(/^-?\d+(\.\d+)?$/)) return as_num;
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed;
    }
  }
  return v;
}

function now_iso() {
  return new Date().toISOString();
}

function new_id(prefix) {
  const id = crypto.randomUUID();
  return prefix ? `${prefix}_${id}` : id;
}

function to_iso_if_date(v) {
  if (v instanceof Date) return v.toISOString();
  return v;
}

function map_dates_to_iso(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(map_dates_to_iso);
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v instanceof Date) out[k] = v.toISOString();
    else if (Array.isArray(v)) out[k] = v.map(map_dates_to_iso);
    else if (v && typeof v === 'object') out[k] = map_dates_to_iso(v);
    else out[k] = v;
  }
  return out;
}

function request_debug_logger(req, _res, next) {
  try {
    const safe_body = req.body;
    console.log('[req.debug]', {
      method: req.method,
      path: req.originalUrl,
      headers: req.headers,
      params: req.params,
      query: req.query,
      body: safe_body,
    });
  } catch {}
  next();
}

app.use(cors({
  origin: FRONTEND_URL || '*',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('combined'));
app.use(request_debug_logger);

app.use('/storage', express.static(storageDir));
app.use(express.static(publicDir));

const upload_multer = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024,
  }
});

async function authenticate_token(req, res, next) {
  const auth_header = req.headers['authorization'];
  const token = auth_header && auth_header.startsWith('Bearer ') ? auth_header.slice('Bearer '.length) : null;

  if (!token) {
    return res.status(401).json(create_error('Access token required', 'authorization', 'AUTH_TOKEN_REQUIRED'));
  }

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch {
    return res.status(401).json(create_error('Invalid or expired token', 'authorization', 'AUTH_TOKEN_INVALID'));
  }

  try {
    const result = await pool.query(
      'SELECT id, email, password_hash, name, role, status, created_at, updated_at FROM users WHERE id = $1',
      [decoded.user_id]
    );
    if (result.rows.length === 0) {
      return res.status(401).json(create_error('Invalid token user', 'authorization', 'AUTH_USER_NOT_FOUND'));
    }
    const parsed = userSchema.parse(result.rows[0]);
    if (parsed.status !== 'ACTIVE') {
      return res.status(401).json(create_error('Account is not active', 'status', 'AUTH_USER_INACTIVE'));
    }
    req.user = parsed;
    next();
  } catch (e) {
    return res.status(500).json(create_error('Internal server error', undefined, 'INTERNAL_SERVER_ERROR'));
  }
}

function require_role(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json(create_error('Access token required', 'authorization', 'AUTH_TOKEN_REQUIRED'));
    if (!roles.includes(req.user.role)) {
      return res.status(403).json(create_error('Forbidden', 'role', 'FORBIDDEN'));
    }
    next();
  };
}

async function is_feature_enabled(flag) {
  try {
    const r = await pool.query('SELECT id, key, value, updated_at FROM system_settings WHERE key = $1 LIMIT 1', ['feature_flags']);
    if (r.rows.length === 0) return true;
    const parsed = systemSettingSchema.parse({
      ...r.rows[0],
      value: json_value(r.rows[0].value),
    });
    const flags = parsed.value && typeof parsed.value === 'object' ? parsed.value : {};
    if (typeof flags[flag] === 'boolean') return flags[flag];
    return true;
  } catch {
    return true;
  }
}

function require_feature(flag) {
  return async (req, res, next) => {
    const enabled = await is_feature_enabled(flag);
    if (!enabled) return res.status(403).json(create_error('Feature not enabled', 'feature_flags', 'FEATURE_DISABLED'));
    next();
  };
}

async function get_setting_value(key, default_value = null) {
  const r = await pool.query('SELECT value FROM system_settings WHERE key = $1 LIMIT 1', [key]);
  if (r.rows.length === 0) return default_value;
  return json_value(r.rows[0].value);
}

async function get_effective_payments_sum(order_id) {
  const r = await pool.query(
    `SELECT
       COALESCE(SUM(
         CASE
           WHEN status = 'COMPLETED' THEN amount
           WHEN status = 'REFUNDED' THEN -amount
           ELSE 0
         END
       ), 0) AS total
     FROM payments
     WHERE order_id = $1`,
    [order_id]
  );
  return num(r.rows[0].total) ?? 0;
}

async function recalc_order_balance(client, order_id) {
  const order_r = await client.query('SELECT * FROM orders WHERE id = $1', [order_id]);
  if (order_r.rows.length === 0) return null;
  const order_row = order_r.rows[0];
  const total_amount = num(order_row.total_amount) ?? 0;

  const pay_r = await client.query(
    `SELECT
       COALESCE(SUM(
         CASE
           WHEN status = 'COMPLETED' THEN amount
           WHEN status = 'REFUNDED' THEN -amount
           ELSE 0
         END
       ), 0) AS paid
     FROM payments WHERE order_id = $1`,
    [order_id]
  );

  const paid = num(pay_r.rows[0].paid) ?? 0;
  const balance_due = total_amount - paid;
  const updated_at = now_iso();

  await client.query('UPDATE orders SET balance_due = $1, updated_at = $2 WHERE id = $3', [balance_due, updated_at, order_id]);
  const refreshed = await client.query('SELECT * FROM orders WHERE id = $1', [order_id]);
  return refreshed.rows[0];
}

async function create_notification(client, { user_id, type, message, entity_id = null }) {
  const id = new_id('notif');
  const created_at = now_iso();
  await client.query(
    `INSERT INTO notifications (id, user_id, type, message, entity_id, is_read, created_at)
     VALUES ($1, $2, $3, $4, $5, false, $6)`,
    [id, user_id, type, message, entity_id, created_at]
  );
}

async function create_audit_log(client, { user_id, order_id = null, action, details = null }) {
  const id = new_id('audit');
  const created_at = now_iso();
  await client.query(
    `INSERT INTO audit_logs (id, user_id, order_id, action, details, created_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, user_id, order_id, action, details, created_at]
  );
}

async function generate_order_number(client) {
  const year = new Date().getUTCFullYear();
  const prefix = `ORD-${year}-`;
  const r = await client.query(
    `SELECT order_number FROM orders
     WHERE order_number LIKE $1
     ORDER BY order_number DESC
     LIMIT 1`,
    [`${prefix}%`]
  );
  let next = 1;
  if (r.rows.length > 0) {
    const last = r.rows[0].order_number;
    const parts = String(last).split('-');
    const last_num = Number(parts[2]);
    if (Number.isFinite(last_num)) next = last_num + 1;
  }
  return `${prefix}${String(next).padStart(4, '0')}`;
}

async function generate_invoice_number(client) {
  const year = new Date().getUTCFullYear();
  const prefix = `INV-${year}-`;
  const r = await client.query(
    `SELECT invoice_number FROM invoices
     WHERE invoice_number LIKE $1
     ORDER BY invoice_number DESC
     LIMIT 1`,
    [`${prefix}%`]
  );
  let next = 1;
  if (r.rows.length > 0) {
    const last = r.rows[0].invoice_number;
    const parts = String(last).split('-');
    const last_num = Number(parts[2]);
    if (Number.isFinite(last_num)) next = last_num + 1;
  }
  return `${prefix}${String(next).padStart(4, '0')}`;
}

async function generate_po_number(client) {
  const year = new Date().getUTCFullYear();
  const prefix = `PO-${year}-`;
  const r = await client.query(
    `SELECT po_number FROM purchase_orders
     WHERE po_number LIKE $1
     ORDER BY po_number DESC
     LIMIT 1`,
    [`${prefix}%`]
  );
  let next = 1;
  if (r.rows.length > 0) {
    const last = r.rows[0].po_number;
    const parts = String(last).split('-');
    const last_num = Number(parts[2]);
    if (Number.isFinite(last_num)) next = last_num + 1;
  }
  return `${prefix}${String(next).padStart(3, '0')}`;
}

async function ensure_quote_thread(client, quote_id) {
  const r = await client.query('SELECT * FROM message_threads WHERE quote_id = $1 LIMIT 1', [quote_id]);
  if (r.rows.length > 0) return r.rows[0];
  const id = new_id('thread');
  const ts = now_iso();
  await client.query(
    `INSERT INTO message_threads (id, quote_id, order_id, created_at, updated_at)
     VALUES ($1, $2, NULL, $3, $3)`,
    [id, quote_id, ts]
  );
  const created = await client.query('SELECT * FROM message_threads WHERE id = $1', [id]);
  return created.rows[0];
}

async function ensure_order_thread(client, { quote_id = null, order_id }) {
  const existing_by_order = await client.query('SELECT * FROM message_threads WHERE order_id = $1 LIMIT 1', [order_id]);
  if (existing_by_order.rows.length > 0) return existing_by_order.rows[0];

  if (quote_id) {
    const qt = await client.query('SELECT * FROM message_threads WHERE quote_id = $1 LIMIT 1', [quote_id]);
    if (qt.rows.length > 0) {
      const ts = now_iso();
      await client.query('UPDATE message_threads SET order_id = $1, updated_at = $2 WHERE id = $3', [order_id, ts, qt.rows[0].id]);
      const updated = await client.query('SELECT * FROM message_threads WHERE id = $1', [qt.rows[0].id]);
      return updated.rows[0];
    }
  }

  const id = new_id('thread');
  const ts = now_iso();
  await client.query(
    `INSERT INTO message_threads (id, quote_id, order_id, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $4)`,
    [id, quote_id, order_id, ts]
  );
  const created = await client.query('SELECT * FROM message_threads WHERE id = $1', [id]);
  return created.rows[0];
}

function save_buffer_to_storage({ buffer, original_name }) {
  const safe_name = String(original_name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
  const file_name = `${crypto.randomUUID()}-${safe_name}`;
  const file_path = path.join(storageDir, file_name);
  fs.writeFileSync(file_path, buffer);
  return { file_name, file_path, file_url: `/storage/${file_name}` };
}

async function compute_dpi_warning({ mimetype, buffer }) {
  if (mimetype !== 'image/png' && mimetype !== 'image/jpeg') return false;
  const threshold = Number(await get_setting_value('low_dpi_warning_threshold', 300)) || 300;
  try {
    const meta = await sharp(buffer).metadata();
    const density = meta && typeof meta.density === 'number' ? meta.density : null;
    if (!density) return true;
    return density < threshold;
  } catch {
    return true;
  }
}

function is_staff_or_admin(user) {
  return user && (user.role === 'STAFF' || user.role === 'ADMIN');
}

async function calculate_quote_estimate({ client, quote_id, customer_id }) {
  const quote_r = await client.query('SELECT * FROM quotes WHERE id = $1', [quote_id]);
  if (quote_r.rows.length === 0) throw new Error('QUOTE_NOT_FOUND');
  const quote = quote_r.rows[0];
  if (quote.customer_id !== customer_id) throw new Error('FORBIDDEN');

  const options_r = await client.query(
    'SELECT * FROM service_options WHERE service_id = $1 ORDER BY sort_order ASC',
    [quote.service_id]
  );

  const answers_r = await client.query(
    'SELECT * FROM quote_answers WHERE quote_id = $1',
    [quote_id]
  );

  const options = options_r.rows;
  const answers_map = new Map();
  for (const a of answers_r.rows) answers_map.set(a.option_key, json_value(a.value));

  let subtotal = 0;

  for (const opt of options) {
    const key = opt.key;
    if (!answers_map.has(key)) continue;
    const answer_value = answers_map.get(key);
    const impact = json_value(opt.pricing_impact);

    if (impact && typeof impact === 'object') {
      const av = typeof answer_value === 'string' || typeof answer_value === 'number' ? String(answer_value) : null;
      if (av !== null && Object.prototype.hasOwnProperty.call(impact, av)) {
        const add = Number(impact[av]);
        if (Number.isFinite(add)) subtotal += add;
      }
    }
  }

  const rules_r = await client.query(
    `SELECT * FROM pricing_rules
     WHERE is_active = true
       AND (service_id = $1 OR service_id IS NULL)`,
    [quote.service_id]
  );

  const qty_raw = answers_map.get('quantity');
  const qty = qty_raw !== undefined && qty_raw !== null ? Number(qty_raw) : null;

  for (const rule of rules_r.rows) {
    if (rule.rule_type === 'VOLUME_DISCOUNT' && qty && qty > 0) {
      const cfg = json_value(rule.rule_config);
      const thresholds = cfg && cfg.thresholds ? cfg.thresholds : [];
      let best = null;
      for (const t of thresholds) {
        const min_qty = Number(t.min_qty);
        const discount_pct = Number(t.discount_pct);
        if (Number.isFinite(min_qty) && Number.isFinite(discount_pct) && qty >= min_qty) {
          if (!best || min_qty > best.min_qty) best = { min_qty, discount_pct };
        }
      }
      if (best) {
        subtotal = subtotal * (1 - best.discount_pct / 100);
      }
    }
  }

  try {
    const cp_r = await client.query('SELECT * FROM customer_profiles WHERE user_id = $1 LIMIT 1', [customer_id]);
    if (cp_r.rows.length > 0 && cp_r.rows[0].b2b_account_id) {
      const b2b_account_id = cp_r.rows[0].b2b_account_id;
      const contract_r = await client.query(
        'SELECT * FROM contract_pricing WHERE account_id = $1 AND service_id = $2 LIMIT 1',
        [b2b_account_id, quote.service_id]
      );
      if (contract_r.rows.length > 0) {
        const pricing_json = json_value(contract_r.rows[0].pricing_json);
        const tier_id = quote.tier_id;
        if (tier_id && pricing_json && typeof pricing_json === 'object' && pricing_json[tier_id]) {
          const tier_cfg = pricing_json[tier_id];
          if (qty && tier_cfg.quantity_breaks && tier_cfg.quantity_breaks[String(qty)] !== undefined) {
            const p = Number(tier_cfg.quantity_breaks[String(qty)]);
            if (Number.isFinite(p)) subtotal = p;
          }
          if (qty && tier_cfg.quantity_pricing && tier_cfg.quantity_pricing[String(qty)] !== undefined) {
            const p = Number(tier_cfg.quantity_pricing[String(qty)]);
            if (Number.isFinite(p)) subtotal = p;
          }
          if (tier_cfg.base_price && Number.isFinite(Number(tier_cfg.base_price))) {
            subtotal = Number(tier_cfg.base_price);
          }
        }
      } else {
        const b2b_r = await client.query('SELECT * FROM b2b_accounts WHERE id = $1 LIMIT 1', [b2b_account_id]);
        if (b2b_r.rows.length > 0) {
          const discount_pct = num(b2b_r.rows[0].discount_pct);
          if (discount_pct && discount_pct > 0) subtotal = subtotal * (1 - discount_pct / 100);
        }
      }
    }
  } catch {}

  subtotal = Math.round(subtotal * 100) / 100;

  const ts = now_iso();
  await client.query('UPDATE quotes SET estimate_subtotal = $1, updated_at = $2 WHERE id = $3', [subtotal, ts, quote_id]);
  return subtotal;
}

app.post('/api/auth/register', async (req, res) => {
  const register_schema = createUserInputSchema
    .pick({ email: true, password: true, name: true })
    .extend({
      phone: z.string().max(50).optional(),
      company_name: z.string().max(255).optional(),
    });

  const parsed = register_schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json(create_error('Invalid input', undefined, 'VALIDATION_ERROR'));
  }

  const { email, password, name, phone, company_name } = parsed.data;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existing = await client.query('SELECT id FROM users WHERE email = $1 LIMIT 1', [email.toLowerCase().trim()]);
    if (existing.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json(create_error('Email already registered', 'email', 'DUPLICATE_EMAIL'));
    }

    const user_id = new_id('user');
    const ts = now_iso();

    await client.query(
      `INSERT INTO users (id, email, password_hash, name, role, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'CUSTOMER', 'ACTIVE', $5, $5)`,
      [user_id, email.toLowerCase().trim(), password, name.trim(), ts]
    );

    const profile_id = new_id('cust');
    await client.query(
      `INSERT INTO customer_profiles (id, user_id, phone, address, company_name, b2b_account_id, created_at, updated_at)
       VALUES ($1, $2, $3, NULL, $4, NULL, $5, $5)`,
      [profile_id, user_id, phone || null, company_name || null, ts]
    );

    const user_r = await client.query('SELECT id, email, password_hash, name, role, status, created_at, updated_at FROM users WHERE id = $1', [user_id]);
    const user_parsed = userSchema.parse(user_r.rows[0]);

    const token = jwt.sign(
      { user_id: user_parsed.id, email: user_parsed.email, role: user_parsed.role, name: user_parsed.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    await client.query('COMMIT');

    const user_public = userSchema.pick({ id: true, email: true, name: true, role: true, status: true, created_at: true, updated_at: true }).parse(user_parsed);

    return res.status(201).json({ user: map_dates_to_iso(user_public), token });
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch {}
    return res.status(500).json(create_error('Internal server error', undefined, 'INTERNAL_SERVER_ERROR'));
  } finally {
    client.release();
  }
});

app.post('/api/auth/login', async (req, res) => {
  const login_schema = z.object({ email: z.string().email(), password: z.string().min(1) });
  const parsed = login_schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(401).json(create_error('Invalid credentials'));
  }

  const { email, password } = parsed.data;

  try {
    const r = await pool.query('SELECT id, email, password_hash, name, role, status, created_at, updated_at FROM users WHERE email = $1 LIMIT 1', [email.toLowerCase().trim()]);
    if (r.rows.length === 0) return res.status(401).json(create_error('Invalid credentials'));

    const u = userSchema.parse(r.rows[0]);
    if (u.status !== 'ACTIVE') return res.status(401).json(create_error('Invalid credentials'));

    if (u.password_hash !== password) return res.status(401).json(create_error('Invalid credentials'));

    const token = jwt.sign(
      { user_id: u.id, email: u.email, role: u.role, name: u.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const user_public = userSchema.pick({ id: true, email: true, name: true, role: true, status: true, created_at: true, updated_at: true }).parse(u);
    return res.status(200).json({ user: map_dates_to_iso(user_public), token });
  } catch {
    return res.status(500).json(create_error('Internal server error', undefined, 'INTERNAL_SERVER_ERROR'));
  }
});

app.post('/api/auth/logout', authenticate_token, async (_req, res) => {
  return res.status(200).json({ message: 'Logout successful' });
});

app.post('/api/auth/forgot-password', async (req, res) => {
  const schema = z.object({ email: z.string().email() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(200).json({ message: 'Reset email sent' });

  const { email } = parsed.data;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const u = await client.query('SELECT id FROM users WHERE email = $1 LIMIT 1', [email.toLowerCase().trim()]);
    if (u.rows.length > 0) {
      const user_id = u.rows[0].id;
      const token = crypto.randomBytes(24).toString('hex');
      const id = new_id('reset');
      const created_at = now_iso();
      const expires_at = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      await client.query(
        `INSERT INTO password_reset_tokens (id, user_id, token, expires_at, used, created_at)
         VALUES ($1, $2, $3, $4, false, $5)`,
        [id, user_id, token, expires_at, created_at]
      );
    }
    await client.query('COMMIT');
    return res.status(200).json({ message: 'Reset email sent' });
  } catch {
    try { await client.query('ROLLBACK'); } catch {}
    return res.status(200).json({ message: 'Reset email sent' });
  } finally {
    client.release();
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  const schema = z.object({ token: z.string().min(1), password: z.string().min(8).max(100) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(create_error('Invalid or expired token', 'token', 'RESET_TOKEN_INVALID'));

  const { token, password } = parsed.data;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const r = await client.query('SELECT * FROM password_reset_tokens WHERE token = $1 LIMIT 1', [token]);
    if (r.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json(create_error('Invalid or expired token', 'token', 'RESET_TOKEN_INVALID'));
    }
    const row = r.rows[0];
    const expires_at = new Date(row.expires_at);
    if (row.used || Date.now() > expires_at.getTime()) {
      await client.query('ROLLBACK');
      return res.status(400).json(create_error('Invalid or expired token', 'token', 'RESET_TOKEN_INVALID'));
    }

    const ts = now_iso();
    await client.query('UPDATE users SET password_hash = $1, updated_at = $2 WHERE id = $3', [password, ts, row.user_id]);
    await client.query('UPDATE password_reset_tokens SET used = true WHERE id = $1', [row.id]);

    await client.query('COMMIT');
    return res.status(200).json({ message: 'Password reset successful' });
  } catch {
    try { await client.query('ROLLBACK'); } catch {}
    return res.status(500).json(create_error('Internal server error', undefined, 'INTERNAL_SERVER_ERROR'));
  } finally {
    client.release();
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

export { app, pool };

app.listen(Number(PORT) || 3000, '0.0.0.0', () => {
  console.log(`Server running on port ${Number(PORT) || 3000}`);
});