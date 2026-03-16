-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgvector";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- ============================================================================
-- ORGANIZATIONS
-- ============================================================================
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'professional', 'enterprise')),
    plan_period_end TIMESTAMPTZ,
    max_brands INTEGER NOT NULL DEFAULT 1,
    max_queries_per_audit INTEGER NOT NULL DEFAULT 20,
    audit_frequency TEXT NOT NULL DEFAULT 'monthly' CHECK (audit_frequency IN ('weekly', 'biweekly', 'monthly')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_organizations_owner ON organizations(owner_id);
CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_stripe ON organizations(stripe_customer_id);

-- ============================================================================
-- ORGANIZATION MEMBERS
-- ============================================================================
CREATE TABLE organization_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, user_id)
);

CREATE INDEX idx_org_members_org ON organization_members(organization_id);
CREATE INDEX idx_org_members_user ON organization_members(user_id);

-- ============================================================================
-- BRANDS
-- ============================================================================
CREATE TABLE brands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    domain TEXT NOT NULL,
    vertical TEXT NOT NULL CHECK (vertical IN (
        'restaurant', 'hotel', 'saas', 'ecommerce', 'healthcare',
        'legal', 'real_estate', 'education', 'fitness', 'automotive',
        'financial', 'travel', 'home_services', 'retail', 'general'
    )),
    description TEXT NOT NULL DEFAULT '',
    city TEXT,
    state TEXT,
    country TEXT NOT NULL DEFAULT 'US',
    keywords TEXT[] NOT NULL DEFAULT '{}',
    competitors TEXT[] NOT NULL DEFAULT '{}',
    logo_url TEXT,
    website_screenshot_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_brands_org ON brands(organization_id);
CREATE INDEX idx_brands_domain ON brands(domain);
CREATE INDEX idx_brands_vertical ON brands(vertical);

-- ============================================================================
-- AUDIT RUNS
-- ============================================================================
CREATE TABLE audit_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    triggered_by TEXT NOT NULL DEFAULT 'manual' CHECK (triggered_by IN ('manual', 'scheduled', 'api')),
    models_queried TEXT[] NOT NULL DEFAULT '{}',
    total_queries INTEGER NOT NULL DEFAULT 0,
    completed_queries INTEGER NOT NULL DEFAULT 0,
    overall_score NUMERIC(5,2),
    error_message TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_runs_brand ON audit_runs(brand_id);
CREATE INDEX idx_audit_runs_status ON audit_runs(status);
CREATE INDEX idx_audit_runs_created ON audit_runs(created_at DESC);

-- ============================================================================
-- AUDIT RESULTS (per model, per query)
-- ============================================================================
CREATE TABLE audit_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    audit_run_id UUID NOT NULL REFERENCES audit_runs(id) ON DELETE CASCADE,
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    model TEXT NOT NULL CHECK (model IN ('chatgpt', 'claude', 'gemini', 'perplexity')),
    query_template TEXT NOT NULL,
    query_rendered TEXT NOT NULL,
    query_category TEXT NOT NULL CHECK (query_category IN (
        'best_in_category', 'recommendation', 'review', 'comparison',
        'industry_specific', 'how_to', 'alternative', 'top_list'
    )),
    response TEXT NOT NULL,
    visibility_score TEXT NOT NULL CHECK (visibility_score IN (
        'not_mentioned', 'mentioned', 'recommended', 'top_recommendation'
    )),
    numeric_score INTEGER NOT NULL CHECK (numeric_score BETWEEN 0 AND 3),
    mention_position INTEGER,
    competitors_mentioned TEXT[] NOT NULL DEFAULT '{}',
    sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
    latency_ms INTEGER NOT NULL DEFAULT 0,
    response_embedding vector(1536),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_results_run ON audit_results(audit_run_id);
CREATE INDEX idx_audit_results_brand ON audit_results(brand_id);
CREATE INDEX idx_audit_results_model ON audit_results(model);
CREATE INDEX idx_audit_results_score ON audit_results(numeric_score);
CREATE INDEX idx_audit_results_category ON audit_results(query_category);
CREATE INDEX idx_audit_results_created ON audit_results(created_at DESC);

