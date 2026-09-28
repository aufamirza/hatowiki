/**
 * Kelompok jenis masakan resep (field `family` di recipes.js), supaya versi-versi satu masakan selalu berdampingan
 * di /recipes. Ini pengelompokan tampilan, bukan data game, jadi tidak butuh sumber.
 *
 * Nilai `family` di recipes.js adalah sumber kebenaran dan boleh diubah manual. Aturan di bawah hanya dipakai
 * scripts/heartodex-sync.mjs untuk mengusulkan kelompok resep baru:
 * - Jenis masakan = akhiran nama (kata utuh); akhiran yang lebih panjang didahulukan, jadi "Matcha Green Milk Tea"
 *   masuk Milk Tea (bukan Tea), "Violet Roll Cake" masuk Roll Cake (bukan Cake), "Exquisite Afternoon Tea" masuk
 *   Afternoon Tea.
 * - Beberapa kelompok memakai awalan karena jenisnya di depan nama: Grilled … (jamur bakar), Coffee …, dan
 *   Bizarre/Bizzare … (hasil masak gagal).
 * - Kalau akhiran dan awalan sama-sama cocok, pola dengan kata terbanyak menang; kalau sama panjang, awalan menang.
 *   Jadi "Grilled Squid w/ Apple Jam" masuk Grilled Squid (bukan Jam) dan "Springday Apple Black Tea" masuk
 *   Springday Black Tea (bukan Tea). Resep Base Game tidak terpengaruh (tidak ada yang cocok dengan keduanya).
 * - Resep yang tidak cocok dengan aturan mana pun jadi kelompoknya sendiri (family = slug-nya).
 * - Kelompok hanya berlaku di dalam satu section, jadi aturan yang sama (mis. Soup, Juice) membentuk kelompok terpisah
 *   di Base Game dan di tiap event.
 *
 * `familyBase: true` di recipes.js menandai versi dasar kelompok (mis. Mushroom Pie; Mixed Jam dan Grilled Mushrooms
 * karena bahannya pilihan bebas), yang tampil paling depan. `familyOrder` (1, 2, …) memberi urutan manual di dalam
 * kelompok, mis. Roll Cake mengikuti warna pelangi; anggota lain urut level lalu abjad.
 *
 * Keputusan untuk kasus meragukan (bisa diubah di recipes.js):
 * - Cake: Grass Cake, Cheese Cake, dan Carrot Cake satu kelompok (akhiran sama; ketiganya kue).
 * - Coffee: Coffee Latte ikut Coffee (versi kopi susu), meskipun akhirannya Latte.
 * - Bizarre: Bizarre Food dan Bizzare Drink satu kelompok (keduanya hasil masak gagal).
 * - Sauce: Chocolate Sauce dan Tomato Sauce satu kelompok (akhiran sama), walau yang satu manis.
 * - Colorful Egg Feast dibiarkan sendiri (akhirannya Feast), walau bahannya telur warna-warni.
 * - Mellow Black Tea masuk Tea dan Mellow Milk Tea masuk Milk Tea (akhiran), bukan kelompok "Mellow".
 *
 * Resep event (kelompok di dalam section event masing-masing):
 * - Versi dasar (`familyBase`) = versi dengan bahan pilihan bebas atau versi polos, seperti di Base Game: Mooncake,
 *   Grilled Meat & Vegetables, Prickly Pear Fruit Juice, Prickly Pear Fish Soup, Seashell Pearl Cake, Grilled Squid
 *   w/ Fruit Jam, Fruit Verbena Pie, Brick Bowl Fruit Shaved Ice, Brick Mushroom Patty Burger, Springday Fruit Black Tea,
 *   Romaine Lettuce Taco, Original Frosted Pancake.
 * - Mooncake: tiap versi Large tampil tepat setelah versi kecilnya (bahan Large = versi kecil itu), lewat `familyOrder`.
 * - Celtuce Taco: Romaine Lettuce Taco ikut kelompok ini sebagai versi dasar (romaine lettuce = celtuce, dan semua
 *   Wild … Celtuce Taco dibuat dari Romaine Lettuce Taco).
 * - Springday Black Tea: "Springdag Raspberry Black Tea" (salah ketik di sumber, disimpan apa adanya) tetap ikut, lewat
 *   awalan Springdag.
 * - Iced-Cup: Iced-Cup Coffee dan iced-Cup Latte satu kelompok (seperti Coffee & Coffee Latte di Base Game).
 * - Popcorn Bucket (Caramel, Savory) terpisah dari ember kombo (Savory Double Combo Bucket, Sweet Duo Bucket), yang
 *   satu kelompok Bucket karena keduanya paket keripik + popcorn.
 * - Starfruit Jam sendiri (bukan Grilled Squid w/ … Jam), Tomato Seafood Soup dan Creamy White Radish Soup sendiri
 *   (satu-satunya sup di section-nya).
 * - Burger: Double Chicken Burger dan Septuple King Burger satu kelompok. Aturan ini juga cocok dengan Meat Burger (Base
 *   Game), yang di recipes.js tetap 'meat-burger'; ia satu-satunya burger di section-nya, jadi urutannya sama saja.
 */
