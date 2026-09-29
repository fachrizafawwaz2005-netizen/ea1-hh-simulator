/**
 * neuron-3d.js - Model neuron 3D interaktif (soma, dendrit, akson, myelin)
 *
 * Membangun neuron 3D menggunakan Three.js:
 * - Soma (badan sel) dengan nukleus
 * - Dendrit (percabangan tabung)
 * - Axon hillock
 * - Segmen akson (diwarnai langsung sesuai V(t) hasil model HH — bukan
 *   animasi lepas dari perhitungan)
 * - Selubung myelin dengan celah Node of Ranvier
 * - Terminal akson dengan bouton sinaptik
 * - Sistem partikel ion (aliran Na+ dan K+ mengikuti fase depolarisasi/
 *   repolarisasi yang benar-benar dihitung oleh model)
 *
 * Salah satu Node of Ranvier ditandai sebagai "situs Kv1.1" — lokasi yang
 * disorot pada kondisi Altered K+ (EA1). Ini indikator visual, bukan
 * klaim struktur molekuler kanal.
 */

import * as THREE from 'three';

// ── Voltage-to-Color Mapping ──────────────────────────

const COLOR_RESTING = new THREE.Color().setHSL(0.62, 0.5, 0.40);    // medium blue
const COLOR_THRESHOLD = new THREE.Color().setHSL(0.52, 0.6, 0.45);  // teal
const COLOR_PEAK = new THREE.Color().setHSL(0.08, 0.8, 0.50);       // warm orange
const COLOR_HYPER = new THREE.Color().setHSL(0.72, 0.5, 0.30);      // dark violet

const _tmpColor = new THREE.Color();

function voltageToColor(V) {
  const c = new THREE.Color();
  if (V <= -65) {
    const t = Math.max(0, Math.min(1, (V + 80) / 15));
    c.copy(COLOR_HYPER).lerp(COLOR_RESTING, t);
  } else if (V <= -20) {
    const t = (V + 65) / 45;
    c.copy(COLOR_RESTING).lerp(COLOR_THRESHOLD, t);
  } else {
    const t = Math.min(1, (V + 20) / 60);
    c.copy(COLOR_THRESHOLD).lerp(COLOR_PEAK, t);
  }
  return c;
}

function voltageToEmissive(V) {
  return Math.max(0, Math.min(1, (V + 55) / 95)) * 0.25;
}

// ── Node of Ranvier indices ───────────────────────────
// Segments at every 5th index are nodes (exposed axon)
function isNode(segIndex) {
  return (segIndex % 5) === 0;
}

function getMyelinGroupIndex(segIndex) {
  return Math.floor(segIndex / 5);
}

// ═══════════════════════════════════════════════════════
// Neuron3D Class
// ═══════════════════════════════════════════════════════

export class Neuron3D {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.scene.add(this.group);

    // Mesh references
    this.segmentMeshes = [];   // axon segment cylinders
    this.myelinMeshes = [];    // myelin sheath cylinders
    this.somaMesh = null;
    this.nucleusMesh = null;
    this.dendriteMeshes = [];
    this.terminalMeshes = [];
    this.hillockMesh = null;

    // Ion particle system
    this.ionParticles = null;
    this.maxParticles = 1200;
    this.particleData = [];
    this.ionLabels = [];       // Sprite labels for Na+ / K+
    this.emitCounter = 0;      // Throttle emission rate

    // Constants
    this.numSegments = 50;
    this.segmentLength = 0.7;
    this.axonRadius = 0.1;
    this.myelinRadius = 0.28;
    this.axonStartX = 2.5;

    // Previous voltages for detecting threshold crossings
    this.prevV = new Float64Array(this.numSegments).fill(-65);

