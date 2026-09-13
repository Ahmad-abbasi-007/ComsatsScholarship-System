-- ==============================================================================
-- COMSATS SCHOLARSHIP PORTAL - COMPLETE SUPABASE MIGRATION & SETUP SCRIPT
-- ==============================================================================
-- This script safely updates existing tables (including allowed_students, scholarships, faqs)
-- and creates any missing tables (scholarship_tiers, scholarship_form_fields, budget_approvals).
-- ==============================================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. ADMINS TABLE & SUPER ADMIN CREDENTIALS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'super_admin',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure all admin columns exist
ALTER TABLE admins ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'super_admin';
ALTER TABLE admins ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE admins ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Insert or Reset Super Admin credentials (email: admin@comsats.edu.pk, password: admin123)
-- Verified Bcrypt hash for 'admin123': $2b$10$MMkPROb4fNftBo40qWSMYuJUhyhhq/ioHmXEO/NjQ0FWQsHjgvjLe
INSERT INTO admins (email, password_hash, name, full_name, role, is_active, created_at, updated_at)
VALUES (
    'admin@comsats.edu.pk',
    '$2b$10$MMkPROb4fNftBo40qWSMYuJUhyhhq/ioHmXEO/NjQ0FWQsHjgvjLe',
    'Super Admin',
    'Super Admin',
    'super_admin',
    true,
    NOW(),
    NOW()
)
ON CONFLICT (email) 
DO UPDATE SET 
    password_hash = '$2b$10$MMkPROb4fNftBo40qWSMYuJUhyhhq/ioHmXEO/NjQ0FWQsHjgvjLe',
    role = 'super_admin',
    is_active = true,
    name = 'Super Admin',
    full_name = 'Super Admin',
    updated_at = NOW();

