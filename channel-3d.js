/**
 * channel-3d.js — Visualisasi 3D pembesaran membran hingga tingkat kanal ion
 *
 * CATATAN PENTING: Ini adalah VISUALISASI KONSEPTUAL/SKEMATIK, bukan
 * struktur atom/kristalografi Kv1.1 yang sebenarnya, dan bukan simulasi
 * mekanisme molekuler mutasi KCNA1 tertentu. Bentuk gate, filter selektif,
 * dan pori digambarkan secara sederhana untuk membantu intuisi tentang:
 * (1) posisi kanal pada bilayer lipid, (2) probabilitas keadaan terbuka
 * (n^4 dari model HH), dan (3) arah aliran ion K+ saat kanal terbuka.
 *
 * Konsentrasi ion TIDAK disimulasikan secara dinamis (model HH klasik
 * bekerja pada level konduktansi/arus, dengan potensial reversal E_K yang
 * dianggap konstan) — gradien konsentrasi hanya ditampilkan sebagai panah
 * statis ilustratif, dan diberi label jelas agar tidak disalahartikan
 * sebagai kuantitas yang dihitung.
 */

import * as THREE from 'three';

export class Channel3D {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.kIons = [];       // partikel K+ yang sedang animasi
    this.maxKIons = 80;
    this.emitAccumulator = 0;

