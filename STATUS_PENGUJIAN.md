# Status Pengujian (Jujur & Apa Adanya)

Lingkungan tempat proyek ini dibangun **tidak memiliki browser dengan
tampilan grafis (GUI) atau WebGL** — hanya lingkungan baris perintah (server
+ Node.js untuk verifikasi logika). Karena itu, pengujian dibagi menjadi dua
kelompok: yang **benar-benar dijalankan dan diverifikasi**, dan yang
**belum sempat diuji secara visual di browser sungguhan** dan sebaiknya Anda
periksa sendiri setelah menjalankan `python server.py`.

## ✅ Sudah Diuji & Diverifikasi

- **Kebenaran & kestabilan model HH**: dijalankan langsung dengan Node.js
  (bukan hanya dibaca) untuk kondisi Normal dan Altered K+, termasuk
  simulasi sepanjang 300 ms tanpa NaN/ledakan numerik. Hasil kualitatif
  sesuai literatur: g_K yang lebih rendah → durasi AP lebih lebar,
  repolarisasi lebih lambat, arus I_K puncak lebih kecil, dan kecenderungan
  firing berulang — konsisten dengan efek altered K+ conductance yang
  diharapkan secara teoritis dari persamaan model.
- **Perhitungan metrik & perbandingan** (`analysis.js`): diuji dengan data
  hasil simulasi Node di atas; menghasilkan angka dan pernyataan yang masuk
  akal dan konsisten dengan data (tidak ada nilai hardcode).
- **Validitas sintaks seluruh modul JavaScript baru/ubahan**: `hh-model.js`,
  `conditions.js`, `analysis.js`, `content.js`, `charts.js`, `neuron-3d.js`,
  `channel-3d.js`, `main.js` — semua lolos pemeriksaan sintaks Node.js
  (`node --check`), tidak ada kesalahan sintaks.
- **Semua path file yang dirujuk index.html/main.js**: diverifikasi dapat
  diakses (HTTP 200) melalui `python server.py` yang sama seperti yang akan
  Anda jalankan — termasuk `js/vendor/three/build/three.module.js` dan
  `js/vendor/three/examples/jsm/controls/OrbitControls.js` — sehingga tidak
  ada 404 untuk modul inti.
- **Kecocokan seluruh ID elemen DOM**: setiap `id` yang diakses oleh
  `main.js` (34 total) dicocokkan secara otomatis dengan `id` yang benar-
  benar ada di `index.html` — tidak ada referensi yang hilang.
- **Versi Three.js yang disertakan** (r162) dikonfirmasi mendukung seluruh
  kelas yang dipakai (`CapsuleGeometry`, `ArrowHelper`, `OrbitControls`,
  `TorusGeometry`, dll.).
- **Tidak ada sisa fitur/istilah penyakit di luar topik**: dicek dengan
  pencarian teks bahwa tidak ada lagi referensi ke Multiple Sclerosis,
  Guillain-Barré, neuropati diabetik, Alzheimer, atau hiperkalemia di dalam
  kode sumber baru.

## ⚠️ Belum Diuji Secara Visual di Browser Sungguhan

Karena tidak ada browser/WebGL di lingkungan pembuatan proyek ini, hal-hal
berikut **secara logika sudah benar berdasarkan tinjauan kode**, tetapi
**belum dikonfirmasi secara visual** — mohon periksa saat pertama kali
menjalankan aplikasi:

- Tampilan render 3D neuron dan render 3D kanal ion (bentuk, pencahayaan,
  proporsi) — apakah terlihat sesuai harapan dan tidak ada elemen yang
  saling menutupi atau keluar dari bingkai viewport.
- Interaksi mouse: putar (drag), zoom (scroll) pada kedua viewport 3D via
  OrbitControls.
- Perilaku resize saat jendela browser diubah ukurannya atau saat
  berpindah antar tab sidebar (apakah canvas 3D dan grafik menyesuaikan
  ukuran dengan benar).
- Tampilan seluruh slider, tombol, dan toggle secara visual (warna, ukuran,
  keterbacaan) pada berbagai lebar layar (desktop vs layar sempit).
- Frame rate / performa render dua scene Three.js secara bersamaan pada
  perangkat dengan spesifikasi rendah.
- Perilaku actual browser terhadap ES module `import`/`export` dan
  `importmap` pada Chrome/Edge/Firefox versi yang Anda pakai (diverifikasi
  benar secara sintaks dan path, tetapi belum dijalankan di mesin JavaScript
  browser sungguhan).

## Rekomendasi

Setelah menjalankan `python server.py` dan membuka `http://127.0.0.1:3000`,
mohon periksa Console browser (tombol F12 → tab Console) untuk memastikan
tidak ada error merah. Jika ada error yang muncul, itu adalah hal pertama
yang perlu diperbaiki, dan pesan error tersebut akan sangat membantu untuk
diagnosis lebih lanjut.
