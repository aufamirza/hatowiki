# Review terjemahan: ikan Base Game baru

77 ikan Base Game level 2–14 yang ditambahkan dari heartodex (diperiksa 2026-09-27).
Kolom **Asli** disalin apa adanya dari halaman detail (`descriptionOriginal`), termasuk salah ketiknya.
Kolom **Terjemahan** mengikuti maksud asli: salah ketik "y" → "g" dan salah ketik lain dibaca sesuai kata yang dimaksud.

- Kata mencurigakan (pola "y" → "g") ditandai otomatis oleh `scripts/heartodex-sync.mjs` (dulu `heartodex-fish.mjs`), lalu dicek manual di kolom Catatan.
- 13 ikan tidak punya deskripsi di sumber (bagian About kosong, JSON-LD juga kosong), jadi `descriptionOriginal` dan `description` diisi `null` + TODO: Asian Arowana (Lv 11), Blackspot Sergeant (Lv 11), Lionhead (Lv 11), Whale Shark (Lv 11), Mahi-Mahi (Lv 12), Moon Jelly (Lv 12), Angelfish (Lv 12), Pink Betta (Lv 12), Green Sea Turtle (Lv 12), White-Faced Surgeonfish (Lv 13), Lionfish (Lv 13), Blue-and-Yellow Wrasse (Lv 14), Azure Demoiselle (Lv 14).
- Data lama (20 ikan level 1) tidak diubah. Salah ketik lama yang sudah ada di sana: "easilg" (Common Whitefish), sudah diterjemahkan sesuai maksud ("easily").

