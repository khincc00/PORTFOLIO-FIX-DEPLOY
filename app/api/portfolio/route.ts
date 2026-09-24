import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
export async function GET(){
  const { data, error } = await supabase.from('portfolio').select('*').eq('is_published', true).order('likes',{ascending:false})
  if(error) return NextResponse.json({error:error.message},{status:500})
  return NextResponse.json(data)
}
export async function POST(req:Request){
  const body = await req.json()
  const { data, error } = await supabase.from('portfolio').insert(body).select().single()
  if(error) return NextResponse.json({error:error.message},{status:500})
  return NextResponse.json(data)
}
