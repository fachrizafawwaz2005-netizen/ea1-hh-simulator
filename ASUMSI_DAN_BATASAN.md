# Asumsi Model & Batasan Ilmiah

## Asumsi Model

1. **Model dasar**: Persamaan Hodgkin & Huxley (1952) klasik pada akson
   raksasa cumi-cumi — C_m, g_Na, g_K, g_L, E_Na, E_K, E_L, dan variabel
   gerbang m (aktivasi Na+), h (inaktivasi Na+), n (aktivasi K+), dengan
   konstanta laju α/β standar dari publikasi asli.
2. **Struktur spasial**: Akson direpresentasikan sebagai kabel 50 segmen
   dengan kopling aksial seragam (bukan morfologi bermielin yang presisi
   secara anatomis maupun difusi ion yang eksplisit). Ini cukup untuk
   menunjukkan perambatan potensial aksi searah sepanjang akson.
3. **Integrasi numerik**: Metode Euler eksplisit dengan langkah waktu (dt)
   yang dapat diatur pengguna (0.01–0.05 ms), cukup halus untuk kestabilan
   numerik pada rentang parameter yang disediakan slider.
4. **Representasi EA1/KCNA1**: Efek "altered potassium conductance" pada
   EA1 disederhanakan sebagai penurunan parameter g_K tunggal. Ini adalah
   **penyederhanaan tunggal-parameter**, bukan model molekuler dari varian
   KCNA1 tertentu.
5. **Potensial reversal konstan**: E_Na, E_K, E_L diperlakukan konstan
   (tidak bergantung pada perubahan konsentrasi ion dari waktu ke waktu),
   sesuai konvensi model HH klasik.
6. **Visualisasi kanal 3D**: Bentuk bilayer lipid, kanal Na+/K+/leak,
   gerbang, dan filter selektivitas pada bagian "Kanal Ion" adalah
   **ilustrasi konseptual/skematik** untuk membantu intuisi tentang lokasi
   dan fungsi kanal — bukan model struktural yang divalidasi (mis. bukan
   dari data kristalografi atau krio-EM Kv1.1 yang sebenarnya).

## Batasan Ilmiah (ditampilkan juga di aplikasi, bagian "Tentang")

- EA1 tidak sesederhana "g_K diturunkan" — mekanisme molekuler yang
  sebenarnya jauh lebih beragam antar varian KCNA1.
- Tidak semua mutasi KCNA1 menurunkan konduktansi dengan besaran atau
  mekanisme yang sama; sebagian varian bahkan dapat memengaruhi trafficking
  atau kinetika channel dengan cara yang berbeda dari sekadar "g_K turun".
- Model Hodgkin–Huxley klasik (m³h, n⁴) adalah pendekatan fenomenologis
  hasil fitting pada akson cumi-cumi, bukan model molekuler Kv1.1 manusia.
- Simulasi ini tidak merepresentasikan fisiologi pasien mana pun secara
  individual, dan tidak boleh digunakan untuk membuat kesimpulan klinis.
- Visualisasi struktur kanal 3D bersifat skematik/konseptual, bukan model
  struktural yang tervalidasi secara ilmiah.
- Konsentrasi ion tidak disimulasikan secara dinamis; lihat asumsi #5 di
  atas.
- Model kabel yang dipakai adalah penyederhanaan multi-segmen dengan
  kopling aksial seragam, bukan morfologi akson bermielin yang presisi
  secara anatomis (variasi diameter, distribusi kanal riil di internodus
  vs Node of Ranvier, dsb. tidak dimodelkan secara detail).
- Tidak ada data eksperimen, angka klinis, atau referensi jurnal yang
  dikarang di dalam aplikasi ini; teks materi edukasi merujuk pada
  publikasi yang telah dipublikasikan secara luas (Hodgkin & Huxley 1952;
  Browne et al. 1994) tanpa mengklaim angka baru.

## Cakupan yang Sengaja Dibatasi

Sesuai permintaan proyek, simulator ini **hanya** mencakup dua kondisi:
Normal dan Altered K+ Conductance (EA1-inspired). Kondisi penyakit lain
yang ada pada versi dashboard sebelumnya (Multiple Sclerosis, Guillain-Barré
Syndrome, Neuropati Diabetik, Hiperkalemia) **telah dihapus sepenuhnya**
dari kode sumber pada rebuild ini karena berada di luar topik proyek
(disfungsi kanal kalium Kv1.1 pada EA1).
