-- Migration 002: Add notes column to applications table
-- This adds a separate notes field for timeline/status tracking

ALTER TABLE applications ADD COLUMN notes TEXT;