-- ==============================================================================
-- 2. ALLOWED STUDENTS & REGISTERED STUDENTS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS allowed_students (
    id BIGSERIAL PRIMARY KEY,
    regno TEXT UNIQUE NOT NULL,
    full_name TEXT,
    level TEXT DEFAULT 'Undergraduate',
    department TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add full_name column if it was missing in existing table
ALTER TABLE allowed_students ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE allowed_students ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE allowed_students ADD COLUMN IF NOT EXISTS level TEXT DEFAULT 'Undergraduate';

CREATE TABLE IF NOT EXISTS students (
    id BIGSERIAL PRIMARY KEY,
    regno TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT,
    level TEXT DEFAULT 'Undergraduate',
    department TEXT,
    password_hash TEXT NOT NULL,
    is_verified BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 3. SCHOLARSHIPS TABLE & COLUMNS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS scholarships (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    deadline TIMESTAMPTZ NOT NULL,
    status TEXT DEFAULT 'active',
    student_types TEXT[] DEFAULT ARRAY['undergraduate']::TEXT[],
    form_template TEXT DEFAULT 'custom',
    form_sections JSONB DEFAULT '[]'::JSONB,
    number_of_awards INTEGER DEFAULT 0,
    scholarship_mode TEXT DEFAULT 'single',
    award_amount NUMERIC DEFAULT 0,
    scoring_criteria JSONB DEFAULT '[]'::JSONB,
    merit_list_generated BOOLEAN DEFAULT FALSE,
    budget_allocated NUMERIC DEFAULT 0,
    budget_required NUMERIC DEFAULT 0,
    budget_status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Safely add all required scholarship columns
ALTER TABLE scholarships ADD COLUMN IF NOT EXISTS form_template TEXT DEFAULT 'custom';
ALTER TABLE scholarships ADD COLUMN IF NOT EXISTS form_sections JSONB DEFAULT '[]'::JSONB;
ALTER TABLE scholarships ADD COLUMN IF NOT EXISTS scholarship_mode TEXT DEFAULT 'single';
ALTER TABLE scholarships ADD COLUMN IF NOT EXISTS student_types TEXT[] DEFAULT ARRAY['undergraduate']::TEXT[];
ALTER TABLE scholarships ADD COLUMN IF NOT EXISTS number_of_awards INTEGER DEFAULT 0;
ALTER TABLE scholarships ADD COLUMN IF NOT EXISTS award_amount NUMERIC DEFAULT 0;
ALTER TABLE scholarships ADD COLUMN IF NOT EXISTS scoring_criteria JSONB DEFAULT '[]'::JSONB;
ALTER TABLE scholarships ADD COLUMN IF NOT EXISTS merit_list_generated BOOLEAN DEFAULT FALSE;
ALTER TABLE scholarships ADD COLUMN IF NOT EXISTS budget_allocated NUMERIC DEFAULT 0;
ALTER TABLE scholarships ADD COLUMN IF NOT EXISTS budget_required NUMERIC DEFAULT 0;
ALTER TABLE scholarships ADD COLUMN IF NOT EXISTS budget_status TEXT DEFAULT 'pending';
ALTER TABLE scholarships ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- ==============================================================================
-- 4. MISSING TABLES: SCHOLARSHIP TIERS & FORM FIELDS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS scholarship_tiers (
    id BIGSERIAL PRIMARY KEY,
    scholarship_id BIGINT NOT NULL REFERENCES scholarships(id) ON DELETE CASCADE,
    tier_name TEXT NOT NULL,
    min_score NUMERIC DEFAULT 0,
    max_score NUMERIC DEFAULT 100,
    award_description TEXT,
    award_amount TEXT,
    award_amount_numeric NUMERIC DEFAULT 0,
    tier_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scholarship_form_fields (
    id BIGSERIAL PRIMARY KEY,
    scholarship_id BIGINT NOT NULL REFERENCES scholarships(id) ON DELETE CASCADE,
    field_type TEXT NOT NULL,
    field_label TEXT NOT NULL,
    field_name TEXT NOT NULL,
    placeholder TEXT DEFAULT '',
    is_required BOOLEAN DEFAULT FALSE,
    field_order INTEGER DEFAULT 0,
    validation_rules JSONB DEFAULT '{}'::JSONB,
    options JSONB DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 5. BUDGET APPROVALS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS budget_approvals (
    id BIGSERIAL PRIMARY KEY,
    scholarship_id BIGINT NOT NULL REFERENCES scholarships(id) ON DELETE CASCADE,
    total_required NUMERIC DEFAULT 0,
    approved_amount NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'approved',
    approved_date TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 6. FAQS & HELP CONTENT (Supports display_order or order_index)
-- ==============================================================================
ALTER TABLE faqs ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;
ALTER TABLE faqs ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;

ALTER TABLE help_content ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;
ALTER TABLE help_content ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;

-- ==============================================================================
-- 7. SEED DATA
-- ==============================================================================
INSERT INTO allowed_students (regno, full_name, level, department)
VALUES
    ('FA21-BCS-001', 'Ahmad Abbasi', 'Undergraduate', 'Computer Science'),
    ('FA21-BCS-002', 'Ali Khan', 'Undergraduate', 'Computer Science'),
    ('SP22-BSE-015', 'Sara Ahmed', 'Undergraduate', 'Software Engineering'),
    ('FA20-BBA-030', 'Usman Tariq', 'Undergraduate', 'Management Sciences'),
    ('FA23-MCS-005', 'Zainab Malik', 'Graduate', 'Computer Science')
ON CONFLICT (regno) 
DO UPDATE SET 
    full_name = EXCLUDED.full_name,
    level = EXCLUDED.level,
    department = EXCLUDED.department;

INSERT INTO faqs (question, answer, category, is_active, display_order)
VALUES
    ('Who is eligible to apply for scholarships?', 'Students enrolled in regular undergraduate and graduate programs maintaining the minimum CGPA requirement can apply.', 'General', true, 1),
    ('How is the merit calculated?', 'Merit is calculated automatically based on academic performance (CGPA), financial need, and scholarship-specific criteria.', 'Merit', true, 2),
    ('Can I apply for multiple scholarships?', 'Yes, you can apply for multiple scholarships, but you can only receive one primary financial aid scholarship per academic session.', 'General', true, 3)
ON CONFLICT DO NOTHING;
