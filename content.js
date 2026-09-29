/**
 * content.js — Konten edukasi berbahasa Indonesia.
 * Semua teks di sini adalah penjelasan konsep umum dari materi HH klasik
 * (Hodgkin & Huxley 1952) dan konteks biologis KCNA1/Kv1.1/EA1 yang telah
 * dipublikasikan secara luas (Browne et al. 1994; sumber genetika umum).
 * Tidak ada angka klinis, hasil eksperimen, atau parameter mutasi spesifik
 * yang dikarang — bagian yang bersifat model/pendekatan ditandai secara
 * eksplisit sebagai penyederhanaan.
 */

export const EDU_TOPICS = [
  {
    id: 'anatomi',
    title: '1. Anatomi Neuron',
    body: `Neuron tersusun atas empat bagian utama: <strong>dendrit</strong> (menerima sinyal dari neuron lain),
    <strong>soma/badan sel</strong> (mengintegrasikan sinyal dan mengandung nukleus), <strong>akson</strong>
    (menghantarkan potensial aksi menjauhi soma), dan <strong>terminal akson</strong> (melepaskan
    neurotransmiter ke sel berikutnya). Pada banyak neuron bermielin, akson diselubungi <strong>myelin</strong>
    yang terputus secara berkala di <strong>Node of Ranvier</strong> — titik di mana kanal ion terkonsentrasi
    dan konduksi saltatori (loncatan sinyal antar-node) terjadi.`,
  },
  {
    id: 'potensial-membran',
    title: '2. Potensial Membran: Istirahat, Depolarisasi, Repolarisasi, AHP',
    body: `Pada keadaan istirahat, bagian dalam neuron sekitar -65 mV lebih negatif dibanding luar sel
    (<strong>potensial istirahat</strong>). Ketika stimulus cukup kuat, kanal Na+ terbuka dan Na+ masuk deras
    ke sel, menyebabkan <strong>depolarisasi</strong> (Vm naik tajam, bisa melewati 0 mV). Selanjutnya kanal
    Na+ menginaktivasi dan kanal K+ terbuka, K+ keluar sel menyebabkan <strong>repolarisasi</strong>
    (Vm kembali turun). Karena kanal K+ menutup tidak secepat pembukaannya, Vm sering turun sedikit di
    bawah potensial istirahat sebelum stabil kembali — fase ini disebut
    <strong>after-hyperpolarization (AHP)</strong>.`,
  },
  {
    id: 'peran-na-k',
    title: '3. Peran Kanal Na+ dan K+ dalam Potensial Aksi',
    body: `Kanal Na+ voltage-gated membuka cepat saat depolarisasi (aktivasi oleh gerbang m) lalu menutup
    dengan sendirinya beberapa milidetik kemudian (inaktivasi oleh gerbang h) — kombinasi inilah yang
    membuat potensial aksi bersifat sesaat ("all-or-none"). Kanal K+ voltage-gated (gerbang n) membuka
    lebih lambat dan berperan memulihkan Vm ke nilai negatif (repolarisasi), sekaligus membatasi frekuensi
    firing neuron.`,
  },
  {
    id: 'kv11-kcna1',
    title: '4. Struktur dan Fungsi Kv1.1 serta Hubungannya dengan KCNA1',
    body: `<strong>KCNA1</strong> adalah gen yang mengkode subunit <strong>Kv1.1</strong>, salah satu kanal
    kalium voltage-gated yang diekspresikan luas di sistem saraf, termasuk di akson dan Node of Ranvier
    neuron serebelar dan perifer. Empat subunit Kv1.1 berkumpul membentuk kanal tetramer yang membentuk
    satu pori pengalir K+. Fungsi normal Kv1.1 membantu membatasi eksitabilitas neuron dan mendukung
    repolarisasi yang tepat waktu.`,
  },
  {
    id: 'ea1',
    title: '5. Episodic Ataxia Type 1 (EA1): Konteks Biologis dan Batasan Model',
    body: `EA1 adalah kondisi neurologis yang secara klinis dikaitkan dengan varian patogenik pada gen
    <strong>KCNA1</strong> (Browne et al., 1994, <em>Nature Genetics</em>). Secara konsep, gangguan fungsi
    Kv1.1 dapat mengubah eksitabilitas neuron. <strong>Simulator ini TIDAK mereproduksi mekanisme molekuler
    mutasi KCNA1 tertentu</strong> — sebagai gantinya, ia menyederhanakan "altered potassium conductance"
    sebagai penurunan parameter g_K pada model Hodgkin–Huxley klasik, semata-mata untuk mengeksplorasi
    bagaimana perubahan tersebut dapat memengaruhi bentuk potensial aksi secara matematis.`,
  },
  {
    id: 'dasar-hh',
    title: '6. Dasar Model Hodgkin–Huxley',
    body: `Model Hodgkin & Huxley (1952) menjelaskan potensial aksi pada akson raksasa cumi-cumi melalui
    persamaan rangkaian listrik: membran berperan sebagai kapasitor (C_m), dan setiap jenis kanal ion
    (Na+, K+, leak) berperan sebagai resistor variabel dengan sumber tegangan (potensial reversal).
    Variabel gerbang m, h, n adalah probabilitas pembukaan sub-unit kanal, dievolusikan mengikuti
    persamaan diferensial biasa terhadap waktu. Model ini adalah <strong>model fenomenologis
    (cocok dengan data eksperimen)</strong>, bukan turunan langsung dari struktur atom kanal.`,
  },
  {
    id: 'konduktansi-driving-force',
    title: '7. Konduktansi, Driving Force, Arus Ion, Equilibrium Potential, Gating Variables',
    body: `<strong>Konduktansi (g)</strong> mengukur seberapa mudah ion melewati membran melalui suatu jenis
    kanal (mS/cm²). <strong>Equilibrium/reversal potential (E)</strong> adalah tegangan di mana tidak ada
    arus neto untuk ion tersebut (ditentukan oleh gradien konsentrasi, melalui persamaan Nernst — di sini
    dianggap konstan). <strong>Driving force</strong> adalah selisih (V - E): semakin jauh Vm dari E,
    semakin besar dorongan ion mengalir. <strong>Arus ion (I)</strong> dihitung sebagai konduktansi efektif
    dikali driving force: I = g · (gating) · (V - E). <strong>Gating variables</strong> (m, h, n) adalah
    angka 0–1 yang merepresentasikan fraksi/probabilitas kanal berada pada keadaan yang mengizinkan aliran
    ion.`,
  },
  {
    id: 'efek-gk',
    title: '8. Bagaimana Perubahan g_K Memengaruhi Bentuk Potensial Aksi',
    body: `Menurunkan g_K mengurangi kekuatan arus K+ keluar saat repolarisasi. Efek yang secara umum
    diharapkan dari persamaan model: repolarisasi melambat, durasi potensial aksi dapat melebar, dan pada
    penurunan g_K yang besar pola firing dapat berubah (misalnya menjadi repetitif). Nilai pasti dari efek
    ini bergantung pada parameter yang dipilih pengguna pada simulasi — lihat panel Analisis untuk angka
    yang benar-benar dihitung dari simulasi Anda saat ini, bukan generalisasi di sini.`,
  },
  {
    id: 'interpretasi',
    title: '9. Interpretasi Grafik dan Hasil Perbandingan',
    body: `Saat membandingkan kondisi Normal vs Altered K+, perhatikan: (a) bentuk kurva V(t) — apakah
    lebih lebar atau lebih sempit; (b) puncak dan waktu puncak arus I_K — menunjukkan kekuatan dan
    kecepatan repolarisasi; (c) variabel gerbang n(t) — menunjukkan seberapa cepat kanal K+ merespons.
    Tabel pada panel Analisis menghitung selisih numerik langsung dari kedua simulasi, dan pernyataan yang
    ditampilkan hanya menjelaskan selisih tersebut, bukan mengklaim relevansi klinis.`,
  },
  {
    id: 'batasan',
    title: '10. Keterbatasan Simulasi',
    body: `Model ini adalah model membran satu-titik/kabel-sederhana berbasis parameter klasik akson cumi-
    cumi, bukan model neuron manusia yang detail. Ia tidak menyertakan morfologi dendritik yang kompleks,
    sinaps, jaringan neuron, maupun variasi kanal spesifik jaringan. Perubahan g_K di sini adalah
    penyederhanaan tunggal-parameter untuk tujuan edukasi, dan tidak dapat digunakan untuk memprediksi
    hasil klinis pada pasien EA1 mana pun. Bagian yang divisualisasikan sebagai struktur kanal 3D bersifat
    skematik/konseptual, bukan model struktural yang divalidasi.`,
  },
];

