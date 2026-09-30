# Review terjemahan: bahan masak (Ingredients)

32 bahan dari https://www.heartodex.com/en/ingredients (halaman daftar diperiksa 2026-09-29): 19 di section Base Game dan
13 di section event. Permintaan awal menyebut 27 bahan; halaman daftar kini juga memuat 5 bahan dari event yang masih
aktif di bagian paling atas (Osmanthus Jam — Autumn Moon Treasury; Ace Chicken & Ace Beef — Burger Bliss; Fruitwood
Charcoal & Concentrated Date Paste — Echo of Ancients). Kelimanya dipakai resep Hatowiki, jadi ikut ditambahkan supaya
semua bahan resep bisa diklik.

Kolom **Asli** disalin dari bagian About (`descriptionOriginal`), termasuk salah ketiknya. Kolom **Terjemahan** mengikuti
maksud asli; nama benda dan istilah game tetap bahasa Inggris.

- Harga beli (Buy Price) semuanya bilangan bulat. Harga jual (Sell Price) dan info asal ("Origin: …") tidak dicantumkan di
  halaman bahan mana pun, jadi `sellPrice: null` dan `origin: null` + TODO (harga jual tampil "—", baris asal tidak tampil).
- Tidak ada halaman bahan yang bertanda "Work in Progress" (halaman detail dari cache 2026-09-27/28; halaman Egg diambil
  ulang 2026-09-29 dan isinya sama persis).
- 8 bahan event di halaman sumbernya bertanda "Unavailable — Event ended"; status itu tidak disimpan.
- Bahan tidak punya level, lokasi, maupun peta.
- Gambar 32 bahan sudah ada sejak dipakai resep: dipindah dari `public/images/items/ingredients-<slug>.webp` ke
  `public/images/ingredients/<slug>.webp` (tidak diunduh ulang). `src/data/items.js` tidak lagi menyimpan bahan;
  benda `ingredients/<slug>` diturunkan dari `src/data/ingredients/ingredients.js`.
- Nama yang bentrok dengan katalog lain: hanya **Egg** (bahan `ingredients/egg` dan resep level 1 `recipes/egg`). Tautan
  mengikuti awalan id, jadi bahan → /ingredients/egg dan resep → /recipes/egg; di pencarian global keduanya tampil dengan
  label katalog berbeda (Bahan Masak / Resep).

