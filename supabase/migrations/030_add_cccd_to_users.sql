-- Migration: 030_add_cccd_to_users.sql
-- Created: 2026-07-22
-- Description: Bổ sung trường cccd (Căn cước công dân) cho nhân sự trong bảng public.users

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS cccd TEXT;