/** Glosarium persamaan: simbol, satuan, arti biologis, pengaruh pada simulasi. */
export const EQUATION_GLOSSARY = [
  { symbol: 'C_m', unit: 'µF/cm²', meaning: 'Kapasitansi membran — kemampuan membran menyimpan muatan listrik.', effect: 'Menentukan seberapa cepat Vm berubah untuk arus tertentu (dV/dt ∝ 1/C_m).' },
  { symbol: 'V (Vm)', unit: 'mV', meaning: 'Potensial membran — beda tegangan dalam vs luar sel.', effect: 'Variabel utama yang diplot; menentukan arah & besar driving force setiap ion.' },
  { symbol: 'I_ext', unit: 'µA/cm²', meaning: 'Arus stimulus eksternal yang disuntikkan ke akson.', effect: 'Memicu depolarisasi awal; jika di atas ambang, memicu potensial aksi.' },
  { symbol: 'g_Na, g_K, g_L', unit: 'mS/cm²', meaning: 'Konduktansi maksimum kanal Na+, K+, dan leak.', effect: 'g_K adalah parameter yang diubah untuk mensimulasikan altered K+ conductance (EA1).' },
  { symbol: 'E_Na, E_K, E_L', unit: 'mV', meaning: 'Potensial reversal (equilibrium) untuk tiap ion.', effect: 'Menentukan arah arus: ion mengalir untuk mendorong Vm menuju nilai E masing-masing.' },
  { symbol: 'm, h', unit: '0–1 (tanpa satuan)', meaning: 'Gerbang aktivasi (m) dan inaktivasi (h) kanal Na+.', effect: 'm³h menentukan fraksi kanal Na+ yang benar-benar mengalirkan arus.' },
  { symbol: 'n', unit: '0–1 (tanpa satuan)', meaning: 'Gerbang aktivasi kanal K+.', effect: 'n⁴ menentukan fraksi kanal K+ yang terbuka; direpresentasikan sebagai gerbang Kv1.1 pada visualisasi kanal.' },
  { symbol: 'α(V), β(V)', unit: '1/ms', meaning: 'Laju pembukaan (α) dan penutupan (β) gerbang, bergantung V.', effect: 'Menentukan seberapa cepat m, h, n mengejar nilai steady-state saat Vm berubah.' },
  { symbol: 'I_Na, I_K, I_L', unit: 'µA/cm²', meaning: 'Arus ionik Na+, K+, dan leak yang sebenarnya mengalir.', effect: 'Dijumlahkan (dengan I_ext) untuk menentukan dV/dt pada tiap langkah waktu.' },
];

export const LIMITATIONS = [
  'EA1 tidak sesederhana "gK diturunkan" — mekanisme molekuler yang sebenarnya jauh lebih beragam antar varian KCNA1.',
  'Tidak semua mutasi KCNA1 menurunkan konduktansi dengan besaran atau mekanisme yang sama.',
  'Model Hodgkin–Huxley klasik (m³h, n⁴) adalah pendekatan fenomenologis pada akson cumi-cumi, bukan model molekuler Kv1.1 manusia.',
  'Simulasi ini tidak merepresentasikan fisiologi pasien mana pun secara individual.',
  'Visualisasi struktur kanal 3D bersifat skematik/konseptual untuk membantu intuisi, bukan model struktural (kristalografi/krio-EM) yang tervalidasi.',
  'Konsentrasi ion tidak disimulasikan secara dinamis; potensial reversal (E_Na, E_K, E_L) diperlakukan konstan sesuai konvensi model HH klasik.',
  'Model kabel yang dipakai adalah penyederhanaan multi-segmen dengan kopling aksial seragam, bukan morfologi akson bermielin yang presisi secara anatomis.',
];