| Section | Kategori | Bahan | Asli (EN) | Terjemahan (ID) | Angka — Catatan |
| --- | --- | --- | --- | --- | --- |
| Base Game | Common | Cooking Oil (`cooking-oil`) | Sunflower seed oil, high in vitamin E and fatty acids. | Minyak biji bunga matahari, kaya vitamin E dan asam lemak. | beli 100, jual —, asal — — JSON-LD diakhiri karakter baris baru, dibersihkan |
| Base Game | Common | Meat (`meat`) | Source of minerals, proteins, and vitamins. | Sumber mineral, protein, dan vitamin. | beli 200, jual —, asal — |
| Base Game | Common | Yellow Sugar (`yellow-sugar`) | It can be purchased at Doris's store. | Bisa dibeli di toko Doris. | beli 200, jual —, asal — |
| Base Game | Common | Indigo Sugar (`indigo-sugar`) | It can be purchased at Doris's store. | Bisa dibeli di toko Doris. | beli 150, jual —, asal — |
| Base Game | Common | Blue Sugar (`blue-sugar`) | It can be purchased at Doris's store. | Bisa dibeli di toko Doris. | beli 150, jual —, asal — |
| Base Game | Common | Violet Sugar (`violet-sugar`) | It can be purchased at Doris's store. | Bisa dibeli di toko Doris. | beli 150, jual —, asal — |
| Base Game | Common | Orange Sugar (`orange-sugar`) | It can be purchased at Doris's store. | Bisa dibeli di toko Doris. | beli 200, jual —, asal — |
| Base Game | Common | Red Sugar (`red-sugar`) | It can be purchased at Doris's store. | Bisa dibeli di toko Doris. | beli 200, jual —, asal — |
| Base Game | — (tidak ada) | Green Sugar (`green-sugar`) | It can be purchased at Doris's store. | Bisa dibeli di toko Doris. | beli 200, jual —, asal — — kategori tidak ada di sumber (halaman daftar & detail) → `category: null` + TODO; section Base Game |
| Base Game | Common | Red Bean (`red-bean`) | It won't ease the pain of longing like the legend says, but its sweet taste will definitely help release some dopamine. | Kacang merah memang tak bisa meredakan pedihnya rindu seperti kata legenda, tapi rasa manisnya pasti membantu melepas sedikit dopamin. | beli 50, jual —, asal — — rujukan legenda kacang merah sebagai lambang rindu; subjek "Kacang merah" ditulis supaya kalimat tidak diawali "Ia" |
| Base Game | Common | Coffee Beans (`coffee-beans`) | A plant's fruit used in coffee, with flavors that change by variety and roast. | Buah tanaman yang diolah menjadi kopi, dengan rasa yang berbeda-beda tergantung varietas dan tingkat sangrainya. | beli 50, jual —, asal — |
| Base Game | Common | Rice Flour (`rice-flour`) | Soft and smooth white fine powder, an important ingredient for making various foods. | Bubuk putih yang halus dan lembut, bahan penting untuk membuat berbagai makanan. | beli 50, jual —, asal — |
| Base Game | Common | Egg (`egg`) | Rich in high-quality protein and essential amino acids for humans. | Kaya protein berkualitas tinggi dan asam amino esensial yang dibutuhkan tubuh manusia. | beli 100, jual —, asal — |
| Base Game | Common | Pasteurized Egg (`pasteurized-egg`) | It undergoes strict sterilization, so its nutritional value matches that of a regular egg, making it perfect for onsen eggs. | Telur ini melewati sterilisasi yang ketat, jadi nilai gizinya setara dengan telur biasa dan pas untuk dibuat telur onsen. | beli 100, jual —, asal — — "onsen eggs" → "telur onsen" |
| Base Game | Common | Milk (`milk`) | One of the earliest dairy products ever discovered. Contains many essential nutrients required by the human body. | Salah satu produk susu paling awal yang pernah ditemukan. Mengandung banyak nutrisi penting yang dibutuhkan tubuh manusia. | beli 50, jual —, asal — |
| Base Game | Common | Butter (`butter`) | A brick of fat made from milk, rich in nutrients but fat is fat after all. Don't eat too much! | Sebongkah lemak dari susu, kaya nutrisi, tapi lemak tetaplah lemak. Jangan makan terlalu banyak! | beli 150, jual —, asal — |
| Base Game | Common | Matcha Powder (`matcha-powder`) | Ground by fresh tea leaves, rich in various trace elements and possessing antioxidant benefits. | Digiling dari daun teh segar, kaya berbagai unsur mikro dan bermanfaat sebagai antioksidan. | beli 250, jual —, asal — — "Ground by" di sumber kemungkinan maksudnya "Ground from"; diterjemahkan "Digiling dari" |
| Base Game | Common | Cheese (`cheese`) | A solid dairy product fermented from milk, rich in nutritional value. | Olahan susu padat hasil fermentasi susu, kaya nilai gizi. | beli 100, jual —, asal — |
| Base Game | Common | Tea Leaves (`tea-leaves`) | Carefully crafted from fresh tea leaves through a series of intricate processes to achieve its refined flavor. | Dibuat dengan cermat dari daun teh segar melalui serangkaian proses yang rumit hingga rasanya halus dan berkelas. | beli 250, jual —, asal — |
| Autumn Moon Treasury | Autumn Moon Treasury | Osmanthus Jam (`osmanthus-jam`) | As the osmanthus blooms fall in idle moments, we're busy making osmanthus jam. | Saat bunga osmanthus berguguran di kala senggang, kami sibuk membuat selai osmanthus. | beli 100, jual —, asal — |
| Burger Bliss | Burger Bliss | Ace Chicken (`ace-chicken`) | Premium chicken destined for fried fillet greatness. | Daging ayam premium yang ditakdirkan menjadi fillet goreng yang luar biasa. | beli 100, jual —, asal — |
| Burger Bliss | Burger Bliss | Ace Beef (`ace-beef`) | 100% pure beef-real ingredients, real satisfaction. | Daging sapi 100% murni: bahan asli, kepuasan sejati. | beli 200, jual —, asal — — sumber menulis "beef-real" (kemungkinan tanda pisah yang hilang); diterjemahkan dengan tanda pisah |
| Echo of Ancients | Echo of Ancients | Fruitwood Charcoal (`fruitwood-charcoal`) | With its natural fragrant notes, it lifts the flavor of grilled meat, cuts through any gamey taste, and adds a rich smoky depth-quality that doesn't break the bank. | Dengan aroma alaminya yang harum, arang ini menguatkan rasa daging panggang, menyamarkan bau prengus, dan menambahkan rasa asap yang kaya dan dalam. Berkualitas tanpa menguras kantong. | beli 50, jual —, asal — — JSON-LD terpotong, dipakai teks lengkap halaman; "depth-quality" di sumber dibaca sebagai tanda pisah; "gamey taste" → "bau prengus" |
| Echo of Ancients | Echo of Ancients | Concentrated Date Paste (`concentrated-date-paste`) | Rich and mellow, this natural sweetener is a favorite among dessert lovers. | Kaya rasa dan lembut, pemanis alami ini jadi favorit para pencinta hidangan penutup. | beli 50, jual —, asal — |
| Call of Whales | Call of Whales | Spirulina Powder (`spirulina-powder`) | Highly nutrient-dense natural blue pigment powder. | Bubuk pigmen biru alami yang sangat padat nutrisi. | beli 50, jual —, asal — |
| Midsummer Rhyme | Midsummer Rhyme | Bamboo Leaf (`bamboo-leaf`) | A broad, heat resistant plant leaf perfect for wrapping food as an eco friendly wrapper. | Daun lebar yang tahan panas, pas untuk membungkus makanan sebagai pembungkus yang ramah lingkungan. | beli 50, jual —, asal — |
| Modular Streets | Modular Streets | Brick Meat Patty (`brick-meat-patty`) | If you drop a light shiitake and a hefty penny bun from the top of the brick patty tower at the same time, which one Will hit the ground first? | Kalau shiitake yang ringan dan penny bun yang berat dijatuhkan bersamaan dari puncak menara patty balok, mana yang menyentuh tanah lebih dulu? | beli 50, jual —, asal — — "Will" berhuruf besar di tengah kalimat, disimpan apa adanya; shiitake & penny bun (nama benda game) tetap Inggris |
| Modular Streets | Modular Streets | Brick Ice (`brick-ice`) | These uniquely shaped brick ice can only be used to make shaved ice, but sadly not for building creative ice castles. What a pity. | Es balok berbentuk unik ini hanya bisa dipakai untuk membuat es serut, bukan untuk membangun istana es yang kreatif. Sungguh disayangkan. | beli 50, jual —, asal — — "Es balok" dipakai untuk brick ice, sejalan dengan "balok" untuk brick di terjemahan lain |
| Modular Streets | Modular Streets | Condensed Milk (`condensed-milk`) | Sweetened condensed milk—the "glue" that holds all kinds of desserts together. | Susu kental manis, "lem" yang menyatukan berbagai macam hidangan penutup. | beli 50, jual —, asal — — sumber berisi tanda kutip "glue"; JSON-LD sama dengan teks halaman |
| Dreamlight Cinematics | Dreamlight Cinematics | Springday Brown Sugar (`springday-brown-sugar`) | Raw sugar simmered with traditional craftsmanship, boasting a golden, translucent appearance and a well-balanced sweetness. | Gula mentah yang dimasak perlahan dengan cara tradisional, berwarna keemasan dan bening, dengan rasa manis yang seimbang. | beli 50, jual —, asal — |
| Dreamlight Cinematics | Dreamlight Cinematics | Salsa Sauce (`salsa-sauce`) | A classic, all-purpose condiment—salsa goes with everything. | Saus klasik serbaguna: salsa cocok dipadukan dengan apa saja. | beli 50, jual —, asal — |
| Winter frost season | Winter frost season | Frosted (`frosted`) | Icing sugar, sparkling like frost, was gently sprinkled for a touch of sweetness. | Gula halus yang berkilau seperti embun beku, ditaburkan perlahan untuk sentuhan rasa manis. | beli 50, jual —, asal — |