-- ============================================================================
-- VISIBILITY SCORES (aggregated per audit run)
-- ============================================================================
CREATE TABLE visibility_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    audit_run_id UUID NOT NULL REFERENCES audit_runs(id) ON DELETE CASCADE,
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    overall_score NUMERIC(5,2) NOT NULL,
    chatgpt_score NUMERIC(5,2) NOT NULL DEFAULT 0,
    claude_score NUMERIC(5,2) NOT NULL DEFAULT 0,
    gemini_score NUMERIC(5,2) NOT NULL DEFAULT 0,
    perplexity_score NUMERIC(5,2) NOT NULL DEFAULT 0,
    mention_rate NUMERIC(5,4) NOT NULL DEFAULT 0,
    recommendation_rate NUMERIC(5,4) NOT NULL DEFAULT 0,
    top_recommendation_rate NUMERIC(5,4) NOT NULL DEFAULT 0,
    category_scores JSONB NOT NULL DEFAULT '{}',
    strengths TEXT[] NOT NULL DEFAULT '{}',
    weaknesses TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_visibility_scores_brand ON visibility_scores(brand_id);
CREATE INDEX idx_visibility_scores_created ON visibility_scores(created_at DESC);
CREATE INDEX idx_visibility_scores_audit ON visibility_scores(audit_run_id);

-- ============================================================================
-- COMPETITORS
-- ============================================================================
CREATE TABLE competitors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    domain TEXT,
    mention_count INTEGER NOT NULL DEFAULT 0,
    avg_score NUMERIC(5,2) NOT NULL DEFAULT 0,
    last_audit_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(brand_id, name)
);

CREATE INDEX idx_competitors_brand ON competitors(brand_id);

-- ============================================================================
-- OPTIMIZED CONTENT
-- ============================================================================
CREATE TABLE optimized_content (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content_type TEXT NOT NULL CHECK (content_type IN (
        'blog_post', 'faq', 'landing_page', 'case_study', 'comparison', 'guide'
    )),
    content TEXT NOT NULL,
    meta_description TEXT,
    target_keywords TEXT[] NOT NULL DEFAULT '{}',
    word_count INTEGER NOT NULL DEFAULT 0,
    structured_data_suggestion TEXT,
    internal_linking_suggestions TEXT[] NOT NULL DEFAULT '{}',
    call_to_action TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'published', 'archived')),
    content_embedding vector(1536),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_optimized_content_brand ON optimized_content(brand_id);
CREATE INDEX idx_optimized_content_type ON optimized_content(content_type);
CREATE INDEX idx_optimized_content_status ON optimized_content(status);

-- ============================================================================
-- RANKING HISTORY (weekly snapshots)
-- ============================================================================
CREATE TABLE ranking_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    audit_run_id UUID REFERENCES audit_runs(id) ON DELETE SET NULL,
    week_start DATE NOT NULL,
    overall_score NUMERIC(5,2) NOT NULL,
    chatgpt_score NUMERIC(5,2) NOT NULL DEFAULT 0,
    claude_score NUMERIC(5,2) NOT NULL DEFAULT 0,
    gemini_score NUMERIC(5,2) NOT NULL DEFAULT 0,
    perplexity_score NUMERIC(5,2) NOT NULL DEFAULT 0,
    mention_rate NUMERIC(5,4) NOT NULL DEFAULT 0,
    recommendation_rate NUMERIC(5,4) NOT NULL DEFAULT 0,
    total_queries INTEGER NOT NULL DEFAULT 0,
    score_change NUMERIC(5,2) DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(brand_id, week_start)
);

CREATE INDEX idx_ranking_history_brand ON ranking_history(brand_id);
CREATE INDEX idx_ranking_history_week ON ranking_history(week_start DESC);

