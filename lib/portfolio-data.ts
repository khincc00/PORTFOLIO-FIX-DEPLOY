/**
 * lib/portfolio-data.ts
 * Data portfolio "bawaan" yang ditulis langsung di kode, plus teks tetap untuk beranda.
 *
 * Sejak ada menu Admin → Portfolio, karya (desain, video, web) disimpan di tabel
 * `portfolio_items` di Supabase. Data karya di file ini sekarang hanya dipakai:
 * - sebagai isi awal tabel itu (seed), dan
 * - sebagai cadangan kalau database tidak bisa diakses (lihat fallbackPortfolio di lib/portfolio-items.ts).
 * Jadi untuk menambah/mengubah karya, pakai halaman admin, bukan file ini.
 *
 * Yang masih dibaca langsung dari file ini: layanan (capabilities), teks berjalan (marquee),
 * kontak, link CV, dan pengalaman kerja.
 */
// Daftar Instagram Reels lama. reel_id = kode unik reel di URL Instagram
export const portfolioSeed = [
  // === 14 REELS INSTAGRAM (data awal dari tabel lama di Supabase) ===
  {title:"WYVERN PRO IEM Gaming",likes:18,reel_id:"DVQrHReEkg3",category:"Gaming Audio",description:"Top performer, hook step musuh", platform:"instagram", link:"https://www.instagram.com/reel/DVQrHReEkg3/"},
  {title:"Secondwave e1",likes:11,reel_id:"DVw6WtMk8-8",category:"Audio Review",description:"Budget high-end storytelling", platform:"instagram", link:"https://www.instagram.com/reel/DVw6WtMk8-8/"},
  {title:"Fantech Groove ANC Zoro",likes:8,reel_id:"DbVXyg1JH2J",category:"Earbuds ANC",description:"One Piece + ANC demo", platform:"instagram", link:"https://www.instagram.com/reel/DbVXyg1JH2J/"},
  {title:"Fantech Tanto Mouse Dock",likes:7,reel_id:"DbILo_CJg0i",category:"Gaming Mouse",description:"Triple-mode kompleks jadi simple", platform:"instagram", link:"https://www.instagram.com/reel/DbILo_CJg0i/"},
  {title:"Secondwave/KZ Audio Lanjutan",likes:7,reel_id:"DVRlxm-EzEw",category:"Audio",description:"Konsistensi niche", platform:"instagram", link:"https://www.instagram.com/reel/DVRlxm-EzEw/"},
  {title:"Affordable Streaming Gear",likes:6,reel_id:"DYhtuV0PbHu",category:"Setup",description:"Personal proof", platform:"instagram", link:"https://www.instagram.com/reel/DYhtuV0PbHu/"},
  {title:"KZ Castor Starter Guide",likes:4,reel_id:"DVXWNrekt6i",category:"Starter",description:"CTA TikTok Shop", platform:"instagram", link:"https://www.instagram.com/reel/DVXWNrekt6i/"},
  {title:"Dynamic Mic Filter Limiter",likes:4,reel_id:"DYyi95pSL3u",category:"Educational",description:"Depth knowledge", platform:"instagram", link:"https://www.instagram.com/reel/DYyi95pSL3u/"},
  {title:"Streaming Mic Setup",likes:4,reel_id:"DYjRUUEpzw8",category:"Educational",description:"Technique", platform:"instagram", link:"https://www.instagram.com/reel/DYjRUUEpzw8/"},
  {title:"Budget Setup Under 500k",likes:4,reel_id:"DZw_Sc5JGAP",category:"Budget Guide",description:"Harga = keyword", platform:"instagram", link:"https://www.instagram.com/reel/DZw_Sc5JGAP/"},
  {title:"PHOTOOLEX RGB Tube Light",likes:2,reel_id:"DW1qrfEvgvS",category:"Lighting",description:"Visual quality", platform:"instagram", link:"https://www.instagram.com/reel/DW1qrfEvgvS/"},
  {title:"Fantech Groove Luffy",likes:2,reel_id:"DbJc1-5TAwx",category:"Earbuds",description:"Series One Piece", platform:"instagram", link:"https://www.instagram.com/reel/DbJc1-5TAwx/"},
  {title:"2K Webcam Streaming",likes:1,reel_id:"DWKG07fzceT",category:"Webcam",description:"Streaming gear", platform:"instagram", link:"https://www.instagram.com/reel/DWKG07fzceT/"},
  {title:"Fantech WGP-13S Gamepad",likes:1,reel_id:"DVEGq4SEshJ",category:"Gamepad Promo",description:"Sales urgency copy", platform:"instagram", link:"https://www.instagram.com/reel/DVEGq4SEshJ/"},
];

