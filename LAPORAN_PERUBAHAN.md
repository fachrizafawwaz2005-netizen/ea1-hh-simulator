# Laporan Perubahan Redesign

## 1. Pernyataan integritas model
**Model matematis TIDAK diubah.** Byte-identik dengan aslinya (diverifikasi `cmp`): `js/hh-model.js`, `js/conditions.js`, `js/analysis.js`, `js/content.js`, `js/channel-3d.js`, `server.py`. Persamaan HH, fungsi alpha/beta, Euler eksplisit, dt, kondisi awal, stimulus (segmen 0–1, 1 ms, auto 30 ms), kopling, dan g_K Altered tidak disentuh.
Uji Node: `Recorder` menjalankan `model.step()` yang sama; 1500 sampel identik dengan `model.getSeries()` (selisih maks 0, state akhir sama persis).
Satu-satunya perubahan pada file visual 3D: `neuron-3d.js` — opasitas selubung mielin 0.55 → 0.28 (2 baris, murni tampilan).

## 2. Perubahan desain & fitur
- Header: model aktif, status (Siap/Berjalan/Jeda/Berhenti/Error), waktu model (ms) terpisah dari playback, parameter aktif.
- Simulasi 3D: 3D + grafik Vm langsung + kontrol dalam satu halaman; legenda warna mV; penanda stimulus & Kv1.1 (berlabel ilustratif); kamera diperbaiki; pesan bila WebGL gagal.
- Kontrol dikelompokkan: "Parameter model (numerik)" vs "Tampilan (tidak mengubah hasil)"; tooltip; tombol default; ringkasan eksperimen; pemilih mode Normal/Altered/Bandingkan tersedia di Simulasi dan Hasil.
- Klik segmen 3D → Vm aktual Normal & Altered; kursor grafik tersinkron ke semua grafik dan 3D (rekaman per segmen).
- Hasil & Grafik: grafik besar dengan sumbu+satuan, tick waktu, legenda, tooltip, bayangan stimulus, penanda perubahan parameter; arus ion dengan pilihan I_Na/I_K/I_L dan skala otomatis; gerbang 0–1; perbandingan dua simulasi terpisah + tabel selisih; status potensial aksi; ekspor CSV (kolom + satuan + timestamp model).
- Jendela grafik sekarang benar-benar berfungsi.

## 3. Fitur lama dipertahankan
Semua 8 halaman (Beranda, Simulasi, Kanal Kv1.1, Hasil, Analisis, Parameter, Materi, Tentang), semua slider/tombol, autostim, tiga mode, sakelar 3D, kanal 3D, metrik, temuan, glosarium.

## 4. Bug/temuan
| # | Lokasi | Temuan | Tindakan |
|---|---|---|---|
| 1 | charts.js | Skala arus tetap −600..1800, gerbang/arus kecil terlihat datar; sumbu X tanpa waktu | Diganti skala otomatis + sumbu waktu (UI) |
| 2 | main.js | Grafik hanya digambar saat *playing*; canvas tersembunyi tidak berukuran → kosong/terhapus saat pindah halaman atau jeda | Render berbasis dirty-flag pada halaman aktif |
| 3 | main.js | Mode Bandingkan mengharuskan ke Beranda; grafik/tabel kosong sebelum itu | Selector di semua halaman; tabel selalu terisi |
| 4 | main.js | Mode "compare" menampilkan grafik tunggal Altered berwarna biru | Kini overlay dua kondisi |
| 5 | main.js | Slider jendela grafik tidak terhubung | Dihubungkan |
| 6 | main.js | Metrik bermode compare memakai Altered; metrik memakai ring buffer 160 ms (resting salah setelah wrap) | Metrik dari rekaman penuh; fungsi analysis.js tak diubah |
| 7 | main.js | Status "Berjalan" tanpa cek kegagalan | Cek NaN/Infinity → status Error |
| 8 | hh-model.js | **Tidak diubah (untuk persetujuan):** baris `const idx` dan `_pendingINa/K/L` di `step()` tidak dipakai (kode mati, tanpa dampak numerik); gating di-clamp [0,1] (perilaku asli) | Hanya didokumentasikan |
| 9 | model | Ring buffer model 4000 sampel; recorder UI menyimpan hingga 40000 sampel (~1600 ms pada dt 0,02) lalu berhenti dengan pesan | Batas terdokumentasi |
| 10 | model/UI | Mengubah g_K/I_ext/dt saat berjalan langsung berlaku (perilaku asli) | Ditandai pada grafik + peringatan, saran Reset |

## 5. Belum selesai / belum diuji
- **Sudah diuji (Chromium headless, WebGL software, 1366×768):** Run, Jeda/Lanjutkan, Reset, mode Bandingkan, navigasi ke Hasil, grafik terisi, tabel perbandingan, tanpa error JS.
- **Belum diuji:** Beri Stimulus manual & stimulus otomatis di UI, klik-pilih segmen 3D, hover time-cursor, unduhan CSV, sakelar 3D Altered, halaman Kanal/Analisis/Parameter/Materi setelah perubahan, resolusi 1440×900 dan layar kecil, GPU WebGL nyata.
- Halaman Beranda, Kanal, Analisis, Parameter, Materi, Tentang: isi tidak diubah; restyling konsisten hanya melalui CSS bersama, **belum dirombak mendalam**.
- Tidak dibuat: heatmap ruang-waktu, panel arus terpisah per jenis (diganti checkbox).
- Sinkronisasi 3D↔grafik memakai rekaman `model.V` per segmen; grafik utama tetap segmen 0.
- Konten edukasi tidak diaudit ulang untuk kesalahan ilmiah.

## Revisi header (putaran 2)
- **Penyebab:** header satu baris flex berisi 6 elemen tanpa `flex-wrap`/`min-width:0`, label rata-kanan, nilai panjang tanpa lebar tetap, dan pesan batas rekaman ditulis ke `#status-text` (menjejali baris yang sama).
- **Perbaikan:** dua baris. Baris 1: judul + subtitle | tombol Bandingkan, badge kondisi, status simulasi (semua tinggi 34 px, sejajar). Baris 2: 4 kartu (Waktu simulasi, Parameter aktif g_K/I_ext/dt, Playback, Status rekaman) dengan CSS Grid; 2 kolom di <1240 px, 1 kolom di <640 px.
- Tombol Bandingkan di header memakai class/atribut yang sama (`.cond-btn[data-condition=compare]`) sehingga tersinkron dengan tombol mode lain. Semua nilai berasal dari state (model, recorder); `#status-text` kini hanya label singkat, pesan panjang di kartu Status rekaman.
- Header tidak lagi sticky (hemat tinggi layar 768 px). Model/algoritma tidak disentuh (file model tetap identik).
- Diuji Chromium headless: 1366×768, 1440×900, 1024×768, 600×800 — tanpa overlap, tanpa teks terpotong, tanpa scroll horizontal; tombol Bandingkan, Jalankan, Reset, dan pesan batas rekaman diuji (batas rekaman diuji dengan menurunkan `cap` lewat konsol agar cepat).
