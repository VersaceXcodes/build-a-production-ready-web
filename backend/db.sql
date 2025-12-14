-- ============================================
-- CREATE TABLES
-- ============================================

-- Users table
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'CUSTOMER',
    phone TEXT,
    company_name TEXT,
    address TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    email_verified BOOLEAN NOT NULL DEFAULT false,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Staff permissions table
CREATE TABLE staff_permissions (
    id TEXT PRIMARY KEY,
    user_id TEXT UNIQUE NOT NULL REFERENCES users(id),
    can_view_all_jobs BOOLEAN NOT NULL DEFAULT false,
    can_finalize_quotes BOOLEAN NOT NULL DEFAULT false,
    can_manage_calendar BOOLEAN NOT NULL DEFAULT false,
    can_access_inventory BOOLEAN NOT NULL DEFAULT false,
    can_upload_proofs BOOLEAN NOT NULL DEFAULT true,
    can_update_order_status BOOLEAN NOT NULL DEFAULT true,
    department TEXT
);

-- Service categories table
CREATE TABLE service_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Services table
CREATE TABLE services (
    id TEXT PRIMARY KEY,
    category_id TEXT NOT NULL REFERENCES service_categories(id),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT NOT NULL,
    short_description TEXT,
    requires_booking BOOLEAN NOT NULL DEFAULT false,
    requires_proof BOOLEAN NOT NULL DEFAULT false,
    is_top_seller BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    base_price NUMERIC,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Service options table
CREATE TABLE service_options (
    id TEXT PRIMARY KEY,
    service_id TEXT NOT NULL REFERENCES services(id),
    field_key TEXT NOT NULL,
    label TEXT NOT NULL,
    field_type TEXT NOT NULL,
    is_required BOOLEAN NOT NULL DEFAULT false,
    help_text TEXT,
    choices TEXT,
    pricing_impact TEXT,
    validation_rules TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0
);

-- Tiers table
CREATE TABLE tiers (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    tagline TEXT,
    description TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    turnaround_days_min INTEGER,
    turnaround_days_max INTEGER,
    revisions_allowed INTEGER,
    rush_fee_percentage NUMERIC,
    deposit_percentage NUMERIC,
    price_multiplier NUMERIC,
    sla_response_hours INTEGER,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Tier features table
CREATE TABLE tier_features (
    id TEXT PRIMARY KEY,
    tier_id TEXT NOT NULL REFERENCES tiers(id),
    group_name TEXT NOT NULL,
    feature_key TEXT NOT NULL,
    feature_label TEXT NOT NULL,
    feature_value TEXT NOT NULL,
    is_included BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0
);

-- Tier deliverables table
CREATE TABLE tier_deliverables (
    id TEXT PRIMARY KEY,
    tier_id TEXT NOT NULL REFERENCES tiers(id),
    description TEXT NOT NULL,
    service_category_filter TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0
);

-- Quotes table
CREATE TABLE quotes (
    id TEXT PRIMARY KEY,
    quote_number TEXT UNIQUE NOT NULL,
    customer_id TEXT NOT NULL REFERENCES users(id),
    service_id TEXT NOT NULL REFERENCES services(id),
    tier_id TEXT REFERENCES tiers(id),
    status TEXT NOT NULL DEFAULT 'QUOTE_REQUESTED',
    estimate_min NUMERIC,
    estimate_max NUMERIC,
    final_subtotal NUMERIC,
    tax_rate NUMERIC,
    tax_amount NUMERIC,
    total_amount NUMERIC,
    customer_notes TEXT,
    admin_notes TEXT,
    no_design_files BOOLEAN NOT NULL DEFAULT false,
    finalized_at TEXT,
    expires_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Quote answers table
CREATE TABLE quote_answers (
    id TEXT PRIMARY KEY,
    quote_id TEXT NOT NULL REFERENCES quotes(id),
    option_key TEXT NOT NULL,
    option_label TEXT NOT NULL,
    answer_value TEXT NOT NULL
);

-- Orders table (must be created before uploads references it)
CREATE TABLE orders (
    id TEXT PRIMARY KEY,
    order_number TEXT UNIQUE NOT NULL,
    quote_id TEXT UNIQUE NOT NULL REFERENCES quotes(id),
    customer_id TEXT NOT NULL REFERENCES users(id),
    service_id TEXT NOT NULL REFERENCES services(id),
    tier_id TEXT NOT NULL REFERENCES tiers(id),
    assigned_staff_id TEXT REFERENCES users(id),
    status TEXT NOT NULL DEFAULT 'DEPOSIT_PAID',
    subtotal NUMERIC NOT NULL,
    emergency_fee NUMERIC NOT NULL DEFAULT 0,
    rush_fee NUMERIC NOT NULL DEFAULT 0,
    tax_rate NUMERIC NOT NULL,
    tax_amount NUMERIC NOT NULL,
    total_amount NUMERIC NOT NULL,
    deposit_percentage NUMERIC NOT NULL,
    deposit_amount NUMERIC NOT NULL,
    balance_due NUMERIC NOT NULL,
    revisions_used INTEGER NOT NULL DEFAULT 0,
    due_at TEXT,
    completed_at TEXT,
    sla_breached BOOLEAN NOT NULL DEFAULT false,
    priority INTEGER NOT NULL DEFAULT 3,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Uploads table
CREATE TABLE uploads (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    quote_id TEXT REFERENCES quotes(id),
    order_id TEXT REFERENCES orders(id),
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    dpi_warning BOOLEAN NOT NULL DEFAULT false,
    created_at TEXT NOT NULL
);

-- Bookings table
CREATE TABLE bookings (
    id TEXT PRIMARY KEY,
    quote_id TEXT UNIQUE NOT NULL REFERENCES quotes(id),
    customer_id TEXT NOT NULL REFERENCES users(id),
    booking_date TEXT NOT NULL,
    time_slot TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING',
    is_emergency BOOLEAN NOT NULL DEFAULT false,
    emergency_fee_percentage NUMERIC,
    emergency_fee_amount NUMERIC,
    reschedule_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Order checklist items table
CREATE TABLE order_checklist_items (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES orders(id),
    deliverable_id TEXT NOT NULL REFERENCES tier_deliverables(id),
    description TEXT NOT NULL,
    is_completed BOOLEAN NOT NULL DEFAULT false,
    completed_at TEXT,
    completed_by_staff_id TEXT REFERENCES users(id),
    notes TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0
);

-- Proof versions table
CREATE TABLE proof_versions (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES orders(id),
    version_number INTEGER NOT NULL,
    file_url TEXT NOT NULL,
    created_by_staff_id TEXT NOT NULL REFERENCES users(id),
    status TEXT NOT NULL DEFAULT 'SENT',
    staff_message TEXT,
    customer_comment TEXT,
    approved_at TEXT,
    created_at TEXT NOT NULL
);

-- Message threads table
CREATE TABLE message_threads (
    id TEXT PRIMARY KEY,
    quote_id TEXT REFERENCES quotes(id),
    order_id TEXT REFERENCES orders(id),
    customer_id TEXT NOT NULL REFERENCES users(id),
    last_message_at TEXT,
    created_at TEXT NOT NULL
);

-- Messages table
CREATE TABLE messages (
    id TEXT PRIMARY KEY,
    thread_id TEXT NOT NULL REFERENCES message_threads(id),
    sender_id TEXT NOT NULL REFERENCES users(id),
    body TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    read_at TEXT,
    created_at TEXT NOT NULL
);

-- Payments table
CREATE TABLE payments (
    id TEXT PRIMARY KEY,
    payment_number TEXT UNIQUE NOT NULL,
    order_id TEXT NOT NULL REFERENCES orders(id),
    amount NUMERIC NOT NULL,
    method TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    transaction_ref TEXT,
    payment_date TEXT,
    receipt_url TEXT,
    verified_by_admin_id TEXT REFERENCES users(id),
    verified_at TEXT,
    refund_amount NUMERIC,
    refund_reason TEXT,
    refunded_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Invoices table
CREATE TABLE invoices (
    id TEXT PRIMARY KEY,
    invoice_number TEXT UNIQUE NOT NULL,
    order_id TEXT NOT NULL REFERENCES orders(id),
    customer_id TEXT NOT NULL REFERENCES users(id),
    subtotal NUMERIC NOT NULL,
    tax_rate NUMERIC NOT NULL,
    tax_amount NUMERIC NOT NULL,
    total_amount NUMERIC NOT NULL,
    amount_paid NUMERIC NOT NULL DEFAULT 0,
    amount_due NUMERIC NOT NULL,
    issued_at TEXT NOT NULL,
    due_date TEXT,
    paid_at TEXT,
    invoice_url TEXT
);

-- Gallery items table
CREATE TABLE gallery_items (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT NOT NULL,
    service_category_id TEXT REFERENCES service_categories(id),
    service_id TEXT REFERENCES services(id),
    tier_used TEXT,
    client_name TEXT,
    client_approved_display BOOLEAN NOT NULL DEFAULT false,
    testimonial_quote TEXT,
    timeline_description TEXT,
    is_featured BOOLEAN NOT NULL DEFAULT false,
    is_visible BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Gallery images table
CREATE TABLE gallery_images (
    id TEXT PRIMARY KEY,
    gallery_item_id TEXT NOT NULL REFERENCES gallery_items(id),
    image_url TEXT NOT NULL,
    caption TEXT,
    is_primary BOOLEAN NOT NULL DEFAULT false,
    sort_order INTEGER NOT NULL DEFAULT 0
);

-- Materials table
CREATE TABLE materials (
    id TEXT PRIMARY KEY,
    sku TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    unit TEXT NOT NULL,
    cost_per_unit NUMERIC NOT NULL,
    supplier_name TEXT,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Capacity settings table
CREATE TABLE capacity_settings (
    id TEXT PRIMARY KEY,
    day_of_week INTEGER NOT NULL,
    is_working_day BOOLEAN NOT NULL DEFAULT true,
    start_time TEXT,
    end_time TEXT,
    default_slots INTEGER NOT NULL DEFAULT 5,
    emergency_slots_max INTEGER NOT NULL DEFAULT 2,
    emergency_fee_percentage NUMERIC NOT NULL DEFAULT 20
);

-- Capacity overrides table
CREATE TABLE capacity_overrides (
    id TEXT PRIMARY KEY,
    override_date TEXT UNIQUE NOT NULL,
    slots_available INTEGER NOT NULL,
    reason TEXT,
    created_at TEXT NOT NULL
);

-- Blackout dates table
CREATE TABLE blackout_dates (
    id TEXT PRIMARY KEY,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    reason TEXT,
    created_at TEXT NOT NULL
);

-- Contact inquiries table
CREATE TABLE contact_inquiries (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'NEW',
    replied_at TEXT,
    resolved_at TEXT,
    created_at TEXT NOT NULL
);

-- Content sections table
CREATE TABLE content_sections (
    id TEXT PRIMARY KEY,
    section_key TEXT UNIQUE NOT NULL,
    section_type TEXT NOT NULL,
    content TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Team members table
CREATE TABLE team_members (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    photo_url TEXT,
    bio TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_visible BOOLEAN NOT NULL DEFAULT true
);

-- FAQs table
CREATE TABLE faqs (
    id TEXT PRIMARY KEY,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0
);

-- App settings table
CREATE TABLE app_settings (
    id TEXT PRIMARY KEY,
    setting_key TEXT UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    setting_type TEXT NOT NULL,
    description TEXT,
    updated_at TEXT NOT NULL
);

-- Feature flags table
CREATE TABLE feature_flags (
    id TEXT PRIMARY KEY,
    flag_key TEXT UNIQUE NOT NULL,
    flag_name TEXT NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT false,
    description TEXT,
    updated_at TEXT NOT NULL
);

-- Audit logs table
CREATE TABLE audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    changes TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at TEXT NOT NULL
);

-- Notifications table
CREATE TABLE notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    notification_type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link_url TEXT,
    is_read BOOLEAN NOT NULL DEFAULT false,
    read_at TEXT,
    created_at TEXT NOT NULL
);

-- Email verification tokens table
CREATE TABLE email_verification_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    token TEXT UNIQUE NOT NULL,
    expires_at TEXT NOT NULL,
    used_at TEXT,
    created_at TEXT NOT NULL
);

-- Password reset tokens table
CREATE TABLE password_reset_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    token TEXT UNIQUE NOT NULL,
    expires_at TEXT NOT NULL,
    used_at TEXT,
    created_at TEXT NOT NULL
);

-- B2B accounts table
CREATE TABLE b2b_accounts (
    id TEXT PRIMARY KEY,
    company_name TEXT NOT NULL,
    main_contact_id TEXT NOT NULL REFERENCES users(id),
    account_manager_id TEXT REFERENCES users(id),
    contract_start_date TEXT NOT NULL,
    contract_end_date TEXT NOT NULL,
    contract_terms TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    consolidated_invoicing BOOLEAN NOT NULL DEFAULT false,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- B2B locations table
CREATE TABLE b2b_locations (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES b2b_accounts(id),
    location_name TEXT NOT NULL,
    address TEXT NOT NULL,
    contact_person TEXT,
    contact_phone TEXT,
    contact_email TEXT,
    created_at TEXT NOT NULL
);

-- Contract pricing table
CREATE TABLE contract_pricing (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES b2b_accounts(id),
    service_id TEXT NOT NULL REFERENCES services(id),
    tier_id TEXT NOT NULL REFERENCES tiers(id),
    contract_price NUMERIC,
    discount_percentage NUMERIC,
    effective_date TEXT,
    expiry_date TEXT,
    created_at TEXT NOT NULL
);

-- Inventory items table
CREATE TABLE inventory_items (
    id TEXT PRIMARY KEY,
    sku TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    unit TEXT NOT NULL,
    qty_on_hand INTEGER NOT NULL DEFAULT 0,
    reorder_point INTEGER NOT NULL,
    reorder_qty INTEGER NOT NULL,
    supplier_name TEXT,
    cost_per_unit NUMERIC NOT NULL,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Material consumption rules table
CREATE TABLE material_consumption_rules (
    id TEXT PRIMARY KEY,
    service_id TEXT NOT NULL REFERENCES services(id),
    inventory_item_id TEXT NOT NULL REFERENCES inventory_items(id),
    qty_per_unit NUMERIC NOT NULL,
    tier_filter TEXT,
    created_at TEXT NOT NULL
);

-- Inventory transactions table
CREATE TABLE inventory_transactions (
    id TEXT PRIMARY KEY,
    inventory_item_id TEXT NOT NULL REFERENCES inventory_items(id),
    transaction_type TEXT NOT NULL,
    qty_change INTEGER NOT NULL,
    reason TEXT NOT NULL,
    order_id TEXT REFERENCES orders(id),
    purchase_order_id TEXT,
    user_id TEXT REFERENCES users(id),
    created_at TEXT NOT NULL
);

-- Purchase orders table
CREATE TABLE purchase_orders (
    id TEXT PRIMARY KEY,
    po_number TEXT UNIQUE NOT NULL,
    supplier_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'DRAFT',
    total_cost NUMERIC NOT NULL,
    notes TEXT,
    created_by_id TEXT NOT NULL REFERENCES users(id),
    sent_at TEXT,
    received_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Purchase order items table
CREATE TABLE purchase_order_items (
    id TEXT PRIMARY KEY,
    purchase_order_id TEXT NOT NULL REFERENCES purchase_orders(id),
    inventory_item_id TEXT NOT NULL REFERENCES inventory_items(id),
    qty_ordered INTEGER NOT NULL,
    qty_received INTEGER NOT NULL DEFAULT 0,
    unit_cost NUMERIC NOT NULL,
    line_total NUMERIC NOT NULL
);

-- SLA breaches table
CREATE TABLE sla_breaches (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES orders(id),
    breach_type TEXT NOT NULL,
    target_time TEXT NOT NULL,
    actual_time TEXT,
    breach_duration_hours NUMERIC,
    reason TEXT,
    resolved_at TEXT,
    created_at TEXT NOT NULL
);

-- SLA timers table
CREATE TABLE sla_timers (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES orders(id),
    timer_type TEXT NOT NULL,
    started_at TEXT NOT NULL,
    due_at TEXT NOT NULL,
    completed_at TEXT,
    is_breached BOOLEAN NOT NULL DEFAULT false,
    breach_notified BOOLEAN NOT NULL DEFAULT false
);

-- ============================================
-- SEED DATA
-- ============================================

-- Users (CUSTOMERS, ADMIN, STAFF)
INSERT INTO users (id, email, password_hash, name, role, phone, company_name, address, active, email_verified, created_at, updated_at) VALUES
('user_admin_001', 'admin@printshop.com', 'admin123', 'Admin User', 'ADMIN', '+1-555-0100', NULL, '123 Main St, Suite 100, San Francisco, CA 94102', true, true, '2024-01-01T08:00:00Z', '2024-01-01T08:00:00Z'),
('user_staff_001', 'john.designer@printshop.com', 'staff123', 'John Designer', 'STAFF', '+1-555-0101', NULL, '456 Oak Ave, San Francisco, CA 94103', true, true, '2024-01-02T08:00:00Z', '2024-01-02T08:00:00Z'),
('user_staff_002', 'sarah.manager@printshop.com', 'staff123', 'Sarah Manager', 'STAFF', '+1-555-0102', NULL, '789 Pine St, San Francisco, CA 94104', true, true, '2024-01-03T08:00:00Z', '2024-01-03T08:00:00Z'),
('user_staff_003', 'mike.tech@printshop.com', 'staff123', 'Mike Technician', 'STAFF', '+1-555-0103', NULL, '321 Elm St, San Francisco, CA 94105', true, true, '2024-01-04T08:00:00Z', '2024-01-04T08:00:00Z'),
('user_cust_001', 'alice.smith@email.com', 'password123', 'Alice Smith', 'CUSTOMER', '+1-555-1001', NULL, '100 Market St, San Francisco, CA 94111', true, true, '2024-01-15T10:30:00Z', '2024-01-15T10:30:00Z'),
('user_cust_002', 'bob.johnson@email.com', 'password123', 'Bob Johnson', 'CUSTOMER', '+1-555-1002', 'Johnson Enterprises', '200 Broadway, New York, NY 10001', true, true, '2024-01-20T11:00:00Z', '2024-01-20T11:00:00Z'),
('user_cust_003', 'carol.williams@email.com', 'password123', 'Carol Williams', 'CUSTOMER', '+1-555-1003', NULL, '300 Sunset Blvd, Los Angeles, CA 90028', true, true, '2024-02-01T09:15:00Z', '2024-02-01T09:15:00Z'),
('user_cust_004', 'david.brown@email.com', 'password123', 'David Brown', 'CUSTOMER', '+1-555-1004', 'Brown & Associates', '400 Michigan Ave, Chicago, IL 60601', true, true, '2024-02-10T14:20:00Z', '2024-02-10T14:20:00Z'),
('user_cust_005', 'emma.davis@email.com', 'password123', 'Emma Davis', 'CUSTOMER', '+1-555-1005', NULL, '500 Peachtree St, Atlanta, GA 30303', true, true, '2024-02-15T16:45:00Z', '2024-02-15T16:45:00Z'),
('user_cust_006', 'frank.miller@email.com', 'password123', 'Frank Miller', 'CUSTOMER', '+1-555-1006', 'Miller Marketing', '600 Congress Ave, Austin, TX 78701', true, false, '2024-03-01T12:00:00Z', '2024-03-01T12:00:00Z'),
('user_cust_007', 'grace.wilson@email.com', 'password123', 'Grace Wilson', 'CUSTOMER', '+1-555-1007', NULL, '700 Lincoln Rd, Miami Beach, FL 33139', true, true, '2024-03-05T13:30:00Z', '2024-03-05T13:30:00Z'),
('user_cust_008', 'henry.moore@email.com', 'password123', 'Henry Moore', 'CUSTOMER', '+1-555-1008', 'Moore Consulting', '800 Boulder Ave, Denver, CO 80202', true, true, '2024-03-10T15:00:00Z', '2024-03-10T15:00:00Z');

-- Staff permissions
INSERT INTO staff_permissions (id, user_id, can_view_all_jobs, can_finalize_quotes, can_manage_calendar, can_access_inventory, can_upload_proofs, can_update_order_status, department) VALUES
('perm_001', 'user_staff_001', true, false, false, false, true, true, 'Design'),
('perm_002', 'user_staff_002', true, true, true, true, true, true, 'Management'),
('perm_003', 'user_staff_003', true, false, true, true, true, true, 'Production');

-- Service categories
INSERT INTO service_categories (id, name, slug, description, sort_order, is_active, created_at, updated_at) VALUES
('cat_001', 'Business Cards & Stationery', 'business-cards-stationery', 'Professional business cards, letterheads, and corporate stationery', 1, true, '2024-01-01T08:00:00Z', '2024-01-01T08:00:00Z'),
('cat_002', 'Marketing Materials', 'marketing-materials', 'Flyers, brochures, posters, and promotional materials', 2, true, '2024-01-01T08:00:00Z', '2024-01-01T08:00:00Z'),
('cat_003', 'Large Format Printing', 'large-format-printing', 'Banners, billboards, vehicle wraps, and outdoor signage', 3, true, '2024-01-01T08:00:00Z', '2024-01-01T08:00:00Z'),
('cat_004', 'Packaging & Labels', 'packaging-labels', 'Custom product packaging, boxes, and label printing', 4, true, '2024-01-01T08:00:00Z', '2024-01-01T08:00:00Z'),
('cat_005', 'Apparel & Merchandise', 'apparel-merchandise', 'T-shirt printing, embroidery, and promotional merchandise', 5, true, '2024-01-01T08:00:00Z', '2024-01-01T08:00:00Z'),
('cat_006', 'Event Materials', 'event-materials', 'Conference materials, trade show displays, and event signage', 6, true, '2024-01-01T08:00:00Z', '2024-01-01T08:00:00Z');

-- Services
INSERT INTO services (id, category_id, name, slug, description, short_description, requires_booking, requires_proof, is_top_seller, is_active, base_price, created_at, updated_at) VALUES
('svc_001', 'cat_001', 'Standard Business Cards', 'standard-business-cards', 'Professional business cards printed on premium cardstock. Choose from various finishes including matte, glossy, or silk. Perfect for networking and leaving a lasting impression.', 'Premium business cards on quality cardstock', false, true, true, true, 49.99, '2024-01-01T08:00:00Z', '2024-01-01T08:00:00Z'),
('svc_002', 'cat_001', 'Luxury Business Cards', 'luxury-business-cards', 'Elevated business cards featuring special finishes like foil stamping, embossing, or spot UV. Make a statement with ultra-premium materials including suede, metal, or wood.', 'Premium cards with special finishes', false, true, false, true, 149.99, '2024-01-01T08:00:00Z', '2024-01-01T08:00:00Z'),
('svc_003', 'cat_001', 'Letterhead & Envelopes', 'letterhead-envelopes', 'Complete stationery package including custom letterhead and matching envelopes. Professional appearance for all your business correspondence.', 'Full stationery set', false, true, false, true, 89.99, '2024-01-01T08:00:00Z', '2024-01-01T08:00:00Z'),
('svc_004', 'cat_002', 'Flyers & Posters', 'flyers-posters', 'Eye-catching flyers and posters for promotions, events, and announcements. Available in multiple sizes with various paper stocks.', 'Promotional print materials', false, true, true, true, 79.99, '2024-01-01T08:00:00Z', '2024-01-01T08:00:00Z'),
('svc_005', 'cat_002', 'Brochures', 'brochures', 'Multi-page brochures to showcase your products and services. Choose from bi-fold, tri-fold, or custom formats with premium finishing options.', 'Multi-page marketing materials', false, true, true, true, 129.99, '2024-01-01T08:00:00Z', '2024-01-01T08:00:00Z'),
('svc_006', 'cat_002', 'Catalogs', 'catalogs', 'Full-color product catalogs with professional binding. Perfect for retail, wholesale, and B2B marketing.', 'Professional product catalogs', false, true, false, true, 299.99, '2024-01-01T08:00:00Z', '2024-01-01T08:00:00Z'),
('svc_007', 'cat_003', 'Vinyl Banners', 'vinyl-banners', 'Durable outdoor banners for events, promotions, and storefronts. Weather-resistant with grommets for easy hanging.', 'Indoor/outdoor banners', false, true, true, true, 199.99, '2024-01-01T08:00:00Z', '2024-01-01T08:00:00Z'),
('svc_008', 'cat_003', 'Vehicle Wraps', 'vehicle-wraps', 'Professional vehicle wrap design and installation. Turn your vehicles into mobile billboards with full or partial wraps.', 'Car, truck, van wraps', true, true, false, true, 1999.99, '2024-01-01T08:00:00Z', '2024-01-01T08:00:00Z'),
('svc_009', 'cat_003', 'Window Graphics', 'window-graphics', 'Custom window decals and graphics for storefronts, offices, and vehicles. Perforated or solid vinyl options available.', 'Window decals and graphics', true, true, false, true, 299.99, '2024-01-01T08:00:00Z', '2024-01-01T08:00:00Z'),
('svc_010', 'cat_004', 'Product Labels', 'product-labels', 'Custom product labels for bottles, jars, boxes, and more. Available in various materials including waterproof and freezer-safe options.', 'Custom product labeling', false, true, false, true, 99.99, '2024-01-01T08:00:00Z', '2024-01-01T08:00:00Z'),
('svc_011', 'cat_004', 'Custom Packaging', 'custom-packaging', 'Design and print custom packaging boxes, bags, and containers. Stand out on the shelf with unique packaging.', 'Boxes, bags, containers', false, true, false, true, 499.99, '2024-01-01T08:00:00Z', '2024-01-01T08:00:00Z'),
('svc_012', 'cat_005', 'T-Shirt Printing', 't-shirt-printing', 'Screen printing and direct-to-garment printing for t-shirts, hoodies, and other apparel. Perfect for teams, events, and merchandise.', 'Custom apparel printing', false, true, true, true, 15.99, '2024-01-01T08:00:00Z', '2024-01-01T08:00:00Z'),
('svc_013', 'cat_005', 'Embroidery Services', 'embroidery-services', 'Professional embroidery for polo shirts, jackets, hats, and bags. Add a touch of class to your branded apparel.', 'Embroidered logo apparel', false, true, false, true, 24.99, '2024-01-01T08:00:00Z', '2024-01-01T08:00:00Z'),
('svc_014', 'cat_006', 'Trade Show Displays', 'trade-show-displays', 'Complete trade show booth packages including pop-up displays, banner stands, and table covers. Make an impact at your next event.', 'Exhibition booth materials', false, true, false, true, 899.99, '2024-01-01T08:00:00Z', '2024-01-01T08:00:00Z'),
('svc_015', 'cat_006', 'Event Signage', 'event-signage', 'Directional signs, welcome boards, and informational displays for events, conferences, and weddings.', 'Event wayfinding and displays', true, true, false, true, 249.99, '2024-01-01T08:00:00Z', '2024-01-01T08:00:00Z');

-- Service options
INSERT INTO service_options (id, service_id, field_key, label, field_type, is_required, help_text, choices, pricing_impact, validation_rules, sort_order) VALUES
('opt_001', 'svc_001', 'quantity', 'Quantity', 'select', true, 'How many business cards do you need?', '["250", "500", "1000", "2500", "5000"]', '{"250": 0, "500": 20, "1000": 35, "2500": 75, "5000": 120}', NULL, 1),
('opt_002', 'svc_001', 'finish', 'Card Finish', 'select', true, 'Choose your preferred finish', '["Matte", "Glossy", "Silk", "Uncoated"]', '{"Matte": 0, "Glossy": 5, "Silk": 10, "Uncoated": 0}', NULL, 2),
('opt_003', 'svc_001', 'sides', 'Print Sides', 'radio', true, 'Single or double-sided printing?', '["Single-sided", "Double-sided"]', '{"Single-sided": 0, "Double-sided": 15}', NULL, 3),
('opt_004', 'svc_001', 'rounded_corners', 'Rounded Corners', 'checkbox', false, 'Add rounded corners for a modern look', NULL, '5', NULL, 4),
('opt_005', 'svc_004', 'size', 'Size', 'select', true, 'Select flyer size', '["5.5x8.5", "8.5x11", "11x17", "18x24"]', '{"5.5x8.5": 0, "8.5x11": 10, "11x17": 25, "18x24": 50}', NULL, 1),
('opt_006', 'svc_004', 'paper_weight', 'Paper Weight', 'select', true, 'Choose paper thickness', '["80lb Text", "100lb Text", "80lb Cover", "100lb Cover"]', '{"80lb Text": 0, "100lb Text": 5, "80lb Cover": 15, "100lb Cover": 20}', NULL, 2),
('opt_007', 'svc_004', 'quantity', 'Quantity', 'number', true, 'How many do you need?', NULL, NULL, '{"min": 50, "max": 10000}', 3),
('opt_008', 'svc_007', 'width', 'Width (feet)', 'number', true, 'Banner width in feet', NULL, NULL, '{"min": 2, "max": 20}', 1),
('opt_009', 'svc_007', 'height', 'Height (feet)', 'number', true, 'Banner height in feet', NULL, NULL, '{"min": 2, "max": 10}', 2),
('opt_010', 'svc_007', 'material', 'Material', 'select', true, 'Banner material type', '["13oz Vinyl", "18oz Vinyl", "Mesh"]', '{"13oz Vinyl": 0, "18oz Vinyl": 30, "Mesh": 40}', NULL, 3),
('opt_011', 'svc_012', 'garment_type', 'Garment Type', 'select', true, 'Type of apparel', '["T-Shirt", "Long Sleeve", "Hoodie", "Tank Top"]', '{"T-Shirt": 0, "Long Sleeve": 5, "Hoodie": 12, "Tank Top": 2}', NULL, 1),
('opt_012', 'svc_012', 'quantity', 'Quantity', 'select', true, 'Number of items', '["12", "24", "48", "72", "144"]', '{"12": 0, "24": -2, "48": -4, "72": -6, "144": -8}', NULL, 2),
('opt_013', 'svc_012', 'colors', 'Number of Print Colors', 'select', true, 'How many colors in the design?', '["1", "2", "3", "4+"]', '{"1": 0, "2": 3, "3": 5, "4+": 8}', NULL, 3);

-- Tiers
INSERT INTO tiers (id, name, slug, tagline, description, is_active, turnaround_days_min, turnaround_days_max, revisions_allowed, rush_fee_percentage, deposit_percentage, price_multiplier, sla_response_hours, sort_order, created_at, updated_at) VALUES
('tier_001', 'Standard', 'standard', 'Quality printing at everyday prices', 'Our Standard tier offers reliable, high-quality printing with efficient turnaround times. Perfect for most business needs and everyday printing projects.', true, 5, 7, 2, 25, 30, 1.0, 48, 1, '2024-01-01T08:00:00Z', '2024-01-01T08:00:00Z'),
('tier_002', 'Premium', 'premium', 'Enhanced service with priority handling', 'Premium service includes faster turnaround, more revisions, and dedicated support. Ideal for important projects that need extra attention.', true, 3, 5, 4, 30, 40, 1.35, 24, 2, '2024-01-01T08:00:00Z', '2024-01-01T08:00:00Z'),
('tier_003', 'Deluxe', 'deluxe', 'VIP treatment for critical projects', 'Our Deluxe tier provides the fastest turnaround, unlimited revisions within scope, and dedicated account management. For projects where excellence is non-negotiable.', true, 1, 3, 999, 35, 50, 1.75, 12, 3, '2024-01-01T08:00:00Z', '2024-01-01T08:00:00Z');

-- Tier features
INSERT INTO tier_features (id, tier_id, group_name, feature_key, feature_label, feature_value, is_included, sort_order) VALUES
('feat_001', 'tier_001', 'Turnaround', 'turnaround', 'Production Time', '5-7 business days', true, 1),
('feat_002', 'tier_001', 'Turnaround', 'revisions', 'Design Revisions', '2 rounds included', true, 2),
('feat_003', 'tier_001', 'Support', 'response_time', 'Response Time', 'Within 48 hours', true, 3),
('feat_004', 'tier_001', 'Support', 'proof_delivery', 'Proof Delivery', 'Digital proof via email', true, 4),
('feat_005', 'tier_001', 'Extras', 'rush_available', 'Rush Service', 'Available (+25%)', true, 5),
('feat_006', 'tier_002', 'Turnaround', 'turnaround', 'Production Time', '3-5 business days', true, 1),
('feat_007', 'tier_002', 'Turnaround', 'revisions', 'Design Revisions', '4 rounds included', true, 2),
('feat_008', 'tier_002', 'Support', 'response_time', 'Response Time', 'Within 24 hours', true, 3),
('feat_009', 'tier_002', 'Support', 'proof_delivery', 'Proof Delivery', 'Digital + physical proof', true, 4),
('feat_010', 'tier_002', 'Support', 'dedicated_contact', 'Dedicated Contact', 'Priority support line', true, 5),
('feat_011', 'tier_002', 'Extras', 'rush_available', 'Rush Service', 'Available (+30%)', true, 6),
('feat_012', 'tier_003', 'Turnaround', 'turnaround', 'Production Time', '1-3 business days', true, 1),
('feat_013', 'tier_003', 'Turnaround', 'revisions', 'Design Revisions', 'Unlimited (within scope)', true, 2),
('feat_014', 'tier_003', 'Support', 'response_time', 'Response Time', 'Within 12 hours', true, 3),
('feat_015', 'tier_003', 'Support', 'proof_delivery', 'Proof Delivery', 'Digital + physical + video', true, 4),
('feat_016', 'tier_003', 'Support', 'dedicated_contact', 'Dedicated Contact', 'Personal account manager', true, 5),
('feat_017', 'tier_003', 'Support', 'quality_check', 'Quality Check', 'Triple quality inspection', true, 6),
('feat_018', 'tier_003', 'Extras', 'rush_available', 'Rush Service', 'Available (+35%)', true, 7),
('feat_019', 'tier_003', 'Extras', 'shipping', 'Shipping', 'Free express shipping', true, 8);

-- Tier deliverables
INSERT INTO tier_deliverables (id, tier_id, description, service_category_filter, sort_order) VALUES
('deliv_001', 'tier_001', 'Digital proof for approval', NULL, 1),
('deliv_002', 'tier_001', 'Final printed materials', NULL, 2),
('deliv_003', 'tier_001', 'Print-ready files (PDF)', NULL, 3),
('deliv_004', 'tier_002', 'Digital proof for approval', NULL, 1),
('deliv_005', 'tier_002', 'Physical proof sample', NULL, 2),
('deliv_006', 'tier_002', 'Final printed materials with inspection report', NULL, 3),
('deliv_007', 'tier_002', 'Print-ready files (PDF + source files)', NULL, 4),
('deliv_008', 'tier_002', 'Priority shipping tracking', NULL, 5),
('deliv_009', 'tier_003', 'Digital proof for approval', NULL, 1),
('deliv_010', 'tier_003', 'Physical proof sample', NULL, 2),
('deliv_011', 'tier_003', 'Video walkthrough of proof', NULL, 3),
('deliv_012', 'tier_003', 'Final printed materials with certificate', NULL, 4),
('deliv_013', 'tier_003', 'Complete source files package', NULL, 5),
('deliv_014', 'tier_003', 'White-glove delivery service', NULL, 6),
('deliv_015', 'tier_003', 'Post-delivery consultation', NULL, 7);

-- Quotes
INSERT INTO quotes (id, quote_number, customer_id, service_id, tier_id, status, estimate_min, estimate_max, final_subtotal, tax_rate, tax_amount, total_amount, customer_notes, admin_notes, no_design_files, finalized_at, expires_at, created_at, updated_at) VALUES
('quote_001', 'QT-2024-0001', 'user_cust_001', 'svc_001', 'tier_001', 'FINALIZED', 250, 350, 299.99, 8.5, 25.50, 325.49, 'Need these for an upcoming conference next month', 'Customer approved standard package', false, '2024-01-16T14:00:00Z', '2024-02-16T14:00:00Z', '2024-01-15T10:30:00Z', '2024-01-16T14:00:00Z'),
('quote_002', 'QT-2024-0002', 'user_cust_002', 'svc_004', 'tier_002', 'FINALIZED', 400, 600, 549.99, 8.5, 46.75, 596.74, 'We''re launching a new product line and need high-quality promotional materials', 'Upgraded to premium for better paper quality', false, '2024-01-22T11:00:00Z', '2024-02-22T11:00:00Z', '2024-01-20T11:00:00Z', '2024-01-22T11:00:00Z'),
('quote_003', 'QT-2024-0003', 'user_cust_003', 'svc_007', 'tier_001', 'FINALIZED', 350, 450, 399.99, 8.5, 34.00, 433.99, 'Banner for storefront grand opening', NULL, false, '2024-02-02T16:00:00Z', '2024-03-02T16:00:00Z', '2024-02-01T09:15:00Z', '2024-02-02T16:00:00Z'),
('quote_004', 'QT-2024-0004', 'user_cust_004', 'svc_012', 'tier_002', 'FINALIZED', 800, 1200, 1099.99, 8.5, 93.50, 1193.49, 'Company team building event - need 50 custom hoodies with our logo', 'Added rush fee for 2-day turnaround', false, '2024-02-12T09:00:00Z', '2024-03-12T09:00:00Z', '2024-02-10T14:20:00Z', '2024-02-12T09:00:00Z'),
('quote_005', 'QT-2024-0005', 'user_cust_005', 'svc_005', 'tier_003', 'FINALIZED', 600, 900, 849.99, 8.5, 72.25, 922.24, 'Need premium brochures for investor meetings', 'Deluxe tier with express service', false, '2024-02-17T10:00:00Z', '2024-03-17T10:00:00Z', '2024-02-15T16:45:00Z', '2024-02-17T10:00:00Z'),
('quote_006', 'QT-2024-0006', 'user_cust_006', 'svc_001', 'tier_001', 'QUOTE_REQUESTED', 200, 300, NULL, NULL, NULL, NULL, 'Just started my business, need basic business cards', 'Waiting for design files', true, NULL, NULL, '2024-03-01T12:00:00Z', '2024-03-01T12:00:00Z'),
('quote_007', 'QT-2024-0007', 'user_cust_007', 'svc_014', 'tier_002', 'PENDING_APPROVAL', 1200, 1800, 1599.99, 8.5, 136.00, 1735.99, 'Trade show booth for upcoming expo in May', 'Quote finalized, awaiting customer approval', false, '2024-03-07T15:00:00Z', '2024-04-07T15:00:00Z', '2024-03-05T13:30:00Z', '2024-03-07T15:00:00Z'),
('quote_008', 'QT-2024-0008', 'user_cust_008', 'svc_008', 'tier_003', 'UNDER_REVIEW', 2500, 3500, NULL, NULL, NULL, NULL, 'Full vehicle wrap for company van', 'Requires on-site assessment, scheduling appointment', false, NULL, NULL, '2024-03-10T15:00:00Z', '2024-03-10T15:00:00Z'),
('quote_009', 'QT-2024-0009', 'user_cust_001', 'svc_003', 'tier_001', 'FINALIZED', 150, 250, 199.99, 8.5, 17.00, 216.99, 'Letterhead and envelopes to match my business cards', NULL, false, '2024-03-12T11:00:00Z', '2024-04-12T11:00:00Z', '2024-03-11T10:00:00Z', '2024-03-12T11:00:00Z'),
('quote_010', 'QT-2024-0010', 'user_cust_003', 'svc_004', 'tier_002', 'FINALIZED', 300, 500, 449.99, 8.5, 38.25, 488.24, 'Monthly promotion flyers', NULL, false, '2024-03-15T14:00:00Z', '2024-04-15T14:00:00Z', '2024-03-14T09:00:00Z', '2024-03-15T14:00:00Z');

-- Quote answers
INSERT INTO quote_answers (id, quote_id, option_key, option_label, answer_value) VALUES
('ans_001', 'quote_001', 'quantity', 'Quantity', '1000'),
('ans_002', 'quote_001', 'finish', 'Card Finish', 'Matte'),
('ans_003', 'quote_001', 'sides', 'Print Sides', 'Double-sided'),
('ans_004', 'quote_001', 'rounded_corners', 'Rounded Corners', 'true'),
('ans_005', 'quote_002', 'size', 'Size', '8.5x11'),
('ans_006', 'quote_002', 'paper_weight', 'Paper Weight', '100lb Cover'),
('ans_007', 'quote_002', 'quantity', 'Quantity', '1000'),
('ans_008', 'quote_003', 'width', 'Width (feet)', '10'),
('ans_009', 'quote_003', 'height', 'Height (feet)', '4'),
('ans_010', 'quote_003', 'material', 'Material', '13oz Vinyl'),
('ans_011', 'quote_004', 'garment_type', 'Garment Type', 'Hoodie'),
('ans_012', 'quote_004', 'quantity', 'Quantity', '48'),
('ans_013', 'quote_004', 'colors', 'Number of Print Colors', '2'),
('ans_014', 'quote_009', 'quantity', 'Quantity', '500'),
('ans_015', 'quote_010', 'size', 'Size', '8.5x11'),
('ans_016', 'quote_010', 'quantity', 'Quantity', '500');

-- Orders
INSERT INTO orders (id, order_number, quote_id, customer_id, service_id, tier_id, assigned_staff_id, status, subtotal, emergency_fee, rush_fee, tax_rate, tax_amount, total_amount, deposit_percentage, deposit_amount, balance_due, revisions_used, due_at, completed_at, sla_breached, priority, created_at, updated_at) VALUES
('order_001', 'ORD-2024-0001', 'quote_001', 'user_cust_001', 'svc_001', 'tier_001', 'user_staff_001', 'COMPLETED', 299.99, 0, 0, 8.5, 25.50, 325.49, 30, 97.65, 0, 1, '2024-01-30T23:59:59Z', '2024-01-28T16:00:00Z', false, 3, '2024-01-16T14:30:00Z', '2024-01-28T16:00:00Z'),
('order_002', 'ORD-2024-0002', 'quote_002', 'user_cust_002', 'svc_004', 'tier_002', 'user_staff_001', 'COMPLETED', 549.99, 0, 0, 8.5, 46.75, 596.74, 40, 238.70, 0, 2, '2024-02-05T23:59:59Z', '2024-02-03T14:00:00Z', false, 2, '2024-01-22T11:30:00Z', '2024-02-03T14:00:00Z'),
('order_003', 'ORD-2024-0003', 'quote_003', 'user_cust_003', 'svc_007', 'tier_001', 'user_staff_003', 'COMPLETED', 399.99, 0, 0, 8.5, 34.00, 433.99, 30, 130.20, 0, 0, '2024-02-16T23:59:59Z', '2024-02-14T10:00:00Z', false, 3, '2024-02-02T16:30:00Z', '2024-02-14T10:00:00Z'),
('order_004', 'ORD-2024-0004', 'quote_004', 'user_cust_004', 'svc_012', 'tier_002', 'user_staff_001', 'COMPLETED', 1099.99, 0, 274.99, 8.5, 116.87, 1491.85, 40, 596.74, 0, 1, '2024-02-21T23:59:59Z', '2024-02-19T11:00:00Z', false, 1, '2024-02-12T09:30:00Z', '2024-02-19T11:00:00Z'),
('order_005', 'ORD-2024-0005', 'quote_005', 'user_cust_005', 'svc_005', 'tier_003', 'user_staff_002', 'IN_PRODUCTION', 849.99, 0, 0, 8.5, 72.25, 922.24, 50, 461.12, 461.12, 0, '2024-03-05T23:59:59Z', NULL, false, 1, '2024-02-17T10:30:00Z', '2024-03-16T09:00:00Z'),
('order_006', 'ORD-2024-0006', 'quote_009', 'user_cust_001', 'svc_003', 'tier_001', 'user_staff_001', 'WAITING_APPROVAL', 199.99, 0, 0, 8.5, 17.00, 216.99, 30, 65.10, 151.89, 0, '2024-03-26T23:59:59Z', NULL, false, 3, '2024-03-12T11:30:00Z', '2024-03-18T14:00:00Z'),
('order_007', 'ORD-2024-0007', 'quote_010', 'user_cust_003', 'svc_004', 'tier_002', 'user_staff_003', 'DESIGN_IN_PROGRESS', 449.99, 0, 0, 8.5, 38.25, 488.24, 40, 195.30, 292.94, 0, '2024-03-29T23:59:59Z', NULL, false, 2, '2024-03-15T14:30:00Z', '2024-03-17T10:00:00Z');

-- Uploads
INSERT INTO uploads (id, user_id, quote_id, order_id, file_url, file_name, file_type, file_size, dpi_warning, created_at) VALUES
('upload_001', 'user_cust_001', 'quote_001', 'order_001', 'https://images.unsplash.com/photo-1586769852044-692d6e3703f0?w=800', 'business-card-design.pdf', 'application/pdf', 2458624, false, '2024-01-15T11:00:00Z'),
('upload_002', 'user_cust_001', 'quote_001', 'order_001', 'https://images.unsplash.com/photo-1560472355-536de3962603?w=800', 'logo-high-res.png', 'image/png', 1842560, false, '2024-01-15T11:15:00Z'),
('upload_003', 'user_cust_002', 'quote_002', 'order_002', 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800', 'flyer-artwork.ai', 'application/illustrator', 5242880, false, '2024-01-20T12:00:00Z'),
('upload_004', 'user_cust_003', 'quote_003', 'order_003', 'https://images.unsplash.com/photo-1599420186946-7b6fb4e297f0?w=800', 'banner-design.psd', 'image/psd', 15728640, false, '2024-02-01T10:00:00Z'),
('upload_005', 'user_cust_004', 'quote_004', 'order_004', 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=800', 'hoodie-mockup.jpg', 'image/jpeg', 3145728, true, '2024-02-10T15:00:00Z'),
('upload_006', 'user_cust_005', 'quote_005', 'order_005', 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=800', 'brochure-content.pdf', 'application/pdf', 8388608, false, '2024-02-15T17:00:00Z'),
('upload_007', 'user_cust_001', 'quote_009', 'order_006', 'https://images.unsplash.com/photo-1586769852044-692d6e3703f0?w=800', 'letterhead-design.pdf', 'application/pdf', 1572864, false, '2024-03-11T11:00:00Z');

-- Bookings
INSERT INTO bookings (id, quote_id, customer_id, booking_date, time_slot, status, is_emergency, emergency_fee_percentage, emergency_fee_amount, reschedule_count, created_at, updated_at) VALUES
('booking_001', 'quote_008', 'user_cust_008', '2024-03-20', '10:00-12:00', 'CONFIRMED', false, NULL, NULL, 0, '2024-03-10T16:00:00Z', '2024-03-12T09:00:00Z');

-- Order checklist items
INSERT INTO order_checklist_items (id, order_id, deliverable_id, description, is_completed, completed_at, completed_by_staff_id, notes, sort_order) VALUES
('check_001', 'order_001', 'deliv_001', 'Digital proof for approval', true, '2024-01-18T10:00:00Z', 'user_staff_001', 'Approved on first submission', 1),
('check_002', 'order_001', 'deliv_002', 'Final printed materials', true, '2024-01-27T15:00:00Z', 'user_staff_003', 'Quality check passed', 2),
('check_003', 'order_001', 'deliv_003', 'Print-ready files (PDF)', true, '2024-01-28T16:00:00Z', 'user_staff_001', 'Files delivered to customer portal', 3),
('check_004', 'order_005', 'deliv_009', 'Digital proof for approval', true, '2024-02-20T14:00:00Z', 'user_staff_002', 'Customer requested color adjustment', 1),
('check_005', 'order_005', 'deliv_010', 'Physical proof sample', true, '2024-02-25T11:00:00Z', 'user_staff_002', 'Sample shipped via overnight', 2),
('check_006', 'order_005', 'deliv_011', 'Video walkthrough of proof', true, '2024-02-26T09:00:00Z', 'user_staff_002', 'Video explanation provided', 3),
('check_007', 'order_005', 'deliv_012', 'Final printed materials with certificate', false, NULL, NULL, 'In progress', 4),
('check_008', 'order_006', 'deliv_001', 'Digital proof for approval', true, '2024-03-18T14:00:00Z', 'user_staff_001', 'Waiting for customer approval', 1),
('check_009', 'order_007', 'deliv_004', 'Digital proof for approval', false, NULL, NULL, 'Design in progress', 1);

-- Proof versions
INSERT INTO proof_versions (id, order_id, version_number, file_url, created_by_staff_id, status, staff_message, customer_comment, approved_at, created_at) VALUES
('proof_001', 'order_001', 1, 'https://images.unsplash.com/photo-1586769852044-692d6e3703f0?w=800', 'user_staff_001', 'APPROVED', 'Please review the design and let us know if any changes are needed.', 'Looks perfect! Approved.', '2024-01-18T14:00:00Z', '2024-01-18T10:00:00Z'),
('proof_002', 'order_002', 1, 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800', 'user_staff_001', 'REVISION_REQUESTED', 'Initial proof for your review.', 'Can we make the headline text larger and change the blue to a darker shade?', NULL, '2024-01-25T09:00:00Z'),
('proof_003', 'order_002', 2, 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800', 'user_staff_001', 'APPROVED', 'Updated per your request. Headline is now 20% larger and using navy blue.', 'Perfect! Ready to print.', '2024-01-28T11:00:00Z', '2024-01-27T15:00:00Z'),
('proof_004', 'order_003', 1, 'https://images.unsplash.com/photo-1599420186946-7b6fb4e297f0?w=800', 'user_staff_003', 'APPROVED', 'Banner proof ready. Colors calibrated for outdoor vinyl.', 'Great work!', '2024-02-05T10:00:00Z', '2024-02-05T09:00:00Z'),
('proof_005', 'order_004', 1, 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=800', 'user_staff_001', 'APPROVED', 'Hoodie mockup with your logo placement.', 'Looks awesome, let''s go ahead!', '2024-02-14T16:00:00Z', '2024-02-14T14:00:00Z'),
('proof_006', 'order_005', 1, 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=800', 'user_staff_002', 'REVISION_REQUESTED', 'Premium brochure first draft.', 'The color scheme needs adjustment - can we try a warmer palette?', NULL, '2024-02-20T14:00:00Z'),
('proof_007', 'order_005', 2, 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=800', 'user_staff_002', 'SENT', 'Updated with warmer tones. Physical proof has been shipped for your review.', NULL, NULL, '2024-02-26T10:00:00Z'),
('proof_008', 'order_006', 1, 'https://images.unsplash.com/photo-1586769852044-692d6e3703f0?w=800', 'user_staff_001', 'SENT', 'Letterhead and envelope designs for review.', NULL, NULL, '2024-03-18T14:00:00Z');

-- Message threads
INSERT INTO message_threads (id, quote_id, order_id, customer_id, last_message_at, created_at) VALUES
('thread_001', 'quote_001', 'order_001', 'user_cust_001', '2024-01-28T17:00:00Z', '2024-01-16T15:00:00Z'),
('thread_002', 'quote_002', 'order_002', 'user_cust_002', '2024-02-03T15:00:00Z', '2024-01-22T12:00:00Z'),
('thread_003', 'quote_005', 'order_005', 'user_cust_005', '2024-03-14T11:00:00Z', '2024-02-17T11:00:00Z'),
('thread_004', 'quote_006', NULL, 'user_cust_006', '2024-03-02T14:00:00Z', '2024-03-01T13:00:00Z'),
('thread_005', 'quote_007', NULL, 'user_cust_007', '2024-03-08T10:00:00Z', '2024-03-05T14:00:00Z');

-- Messages
INSERT INTO messages (id, thread_id, sender_id, body, is_read, read_at, created_at) VALUES
('msg_001', 'thread_001', 'user_cust_001', 'Hi! Just submitted my order. When can I expect the first proof?', true, '2024-01-16T15:30:00Z', '2024-01-16T15:00:00Z'),
('msg_002', 'thread_001', 'user_staff_001', 'Thank you for your order! We''ll have the first proof ready within 48 hours.', true, '2024-01-16T16:00:00Z', '2024-01-16T15:30:00Z'),
('msg_003', 'thread_001', 'user_staff_001', 'Your proof is ready for review. Please check your email!', true, '2024-01-18T10:30:00Z', '2024-01-18T10:00:00Z'),
('msg_004', 'thread_001', 'user_cust_001', 'Approved! These look great.', true, '2024-01-18T14:30:00Z', '2024-01-18T14:00:00Z'),
('msg_005', 'thread_001', 'user_staff_001', 'Fantastic! Your order has been sent to production. Expected completion: Jan 27.', true, '2024-01-18T15:00:00Z', '2024-01-18T14:30:00Z'),
('msg_006', 'thread_001', 'user_staff_001', 'Your order is complete and ready for pickup!', true, '2024-01-28T17:00:00Z', '2024-01-28T16:30:00Z'),
('msg_007', 'thread_002', 'user_cust_002', 'I''d like to request some changes to the design before printing.', true, '2024-01-27T09:00:00Z', '2024-01-27T09:00:00Z'),
('msg_008', 'thread_002', 'user_staff_001', 'Of course! Please provide details and we''ll update the proof.', true, '2024-01-27T09:30:00Z', '2024-01-27T09:30:00Z'),
('msg_009', 'thread_002', 'user_cust_002', 'Can we make the headline larger and change the blue to navy?', true, '2024-01-27T10:00:00Z', '2024-01-27T10:00:00Z'),
('msg_010', 'thread_002', 'user_staff_001', 'Updated proof has been sent! Please review.', true, '2024-01-27T16:00:00Z', '2024-01-27T15:00:00Z'),
('msg_011', 'thread_002', 'user_cust_002', 'Perfect! Approved.', true, '2024-01-28T11:30:00Z', '2024-01-28T11:00:00Z'),
('msg_012', 'thread_002', 'user_staff_001', 'Great! Your order is in production now.', true, '2024-02-03T15:00:00Z', '2024-01-28T11:30:00Z'),
('msg_013', 'thread_003', 'user_cust_005', 'I need these brochures for meetings next week. Is rush service possible?', true, '2024-02-17T11:00:00Z', '2024-02-17T11:00:00Z'),
('msg_014', 'thread_003', 'user_staff_002', 'Yes! We can accommodate that. I''ll escalate this to our Deluxe tier with express service.', true, '2024-02-17T11:30:00Z', '2024-02-17T11:30:00Z'),
('msg_015', 'thread_003', 'user_cust_005', 'Thank you! I really appreciate the help.', true, '2024-02-17T12:00:00Z', '2024-02-17T12:00:00Z'),
('msg_016', 'thread_003', 'user_staff_002', 'Your physical proof sample has been shipped. You should receive it tomorrow.', true, '2024-02-25T11:30:00Z', '2024-02-25T11:00:00Z'),
('msg_017', 'thread_003', 'user_cust_005', 'Received the sample! The quality is impressive. One small color adjustment needed though.', true, '2024-03-14T11:00:00Z', '2024-02-26T14:00:00Z'),
('msg_018', 'thread_004', 'user_cust_006', 'I don''t have design files yet. Can you help with the design?', true, '2024-03-01T13:30:00Z', '2024-03-01T13:00:00Z'),
('msg_019', 'thread_004', 'user_staff_002', 'Absolutely! We offer design services. Let me send you information about our design packages.', true, '2024-03-02T14:00:00Z', '2024-03-01T14:00:00Z'),
('msg_020', 'thread_005', 'user_cust_007', 'What''s included in the trade show display package?', true, '2024-03-05T14:30:00Z', '2024-03-05T14:00:00Z'),
('msg_021', 'thread_005', 'user_staff_002', 'Great question! The package includes pop-up backdrop, two banner stands, and a printed tablecloth. I can send you detailed specs.', true, '2024-03-08T10:00:00Z', '2024-03-05T15:00:00Z');

-- Payments
INSERT INTO payments (id, payment_number, order_id, amount, method, status, transaction_ref, payment_date, receipt_url, verified_by_admin_id, verified_at, refund_amount, refund_reason, refunded_at, created_at, updated_at) VALUES
('pay_001', 'PAY-2024-0001', 'order_001', 97.65, 'CREDIT_CARD', 'COMPLETED', 'ch_3AbC123456789', '2024-01-16T14:45:00Z', 'https://images.unsplash.com/photo-1554224311-beee4ece6c1f?w=400', 'user_admin_001', '2024-01-16T15:00:00Z', NULL, NULL, NULL, '2024-01-16T14:45:00Z', '2024-01-16T15:00:00Z'),
('pay_002', 'PAY-2024-0002', 'order_001', 227.84, 'CREDIT_CARD', 'COMPLETED', 'ch_3AbC987654321', '2024-01-28T17:00:00Z', 'https://images.unsplash.com/photo-1554224311-beee4ece6c1f?w=400', 'user_admin_001', '2024-01-28T17:15:00Z', NULL, NULL, NULL, '2024-01-28T17:00:00Z', '2024-01-28T17:15:00Z'),
('pay_003', 'PAY-2024-0003', 'order_002', 238.70, 'BANK_TRANSFER', 'COMPLETED', 'wire_24012201', '2024-01-22T12:00:00Z', 'https://images.unsplash.com/photo-1554224311-beee4ece6c1f?w=400', 'user_admin_001', '2024-01-23T09:00:00Z', NULL, NULL, NULL, '2024-01-22T12:00:00Z', '2024-01-23T09:00:00Z'),
('pay_004', 'PAY-2024-0004', 'order_002', 358.04, 'BANK_TRANSFER', 'COMPLETED', 'wire_24020301', '2024-02-03T15:00:00Z', 'https://images.unsplash.com/photo-1554224311-beee4ece6c1f?w=400', 'user_admin_001', '2024-02-03T15:30:00Z', NULL, NULL, NULL, '2024-02-03T15:00:00Z', '2024-02-03T15:30:00Z'),
('pay_005', 'PAY-2024-0005', 'order_003', 130.20, 'CREDIT_CARD', 'COMPLETED', 'ch_3DeF456789123', '2024-02-02T17:00:00Z', 'https://images.unsplash.com/photo-1554224311-beee4ece6c1f?w=400', 'user_admin_001', '2024-02-02T17:15:00Z', NULL, NULL, NULL, '2024-02-02T17:00:00Z', '2024-02-02T17:15:00Z'),
('pay_006', 'PAY-2024-0006', 'order_003', 303.79, 'CREDIT_CARD', 'COMPLETED', 'ch_3DeF789123456', '2024-02-14T11:00:00Z', 'https://images.unsplash.com/photo-1554224311-beee4ece6c1f?w=400', 'user_admin_001', '2024-02-14T11:15:00Z', NULL, NULL, NULL, '2024-02-14T11:00:00Z', '2024-02-14T11:15:00Z'),
('pay_007', 'PAY-2024-0007', 'order_004', 596.74, 'CREDIT_CARD', 'COMPLETED', 'ch_3GhI123789456', '2024-02-12T10:00:00Z', 'https://images.unsplash.com/photo-1554224311-beee4ece6c1f?w=400', 'user_admin_001', '2024-02-12T10:15:00Z', NULL, NULL, NULL, '2024-02-12T10:00:00Z', '2024-02-12T10:15:00Z'),
('pay_008', 'PAY-2024-0008', 'order_004', 895.11, 'CREDIT_CARD', 'COMPLETED', 'ch_3GhI456123789', '2024-02-19T12:00:00Z', 'https://images.unsplash.com/photo-1554224311-beee4ece6c1f?w=400', 'user_admin_001', '2024-02-19T12:15:00Z', NULL, NULL, NULL, '2024-02-19T12:00:00Z', '2024-02-19T12:15:00Z'),
('pay_009', 'PAY-2024-0009', 'order_005', 461.12, 'BANK_TRANSFER', 'COMPLETED', 'wire_24021701', '2024-02-17T11:00:00Z', 'https://images.unsplash.com/photo-1554224311-beee4ece6c1f?w=400', 'user_admin_001', '2024-02-18T09:00:00Z', NULL, NULL, NULL, '2024-02-17T11:00:00Z', '2024-02-18T09:00:00Z'),
('pay_010', 'PAY-2024-0010', 'order_006', 65.10, 'CREDIT_CARD', 'COMPLETED', 'ch_3JkL789456123', '2024-03-12T12:00:00Z', 'https://images.unsplash.com/photo-1554224311-beee4ece6c1f?w=400', 'user_admin_001', '2024-03-12T12:15:00Z', NULL, NULL, NULL, '2024-03-12T12:00:00Z', '2024-03-12T12:15:00Z'),
('pay_011', 'PAY-2024-0011', 'order_007', 195.30, 'CREDIT_CARD', 'COMPLETED', 'ch_3MnO123456789', '2024-03-15T15:00:00Z', 'https://images.unsplash.com/photo-1554224311-beee4ece6c1f?w=400', 'user_admin_001', '2024-03-15T15:15:00Z', NULL, NULL, NULL, '2024-03-15T15:00:00Z', '2024-03-15T15:15:00Z');

-- Invoices
INSERT INTO invoices (id, invoice_number, order_id, customer_id, subtotal, tax_rate, tax_amount, total_amount, amount_paid, amount_due, issued_at, due_date, paid_at, invoice_url) VALUES
('inv_001', 'INV-2024-0001', 'order_001', 'user_cust_001', 299.99, 8.5, 25.50, 325.49, 325.49, 0, '2024-01-16T14:30:00Z', '2024-02-15T23:59:59Z', '2024-01-28T17:00:00Z', 'https://images.unsplash.com/photo-1554224311-beee4ece6c1f?w=600'),
('inv_002', 'INV-2024-0002', 'order_002', 'user_cust_002', 549.99, 8.5, 46.75, 596.74, 596.74, 0, '2024-01-22T11:30:00Z', '2024-02-21T23:59:59Z', '2024-02-03T15:00:00Z', 'https://images.unsplash.com/photo-1554224311-beee4ece6c1f?w=600'),
('inv_003', 'INV-2024-0003', 'order_003', 'user_cust_003', 399.99, 8.5, 34.00, 433.99, 433.99, 0, '2024-02-02T16:30:00Z', '2024-03-03T23:59:59Z', '2024-02-14T11:00:00Z', 'https://images.unsplash.com/photo-1554224311-beee4ece6c1f?w=600'),
('inv_004', 'INV-2024-0004', 'order_004', 'user_cust_004', 1374.98, 8.5, 116.87, 1491.85, 1491.85, 0, '2024-02-12T09:30:00Z', '2024-03-13T23:59:59Z', '2024-02-19T12:00:00Z', 'https://images.unsplash.com/photo-1554224311-beee4ece6c1f?w=600'),
('inv_005', 'INV-2024-0005', 'order_005', 'user_cust_005', 849.99, 8.5, 72.25, 922.24, 461.12, 461.12, '2024-02-17T10:30:00Z', '2024-03-18T23:59:59Z', NULL, 'https://images.unsplash.com/photo-1554224311-beee4ece6c1f?w=600'),
('inv_006', 'INV-2024-0006', 'order_006', 'user_cust_001', 199.99, 8.5, 17.00, 216.99, 65.10, 151.89, '2024-03-12T11:30:00Z', '2024-04-11T23:59:59Z', NULL, 'https://images.unsplash.com/photo-1554224311-beee4ece6c1f?w=600'),
('inv_007', 'INV-2024-0007', 'order_007', 'user_cust_003', 449.99, 8.5, 38.25, 488.24, 195.30, 292.94, '2024-03-15T14:30:00Z', '2024-04-14T23:59:59Z', NULL, 'https://images.unsplash.com/photo-1554224311-beee4ece6c1f?w=600');

-- Gallery items
INSERT INTO gallery_items (id, title, slug, description, service_category_id, service_id, tier_used, client_name, client_approved_display, testimonial_quote, timeline_description, is_featured, is_visible, sort_order, created_at, updated_at) VALUES
('gallery_001', 'Modern Tech Startup Business Cards', 'modern-tech-startup-business-cards', 'Sleek business cards for a San Francisco tech startup. Features minimalist design with spot UV coating on logo and contact details. Printed on 32pt ultra-thick cardstock with silk lamination.', 'cat_001', 'svc_002', 'Premium', 'TechVision Inc', true, 'The quality exceeded our expectations. Our investors were impressed!', 'Completed in 4 days with 2 revision rounds', true, true, 1, '2024-01-05T10:00:00Z', '2024-01-05T10:00:00Z'),
('gallery_002', 'Restaurant Grand Opening Flyers', 'restaurant-grand-opening-flyers', 'Eye-catching flyers for a new Italian restaurant in downtown. Full-color printing on 100lb glossy cover stock. Designed to showcase mouth-watering food photography.', 'cat_002', 'svc_004', 'Standard', 'Bella Cucina', true, 'These flyers helped pack our restaurant on opening night!', 'Standard turnaround, 5 days', false, true, 2, '2024-01-10T10:00:00Z', '2024-01-10T10:00:00Z'),
('gallery_003', 'Real Estate Agency Rebrand Package', 'real-estate-agency-rebrand', 'Complete stationery package including business cards, letterhead, and envelopes. Classic professional design with subtle metallic accents.', 'cat_001', 'svc_003', 'Premium', 'Summit Realty Group', true, 'Professional, elegant, and exactly what we needed for our rebrand.', 'Delivered in 4 days with rush service', true, true, 3, '2024-01-15T10:00:00Z', '2024-01-15T10:00:00Z'),
('gallery_004', 'Music Festival Banner Campaign', 'music-festival-banner-campaign', 'Series of large-format vinyl banners for annual summer music festival. Weather-resistant 18oz vinyl with vibrant colors that pop. Multiple sizes for various locations.', 'cat_003', 'svc_007', 'Standard', 'Summer Sounds Festival', true, 'The banners looked incredible and survived three days of outdoor weather!', 'Completed in 6 days for 8 banners', true, true, 4, '2024-01-20T10:00:00Z', '2024-01-20T10:00:00Z'),
('gallery_005', 'Craft Brewery Product Labels', 'craft-brewery-product-labels', 'Custom die-cut labels for craft beer bottles. Waterproof material with specialty finish. Unique shapes for each beer variety with cohesive brand design.', 'cat_004', 'svc_010', 'Deluxe', 'Hops & Dreams Brewery', true, 'Our bottles fly off the shelves. The labels are works of art!', 'Deluxe service with multiple proof rounds', true, true, 5, '2024-01-25T10:00:00Z', '2024-01-25T10:00:00Z'),
('gallery_006', 'Corporate Event T-Shirts', 'corporate-event-tshirts', 'Screen-printed t-shirts for company annual retreat. Soft-hand ink on premium cotton tees. Multi-color design with company logo and event theme.', 'cat_005', 'svc_012', 'Premium', 'GlobalTech Solutions', true, 'Perfect quality! Everyone loved their shirts and still wears them.', 'Rush production completed in 3 days', false, true, 6, '2024-02-01T10:00:00Z', '2024-02-01T10:00:00Z'),
('gallery_007', 'Boutique Hotel Brochures', 'boutique-hotel-brochures', 'Luxury tri-fold brochures showcasing boutique hotel amenities. Premium paper stock with aqueous coating. Stunning photography throughout.', 'cat_002', 'svc_005', 'Deluxe', 'The Harbor Inn', true, 'These brochures are displayed proudly in our lobby. Guests are impressed!', 'White-glove service with physical proofs', true, true, 7, '2024-02-05T10:00:00Z', '2024-02-05T10:00:00Z'),
('gallery_008', 'Trade Show Booth Display', 'trade-show-booth-display', 'Complete trade show booth setup including 10ft pop-up backdrop, banner stands, and literature racks. Professional graphics that attracted attendees.', 'cat_006', 'svc_014', 'Premium', 'InnovateCorp', true, 'Our booth was the most visited at the expo. The display quality was outstanding.', 'Full package delivered in 7 days', true, true, 8, '2024-02-10T10:00:00Z', '2024-02-10T10:00:00Z'),
('gallery_009', 'Organic Skincare Packaging', 'organic-skincare-packaging', 'Custom packaging boxes for organic skincare line. Eco-friendly materials with soy-based inks. Elegant design reflecting natural brand values.', 'cat_004', 'svc_011', 'Deluxe', 'Pure Essence Naturals', false, NULL, 'Complex project with multiple package sizes', false, true, 9, '2024-02-15T10:00:00Z', '2024-02-15T10:00:00Z'),
('gallery_010', 'Law Firm Letterhead Suite', 'law-firm-letterhead-suite', 'Professional letterhead, envelopes, and legal-size folders. Classic design with embossed firm name. Premium cotton paper stock.', 'cat_001', 'svc_003', 'Premium', 'Sterling & Associates', true, 'Exactly the professional image we wanted to project.', 'Delivered in 5 days', false, true, 10, '2024-02-20T10:00:00Z', '2024-02-20T10:00:00Z');

-- Gallery images
INSERT INTO gallery_images (id, gallery_item_id, image_url, caption, is_primary, sort_order) VALUES
('img_001', 'gallery_001', 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=800', 'Front side with spot UV logo', true, 1),
('img_002', 'gallery_001', 'https://images.unsplash.com/photo-1560472355-536de3962603?w=800', 'Back side with contact details', false, 2),
('img_003', 'gallery_001', 'https://images.unsplash.com/photo-1586769852044-692d6e3703f0?w=800', 'Close-up showing silk lamination', false, 3),
('img_004', 'gallery_002', 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800', 'Full flyer design', true, 1),
('img_005', 'gallery_002', 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800', 'Detail shot', false, 2),
('img_006', 'gallery_003', 'https://images.unsplash.com/photo-1586769852044-692d6e3703f0?w=800', 'Business cards', true, 1),
('img_007', 'gallery_003', 'https://images.unsplash.com/photo-1560472355-536de3962603?w=800', 'Letterhead', false, 2),
('img_008', 'gallery_003', 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=800', 'Envelope', false, 3),
('img_009', 'gallery_004', 'https://images.unsplash.com/photo-1599420186946-7b6fb4e297f0?w=800', 'Main stage banner', true, 1),
('img_010', 'gallery_004', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800', 'Entry banner', false, 2),
('img_011', 'gallery_005', 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=800', 'IPA label design', true, 1),
('img_012', 'gallery_005', 'https://images.unsplash.com/photo-1608024542550-4b785f4203c5?w=800', 'Lager label design', false, 2),
('img_013', 'gallery_005', 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=800', 'Stout label design', false, 3),
('img_014', 'gallery_006', 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=800', 'T-shirt front', true, 1),
('img_015', 'gallery_006', 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800', 'T-shirt back', false, 2),
('img_016', 'gallery_007', 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=800', 'Brochure cover', true, 1),
('img_017', 'gallery_007', 'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=800', 'Interior spread', false, 2),
('img_018', 'gallery_008', 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800', 'Full booth view', true, 1),
('img_019', 'gallery_008', 'https://images.unsplash.com/photo-1591115765373-5207764f72e7?w=800', 'Banner stand detail', false, 2);

-- Materials
INSERT INTO materials (id, sku, name, category, unit, cost_per_unit, supplier_name, notes, is_active, created_at, updated_at) VALUES
('mat_001', 'INK-CYAN-001', 'Cyan Ink Cartridge', 'INK', 'CARTRIDGE', 89.99, 'PrintSupply Co', 'High-capacity cartridge for large format', true, '2024-01-01T08:00:00Z', '2024-01-01T08:00:00Z'),
('mat_002', 'INK-MAGENTA-001', 'Magenta Ink Cartridge', 'INK', 'CARTRIDGE', 89.99, 'PrintSupply Co', 'High-capacity cartridge for large format', true, '2024-01-01T08:00:00Z', '2024-01-01T08:00:00Z'),
('mat_003', 'PAPER-32PT-GB', '32pt Cardstock', 'PAPER', 'SHEET', 0.35, 'Premium Papers Inc', 'Ultra thick business card stock', true, '2024-01-01T08:00:00Z', '2024-01-01T08:00:00Z'),
('mat_004', 'VINYL-13OZ', '13oz Vinyl Banner Material', 'VINYL', 'SQ_FT', 1.85, 'SignMaster Supply', 'Standard outdoor vinyl', true, '2024-01-01T08:00:00Z', '2024-01-01T08:00:00Z'),
('mat_005', 'VINYL-18OZ', '18oz Vinyl Banner Material', 'VINYL', 'SQ_FT', 2.45, 'SignMaster Supply', 'Heavy-duty outdoor vinyl', true, '2024-01-01T08:00:00Z', '2024-01-01T08:00:00Z');

-- Capacity settings
INSERT INTO capacity_settings (id, day_of_week, is_working_day, start_time, end_time, default_slots, emergency_slots_max, emergency_fee_percentage) VALUES
('cap_001', 1, true, '09:00', '17:00', 5, 2, 20),
('cap_002', 2, true, '09:00', '17:00', 5, 2, 20),
('cap_003', 3, true, '09:00', '17:00', 5, 2, 20),
('cap_004', 4, true, '09:00', '17:00', 5, 2, 20),
('cap_005', 5, true, '09:00', '17:00', 5, 2, 20),
('cap_006', 6, false, NULL, NULL, 0, 0, 20),
('cap_007', 0, false, NULL, NULL, 0, 0, 20);

-- Capacity overrides
INSERT INTO capacity_overrides (id, override_date, slots_available, reason, created_at) VALUES
('over_001', '2024-03-25', 8, 'Extra staff scheduled for busy week', '2024-03-01T10:00:00Z'),
('over_002', '2024-03-26', 3, 'Team meeting in afternoon', '2024-03-01T10:00:00Z'),
('over_003', '2024-04-15', 0, 'Tax day - office closed', '2024-03-01T10:00:00Z');

-- Blackout dates
INSERT INTO blackout_dates (id, start_date, end_date, reason, created_at) VALUES
('black_001', '2024-07-04', '2024-07-04', 'Independence Day', '2024-01-01T08:00:00Z'),
('black_002', '2024-11-28', '2024-11-29', 'Thanksgiving Holiday', '2024-01-01T08:00:00Z'),
('black_003', '2024-12-24', '2024-12-26', 'Christmas Holiday', '2024-01-01T08:00:00Z'),
('black_004', '2024-12-31', '2024-01-01', 'New Year Holiday', '2024-01-01T08:00:00Z');

-- Contact inquiries
INSERT INTO contact_inquiries (id, name, email, phone, subject, message, status, replied_at, resolved_at, created_at) VALUES
('inq_001', 'Jennifer Martinez', 'jennifer.m@email.com', '+1-555-2001', 'Question about bulk pricing', 'Hi, I''m interested in ordering 5000 business cards for our company. Do you offer volume discounts?', 'RESOLVED', '2024-02-15T10:00:00Z', '2024-02-15T14:00:00Z', '2024-02-15T09:00:00Z'),
('inq_002', 'Robert Taylor', 'r.taylor@business.com', '+1-555-2002', 'Custom packaging inquiry', 'We''re launching a new product line and need custom packaging. Can you help with design and printing?', 'REPLIED', '2024-02-20T11:00:00Z', NULL, '2024-02-20T08:30:00Z'),
('inq_003', 'Lisa Anderson', 'lisa.anderson@wedding.com', '+1-555-2003', 'Wedding invitation printing', 'Looking for someone to print 200 wedding invitations. Do you handle specialty paper and custom designs?', 'RESOLVED', '2024-02-25T14:00:00Z', '2024-02-26T10:00:00Z', '2024-02-25T13:00:00Z'),
('inq_004', 'Michael Chen', 'mchen@startup.io', '+1-555-2004', 'Same-day printing availability', 'Is same-day printing available for flyers? I need 100 copies by 5pm today.', 'NEW', NULL, NULL, '2024-03-17T11:00:00Z');

-- Content sections
INSERT INTO content_sections (id, section_key, section_type, content, updated_at) VALUES
('content_001', 'homepage_hero', 'HERO', '{"title": "Professional Printing Services", "subtitle": "From business cards to large format printing - quality you can trust", "cta_text": "Get a Quote", "cta_link": "/services", "background_image": "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=1600"}', '2024-01-01T08:00:00Z'),
('content_002', 'about_us', 'TEXT', '{"title": "About Our Print Shop", "content": "With over 20 years of experience, we''ve been serving businesses and individuals with top-quality printing services. Our state-of-the-art equipment and experienced team ensure every project exceeds expectations."}', '2024-01-01T08:00:00Z'),
('content_003', 'why_choose_us', 'FEATURES', '{"features": [{"icon": "quality", "title": "Premium Quality", "description": "Only the finest materials and latest printing technology"}, {"icon": "speed", "title": "Fast Turnaround", "description": "Most orders completed within days, rush service available"}, {"icon": "support", "title": "Expert Support", "description": "Dedicated support team to guide you through every step"}]}', '2024-01-01T08:00:00Z');

-- Team members
INSERT INTO team_members (id, name, role, photo_url, bio, sort_order, is_visible) VALUES
('team_001', 'Sarah Johnson', 'Owner & Creative Director', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400', 'Sarah founded the print shop in 2004 with a vision to provide exceptional printing services. With 25+ years in the industry, she oversees all creative projects and ensures quality standards.', 1, true),
('team_002', 'Michael Rodriguez', 'Production Manager', 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400', 'Michael manages our production floor and ensures timely delivery of all projects. His attention to detail and technical expertise keeps operations running smoothly.', 2, true),
('team_003', 'Emily Chen', 'Senior Designer', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400', 'Emily leads our design team with 10 years of graphic design experience. She specializes in branding and helps clients bring their vision to life.', 3, true),
('team_004', 'David Thompson', 'Customer Relations', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400', 'David is your first point of contact and ensures every customer has an exceptional experience. He coordinates between clients and production teams.', 4, true);

-- FAQs
INSERT INTO faqs (id, question, answer, category, is_active, sort_order) VALUES
('faq_001', 'What file formats do you accept?', 'We accept PDF, AI, PSD, INDD, EPS, JPG, and PNG files. For best results, we recommend submitting print-ready PDFs with fonts outlined and images embedded.', 'FILES', true, 1),
('faq_002', 'What is your turnaround time?', 'Standard turnaround is 5-7 business days. Premium service offers 3-5 days, and Deluxe provides 1-3 days. Rush service is available for most products for an additional fee.', 'TIMING', true, 2),
('faq_003', 'Do you offer design services?', 'Yes! Our experienced design team can help with everything from minor adjustments to complete custom designs. Contact us for a design quote.', 'SERVICES', true, 3),
('faq_004', 'What payment methods do you accept?', 'We accept all major credit cards, bank transfers, and checks. A deposit is required to begin production, with the balance due before delivery.', 'PAYMENT', true, 4),
('faq_005', 'Can I see a proof before printing?', 'Absolutely! All orders include a digital proof. Premium and Deluxe tiers also receive physical proof samples. We won''t print until you approve.', 'PROCESS', true, 5),
('faq_006', 'Do you ship nationwide?', 'Yes, we ship to all 50 states. Shipping costs vary by location and package size. Express shipping is available for urgent orders.', 'SHIPPING', true, 6),
('faq_007', 'What if I''m not satisfied with my order?', 'Customer satisfaction is our priority. If there''s an error on our part, we''ll reprint at no charge. Please review proofs carefully as we can''t reprint due to customer-approved errors.', 'SATISFACTION', true, 7),
('faq_008', 'Do you offer bulk discounts?', 'Yes! Volume discounts are available for most products. The more you order, the lower the per-unit cost. Contact us for a custom quote.', 'PRICING', true, 8);

-- App settings
INSERT INTO app_settings (id, setting_key, setting_value, setting_type, description, updated_at) VALUES
('set_001', 'tax_rate', '8.5', 'NUMBER', 'Default tax rate percentage', '2024-01-01T08:00:00Z'),
('set_002', 'min_order_amount', '25.00', 'NUMBER', 'Minimum order amount in dollars', '2024-01-01T08:00:00Z'),
('set_003', 'contact_email', 'info@printshop.com', 'STRING', 'Main contact email address', '2024-01-01T08:00:00Z'),
('set_004', 'contact_phone', '+1-555-PRINT-00', 'STRING', 'Main contact phone number', '2024-01-01T08:00:00Z'),
('set_005', 'business_hours', 'Monday-Friday: 9am-5pm', 'STRING', 'Business hours display', '2024-01-01T08:00:00Z'),
('set_006', 'free_shipping_threshold', '500.00', 'NUMBER', 'Order amount for free shipping', '2024-01-01T08:00:00Z'),
('set_007', 'quote_expiry_days', '30', 'NUMBER', 'Number of days until quotes expire', '2024-01-01T08:00:00Z');

-- Feature flags
INSERT INTO feature_flags (id, flag_key, flag_name, is_enabled, description, updated_at) VALUES
('flag_001', 'online_ordering', 'Online Ordering', true, 'Enable customers to place orders directly online', '2024-01-01T08:00:00Z'),
('flag_002', 'live_chat', 'Live Chat Support', true, 'Enable live chat widget on website', '2024-01-01T08:00:00Z'),
('flag_003', 'design_services', 'Design Services', true, 'Offer professional design services', '2024-01-01T08:00:00Z'),
('flag_004', 'b2b_portal', 'B2B Customer Portal', false, 'Special portal for business accounts', '2024-01-01T08:00:00Z'),
('flag_005', 'loyalty_program', 'Loyalty Rewards Program', false, 'Points-based rewards for repeat customers', '2024-01-01T08:00:00Z');

-- Audit logs
INSERT INTO audit_logs (id, user_id, action, target_type, target_id, changes, ip_address, user_agent, created_at) VALUES
('log_001', 'user_admin_001', 'QUOTE_FINALIZED', 'QUOTE', 'quote_001', '{"status": "FINALIZED", "final_amount": 325.49}', '192.168.1.100', 'Mozilla/5.0', '2024-01-16T14:00:00Z'),
('log_002', 'user_staff_001', 'ORDER_STATUS_UPDATED', 'ORDER', 'order_001', '{"status": "IN_PRODUCTION"}', '192.168.1.101', 'Mozilla/5.0', '2024-01-20T09:00:00Z'),
('log_003', 'user_admin_001', 'PAYMENT_VERIFIED', 'PAYMENT', 'pay_001', '{"status": "COMPLETED"}', '192.168.1.100', 'Mozilla/5.0', '2024-01-16T15:00:00Z'),
('log_004', 'user_staff_002', 'PROOF_UPLOADED', 'PROOF', 'proof_001', '{"version": 1}', '192.168.1.102', 'Mozilla/5.0', '2024-01-18T10:00:00Z'),
('log_005', 'user_admin_001', 'SERVICE_CREATED', 'SERVICE', 'svc_001', '{"name": "Standard Business Cards"}', '192.168.1.100', 'Mozilla/5.0', '2024-01-01T08:00:00Z');

-- Notifications
INSERT INTO notifications (id, user_id, notification_type, title, message, link_url, is_read, read_at, created_at) VALUES
('notif_001', 'user_cust_001', 'ORDER_COMPLETED', 'Order Completed', 'Your order ORD-2024-0001 has been completed and is ready for pickup!', '/orders/order_001', true, '2024-01-28T17:30:00Z', '2024-01-28T16:30:00Z'),
('notif_002', 'user_cust_001', 'PROOF_READY', 'Proof Ready for Review', 'Your proof for order ORD-2024-0001 is ready. Please review and approve.', '/orders/order_001/proofs', true, '2024-01-18T11:00:00Z', '2024-01-18T10:00:00Z'),
('notif_003', 'user_cust_002', 'QUOTE_APPROVED', 'Quote Approved', 'Your quote QT-2024-0002 has been finalized! Ready to proceed?', '/quotes/quote_002', true, '2024-01-22T11:30:00Z', '2024-01-22T11:00:00Z'),
('notif_004', 'user_cust_005', 'ORDER_IN_PRODUCTION', 'Order in Production', 'Great news! Your order ORD-2024-0005 is now in production.', '/orders/order_005', true, '2024-03-01T10:00:00Z', '2024-03-01T09:00:00Z'),
('notif_005', 'user_cust_003', 'MESSAGE_RECEIVED', 'New Message', 'You have a new message about your order ORD-2024-0007', '/messages/thread_005', false, NULL, '2024-03-17T10:00:00Z'),
('notif_006', 'user_staff_001', 'NEW_ORDER', 'New Order Assigned', 'Order ORD-2024-0007 has been assigned to you', '/staff/orders/order_007', true, '2024-03-15T15:00:00Z', '2024-03-15T14:30:00Z');

-- Email verification tokens
INSERT INTO email_verification_tokens (id, user_id, token, expires_at, used_at, created_at) VALUES
('token_001', 'user_cust_001', 'verify_abc123def456', '2024-01-16T10:30:00Z', '2024-01-15T11:00:00Z', '2024-01-15T10:30:00Z'),
('token_002', 'user_cust_006', 'verify_xyz789ghi012', '2024-03-02T12:00:00Z', NULL, '2024-03-01T12:00:00Z');

-- Password reset tokens
INSERT INTO password_reset_tokens (id, user_id, token, expires_at, used_at, created_at) VALUES
('reset_001', 'user_cust_003', 'reset_aaa111bbb222', '2024-02-02T10:15:00Z', '2024-02-01T10:00:00Z', '2024-02-01T09:15:00Z');

-- B2B accounts
INSERT INTO b2b_accounts (id, company_name, main_contact_id, account_manager_id, contract_start_date, contract_end_date, contract_terms, status, consolidated_invoicing, created_at, updated_at) VALUES
('b2b_001', 'MegaCorp Industries', 'user_cust_002', 'user_staff_002', '2024-01-01', '2025-01-01', 'Annual contract with volume discounts. Min 50 orders per year.', 'ACTIVE', true, '2024-01-05T10:00:00Z', '2024-01-05T10:00:00Z'),
('b2b_002', 'TechStart Ventures', 'user_cust_004', 'user_staff_002', '2024-02-01', '2025-02-01', 'Preferred pricing on all services. Monthly consolidated billing.', 'ACTIVE', true, '2024-02-01T10:00:00Z', '2024-02-01T10:00:00Z');

-- B2B locations
INSERT INTO b2b_locations (id, account_id, location_name, address, contact_person, contact_phone, contact_email, created_at) VALUES
('loc_001', 'b2b_001', 'MegaCorp HQ', '1000 Corporate Dr, New York, NY 10001', 'Bob Johnson', '+1-555-3001', 'bob.johnson@megacorp.com', '2024-01-05T10:00:00Z'),
('loc_002', 'b2b_001', 'MegaCorp West Coast', '2000 Innovation Way, San Francisco, CA 94105', 'Jane Smith', '+1-555-3002', 'jane.smith@megacorp.com', '2024-01-05T10:00:00Z'),
('loc_003', 'b2b_002', 'TechStart Main Office', '500 Startup Blvd, Chicago, IL 60601', 'David Brown', '+1-555-3003', 'david@techstart.com', '2024-02-01T10:00:00Z');

-- Contract pricing
INSERT INTO contract_pricing (id, account_id, service_id, tier_id, contract_price, discount_percentage, effective_date, expiry_date, created_at) VALUES
('price_001', 'b2b_001', 'svc_001', 'tier_001', NULL, 15, '2024-01-01', '2025-01-01', '2024-01-05T10:00:00Z'),
('price_002', 'b2b_001', 'svc_001', 'tier_002', NULL, 20, '2024-01-01', '2025-01-01', '2024-01-05T10:00:00Z'),
('price_003', 'b2b_002', 'svc_004', 'tier_001', NULL, 10, '2024-02-01', '2025-02-01', '2024-02-01T10:00:00Z');

-- Inventory items
INSERT INTO inventory_items (id, sku, name, category, unit, qty_on_hand, reorder_point, reorder_qty, supplier_name, cost_per_unit, notes, is_active, created_at, updated_at) VALUES
('inv_001', 'CARD-32PT-WHT', '32pt White Cardstock', 'CARDSTOCK', 'SHEET', 5000, 1000, 5000, 'Premium Papers Inc', 0.35, 'Standard business card stock', true, '2024-01-01T08:00:00Z', '2024-03-15T10:00:00Z'),
('inv_002', 'VINYL-13-WHT', '13oz White Vinyl', 'VINYL', 'SQ_FT', 200, 50, 500, 'SignMaster Supply', 1.85, 'Standard banner material', true, '2024-01-01T08:00:00Z', '2024-03-10T10:00:00Z'),
('inv_003', 'VINYL-18-WHT', '18oz White Vinyl', 'VINYL', 'SQ_FT', 150, 40, 300, 'SignMaster Supply', 2.45, 'Heavy-duty banner material', true, '2024-01-01T08:00:00Z', '2024-03-10T10:00:00Z'),
('inv_004', 'INK-CMYK-SET', 'CMYK Ink Set', 'INK', 'SET', 15, 5, 10, 'PrintSupply Co', 349.99, 'Full color ink cartridge set', true, '2024-01-01T08:00:00Z', '2024-03-01T10:00:00Z'),
('inv_005', 'PAPER-100-GLOSS', '100lb Gloss Cover', 'PAPER', 'SHEET', 3000, 500, 3000, 'Premium Papers Inc', 0.25, 'Glossy brochure paper', true, '2024-01-01T08:00:00Z', '2024-03-12T10:00:00Z');

-- Material consumption rules
INSERT INTO material_consumption_rules (id, service_id, inventory_item_id, qty_per_unit, tier_filter, created_at) VALUES
('rule_001', 'svc_001', 'inv_001', 1, NULL, '2024-01-01T08:00:00Z'),
('rule_002', 'svc_007', 'inv_002', 1, 'tier_001', '2024-01-01T08:00:00Z'),
('rule_003', 'svc_007', 'inv_003', 1, 'tier_002,tier_003', '2024-01-01T08:00:00Z');

-- Inventory transactions
INSERT INTO inventory_transactions (id, inventory_item_id, transaction_type, qty_change, reason, order_id, purchase_order_id, user_id, created_at) VALUES
('trans_001', 'inv_001', 'CONSUMPTION', -1000, 'Order ORD-2024-0001 production', 'order_001', NULL, 'user_staff_003', '2024-01-20T10:00:00Z'),
('trans_002', 'inv_002', 'CONSUMPTION', -40, 'Order ORD-2024-0003 production', 'order_003', NULL, 'user_staff_003', '2024-02-05T10:00:00Z'),
('trans_003', 'inv_001', 'PURCHASE', 5000, 'Restock from PO-2024-001', NULL, 'po_001', 'user_staff_002', '2024-03-15T10:00:00Z'),
('trans_004', 'inv_004', 'ADJUSTMENT', -1, 'Damaged during installation', NULL, NULL, 'user_staff_003', '2024-03-01T14:00:00Z');

-- Purchase orders
INSERT INTO purchase_orders (id, po_number, supplier_name, status, total_cost, notes, created_by_id, sent_at, received_at, created_at, updated_at) VALUES
('po_001', 'PO-2024-001', 'Premium Papers Inc', 'RECEIVED', 1750.00, 'Restock cardstock inventory', 'user_staff_002', '2024-03-10T09:00:00Z', '2024-03-15T10:00:00Z', '2024-03-08T10:00:00Z', '2024-03-15T10:00:00Z'),
('po_002', 'PO-2024-002', 'SignMaster Supply', 'SENT', 2450.00, 'Vinyl material restock', 'user_staff_002', '2024-03-12T09:00:00Z', NULL, '2024-03-10T10:00:00Z', '2024-03-12T09:00:00Z'),
('po_003', 'PO-2024-003', 'PrintSupply Co', 'DRAFT', 3499.90, 'Ink cartridge order', 'user_staff_002', NULL, NULL, '2024-03-15T10:00:00Z', '2024-03-15T10:00:00Z');

-- Purchase order items
INSERT INTO purchase_order_items (id, purchase_order_id, inventory_item_id, qty_ordered, qty_received, unit_cost, line_total) VALUES
('poi_001', 'po_001', 'inv_001', 5000, 5000, 0.35, 1750.00),
('poi_002', 'po_002', 'inv_002', 500, 0, 1.85, 925.00),
('poi_003', 'po_002', 'inv_003', 300, 0, 2.45, 735.00),
('poi_004', 'po_003', 'inv_004', 10, 0, 349.99, 3499.90);

-- SLA breaches
INSERT INTO sla_breaches (id, order_id, breach_type, target_time, actual_time, breach_duration_hours, reason, resolved_at, created_at) VALUES
('breach_001', 'order_005', 'PROOF_DELAY', '2024-02-19T10:30:00Z', '2024-02-20T14:00:00Z', 27.5, 'Design complexity required extra time', '2024-02-20T15:00:00Z', '2024-02-19T10:30:00Z');

-- SLA timers
INSERT INTO sla_timers (id, order_id, timer_type, started_at, due_at, completed_at, is_breached, breach_notified) VALUES
('timer_001', 'order_001', 'FIRST_PROOF', '2024-01-16T14:30:00Z', '2024-01-18T14:30:00Z', '2024-01-18T10:00:00Z', false, false),
('timer_002', 'order_002', 'FIRST_PROOF', '2024-01-22T11:30:00Z', '2024-01-24T11:30:00Z', '2024-01-25T09:00:00Z', true, true),
('timer_003', 'order_005', 'FIRST_PROOF', '2024-02-17T10:30:00Z', '2024-02-19T10:30:00Z', '2024-02-20T14:00:00Z', true, true),
('timer_004', 'order_006', 'FIRST_PROOF', '2024-03-12T11:30:00Z', '2024-03-14T11:30:00Z', '2024-03-18T14:00:00Z', true, false);