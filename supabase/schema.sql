create table if not exists portfolio (
  id serial primary key,
  title text not null,
  likes int default 0,
  reel_id text not null,
  category text,
  description text,
  views int default 0,
  is_published boolean default true,
  created_at timestamp default now()
);
create table if not exists contacts (
  id serial primary key,
  name text,
  email text,
  project_type text,
  budget text,
  message text,
  status text default 'new',
  created_at timestamp default now()
);
insert into portfolio (title, likes, reel_id, category, description) values
('WYVERN PRO IEM Gaming', 18, 'DVQrHReEkg3', 'Gaming Audio', 'Top performer, hook step musuh'),
('Secondwave e1', 11, 'DVw6WtMk8-8', 'Audio Review', 'Budget high-end storytelling'),
('Fantech Groove ANC Zoro', 8, 'DbVXyg1JH2J', 'Earbuds ANC', 'One Piece + ANC demo'),
('Fantech Tanto Mouse Dock', 7, 'DbILo_CJg0i', 'Gaming Mouse', 'Triple-mode kompleks jadi simple'),
('Secondwave/KZ Audio Lanjutan', 7, 'DVRlxm-EzEw', 'Audio', 'Konsistensi niche'),
('Affordable Streaming Gear', 6, 'DYhtuV0PbHu', 'Setup', 'Personal proof'),
('KZ Castor Starter Guide', 4, 'DVXWNrekt6i', 'Starter', 'CTA TikTok Shop'),
('Dynamic Mic Filter Limiter', 4, 'DYyi95pSL3u', 'Educational', 'Depth knowledge'),
('Streaming Mic Setup', 4, 'DYjRUUEpzw8', 'Educational', 'Technique'),
('Budget Setup Under 500k', 4, 'DZw_Sc5JGAP', 'Budget Guide', 'Harga = keyword'),
('PHOTOOLEX RGB Tube Light', 2, 'DW1qrfEvgvS', 'Lighting', 'Visual quality'),
('Fantech Groove Luffy', 2, 'DbJc1-5TAwx', 'Earbuds', 'Series One Piece'),
('2K Webcam Streaming', 1, 'DWKG07fzceT', 'Webcam', 'Streaming gear'),
('Fantech WGP-13S Gamepad', 1, 'DVEGq4SEshJ', 'Gamepad Promo', 'Sales urgency copy')
ON CONFLICT DO NOTHING;
