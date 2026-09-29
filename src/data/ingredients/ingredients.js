import { findIngredientProblems } from './validateIngredients'

/**
 * Data bahan masak Heartopia (kategori Ingredients). Semua nilai wajib bersumber dari Heartodex
 * (https://www.heartodex.com/en/ingredients/<slug>; section dari halaman daftar https://www.heartodex.com/en/ingredients).
 * Data yang tidak ditemukan diisi `null` dan diberi komentar TODO — jangan ditebak. Bahan tidak punya level, lokasi,
 * maupun peta. Bahan juga dipakai sebagai benda (bahan resep, makanan hewan) dengan id 'ingredients/<slug>' (lihat
 * src/data/items.js); file ini satu-satunya sumber datanya.
 *
 * @typedef {Object} Ingredient
 * @property {string}   slug                Sama dengan slug URL di Heartodex, mis. 'egg'.
 * @property {string}   name                Nama resmi (English), apa adanya seperti di sumber.
 * @property {?string}  category            Kunci di INGREDIENT_CATEGORIES, mis. 'Common'. null = tidak ada di sumber.
 * @property {string}   section             'Base Game' atau nama event (src/data/events.js), dari posisi entri di halaman
 *                                          daftar Heartodex, bukan dari kategorinya.
 * @property {?string}  description         Terjemahan Indonesia yang setia pada teks asli.
 * @property {?string}  descriptionOriginal Teks asli dari bagian About; null = About kosong di sumber.
 * @property {string}   [descriptionSourceLang] Kode bahasa teks asli kalau bukan English (lihat recipes.js).
 * @property {?number}  buyPrice            Harga beli ("Buy Price" di kotak Market Value).
 * @property {?number}  sellPrice           Harga jual ("Sell Price"), kalau sumber mencantumkannya.
 * @property {?string}  origin              Info asal (mis. "General" dari "Origin: General"), kalau sumber mencantumkannya.
 * @property {string[]} [uncertain]         Opsional: field angka (mis. 'buyPrice') yang di sumber desimal.
 * @property {string}   image               Path lokal di /public, mis. '/images/ingredients/egg.webp'.
 * @property {[number, number]} imageSize   Ukuran asli gambar [lebar, tinggi] untuk width/height <img>.
 * @property {string}   source              URL halaman sumber.
 */

// Jumlah bahan di https://www.heartodex.com/en/ingredients, semua section termasuk event (diperiksa 2026-09-29).
export const INGREDIENTS_TOTAL_IN_GAME = 32

