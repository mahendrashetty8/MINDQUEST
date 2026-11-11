-- supabase/schema.sql
-- Production Supabase schema for Pragyan Competition Quiz Web App

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Settings Table
CREATE TABLE IF NOT EXISTS quiz_settings (
  id INT PRIMARY KEY DEFAULT 1,
  quiz_name TEXT NOT NULL DEFAULT 'PRAGYAN NATIONAL OLYMPIAD 2026',
  total_questions_per_participant INT NOT NULL DEFAULT 10,
  time_limit_minutes INT NOT NULL DEFAULT 15,
  marks_per_correct NUMERIC(4,2) NOT NULL DEFAULT 4.00,
  negative_marking NUMERIC(4,2) NOT NULL DEFAULT 1.00,
  pass_mark_percentage NUMERIC(5,2) NOT NULL DEFAULT 40.00,
  shuffle_options BOOLEAN NOT NULL DEFAULT TRUE,
  show_results_immediately BOOLEAN NOT NULL DEFAULT TRUE,
  show_answer_review_after_submit BOOLEAN NOT NULL DEFAULT TRUE,
  one_attempt_per_participant BOOLEAN NOT NULL DEFAULT TRUE,
  max_tab_switches_allowed INT NOT NULL DEFAULT 3,
  is_quiz_active BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default row
INSERT INTO quiz_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- 3. Questions Bank Table
-- The 'answer' column is protected: RLS prevents public reading of the answer column
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question_number INT,
  question TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  answer CHAR(1) NOT NULL, -- 'A', 'B', 'C', or 'D' (NEVER exposed to participants)
  category TEXT DEFAULT 'General',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Quiz Attempts Table
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participant_name TEXT NOT NULL,
  participant_email TEXT,
  participant_phone TEXT,
  participant_org TEXT,
  assigned_questions JSONB NOT NULL, -- Array of sanitized question objects (NO ANSWERS)
  private_answer_key JSONB NOT NULL, -- { "qId": "mappedCorrectKey" } - SERVER ONLY
  answers JSONB DEFAULT '{}'::jsonb, -- { "qId": "A" }
  reviewed JSONB DEFAULT '{}'::jsonb, -- { "qId": true }
  start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'auto_submitted', 'disqualified')),
  tab_switch_count INT DEFAULT 0,
  tab_switch_events JSONB DEFAULT '[]'::jsonb,
  result JSONB DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Row Level Security (RLS)
ALTER TABLE quiz_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;

-- Anonymous users can read public quiz info, but NOT the answer column of questions
CREATE POLICY "Public can view active settings"
  ON quiz_settings FOR SELECT
  USING (true);

-- Server side scoring function (Edge Function or Postgres RPC)
CREATE OR REPLACE FUNCTION submit_attempt_rpc(
  p_attempt_id UUID,
  p_answers JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_attempt quiz_attempts%ROWTYPE;
  v_settings quiz_settings%ROWTYPE;
  v_q_id TEXT;
  v_user_ans TEXT;
  v_correct_ans TEXT;
  v_correct_count INT := 0;
  v_wrong_count INT := 0;
  v_attended_count INT := 0;
  v_total_questions INT;
  v_raw_score NUMERIC(6,2);
  v_final_score NUMERIC(6,2);
  v_max_possible NUMERIC(6,2);
  v_percentage NUMERIC(5,2);
  v_passed BOOLEAN;
  v_result JSONB;
BEGIN
  SELECT * INTO v_attempt FROM quiz_attempts WHERE id = p_attempt_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Attempt not found';
  END IF;

  SELECT * INTO v_settings FROM quiz_settings WHERE id = 1;

  v_total_questions := jsonb_array_length(v_attempt.assigned_questions);

  FOR v_q_id, v_correct_ans IN SELECT * FROM jsonb_each_text(v_attempt.private_answer_key)
  LOOP
    v_user_ans := p_answers->>v_q_id;
    IF v_user_ans IS NOT NULL AND v_user_ans <> '' THEN
      v_attended_count := v_attended_count + 1;
      IF v_user_ans = v_correct_ans THEN
        v_correct_count := v_correct_count + 1;
      ELSE
        v_wrong_count := v_wrong_count + 1;
      END IF;
    END IF;
  END LOOP;

  v_raw_score := (v_correct_count * v_settings.marks_per_correct) - (v_wrong_count * v_settings.negative_marking);
  v_final_score := GREATEST(0, v_raw_score);
  v_max_possible := v_total_questions * v_settings.marks_per_correct;
  v_percentage := ROUND(((v_final_score / NULLIF(v_max_possible, 0)) * 100), 1);
  v_passed := v_percentage >= v_settings.pass_mark_percentage;

  v_result := jsonb_build_object(
    'totalQuestions', v_total_questions,
    'attended', v_attended_count,
    'unattended', v_total_questions - v_attended_count,
    'correct', v_correct_count,
    'wrong', v_wrong_count,
    'finalScore', v_final_score,
    'maxPossibleScore', v_max_possible,
    'percentage', v_percentage,
    'passed', v_passed,
    'timeTakenSeconds', EXTRACT(EPOCH FROM (NOW() - v_attempt.start_time))::INT
  );

  UPDATE quiz_attempts
  SET status = 'submitted',
      answers = p_answers,
      submitted_at = NOW(),
      result = v_result
  WHERE id = p_attempt_id;

  RETURN v_result;
END;
$$;
