/**
 * recorder.js — Perekam data eksperimen (lapisan UI, TIDAK mengubah model).
 * Memanggil model.step() yang sama persis dengan HHModel.runSteps(), lalu menyalin
 * nilai yang SUDAH dihitung model (model.history & model.V) setiap kali model merekam sampel.
 * Tujuan: riwayat penuh (bukan hanya ring-buffer 4000 sampel), Vm per segmen untuk time-cursor
 * dan pemilihan segmen, serta penanda stimulus/perubahan parameter.
 */
export class Recorder {
  constructor(model, cap = 40000) {
    this.m = model; this.cap = cap; this.N = model.N;
    this.t = new Float64Array(cap);
    this.f = {};
    for (const k of ['V0', 'Vmid', 'm', 'h', 'n', 'INa', 'IK', 'IL']) this.f[k] = new Float64Array(cap);
    this.segV = new Float32Array(cap * this.N);
    this.reset();
  }
  reset() { this.n = 0; this.stims = []; this.marks = []; this._ls = -Infinity; this.full = false; }
  step(count) {
    const m = this.m, h = m.history, L = m.historyLength;
    for (let i = 0; i < count; i++) {
      if (this.n >= this.cap) { this.full = true; return false; }
      const before = m.historyIndex;
      m.step();
      if (m.stimStartTime !== this._ls && isFinite(m.stimStartTime)) {
        this._ls = m.stimStartTime; this.stims.push({ t0: m.stimStartTime, t1: m.stimStartTime + m.stimDuration });
      }
      if (m.historyIndex !== before) {
        const idx = (m.historyIndex - 1) % L, k = this.n;
        this.t[k] = h.time[idx];
        this.f.V0[k] = h.V0[idx]; this.f.Vmid[k] = h.Vmid[idx];
        this.f.m[k] = h.m0[idx]; this.f.h[k] = h.h0[idx]; this.f.n[k] = h.n0[idx];
        this.f.INa[k] = h.INa0[idx]; this.f.IK[k] = h.IK0[idx]; this.f.IL[k] = h.IL0[idx];
        this.segV.set(m.V, k * this.N);
        this.n++;
      }
    }
    return true;
  }
  T() { return this.t.subarray(0, this.n); }
  arr(k) { return this.f[k].subarray(0, this.n); }
  /** format yang dipakai analysis.js: {t,V,INa,IK,...} */
  series() { return { t: this.T(), V: this.arr('V0'), INa: this.arr('INa'), IK: this.arr('IK'), IL: this.arr('IL'), m: this.arr('m'), h: this.arr('h'), n: this.arr('n') }; }
  indexAt(tq) {
    let lo = 0, hi = this.n - 1;
    if (hi < 0) return -1;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (this.t[mid] < tq) lo = mid + 1; else hi = mid; }
    if (lo > 0 && Math.abs(this.t[lo - 1] - tq) < Math.abs(this.t[lo] - tq)) lo--;
    return lo;
  }
  snap(k) { return this.segV.subarray(k * this.N, (k + 1) * this.N); }
  segTrace(seg) { const o = new Float32Array(this.n); for (let i = 0; i < this.n; i++) o[i] = this.segV[i * this.N + seg]; return o; }
}
