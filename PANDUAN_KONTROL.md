# Panduan Kontrol & Fitur

## Navigasi (sidebar kiri)

| Bagian | Isi |
|---|---|
| Beranda | Konteks biologis EA1/KCNA1/Kv1.1, pemilih kondisi untuk grafik & analisis |
| Simulasi Neuron 3D | Viewport neuron 3D + seluruh panel kontrol eksperimen |
| Kanal Ion Kv1.1 | Viewport zoom kanal ion 3D + pembacaan numerik kanal |
| Hasil & Grafik | Grafik V(t), arus ionik, variabel gerbang, dan panel perbandingan |
| Analisis | Metrik potensial aksi otomatis + temuan mode Bandingkan |
| Parameter | Tabel parameter Hodgkin–Huxley yang sedang aktif |
| Materi Edukasi | Materi dari nol (anatomi neuron s.d. batasan model) + glosarium persamaan |
| Tentang | Deskripsi proyek & daftar keterbatasan ilmiah |

## Pemilih Kondisi (Beranda)

- **Normal** — grafik/analisis memakai model dengan g_K = 36 mS/cm² (baseline tetap).
- **Altered K+ (EA1)** — grafik/analisis memakai model dengan g_K sesuai slider (default 16 mS/cm²).
- **Bandingkan** — mengisi grafik overlay dan tabel perbandingan Normal vs Altered K+ di bagian Hasil & Grafik, serta daftar temuan otomatis di bagian Analisis.

Kedua model (Normal & Altered) **selalu berjalan bersamaan** di latar
belakang ketika simulasi di-Play, sehingga berpindah antar kondisi maupun
membuka mode Bandingkan tidak memerlukan menjalankan ulang simulasi.

## Sakelar Tampilan 3D (di panel Simulasi & Kanal Ion)

Setiap viewport 3D punya sakelar kecil "Normal / Altered K+" sendiri, karena
menampilkan dua model 3D penuh secara bersamaan akan membuat layar padat dan
sulit dibaca. Sakelar ini **independen** dari pemilih kondisi grafik di atas
— Anda bisa, misalnya, melihat grafik mode Bandingkan sambil viewport 3D
menampilkan kondisi Altered K+ saja.

## Panel Kontrol Eksperimen (Simulasi Neuron 3D)

- **Konduktansi K+ altered (g_K)** — slider 1–36 mS/cm². Hanya memengaruhi
  model Altered K+; model Normal tetap pada baseline 36 mS/cm².
- **Arus stimulus (I_ext)** — kekuatan stimulus yang disuntikkan ke 2 segmen
  pertama akson, berlaku untuk kedua model.
- **Time step integrasi (dt)** — langkah waktu numerik (ms); nilai lebih
  kecil = lebih presisi tapi sedikit lebih berat secara komputasi.
- **Jendela tampilan grafik** — lebar jendela waktu (ms) yang ditampilkan
  pada grafik yang bergulir (rolling window); tidak menghentikan simulasi.
- **Kecepatan simulasi** — mempercepat/memperlambat berapa banyak langkah
  waktu diproses per frame render (0.1×–4×).
- **Jalankan / Jeda** — memulai atau menjeda integrasi numerik pada kedua
  model.
- **Beri Stimulus** — memicu satu pulsa stimulus singkat (1 ms) pada waktu
  saat ini; otomatis menjalankan simulasi jika sedang jeda.
- **Reset** — mengembalikan kedua model ke kondisi awal (t = 0) dan
  mengosongkan grafik.
- **Stimulus otomatis berulang (30 ms)** — jika dicentang, model akan
  menerima stimulus baru setiap 30 ms secara otomatis (berguna untuk
  mengamati pola firing berulang).

## Panel Pembacaan Kanal (Kanal Ion Kv1.1)

Empat kuantitas ditampilkan terpisah agar tidak tertukar:

1. **Konduktansi maks. (g_K)** — parameter model (mS/cm²), tetap selama
   simulasi berjalan (kecuali Anda menggeser slider g_K).
2. **Konduktansi instan (g_K · n⁴)** — konduktansi efektif saat ini,
   memperhitungkan fraksi kanal yang benar-benar terbuka.
3. **Probabilitas keadaan terbuka (n⁴)** — angka 0–1, murni dari variabel
   gerbang model, tanpa satuan.
4. **Arus K+ (I_K)** — hasil akhir yang juga bergantung pada driving force
   (V − E_K), dalam µA/cm².

Baris "Konsentrasi ion" sengaja ditulis **"tidak disimulasikan dinamis"**
karena model Hodgkin–Huxley klasik bekerja pada level konduktansi/potensial
reversal, bukan konsentrasi ion yang berubah terhadap waktu.
