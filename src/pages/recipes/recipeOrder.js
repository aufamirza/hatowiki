const byName = (a, b) => a.name.localeCompare(b.name, 'en', { ignorePunctuation: true })
const levelOf = (recipe) => recipe.level ?? Infinity
const manualOf = (recipe) => recipe.familyOrder ?? Infinity

/**
 * Urutan Default /recipes: resep satu jenis masakan (field `family`, lihat src/data/recipes/families.js) selalu
 * berdampingan. Kelompok hanya berlaku di dalam satu section (resep Base Game & event tidak pernah sekelompok; halaman
 * daftar mengurutkan tiap section sendiri-sendiri). Kelompok berurutan menurut level terendah anggotanya (seri: nama anggota pertama A–Z). Di dalam
 * kelompok, versi dasar (`familyBase`) paling depan, lalu urutan manual (`familyOrder`, mis. Roll Cake mengikuti
 * warna pelangi), lalu sisanya urut level dan A–Z. Jadi Exquisite Afternoon Tea (Lv. 12) tampil tepat setelah
 * Afternoon Tea (Lv. 7), dan Apple Pie (Lv. 5) bersama pie lain di bagian level 1.
 * @param {object[]} recipes semua resep
 * @returns {Map<string, number>} slug → posisi di urutan default
 */
export function buildRecipeOrder(recipes) {
  const families = new Map()
  for (const recipe of recipes) {
    const key = `${recipe.section}::${recipe.family ?? recipe.slug}`
    if (!families.has(key)) families.set(key, [])
    families.get(key).push(recipe)
  }
  const groups = [...families.values()].map((members) => {
    const sorted = [...members].sort(
      (a, b) =>
        Number(Boolean(b.familyBase)) - Number(Boolean(a.familyBase)) ||
        manualOf(a) - manualOf(b) ||
        levelOf(a) - levelOf(b) ||
        byName(a, b),
    )
    return { members: sorted, minLevel: Math.min(...members.map(levelOf)) }
  })
  groups.sort((a, b) => a.minLevel - b.minLevel || byName(a.members[0], b.members[0]))
  return new Map(groups.flatMap((group) => group.members).map((recipe, position) => [recipe.slug, position]))
}