// === DATA DARI VERSI HTML LAMA ===

// Poster kampanye untuk bagian Design. description berisi teks {en, id} untuk dua bahasa
export const campaignPosters = [
  { id:"atlas", title:"Online Loan Awareness", category:"Campaign design / Social media", year:"2026", image:"/work/design-online-loan.jpg", alt:"Poster design about avoiding online loan scams for Penerangan Lanal Sangatta", description:{en:"Campaign for Penerangan Lanal Sangatta — raising awareness of illegal online loans",id:"Kampanye untuk Penerangan Lanal Sangatta — edukasi bahaya pinjol"} },
  { id:"ruang", title:"Digital Safety Campaign", category:"Public information / Illustration", year:"2026", image:"/work/design-digital-safety.jpg", alt:"Poster design about preventing fraud and exploitation on social media", description:{en:"Educating the public on preventing fraud and exploitation on social media",id:"Edukasi pencegahan penipuan dan eksploitasi di media sosial"} },
  { title:"Responsible Conduct", category:"Campaign design / Art direction", year:"2026", image:"/work/design-responsible-conduct.jpg", alt:"Poster design promoting responsible behaviour and avoiding alcohol", description:{en:"Campaign promoting responsible conduct and avoiding alcohol",id:"Kampanye perilaku bertanggung jawab dan menghindari alkohol"} },
  { title:"Fluent English", category:"Education campaign / Poster design", year:"2026", image:"/work/design-fluent-english.jpg", alt:"Promotional poster design for Fluent English language courses", description:{en:"Poster series for an English language course",id:"Seri poster untuk kursus bahasa Inggris"} },
  { title:"Down Under Brew", category:"Editorial infographic / Information design", year:"2026", image:"/work/design-down-under-brew.jpg", alt:"Editorial infographic design about Australian coffee production", description:{en:"Editorial infographic on Australian coffee production",id:"Infografis editorial tentang produksi kopi Australia"} },
];

// Video TikTok
export const tiktokReviews = [
  { title:"Fantech Groove ANC", platform:"TikTok", id:"7667530077298576660", link:"https://www.tiktok.com/@khinccofficial/video/7667530077298576660", thumb:"/work/tiktok-7667530077298576660.jpg", desc:"Device review / Short-form editing", alt:"TikTok thumbnail for Fantech Grove ANC review" },
  { title:"Fantech Tanto Mouse", platform:"TikTok", id:"7665426475558046997", link:"https://www.tiktok.com/@khinccofficial/video/7665426475558046997", thumb:"/work/tiktok-7665426475558046997.jpg", desc:"Device review / Product editing", alt:"TikTok thumbnail for Fantech Tanto mouse review" },
  { title:"Plug and Play Microphone", platform:"TikTok", id:"7644066982530436372", link:"https://www.tiktok.com/@khinccofficial/video/7644066982530436372", thumb:"/work/tiktok-7644066982530436372.jpg", desc:"Device review / Product editing", alt:"TikTok thumbnail for plug and play microphone review" },
  { title:"OBS Filter Setup", platform:"TikTok", id:"7631625360802712853", link:"https://www.tiktok.com/@khinccofficial/video/7631625360802712853", thumb:"/work/tiktok-7631625360802712853.jpg", desc:"Streaming tutorial / Editing", alt:"TikTok thumbnail for OBS filter setup tutorial" },
];