    this.build();
  }

  // ── Build All Components ────────────────────────────

  build() {
    this.buildSoma();
    this.buildNucleus();
    this.buildDendrites();
    this.buildAxonHillock();
    this.buildAxonSegments();
    this.buildMyelinSheaths();
    this.buildAxonTerminals();
    this.buildIonParticleSystem();
    this.buildGroundPlane();
  }

  // ── Soma (Cell Body) ───────────────────────────────

  buildSoma() {
    const geo = new THREE.IcosahedronGeometry(1.3, 4);

    // Organic deformation
    const pos = geo.attributes.position.array;
    for (let i = 0; i < pos.length; i += 3) {
      const r = Math.sqrt(pos[i] ** 2 + pos[i + 1] ** 2 + pos[i + 2] ** 2);
      const noise = 1 + 0.08 * Math.sin(pos[i] * 5) * Math.cos(pos[i + 1] * 3 + pos[i + 2] * 4);
      const scale = noise;
      pos[i] *= scale;
      pos[i + 1] *= scale;
      pos[i + 2] *= scale;
    }
    geo.attributes.position.needsUpdate = true;
    geo.computeVertexNormals();

    const mat = new THREE.MeshPhysicalMaterial({
      color: 0x7c4dff,
      emissive: 0x2a1a5e,
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: 0.88,
      roughness: 0.35,
      metalness: 0.08,
      clearcoat: 0.4,
      clearcoatRoughness: 0.3,
    });

    this.somaMesh = new THREE.Mesh(geo, mat);
    this.somaMesh.position.set(0, 0, 0);
    this.group.add(this.somaMesh);
  }

  // ── Nucleus ─────────────────────────────────────────

  buildNucleus() {
    const geo = new THREE.SphereGeometry(0.55, 24, 24);
    const mat = new THREE.MeshPhysicalMaterial({
      color: 0xb388ff,
      emissive: 0x4a148c,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.6,
      roughness: 0.2,
      metalness: 0.1,
    });

    this.nucleusMesh = new THREE.Mesh(geo, mat);
    this.nucleusMesh.position.set(-0.1, 0.1, 0);
    this.group.add(this.nucleusMesh);
  }

  // ── Dendrites ───────────────────────────────────────

  buildDendrites() {
    const dendritePaths = [
      // Main dendrites spreading from soma
      [[-1.2, 0.6, 0], [-2.5, 1.5, 0.5], [-4.5, 2.5, 1.2], [-6.5, 3.2, 1.5], [-8, 3.8, 1.0]],
      [[-1.2, -0.3, 0.6], [-3, -0.8, 1.5], [-5, -1.5, 2.2], [-6.5, -2, 2.5]],
      [[-1.2, 0.1, -0.6], [-2.5, 0.5, -1.5], [-4.5, 1.0, -2.5], [-6, 1.5, -3.2]],
      [[-1.2, 0.9, -0.2], [-2.5, 2.2, -0.5], [-4, 3.0, -0.8], [-5.5, 3.5, -1.2]],
      [[-1.2, -0.7, -0.4], [-2.5, -1.8, -0.8], [-4, -2.8, -0.3], [-5.5, -3.5, 0.5]],
      [[-1.2, 0.3, 0.8], [-2, 1.0, 2.0], [-3.5, 1.5, 3.0], [-4.5, 1.8, 3.5]],
    ];

    const branchPaths = [
      // Sub-branches from main dendrites
      [[-4.5, 2.5, 1.2], [-5.5, 3.5, 2.5], [-6.5, 4.2, 3.0]],
      [[-4.5, 2.5, 1.2], [-5.0, 1.5, 2.0], [-5.5, 0.8, 2.8]],
      [[-3, -0.8, 1.5], [-4, -1.8, 2.5], [-4.8, -2.5, 3.0]],
      [[-4.5, 1.0, -2.5], [-5.5, 0.5, -3.5], [-6.2, 0, -4]],
      [[-2.5, 2.2, -0.5], [-3.5, 3.0, -1.5], [-4.5, 3.5, -2.0]],
      [[-4, -2.8, -0.3], [-5, -3.5, -1.5], [-6, -4, -2.0]],
    ];

    const allPaths = [...dendritePaths, ...branchPaths];

    for (let i = 0; i < allPaths.length; i++) {
      const path = allPaths[i];
      const points = path.map(p => new THREE.Vector3(p[0], p[1], p[2]));
      const curve = new THREE.CatmullRomCurve3(points);

      const isBranch = i >= dendritePaths.length;
      const radius = isBranch ? 0.06 : 0.1;
      const segments = isBranch ? 12 : 20;

      const tubeGeo = new THREE.TubeGeometry(curve, segments, radius, 6, false);
      const mat = new THREE.MeshPhysicalMaterial({
        color: isBranch ? 0x8e24aa : 0x9c27b0,
        emissive: 0x4a148c,
        emissiveIntensity: 0.15,
        roughness: 0.5,
        metalness: 0.05,
        transparent: true,
        opacity: isBranch ? 0.7 : 0.85,
      });

      const mesh = new THREE.Mesh(tubeGeo, mat);
      this.group.add(mesh);
      this.dendriteMeshes.push({ mesh, radius, isBranch });

      // Add small spines on main dendrites
      if (!isBranch && points.length > 2) {
        for (let s = 0; s < 4; s++) {
          const t = 0.2 + s * 0.2;
          const pt = curve.getPointAt(t);
          const spineGeo = new THREE.SphereGeometry(0.04, 6, 6);
          const spineMat = new THREE.MeshPhysicalMaterial({
            color: 0xce93d8,
            emissive: 0x7b1fa2,
            emissiveIntensity: 0.2,
          });
          const spine = new THREE.Mesh(spineGeo, spineMat);
          const offset = new THREE.Vector3(
            (Math.random() - 0.5) * 0.3,
            (Math.random() - 0.5) * 0.3,
            (Math.random() - 0.5) * 0.3
          );
          spine.position.copy(pt).add(offset);
          this.group.add(spine);
        }
      }
    }
  }

  // ── Axon Hillock (transition from soma to axon) ─────

  buildAxonHillock() {
    const points = [
      new THREE.Vector3(1.1, 0, 0),
      new THREE.Vector3(1.6, 0.05, 0),
      new THREE.Vector3(2.2, 0.02, 0),
      new THREE.Vector3(this.axonStartX, 0, 0),
    ];
    const curve = new THREE.CatmullRomCurve3(points);

    // Tapered tube (custom radii not directly supported, use tube with constant radius)
    const geo = new THREE.TubeGeometry(curve, 12, 0.14, 8, false);
    const mat = new THREE.MeshPhysicalMaterial({
      color: 0x5c6bc0,
      emissive: 0x1a237e,
      emissiveIntensity: 0.2,
      roughness: 0.4,
      metalness: 0.1,
    });

    this.hillockMesh = new THREE.Mesh(geo, mat);
    this.group.add(this.hillockMesh);
  }

  // ── Axon Segments ───────────────────────────────────

  buildAxonSegments() {
    const segLen = this.segmentLength;
    const r = this.axonRadius;
    const startX = this.axonStartX;

    for (let i = 0; i < this.numSegments; i++) {
      const x = startX + i * segLen;
      const geo = new THREE.CylinderGeometry(r, r, segLen, 8, 1);
      geo.rotateZ(-Math.PI / 2); // align along X

      const mat = new THREE.MeshPhysicalMaterial({
        color: COLOR_RESTING.clone(),
        emissive: new THREE.Color(0x000000),
        emissiveIntensity: 0,
        roughness: 0.4,
        metalness: 0.15,
        clearcoat: 0.2,
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x + segLen / 2, 0, 0);
      this.group.add(mesh);
      this.segmentMeshes.push(mesh);
    }
  }

  // ── Myelin Sheaths ──────────────────────────────────

  buildMyelinSheaths() {
    const segLen = this.segmentLength;
    const r = this.myelinRadius;
    const startX = this.axonStartX;

    // Each group of 5 segments: index 0 is node, 1-4 are myelinated
    for (let g = 0; g < 10; g++) {
      const myelinStartSeg = g * 5 + 1;
      const myelinEndSeg = g * 5 + 4;

      const x1 = startX + myelinStartSeg * segLen;
      const x2 = startX + (myelinEndSeg + 1) * segLen;
      const length = x2 - x1;
      const centerX = (x1 + x2) / 2;

      const geo = new THREE.CylinderGeometry(r, r, length, 12, 1);
      geo.rotateZ(-Math.PI / 2);

      const mat = new THREE.MeshPhysicalMaterial({
        color: 0xfff3e0,
        emissive: 0x4e342e,
        emissiveIntensity: 0.05,
        transparent: true,
        opacity: 0.28,
        roughness: 0.7,
        metalness: 0.02,
        side: THREE.DoubleSide,
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(centerX, 0, 0);
      this.group.add(mesh);
      this.myelinMeshes.push(mesh);

      // Add ring details at myelin edges
      for (const xr of [x1, x2]) {
        const ringGeo = new THREE.TorusGeometry(r + 0.01, 0.015, 6, 16);
        ringGeo.rotateY(Math.PI / 2);
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0xffe0b2,
          transparent: true,
          opacity: 0.3,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.set(xr, 0, 0);
        this.group.add(ring);
      }
    }
  }

  // ── Axon Terminals ──────────────────────────────────

  buildAxonTerminals() {
    const endX = this.axonStartX + this.numSegments * this.segmentLength;

    const termPaths = [
      [[endX, 0, 0], [endX + 1, 0.3, 0.2], [endX + 2.5, 0.8, 0.5], [endX + 3.5, 1.2, 0.8]],
      [[endX, 0, 0], [endX + 1, -0.2, -0.3], [endX + 2.5, -0.6, -0.6], [endX + 3.5, -0.9, -0.8]],
      [[endX, 0, 0], [endX + 1, 0.1, -0.2], [endX + 2, 0.3, -0.5], [endX + 3, 0.5, -0.7]],
      [[endX, 0, 0], [endX + 0.8, -0.1, 0.3], [endX + 2, -0.4, 0.6], [endX + 3, -0.6, 0.9]],
    ];

    for (const path of termPaths) {
      const points = path.map(p => new THREE.Vector3(p[0], p[1], p[2]));
      const curve = new THREE.CatmullRomCurve3(points);

      const tubeGeo = new THREE.TubeGeometry(curve, 12, 0.06, 6, false);
      const mat = new THREE.MeshPhysicalMaterial({
        color: 0x5c6bc0,
        emissive: 0x1a237e,
        emissiveIntensity: 0.15,
        roughness: 0.4,
        metalness: 0.1,
      });
      const mesh = new THREE.Mesh(tubeGeo, mat);
      this.group.add(mesh);
      this.terminalMeshes.push(mesh);

      // Synaptic bouton at the end
      const endPt = points[points.length - 1];
      const boutonGeo = new THREE.SphereGeometry(0.12, 12, 12);
      const boutonMat = new THREE.MeshPhysicalMaterial({
        color: 0x7986cb,
        emissive: 0x303f9f,
        emissiveIntensity: 0.3,
        roughness: 0.3,
        metalness: 0.15,
        clearcoat: 0.5,
      });
      const bouton = new THREE.Mesh(boutonGeo, boutonMat);
      bouton.position.copy(endPt);
      this.group.add(bouton);
    }
  }

  // ── Ion Particle System ─────────────────────────────

  buildIonParticleSystem() {
    const posArr = new Float32Array(this.maxParticles * 3);
    const colArr = new Float32Array(this.maxParticles * 3);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colArr, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.22,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    this.ionParticles = new THREE.Points(geo, mat);
    this.group.add(this.ionParticles);

    // Init particle data
    this.particleData = [];

    // Build ion label sprites at each Node of Ranvier
    this.buildIonLabels();
  }

  // ── Ion Label Sprites (Na⁺ / K⁺) ───────────────────

  _createLabelSprite(text, color) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 128, 64);
    ctx.font = 'bold 32px Inter, Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Glow
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    ctx.fillStyle = color;
    ctx.fillText(text, 64, 32);
    // Second pass for brightness
    ctx.shadowBlur = 4;
    ctx.fillText(text, 64, 32);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    const mat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(1.0, 0.5, 1);
    return sprite;
  }

  buildIonLabels() {
    // Create Na⁺ and K⁺ label pairs at each Node of Ranvier
    for (let g = 0; g < 11; g++) {
      const nodeIdx = g * 5;
      if (nodeIdx >= this.numSegments) break;
      const segX = this.axonStartX + (nodeIdx + 0.5) * this.segmentLength;

      // Na⁺ label (above axon — shows during depolarization)
      const naSprite = this._createLabelSprite('Na⁺ ↓', '#ff9500');
      naSprite.position.set(segX, 0.7, 0);
      this.group.add(naSprite);

      // K⁺ label (below axon — shows during repolarization)
      const kSprite = this._createLabelSprite('K⁺ ↑', '#7c6cff');
      kSprite.position.set(segX, -0.7, 0);
      this.group.add(kSprite);

      this.ionLabels.push({ nodeIdx, naSprite, kSprite, naOpacity: 0, kOpacity: 0 });
    }
  }

  // ── Ground Reference Plane ──────────────────────────

  buildGroundPlane() {
    const gridSize = 80;
    const gridGeo = new THREE.PlaneGeometry(gridSize, gridSize, 40, 40);
    const gridMat = new THREE.MeshBasicMaterial({
      color: 0x1a1a2e,
      wireframe: true,
      transparent: true,
      opacity: 0.05,
    });
    const grid = new THREE.Mesh(gridGeo, gridMat);
    grid.rotation.x = -Math.PI / 2;
    grid.position.set(20, -3, 0);
    this.scene.add(grid);
  }

  // ═══════════════════════════════════════════════════
  // UPDATE METHODS
  // ═══════════════════════════════════════════════════

  // ── Update Voltages → Colors ────────────────────────

  updateVoltages(voltages) {
    this.emitCounter++;
    const shouldEmit = (this.emitCounter % 2) === 0; // emit every 2nd call

    for (let i = 0; i < this.numSegments; i++) {
      const V = voltages[i];
      const color = voltageToColor(V);
      const emIntensity = voltageToEmissive(V);

      const mat = this.segmentMeshes[i].material;
      mat.color.copy(color);
      mat.emissive.copy(color);
      mat.emissiveIntensity = emIntensity;

      // ── Continuous ion emission based on voltage phase ──
      if (shouldEmit && isNode(i)) {
        const dV = V - this.prevV[i];

        // DEPOLARIZATION phase: Na⁺ rushing IN (V rising above -40)
        if (V > -40 && dV > 0.2) {
          const intensity = Math.min(1, (V + 40) / 80);
          this.emitIonsAtSegment(i, 'na', 2 + Math.floor(intensity * 4));
        }

        // REPOLARIZATION phase: K⁺ rushing OUT (V falling from peak)
        if (V > -60 && dV < -0.2) {
          const intensity = Math.min(1, Math.abs(dV) / 3);
          this.emitIonsAtSegment(i, 'k', 2 + Math.floor(intensity * 4));
        }
      }

      this.prevV[i] = V;
    }

    // ── Update ion labels opacity ──
    for (const label of this.ionLabels) {
      const V = voltages[label.nodeIdx] || -65;
      const dV = V - (this.prevV[label.nodeIdx] || -65);

      // Na⁺ label visible during depolarization
      const naTarget = (V > -40 && dV > 0) ? Math.min(1, (V + 40) / 50) : 0;
      label.naOpacity += (naTarget - label.naOpacity) * 0.15;
      label.naSprite.material.opacity = label.naOpacity;
      label.naSprite.material.needsUpdate = true;
      // Pulse scale
      const naScale = 1 + label.naOpacity * 0.3;
      label.naSprite.scale.set(naScale, naScale * 0.5, 1);

      // K⁺ label visible during repolarization
      const kTarget = (V > -60 && dV < -0.5) ? Math.min(1, Math.abs(dV) / 2) : 0;
      label.kOpacity += (kTarget - label.kOpacity) * 0.15;
      label.kSprite.material.opacity = label.kOpacity;
      label.kSprite.material.needsUpdate = true;
      const kScale = 1 + label.kOpacity * 0.3;
      label.kSprite.scale.set(kScale, kScale * 0.5, 1);
    }
  }

  // ── Emit Ion Particles at a Segment ─────────────────

  emitIonsAtSegment(segIndex, ionType, count = 3) {
    const segX = this.axonStartX + (segIndex + 0.5) * this.segmentLength;

    for (let i = 0; i < count; i++) {
      if (this.particleData.length >= this.maxParticles) return;

      const isNa = ionType === 'na';
      const angle = Math.random() * Math.PI * 2;

      if (isNa) {
        // Na⁺ INWARD: particles start ABOVE axon, move DOWN toward center
        const startY = 0.35 + Math.random() * 0.25;
        const startZ = (Math.random() - 0.5) * 0.4;
        this.particleData.push({
          x: segX + (Math.random() - 0.5) * 0.25,
          y: startY,
          z: startZ,
          vx: (Math.random() - 0.5) * 0.15,
          vy: -(0.8 + Math.random() * 0.6),  // strong downward = INTO axon
          vz: (Math.random() - 0.5) * 0.2,
          life: 1.0,
          decay: 1.2 + Math.random() * 0.6,
          r: 1.0,    // bright orange-gold
          g: 0.65,
          b: 0.0,
          size: 0.18 + Math.random() * 0.1,
        });
      } else {
        // K⁺ OUTWARD: particles start AT axon, move OUT (downward/sideways)
        const dir = Math.random() > 0.5 ? 1 : -1;
        this.particleData.push({
          x: segX + (Math.random() - 0.5) * 0.25,
          y: -(0.05 + Math.random() * 0.1),
          z: (Math.random() - 0.5) * 0.15,
          vx: (Math.random() - 0.5) * 0.15,
          vy: -(0.6 + Math.random() * 0.5),  // downward = OUT of axon
          vz: dir * (0.3 + Math.random() * 0.4),
          life: 1.0,
          decay: 1.0 + Math.random() * 0.5,
          r: 0.45,   // blue-purple
          g: 0.35,
          b: 1.0,
          size: 0.16 + Math.random() * 0.08,
        });
      }
    }
  }

  // ── Update Ion Particles ────────────────────────────

  updateIonParticles(dt) {
    const positions = this.ionParticles.geometry.attributes.position.array;
    const colors = this.ionParticles.geometry.attributes.color.array;

    // Update existing particles
    for (let i = this.particleData.length - 1; i >= 0; i--) {
      const p = this.particleData[i];
      p.life -= dt * p.decay;

      if (p.life <= 0) {
        this.particleData.splice(i, 1);
        continue;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;

      // Slow down
      p.vx *= 0.98;
      p.vy *= 0.98;
      p.vz *= 0.98;
    }

    // Write to buffers
    for (let i = 0; i < this.maxParticles; i++) {
      if (i < this.particleData.length) {
        const p = this.particleData[i];
        positions[i * 3] = p.x;
        positions[i * 3 + 1] = p.y;
        positions[i * 3 + 2] = p.z;
        colors[i * 3] = p.r * p.life;
        colors[i * 3 + 1] = p.g * p.life;
        colors[i * 3 + 2] = p.b * p.life;
      } else {
        positions[i * 3] = 0;
        positions[i * 3 + 1] = -100; // hide
        positions[i * 3 + 2] = 0;
        colors[i * 3] = 0;
        colors[i * 3 + 1] = 0;
        colors[i * 3 + 2] = 0;
      }
    }

    this.ionParticles.geometry.attributes.position.needsUpdate = true;
    this.ionParticles.geometry.attributes.color.needsUpdate = true;
    this.ionParticles.geometry.setDrawRange(0, Math.max(this.particleData.length, 1));
  }

  // ═══════════════════════════════════════════════════
  // CONDITION VISUALS
  // ═══════════════════════════════════════════════════

  /**
   * applyConditionVisuals(condition) — kondisi hanya mengubah indikator
   * visual situs Kv1.1 (Node of Ranvier tengah) dan warna aksen, TIDAK
   * mengubah geometri myelin/akson/dendrit (topik ini adalah disfungsi
   * kanal K+, bukan demielinasi atau atrofi akson).
   */
  applyConditionVisuals(condition) {
    // Myelin & akson & dendrit selalu utuh (myelin intact) untuk EA1
    this.myelinMeshes.forEach((mesh) => {
      mesh.material.opacity = 0.28;
      mesh.material.color.set(0xfff3e0);
      mesh.material.emissive.set(0x4e342e);
      mesh.material.emissiveIntensity = 0.05;
      mesh.scale.set(1, 1, 1);
    });
    for (const seg of this.segmentMeshes) seg.scale.set(1, 1, 1);
    if (this.somaMesh) this.somaMesh.scale.set(1, 1, 1);
    this.dendriteMeshes.forEach(({ mesh, isBranch }) => {
      mesh.scale.set(1, 1, 1);
      mesh.material.opacity = isBranch ? 0.7 : 0.85;
    });

    // ── Sorot situs Kv1.1 (Node of Ranvier di tengah akson) ──
    const kv11NodeIdx = Math.round(this.numSegments / 2 / 5) * 5;
    if (!this.kv11Ring) this._buildKv11Marker(kv11NodeIdx);
    const isAltered = condition.id === 'altered';
    const accent = new THREE.Color(isAltered ? 0xA70B27 : 0x2563EB);
    if (this.kv11Ring) {
      this.kv11Ring.material.color.copy(accent);
      this.kv11Ring.material.opacity = isAltered ? 0.9 : 0.35;
      const pulse = isAltered ? 1.25 : 1.0;
      this.kv11Ring.scale.set(pulse, pulse, pulse);
    }
    this.currentCondition = condition.id;
  }

  _buildKv11Marker(nodeIdx) {
    const x = this.axonStartX + (nodeIdx + 0.5) * this.segmentLength;
    const geo = new THREE.TorusGeometry(0.32, 0.035, 10, 28);
    geo.rotateY(Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({ color: 0x2563EB, transparent: true, opacity: 0.35 });
    this.kv11Ring = new THREE.Mesh(geo, mat);
    this.kv11Ring.position.set(x, 0, 0);
    this.group.add(this.kv11Ring);
    this.kv11NodeIdx = nodeIdx;
  }

  // ── Get Center Position (for camera target) ─────────

  getCenter() {
    const midX = this.axonStartX + (this.numSegments * this.segmentLength) / 2;
    return new THREE.Vector3(midX, 0, 0);
  }

  getLength() {
    return this.numSegments * this.segmentLength;
  }
}
