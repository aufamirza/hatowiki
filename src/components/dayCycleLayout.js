/**
 * Menempatkan label di satu sumbu (pita siklus hari) supaya tidak saling menutupi.
 * Tiap label ingin berpusat di `target`-nya. Label yang bertabrakan digabung jadi satu blok berjarak `gap`, dan blok itu
 * diletakkan sedekat mungkin dengan target anggotanya (rata-rata), lalu dijaga tetap di dalam [0, length]. Urutan label
 * selalu sama dengan urutan target, jadi garis penghubung ke penanda tidak pernah bersilangan.
 *
 * items: [{ target, size }] (px) → posisi tengah tiap label, urutannya sama dengan `items`.
 */
export function spreadLabels(items, length, gap) {
  const order = items.map((item, index) => ({ ...item, index })).sort((a, b) => a.target - b.target || a.index - b.index)

  const place = (members) => {
    let offset = 0
    let sum = 0
    for (const member of members) {
      sum += member.target - offset - member.size / 2
      offset += member.size + gap
    }
    const size = offset - gap
    const start = Math.min(Math.max(sum / members.length, 0), Math.max(length - size, 0))
    return { members, size, start }
  }

  const blocks = []
  for (const item of order) {
    let block = place([item])
    while (blocks.length) {
      const previous = blocks.at(-1)
      if (previous.start + previous.size + gap <= block.start + 0.01) break
      blocks.pop()
      block = place([...previous.members, ...block.members])
    }
    blocks.push(block)
  }

  const centers = new Array(items.length)
  for (const block of blocks) {
    let offset = block.start
    for (const member of block.members) {
      centers[member.index] = offset + member.size / 2
      offset += member.size + gap
    }
  }
  return centers
}