/** @type {Ingredient[]} */
export const ingredients = [
  {
    slug: 'cooking-oil',
    name: 'Cooking Oil',
    category: 'Common',
    section: 'Base Game',
    description: 'Minyak biji bunga matahari, kaya vitamin E dan asam lemak.',
    descriptionOriginal: 'Sunflower seed oil, high in vitamin E and fatty acids.',
    buyPrice: 100,
    sellPrice: null, // TODO: harga jual (Sell Price) tidak ada di sumber
    origin: null, // TODO: info asal (Origin) tidak ada di sumber
    image: '/images/ingredients/cooking-oil.webp',
    imageSize: [400, 343],
    source: 'https://www.heartodex.com/en/ingredients/cooking-oil',
  },
  {
    slug: 'meat',
    name: 'Meat',
    category: 'Common',
    section: 'Base Game',
    description: 'Sumber mineral, protein, dan vitamin.',
    descriptionOriginal: 'Source of minerals, proteins, and vitamins.',
    buyPrice: 200,
    sellPrice: null, // TODO: harga jual (Sell Price) tidak ada di sumber
    origin: null, // TODO: info asal (Origin) tidak ada di sumber
    image: '/images/ingredients/meat.webp',
    imageSize: [400, 353],
    source: 'https://www.heartodex.com/en/ingredients/meat',
  },
  {
    slug: 'yellow-sugar',
    name: 'Yellow Sugar',
    category: 'Common',
    section: 'Base Game',
    description: 'Bisa dibeli di toko Doris.',
    descriptionOriginal: 'It can be purchased at Doris\'s store.',
    buyPrice: 200,
    sellPrice: null, // TODO: harga jual (Sell Price) tidak ada di sumber
    origin: null, // TODO: info asal (Origin) tidak ada di sumber
    image: '/images/ingredients/yellow-sugar.webp',
    imageSize: [400, 661],
    source: 'https://www.heartodex.com/en/ingredients/yellow-sugar',
  },
  {
    slug: 'indigo-sugar',
    name: 'Indigo Sugar',
    category: 'Common',
    section: 'Base Game',
    description: 'Bisa dibeli di toko Doris.',
    descriptionOriginal: 'It can be purchased at Doris\'s store.',
    buyPrice: 150,
    sellPrice: null, // TODO: harga jual (Sell Price) tidak ada di sumber
    origin: null, // TODO: info asal (Origin) tidak ada di sumber
    image: '/images/ingredients/indigo-sugar.webp',
    imageSize: [400, 661],
    source: 'https://www.heartodex.com/en/ingredients/indigo-sugar',
  },
  {
    slug: 'blue-sugar',
    name: 'Blue Sugar',
    category: 'Common',
    section: 'Base Game',
    description: 'Bisa dibeli di toko Doris.',
    descriptionOriginal: 'It can be purchased at Doris\'s store.',
    buyPrice: 150,
    sellPrice: null, // TODO: harga jual (Sell Price) tidak ada di sumber
    origin: null, // TODO: info asal (Origin) tidak ada di sumber
    image: '/images/ingredients/blue-sugar.webp',
    imageSize: [400, 661],
    source: 'https://www.heartodex.com/en/ingredients/blue-sugar',
  },
  {
    slug: 'violet-sugar',
    name: 'Violet Sugar',
    category: 'Common',
    section: 'Base Game',
    description: 'Bisa dibeli di toko Doris.',
    descriptionOriginal: 'It can be purchased at Doris\'s store.',
    buyPrice: 150,
    sellPrice: null, // TODO: harga jual (Sell Price) tidak ada di sumber
    origin: null, // TODO: info asal (Origin) tidak ada di sumber
    image: '/images/ingredients/violet-sugar.webp',
    imageSize: [400, 635],
    source: 'https://www.heartodex.com/en/ingredients/violet-sugar',
  },
  {
    slug: 'orange-sugar',
    name: 'Orange Sugar',
    category: 'Common',
    section: 'Base Game',
    description: 'Bisa dibeli di toko Doris.',
    descriptionOriginal: 'It can be purchased at Doris\'s store.',
    buyPrice: 200,
    sellPrice: null, // TODO: harga jual (Sell Price) tidak ada di sumber
    origin: null, // TODO: info asal (Origin) tidak ada di sumber
    image: '/images/ingredients/orange-sugar.webp',
    imageSize: [400, 635],
    source: 'https://www.heartodex.com/en/ingredients/orange-sugar',
  },
  {
    slug: 'red-sugar',
    name: 'Red Sugar',
    category: 'Common',
    section: 'Base Game',
    description: 'Bisa dibeli di toko Doris.',
    descriptionOriginal: 'It can be purchased at Doris\'s store.',
    buyPrice: 200,
    sellPrice: null, // TODO: harga jual (Sell Price) tidak ada di sumber
    origin: null, // TODO: info asal (Origin) tidak ada di sumber
    image: '/images/ingredients/red-sugar.webp',
    imageSize: [400, 635],
    source: 'https://www.heartodex.com/en/ingredients/red-sugar',
  },
  {
    slug: 'green-sugar',
    name: 'Green Sugar',
    category: null, // TODO: kategori tidak ditemukan di sumber
    section: 'Base Game',
    description: 'Bisa dibeli di toko Doris.',
    descriptionOriginal: 'It can be purchased at Doris\'s store.',
    buyPrice: 200,
    sellPrice: null, // TODO: harga jual (Sell Price) tidak ada di sumber
    origin: null, // TODO: info asal (Origin) tidak ada di sumber
    image: '/images/ingredients/green-sugar.webp',
    imageSize: [400, 661],
    source: 'https://www.heartodex.com/en/ingredients/green-sugar',
  },
  {
    slug: 'red-bean',
    name: 'Red Bean',
    category: 'Common',
    section: 'Base Game',
    description: 'Kacang merah memang tak bisa meredakan pedihnya rindu seperti kata legenda, tapi rasa manisnya pasti membantu melepas sedikit dopamin.',
    descriptionOriginal: 'It won\'t ease the pain of longing like the legend says, but its sweet taste will definitely help release some dopamine.',
    buyPrice: 50,
    sellPrice: null, // TODO: harga jual (Sell Price) tidak ada di sumber
    origin: null, // TODO: info asal (Origin) tidak ada di sumber
    image: '/images/ingredients/red-bean.webp',
    imageSize: [400, 315],
    source: 'https://www.heartodex.com/en/ingredients/red-bean',
  },
  {
    slug: 'coffee-beans',
    name: 'Coffee Beans',
    category: 'Common',
    section: 'Base Game',
    description: 'Buah tanaman yang diolah menjadi kopi, dengan rasa yang berbeda-beda tergantung varietas dan tingkat sangrainya.',
    descriptionOriginal: 'A plant\'s fruit used in coffee, with flavors that change by variety and roast.',
    buyPrice: 50,
    sellPrice: null, // TODO: harga jual (Sell Price) tidak ada di sumber
    origin: null, // TODO: info asal (Origin) tidak ada di sumber
    image: '/images/ingredients/coffee-beans.webp',
    imageSize: [400, 418],
    source: 'https://www.heartodex.com/en/ingredients/coffee-beans',
  },
  {
    slug: 'rice-flour',
    name: 'Rice Flour',
    category: 'Common',
    section: 'Base Game',
    description: 'Bubuk putih yang halus dan lembut, bahan penting untuk membuat berbagai makanan.',
    descriptionOriginal: 'Soft and smooth white fine powder, an important ingredient for making various foods.',
    buyPrice: 50,
    sellPrice: null, // TODO: harga jual (Sell Price) tidak ada di sumber
    origin: null, // TODO: info asal (Origin) tidak ada di sumber
    image: '/images/ingredients/rice-flour.webp',
    imageSize: [400, 348],
    source: 'https://www.heartodex.com/en/ingredients/rice-flour',
  },
  {
    slug: 'egg',
    name: 'Egg',
    category: 'Common',
    section: 'Base Game',
    description: 'Kaya protein berkualitas tinggi dan asam amino esensial yang dibutuhkan tubuh manusia.',
    descriptionOriginal: 'Rich in high-quality protein and essential amino acids for humans.',
    buyPrice: 100,
    sellPrice: null, // TODO: harga jual (Sell Price) tidak ada di sumber
    origin: null, // TODO: info asal (Origin) tidak ada di sumber
    image: '/images/ingredients/egg.webp',
    imageSize: [400, 389],
    source: 'https://www.heartodex.com/en/ingredients/egg',
  },
  {
    slug: 'pasteurized-egg',
    name: 'Pasteurized Egg',
    category: 'Common',
    section: 'Base Game',
    description: 'Telur ini melewati sterilisasi yang ketat, jadi nilai gizinya setara dengan telur biasa dan pas untuk dibuat telur onsen.',
    descriptionOriginal: 'It undergoes strict sterilization, so its nutritional value matches that of a regular egg, making it perfect for onsen eggs.',
    buyPrice: 100,
    sellPrice: null, // TODO: harga jual (Sell Price) tidak ada di sumber
    origin: null, // TODO: info asal (Origin) tidak ada di sumber
    image: '/images/ingredients/pasteurized-egg.webp',
    imageSize: [400, 426],
    source: 'https://www.heartodex.com/en/ingredients/pasteurized-egg',
  },
  {
    slug: 'milk',
    name: 'Milk',
    category: 'Common',
    section: 'Base Game',
    description: 'Salah satu produk susu paling awal yang pernah ditemukan. Mengandung banyak nutrisi penting yang dibutuhkan tubuh manusia.',
    descriptionOriginal: 'One of the earliest dairy products ever discovered. Contains many essential nutrients required by the human body.',
    buyPrice: 50,
    sellPrice: null, // TODO: harga jual (Sell Price) tidak ada di sumber
    origin: null, // TODO: info asal (Origin) tidak ada di sumber
    image: '/images/ingredients/milk.webp',
    imageSize: [400, 387],
    source: 'https://www.heartodex.com/en/ingredients/milk',
  },
  {
    slug: 'butter',
    name: 'Butter',
    category: 'Common',
    section: 'Base Game',
    description: 'Sebongkah lemak dari susu, kaya nutrisi, tapi lemak tetaplah lemak. Jangan makan terlalu banyak!',
    descriptionOriginal: 'A brick of fat made from milk, rich in nutrients but fat is fat after all. Don\'t eat too much!',
    buyPrice: 150,
    sellPrice: null, // TODO: harga jual (Sell Price) tidak ada di sumber
    origin: null, // TODO: info asal (Origin) tidak ada di sumber
    image: '/images/ingredients/butter.webp',
    imageSize: [400, 374],
    source: 'https://www.heartodex.com/en/ingredients/butter',
  },
  {
    slug: 'matcha-powder',
    name: 'Matcha Powder',
    category: 'Common',
    section: 'Base Game',
    description: 'Digiling dari daun teh segar, kaya berbagai unsur mikro dan bermanfaat sebagai antioksidan.',
    descriptionOriginal: 'Ground by fresh tea leaves, rich in various trace elements and possessing antioxidant benefits.',
    buyPrice: 250,
    sellPrice: null, // TODO: harga jual (Sell Price) tidak ada di sumber
    origin: null, // TODO: info asal (Origin) tidak ada di sumber
    image: '/images/ingredients/matcha-powder.webp',
    imageSize: [400, 345],
    source: 'https://www.heartodex.com/en/ingredients/matcha-powder',
  },
  {
    slug: 'cheese',
    name: 'Cheese',
    category: 'Common',
    section: 'Base Game',
    description: 'Olahan susu padat hasil fermentasi susu, kaya nilai gizi.',
    descriptionOriginal: 'A solid dairy product fermented from milk, rich in nutritional value.',
    buyPrice: 100,
    sellPrice: null, // TODO: harga jual (Sell Price) tidak ada di sumber
    origin: null, // TODO: info asal (Origin) tidak ada di sumber
    image: '/images/ingredients/cheese.webp',
    imageSize: [400, 379],
    source: 'https://www.heartodex.com/en/ingredients/cheese',
  },
  {
    slug: 'tea-leaves',
    name: 'Tea Leaves',
    category: 'Common',
    section: 'Base Game',
    description: 'Dibuat dengan cermat dari daun teh segar melalui serangkaian proses yang rumit hingga rasanya halus dan berkelas.',
    descriptionOriginal: 'Carefully crafted from fresh tea leaves through a series of intricate processes to achieve its refined flavor.',
    buyPrice: 250,
    sellPrice: null, // TODO: harga jual (Sell Price) tidak ada di sumber
    origin: null, // TODO: info asal (Origin) tidak ada di sumber
    image: '/images/ingredients/tea-leaves.webp',
    imageSize: [400, 343],
    source: 'https://www.heartodex.com/en/ingredients/tea-leaves',
  },
  {
    slug: 'osmanthus-jam',
    name: 'Osmanthus Jam',
    category: 'Autumn Moon Treasury',
    section: 'Autumn Moon Treasury',
    description: 'Saat bunga osmanthus berguguran di kala senggang, kami sibuk membuat selai osmanthus.',
    descriptionOriginal: 'As the osmanthus blooms fall in idle moments, we\'re busy making osmanthus jam.',
    buyPrice: 100,
    sellPrice: null, // TODO: harga jual (Sell Price) tidak ada di sumber
    origin: null, // TODO: info asal (Origin) tidak ada di sumber
    image: '/images/ingredients/osmanthus-jam.webp',
    imageSize: [400, 400],
    source: 'https://www.heartodex.com/en/ingredients/osmanthus-jam',
  },
  {
    slug: 'ace-chicken',
    name: 'Ace Chicken',
    category: 'Burger Bliss',
    section: 'Burger Bliss',
    description: 'Daging ayam premium yang ditakdirkan menjadi fillet goreng yang luar biasa.',
    descriptionOriginal: 'Premium chicken destined for fried fillet greatness.',
    buyPrice: 100,
    sellPrice: null, // TODO: harga jual (Sell Price) tidak ada di sumber
    origin: null, // TODO: info asal (Origin) tidak ada di sumber
    image: '/images/ingredients/ace-chicken.webp',
    imageSize: [400, 400],
    source: 'https://www.heartodex.com/en/ingredients/ace-chicken',
  },
  {
    slug: 'ace-beef',
    name: 'Ace Beef',
    category: 'Burger Bliss',
    section: 'Burger Bliss',
    description: 'Daging sapi 100% murni—bahan asli, kepuasan sejati.',
    descriptionOriginal: '100% pure beef-real ingredients, real satisfaction.',
    buyPrice: 200,
    sellPrice: null, // TODO: harga jual (Sell Price) tidak ada di sumber
    origin: null, // TODO: info asal (Origin) tidak ada di sumber
    image: '/images/ingredients/ace-beef.webp',
    imageSize: [400, 400],
    source: 'https://www.heartodex.com/en/ingredients/ace-beef',
  },
  {
    slug: 'fruitwood-charcoal',
    name: 'Fruitwood Charcoal',
    category: 'Echo of Ancients',
    section: 'Echo of Ancients',
    description: 'Dengan aroma alaminya yang harum, arang ini menguatkan rasa daging panggang, menyamarkan bau prengus, dan menambahkan rasa asap yang kaya dan dalam—berkualitas tanpa menguras kantong.',
    descriptionOriginal: 'With its natural fragrant notes, it lifts the flavor of grilled meat, cuts through any gamey taste, and adds a rich smoky depth-quality that doesn\'t break the bank.',
    buyPrice: 50,
    sellPrice: null, // TODO: harga jual (Sell Price) tidak ada di sumber
    origin: null, // TODO: info asal (Origin) tidak ada di sumber
    image: '/images/ingredients/fruitwood-charcoal.webp',
    imageSize: [400, 352],
    source: 'https://www.heartodex.com/en/ingredients/fruitwood-charcoal',
  },
  {
    slug: 'concentrated-date-paste',
    name: 'Concentrated Date Paste',
    category: 'Echo of Ancients',
    section: 'Echo of Ancients',
    description: 'Kaya rasa dan lembut, pemanis alami ini jadi favorit para pencinta hidangan penutup.',
    descriptionOriginal: 'Rich and mellow, this natural sweetener is a favorite among dessert lovers.',
    buyPrice: 50,
    sellPrice: null, // TODO: harga jual (Sell Price) tidak ada di sumber
    origin: null, // TODO: info asal (Origin) tidak ada di sumber
    image: '/images/ingredients/concentrated-date-paste.webp',
    imageSize: [400, 388],
    source: 'https://www.heartodex.com/en/ingredients/concentrated-date-paste',
  },
  {
    slug: 'spirulina-powder',
    name: 'Spirulina Powder',
    category: 'Call of Whales',
    section: 'Call of Whales',
    description: 'Bubuk pigmen biru alami yang sangat padat nutrisi.',
    descriptionOriginal: 'Highly nutrient-dense natural blue pigment powder.',
    buyPrice: 50,
    sellPrice: null, // TODO: harga jual (Sell Price) tidak ada di sumber
    origin: null, // TODO: info asal (Origin) tidak ada di sumber
    image: '/images/ingredients/spirulina-powder.webp',
    imageSize: [400, 400],
    source: 'https://www.heartodex.com/en/ingredients/spirulina-powder',
  },
  {
    slug: 'bamboo-leaf',
    name: 'Bamboo Leaf',
    category: 'Midsummer Rhyme',
    section: 'Midsummer Rhyme',
    description: 'Daun lebar yang tahan panas, pas untuk membungkus makanan sebagai pembungkus yang ramah lingkungan.',
    descriptionOriginal: 'A broad, heat resistant plant leaf perfect for wrapping food as an eco friendly wrapper.',
    buyPrice: 50,
    sellPrice: null, // TODO: harga jual (Sell Price) tidak ada di sumber
    origin: null, // TODO: info asal (Origin) tidak ada di sumber
    image: '/images/ingredients/bamboo-leaf.webp',
    imageSize: [400, 322],
    source: 'https://www.heartodex.com/en/ingredients/bamboo-leaf',
  },
  {
    slug: 'brick-meat-patty',
    name: 'Brick Meat Patty',
    category: 'Modular Streets',
    section: 'Modular Streets',
    description: 'Kalau shiitake yang ringan dan penny bun yang berat dijatuhkan bersamaan dari puncak menara patty balok, mana yang menyentuh tanah lebih dulu?',
    descriptionOriginal: 'If you drop a light shiitake and a hefty penny bun from the top of the brick patty tower at the same time, which one Will hit the ground first?',
    buyPrice: 50,
    sellPrice: null, // TODO: harga jual (Sell Price) tidak ada di sumber
    origin: null, // TODO: info asal (Origin) tidak ada di sumber
    image: '/images/ingredients/brick-meat-patty.webp',
    imageSize: [400, 284],
    source: 'https://www.heartodex.com/en/ingredients/brick-meat-patty',
  },
  {
    slug: 'brick-ice',
    name: 'Brick Ice',
    category: 'Modular Streets',
    section: 'Modular Streets',
    description: 'Es balok berbentuk unik ini hanya bisa dipakai untuk membuat es serut, bukan untuk membangun istana es yang kreatif. Sungguh disayangkan.',
    descriptionOriginal: 'These uniquely shaped brick ice can only be used to make shaved ice, but sadly not for building creative ice castles. What a pity.',
    buyPrice: 50,
    sellPrice: null, // TODO: harga jual (Sell Price) tidak ada di sumber
    origin: null, // TODO: info asal (Origin) tidak ada di sumber
    image: '/images/ingredients/brick-ice.webp',
    imageSize: [400, 335],
    source: 'https://www.heartodex.com/en/ingredients/brick-ice',
  },
  {
    slug: 'condensed-milk',
    name: 'Condensed Milk',
    category: 'Modular Streets',
    section: 'Modular Streets',
    description: 'Susu kental manis—"lem" yang menyatukan berbagai macam hidangan penutup.',
    descriptionOriginal: 'Sweetened condensed milk—the "glue" that holds all kinds of desserts together.',
    buyPrice: 50,
    sellPrice: null, // TODO: harga jual (Sell Price) tidak ada di sumber
    origin: null, // TODO: info asal (Origin) tidak ada di sumber
    image: '/images/ingredients/condensed-milk.webp',
    imageSize: [400, 296],
    source: 'https://www.heartodex.com/en/ingredients/condensed-milk',
  },
  {
    slug: 'springday-brown-sugar',
    name: 'Springday Brown Sugar',
    category: 'Dreamlight Cinematics',
    section: 'Dreamlight Cinematics',
    description: 'Gula mentah yang dimasak perlahan dengan cara tradisional, berwarna keemasan dan bening, dengan rasa manis yang seimbang.',
    descriptionOriginal: 'Raw sugar simmered with traditional craftsmanship, boasting a golden, translucent appearance and a well-balanced sweetness.',
    buyPrice: 50,
    sellPrice: null, // TODO: harga jual (Sell Price) tidak ada di sumber
    origin: null, // TODO: info asal (Origin) tidak ada di sumber
    image: '/images/ingredients/springday-brown-sugar.webp',
    imageSize: [400, 596],
    source: 'https://www.heartodex.com/en/ingredients/springday-brown-sugar',
  },
  {
    slug: 'salsa-sauce',
    name: 'Salsa Sauce',
    category: 'Dreamlight Cinematics',
    section: 'Dreamlight Cinematics',
    description: 'Saus klasik serbaguna—salsa cocok dipadukan dengan apa saja.',
    descriptionOriginal: 'A classic, all-purpose condiment—salsa goes with everything.',
    buyPrice: 50,
    sellPrice: null, // TODO: harga jual (Sell Price) tidak ada di sumber
    origin: null, // TODO: info asal (Origin) tidak ada di sumber
    image: '/images/ingredients/salsa-sauce.webp',
    imageSize: [400, 396],
    source: 'https://www.heartodex.com/en/ingredients/salsa-sauce',
  },
  {
    slug: 'frosted',
    name: 'Frosted',
    category: 'Winter frost season',
    section: 'Winter frost season',
    description: 'Gula halus yang berkilau seperti embun beku, ditaburkan perlahan untuk sentuhan rasa manis.',
    descriptionOriginal: 'Icing sugar, sparkling like frost, was gently sprinkled for a touch of sweetness.',
    buyPrice: 50,
    sellPrice: null, // TODO: harga jual (Sell Price) tidak ada di sumber
    origin: null, // TODO: info asal (Origin) tidak ada di sumber
    image: '/images/ingredients/frosted.webp',
    imageSize: [400, 545],
    source: 'https://www.heartodex.com/en/ingredients/frosted',
  },
]

export function getIngredientBySlug(slug) {
  return ingredients.find((item) => item.slug === slug)
}

// Pemeriksaan data saat development supaya typo ketahuan begitu bahan baru ditambahkan.
if (import.meta.env.DEV) {
  for (const { slug, problems } of findIngredientProblems(ingredients)) {
    console.warn(`[data bahan] ${slug}: ${problems.join('; ')}`)
  }
}