// Video YouTube. `about` = keterangan dua bahasa, `title` = judul asli di YouTube
export const youtubePortfolio = [
  { title:'Short Movie "Scammer" HUT Bhayangkara RI 2023', type:"Film pendek", id:"KrK69_zt3RM", about:{en:"Short film for the 2023 Indonesian National Police anniversary",id:"Film pendek untuk HUT Bhayangkara RI 2023"}, link:"https://www.youtube.com/watch?v=KrK69_zt3RM", thumb:"https://i.ytimg.com/vi/KrK69_zt3RM/hqdefault.jpg" },
  { title:"PEMBARETAN SMK NEGERI 2 SANGATTA URATA 2024", type:"Dokumenter", id:"WXcYyiH0XIU", about:{en:"Documentary of the 2024 beret ceremony at SMK Negeri 2 Sangatta",id:"Dokumentasi pembaretan SMK Negeri 2 Sangatta 2024"}, link:"https://www.youtube.com/watch?v=WXcYyiH0XIU", thumb:"https://i.ytimg.com/vi/WXcYyiH0XIU/hqdefault.jpg" },
  { title:"SUS BINTALSIK PT. KPC", type:"Dokumenter", id:"xndoErqA96Y", about:{en:"Documentary of a mental & physical training course for PT KPC",id:"Dokumenter kursus pembinaan mental & fisik PT KPC"}, link:"https://www.youtube.com/watch?v=xndoErqA96Y", thumb:"https://i.ytimg.com/vi/xndoErqA96Y/hqdefault.jpg" },
  { title:"WEBCAM MURAH TAPI KEREN!", type:"Review perangkat", id:"N7fxwxRU23g", about:{en:"Budget webcam review",id:"Review webcam murah"}, link:"https://www.youtube.com/watch?v=N7fxwxRU23g", thumb:"https://i.ytimg.com/vi/N7fxwxRU23g/hqdefault.jpg" },
  { title:"Webcam Eyd 2k Nih guys", type:"Review perangkat", id:"ua-SsfsolFQ", about:{en:"2K webcam review",id:"Review webcam 2K"}, link:"https://www.youtube.com/watch?v=ua-SsfsolFQ", thumb:"https://i.ytimg.com/vi/ua-SsfsolFQ/hqdefault.jpg" },
  { title:"Fantech Groove ANC", type:"Review perangkat", id:"AN3x89Lz0EI", about:{en:"Fantech Groove ANC earbuds review",id:"Review earbuds Fantech Groove ANC"}, link:"https://www.youtube.com/watch?v=AN3x89Lz0EI", thumb:"https://i.ytimg.com/vi/AN3x89Lz0EI/hqdefault.jpg" },
  { title:"Gamepad harga pelajar tapi speknya merusak pasar", type:"Review perangkat", id:"B4l6aEvbMhg", about:{en:"Budget gamepad review",id:"Review gamepad harga pelajar"}, link:"https://www.youtube.com/watch?v=B4l6aEvbMhg", thumb:"https://i.ytimg.com/vi/B4l6aEvbMhg/hqdefault.jpg" },
  { title:"Rekomendasi IEM buat gaming", type:"Review perangkat", id:"eRDN0xjid0w", about:{en:"IEM picks for gaming",id:"Rekomendasi IEM untuk gaming"}, link:"https://www.youtube.com/watch?v=eRDN0xjid0w", thumb:"https://i.ytimg.com/vi/eRDN0xjid0w/hqdefault.jpg" },
  { title:'Lighting "Value for Money" Terbaik!', type:"Review perangkat", id:"hGFK8njoAhY", about:{en:"Best value-for-money lighting for creators",id:"Lighting paling worth it untuk kreator"}, link:"https://www.youtube.com/watch?v=hGFK8njoAhY", thumb:"https://i.ytimg.com/vi/hGFK8njoAhY/hqdefault.jpg" },
  { title:"HDMI CAPTURE CARD", type:"Review perangkat", id:"76VSMpFZWS0", about:{en:"HDMI capture card review",id:"Review HDMI capture card"}, link:"https://www.youtube.com/watch?v=76VSMpFZWS0", thumb:"https://i.ytimg.com/vi/76VSMpFZWS0/hqdefault.jpg" },
];