export const RECIPE_FAMILY_RULES = [
  { family: 'afternoon-tea', label: 'Afternoon Tea', suffix: 'Afternoon Tea' },
  { family: 'roll-cake', label: 'Roll Cake', suffix: 'Roll Cake' },
  { family: 'king-crab', label: 'King Crab', suffix: 'King Crab' },
  { family: 'milk-tea', label: 'Milk Tea', suffix: 'Milk Tea' },
  { family: 'milkshake', label: 'Milkshake', suffix: 'Milkshake' },
  { family: 'sashimi', label: 'Sashimi', suffix: 'Sashimi' },
  { family: 'pasta', label: 'Pasta', suffix: 'Pasta' },
  { family: 'sauce', label: 'Sauce', suffix: 'Sauce' },
  { family: 'soup', label: 'Soup', suffix: 'Soup' },
  { family: 'cake', label: 'Cake', suffix: 'Cake' },
  { family: 'jam', label: 'Jam', suffix: 'Jam' },
  { family: 'pie', label: 'Pie', suffix: 'Pie' },
  { family: 'tea', label: 'Tea', suffix: 'Tea' },
  { family: 'egg', label: 'Egg', suffix: 'Egg' },
  // Resep event.
  { family: 'mooncake', label: 'Mooncake', suffix: 'Mooncake' },
  { family: 'patty-burger', label: 'Patty Burger', suffix: 'Patty Burger' },
  { family: 'burger', label: 'Burger', suffix: 'Burger' },
  { family: 'juice', label: 'Juice', suffix: 'Juice' },
  { family: 'pearl-cake', label: 'Pearl Cake', suffix: 'Pearl Cake' },
  { family: 'verbena-pie', label: 'Verbena Pie', suffix: 'Verbena Pie' },
  { family: 'shaved-ice', label: 'Shaved Ice', suffix: 'Shaved Ice' },
  { family: 'frosted-pancake', label: 'Frosted Pancake', suffix: 'Frosted Pancake' },
  { family: 'celtuce-taco', label: 'Celtuce Taco', suffix: 'Taco' },
  { family: 'zongzi', label: 'Zongzi', suffix: 'Zongzi' },
  { family: 'con-panna', label: 'Con Panna', suffix: 'Con Panna' },
  { family: 'canele', label: 'Canelé', suffix: 'Canelé' },
  { family: 'crepe', label: 'Crepe', suffix: 'Crepe' },
  { family: 'popcorn-bucket', label: 'Popcorn Bucket', suffix: 'Popcorn Bucket' },
  { family: 'bucket', label: 'Bucket (ember kombo)', suffix: 'Bucket' },
  { family: 'grilled', label: 'Grilled (jamur bakar)', prefix: ['Grilled'] },
  { family: 'coffee', label: 'Coffee', prefix: ['Coffee'] },
  { family: 'bizarre', label: 'Bizarre (masak gagal)', prefix: ['Bizarre', 'Bizzare'] },
  // Resep event.
  { family: 'grilled-meat', label: 'Grilled Meat', prefix: ['Grilled Meat'] },
  { family: 'grilled-squid', label: 'Grilled Squid w/ Jam', prefix: ['Grilled Squid'] },
  { family: 'springday-black-tea', label: 'Springday Black Tea', prefix: ['Springday', 'Springdag'] },
  { family: 'iced-cup', label: 'Iced-Cup', prefix: ['Iced-Cup'] },
]

const words = (text) => text.toLowerCase().split(/\s+/).filter(Boolean)
const endsWithWords = (name, suffix) => {
  const [a, b] = [words(name), words(suffix)]
  return a.length >= b.length && b.every((word, i) => a[a.length - b.length + i] === word)
}
const startsWithWords = (name, prefix) => {
  const [a, b] = [words(name), words(prefix)]
  return a.length >= b.length && b.every((word, i) => a[i] === word)
}

/** Usulan kelompok untuk resep bernama `name`; tanpa aturan yang cocok, kelompoknya slug resep itu sendiri. */
export function suggestRecipeFamily(name, slug) {
  // Semua pola yang cocok; menang: kata terbanyak, lalu awalan, lalu huruf terbanyak.
  const matches = RECIPE_FAMILY_RULES.flatMap((rule) =>
    rule.suffix
      ? endsWithWords(name, rule.suffix) ? [{ rule, pattern: rule.suffix, prefix: false }] : []
      : rule.prefix.filter((prefix) => startsWithWords(name, prefix)).map((prefix) => ({ rule, pattern: prefix, prefix: true })),
  )
  matches.sort(
    (a, b) =>
      words(b.pattern).length - words(a.pattern).length ||
      Number(b.prefix) - Number(a.prefix) ||
      b.pattern.length - a.pattern.length,
  )
  return matches[0]?.rule.family ?? slug
}
