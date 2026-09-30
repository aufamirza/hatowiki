# Review teks Inggris: burung

Teks tampilan versi Inggris (/en) untuk 89 burung, dibuat `scripts/english-descriptions.mjs` dari teks asli
heartodex (`descriptionOriginal`). Yang diubah hanya salah ketik yang jelas berasal dari sumber; `descriptionOriginal` di
file data tetap apa adanya. Daftar pembetulannya ada di `scripts/translations/english-corrections.json`.

- Pembetulan: 15 di 12 entri (y→g: 7, kapital: 3, tanda pisah: 4, OCR: 1).
- Tidak ada teks di sumber (14 entri): Baikal Teal, Inca Tern, Chestnut-Cheeked Starling, Blue-Headed Quail-Dove, White Peafowl, Snowy Owl, Red-Browed Finch, Atlantic Puffin, Blue-Footed Booby, Whooper Swan, Black Swan, Black Peafowl, Black Stork, Spectacled Owl.
- Entri lain memakai teks sumber tanpa perubahan, jadi tidak dicantumkan di tabel.

## Pembetulan salah ketik

| Entri | Teks di sumber | Teks tampilan (EN) | Pembetulan |
| --- | --- | --- | --- |
| Eurasian Wren (`eurasian-wren`) | In many folklore and fairg tales, it triumphs over eagles with its cleverness. | In many folklore and fairy tales, it triumphs over eagles with its cleverness. | "fairg" → "fairy" (y→g) |
| Long-Tailed Tit (`long-tailed-tit`) | It's like a little round fluffy ball whose chirpy personalitg perfectly complements the quiet Blanc. | It's like a little round fluffy ball whose chirpy personality perfectly complements the quiet Blanc. | "personalitg" → "personality" (y→g) |
| Eurasian Wigeon (`eurasian-wigeon`) | With its reddish-brown head and bright white forehead, it stands out in ang crowd. | With its reddish-brown head and bright white forehead, it stands out in any crowd. | "ang crowd" → "any crowd" (y→g) |
| Audouin’s Gull (`audouins-gull`) | It's a verg picky little bird that only eats fresh sea fish caught by itself. | It's a very picky little bird that only eats fresh sea fish caught by itself. | "verg" → "very" (y→g) |
| Przevalski's Parrotbill (`przevalskis-parrotbill`) | Its modest grag-white head contrasts sharply with the vivid reddish-brown feathers on its back, hinting at a mgsterious personality. | Its modest gray-white head contrasts sharply with the vivid reddish-brown feathers on its back, hinting at a mysterious personality. | "grag-white" → "gray-white" (y→g); "mgsterious" → "mysterious" (y→g) |
| Hawfinch (`hawfinch`) | Its beak shines with a Unique metallic sheen, small yet sharp. | Its beak shines with a unique metallic sheen, small yet sharp. | "a Unique" → "a unique" (kapital) |
| Blue Hoopoe (`blue-hoopoe`) | Its blue feathers give it a cool, distant air-like a lone ranger perched on a branch. | Its blue feathers give it a cool, distant air—like a lone ranger perched on a branch. | "distant air-like" → "distant air—like" (tanda pisah) |
| Orange Hoopoe (`orange-hoopoe`) | Its bright orange crest is like a blooming crown-hard to miss. And they say if you show a hoopoe info card to a certain nature magazine, you'll get an auto-reply that just says "It's a hoopoe." | Its bright orange crest is like a blooming crown—hard to miss. And they say if you show a hoopoe info card to a certain nature magazine, you'll get an auto-reply that just says "It's a hoopoe." | "blooming crown-hard" → "blooming crown—hard" (tanda pisah) |
| Red Hoopoe (`red-hoopoe`) | Its red crest blazes like a flame-bold and striking, as if it's about to drop some profound wisdom. | Its red crest blazes like a flame—bold and striking, as if it's about to drop some profound wisdom. | "like a flame-bold" → "like a flame—bold" (tanda pisah) |
| Grey-mantled Albatross (`grey-mantled-albatross`) | Its feathers look like an ink painting-but the thin line near its black beak is the real masterpiece. | Its feathers look like an ink painting—but the thin line near its black beak is the real masterpiece. | "ink painting-but" → "ink painting—but" (tanda pisah) |
| Pink Brick Sparrow (`pink-brick-sparrow`) | Most Pink birds aren't born with their rosy feathers, and the same goes for this Pink brick sparrow. | Most pink birds aren't born with their rosy feathers, and the same goes for this pink brick sparrow. | "Most Pink birds" → "Most pink birds" (kapital); "this Pink brick sparrow" → "this pink brick sparrow" (kapital) |
| Gray Suit Dove (`gray-suit-dove`) | A Suit Dove in a gray suit, drifting like a Iost passerbg down gray streets. | A Suit Dove in a gray suit, drifting like a lost passerby down gray streets. | "Iost" → "lost" (OCR); "passerbg" → "passerby" (y→g) |

Jenis pembetulan:

- **y→g**: huruf y terbaca g (pola salah ketik/OCR di sumber)
- **kapital**: huruf besar di tengah kalimat pada kata biasa (S, U, P, W: bentuk huruf besar dan kecilnya sama)
- **tanda pisah**: tanda hubung tanpa spasi yang seharusnya tanda pisah (—), seperti entri lain di sumber
- **OCR**: huruf atau angka lain yang salah terbaca
