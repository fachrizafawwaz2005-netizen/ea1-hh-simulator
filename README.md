# EA1 Neuron Simulator 3D — Hodgkin–Huxley (edukatif)

Simulator edukatif model membran Hodgkin–Huxley (50 segmen terkopel) untuk membandingkan kondisi **Normal** (g_K = 36 mS/cm²) dan **Altered K⁺** (g_K diatur slider). Ini bukan model molekuler mutasi KCNA1 dan bukan model klinis EA1.

## Cara menjalankan (offline)
1. Ekstrak ZIP, masuk ke folder `EA1_HH_Simulator`.
2. Jalankan server lokal (perlu Python 3):
   - Windows: klik dua kali `jalankan.bat`
   - Terminal: `python server.py`
3. Buka browser ke **http://127.0.0.1:3000** (atau http://localhost:3000).
Tidak memerlukan internet; Three.js sudah ada di `js/vendor/`. Gunakan Chrome/Edge/Firefox terbaru dengan WebGL aktif.

## Alur eksperimen singkat
Simulasi Neuron 3D → pilih mode → atur g_K/I_ext/dt → **Jalankan** / **Beri Stimulus** → gerakkan kursor pada grafik atau klik segmen akson → buka **Hasil & Grafik** untuk arus ion, gerbang, perbandingan, dan **Ekspor CSV**.

Dokumen lain: `LAPORAN_PERUBAHAN.md` (perubahan, bug, keterbatasan), `PANDUAN_KONTROL.md`, `ASUMSI_DAN_BATASAN.md`.
