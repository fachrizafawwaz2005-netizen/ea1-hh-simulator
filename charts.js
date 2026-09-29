/**
 * charts.js — Grafik Canvas 2D ilmiah: sumbu berlabel + satuan, tick waktu, legenda, tooltip,
 * time-cursor tersinkron, bayangan stimulus, penanda perubahan parameter.
 * Menggambar HANYA dari larik hasil model (lihat recorder.js). Tidak ada data dummy.
 */
const bs = (t, x) => { let lo = 0, hi = t.length; while (lo < hi) { const m = (lo + hi) >> 1; if (t[m] < x) lo = m + 1; else hi = m; } return lo; };
function nice(range, target) {
  const raw = range / Math.max(1, target), p = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / p;
  return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * p;
}
export class Charts {
  constructor(ids) {
    this.c = {}; this.lay = {}; this.cursorT = null; this.onCursor = null;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    for (const [k, id] of Object.entries(ids)) {
      const cv = document.getElementById(id); if (!cv) continue;
      this.c[k] = cv;
      cv.addEventListener('mousemove', (e) => {
        const L = this.lay[k]; if (!L) return;
        const x = e.clientX - cv.getBoundingClientRect().left;
        if (x < L.pad.l || x > L.pad.l + L.pw) return this.onCursor && this.onCursor(null);
        this.onCursor && this.onCursor(L.t0 + (x - L.pad.l) / L.pw * (L.t1 - L.t0));
      });
      cv.addEventListener('mouseleave', () => this.onCursor && this.onCursor(null));
    }
  }
  /** s: {series:[{t,y,color,label,dash,unit}], win, tEnd, yMin,yMax (opsional=auto), yLabel, cursor, stims, marks, decimals, zero, empty} */
  plot(key, s) {
    const cv = this.c[key]; if (!cv) return;
    const r = cv.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return;
    const W = Math.round(r.width * this.dpr), H = Math.round(r.height * this.dpr);
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    const x = cv.getContext('2d'); x.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const w = r.width, h = r.height, pad = { l: 64, r: 14, t: 14, b: 44 };
    const pw = w - pad.l - pad.r, ph = h - pad.t - pad.b;
    x.clearRect(0, 0, w, h);
    const t0 = Math.max(0, s.tEnd - s.win), t1 = Math.max(s.win, s.tEnd);
    const vis = s.series.map((q) => ({ q, a: bs(q.t, t0), b: bs(q.t, t1 + 1e-9) }));
    let { yMin, yMax } = s;
    if (yMin == null) {
      let lo = Infinity, hi = -Infinity;
      for (const { q, a, b } of vis) for (let i = a; i < b; i++) { const v = q.y[i]; if (isFinite(v)) { if (v < lo) lo = v; if (v > hi) hi = v; } }
      if (!isFinite(lo)) { lo = -1; hi = 1; }
      if (s.zero) { lo = Math.min(lo, 0); hi = Math.max(hi, 0); }
      const span = Math.max(hi - lo, 1e-6), st = nice(span * 1.16, 5);
      yMin = Math.floor((lo - span * 0.06) / st) * st; yMax = Math.ceil((hi + span * 0.06) / st) * st;
    }
    const yStep = nice(yMax - yMin, 6), xStep = nice(t1 - t0, 8);
    const X = (t) => pad.l + (t - t0) / (t1 - t0) * pw, Y = (v) => pad.t + ph * (1 - (v - yMin) / (yMax - yMin));
    this.lay[key] = { pad, pw, t0, t1 };
    x.fillStyle = '#FBFCFE'; x.fillRect(pad.l, pad.t, pw, ph);
    for (const st of s.stims || []) { // jendela stimulus
      const a = Math.max(t0, st.t0), b = Math.min(t1, st.t1); if (b <= a) continue;
      x.fillStyle = 'rgba(245,158,11,0.16)'; x.fillRect(X(a), pad.t, Math.max(2, X(b) - X(a)), ph);
    }
    x.font = '12px Inter, "Segoe UI", sans-serif'; x.fillStyle = '#475569'; x.strokeStyle = '#E6EBF2'; x.lineWidth = 1;
    x.textAlign = 'right'; x.textBaseline = 'middle';
    for (let v = Math.ceil(yMin / yStep) * yStep; v <= yMax + 1e-9; v += yStep) {
      const y = Y(v); x.beginPath(); x.moveTo(pad.l, y); x.lineTo(pad.l + pw, y); x.stroke();
      x.fillText(String(+v.toFixed(6)), pad.l - 6, y);
    }
    x.textAlign = 'center'; x.textBaseline = 'top';
    for (let v = Math.ceil(t0 / xStep) * xStep; v <= t1 + 1e-9; v += xStep) {
      const px = X(v); x.beginPath(); x.moveTo(px, pad.t); x.lineTo(px, pad.t + ph); x.stroke(); x.fillText(String(+v.toFixed(6)), px, pad.t + ph + 5);
    }
    if (s.zero !== false && yMin < 0 && yMax > 0) { x.strokeStyle = '#94A3B8'; x.setLineDash([4, 4]); x.beginPath(); x.moveTo(pad.l, Y(0)); x.lineTo(pad.l + pw, Y(0)); x.stroke(); x.setLineDash([]); }
    x.strokeStyle = '#CBD5E1'; x.strokeRect(pad.l, pad.t, pw, ph);
    x.fillStyle = '#1E293B'; x.font = '600 12px Inter, "Segoe UI", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'alphabetic';
    x.fillText('Waktu simulasi (ms)', pad.l + pw / 2, h - 6);
    x.save(); x.translate(15, pad.t + ph / 2); x.rotate(-Math.PI / 2); x.fillText(s.yLabel || '', 0, 0); x.restore();
    for (const mk of s.marks || []) if (mk >= t0 && mk <= t1) { x.strokeStyle = '#D97706'; x.setLineDash([2, 3]); x.beginPath(); x.moveTo(X(mk), pad.t); x.lineTo(X(mk), pad.t + ph); x.stroke(); x.setLineDash([]); }
    x.save(); x.beginPath(); x.rect(pad.l, pad.t, pw, ph); x.clip();
    for (const { q, a, b } of vis) {
      const stride = Math.max(1, Math.floor((b - a) / (pw * 1.5)));
      x.strokeStyle = q.color; x.lineWidth = q.lw || 2; x.lineJoin = 'round'; x.setLineDash(q.dash || []); x.beginPath();
      let go = false;
      for (let i = a; i < b; i += stride) { const v = q.y[i]; if (!isFinite(v)) { go = false; continue; } const px = X(q.t[i]), py = Y(v); go ? x.lineTo(px, py) : x.moveTo(px, py); go = true; }
      x.stroke();
    }
    x.restore(); x.setLineDash([]);
    if (!vis.some((v) => v.b - v.a > 1)) { x.fillStyle = '#64748B'; x.font = '13px Inter, sans-serif'; x.textAlign = 'center'; x.fillText(s.empty || 'Belum ada data — tekan Jalankan atau Beri Stimulus.', pad.l + pw / 2, pad.t + ph / 2); }
    // legenda
    x.font = '12px Inter, "Segoe UI", sans-serif'; x.textAlign = 'left'; x.textBaseline = 'middle';
    let lx = pad.l + 8; const ly = pad.t + 12;
    x.fillStyle = 'rgba(255,255,255,0.88)'; const tw = s.series.reduce((a, q) => a + x.measureText(q.label).width + 34, 0); x.fillRect(lx - 4, ly - 10, tw, 20);
    for (const q of s.series) { x.strokeStyle = q.color; x.lineWidth = 2.5; x.setLineDash(q.dash || []); x.beginPath(); x.moveTo(lx, ly); x.lineTo(lx + 18, ly); x.stroke(); x.setLineDash([]); x.fillStyle = '#1E293B'; x.fillText(q.label, lx + 22, ly); lx += x.measureText(q.label).width + 34; }
    // time cursor + tooltip
    const cT = s.cursor;
    if (cT != null && cT >= t0 && cT <= t1) {
      x.strokeStyle = '#0F172A'; x.lineWidth = 1; x.beginPath(); x.moveTo(X(cT), pad.t); x.lineTo(X(cT), pad.t + ph); x.stroke();
      const rows = [`t = ${cT.toFixed(2)} ms`];
      for (const { q } of vis) { const i = Math.min(q.t.length - 1, bs(q.t, cT)); if (i >= 0 && isFinite(q.y[i])) { rows.push(`${q.label}: ${q.y[i].toFixed(s.decimals ?? 1)} ${s.unit || ''}`); x.fillStyle = q.color; x.beginPath(); x.arc(X(q.t[i]), Y(q.y[i]), 3.5, 0, 7); x.fill(); } }
      x.font = '12px Inter, sans-serif'; const bw = Math.max(...rows.map((r0) => x.measureText(r0).width)) + 16, bh = rows.length * 17 + 8;
      let bx = X(cT) + 10; if (bx + bw > pad.l + pw) bx = X(cT) - bw - 10; const by = pad.t + 30;
      x.fillStyle = 'rgba(15,23,42,0.92)'; x.fillRect(bx, by, bw, bh); x.fillStyle = '#fff'; x.textAlign = 'left'; x.textBaseline = 'top';
      rows.forEach((r0, i) => x.fillText(r0, bx + 8, by + 6 + i * 17));
    }
  }
}
