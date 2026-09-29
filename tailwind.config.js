/**
 * tailwind.config.js
 * Pengaturan Tailwind CSS. Tailwind dipakai terutama di halaman ADMIN
 * (class seperti "rounded-lg px-3 text-sm"). Halaman publik memakai CSS sendiri di app/globals.css.
 */
module.exports = {
  // Folder yang dipindai untuk mencari class Tailwind yang dipakai
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}", "./lib/**/*.{js,ts}"],
  // Warna tambahan yang bisa dipakai sebagai class, contoh text-muted atau bg-paper
  theme: { extend: { colors: { paper: "#FBFBFD", ink: "#1D1D1F", muted: "#86868B", line: "#E8E8ED" } } },
  plugins: [],
}