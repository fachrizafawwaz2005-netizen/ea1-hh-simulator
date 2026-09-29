/**
 * main.js — Orkestrator aplikasi Simulator EA1 Neuron 3D
 *
 * Menjalankan DUA instance model Hodgkin–Huxley (Normal & Altered K+) secara
 * bersamaan setiap frame ketika simulasi berjalan, sehingga:
 *  - Visualisasi 3D neuron & kanal selalu mencerminkan hasil model yang
 *    sedang dipilih pada sakelar masing-masing panel.
 *  - Grafik & metrik pada mode "Bandingkan" selalu siap dari data nyata,
 *    tanpa perlu menjalankan simulasi dua kali secara terpisah.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { HHModel } from './hh-model.js';
import { Neuron3D } from './neuron-3d.js';
import { Channel3D } from './channel-3d.js';
import { Charts } from './charts.js';
import { CONDITIONS, GK_BASELINE_NORMAL } from './conditions.js';
import { computeMetrics, compareMetrics } from './analysis.js';
import { Recorder } from './recorder.js';
import { EDU_TOPICS, EQUATION_GLOSSARY, LIMITATIONS } from './content.js';

const el = (id) => document.getElementById(id);
const NUM_SEGMENTS = 50;

class App {
  constructor() {
    // ── Model ganda: Normal (baseline tetap) & Altered (dikendalikan slider) ──
    this.modelNormal = new HHModel(NUM_SEGMENTS);
    this.modelAltered = new HHModel(NUM_SEGMENTS);
    this.modelNormal.params = { ...this.modelNormal.params, ...CONDITIONS.normal.params };
    this.modelAltered.params = { ...this.modelAltered.params, ...CONDITIONS.altered.params };
    this.modelNormal.reset();
    this.modelAltered.reset();
    this.recN = new Recorder(this.modelNormal);
    this.recA = new Recorder(this.modelAltered);

    this.state = {
      isPlaying: false,
      speed: 1.0,
      activeCondition: 'normal',   // 'normal' | 'altered' | 'compare' — untuk grafik/analisis
      neuronView: 'normal',        // sakelar tampilan 3D neuron
      channelView: 'normal',       // sakelar tampilan 3D kanal
      lastFrameTime: 0,
      cursorT: null, selSeg: null, windowMs: 60, cur: { INa: true, IK: true, IL: true },
    };
    this.dirty = true;

    try { this.initNeuronViewport(); this.initChannelViewport(); }
    catch (err) {
      console.error('WebGL gagal:', err);
      el('webgl-error').hidden = false;
      const noop = { updateVoltages() {}, updateIonParticles() {}, applyConditionVisuals() {}, update() {} };
      this.neuron = this.neuron || noop; this.channel3d = noop; this.webglFailed = true;
    }

    this.charts = new Charts({
      voltage: 'chart-voltage', gating: 'chart-gating', currents: 'chart-currents',
      compareVoltage: 'chart-compareVoltage', live: 'chart-live',
    });
    this.charts.onCursor = (t) => { this.state.cursorT = t; this.dirty = true; };
    this.wireExtras();

    this.wireNav();
    this.wireConditionSelector();
    this.wireViewToggles();
    this.wireControls();
    this.wireCollapsibles();
    this.populateEducation();
    this.populateLimitations();
    this.applyConditionVisualsBoth();
    this.updateParamsTable();
    this.updateBadge();
    this.updateHeader(); this.updateMetricsPanel(); this.updateCompareSection(); this.updateChannelReadouts();

    window.addEventListener('resize', () => this.onResize());
    this.hideLoading();
    requestAnimationFrame((t) => this.animate(t));
  }

  // ═══════════════════════════════════════════════════
  // THREE.JS SETUP (dua viewport independen)
  // ═══════════════════════════════════════════════════

  initNeuronViewport() {
    const canvas = el('viewport-neuron');
    const { renderer, scene, camera, controls } = this._makeThreeContext(canvas, 0xF4F7FC);
    camera.position.set(17, 6, 29);
    controls.target.set(17, 0, 0);
    controls.minDistance = 3; controls.maxDistance = 80;

    const ambient = new THREE.AmbientLight(0xffffff, 1.0); scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 1.1); dir.position.set(18, 22, 14); scene.add(dir);

    this.neuron3d = { renderer, scene, camera, controls, canvas };
    this.neuron = new Neuron3D(scene);
    this.wirePicking(canvas);
  }

  initChannelViewport() {
    const canvas = el('viewport-channel');
    const { renderer, scene, camera, controls } = this._makeThreeContext(canvas, 0xF7F9FC);
    camera.position.set(0, 2.6, 9);
    controls.target.set(0, 0, 0);
    controls.minDistance = 3; controls.maxDistance = 22;

    const ambient = new THREE.AmbientLight(0xffffff, 1.05); scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 1.0); dir.position.set(6, 10, 8); scene.add(dir);

    this.channelCtx = { renderer, scene, camera, controls, canvas };
    this.channel3d = new Channel3D(scene);
  }

  _makeThreeContext(canvas, bg) {
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(bg);
    const rect = canvas.getBoundingClientRect();
    const camera = new THREE.PerspectiveCamera(50, (rect.width || 800) / (rect.height || 400), 0.1, 500);
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true; controls.dampingFactor = 0.08;
    this._resizeThree({ renderer, camera, canvas });
    return { renderer, scene, camera, controls };
  }

  _resizeThree({ renderer, camera, canvas }) {
    const rect = canvas.getBoundingClientRect();
    // Saat panel sedang tersembunyi (display:none), rect bernilai 0 — pertahankan
    // ukuran render terakhir yang valid alih-alih mengecilkan ke 1x1 piksel.
    if (rect.width < 2 || rect.height < 2) return;
    const w = Math.round(rect.width), h = Math.round(rect.height);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  onResize() {
    if (!this.webglFailed) { this._resizeThree(this.neuron3d); this._resizeThree(this.channelCtx); }
    this.dirty = true;
  }

  // ═══════════════════════════════════════════════════
  // NAVIGATION (sidebar sections)
  // ═══════════════════════════════════════════════════

  wireNav() {
    const links = Array.from(document.querySelectorAll('.nav-link'));
    links.forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = link.dataset.section;
        links.forEach((l) => l.classList.toggle('active', l === link));
        document.querySelectorAll('.section').forEach((s) => s.classList.toggle('active', s.id === target));
        // Beri waktu layout menetap sebelum resize renderer/canvas
        requestAnimationFrame(() => this.onResize());
      });
    });
  }

  wireCollapsibles() {
    const toggle = el('params-toggle');
    toggle.addEventListener('click', () => {
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!expanded));
    });
  }

  // ═══════════════════════════════════════════════════
  // CONDITION SELECTOR (Beranda) — memengaruhi grafik & analisis
  // ═══════════════════════════════════════════════════

  wireConditionSelector() {
    const buttons = Array.from(document.querySelectorAll('.cond-btn'));
    buttons.forEach((btn) => btn.addEventListener('click', () => {
      this.state.activeCondition = btn.dataset.condition;
      buttons.forEach((b) => b.classList.toggle('active', b.dataset.condition === btn.dataset.condition));
      this.updateBadge(); this.updateMetricsPanel(); this.updateCompareSection(); this.dirty = true;
    }));
  }

  updateBadge() {
    const badge = el('condition-badge');
    const map = { normal: 'Normal', altered: 'Altered K+ (EA1)', compare: 'Bandingkan' };
    badge.textContent = map[this.state.activeCondition];
    badge.classList.toggle('altered', this.state.activeCondition === 'altered');
  }

  // ═══════════════════════════════════════════════════
  // MINI TOGGLES (sakelar tampilan 3D per panel)
  // ═══════════════════════════════════════════════════

  wireViewToggles() {
    this._wireMiniToggle('neuron-view-toggle', (v) => { this.state.neuronView = v; });
    this._wireMiniToggle('channel-view-toggle', (v) => { this.state.channelView = v; });
  }

  _wireMiniToggle(containerId, onChange) {
    const container = el(containerId);
    const buttons = Array.from(container.querySelectorAll('.mini-toggle-btn'));
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        buttons.forEach((b) => b.classList.toggle('active', b === btn));
        onChange(btn.dataset.view);
      });
    });
  }

  // ═══════════════════════════════════════════════════
  // CONTROLS (slider, tombol run/pause/reset/stimulus)
  // ═══════════════════════════════════════════════════

  wireControls() {
    const gkSlider = el('gk-slider'), gkValue = el('gk-value');
    gkSlider.addEventListener('input', () => {
      const v = parseFloat(gkSlider.value);
      this.modelAltered.params.gK = v;
      gkValue.textContent = `g_K = ${v.toFixed(1)} mS/cm²`;
      this.updateParamsTable();
    });

    const iextSlider = el('iext-slider'), iextValue = el('iext-value');
    iextSlider.addEventListener('input', () => {
      const v = parseFloat(iextSlider.value);
      this.modelNormal.params.Iext = v; this.modelAltered.params.Iext = v;
      iextValue.textContent = `I_ext = ${v.toFixed(1)} µA/cm²`;
      this.updateParamsTable();
    });

    const dtSlider = el('dt-slider'), dtValue = el('dt-value');
    dtSlider.addEventListener('input', () => {
      const v = parseFloat(dtSlider.value);
      this.modelNormal.dt = v; this.modelAltered.dt = v;
      dtValue.textContent = `dt = ${v.toFixed(3)} ms`;
      this.updateParamsTable();
    });

    const windowSlider = el('window-slider'), windowValue = el('window-value');
    windowSlider.addEventListener('input', () => {
      windowValue.textContent = `${windowSlider.value} ms`;
      this.state.windowMs = parseFloat(windowSlider.value); this.dirty = true;
    });

    const speedSlider = el('speed-slider'), speedValue = el('speed-value');
    speedSlider.addEventListener('input', () => {
      this.state.speed = parseFloat(speedSlider.value);
      speedValue.textContent = `${this.state.speed.toFixed(1)}x`;
      this.updateHeader();
    });

    const autoStim = el('auto-stim-toggle');
    autoStim.addEventListener('change', () => {
      this.modelNormal.autoStim = autoStim.checked;
      this.modelAltered.autoStim = autoStim.checked;
    });

    el('btn-play').addEventListener('click', () => this.togglePlay());
    el('btn-stimulus').addEventListener('click', () => this.triggerStimulus());
    el('btn-reset').addEventListener('click', () => this.resetAll());
  }

  setStatus(kind, msg) {
    const map = { ready: ['Siap', '#10B981'], run: ['Berjalan', '#2563EB'], pause: ['Jeda', '#F59E0B'], stop: ['Berhenti', '#64748B'], error: ['Error', '#DC2626'] };
    el('status-text').textContent = map[kind][0]; this.state.recMsg = msg || null; el('status-dot').style.background = map[kind][1];
    const btn = el('btn-play');
    btn.innerHTML = kind === 'run' ? 'Jeda' : (this.modelNormal.time > 0 && kind !== 'ready' ? '&#9654; Lanjutkan' : '&#9654; Jalankan');
    btn.classList.toggle('active', kind === 'run');
  }

  togglePlay() {
    if (this.state.error || this.recN.full) return this.resetAll();
    this.state.isPlaying = !this.state.isPlaying;
    if (this.state.isPlaying) {
      if (!this.modelNormal.stimulating && !this.modelNormal.autoStim && this.modelNormal.time === 0) this.triggerStimulus();
      this.setStatus('run');
    } else this.setStatus('pause');
  }

  stopRun(kind, msg) {
    this.state.isPlaying = false; this.state.error = kind === 'error';
    this.setStatus(kind === 'error' ? 'error' : 'stop', msg);
    const n = el('param-notice'); n.hidden = false; n.textContent = msg + (kind === 'error' ? '' : ' Tekan Reset untuk eksperimen baru.');
  }

  triggerStimulus() {
    if (this.recN.full || this.state.error) return;
    this.modelNormal.applyStimulus();
    this.modelAltered.applyStimulus();
    if (!this.state.isPlaying) { this.state.isPlaying = true; this.setStatus('run'); }
  }

  resetAll() {
    this.state.isPlaying = false; this.state.error = null; this.state.recMsg = null; this.state.selSeg = null; this.state.cursorT = null;
    this.modelNormal.reset(); this.modelAltered.reset(); this.recN.reset(); this.recA.reset();
    this.setStatus('ready');
    this.neuron.updateVoltages(this.modelNormal.V);
    el('sim-time').textContent = 't = 0.0 ms';
    for (const id of ['param-notice', 'param-notice2']) el(id).hidden = true;
    this.updateMetricsPanel(); this.updateCompareSection(); this.updateChannelReadouts(); this.dirty = true;
  }

  // Parameter diubah saat berjalan: perilaku model asli dipertahankan (langsung berlaku); UI memberi tanda.
  notifyParamChange() {
    const t = this.modelNormal.time;
    if (t > 0) {
      const last = this.recN.marks[this.recN.marks.length - 1];
      if (last === undefined || t - last > 1) { this.recN.marks.push(t); this.recA.marks.push(t); }
      const msg = `Parameter diubah pada t = ${t.toFixed(1)} ms saat eksperimen berjalan; berlaku langsung pada model. Untuk eksperimen bersih dengan parameter baru, tekan Reset.`;
      for (const id of ['param-notice', 'param-notice2']) { el(id).hidden = false; el(id).textContent = msg; }
    }
    this.updateHeader(); this.dirty = true;
  }

  updateHeader() {
    const a = this.modelAltered.params, n = this.modelNormal.params;
    el('h-gk').textContent = `${n.gK.toFixed(0)} / ${a.gK.toFixed(1)} mS/cm²`;
    el('h-iext').textContent = `${a.Iext.toFixed(1)} µA/cm²`;
    el('h-dt').textContent = `${this.modelAltered.dt.toFixed(3)} ms`;
    el('h-speed').textContent = `${this.state.speed.toFixed(1)}× · ${Math.max(1, Math.round(20 * this.state.speed))} langkah/frame`;
    this.updateRecStatus();
    const dt = this.modelAltered.dt, ext = this.modelAltered.autoStim ? 'otomatis 30 ms' : 'manual';
    el('exp-summary').innerHTML = `<b>Ringkasan eksperimen</b><br>Normal: g_K = ${n.gK.toFixed(1)} mS/cm² · Altered: g_K = ${a.gK.toFixed(1)} mS/cm²<br>Stimulus: ${a.Iext.toFixed(1)} µA/cm², ${this.modelNormal.stimDuration} ms, segmen 0–1, ${ext}<br>dt = ${dt.toFixed(3)} ms · 50 segmen terkopel · kedua kondisi memakai stimulus &amp; dt identik`;
  }

  updateRecStatus() {
    const N = this.recN, s = this.state, dt = this.modelNormal.dt;
    const cap = N.cap * dt * this.modelNormal.historySampleRate, t = N.n ? N.t[N.n - 1] : 0;
    el('h-rec').textContent = s.recMsg || (N.n < 4 ? 'Belum ada data' : `Merekam: ${t.toFixed(0)} dari ± ${cap.toFixed(0)} ms`);
    el('h-rec').classList.toggle('warn', !!s.recMsg);
  }

  wireExtras() {
    el('btn-defaults').addEventListener('click', () => {
      for (const [id, v] of [['gk-slider', 16], ['iext-slider', 10], ['dt-slider', 0.02], ['window-slider', 60], ['speed-slider', 1]]) {
        const sl = el(id); sl.value = v; sl.dispatchEvent(new Event('input'));
      }
    });
    el('btn-export').addEventListener('click', () => this.exportCsv());
    document.querySelectorAll('[data-cur]').forEach((cb) => cb.addEventListener('change', () => { this.state.cur[cb.dataset.cur] = cb.checked; this.dirty = true; }));
  }

  wirePicking(canvas) {
    const ray = new THREE.Raycaster(), v = new THREE.Vector2(); let down = null;
    canvas.addEventListener('pointerdown', (e) => { down = [e.clientX, e.clientY]; });
    canvas.addEventListener('pointerup', (e) => {
      if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 4) return;
      const r = canvas.getBoundingClientRect();
      v.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(v, this.neuron3d.camera);
      const hit = ray.intersectObjects(this.neuron.segmentMeshes, false)[0];
      this.state.selSeg = hit ? this.neuron.segmentMeshes.indexOf(hit.object) : null; this.dirty = true;
    });
  }

  exportCsv() {
    const N = this.recN, A = this.recA;
    if (N.n < 2) { alert('Belum ada data untuk diekspor. Jalankan simulasi terlebih dahulu.'); return; }
    const fs = ['V0', 'Vmid', 'm', 'h', 'n', 'INa', 'IK', 'IL'];
    const u = { V0: 'mV', Vmid: 'mV', m: '1', h: '1', n: '1', INa: 'uA_cm2', IK: 'uA_cm2', IL: 'uA_cm2' };
    const nm = { V0: 'Vm_seg0', Vmid: 'Vm_seg25' };
    const col = (c, k) => `${c}_${nm[k] || k}_${u[k]}`;
    const a = this.modelAltered.params, n0 = this.modelNormal.params;
    let out = `# EA1 HH Simulator; dt=${this.modelAltered.dt} ms; I_ext=${a.Iext} uA/cm2; stim_duration=${this.modelNormal.stimDuration} ms; gK_normal=${n0.gK}; gK_altered=${a.gK} mS/cm2; sample_interval=dt*${this.modelNormal.historySampleRate}\n`;
    out += `# stimulus_windows_ms=${N.stims.map((s) => s.t0.toFixed(3) + '-' + s.t1.toFixed(3)).join('|')}; parameter_change_times_ms=${N.marks.map((x) => x.toFixed(2)).join('|')}\n`;
    out += 't_ms,' + fs.map((k) => col('normal', k)).concat(fs.map((k) => col('altered', k))).join(',') + '\n';
    for (let i = 0; i < N.n; i++) out += [N.t[i].toFixed(4), ...fs.map((k) => N.f[k][i]), ...fs.map((k) => A.f[k][i])].join(',') + '\n';
    const url = URL.createObjectURL(new Blob([out], { type: 'text/csv' }));
    const l = document.createElement('a'); l.href = url; l.download = 'ea1_hh_simulasi.csv'; l.click(); setTimeout(() => URL.revokeObjectURL(url), 500);
  }

  // ═══════════════════════════════════════════════════
  // KONTEN STATIS (edukasi, glosarium, batasan)
  // ═══════════════════════════════════════════════════

  populateEducation() {
    const container = el('edu-topics');
    container.innerHTML = EDU_TOPICS.map((t) => `
      <div class="edu-topic"><h3>${t.title}</h3><p>${t.body}</p></div>
    `).join('');

    const gbody = el('glossary-body');
    gbody.innerHTML = EQUATION_GLOSSARY.map((g) => `
      <tr><td><strong>${g.symbol}</strong></td><td>${g.unit}</td><td>${g.meaning}</td><td>${g.effect}</td></tr>
    `).join('');
  }

  populateLimitations() {
    const list = el('limits-list');
    list.innerHTML = LIMITATIONS.map((l) => `<li>${l}</li>`).join('');
  }

  applyConditionVisualsBoth() {
    this.neuron.applyConditionVisuals(CONDITIONS[this.state.neuronView]);
  }

  updateParamsTable() {
    this.notifyParamChange && this.notifyParamChange();
    el('p-gk').textContent = `${GK_BASELINE_NORMAL.toFixed(1)} / ${this.modelAltered.params.gK.toFixed(1)} mS/cm² (normal / altered)`;
    el('p-iext').textContent = `${this.modelAltered.params.Iext.toFixed(1)} µA/cm²`;
    el('p-dt').textContent = `${this.modelAltered.dt.toFixed(3)} ms`;
  }

  // ═══════════════════════════════════════════════════
  // METRIK & PERBANDINGAN
  // ═══════════════════════════════════════════════════

  updateMetricsPanel() {
    const alt = this.state.activeCondition === 'altered';
    const rec = alt ? this.recA : this.recN;
    el('metrics-scope').textContent = `Menampilkan kondisi ${alt ? 'Altered K+' : 'Normal'}${this.state.activeCondition === 'compare' ? ' (mode Bandingkan: kedua kondisi ada di tabel pada Hasil & Grafik)' : ''}. Dihitung dari seluruh rekaman eksperimen saat ini (segmen 0), dengan fungsi analysis.js yang tidak diubah.`;
    const metrics = computeMetrics(rec.series(), 0);
    const f = (v, d, u) => (v === null || v === undefined || !isFinite(v)) ? '—' : `${v.toFixed(d)} ${u}`;
    const map = metrics ? {
      'm-resting': f(metrics.resting, 1, 'mV'), 'm-peak': f(metrics.peakVm, 1, 'mV'), 'm-amp': f(metrics.apAmplitude, 1, 'mV'),
      'm-ttp': f(metrics.timeToPeak, 2, 'ms'), 'm-apdur': f(metrics.apDuration, 2, 'ms'), 'm-repol': f(metrics.repolarizationTime, 2, 'ms'),
      'm-ahp': f(metrics.ahp, 1, 'mV'), 'm-spikes': `${metrics.nSpikes}`, 'm-freq': f(metrics.firingFrequency, 1, 'Hz'),
      'm-pina': f(metrics.peakINa, 1, 'µA/cm²'), 'm-pik': f(metrics.peakIK, 1, 'µA/cm²'), 'm-pikt': f(metrics.peakIKTiming, 2, 'ms'),
    } : Object.fromEntries(['m-resting','m-peak','m-amp','m-ttp','m-apdur','m-repol','m-ahp','m-spikes','m-freq','m-pina','m-pik','m-pikt'].map((k) => [k, '—']));
    for (const [id, text] of Object.entries(map)) el(id).textContent = text;
  }

  updateCompareSection() {
    const findingsList = el('findings-list'), tbody = el('compare-table-body');
    const nm = computeMetrics(this.recN.series(), 0), am = computeMetrics(this.recA.series(), 0);
    if (!nm || !am) {
      findingsList.innerHTML = '<li>Belum ada data yang cukup. Jalankan simulasi (Normal dan Altered dijalankan bersamaan).</li>';
      tbody.innerHTML = '<tr><td colspan="4" class="table-empty">Belum ada data. Jalankan simulasi.</td></tr>';
      return;
    }
    const { rows, statements } = compareMetrics(nm, am);
    tbody.innerHTML = rows.map((r) => `<tr><td>${r.label}</td><td>${r.n}</td><td>${r.a}</td><td>${r.d}</td></tr>`).join('');
    findingsList.innerHTML = statements.map((x) => `<li>${x}</li>`).join('');
  }

  updateChannelReadouts() {
    const model = this.state.channelView === 'normal' ? this.modelNormal : this.modelAltered;
    el('ch-gk').textContent = `${model.params.gK.toFixed(1)} mS/cm²`;
    el('ch-ginst').textContent = `${model.getInstantGK().toFixed(2)} mS/cm²`;
    el('ch-prob').textContent = `${model.getKOpenProbability().toFixed(3)}`;
    const IK = model.params.gK * model.getKOpenProbability() * (model.V[0] - model.params.EK);
    el('ch-ik').textContent = `${IK.toFixed(1)} µA/cm²`;
  }

  // ═══════════════════════════════════════════════════
  // LOOP ANIMASI
  // ═══════════════════════════════════════════════════

  drawCharts() {
    const s = this.state, C = this.charts, mode = s.activeCondition;
    const N = this.recN, A = this.recA, tEnd = N.n ? N.t[N.n - 1] : 0;
    const cN = { rec: N, color: '#2563EB', name: 'Normal', dash: null }, cA = { rec: A, color: '#A70B27', name: 'Altered K⁺', dash: [7, 4] };
    const list = mode === 'normal' ? [cN] : mode === 'altered' ? [cA] : [cN, cA];
    const base = { win: s.windowMs, tEnd, cursor: s.cursorT, stims: N.stims, marks: N.marks };
    const solid = (c) => (mode === 'compare' ? c : { ...c, dash: null });
    const ser = (c, k, color, label, extra = {}) => ({ t: c.rec.T(), y: c.rec.arr(k), color, label, dash: c.dash && mode === 'compare' ? c.dash : null, ...extra });
    const vm = (lst) => {
      const out = lst.map((c) => ({ t: c.rec.T(), y: c.rec.arr('V0'), color: c.color, label: `V_m ${c.name}`, dash: null, lw: 2.2 }));
      if (s.selSeg != null) for (const c of lst) out.push({ t: c.rec.T(), y: c.rec.segTrace(s.selSeg), color: '#64748B', label: `Segmen ${s.selSeg} (${c.name})`, dash: [3, 3], lw: 1.6 });
      return out;
    };
    const vspec = (lst) => ({ ...base, series: vm(lst), yMin: -90, yMax: 60, yLabel: 'Potensial membran (mV)', unit: 'mV' });
    C.plot('live', vspec(list)); C.plot('voltage', vspec(list)); C.plot('compareVoltage', vspec([cN, cA]));
    const cur = [['INa', '#D97706', 'I_Na'], ['IK', '#7C3AED', 'I_K'], ['IL', '#475569', 'I_L']].filter(([k]) => s.cur[k]);
    C.plot('currents', { ...base, series: list.flatMap((c) => cur.map(([k, col, lb]) => ser(c, k, col, mode === 'compare' ? `${lb} ${c.name}` : lb))), yLabel: 'Arus (µA/cm²)', unit: 'µA/cm²', zero: true, decimals: 1, empty: cur.length ? undefined : 'Pilih minimal satu arus.' });
    C.plot('gating', { ...base, series: list.flatMap((c) => [['m', '#DC2626', 'm (aktivasi Na⁺)'], ['h', '#2563EB', 'h (inaktivasi Na⁺)'], ['n', '#059669', 'n (aktivasi K⁺)']].map(([k, col, lb]) => ser(c, k, col, mode === 'compare' ? `${lb.split(' ')[0]} ${c.name}` : lb))), yMin: 0, yMax: 1, yLabel: 'Variabel gerbang (0–1)', unit: '', decimals: 3, zero: false });
    // status data & AP
    el('data-status').textContent = N.n < 4 ? 'Belum ada data' : `${N.n} sampel · 0–${tEnd.toFixed(1)} ms${N.full ? ' · rekaman penuh' : ''}`;
    const mN = computeMetrics(N.series(), 0), mA = computeMetrics(A.series(), 0);
    const st = (m, c, nm) => !m ? '' : (m.nSpikes > 0 ? `<b class="${c}">${nm}</b>: ${m.nSpikes} potensial aksi terdeteksi (V > 0 mV), puncak ${m.peakVm.toFixed(1)} mV.` : `<b class="${c}">${nm}</b>: belum terdeteksi potensial aksi (puncak ${m.peakVm.toFixed(1)} mV).`);
    el('ap-status').innerHTML = mode === 'altered' ? st(mA, 'a', 'Altered K⁺') : mode === 'normal' ? st(mN, 'n', 'Normal') : st(mN, 'n', 'Normal') + ' &nbsp;|&nbsp; ' + st(mA, 'a', 'Altered K⁺');
  }

  updateSegReadout() {
    const s = this.state, N = this.recN, A = this.recA, out = el('seg-readout');
    const k = s.cursorT != null ? N.indexAt(s.cursorT) : -1;
    const T = k >= 0 ? N.t[k] : this.modelNormal.time;
    const seg = s.selSeg;
    const vN = seg == null ? null : (k >= 0 ? N.snap(k)[seg] : this.modelNormal.V[seg]);
    const vA = seg == null ? null : (k >= 0 ? A.snap(k)[seg] : this.modelAltered.V[seg]);
    out.innerHTML = seg == null
      ? `Klik segmen akson untuk melihat Vm aktual. Waktu ${k >= 0 ? 'kursor' : 'model'}: <b>${T.toFixed(2)} ms</b>${k >= 0 ? ' (3D menampilkan rekaman pada waktu ini)' : ''}.`
      : `Segmen <b>${seg}</b> (${seg < 2 ? 'lokasi stimulus' : 'akson'}) · t = <b>${T.toFixed(2)} ms</b> · Normal: <b style="color:#2563EB">${vN.toFixed(1)} mV</b> · Altered K⁺: <b style="color:#A70B27">${vA.toFixed(1)} mV</b>`;
  }

  animate(timestamp) {
    requestAnimationFrame((t) => this.animate(t));
    const dt = Math.min((timestamp - this.state.lastFrameTime) / 1000, 0.05) || 0.016;
    this.state.lastFrameTime = timestamp;
    const s = this.state;

    if (s.isPlaying) {
      const spf = Math.max(1, Math.round(20 * s.speed));
      try {
        const okN = this.recN.step(spf), okA = this.recA.step(spf);
        if (!isFinite(this.modelNormal.V[0]) || !isFinite(this.modelAltered.V[0])) throw new Error('Nilai non-finite (NaN/Infinity) terdeteksi pada Vm; simulasi dihentikan.');
        if (!okN || !okA) this.stopRun('stop', `Batas rekaman tercapai (${this.recN.T()[this.recN.n - 1].toFixed(0)} ms waktu model).`);
      } catch (err) { console.error(err); this.stopRun('error', err.message); }
      this.dirty = true;
      const chView = s.channelView === 'normal' ? this.modelNormal : this.modelAltered;
      this.channel3d.update(chView, s.channelView, dt * s.speed);
      this.updateChannelReadouts();
      if (!this.recN.full) { this.updateMetricsPanel(); this.updateCompareSection(); }
      el('sim-time').textContent = `t = ${this.modelNormal.time.toFixed(1)} ms`;
    }

    const nModel = s.neuronView === 'normal' ? this.modelNormal : this.modelAltered;
    const nRec = s.neuronView === 'normal' ? this.recN : this.recA;
    if (s.cursorT != null && nRec.n > 0) this.neuron.updateVoltages(nRec.snap(nRec.indexAt(s.cursorT)));
    else if (s.isPlaying) this.neuron.updateVoltages(nModel.V);
    if (s.isPlaying) this.neuron.updateIonParticles(dt * s.speed);

    if (this.dirty) { this.dirty = false; this.updateRecStatus(); this.drawCharts(); this.updateSegReadout(); }

    this.neuron.applyConditionVisuals(CONDITIONS[s.neuronView]);
    this.channel3d && this._tintChannel();
    if (this.webglFailed) return;
    this.neuron3d.controls.update();
    this.neuron3d.renderer.render(this.neuron3d.scene, this.neuron3d.camera);
    this.channelCtx.controls.update();
    this.channelCtx.renderer.render(this.channelCtx.scene, this.channelCtx.camera);
  }

  _tintChannel() {
    // Warna aksen kanal mengikuti sakelar tampilan meskipun simulasi sedang jeda
    if (!this.channel3d.subunitMeshes) return;
    const accent = this.state.channelView === 'altered' ? 0xA70B27 : 0x2563EB;
    for (const s of this.channel3d.subunitMeshes) s.material.color.set(accent);
  }

  hideLoading() {
    const loading = el('loading-screen');
    setTimeout(() => { loading.classList.add('hidden'); setTimeout(() => loading.remove(), 700); }, 500);
  }
}

document.addEventListener('DOMContentLoaded', () => { window.app = new App(); });