// Bagian "Services" di beranda (4 layanan)
export const capabilities = [
  { index:"01", title:{en:"Campaign & poster design",id:"Desain kampanye & poster"}, desc:{en:"Public-information campaigns, poster series, and key visuals for institutions and brands.",id:"Kampanye informasi publik, seri poster, dan key visual untuk instansi dan brand."}, tags:{en:"Art direction / Print",id:"Art direction / Cetak"} },
  { index:"02", title:{en:"Editorial & infographic",id:"Editorial & infografis"}, desc:{en:"Information design that turns dense material into something easy to read and share.",id:"Desain informasi yang mengubah materi padat jadi mudah dibaca dan dibagikan."}, tags:{en:"Layout / Data",id:"Layout / Data"} },
  { index:"03", title:{en:"Short-form video editing",id:"Editing video pendek"}, desc:{en:"Reels, TikToks, and review edits with pacing and sound built for the feed.",id:"Reels, TikTok, dan video review dengan ritme dan audio yang pas untuk feed."}, tags:{en:"Motion / Sound",id:"Motion / Audio"} },
  { index:"04", title:{en:"Social content systems",id:"Sistem konten sosial"}, desc:{en:"Repeatable visual templates so every post still feels considered and on-brand.",id:"Template visual yang bisa dipakai ulang agar setiap posting tetap rapi dan sesuai brand."}, tags:{en:"Systems / Templates",id:"Sistem / Template"} },
];

// Teks berjalan (ticker) di bawah foto besar beranda
export const marqueeItems = [
  {en:"Campaign design",id:"Desain kampanye"},{en:"Editorial & infographic",id:"Editorial & infografis"},{en:"Short-form video",id:"Video pendek"},
  {en:"Social content",id:"Konten sosial"},{en:"Art direction",id:"Art direction"},{en:"Motion graphics",id:"Motion graphics"},
];

// Kontak dan akun media sosial (dipakai di beranda, footer, dan SEO)
export const contactInfo = {
  email:"master@khincreator.com",
  instagram:"@khinccofficial",
  tiktok:"@khinccofficial",
  youtube:"@khinccofficial",
  links:{
    instagram:"https://www.instagram.com/khinccofficial/",
    tiktok:"https://www.tiktok.com/@khinccofficial",
    youtube:"https://www.youtube.com/@khinccofficial",
    email:"mailto:master@khincreator.com"
  }
};

