/*
  # ScholarAI Interviewer - Initial Database Schema

  1. New Tables
    - `users`
      - `id` (text, primary key) - Clerk user ID
      - `email` (text, unique)
      - `full_name` (text)
      - `plan` (text) - 'free', 'pro', 'enterprise'
      - `credits_used` (int) - number of interviews used this month
      - `credits_limit` (int) - max interviews allowed per month
      - `created_at` (timestamptz)
      
    - `resumes`
      - `id` (uuid, primary key)
      - `user_id` (text, foreign key → users.id)
      - `file_name` (text)
      - `raw_text` (text) - extracted resume text
      - `parsed_data` (jsonb) - candidate name, skills, suggested role
      - `created_at` (timestamptz)
      
    - `interviews`
      - `id` (uuid, primary key)
      - `user_id` (text, foreign key → users.id)
      - `resume_id` (uuid, foreign key → resumes.id)
      - `candidate_name` (text)
      - `suggested_role` (text)
      - `questions` (jsonb) - array of question objects
      - `answers` (jsonb) - array of answer strings
      - `analyses` (jsonb) - array of analysis objects
      - `emotion_log` (jsonb) - array of emotion capture events
      - `report` (jsonb) - final report data
      - `overall_score` (int)
      - `verdict` (text) - 'Strong Hire', 'Hire', 'Consider', 'Pass'
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Users can only read/write their own data
    - Authenticated users only
*/

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY,
  email text UNIQUE NOT NULL,
  full_name text,
  plan text DEFAULT 'free' NOT NULL,
  credits_used int DEFAULT 0 NOT NULL,
  credits_limit int DEFAULT 3 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own data"
  ON users FOR SELECT
  TO authenticated
  USING (auth.jwt() ->> 'sub' = id);

CREATE POLICY "Users can insert own data"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (auth.jwt() ->> 'sub' = id);

CREATE POLICY "Users can update own data"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.jwt() ->> 'sub' = id)
  WITH CHECK (auth.jwt() ->> 'sub' = id);

-- Resumes table
CREATE TABLE IF NOT EXISTS resumes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  raw_text text NOT NULL,
  parsed_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own resumes"
  ON resumes FOR SELECT
  TO authenticated
  USING (auth.jwt() ->> 'sub' = user_id);

CREATE POLICY "Users can insert own resumes"
  ON resumes FOR INSERT
  TO authenticated
  WITH CHECK (auth.jwt() ->> 'sub' = user_id);

CREATE POLICY "Users can delete own resumes"
  ON resumes FOR DELETE
  TO authenticated
  USING (auth.jwt() ->> 'sub' = user_id);

-- Interviews table
CREATE TABLE IF NOT EXISTS interviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  resume_id uuid REFERENCES resumes(id) ON DELETE SET NULL,
  candidate_name text NOT NULL,
  suggested_role text,
  questions jsonb DEFAULT '[]'::jsonb,
  answers jsonb DEFAULT '{}'::jsonb,
  analyses jsonb DEFAULT '{}'::jsonb,
  emotion_log jsonb DEFAULT '[]'::jsonb,
  report jsonb DEFAULT '{}'::jsonb,
  overall_score int DEFAULT 0,
  verdict text,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own interviews"
  ON interviews FOR SELECT
  TO authenticated
  USING (auth.jwt() ->> 'sub' = user_id);

CREATE POLICY "Users can insert own interviews"
  ON interviews FOR INSERT
  TO authenticated
  WITH CHECK (auth.jwt() ->> 'sub' = user_id);

CREATE POLICY "Users can update own interviews"
  ON interviews FOR UPDATE
  TO authenticated
  USING (auth.jwt() ->> 'sub' = user_id)
  WITH CHECK (auth.jwt() ->> 'sub' = user_id);

CREATE POLICY "Users can delete own interviews"
  ON interviews FOR DELETE
  TO authenticated
  USING (auth.jwt() ->> 'sub' = user_id);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON resumes(user_id);
CREATE INDEX IF NOT EXISTS idx_interviews_user_id ON interviews(user_id);
CREATE INDEX IF NOT EXISTS idx_interviews_created_at ON interviews(created_at DESC);