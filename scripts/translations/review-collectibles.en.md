# Review teks Inggris: bahan alam (collectibles)

Teks tampilan versi Inggris (/en) untuk 40 bahan alam (collectibles), dibuat `scripts/english-descriptions.mjs` dari teks asli
heartodex (`descriptionOriginal`). Yang diubah hanya salah ketik yang jelas berasal dari sumber; `descriptionOriginal` di
file data tetap apa adanya. Daftar pembetulannya ada di `scripts/translations/english-corrections.json`.

- Pembetulan: 10 di 8 entri (kapital: 1, OCR: 2, y→g: 6, tanda baca: 1).
- Entri lain memakai teks sumber tanpa perubahan, jadi tidak dicantumkan di tabel.

## Pembetulan salah ketik

| Entri | Teks di sumber | Teks tampilan (EN) | Pembetulan |
| --- | --- | --- | --- |
| Flawless Fluorite (`flawless-fluorite`) | A rare ore, often Used by Moabit's little moles for disguise. | A rare ore, often used by Moabit's little moles for disguise. | "often Used" → "often used" (kapital) |
| Timber (`timber`) | A common tupe of timber, gathered from trees near homes. | A common type of timber, gathered from trees near homes. | "tupe" → "type" (OCR) |
| Branch (`branch`) | A verg common material that can be gathered from bushes. | A very common material that can be gathered from bushes. | "verg" → "very" (y→g) |
| Bizarre Oyster Mushroom Purple (`bizarre-oyster-mushroom-purple`) | Stag away from this purple bizarre oyster mushroom. Do not eat!!! | Stay away from this purple bizarre oyster mushroom. Do not eat!!! | "Stag away" → "Stay away" (y→g) |
| Bizarre Oyster Mushroom Orange (`bizarre-oyster-mushroom-orange`) | Stag away from this orange bizarre oyster mushroom. Do not eat!!! | Stay away from this orange bizarre oyster mushroom. Do not eat!!! | "Stag away" → "Stay away" (y→g) |
| Bizarre Oyster Mushroom Pink (`bizarre-oyster-mushroom-pink`) | Stag away from this pink bizarre oyster mushroom. Do not eat!!! | Stay away from this pink bizarre oyster mushroom. Do not eat!!! | "Stag away" → "Stay away" (y→g) |
| Tall Mustard (`tall-mustard`) | Unrelated to garlic. get it carries the pungent, spicg kick of both garlic and mustard greens. | Unrelated to garlic, yet it carries the pungent, spicy kick of both garlic and mustard greens. | "garlic. get" → "garlic, get" (tanda baca); "get it carries" → "yet it carries" (y→g); "spicg" → "spicy" (y→g) |
| Fiddlehead (`fiddlehead`) | The "King of Wild Greens.'i Blanching in boiling water before cooking removes harmful substances. | The "King of Wild Greens." Blanching in boiling water before cooking removes harmful substances. | "Wild Greens.'i Blanching" → "Wild Greens." Blanching" (OCR) |

Jenis pembetulan:

- **kapital**: huruf besar di tengah kalimat pada kata biasa (S, U, P, W: bentuk huruf besar dan kecilnya sama)
- **OCR**: huruf atau angka lain yang salah terbaca
- **y→g**: huruf y terbaca g (pola salah ketik/OCR di sumber)
- **tanda baca**: tanda baca lain yang salah
