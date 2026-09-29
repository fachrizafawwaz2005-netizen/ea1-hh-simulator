/**
 * analysis.js — Menghitung metrik kuantitatif potensial aksi langsung dari
 * deret waktu hasil simulasi (V, INa, IK), dan menyusun pernyataan
 * perbandingan berbasis data. Tidak ada angka yang dikarang atau diasumsikan
 * — semua dihitung dari larik yang benar-benar dihasilkan oleh hh-model.js.
 */

const SPIKE_THRESHOLD_MV = 0;

function findPeaks(V, t) {
  const peaks = [];
  for (let i = 2; i < V.length - 2; i++) {
    if (V[i] > SPIKE_THRESHOLD_MV && V[i] >= V[i - 1] && V[i] > V[i + 1]) {
      if (peaks.length === 0 || t[i] - peaks[peaks.length - 1].t > 2) {
        peaks.push({ i, t: t[i], V: V[i] });
      }
    }
  }
  return peaks;
}

/** computeMetrics(series, stimOnset) -> objek metrik skalar */
export function computeMetrics(series, stimOnset = 0) {
  const { t, V, INa, IK } = series;
  if (!t || t.length < 4) return null;

  let restSum = 0, restN = 0;
  for (let i = 0; i < t.length && t[i] < stimOnset; i++) { restSum += V[i]; restN++; }
  const resting = restN > 0 ? restSum / restN : V[0];

  let peakVm = -Infinity, peakIdx = 0;
  for (let i = 0; i < V.length; i++) { if (V[i] > peakVm) { peakVm = V[i]; peakIdx = i; } }
  const timeToPeak = t[peakIdx] - stimOnset;
  const apAmplitude = peakVm - resting;

  const peaks = findPeaks(V, t);
  const nSpikes = peaks.length;
  const durationS = (t[t.length - 1] - stimOnset) / 1000;
  const firingFrequency = nSpikes > 0 && durationS > 0 ? nSpikes / durationS : 0;

  let apDuration = null, repolarizationTime = null, ahp = null;
  if (peaks.length > 0) {
    const halfV = resting + apAmplitude / 2;
    const pIdx = peaks[0].i;
    let riseIdx = pIdx, fallIdx = pIdx;
    for (let i = pIdx; i > 0; i--) { if (V[i] <= halfV) { riseIdx = i; break; } }
    for (let i = pIdx; i < V.length; i++) { if (V[i] <= halfV) { fallIdx = i; break; } }
    apDuration = t[fallIdx] - t[riseIdx];

    let repIdx = null;
    for (let i = pIdx; i < V.length; i++) { if (V[i] <= resting + 2) { repIdx = i; break; } }
    repolarizationTime = repIdx !== null ? t[repIdx] - t[pIdx] : null;

    let ahpMin = Infinity;
    const dtEst = t.length > 1 ? (t[1] - t[0]) : 0.04;
    const windowEnd = Math.min(V.length - 1, pIdx + Math.round(20 / Math.max(dtEst, 1e-6)));
    for (let i = pIdx; i <= windowEnd; i++) { if (V[i] < ahpMin) ahpMin = V[i]; }
    ahp = ahpMin - resting;
  }

  let peakINa = Infinity, peakIK = -Infinity, peakIKidx = 0;
  for (let i = 0; i < INa.length; i++) { if (INa[i] < peakINa) peakINa = INa[i]; }
  for (let i = 0; i < IK.length; i++) { if (IK[i] > peakIK) { peakIK = IK[i]; peakIKidx = i; } }
  const peakIKTiming = t[peakIKidx] - stimOnset;

  return {
    resting, peakVm, apAmplitude, timeToPeak,
    apDuration, repolarizationTime, ahp,
    nSpikes, firingFrequency,
    peakINa, peakIK, peakIKTiming,
  };
}

const fmt = (v, d = 2) => (v === null || v === undefined || !isFinite(v)) ? 'n/a' : v.toFixed(d);