// Judul & deskripsi rapi untuk tiap reel, menggantikan catatan internal singkat di portfolioSeed.
// group menentukan tombol filter di beranda: audio, streaming, atau gaming
export type ReelGroup = 'audio' | 'streaming' | 'gaming'
export const reelDetails: Record<string, { group: ReelGroup; desc: { en: string; id: string }; title?: string }> = {
  DVQrHReEkg3: { group:"audio", desc:{ en:"Gaming IEM review with a hook-first edit for Reels", id:"Review IEM gaming dengan editing hook-first untuk Reels" } },
  "DVw6WtMk8-8": { group:"audio", desc:{ en:"Budget earphone review told as a short story", id:"Review earphone budget yang dikemas sebagai cerita singkat" } },
  DbVXyg1JH2J: { group:"audio", desc:{ en:"One Piece edition earbuds for Fantech — ANC demo", id:"Earbuds edisi One Piece dari Fantech — demo ANC" } },
  DbILo_CJg0i: { group:"gaming", desc:{ en:"A triple-mode wireless mouse explained in under a minute", id:"Mouse wireless tiga mode dijelaskan dalam kurang dari semenit" } },
  "DVRlxm-EzEw": { group:"audio", title:"Secondwave × KZ Follow-up", desc:{ en:"Follow-up audio review for Secondwave and KZ", id:"Review audio lanjutan untuk Secondwave dan KZ" } },
  DYhtuV0PbHu: { group:"streaming", desc:{ en:"My own streaming setup built from affordable gear", id:"Setup streaming pribadi dari gear terjangkau" } },
  DVXWNrekt6i: { group:"audio", desc:{ en:"Starter guide for KZ Castor IEMs with a TikTok Shop call-to-action", id:"Panduan pemula KZ Castor dengan ajakan belanja di TikTok Shop" } },
  DYyi95pSL3u: { group:"streaming", desc:{ en:"Tutorial: taming a dynamic mic with filters and a limiter", id:"Tutorial: mengatur mic dinamis dengan filter dan limiter" } },
  DYjRUUEpzw8: { group:"streaming", desc:{ en:"Mic technique tips for streamers", id:"Tips teknik mic untuk streamer" } },
  DZw_Sc5JGAP: { group:"streaming", title:"Budget Setup Under Rp500k", desc:{ en:"A complete streaming setup for under Rp500k", id:"Setup streaming lengkap di bawah Rp500 ribu" } },
  DW1qrfEvgvS: { group:"streaming", desc:{ en:"RGB tube light review focused on picture quality", id:"Review lampu tube RGB dengan fokus kualitas gambar" } },
  "DbJc1-5TAwx": { group:"audio", desc:{ en:"Luffy edition earbuds from the Fantech × One Piece series", id:"Earbuds edisi Luffy dari seri Fantech × One Piece" } },
  DWKG07fzceT: { group:"streaming", desc:{ en:"2K webcam test for streaming", id:"Uji webcam 2K untuk streaming" } },
  DVEGq4SEshJ: { group:"gaming", desc:{ en:"Promo edit for the WGP-13S gamepad with urgency-led copy", id:"Video promo gamepad WGP-13S dengan copy yang mendorong beli sekarang" } },
}

// Proyek web & front-end. links[0] jadi link utama, sisanya link tambahan
export const webProjects = [
  {
    id:"codequest",
    title:"CodeQuest — Small Studio",
    image:"/work/codequest.jpg",
    alt:{ en:"CodeQuest game scene: a cozy studio desk with a laptop showing code, a cat asleep by the lamp", id:"Adegan game CodeQuest: meja studio dengan laptop berisi kode dan kucing tidur di dekat lampu" },
    desc:{ en:"A browser game that teaches HTML, CSS and JavaScript through real client briefs. It runs your code and checks the website you built — no quizzes.", id:"Game browser untuk belajar HTML, CSS, dan JavaScript lewat brief klien sungguhan. Game menjalankan kodemu dan memeriksa website yang kamu buat — tanpa kuis." },
    stack:"HTML · CSS · JavaScript",
    links:[
      { label:"Play", href:"https://main.codequest.gamer.free/" },
      { label:"itch.io", href:"https://khincc.itch.io/codequest-small-studio" },
      { label:"GitHub", href:"https://github.com/khincc00/CodeQuest" },
    ],
  },
  {
    id:"khincreator",
    title:"khincreator.com",
    image:"/work/khincreator.jpg",
    alt:{ en:"Homepage of khincreator.com in day mode", id:"Beranda khincreator.com dalam mode siang" },
    desc:{ en:"This portfolio: bilingual EN/ID, day/night mode, a news CMS with comments and reactions, and SEO — designed and built by me.", id:"Portofolio ini: dua bahasa EN/ID, mode siang/malam, CMS berita dengan komentar dan reaksi, serta SEO — didesain dan dibangun sendiri." },
    stack:"Next.js · TypeScript · Supabase",
    links:[
      { label:"Live", href:"https://khincreator.com" },
      { label:"GitHub", href:"https://github.com/khincc00/PORTFOLIO-FIX-DEPLOY" },
    ],
  },
]

