{\rtf1\ansi\ansicpg1252\cocoartf2907
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fnil\fcharset0 .AppleSystemUIFontMonospaced-Regular;}
{\colortbl;\red255\green255\blue255;\red255\green255\blue255;\red22\green22\blue24;}
{\*\expandedcolortbl;;\cssrgb\c100000\c100000\c100000\c90196;\cssrgb\c11373\c11373\c12157;}
\paperw11900\paperh16840\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\deftab720
\pard\pardeftab720\partightenfactor0

\f0\fs25 \cf2 \cb3 \expnd0\expndtw0\kerning0
import \{ createClient \} from "@/lib/supabase";\
\
export default async function AdminPage() \{\
  const supabase = createClient();\
  const \{ data \} = await supabase.from("portfolio").select("*");\
  \
  return (\
    <div className="p-8">\
      <h1 className="text-2xl font-semibold">Admin / Dashboard</h1>\
      <p className="text-sm text-neutral-500">Route: /admin</p>\
      \{/* CRUD table */\}\
    </div>\
  );\
\}}