    this.build();
  }

  build() {
    this.buildBilayer();
    this.buildKv11Channel();
    this.buildNaChannelSchematic();
    this.buildLeakChannelSchematic();
    this.buildGradientArrows();
    this.buildKIonPool();
  }

  // ── Bilayer lipid (dua lapisan kepala + inti hidrofobik) ──────────────
  buildBilayer() {
    const w = 10, d = 6;

    const coreGeo = new THREE.BoxGeometry(w, 1.6, d);
    const coreMat = new THREE.MeshPhysicalMaterial({
      color: 0xffe9c7, transparent: true, opacity: 0.28, roughness: 0.6, metalness: 0.0,
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    this.group.add(core);

    const headMat = (color) => new THREE.MeshPhysicalMaterial({
      color, roughness: 0.4, metalness: 0.05, transparent: true, opacity: 0.9,
    });

    for (const sign of [1, -1]) {
      const y = sign * 0.9;
      const rows = 8, cols = 12;
      for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
          if (Math.random() < 0.15) continue; // ruang untuk kanal
          const x = -w / 2 + 0.3 + (j / (cols - 1)) * (w - 0.6);
          const z = -d / 2 + 0.3 + (i / (rows - 1)) * (d - 0.6);
          // lewati area di sekitar kanal (x antara -1.6..2.6)
          if (x > -1.8 && x < 2.8 && Math.abs(z) < 1.6) continue;
          const geo = new THREE.SphereGeometry(0.16, 8, 8);
          const mesh = new THREE.Mesh(geo, headMat(sign > 0 ? 0xffcc80 : 0xffd9a0));
          mesh.position.set(x, y, z);
          this.group.add(mesh);
        }
      }
    }

    // Label zona (sprite teks)
    this.group.add(this._label('Ekstraseluler', 0xF7F9FC, '#1D4ED8', 0, 2.7, 0, 2.2));
    this.group.add(this._label('Intraseluler', 0xF7F9FC, '#1D4ED8', 0, -2.7, 0, 2.2));
  }

  // ── Kanal Kv1.1 / K+ (hero object) ────────────────────────────────────
  buildKv11Channel() {
    const grp = new THREE.Group();
    grp.position.set(0, 0, 0);

    // Dinding pori (tabung)
    const poreGeo = new THREE.CylinderGeometry(0.55, 0.7, 2.6, 24, 1, true);
    const poreMat = new THREE.MeshPhysicalMaterial({
      color: 0x93C5FD, transparent: true, opacity: 0.35, side: THREE.DoubleSide, roughness: 0.5,
    });
    const pore = new THREE.Mesh(poreGeo, poreMat);
    grp.add(pore);

    // Empat subunit protein mengelilingi pori (representasi tetramer Kv1.1)
    this.subunitMeshes = [];
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      const geo = new THREE.CapsuleGeometry(0.32, 1.9, 4, 10);
      const mat = new THREE.MeshPhysicalMaterial({ color: 0x2563EB, roughness: 0.35, metalness: 0.1, clearcoat: 0.3 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(Math.cos(angle) * 0.85, 0, Math.sin(angle) * 0.85);
      grp.add(mesh);
      this.subunitMeshes.push(mesh);
    }

    // Filter selektivitas (cincin di sisi ekstraseluler)
    const filterGeo = new THREE.TorusGeometry(0.42, 0.09, 10, 24);
    filterGeo.rotateX(Math.PI / 2);
    const filterMat = new THREE.MeshPhysicalMaterial({ color: 0xFACC15, roughness: 0.3, metalness: 0.2 });
    this.filterRing = new THREE.Mesh(filterGeo, filterMat);
    this.filterRing.position.set(0, 1.05, 0);
    grp.add(this.filterRing);

    // Gate (gerbang) sisi intraseluler — terbuka/tertutup mengikuti n^4
    const gateGeo = new THREE.TorusGeometry(0.5, 0.12, 10, 24);
    gateGeo.rotateX(Math.PI / 2);
    const gateMat = new THREE.MeshPhysicalMaterial({ color: 0x1D4ED8, roughness: 0.4 });
    this.gateRing = new THREE.Mesh(gateGeo, gateMat);
    this.gateRing.position.set(0, -1.1, 0);
    grp.add(this.gateRing);

    // Label "Kv1.1 / K+"
    grp.add(this._label('Kv1.1 / K+', 0xF7F9FC, '#1D4ED8', 0, 1.9, 0, 1.6));

    this.kv11Group = grp;
    this.group.add(grp);
  }

  buildNaChannelSchematic() {
    const grp = new THREE.Group();
    grp.position.set(-3.4, 0, 0);
    const geo = new THREE.CylinderGeometry(0.42, 0.5, 2.2, 16, 1, true);
    const mat = new THREE.MeshPhysicalMaterial({ color: 0xFDBA74, transparent: true, opacity: 0.4, side: THREE.DoubleSide });
    grp.add(new THREE.Mesh(geo, mat));
    const capGeo = new THREE.CapsuleGeometry(0.5, 1.6, 4, 10);
    const capMat = new THREE.MeshPhysicalMaterial({ color: 0xF97316, roughness: 0.35 });
    grp.add(new THREE.Mesh(capGeo, capMat));
    grp.add(this._label('Kanal Na+', 0xF7F9FC, '#C2410C', 0, 1.7, 0, 1.4));
    this.naGroup = grp;
    this.group.add(grp);
  }

  buildLeakChannelSchematic() {
    const grp = new THREE.Group();
    grp.position.set(3.6, 0, 0);
    const geo = new THREE.CylinderGeometry(0.3, 0.34, 2.0, 14, 1, true);
    const mat = new THREE.MeshPhysicalMaterial({ color: 0xCBD5E1, transparent: true, opacity: 0.4, side: THREE.DoubleSide });
    grp.add(new THREE.Mesh(geo, mat));
    grp.add(this._label('Kanal Leak', 0xF7F9FC, '#475569', 0, 1.5, 0, 1.2));
    this.group.add(grp);
  }

  buildGradientArrows() {
    // Panah ilustratif arah gradien K+ (tinggi di intraseluler -> rendah di ekstraseluler)
    // CATATAN: ilustratif/statis, konsentrasi tidak disimulasikan dinamis.
    const arrowGrp = new THREE.Group();
    const dir = new THREE.Vector3(0, 1, 0);
    const origin = new THREE.Vector3(1.6, -1.3, 1.6);
    const arrow = new THREE.ArrowHelper(dir, origin, 2.8, 0x16A34A, 0.35, 0.2);
    arrowGrp.add(arrow);
    arrowGrp.add(this._label('Gradien [K+] (ilustratif)', 0xF7F9FC, '#15803D', 1.6, 1.7, 1.6, 1.6));
    this.group.add(arrowGrp);
  }

  buildKIonPool() {
    const posArr = new Float32Array(this.maxKIons * 3).fill(0);
    const colArr = new Float32Array(this.maxKIons * 3);
    for (let i = 0; i < this.maxKIons; i++) { colArr[i*3]=0.13; colArr[i*3+1]=0.55; colArr[i*3+2]=0.93; posArr[i*3+1] = -100; }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colArr, 3));
    const mat = new THREE.PointsMaterial({ size: 0.22, vertexColors: true, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
    this.kPoints = new THREE.Points(geo, mat);
    this.group.add(this.kPoints);
    this.kData = [];
  }

  _label(text, bg, color, x, y, z, scale = 1.6) {
    const canvas = document.createElement('canvas');
    canvas.width = 300; canvas.height = 80;
    const ctx = canvas.getContext('2d');
    ctx.font = 'bold 34px Inter, Arial, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.fillText(text, 150, 40);
    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(scale, scale * (80/300), 1);
    sprite.position.set(x, y, z);
    return sprite;
  }

  /**
   * update(model, conditionId) — dipanggil setiap frame saat simulasi
   * berjalan. Semua gerakan/gate/warna diturunkan langsung dari status
   * model HH (n, gK instan, IK), bukan animasi lepas.
   */
  update(model, conditionId, dt) {
    const openProb = model.getKOpenProbability();      // n^4, 0..1
    const gInstant = model.getInstantGK();              // mS/cm^2
    const V = model.V[0];
    const IK = model.params.gK * openProb * (V - model.params.EK);

    // Gate: menutup rapat saat openProb rendah, terbuka lebar saat tinggi
    const gateScale = 0.55 + openProb * 0.9;
    this.gateRing.scale.set(gateScale, 1, gateScale);
    this.gateRing.material.color.set(openProb > 0.4 ? 0x22C55E : 0x1D4ED8);

    // Warna subunit merefleksikan kondisi (biru=normal, maroon=altered)
    const accent = conditionId === 'altered' ? 0xA70B27 : 0x2563EB;
    for (const s of this.subunitMeshes) s.material.color.set(accent);

    // Filter berkedip halus mengikuti openProb
    this.filterRing.material.emissive = this.filterRing.material.emissive || new THREE.Color(0);
    this.filterRing.scale.set(1, 1, 1 + openProb * 0.1);

    // Emisi ion K+ baru sebanding dengan arus K+ keluar (IK > 0 artinya keluar sel)
    this.emitAccumulator += Math.max(0, IK) * dt * 0.02;
    while (this.emitAccumulator > 1 && this.kData.length < this.maxKIons) {
      this.emitAccumulator -= 1;
      this.kData.push({
        x: (Math.random() - 0.5) * 0.5,
        y: -1.3,
        z: (Math.random() - 0.5) * 0.5,
        vy: 1.6 + Math.random() * 0.8,
        life: 1.0,
      });
    }

    // Update posisi partikel K+ (bergerak dari intraseluler ke ekstraseluler)
    for (let i = this.kData.length - 1; i >= 0; i--) {
      const p = this.kData[i];
      p.y += p.vy * dt;
      p.life -= dt * 0.35;
      if (p.y > 2.6 || p.life <= 0) this.kData.splice(i, 1);
    }

    const pos = this.kPoints.geometry.attributes.position.array;
    for (let i = 0; i < this.maxKIons; i++) {
      if (i < this.kData.length) {
        const p = this.kData[i];
        pos[i*3] = p.x; pos[i*3+1] = p.y; pos[i*3+2] = p.z;
      } else {
        pos[i*3+1] = -100;
      }
    }
    this.kPoints.geometry.attributes.position.needsUpdate = true;

    return { openProb, gInstant, IK, V };
  }
}
