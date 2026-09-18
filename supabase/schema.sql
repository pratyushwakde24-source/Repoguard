-- RepoGuard Supabase Database Schema
-- Run this in your Supabase SQL Editor to set up tables, RLS policies, and realtime streams.

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Repositories
CREATE TABLE IF NOT EXISTS repositories (
  id VARCHAR(64) PRIMARY KEY,
  github_repository_id BIGINT UNIQUE,
  name VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL UNIQUE,
  owner VARCHAR(255) NOT NULL,
  default_branch VARCHAR(100) DEFAULT 'main',
  language VARCHAR(100) DEFAULT 'TypeScript',
  visibility VARCHAR(50) DEFAULT 'public',
  html_url VARCHAR(500),
  ci_provider VARCHAR(100) DEFAULT 'GitHub Actions',
  health_score NUMERIC(5,2) DEFAULT 100.00,
  last_ci_status VARCHAR(50) DEFAULT 'passing',
  total_runs INT DEFAULT 0,
  success_rate NUMERIC(5,2) DEFAULT 100.00,
  monitoring_enabled BOOLEAN DEFAULT true,
  ci_monitoring_enabled BOOLEAN DEFAULT true,
  security_monitoring_enabled BOOLEAN DEFAULT true,
  pr_monitoring_enabled BOOLEAN DEFAULT true,
  auto_fix_enabled BOOLEAN DEFAULT true,
  webhook_active BOOLEAN DEFAULT false,
  webhook_id VARCHAR(100),
  connection_status VARCHAR(50) DEFAULT 'connected',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Incidents
CREATE TABLE IF NOT EXISTS incidents (
  id VARCHAR(64) PRIMARY KEY,
  repository_id VARCHAR(64) REFERENCES repositories(id) ON DELETE CASCADE,
  repository_name VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  status VARCHAR(30) NOT NULL CHECK (status IN ('open', 'investigating', 'healing', 'resolved', 'failed')),
  error_type VARCHAR(100),
  error_message TEXT,
  commit_sha VARCHAR(40),
  branch VARCHAR(100) DEFAULT 'main',
  workflow_name VARCHAR(100),
  build_number INT,
  affected_files JSONB DEFAULT '[]'::jsonb,
  blast_radius INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- Agent Runs
CREATE TABLE IF NOT EXISTS agent_runs (
  id VARCHAR(64) PRIMARY KEY,
  incident_id VARCHAR(64) REFERENCES incidents(id) ON DELETE CASCADE,
  status VARCHAR(30) NOT NULL CHECK (status IN ('queued', 'running', 'completed', 'failed')),
  current_stage VARCHAR(20) NOT NULL CHECK (current_stage IN ('DETECT', 'INSPECT', 'PLAN', 'REASON', 'PATCH', 'TEST', 'VERIFY', 'DELIVER')),
  current_model VARCHAR(100) DEFAULT 'Nemotron 3 Ultra',
  confidence NUMERIC(4,3) DEFAULT 0.00,
  retry_count INT DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INT DEFAULT 0
);

-- Agent Steps
CREATE TABLE IF NOT EXISTS agent_steps (
  id VARCHAR(64) PRIMARY KEY,
  run_id VARCHAR(64) REFERENCES agent_runs(id) ON DELETE CASCADE,
  stage VARCHAR(20) NOT NULL,
  status VARCHAR(30) NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'skipped')),
  model VARCHAR(100),
  summary TEXT,
  evidence_count INT DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity Events
CREATE TABLE IF NOT EXISTS activity_events (
  id VARCHAR(64) PRIMARY KEY,
  run_id VARCHAR(64) REFERENCES agent_runs(id) ON DELETE CASCADE,
  incident_id VARCHAR(64) REFERENCES incidents(id) ON DELETE CASCADE,
  stage VARCHAR(20) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  message TEXT NOT NULL,
  severity VARCHAR(20) DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'success')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Test Results
CREATE TABLE IF NOT EXISTS test_results (
  id VARCHAR(64) PRIMARY KEY,
  run_id VARCHAR(64) REFERENCES agent_runs(id) ON DELETE CASCADE,
  suite VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('passed', 'failed', 'skipped')),
  duration_ms INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pull Requests
CREATE TABLE IF NOT EXISTS pull_requests (
  id VARCHAR(64) PRIMARY KEY,
  incident_id VARCHAR(64) REFERENCES incidents(id) ON DELETE CASCADE,
  run_id VARCHAR(64) REFERENCES agent_runs(id) ON DELETE CASCADE,
  repository_name VARCHAR(255) NOT NULL,
  pr_number INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  branch VARCHAR(100) NOT NULL,
  status VARCHAR(30) NOT NULL CHECK (status IN ('open', 'merged', 'closed')),
  files_changed INT DEFAULT 0,
  lines_added INT DEFAULT 0,
  lines_removed INT DEFAULT 0,
  confidence NUMERIC(4,3) DEFAULT 0.00,
  verification_passed BOOLEAN DEFAULT true,
  url VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Security Alerts
CREATE TABLE IF NOT EXISTS security_alerts (
  id VARCHAR(64) PRIMARY KEY,
  repository_id VARCHAR(64) REFERENCES repositories(id) ON DELETE CASCADE,
  repository_name VARCHAR(255) NOT NULL,
  cve_id VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  cvss_score NUMERIC(3,1) DEFAULT 0.0,
  package_name VARCHAR(100) NOT NULL,
  current_version VARCHAR(50) NOT NULL,
  patched_version VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(30) NOT NULL CHECK (status IN ('open', 'patching', 'resolved', 'ignored')),
  auto_fix_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE agent_runs;
ALTER PUBLICATION supabase_realtime ADD TABLE agent_steps;
ALTER PUBLICATION supabase_realtime ADD TABLE activity_events;
ALTER PUBLICATION supabase_realtime ADD TABLE incidents;

-- Enable RLS Policies (Allow read/write for demo authenticated & anon clients)
ALTER TABLE repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE pull_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read/write on repositories" ON repositories FOR ALL USING (true);
CREATE POLICY "Allow public read/write on incidents" ON incidents FOR ALL USING (true);
CREATE POLICY "Allow public read/write on agent_runs" ON agent_runs FOR ALL USING (true);
CREATE POLICY "Allow public read/write on agent_steps" ON agent_steps FOR ALL USING (true);
CREATE POLICY "Allow public read/write on activity_events" ON activity_events FOR ALL USING (true);
CREATE POLICY "Allow public read/write on test_results" ON test_results FOR ALL USING (true);
CREATE POLICY "Allow public read/write on pull_requests" ON pull_requests FOR ALL USING (true);
CREATE POLICY "Allow public read/write on security_alerts" ON security_alerts FOR ALL USING (true);
