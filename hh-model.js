/**
 * hh-model.js — Model Hodgkin–Huxley multi-kompartemen
 *
 * Mengimplementasikan persamaan Hodgkin & Huxley (1952) klasik pada
 * sejumlah segmen akson yang saling terhubung (kabel pasif sederhana),
 * sehingga potensial aksi benar-benar MERAMBAT sepanjang akson, bukan
 * animasi yang dibuat-buat.
 *
 *   C_m dV/dt = I_ext - I_Na - I_K - I_L + D * (V_kiri - 2V + V_kanan)
 *   I_Na = g_Na m^3 h (V - E_Na)
 *   I_K  = g_K  n^4   (V - E_K)
 *   I_L  = g_L (V - E_L)
 *   dm/dt = alpha_m(V)(1-m) - beta_m(V)m
 *   dh/dt = alpha_h(V)(1-h) - beta_h(V)h
 *   dn/dt = alpha_n(V)(1-n) - beta_n(V)n
 *
 * PENTING (batasan ilmiah):
 * Variabel gerbang m, h, n dan pangkat n^4 adalah pendekatan fenomenologis
 * dari Hodgkin & Huxley (1952) pada akson raksasa cumi-cumi, BUKAN model
 * molekuler kanal Kv1.1. Simulator ini memodelkan efek EA1/KCNA1 sebagai
 * penurunan konduktansi K+ maksimum (g_K) dan/atau perlambatan kinetika
 * gerbang n — sebuah cara untuk mengeksplorasi "altered potassium
 * conductance", bukan representasi mekanisme molekuler mutasi KCNA1
 * tertentu. Referensi: Hodgkin AL, Huxley AF (1952) J. Physiol. 117:500-544.
 */

export class HHModel {
  constructor(numSegments = 40) {
    this.N = numSegments;
    this.dt = 0.02; // ms — time step integrasi (Euler eksplisit, halus & stabil)

    this.params = {
      gNa: 120,      // mS/cm^2
      gK: 36,        // mS/cm^2  (diturunkan pada kondisi altered/EA1)
      gL: 0.3,       // mS/cm^2
      ENa: 50,       // mV
      EK: -77,       // mV
      EL: -54.387,   // mV
      Cm: 1.0,       // uF/cm^2
      Vrest: -65,    // mV
      Iext: 10,      // uA/cm^2
      coupling: 1.0, // kekuatan kopling aksial (kabel pasif antar segmen)
      nFactor: 1.0,  // skala kinetika gerbang n (opsional, EA1 dapat memperlambatnya)
    };

    // Kontrol stimulus
    this.stimulating = false;
    this.stimDuration = 1.0; // ms
    this.stimStartTime = -Infinity;
    this.autoStim = false;
    this.autoStimInterval = 30; // ms
    this.lastAutoStimTime = -Infinity;

    // Array status per segmen
    this.V = new Float64Array(this.N);
    this.m = new Float64Array(this.N);
    this.h = new Float64Array(this.N);
    this.n = new Float64Array(this.N);

    this.time = 0;

    // Buffer riwayat (segmen 0 = titik stimulasi, segmen tengah = pertengahan akson)
    this.historyLength = 4000;
    this.history = {
      time: new Float64Array(this.historyLength),
      V0: new Float64Array(this.historyLength),
      Vmid: new Float64Array(this.historyLength),
      m0: new Float64Array(this.historyLength),
      h0: new Float64Array(this.historyLength),
      n0: new Float64Array(this.historyLength),
      INa0: new Float64Array(this.historyLength),
      IK0: new Float64Array(this.historyLength),
      IL0: new Float64Array(this.historyLength),
    };
    this.historyIndex = 0;
    this.historySampleCounter = 0;
    this.historySampleRate = 2; // rekam setiap N langkah

    this.reset();
  }

  // ── Konstanta laju (rate constants), HH 1952 ──────────
  alphaM(V) { const dv = V + 40; if (Math.abs(dv) < 1e-7) return 1.0; return (0.1 * dv) / (1 - Math.exp(-dv / 10)); }
  betaM(V)  { return 4.0 * Math.exp(-(V + 65) / 18); }
  alphaH(V) { return 0.07 * Math.exp(-(V + 65) / 20); }
  betaH(V)  { return 1.0 / (1 + Math.exp(-(V + 35) / 10)); }
  alphaN(V) { const dv = V + 55; if (Math.abs(dv) < 1e-7) return 0.1; return (0.01 * dv) / (1 - Math.exp(-dv / 10)); }
  betaN(V)  { return 0.125 * Math.exp(-(V + 65) / 80); }

  mInf(V) { const a = this.alphaM(V); return a / (a + this.betaM(V)); }
  hInf(V) { const a = this.alphaH(V); return a / (a + this.betaH(V)); }
  nInf(V) { const a = this.alphaN(V); return a / (a + this.betaN(V)); }

  reset() {
    const Vr = this.params.Vrest;
    for (let i = 0; i < this.N; i++) {
      this.V[i] = Vr;
      this.m[i] = this.mInf(Vr);
      this.h[i] = this.hInf(Vr);
      this.n[i] = this.nInf(Vr);
    }
    this.time = 0;
    this.stimulating = false;
    this.stimStartTime = -Infinity;
    this.lastAutoStimTime = -Infinity;

    this.history.time.fill(0);
    this.history.V0.fill(Vr);
    this.history.Vmid.fill(Vr);
    this.history.m0.fill(this.mInf(Vr));
    this.history.h0.fill(this.hInf(Vr));
    this.history.n0.fill(this.nInf(Vr));
    this.history.INa0.fill(0);
    this.history.IK0.fill(0);
    this.history.IL0.fill(0);
    this.historyIndex = 0;
    this.historySampleCounter = 0;
  }

