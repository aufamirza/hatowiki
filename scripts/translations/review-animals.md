# Review terjemahan: hewan Base Game

8 hewan Base Game (🏠 Common) yang ditambahkan dari heartodex (diperiksa 2026-09-27). Hewan event (Dolphin,
Maltese, Penguin) belum dimasukkan. Halaman daftar hewan tidak punya judul bagian "Base Game": 8 hewan Common
tampil paling atas, sebelum bagian event 🐳 / 🦴 / ⛄.
Kolom **Asli** disalin apa adanya dari halaman detail (`descriptionOriginal`), termasuk salah ketiknya.
Kolom **Terjemahan** mengikuti maksud asli. Nama hewan, nama lokasi, dan istilah game tetap bahasa Inggris.

- Kata mencurigakan (pola "y" → "g") ditandai otomatis oleh `scripts/heartodex-sync.mjs`: tidak ada di deskripsi hewan.
- Lokasi diambil dari daftar "Location" di halaman detail (huruf besar-kecil asli). Titik tempat makan diambil dari
  pin di peta halaman detail, yaitu marker `flymark` di peta interaktif heartodex (koordinatnya sama persis).
  `flylat`/`flylng` di link peta ternyata titik tengah kotak zona (posisi kamera), bukan tempat makannya.
  Di Hatowiki peta hewan menampilkan pin itu di atas peta dasar statis; zona lokasi tetap disimpan sebagai cadangan.
- Makanan favorit disimpan sebagai id benda di `src/data/items.js`. Jenisnya di heartodex versi Inggris tertulis dalam
  bahasa Spanyol ("cultivo", "recolectable", "ingrediente", "pez", "receta"); di Hatowiki dipakai istilah game
  berbahasa Inggris (Crop, Collectible, Ingredient, Fish, Recipe), diambil dari bagian URL tautannya.
- Kolom Catatan juga memuat letak titik tempat makan terhadap zona lokasinya dan TODO data dari `animals.js`.

| Hewan | Asli (EN) | Terjemahan (ID) | Catatan |
| --- | --- | --- | --- |
| Alpaca (`alpaca`) | The gentle and friendly llama always quietly observes everything around the Flower Field. | Llama yang lembut dan ramah ini selalu diam-diam mengamati segala sesuatu di sekitar Flower Field. | sumber menyebut hewan ini "llama"; diterjemahkan apa adanya; "Flower Field" (nama tempat) dibiarkan; titik tempat makan (313.5, 704.5) di dalam zona Amethyst Beach; makanan: Pineapple, Blueberry, Wheat |
| Capybara (`capybara`) | The capybara family living in the Onsen Mountain Ruins often gazes at the giant stone statue that resembles themselves. Could this be some mysterious guidance of fate? | Keluarga kapibara yang tinggal di Onsen Mountain Ruins sering menatap patung batu raksasa yang mirip dengan diri mereka. Mungkinkah ini petunjuk takdir yang misterius? | JSON-LD di sumber terpotong ("…guidance o"); dipakai teks lengkap dari halaman; "Onsen Mountain Ruins" dibiarkan; titik tempat makan (319.8, 189.5) di dalam zona Ruins; makanan: Tomato, Grape, Raspberry |
| Sika Deer (`sika-deer`) | The deer, elegant and graceful in its idle poses, is surprisingly swift when running through the forest. | Rusa yang elegan dan anggun saat sedang bersantai ini ternyata sangat gesit ketika berlari menembus hutan. | "idle poses" → "saat sedang bersantai"; titik tempat makan (799.1, 488.3) di luar zona lokasinya; makanan: Branch, Lettuce, House Salad |
| Bunny (`bunny`) | The fluffy, adorable bunnies are the grass elves that frequently appear in suburbs | Kelinci-kelinci berbulu lembut yang menggemaskan ini adalah peri rumput yang sering muncul di Suburbs. | sumber tanpa titik di akhir kalimat; "suburbs" huruf kecil, merujuk ke lokasinya (Suburbs) → "Suburbs"; titik tempat makan (363.3, 538.8) di dalam zona Suburbs; makanan: Strawberry, Carrot, Weed |
| Ferret (`ferret`) | The little ferrets scurrying around near the Home curiously explore every spot suitable for playing, frolicking, and sleeping together. | Para ferret kecil yang berlarian di dekat Home dengan penasaran menjelajahi setiap tempat yang cocok untuk bermain, berkejaran, dan tidur bersama. | "the Home" (nama tempat) → "Home"; "ferret" dibiarkan (sebutan umum dalam bahasa Indonesia juga); titik tempat makan (283, 361.5) di luar zona lokasinya; makanan: Egg, Goby, Sea Bass |
| Sea Otter (`sea-otter`) | Beyond the town beyond the sea, there's a group of sea otters. They are lively and intelligent, natural gourmets skilled at using tools. | Di seberang kota, di seberang laut, hiduplah sekelompok berang-berang laut. Mereka lincah dan cerdas, penikmat makanan sejati yang pandai memakai alat. | JSON-LD berisi baris baru di tengah kalimat ("using\r\ntools"), dinormalisasi jadi spasi; "natural gourmets" → "penikmat makanan sejati"; titik tempat makan (511.8, 739.5) di dalam zona Fishing Village Square; makanan: Common Prawn, Oriental Shrimp, Mussel |
| Panda (`panda`) | Some chubby pandas arrived in the forest, living a simple life of sleeping and eating bamboo every day. | Beberapa panda gemuk datang ke hutan dan menjalani hidup sederhana: tidur dan makan bambu setiap hari. | titik tempat makan (760.1, 649.3) di dalam zona Forest Jump Puzzle; makanan: Corn, Bamboo, Apple |
| Fox (`fox`) | The agile and clever fox, an excellent patroller of the territory, now has the mission of guarding the Flower Field. | Rubah yang gesit dan cerdik ini adalah penjaga wilayah yang andal, dan kini ia mendapat tugas menjaga Flower Field. | "Flower Field" (nama tempat) dibiarkan; "patroller of the territory" → "penjaga wilayah"; titik tempat makan (239.8, 564.7) di dalam zona Windmill Flower Field; makanan: Largemouth Bass, European Perch, Meat |