## Tempat membeli (`obtainedFrom`, ditambahkan 2026-09-29)

Heartodex hanya menyebut tempat membeli untuk 7 gula (About: "It can be purchased at Doris's store."). Bahan lain diisi
dari situs panduan; sumbernya juga ditulis sebagai komentar di baris `obtainedFrom` tiap entri. Tampil di detail sebagai
"Didapat dari" (toko + syarat waktu) dan di kartu daftar (toko saja; teks lengkap di atribut title).

| Bahan | Didapat dari | Sumber |
| --- | --- | --- |
| Cooking Oil, Meat, Red Bean, Coffee Beans, Rice Flour, Egg, Milk, Butter, Matcha Powder, Cheese, Tea Leaves | Toko Massimo | https://gamerant.com/heartopia-all-shops-locations-sell-items/ (daftar isi toko Massimo); cocok dengan heartopialog.com |
| Pasteurized Egg | Toko Massimo | https://www.gamezebo.com/walkthroughs/how-to-make-onsen-egg-in-heartopia/; cocok dengan heartopialog.com |
| Blue, Indigo, Violet Sugar | Toko Doris, saat hujan atau pelangi | Heartodex (About) + https://www.heartopialog.com/2026/02/heartopia-ingredients-guide-massimo-doris-foraging.html (syarat cuaca; TheGamer menyebut hal yang sama) |
| Red, Orange, Yellow, Green Sugar | Toko Doris, hanya saat pelangi | idem |
| Osmanthus Jam | Toko event Autumn Moon Treasury | https://build-heartopia.com/events/mid-autumn ("Event Store: Ingredients", 100 Gold) |
| Fruitwood Charcoal, Concentrated Date Paste | Toko Massimo, selama event Echo of Ancients | https://allthings.how/heartopia-echo-of-ancients-festival-how-to-unlock-every-collection-and-recipe/ |
| Spirulina Powder | Toko Massimo, selama event Call of Whales | https://heartopia.life/guides/call-of-whales-cooking/ |
| Bamboo Leaf | Toko penukaran event Midsummer Rhyme | https://www.heartopialog.com/2026/02/heartopia-ingredients-guide-massimo-doris-foraging.html ("Exchange Store - Midsummer Rhyme"; satu sumber saja) |
| Brick Meat Patty, Brick Ice, Condensed Milk | Toko Massimo, selama event Modular Streets | https://www.screenhype.co.uk/heartopia-modular-streets-event-guide-all-collectables-values/ |
| Springday Brown Sugar, Salsa Sauce | Toko Massimo, selama event Dreamlight Cinematics | https://gamerant.com/heartopia-all-every-dreamlight-cinematics-cooking-recipe-how-cook/ |
| Frosted | Toko Massimo, selama event Winter frost season | https://www.heartopia-tips.com/blog/heartopia-frost-season-recipes (juga TheGamer, Aurora Banquet) |
| Ace Chicken, Ace Beef | — (null + TODO) | Tidak ditemukan di sumber yang jelas: halaman event Burger Bliss di Heartodex dan build-heartopia.com tidak menyebut tempat membelinya |

Wiki Fandom (heartopia.fandom.com/wiki/Cooking) tidak bisa dibuka saat diperiksa (HTTP 402).