| Lv | Ikan | Asli (EN) | Terjemahan (ID) | Catatan |
| --- | --- | --- | --- | --- |
| 2 | Seahorse (`seahorse`) | It's quirky get beautiful, also sluggish. | Nyentrik tapi cantik, juga lamban. | ditandai skrip: get; "get" = "yet" (quirky yet beautiful) |
| 2 | European Smelt (`european-smelt`) | It tastes like fresh cucumbers. A female smelt can produce tens of thousands of eggs. | Rasanya seperti mentimun segar. Seekor smelt betina bisa menghasilkan puluhan ribu telur. |  |
| 2 | False Scad (`false-scad`) | It's often confused with scad due to similar appearance, but theg share no relation. | Karena rupanya mirip, ikan ini sering dikira Scad, padahal keduanya tidak berkerabat. | ditandai skrip: theg |
| 2 | Largemouth Bass (`largemouth-bass`) | This carnivorous fish is known for its ferocitg. It often hides among waterweeds and strikes when preg passes by. | Ikan karnivora ini terkenal ganas. Ia sering bersembunyi di antara rumput air dan menyergap saat mangsa lewat. | ditandai skrip: ferocitg, preg |
| 2 | Stone Loach (`stone-loach`) | Its sleek body slips easily through sand and gravel. When startled, it quickly clamps onto the rock. | Tubuhnya yang licin mudah menyusup di antara pasir dan kerikil. Saat kaget, ia langsung mencengkeram batu. |  |
| 2 | Anglerfish (`anglerfish`) | A female anglerfish has a little lantern hanging on the head, a well-crafted bait. | Anglerfish betina punya lentera kecil yang menggantung di kepalanya, umpan yang dirancang dengan apik. |  |
| 2 | Common Octopus (`common-octopus`) | It's a mid-sized octopus and a light chaser in the sea. | Gurita berukuran sedang, sekaligus pengejar cahaya di laut. |  |
| 2 | Atlantic Pygmy Octopus (`atlantic-pygmy-octopus`) | Sure, it's mini-sized, but calling it a "pygmy" is a bit too much! | Memang ukurannya mini, tapi menyebutnya "pygmy" rasanya agak keterlaluan! |  |
| 2 | Turbot (`turbot`) | It's a tupe of flatfish. While its appearance may not be ideal, it's one of the gentle guys. | Salah satu jenis ikan pipih. Penampilannya mungkin kurang menarik, tapi ia termasuk yang berhati lembut. | "tupe" = "type" |
| 3 | Hermit Crab (`hermit-crab`) | Who says rent is obligatory? Not the hermit crab, an expert at claiming new shells. | Siapa bilang sewa itu wajib? Tentu bukan Hermit Crab, si ahli mengklaim cangkang baru. |  |
| 3 | European Crayfish (`european-crayfish`) | Protected by a tough exoskeleton and massive pincers, this crayfish never backs down from a threat. | Terlindung eksoskeleton yang keras dan capit yang besar, crayfish ini tidak pernah mundur menghadapi ancaman. |  |
| 3 | Zander (`zander`) | It's a meat lover, so it tends to gain weight easily. | Doyan daging, jadi berat badannya mudah naik. |  |
| 3 | Ruffe (`ruffe`) | It's a carnivorous fish that prefers warm lakes. | Ikan karnivora yang lebih suka danau yang hangat. |  |
| 3 | Mud Sunfish (`mud-sunfish`) | Muddy-colored fish muddle in murkg lake mud. Well, that doesn't roll off the tongue quite well. | Ikan berwarna lumpur berkubang di lumpur danau yang keruh. Yah, kalimat itu agak belibet diucapkan. | ditandai skrip: murkg |
| 3 | Clownfish (`clownfish`) | Lively and adorable, it rose to fame in the aquatic world thanks to a role in a certain ocean-themed blockbuster. | Lincah dan menggemaskan, ikan ini jadi terkenal di dunia akuatik berkat perannya dalam sebuah film laris bertema laut. |  |
| 3 | Edible Frog (`edible-frog`) | Its ancestor is the pond frog and marsh frog, widelg distributed across lakes. | Leluhurnya adalah pond frog dan marsh frog. Ia tersebar luas di danau-danau. | ditandai skrip: widelg |
| 3 | Atlantic Salmon (`atlantic-salmon`) | It's one of the common members of the salmon family, known for its nutritious orange flesh that is delicious whether raw or cooked. | Salah satu anggota keluarga salmon yang umum, terkenal dengan dagingnya yang oranye dan bergizi, lezat dimakan mentah maupun dimasak. |  |
| 3 | Tilapia (`tilapia`) | For its deliciousness, some call it white salmon. | Karena kelezatannya, ada yang menyebutnya salmon putih. |  |
| 4 | River Crab (`river-crab`) | It prefers meat and will break it down with its pincers and eat it piece by piece. Elegance. | Lebih suka daging, ia mencabiknya dengan capit lalu memakannya sepotong demi sepotong. Elegan. |  |
| 4 | Common Carp (`common-carp`) | It's full of energy and strength that leaps to escape when hooked. Don't let it slip away! | Penuh energi dan tenaga, ia melompat untuk kabur saat tersangkut kail. Jangan sampai lolos! |  |
| 4 | Butterfly Koi (`butterfly-koi`) | A graceful "water fairy," pure and floating, but highly sensitive and needs careful care. | "Peri air" yang anggun, murni dan melayang, tapi sangat sensitif dan perlu dirawat dengan cermat. |  |
| 4 | Burbot (`burbot`) | It has a short barbel on the chin, which serves as an organ for detecting scents. | Di dagunya ada barbel pendek yang berfungsi sebagai organ pendeteksi bau. |  |
| 4 | Mussel (`mussel`) | It has a tough Shell with green and yellow bands, and its flesh is highlg nutritious. | Cangkangnya keras dengan garis-garis hijau dan kuning, dan dagingnya sangat bergizi. | ditandai skrip: highlg; huruf besar "Shell" di tengah kalimat |
| 4 | Goby (`goby`) | It forms a disc-shaped sucker with its pelvic fins to stick to rocks and stay anchored against flowing currents. | Sirip perutnya membentuk alat isap berbentuk cakram untuk menempel di batu dan bertahan melawan arus. |  |
| 4 | Red-Bellied Piranha (`red-bellied-piranha`) | Its red belly is natural—no, it wasn't burned. | Perut merahnya memang alami—bukan, bukan karena terbakar. |  |
| 4 | European Plaice (`european-plaice`) | A fish that forages only at night, with just enough eyesight to get by. | Ikan yang hanya mencari makan pada malam hari, dengan penglihatan yang sekadar cukup untuk bertahan. | ditandai skrip: get; "get" di sini benar ("to get by"), bukan salah ketik |
| 4 | Rabbit Fish (`rabbit-fish`) | Viewed from above, it resembles a graceful butterfly with a tail, but its dorsal spine is mildly poisonous. | Dilihat dari atas, ia mirip kupu-kupu anggun yang berekor, tapi duri punggungnya sedikit beracun. |  |
| 4 | Tadpole (`tadpole`) | It's tiny and unremarkable at first, then becomes a frog by summer... if it survives. | Awalnya mungil dan biasa saja, lalu berubah menjadi katak saat musim panas... kalau berhasil bertahan hidup. |  |
| 5 | Freshwater Blenny (`freshwater-blenny`) | There are two tiny flowers on its head, swaying gently with the current. | Ada dua bunga mungil di kepalanya yang bergoyang lembut mengikuti arus. |  |
| 5 | Atlantic Mackerel (`atlantic-mackerel`) | It's stoic, rare, and beautiful, but it really likes to sleep more than it should. | Tenang, langka, dan cantik, tapi ia benar-benar suka tidur lebih lama dari seharusnya. |  |
| 5 | European Flying Squid (`european-flying-squid`) | It Uses jet propulsion and fin vibrations to "fly" for short distances, hence the name "flying squid." | Ia memakai dorongan jet dan getaran sirip untuk "terbang" dalam jarak pendek, karena itulah dinamai "flying squid". | huruf besar "Uses" di tengah kalimat |
| 5 | European Lobster (`european-lobster`) | It's a larger species of lobster, and its two massive claws look quite menacing. | Termasuk spesies lobster yang lebih besar, dan kedua capitnya yang besar tampak cukup mengancam. |  |
| 5 | Common Rudd (`common-rudd`) | Red eyes... did someone make him cry? | Matanya merah... apa ada yang membuatnya menangis? |  |
| 5 | Trout (`trout`) | It has an alluring coloration and prefers to live in relatively cold lakes. | Warnanya memikat, dan ia lebih suka hidup di danau yang relatif dingin. |  |
| 6 | Large Pearl Mussel (`large-pearl-mussel`) | This shellfish, lying motionless at the bottom of the lake, cannot excrete the indigestible foreign matter in its body, so it can only wrap it up into pearls. | Kerang yang diam tak bergerak di dasar danau ini tidak bisa mengeluarkan benda asing yang tak tercerna di tubuhnya, jadi ia hanya bisa membungkusnya menjadi mutiara. |  |
| 6 | Puffer Fish (`puffer-fish`) | It's a diadromous fish, though it spends most of the time in saltwater. | Termasuk ikan diadromus, walau sebagian besar waktunya dihabiskan di air asin. |  |
| 6 | Tub Gurnard (`tub-gurnard`) | The orange-red scales on its back create a beautiful sight. | Sisik jingga kemerahan di punggungnya menjadi pemandangan yang indah. |  |
| 6 | Chum Salmon (`chum-salmon`) | As it matures, it changes colors and becomes a fish of fashion. | Seiring dewasa, warnanya berubah dan ia menjadi ikan yang modis. |  |
| 6 | Nursehound (`nursehound`) | Its eyes glow at night due to reflected light, just like cats. | Matanya berpendar di malam hari karena memantulkan cahaya, persis seperti kucing. |  |
| 6 | Grayling (`grayling`) | Its scales refract a dreamy purple hue, making it quite suitable as an aquarium fish. | Sisiknya membiaskan rona ungu bak mimpi, sehingga cukup cocok dijadikan ikan akuarium. |  |
| 7 | European Eel (`european-eel`) | A deep-sea marathoner that can migrate thousands of miles without eating. | Pelari maraton laut dalam yang bisa bermigrasi ribuan mil tanpa makan. |  |
| 7 | Blackspot Seabream (`blackspot-seabream`) | It roams the deeper reaches of the sea with ease. | Dengan mudah menjelajahi bagian laut yang lebih dalam. |  |
| 7 | Mediterranean Killifish (`mediterranean-killifish`) | It's covered in dark stripes, and its dream is to live a peaceful life. | Tubuhnya dipenuhi belang gelap, dan impiannya adalah hidup dengan damai. |  |
| 7 | Three-Spined Stickleback (`three-spined-stickleback`) | When fighting, the three spines on its body erect to intimidate opponents. | Saat bertarung, tiga duri di tubuhnya berdiri tegak untuk menggertak lawan. |  |
| 7 | Giant Oarfish (`giant-oarfish`) | Some call it an emissary of the dragon palace, others say it's a deep-sea demon. Its behavior remains unknown. | Ada yang menyebutnya utusan istana naga, ada pula yang bilang ia iblis laut dalam. Perilakunya masih belum diketahui. |  |
| 7 | Mottled Sculpin (`mottled-sculpin`) | It usually stays at the bottom of the water, too lazy to swim around. | Biasanya ia berdiam di dasar air, terlalu malas untuk berenang ke sana kemari. |  |
| 8 | King Crab (`king-crab`) | Its tender flesh is rich in various proteins and healthy fats. Best steamed. | Dagingnya yang lembut kaya akan berbagai protein dan lemak sehat. Paling enak dikukus. |  |
| 8 | Golden King Crab (`golden-king-crab`) | This giant sea crab, with its massive body and spiny Shell, has been the inspiration for countless horror films. | Kepiting laut raksasa bertubuh besar dan bercangkang berduri ini telah menjadi inspirasi bagi film horor yang tak terhitung jumlahnya. | huruf besar "Shell" di tengah kalimat |
| 8 | Blue European Crayfish (`blue-european-crayfish`) | The Shell has mutated into a light blue color, but it's Still a freshwater crayfish at heart. | Cangkangnya bermutasi menjadi biru muda, tapi pada dasarnya ia tetap crayfish air tawar. | huruf besar "Shell", "Still" di tengah kalimat |
| 8 | Haddock (`haddock`) | Prefers to stay still on the shallow seafloor, but will roam around when foraging. | Lebih suka berdiam di dasar laut yang dangkal, tapi akan berkeliaran saat mencari makan. |  |
| 8 | Goldfish (`goldfish`) | With dazzling colors and graceful posture, it's the beauty pageant champion of the fish world. | Dengan warna yang memukau dan postur yang anggun, ia juara kontes kecantikan di dunia ikan. |  |
| 8 | European Mudminnow (`european-mudminnow`) | It prefers to hide at the bottom of lakes. Its dark brown speckles help it blend seamlessly into the surroundings. | Ia suka bersembunyi di dasar danau. Bintik-bintik cokelat gelapnya membantunya menyatu sempurna dengan sekitarnya. |  |
| 9 | Bluefin Tuna (`bluefin-tuna`) | Born with restless energy, it can swim swiftly in the deep sea. | Terlahir dengan energi yang tak kenal diam, ia bisa berenang cepat di laut dalam. |  |
| 9 | Northern Pike (`northern-pike`) | Its appetite matches its large size. Leftover food on its teeth is eaten later like snacks. | Nafsu makannya sebesar tubuhnya. Sisa makanan di giginya dimakan belakangan seperti camilan. |  |
| 9 | Moonfish (`moonfish`) | Round like the Mid-AIJtumn Festival moon, it moves in the same cycle—hiding deep by day and rising to shallower waters by night. | Bulat seperti bulan Festival Pertengahan Musim Gugur, ia bergerak dalam siklus yang sama: bersembunyi di kedalaman saat siang dan naik ke perairan yang lebih dangkal saat malam. | "Mid-AIJtumn" = "Mid-Autumn" |
| 9 | Ocean Sunfish (`ocean-sunfish`) | With a large head and stubby tail, its odd shape earned it the nickname "swimming head." | Kepalanya besar dan ekornya pendek, bentuk anehnya itu membuatnya dijuluki "kepala berenang". |  |
| 9 | Pumpkinseed (`pumpkinseed`) | It's covered in many green and blue speckles, like wearing clothes with glowing spots. | Tubuhnya dipenuhi bintik hijau dan biru, seperti mengenakan baju dengan bintik-bintik yang bercahaya. |  |
| 9 | Huchen (`huchen`) | He eats meat and grows strong. He is a lone wolf. | Dia makan daging dan tumbuh kuat. Dia serigala penyendiri. |  |
| 10 | Swordfish (`swordfish`) | It has an iconic sword-like rostrum, making it the swimming champion of the fish world. | Moncongnya yang ikonik berbentuk seperti pedang, menjadikannya juara renang di dunia ikan. |  |
| 10 | Wels Catfish (`wels-catfish`) | This freshwater fish has a long lifespan that lives up to several decades. | Ikan air tawar ini berumur panjang, bisa hidup hingga beberapa dekade. |  |
| 10 | Bluegill (`bluegill`) | It's a rare species that can thrive in warm lakes. Doesn't it worry about cooking itself? | Spesies langka yang bisa tumbuh subur di danau yang hangat. Apa ia tidak khawatir dirinya ikut matang? |  |
| 10 | Shortfin Mako Shark (`shortfin-mako-shark`) | Its tail fin has a distinctive crescent shape, like a moon in the water | Sirip ekornya berbentuk bulan sabit yang khas, bagaikan bulan di dalam air. | tanpa titik di akhir |
| 10 | Smooth Hammerhead (`smooth-hammerhead`) | It has a head shaped like a hammer. With Sharp teeth and swift movements, it's a ferocious hunter in the sea. | Kepalanya berbentuk seperti palu. Dengan gigi tajam dan gerakan gesit, ia pemburu yang ganas di lautan. | huruf besar "Sharp" di tengah kalimat |
| 10 | Arctic Char (`arctic-char`) | Covered in red sparckles, it's a fearless fish that braves cold weather | Dipenuhi kilauan merah, ikan pemberani ini tak gentar menghadapi cuaca dingin. | "sparckles" = "sparkles"; tanpa titik di akhir |
| 11 | Asian Arowana (`asian-arowana`) | — | — | TODO: deskripsi kosong di sumber |
| 11 | Blackspot Sergeant (`blackspot-sergeant`) | — | — | TODO: deskripsi kosong di sumber |
| 11 | Lionhead (`lionhead`) | — | — | TODO: deskripsi kosong di sumber |
| 11 | Whale Shark (`whale-shark`) | — | — | TODO: deskripsi kosong di sumber |
| 12 | Mahi-Mahi (`mahi-mahi`) | — | — | TODO: deskripsi kosong di sumber |
| 12 | Moon Jelly (`moon-jelly`) | — | — | TODO: deskripsi kosong di sumber |
| 12 | Angelfish (`angelfish`) | — | — | TODO: deskripsi kosong di sumber |
| 12 | Pink Betta (`pink-betta`) | — | — | TODO: deskripsi kosong di sumber |
| 12 | Green Sea Turtle (`green-sea-turtle`) | — | — | TODO: deskripsi kosong di sumber |
| 13 | White-Faced Surgeonfish (`white-faced-surgeonfish`) | — | — | TODO: deskripsi kosong di sumber |
| 13 | Lionfish (`lionfish`) | — | — | TODO: deskripsi kosong di sumber |
| 14 | Blue-and-Yellow Wrasse (`blue-and-yellow-wrasse`) | — | — | TODO: deskripsi kosong di sumber |
| 14 | Azure Demoiselle (`azure-demoiselle`) | — | — | TODO: deskripsi kosong di sumber |
