/**
 * Negara pengunjung untuk notifikasi saran bahasa (src/components/layout/LanguageSuggestion.jsx). Vercel mengirim
 * header x-vercel-ip-country (kode ISO 3166-1, mis. "TH") ke setiap Vercel Function, tanpa layanan pihak ketiga
 * (https://vercel.com/docs/headers/request-headers). Hanya kode negara yang dikembalikan; IP tidak disimpan. Saat
 * development lokal header ini tidak ada, jadi hasilnya null.
 */
export function GET(request) {
  const country = request.headers.get('x-vercel-ip-country')
  return Response.json({ country: country || null }, { headers: { 'Cache-Control': 'private, no-store' } })
}
