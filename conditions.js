/**
 * conditions.js — Preset kondisi eksperimen
 *
 * Cakupan proyek dibatasi HANYA pada dua kondisi yang relevan dengan topik
 * EA1/KCNA1: Normal dan Altered K+ Conductance (EA1). Tidak ada kondisi
 * penyakit lain (mis. diabetes, neuropati umum, MS, GBS, Alzheimer) dalam
 * simulator ini.
 *
 * Referensi biologis:
 * - Browne DL et al. (1994) "Episodic ataxia/myokymia syndrome is
 *   associated with point mutations in KCNA1" Nature Genetics 8:136-140
 * - Hodgkin AL, Huxley AF (1952) J. Physiol. 117:500-544
 */

export const CONDITIONS = {
  normal: {
    id: 'normal',
    name: 'Normal',
    color: '#2563EB',
    description:
      'Neuron dengan konduktansi K+ pada nilai baseline klasik Hodgkin–Huxley (g_K = 36 mS/cm²). Merepresentasikan fungsi Kv1.1 yang tidak terganggu.',
    params: {
      gNa: 120, gK: 36, gL: 0.3,
      ENa: 50, EK: -77, EL: -54.387,
      Cm: 1.0, Vrest: -65, Iext: 10,
      coupling: 1.0, nFactor: 1.0,
    },
  },

  altered: {
    id: 'altered',
    name: 'Altered K+ (EA1)',
    color: '#A70B27',
    description:
      'Konduktansi K+ maksimum diturunkan untuk mengeksplorasi efek "altered potassium conductance" yang relevan dengan disfungsi Kv1.1 pada EA1. Nilai g_K diatur melalui slider, bukan struktur mutasi tertentu.',
    params: {
      gNa: 120, gK: 16, gL: 0.3,
      ENa: 50, EK: -77, EL: -54.387,
      Cm: 1.0, Vrest: -65, Iext: 10,
      coupling: 1.0, nFactor: 1.0,
    },
  },
};

/** Metadata slider untuk parameter yang boleh diubah pengguna. */
export const PARAM_META = {
  gK:      { label: 'Konduktansi K+ (g_K)', unit: 'mS/cm²', min: 1,   max: 36,  step: 0.5, default: 16 },
  Iext:    { label: 'Arus Stimulus (I_ext)', unit: 'µA/cm²', min: 0,  max: 30,  step: 0.5, default: 10 },
  duration:{ label: 'Durasi Simulasi',       unit: 'ms',     min: 20, max: 200, step: 5,   default: 50 },
  speed:   { label: 'Kecepatan Simulasi',    unit: 'x',      min: 0.1,max: 4,   step: 0.1, default: 1 },
};

export const GK_BASELINE_NORMAL = 36;