/** compare(normalMetrics, alteredMetrics) -> { rows[], statements[] } */
export function compareMetrics(nm, am) {
  const rows = [
    { label: 'Potensial istirahat (mV)', n: fmt(nm.resting), a: fmt(am.resting), d: fmt(am.resting - nm.resting) },
    { label: 'Puncak Vm (mV)', n: fmt(nm.peakVm), a: fmt(am.peakVm), d: fmt(am.peakVm - nm.peakVm) },
    { label: 'Amplitudo AP (mV)', n: fmt(nm.apAmplitude), a: fmt(am.apAmplitude), d: fmt(am.apAmplitude - nm.apAmplitude) },
    { label: 'Durasi AP (ms)', n: fmt(nm.apDuration), a: fmt(am.apDuration),
      d: (nm.apDuration !== null && am.apDuration !== null) ? fmt(am.apDuration - nm.apDuration) : 'n/a' },
    { label: 'Waktu repolarisasi (ms)', n: fmt(nm.repolarizationTime), a: fmt(am.repolarizationTime),
      d: (nm.repolarizationTime !== null && am.repolarizationTime !== null) ? fmt(am.repolarizationTime - nm.repolarizationTime) : 'n/a' },
    { label: 'AHP (mV relatif istirahat)', n: fmt(nm.ahp), a: fmt(am.ahp),
      d: (nm.ahp !== null && am.ahp !== null) ? fmt(am.ahp - nm.ahp) : 'n/a' },
    { label: 'Frekuensi firing (Hz)', n: fmt(nm.firingFrequency, 1), a: fmt(am.firingFrequency, 1), d: fmt(am.firingFrequency - nm.firingFrequency, 1) },
    { label: 'Puncak I_K (µA/cm²)', n: fmt(nm.peakIK), a: fmt(am.peakIK), d: fmt(am.peakIK - nm.peakIK) },
  ];

  const statements = [];
  const ikDiff = am.peakIK - nm.peakIK;
  if (Math.abs(ikDiff) > 0.5) {
    statements.push(
      `Konduktansi K+ yang diubah menghasilkan ${ikDiff < 0 ? 'penurunan' : 'peningkatan'} arus K+ puncak ` +
      `(ΔI_K = ${fmt(ikDiff)} µA/cm²) dibandingkan kondisi normal.`
    );
  } else {
    statements.push('Arus K+ puncak relatif serupa antara kedua kondisi pada pengaturan saat ini.');
  }

  if (nm.apDuration !== null && am.apDuration !== null) {
    const durDiff = am.apDuration - nm.apDuration;
    if (Math.abs(durDiff) > 0.05) {
      statements.push(
        `Durasi potensial aksi ${durDiff > 0 ? 'melebar' : 'menyempit'} sebesar ${fmt(Math.abs(durDiff))} ms ` +
        `dibandingkan kondisi normal.`
      );
    } else {
      statements.push('Durasi potensial aksi tidak berubah secara berarti dibandingkan kondisi normal.');
    }
  } else if (am.nSpikes === 0) {
    statements.push('Tidak terdeteksi potensial aksi pada kondisi altered dengan pengaturan stimulus saat ini.');
  }

  if (nm.repolarizationTime !== null && am.repolarizationTime !== null) {
    const repDiff = am.repolarizationTime - nm.repolarizationTime;
    if (Math.abs(repDiff) > 0.05) {
      statements.push(
        `Repolarisasi ${repDiff > 0 ? 'lebih lambat' : 'lebih cepat'} pada kondisi altered ` +
        `(${fmt(Math.abs(repDiff))} ms ${repDiff > 0 ? 'lebih lama' : 'lebih singkat'}).`
      );
    }
  }

  const freqDiff = am.firingFrequency - nm.firingFrequency;
  if (Math.abs(freqDiff) > 0.5) {
    statements.push(
      `Frekuensi firing berubah dari ${fmt(nm.firingFrequency, 1)} Hz menjadi ${fmt(am.firingFrequency, 1)} Hz.`
    );
  }

  statements.push(
    'Perbedaan ini mencerminkan efek langsung dan tersederhanakan dari nilai g_K yang dipilih pada model ' +
    'membran ini, dan tidak boleh dibaca sebagai prediksi kuantitatif untuk varian KCNA1 tertentu.'
  );

  return { rows, statements };
}
