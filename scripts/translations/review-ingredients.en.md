# Review teks Inggris: bahan masak (ingredients)

Teks tampilan versi Inggris (/en) untuk 32 bahan masak (ingredients), dibuat `scripts/english-descriptions.mjs` dari teks asli
heartodex (`descriptionOriginal`). Yang diubah hanya salah ketik yang jelas berasal dari sumber; `descriptionOriginal` di
file data tetap apa adanya. Daftar pembetulannya ada di `scripts/translations/english-corrections.json`.

- Pembetulan: 3 di 3 entri (tanda pisah: 2, kapital: 1).
- Entri lain memakai teks sumber tanpa perubahan, jadi tidak dicantumkan di tabel.

## Pembetulan salah ketik

| Entri | Teks di sumber | Teks tampilan (EN) | Pembetulan |
| --- | --- | --- | --- |
| Ace Beef (`ace-beef`) | 100% pure beef-real ingredients, real satisfaction. | 100% pure beef—real ingredients, real satisfaction. | "pure beef-real" → "pure beef—real" (tanda pisah) |
| Fruitwood Charcoal (`fruitwood-charcoal`) | With its natural fragrant notes, it lifts the flavor of grilled meat, cuts through any gamey taste, and adds a rich smoky depth-quality that doesn't break the bank. | With its natural fragrant notes, it lifts the flavor of grilled meat, cuts through any gamey taste, and adds a rich smoky depth—quality that doesn't break the bank. | "smoky depth-quality" → "smoky depth—quality" (tanda pisah) |
| Brick Meat Patty (`brick-meat-patty`) | If you drop a light shiitake and a hefty penny bun from the top of the brick patty tower at the same time, which one Will hit the ground first? | If you drop a light shiitake and a hefty penny bun from the top of the brick patty tower at the same time, which one will hit the ground first? | "one Will hit" → "one will hit" (kapital) |

Jenis pembetulan:

- **tanda pisah**: tanda hubung tanpa spasi yang seharusnya tanda pisah (—), seperti entri lain di sumber
- **kapital**: huruf besar di tengah kalimat pada kata biasa (S, U, P, W: bentuk huruf besar dan kecilnya sama)