-- ============================================================================
-- ANALYSIS RESULTS
-- ============================================================================
CREATE TABLE analysis_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    audit_run_id UUID REFERENCES audit_runs(id) ON DELETE SET NULL,
    visibility_gaps JSONB NOT NULL DEFAULT '[]',
    content_gaps JSONB NOT NULL DEFAULT '[]',
    competitive_insights JSONB NOT NULL DEFAULT '[]',
    prioritized_actions JSONB NOT NULL DEFAULT '[]',
    overall_assessment TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_analysis_results_brand ON analysis_results(brand_id);
CREATE INDEX idx_analysis_results_audit ON analysis_results(audit_run_id);

-- ============================================================================
-- RECOMMENDATIONS
-- ============================================================================
CREATE TABLE recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    analysis_id UUID REFERENCES analysis_results(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN (
        'content', 'technical_seo', 'structured_data', 'authority', 'brand_signals'
    )),
    priority TEXT NOT NULL CHECK (priority IN ('critical', 'high', 'medium', 'low')),
    effort TEXT NOT NULL CHECK (effort IN ('low', 'medium', 'high')),
    impact TEXT NOT NULL CHECK (impact IN ('low', 'medium', 'high')),
    description TEXT NOT NULL,
    steps TEXT[] NOT NULL DEFAULT '{}',
    estimated_timeframe TEXT,
    related_metrics TEXT[] NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'dismissed')),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_recommendations_brand ON recommendations(brand_id);
CREATE INDEX idx_recommendations_priority ON recommendations(priority);
CREATE INDEX idx_recommendations_status ON recommendations(status);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Auto-update updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_brands_updated_at
    BEFORE UPDATE ON brands
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_competitors_updated_at
    BEFORE UPDATE ON competitors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_optimized_content_updated_at
    BEFORE UPDATE ON optimized_content
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_recommendations_updated_at
    BEFORE UPDATE ON recommendations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE visibility_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE optimized_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE ranking_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;

-- Organizations: members can read, owners can write
CREATE POLICY "org_members_select" ON organizations
    FOR SELECT USING (
        id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
    );

CREATE POLICY "org_owner_all" ON organizations
    FOR ALL USING (owner_id = auth.uid());

-- Organization members: org members can read
CREATE POLICY "org_members_read" ON organization_members
    FOR SELECT USING (
        organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
    );

CREATE POLICY "org_members_admin_write" ON organization_members
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- Brands: org members can read, admins+ can write
CREATE POLICY "brands_org_read" ON brands
    FOR SELECT USING (
        organization_id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
    );

CREATE POLICY "brands_org_write" ON brands
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM organization_members
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- Audit runs: org members can read
CREATE POLICY "audit_runs_read" ON audit_runs
    FOR SELECT USING (
        brand_id IN (
            SELECT b.id FROM brands b
            JOIN organization_members om ON b.organization_id = om.organization_id
            WHERE om.user_id = auth.uid()
        )
    );

CREATE POLICY "audit_runs_write" ON audit_runs
    FOR ALL USING (
        brand_id IN (
            SELECT b.id FROM brands b
            JOIN organization_members om ON b.organization_id = om.organization_id
            WHERE om.user_id = auth.uid() AND om.role IN ('owner', 'admin', 'member')
        )
    );

-- Audit results: org members can read
CREATE POLICY "audit_results_read" ON audit_results
    FOR SELECT USING (
        brand_id IN (
            SELECT b.id FROM brands b
            JOIN organization_members om ON b.organization_id = om.organization_id
            WHERE om.user_id = auth.uid()
        )
    );

-- Visibility scores: org members can read
CREATE POLICY "visibility_scores_read" ON visibility_scores
    FOR SELECT USING (
        brand_id IN (
            SELECT b.id FROM brands b
            JOIN organization_members om ON b.organization_id = om.organization_id
            WHERE om.user_id = auth.uid()
        )
    );