  applyStimulus() {
    this.stimulating = true;
    this.stimStartTime = this.time;
  }

  step() {
    const { gNa, gK, gL, ENa, EK, EL, Cm, Iext, coupling, nFactor } = this.params;
    const dt = this.dt;
    const N = this.N;

    if (this.autoStim && (this.time - this.lastAutoStimTime) >= this.autoStimInterval) {
      this.stimulating = true;
      this.stimStartTime = this.time;
      this.lastAutoStimTime = this.time;
    }

    const stimActive = this.stimulating && (this.time - this.stimStartTime) < this.stimDuration;
    if (!stimActive && this.stimulating && !this.autoStim) this.stimulating = false;

    const newV = new Float64Array(N);

    for (let i = 0; i < N; i++) {
      const V = this.V[i];
      const m_val = this.m[i];
      const h_val = this.h[i];
      const n_val = this.n[i];

      const m3h = m_val * m_val * m_val * h_val;
      const n4 = n_val * n_val * n_val * n_val;
      const INa = gNa * m3h * (V - ENa);
      const IK = gK * n4 * (V - EK);
      const IL = gL * (V - EL);

      let Ie = 0;
      if (stimActive && i < 2) Ie = Iext;

      let Idiff = 0;
      if (i > 0) Idiff += this.V[i - 1] - V;
      if (i < N - 1) Idiff += this.V[i + 1] - V;

      newV[i] = V + dt * (Ie - INa - IK - IL + coupling * Idiff) / Cm;

      const am = this.alphaM(V), bm = this.betaM(V);
      const ah = this.alphaH(V), bh = this.betaH(V);
      const an = this.alphaN(V) * nFactor, bn = this.betaN(V) * nFactor;

      this.m[i] += dt * (am * (1 - m_val) - bm * m_val);
      this.h[i] += dt * (ah * (1 - h_val) - bh * h_val);
      this.n[i] += dt * (an * (1 - n_val) - bn * n_val);

      this.m[i] = Math.max(0, Math.min(1, this.m[i]));
      this.h[i] = Math.max(0, Math.min(1, this.h[i]));
      this.n[i] = Math.max(0, Math.min(1, this.n[i]));

      if (i === 0) {
        const idx = this.historyIndex % this.historyLength;
        this._pendingINa = INa; this._pendingIK = IK; this._pendingIL = IL;
      }
    }

    this.V.set(newV);
    this.time += dt;

    this.historySampleCounter++;
    if (this.historySampleCounter >= this.historySampleRate) {
      this.historySampleCounter = 0;
      this.recordHistory();
    }
  }

  recordHistory() {
    const idx = this.historyIndex % this.historyLength;
    const { gNa, gK, gL, ENa, EK, EL } = this.params;

    this.history.time[idx] = this.time;
    this.history.V0[idx] = this.V[0];
    this.history.Vmid[idx] = this.V[Math.floor(this.N / 2)];
    this.history.m0[idx] = this.m[0];
    this.history.h0[idx] = this.h[0];
    this.history.n0[idx] = this.n[0];

    const V = this.V[0], m_val = this.m[0], h_val = this.h[0], n_val = this.n[0];
    this.history.INa0[idx] = gNa * m_val * m_val * m_val * h_val * (V - ENa);
    this.history.IK0[idx] = gK * n_val * n_val * n_val * n_val * (V - EK);
    this.history.IL0[idx] = gL * (V - EL);

    this.historyIndex++;
  }

  runSteps(count) {
    for (let i = 0; i < count; i++) this.step();
  }

  /** Konduktansi K+ instan (mS/cm^2) pada segmen 0 — untuk visualisasi kanal. */
  getInstantGK() {
    const n_val = this.n[0];
    return this.params.gK * n_val * n_val * n_val * n_val;
  }

  /** Probabilitas "terbuka" kanal K+ (n^4), 0..1 — bukan struktur molekuler nyata. */
  getKOpenProbability() {
    const n_val = this.n[0];
    return n_val * n_val * n_val * n_val;
  }

  /**
   * Mengembalikan salinan riwayat segmen-0 sebagai larik terurut (bukan ring
   * buffer) untuk dipakai oleh modul analysis.js. Aman dipanggil kapan saja.
   */
  getSeries() {
    const total = Math.min(this.historyIndex, this.historyLength);
    const start = this.historyIndex > this.historyLength ? this.historyIndex % this.historyLength : 0;
    const t = new Float64Array(total), V = new Float64Array(total);
    const INa = new Float64Array(total), IK = new Float64Array(total), IL = new Float64Array(total);
    const m = new Float64Array(total), h = new Float64Array(total), n = new Float64Array(total);
    for (let i = 0; i < total; i++) {
      const idx = (start + i) % this.historyLength;
      t[i] = this.history.time[idx];
      V[i] = this.history.V0[idx];
      m[i] = this.history.m0[idx];
      h[i] = this.history.h0[idx];
      n[i] = this.history.n0[idx];
      INa[i] = this.history.INa0[idx];
      IK[i] = this.history.IK0[idx];
      IL[i] = this.history.IL0[idx];
    }
    return { t, V, m, h, n, INa, IK, IL };
  }
}