// Lokasi file CV (ada di folder public/cv), dipakai tombol "Download CV"
export const cvUrl = "/cv/Taufiq-Sholikhin-CV.pdf"

// Riwayat kerja untuk bagian Experience, diambil dari CV (Taufiq_Sholikhin_CV_Designer_FrontEnd.pdf)
export const experience = [
  {
    period:{ en:"Aug 2021 – Aug 2026", id:"Agu 2021 – Agu 2026" },
    role:{ en:"Graphic Designer & Video Creator", id:"Desainer Grafis & Video Creator" },
    org:{ en:"Pangkalan TNI AL Sangatta (Indonesian Navy Base) · Sangatta", id:"Pangkalan TNI AL Sangatta · Sangatta" },
    points:[
      { en:"Produced 50+ graphic and video assets for official communications and events of the naval base command.", id:"Memproduksi 50+ aset grafis dan video untuk komunikasi resmi dan acara komando pangkalan." },
      { en:"Designed public-information poster campaigns on online loan scams, social media fraud, and responsible conduct — built to be understood at a glance on mobile.", id:"Mendesain kampanye poster informasi publik tentang penipuan pinjol, penipuan media sosial, dan perilaku bertanggung jawab — dibuat agar langsung dipahami di layar HP." },
      { en:"Owned the full pipeline, from concept and shooting to design, editing, and delivery.", id:"Menangani seluruh alur kerja, dari konsep dan pengambilan gambar hingga desain, editing, dan pengiriman." },
    ],
  },
  {
    period:{ en:"2019 – Present", id:"2019 – Sekarang" },
    role:{ en:"Freelance Graphic Designer, Video Editor & Web Designer", id:"Freelance Desainer Grafis, Video Editor & Web Designer" },
    org:{ en:"KHINCC Studio · Remote", id:"KHINCC Studio · Remote" },
    points:[
      { en:"Logos, posters, and marketing materials for small businesses, including the Fluent English poster series and an A3 infographic and A5 flyer for Down Under Brew.", id:"Logo, poster, dan materi pemasaran untuk usaha kecil, termasuk seri poster Fluent English serta infografis A3 dan flyer A5 untuk Down Under Brew." },
      { en:"Designed and built Meridian Residences, a multilingual property website template with booking and live chat.", id:"Mendesain dan membangun Meridian Residences, template website properti multibahasa dengan booking dan live chat." },
      { en:"Edited 14+ short-form product videos for Fantech, Secondwave, KZ, and Photoolex, plus documentaries and event films for PT KPC and SMK Negeri 2 Sangatta.", id:"Mengedit 14+ video produk format pendek untuk Fantech, Secondwave, KZ, dan Photoolex, serta dokumenter dan film acara untuk PT KPC dan SMK Negeri 2 Sangatta." },
    ],
  },
  {
    period:{ en:"Oct 2020 – Jan 2021", id:"Okt 2020 – Jan 2021" },
    role:{ en:"Book Cover Designer", id:"Desainer Sampul Buku" },
    org:{ en:"Prabu21 Book Publisher · Malang", id:"Penerbit Prabu21 · Malang" },
    points:[
      { en:"Designed cover artwork for published titles, working directly with authors and editors on concepts and revisions.", id:"Mendesain sampul untuk buku terbitan, bekerja langsung dengan penulis dan editor dari konsep hingga revisi." },
    ],
  },
  {
    period:{ en:"2020", id:"2020" },
    role:{ en:"Speaker — “Designing for the Future”", id:"Pembicara — “Designing for the Future”" },
    org:{ en:"PMII Student Association · Unitri Malang", id:"PMII · Unitri Malang" },
    points:[],
  },
]
