import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { NEWS_SUMMARY_COLUMNS, type NewsPost, type NewsSummary } from '@/lib/news'

// Reads only published posts; RLS enforces the same rule on the database side
export async function getPublishedNews(limit = 30): Promise<NewsSummary[]> {
  if (!isSupabaseConfigured) return []
  const { data } = await supabase
    .from('news')
    .select(NEWS_SUMMARY_COLUMNS)
    .eq('status', 'published')
    .lte('published_at', new Date().toISOString())
    .order('published_at', { ascending: false })
    .limit(limit)
  return (data as NewsSummary[]) || []
}

export async function getNewsBySlug(slug: string): Promise<NewsPost | null> {
  if (!isSupabaseConfigured) return null
  const { data } = await supabase
    .from('news')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .lte('published_at', new Date().toISOString())
    .maybeSingle()
  return (data as NewsPost) || null
}