-- Competitors: org members can read
CREATE POLICY "competitors_read" ON competitors
    FOR SELECT USING (
        brand_id IN (
            SELECT b.id FROM brands b
            JOIN organization_members om ON b.organization_id = om.organization_id
            WHERE om.user_id = auth.uid()
        )
    );

-- Optimized content: org members can read, admins+ can write
CREATE POLICY "optimized_content_read" ON optimized_content
    FOR SELECT USING (
        brand_id IN (
            SELECT b.id FROM brands b
            JOIN organization_members om ON b.organization_id = om.organization_id
            WHERE om.user_id = auth.uid()
        )
    );

CREATE POLICY "optimized_content_write" ON optimized_content
    FOR ALL USING (
        brand_id IN (
            SELECT b.id FROM brands b
            JOIN organization_members om ON b.organization_id = om.organization_id
            WHERE om.user_id = auth.uid() AND om.role IN ('owner', 'admin')
        )
    );

-- Ranking history: org members can read
CREATE POLICY "ranking_history_read" ON ranking_history
    FOR SELECT USING (
        brand_id IN (
            SELECT b.id FROM brands b
            JOIN organization_members om ON b.organization_id = om.organization_id
            WHERE om.user_id = auth.uid()
        )
    );

-- Analysis results: org members can read
CREATE POLICY "analysis_results_read" ON analysis_results
    FOR SELECT USING (
        brand_id IN (
            SELECT b.id FROM brands b
            JOIN organization_members om ON b.organization_id = om.organization_id
            WHERE om.user_id = auth.uid()
        )
    );

-- Recommendations: org members can read, members+ can update status
CREATE POLICY "recommendations_read" ON recommendations
    FOR SELECT USING (
        brand_id IN (
            SELECT b.id FROM brands b
            JOIN organization_members om ON b.organization_id = om.organization_id
            WHERE om.user_id = auth.uid()
        )
    );

CREATE POLICY "recommendations_write" ON recommendations
    FOR ALL USING (
        brand_id IN (
            SELECT b.id FROM brands b
            JOIN organization_members om ON b.organization_id = om.organization_id
            WHERE om.user_id = auth.uid() AND om.role IN ('owner', 'admin', 'member')
        )
    );

-- ============================================================================
-- CRON JOBS (pg_cron)
-- ============================================================================

-- Weekly audit for all active brands on professional+ plans
SELECT cron.schedule(
    'weekly-audits',
    '0 2 * * 1', -- Every Monday at 2 AM
    $$
    INSERT INTO audit_runs (brand_id, status, triggered_by, models_queried)
    SELECT b.id, 'pending', 'scheduled', ARRAY['chatgpt', 'claude', 'gemini', 'perplexity']
    FROM brands b
    JOIN organizations o ON b.organization_id = o.id
    WHERE b.is_active = true
    AND o.plan IN ('professional', 'enterprise')
    AND o.audit_frequency = 'weekly';
    $$
);

-- Biweekly audit for starter+ plans
SELECT cron.schedule(
    'biweekly-audits',
    '0 2 1,15 * *', -- 1st and 15th of each month at 2 AM
    $$
    INSERT INTO audit_runs (brand_id, status, triggered_by, models_queried)
    SELECT b.id, 'pending', 'scheduled', ARRAY['chatgpt', 'claude', 'gemini', 'perplexity']
    FROM brands b
    JOIN organizations o ON b.organization_id = o.id
    WHERE b.is_active = true
    AND o.plan IN ('starter', 'professional', 'enterprise')
    AND o.audit_frequency = 'biweekly';
    $$
);

-- Monthly audit for all active brands
SELECT cron.schedule(
    'monthly-audits',
    '0 2 1 * *', -- 1st of each month at 2 AM
    $$
    INSERT INTO audit_runs (brand_id, status, triggered_by, models_queried)
    SELECT b.id, 'pending', 'scheduled', ARRAY['chatgpt', 'claude', 'gemini', 'perplexity']
    FROM brands b
    JOIN organizations o ON b.organization_id = o.id
    WHERE b.is_active = true
    AND o.audit_frequency = 'monthly';
    $$
);
