-- Supabase Schema for BookReader
-- Paste this entire file into the Supabase SQL Editor and click "Run"

-- 1. Create Tables
CREATE TABLE public.books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  file_path TEXT NOT NULL,
  cover_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  book_id UUID REFERENCES public.books(id) ON DELETE CASCADE NOT NULL,
  page_number INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  book_id UUID REFERENCES public.books(id) ON DELETE CASCADE NOT NULL,
  current_page INTEGER DEFAULT 0 NOT NULL,
  zoom_level FLOAT DEFAULT 1 NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, book_id)
);

CREATE TABLE public.highlights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  book_id UUID REFERENCES public.books(id) ON DELETE CASCADE NOT NULL,
  page_number INTEGER NOT NULL,
  text TEXT,
  rects JSONB NOT NULL,
  color TEXT DEFAULT '#ffeb3b',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Storage Bucket for PDFs
INSERT INTO storage.buckets (id, name, public) 
VALUES ('pdfs', 'pdfs', false)
ON CONFLICT (id) DO NOTHING;

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.highlights ENABLE ROW LEVEL SECURITY;

-- 4. Create Security Policies
-- Users can only see and modify their own books
CREATE POLICY "Users can manage their own books" 
ON public.books FOR ALL USING (auth.uid() = user_id);

-- Users can only see and modify their own bookmarks
CREATE POLICY "Users can manage their own bookmarks" 
ON public.bookmarks FOR ALL USING (auth.uid() = user_id);

-- Users can only see and modify their own progress
CREATE POLICY "Users can manage their own progress" 
ON public.user_progress FOR ALL USING (auth.uid() = user_id);

-- Users can only see and modify their own highlights
CREATE POLICY "Users can manage their own highlights" 
ON public.highlights FOR ALL USING (auth.uid() = user_id);

-- Storage Policies: Users can only upload/read their own PDFs
CREATE POLICY "Users can upload their own PDFs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'pdfs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can read their own PDFs"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'pdfs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update their own PDFs"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'pdfs' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete their own PDFs"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'pdfs' AND (storage.foldername(name))[1] = auth.uid()::text);
