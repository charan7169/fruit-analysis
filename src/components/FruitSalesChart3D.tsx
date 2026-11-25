import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  RotateCcw,
  Camera,
  ChevronDown,
  ChevronUp,
  Award,
  AlertTriangle,
  Eye,
  X,
  SlidersHorizontal,
} from 'lucide-react';
import { ComputedFruitSale, SalesSummaryMetrics, formatInr } from '../utils/salesAnalytics';

interface FruitSalesChart3DProps {
  rows: ComputedFruitSale[];
  metrics: SalesSummaryMetrics;
  selectedFruitId: string | null;
  onSelectFruit: (id: string | null) => void;
  onUploadCsvClick?: () => void;
}

interface HoveredBarInfo {
  fruit: ComputedFruitSale;
  screenX: number;
  screenY: number;
}

type CameraPreset = 'isometric' | 'front' | 'top' | 'spotlight';

// Pre-allocated scratch math helpers outside render loop (zero GC)
const _scratchVec3 = new THREE.Vector3();
const _targetCamPos = new THREE.Vector3();
const _targetLookAt = new THREE.Vector3();

/**
 * Generates a high-resolution procedural CanvasTexture for floating 3D billboards
 * and floor plaques, setting SRGBColorSpace and max anisotropy.
 */
function createLabelSpriteTexture(
  renderer: THREE.WebGLRenderer,
  fruit: ComputedFruitSale
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 220;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Card backing with subtle border
  const isHigh = fruit.isHighest;
  const isLow = fruit.isLowest;

  const bgFill = isHigh
    ? 'rgba(6, 78, 59, 0.95)'
    : isLow
    ? 'rgba(136, 19, 55, 0.95)'
    : 'rgba(15, 23, 42, 0.92)';
  const borderStroke = isHigh
    ? '#10B981'
    : isLow
    ? '#FB7185'
    : fruit.colorHex;

  // Draw rounded rect
  const r = 24;
  const x = 16;
  const y = 16;
  const w = canvas.width - 32;
  const h = canvas.height - 32;

  ctx.fillStyle = bgFill;
  ctx.strokeStyle = borderStroke;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
  ctx.stroke();

  // Top status or rank line
  ctx.font = 'bold 24px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = isHigh ? '#34D399' : isLow ? '#FDA4AF' : '#94A3B8';
  const badgeText = isHigh
    ? '★ HIGHEST SELLING'
    : isLow
    ? '▼ LOWEST SELLING'
    : `RANK #${fruit.rank} · ${fruit.category.toUpperCase()}`;
  ctx.fillText(badgeText, canvas.width / 2, 62);

  // Fruit Name
  ctx.font = 'bold 42px "Plus Jakarta Sans", Inter, sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(fruit.fruitName, canvas.width / 2, 114);

  // Sales Amount & Share
  ctx.font = 'bold 34px "JetBrains Mono", monospace';
  ctx.fillStyle = isHigh ? '#6EE7B7' : isLow ? '#FECDD3' : '#F8FAFC';
  ctx.fillText(
    `₹${fruit.totalSalesInr.toLocaleString('en-IN')} (${fruit.revenueSharePct.toFixed(1)}%)`,
    canvas.width / 2,
    166
  );

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  texture.needsUpdate = true;
  return texture;
}

/**
 * Generates a procedural brushed metal/stone micro-bump texture
 */
function createProceduralBumpTexture(renderer: THREE.WebGLRenderer): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, 128, 128);

  for (let y = 0; y < 128; y += 2) {
    const shade = 118 + Math.floor(Math.sin(y * 0.35) * 14);
    ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
    ctx.fillRect(0, y, 128, 1);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 4);
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}

/**
 * Generates a soft radial contact shadow texture
 */
function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 8, 64, 64, 60);
  grad.addColorStop(0, 'rgba(15, 23, 42, 0.55)');
  grad.addColorStop(0.6, 'rgba(15, 23, 42, 0.22)');
  grad.addColorStop(1, 'rgba(15, 23, 42, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Builds a custom, anatomically recognizable multi-part 3D fruit sculpture for each fruit variety:
 * - Banana: Tapered crescent-shaped 5-ridged banana hand with green pedicel neck and dark floral tip
 * - Grapes: Hanging pyramidal bunch of 22 glossy round grape berries + woody vine stem & leaf
 * - Pineapple: Golden diamond-textured barrel body with crisscross bract rings + multi-tier spiky crown leaves
 * - Strawberry: Conical heart-shaped berry via LatheGeometry studded with golden seed achenes + 6-leaf green calyx
 * - Watermelon: Dark/light green longitudinal-striped oblong melon + bright crimson triangle wedge slice with black seeds
 * - Mango: S-curved Alphonso mango with golden-saffron body, curved beak tip, woody stem, and tropical leaf
 * - Orange / Citrus: Oblate dimpled tangerine sphere + bright segmented citrus half-slice leaning beside it
 * - Apple / Pomegranate / Kiwi / Papaya / Guava / Blueberry: Custom sculpted 3D silhouettes
 */
function createFruitEmblemGroup(fruit: ComputedFruitSale): THREE.Group {
  const emblem = new THREE.Group();
  const key = fruit.fruitName.trim().toLowerCase();

  const leafMat = new THREE.MeshStandardMaterial({
    color: 0x15803d,
    roughness: 0.45,
    metalness: 0.05,
  });
  const darkLeafMat = new THREE.MeshStandardMaterial({
    color: 0x166534,
    roughness: 0.52,
    metalness: 0.05,
  });
  const stemMat = new THREE.MeshStandardMaterial({
    color: 0x5c2d0c,
    roughness: 0.82,
    metalness: 0.04,
  });

  // 1. CRESCENT BANANA (Tapered curved 5-sided crescent geometry)
  if (key.includes('banana')) {
    const bananaMat = new THREE.MeshPhysicalMaterial({
      color: 0xfacc15,
      roughness: 0.3,
      metalness: 0.04,
      clearcoat: 0.45,
    });
    const greenTipMat = new THREE.MeshStandardMaterial({
      color: 0x65a30d,
      roughness: 0.55,
    });

    const createTaperedCrescentBanana = (
      zOffset: number,
      rotZ: number,
      rotY: number,
      scaleVal: number
    ) => {
      const bananaFinger = new THREE.Group();
      // Define a deep, unmistakable crescent arc in the XY plane
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.36, 0.34, 0),
        new THREE.Vector3(-0.22, 0.08, 0),
        new THREE.Vector3(0.0, -0.04, 0),
        new THREE.Vector3(0.22, 0.06, 0),
        new THREE.Vector3(0.36, 0.30, 0),
      ]);

      // Build custom tapered 5-sided banana mesh along the crescent curve
      const tubularSegments = 28;
      const radialSegments = 5; // Pentagonal cross-section like a real Cavendish banana
      const tubeGeo = new THREE.TubeGeometry(curve, tubularSegments, 0.095, radialSegments, false);

      // Taper both ends of the tube geometry so itpinches naturally at the stem and blossom tip
      const posAttr = tubeGeo.attributes.position;
      const centerPt = new THREE.Vector3();
      const vertexPt = new THREE.Vector3();

      for (let i = 0; i <= tubularSegments; i++) {
        const u = i / tubularSegments;
        curve.getPointAt(u, centerPt);
        // Parabolic taper profile: fat in middle (1.0), pinched at ends (0.28)
        const taper = Math.max(0.24, Math.sin(u * Math.PI) * 0.95 + 0.15);
        for (let j = 0; j <= radialSegments; j++) {
          const idx = i * (radialSegments + 1) + j;
          if (idx < posAttr.count) {
            vertexPt.fromBufferAttribute(posAttr, idx);
            vertexPt.sub(centerPt).multiplyScalar(taper).add(centerPt);
            posAttr.setXYZ(idx, vertexPt.x, vertexPt.y, vertexPt.z);
          }
        }
      }
      tubeGeo.computeVertexNormals();

      const bodyMesh = new THREE.Mesh(tubeGeo, bananaMat);
      bananaFinger.add(bodyMesh);

      // Green pedicel stem neck at left tip
      const stemNeck = new THREE.Mesh(
        new THREE.CylinderGeometry(0.022, 0.038, 0.11, 5),
        greenTipMat
      );
      stemNeck.position.set(-0.39, 0.39, 0);
      stemNeck.rotation.z = 0.55;
      bananaFinger.add(stemNeck);

      // Dark brown blossom tip at right end
      const darkTip = new THREE.Mesh(
        new THREE.SphereGeometry(0.026, 8, 8),
        stemMat
      );
      darkTip.position.set(0.37, 0.31, 0);
      bananaFinger.add(darkTip);

      bananaFinger.position.set(0, 0.06, zOffset);
      bananaFinger.rotation.set(0, rotY, rotZ);
      bananaFinger.scale.setScalar(scaleVal);
      return bananaFinger;
    };

    // Assemble a 3-finger crescent banana cluster
    emblem.add(createTaperedCrescentBanana(0.07, 0.04, 0.12, 1.05));
    emblem.add(createTaperedCrescentBanana(-0.04, -0.08, -0.08, 0.96));
    emblem.add(createTaperedCrescentBanana(-0.14, -0.18, -0.22, 0.88));

    // Green crown collar joining the banana stems
    const crown = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.07, 0.24, 8),
      greenTipMat
    );
    crown.rotation.x = Math.PI / 2;
    crown.position.set(-0.4, 0.42, -0.04);
    emblem.add(crown);

    return emblem;
  }

  // 2. BUNCH OF GRAPES (Conical hanging cluster of 24 distinct round berries + vine stem & leaf)
  if (key.includes('grape')) {
    const grapeMat = new THREE.MeshPhysicalMaterial({
      color: 0x7c3aed,
      roughness: 0.14,
      metalness: 0.08,
      clearcoat: 0.9,
      clearcoatRoughness: 0.1,
    });
    const grapeAccentMat = new THREE.MeshPhysicalMaterial({
      color: 0x6d28d9,
      roughness: 0.18,
      metalness: 0.08,
      clearcoat: 0.85,
    });

    const berryGeo = new THREE.SphereGeometry(0.082, 14, 12);

    // 5 tapering horizontal rings of round grape spheres forming a lush hanging bunch
    const tiers = [
      { y: 0.38, r: 0.15, count: 7 },
      { y: 0.27, r: 0.16, count: 7 },
      { y: 0.16, r: 0.13, count: 6 },
      { y: 0.06, r: 0.085, count: 4 },
      { y: -0.03, r: 0.045, count: 2 },
    ];

    tiers.forEach((tier, tIdx) => {
      for (let i = 0; i < tier.count; i++) {
        const angle = (i / tier.count) * Math.PI * 2 + tIdx * 0.45;
        const berry = new THREE.Mesh(
          berryGeo,
          (i + tIdx) % 2 === 0 ? grapeMat : grapeAccentMat
        );
        berry.position.set(
          Math.cos(angle) * tier.r,
          tier.y,
          Math.sin(angle) * tier.r
        );
        emblem.add(berry);
      }
    });

    // Bottom apex berry
    const bottomBerry = new THREE.Mesh(berryGeo, grapeMat);
    bottomBerry.position.set(0, -0.11, 0);
    emblem.add(bottomBerry);

    // Inner core fill so the cluster never has gaps
    const core1 = new THREE.Mesh(berryGeo, grapeAccentMat);
    core1.position.set(0, 0.3, 0);
    emblem.add(core1);
    const core2 = new THREE.Mesh(berryGeo, grapeMat);
    core2.position.set(0, 0.18, 0);
    emblem.add(core2);

    // Woody T-vine stem at the top
    const mainStem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.024, 0.035, 0.2, 8),
      stemMat
    );
    mainStem.position.set(0, 0.5, 0);
    emblem.add(mainStem);

    const crossVine = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.022, 0.26, 8),
      stemMat
    );
    crossVine.rotation.z = Math.PI / 2 - 0.2;
    crossVine.position.set(0.02, 0.57, 0);
    emblem.add(crossVine);

    // Broad grape leaf
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.22, 5), leafMat);
    leaf.position.set(0.13, 0.48, 0.05);
    leaf.rotation.z = -1.15;
    emblem.add(leaf);

    return emblem;
  }

  // 3. PINEAPPLE (Golden diamond-textured oval cylinder + spiky crown of radiating green leaves)
  if (key.includes('pineapple')) {
    // Procedural diamond scale texture on the pineapple body
    const pCanvas = document.createElement('canvas');
    pCanvas.width = 128;
    pCanvas.height = 128;
    const pCtx = pCanvas.getContext('2d')!;
    pCtx.fillStyle = '#d97706';
    pCtx.fillRect(0, 0, 128, 128);
    pCtx.strokeStyle = '#78350f';
    pCtx.lineWidth = 3;
    for (let i = -128; i < 256; i += 24) {
      pCtx.beginPath();
      pCtx.moveTo(i, 0);
      pCtx.lineTo(i + 128, 128);
      pCtx.stroke();
      pCtx.beginPath();
      pCtx.moveTo(i + 128, 0);
      pCtx.lineTo(i, 128);
      pCtx.stroke();
    }
    const pineTex = new THREE.CanvasTexture(pCanvas);
    pineTex.colorSpace = THREE.SRGBColorSpace;

    const pinePoints = [
      new THREE.Vector2(0.001, -0.14),
      new THREE.Vector2(0.16, -0.12),
      new THREE.Vector2(0.22, 0.02),
      new THREE.Vector2(0.22, 0.20),
      new THREE.Vector2(0.15, 0.32),
      new THREE.Vector2(0.001, 0.34),
    ];
    const bodyGeo = new THREE.LatheGeometry(pinePoints, 12);
    const bodyMat = new THREE.MeshStandardMaterial({
      map: pineTex,
      roughness: 0.48,
      metalness: 0.06,
      flatShading: true,
    });
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.position.y = 0.08;
    emblem.add(bodyMesh);

    // 3 tiers of spiky radiating pineapple crown leaves
    const leafGeo = new THREE.ConeGeometry(0.06, 0.28, 4);
    for (let i = 0; i < 7; i++) {
      const ang = (i / 7) * Math.PI * 2;
      const outerLeaf = new THREE.Mesh(leafGeo, leafMat);
      outerLeaf.position.set(Math.cos(ang) * 0.08, 0.44, Math.sin(ang) * 0.08);
      outerLeaf.rotation.x = Math.sin(ang) * 0.55;
      outerLeaf.rotation.z = -Math.cos(ang) * 0.55;
      emblem.add(outerLeaf);
    }
    for (let i = 0; i < 5; i++) {
      const ang = (i / 5) * Math.PI * 2 + 0.35;
      const midLeaf = new THREE.Mesh(leafGeo, darkLeafMat);
      midLeaf.position.set(Math.cos(ang) * 0.04, 0.52, Math.sin(ang) * 0.04);
      midLeaf.rotation.x = Math.sin(ang) * 0.28;
      midLeaf.rotation.z = -Math.cos(ang) * 0.28;
      emblem.add(midLeaf);
    }
    const centerSpike = new THREE.Mesh(leafGeo, leafMat);
    centerSpike.position.set(0, 0.57, 0);
    emblem.add(centerSpike);

    return emblem;
  }

  // 4. STRAWBERRY (Conical heart-shaped berry tapering to a bottom tip + yellow seed achenes + leafy star calyx)
  if (key.includes('strawberry')) {
    const berryPoints = [
      new THREE.Vector2(0.001, -0.18), // Pointed bottom apex
      new THREE.Vector2(0.08, -0.11),
      new THREE.Vector2(0.17, 0.01),
      new THREE.Vector2(0.24, 0.15),  // Wide upper shoulder
      new THREE.Vector2(0.21, 0.27),
      new THREE.Vector2(0.11, 0.32),
      new THREE.Vector2(0.001, 0.30),
    ];
    const berryGeo = new THREE.LatheGeometry(berryPoints, 18);
    const berryMat = new THREE.MeshPhysicalMaterial({
      color: 0xe11d48,
      roughness: 0.24,
      metalness: 0.05,
      clearcoat: 0.75,
    });
    const berryMesh = new THREE.Mesh(berryGeo, berryMat);
    berryMesh.position.y = 0.12;
    emblem.add(berryMesh);

    // Yellow seed achenes dotted across the conical body
    const seedGeo = new THREE.SphereGeometry(0.017, 6, 6);
    const seedMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      roughness: 0.35,
    });
    const seedRings = [
      { y: 0.05, r: 0.11, n: 6 },
      { y: 0.16, r: 0.19, n: 8 },
      { y: 0.28, r: 0.23, n: 9 },
    ];
    seedRings.forEach((ring, rIdx) => {
      for (let i = 0; i < ring.n; i++) {
        const ang = (i / ring.n) * Math.PI * 2 + rIdx * 0.4;
        const seed = new THREE.Mesh(seedGeo, seedMat);
        seed.position.set(Math.cos(ang) * ring.r, ring.y, Math.sin(ang) * ring.r);
        emblem.add(seed);
      }
    });

    // Green star calyx sepals on top
    const sepalGeo = new THREE.ConeGeometry(0.055, 0.19, 4);
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2;
      const sepal = new THREE.Mesh(sepalGeo, leafMat);
      sepal.position.set(Math.cos(ang) * 0.08, 0.43, Math.sin(ang) * 0.08);
      sepal.rotation.x = Math.PI / 2.2;
      sepal.rotation.y = -ang;
      emblem.add(sepal);
    }

    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.026, 0.14, 8),
      leafMat
    );
    stem.position.y = 0.49;
    emblem.add(stem);

    return emblem;
  }

  // 5. WATERMELON (Oblong striped green melon + bright crimson semicircular wedge slice in front)
  if (key.includes('watermelon')) {
    const wCanvas = document.createElement('canvas');
    wCanvas.width = 256;
    wCanvas.height = 128;
    const wCtx = wCanvas.getContext('2d')!;
    wCtx.fillStyle = '#22c55e';
    wCtx.fillRect(0, 0, 256, 128);
    wCtx.fillStyle = '#14532d';
    for (let i = 0; i < 8; i++) {
      wCtx.fillRect(i * 32 + 6, 0, 14, 128);
    }
    const stripeTex = new THREE.CanvasTexture(wCanvas);
    stripeTex.colorSpace = THREE.SRGBColorSpace;

    const melonGeo = new THREE.SphereGeometry(0.24, 20, 16);
    const melonMat = new THREE.MeshPhysicalMaterial({
      map: stripeTex,
      roughness: 0.22,
      clearcoat: 0.6,
    });
    const melonMesh = new THREE.Mesh(melonGeo, melonMat);
    melonMesh.scale.set(1.26, 0.95, 0.95);
    melonMesh.position.set(-0.06, 0.16, -0.06);
    emblem.add(melonMesh);

    // Bright crimson watermelon wedge slice leaning in front
    const rindGeo = new THREE.CylinderGeometry(0.23, 0.23, 0.075, 18, 1, false, 0, Math.PI);
    const rindMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.4 });
    const rindMesh = new THREE.Mesh(rindGeo, rindMat);
    rindMesh.rotation.x = Math.PI / 2;
    rindMesh.rotation.z = Math.PI;
    rindMesh.position.set(0.08, 0.16, 0.18);
    emblem.add(rindMesh);

    const fleshGeo = new THREE.CylinderGeometry(0.195, 0.195, 0.084, 18, 1, false, 0, Math.PI);
    const fleshMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.3 });
    const fleshMesh = new THREE.Mesh(fleshGeo, fleshMat);
    fleshMesh.rotation.x = Math.PI / 2;
    fleshMesh.rotation.z = Math.PI;
    fleshMesh.position.set(0.08, 0.17, 0.18);
    emblem.add(fleshMesh);

    return emblem;
  }

  // 6. MANGO (S-curved kidney/teardrop Alphonso mango with golden-orange blush & curved beak)
  if (key.includes('mango')) {
    const mCanvas = document.createElement('canvas');
    mCanvas.width = 128;
    mCanvas.height = 256;
    const mCtx = mCanvas.getContext('2d')!;
    const grad = mCtx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#ea580c'); // Saffron-red shoulder blush
    grad.addColorStop(0.45, '#f59e0b');
    grad.addColorStop(1, '#facc15'); // Golden yellow lower tip
    mCtx.fillStyle = grad;
    mCtx.fillRect(0, 0, 128, 256);
    const mangoTex = new THREE.CanvasTexture(mCanvas);
    mangoTex.colorSpace = THREE.SRGBColorSpace;

    const mangoPoints = [
      new THREE.Vector2(0.001, -0.22),
      new THREE.Vector2(0.10, -0.17),
      new THREE.Vector2(0.20, -0.02),
      new THREE.Vector2(0.25, 0.12),
      new THREE.Vector2(0.21, 0.26),
      new THREE.Vector2(0.11, 0.34),
      new THREE.Vector2(0.001, 0.36),
    ];
    const mangoGeo = new THREE.LatheGeometry(mangoPoints, 20);
    // Displace vertices in X as a function of Y to give the authentic S-curve mango kidney bend
    const pos = mangoGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const x = pos.getX(i);
      const bendOffset = Math.sin((y + 0.1) * 6.5) * 0.055;
      pos.setX(i, x + bendOffset);
    }
    mangoGeo.computeVertexNormals();

    const mangoMat = new THREE.MeshPhysicalMaterial({
      map: mangoTex,
      roughness: 0.22,
      metalness: 0.04,
      clearcoat: 0.65,
    });
    const mangoMesh = new THREE.Mesh(mangoGeo, mangoMat);
    mangoMesh.scale.set(1.0, 1.08, 0.76);
    mangoMesh.rotation.z = -0.18;
    mangoMesh.position.y = 0.16;
    emblem.add(mangoMesh);

    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.032, 0.15, 8),
      stemMat
    );
    stem.position.set(-0.04, 0.53, 0);
    stem.rotation.z = 0.2;
    emblem.add(stem);

    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.26, 5), leafMat);
    leaf.position.set(0.1, 0.51, 0);
    leaf.rotation.z = -1.15;
    emblem.add(leaf);

    return emblem;
  }

  // 7. ORANGE / CITRUS (Oblate tangerine + bright segmented citrus half-slice leaning in front)
  if (key.includes('orange') || key.includes('citrus')) {
    const orangeMat = new THREE.MeshPhysicalMaterial({
      color: 0xf97316,
      roughness: 0.36,
      metalness: 0.04,
      clearcoat: 0.45,
    });
    const wholeOrange = new THREE.Mesh(
      new THREE.SphereGeometry(0.23, 20, 16),
      orangeMat
    );
    wholeOrange.scale.set(1.05, 0.92, 1.05);
    wholeOrange.position.set(-0.07, 0.16, -0.04);
    emblem.add(wholeOrange);

    // Procedural segmented citrus wheel texture for the cut half-orange in front
    const cCanvas = document.createElement('canvas');
    cCanvas.width = 128;
    cCanvas.height = 128;
    const cCtx = cCanvas.getContext('2d')!;
    cCtx.fillStyle = '#ea580c';
    cCtx.beginPath();
    cCtx.arc(64, 64, 62, 0, Math.PI * 2);
    cCtx.fill();
    cCtx.fillStyle = '#fef3c7';
    cCtx.beginPath();
    cCtx.arc(64, 64, 54, 0, Math.PI * 2);
    cCtx.fill();
    cCtx.fillStyle = '#f97316';
    for (let s = 0; s < 8; s++) {
      const a1 = (s / 8) * Math.PI * 2 + 0.06;
      const a2 = ((s + 1) / 8) * Math.PI * 2 - 0.06;
      cCtx.beginPath();
      cCtx.moveTo(64, 64);
      cCtx.arc(64, 64, 48, a1, a2);
      cCtx.closePath();
      cCtx.fill();
    }
    const sliceTex = new THREE.CanvasTexture(cCanvas);
    sliceTex.colorSpace = THREE.SRGBColorSpace;

    const sliceDisc = new THREE.Mesh(
      new THREE.CylinderGeometry(0.17, 0.17, 0.07, 18),
      [
        orangeMat,
        new THREE.MeshStandardMaterial({ map: sliceTex, roughness: 0.3 }),
        orangeMat,
      ]
    );
    sliceDisc.rotation.x = Math.PI / 2.4;
    sliceDisc.rotation.z = -0.25;
    sliceDisc.position.set(0.14, 0.12, 0.17);
    emblem.add(sliceDisc);

    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.21, 5), leafMat);
    leaf.position.set(0.02, 0.4, -0.04);
    leaf.rotation.z = -1.05;
    emblem.add(leaf);

    return emblem;
  }

  // 8. DEFAULT / APPLE / POMEGRANATE / GUAVA (Indented sculpted pome fruit via LatheGeometry)
  const applePoints = [
    new THREE.Vector2(0.001, -0.16), // Bottom indentation
    new THREE.Vector2(0.12, -0.20),
    new THREE.Vector2(0.23, -0.08),
    new THREE.Vector2(0.26, 0.08),
    new THREE.Vector2(0.22, 0.23),
    new THREE.Vector2(0.11, 0.28),
    new THREE.Vector2(0.02, 0.21),  // Top stem dimple
    new THREE.Vector2(0.001, 0.19),
  ];
  const appleGeo = new THREE.LatheGeometry(applePoints, 20);
  const appleMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(fruit.colorHex),
    roughness: 0.18,
    metalness: 0.08,
    clearcoat: 0.8,
  });
  const appleMesh = new THREE.Mesh(appleGeo, appleMat);
  appleMesh.position.y = 0.16;
  emblem.add(appleMesh);

  const stemMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.022, 0.035, 0.18, 10),
    stemMat
  );
  stemMesh.position.set(0, 0.41, 0);
  stemMesh.rotation.z = 0.15;
  emblem.add(stemMesh);

  const leafMesh = new THREE.Mesh(new THREE.ConeGeometry(0.085, 0.22, 6), leafMat);
  leafMesh.position.set(0.11, 0.42, 0);
  leafMesh.rotation.z = -1.1;
  emblem.add(leafMesh);

  return emblem;
}

export const FruitSalesChart3D: React.FC<FruitSalesChart3DProps> = ({
  rows,
  metrics,
  selectedFruitId,
  onSelectFruit,
  onUploadCsvClick,
}) => {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const [hoveredBar, setHoveredBar] = useState<HoveredBarInfo | null>(null);
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [activePreset, setActivePreset] = useState<CameraPreset>('isometric');
  const [materialStyle, setMaterialStyle] = useState<'studio' | 'metallic'>('studio');

  // Mutable refs for WebGL loop access without re-mounting canvas
  const rowsRef = useRef<ComputedFruitSale[]>(rows);
  rowsRef.current = rows;
  const selectedIdRef = useRef<string | null>(selectedFruitId);
  selectedIdRef.current = selectedFruitId;
  const onSelectRef = useRef(onSelectFruit);
  onSelectRef.current = onSelectFruit;

  const sceneApiRef = useRef<{
    requestRender: () => void;
    setCameraPreset: (preset: CameraPreset) => void;
    rebuildBars: (
      currentRows: ComputedFruitSale[],
      currentMetrics: SalesSummaryMetrics,
      selectedId: string | null,
      matMode: 'studio' | 'metallic'
    ) => void;
  } | null>(null);

  const selectedFruit = rows.find((r) => r.id === selectedFruitId) ?? null;

  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    // 1. Software-WebGL detection per Three.js skill directive
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const width = container.clientWidth || 960;
    const height = container.clientHeight || 540;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const horizonColor = new THREE.Color(0xf1f5f9);
    scene.background = horizonColor;
    scene.fog = new THREE.FogExp2(0xf1f5f9, 0.018);

    // 2. Studio Environment Map via RoomEnvironment + PMREMGenerator
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTarget = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envTarget.texture;
    pmremGenerator.dispose();

    // 3. Camera & OrbitControls
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 160);
    camera.position.set(0, 7.8, 17.6);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2 - 0.03;
    controls.minDistance = 5;
    controls.maxDistance = 38;
    controls.target.set(0, 2.5, 0);

    // 4. Warm/Cool 3-Point Studio Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0xd1fae5, 0.85);
    hemiLight.position.set(0, 18, 0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfffbeb, 1.45);
    keyLight.position.set(9, 15, 10);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 40;
    const d = 12;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.55);
    rimLight.position.set(-10, 8, -9);
    scene.add(rimLight);

    // 5. Ground Stage Pedestal & Grid Floor (offset on Y to prevent coplanar Z-fighting)
    const stageGroup = new THREE.Group();
    scene.add(stageGroup);

    const floorGeo = new THREE.BoxGeometry(22, 0.24, 10);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.75,
      metalness: 0.08,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.position.y = -0.12;
    floorMesh.receiveShadow = true;
    stageGroup.add(floorMesh);

    const gridHelper = new THREE.GridHelper(22, 22, 0x94a3b8, 0xe2e8f0);
    gridHelper.position.y = 0.01;
    stageGroup.add(gridHelper);

    // Shared procedural textures
    const bumpTex = createProceduralBumpTexture(renderer);
    const shadowTex = createContactShadowTexture();

    // Dynamic Bars & Colliders Container
    const barsRoot = new THREE.Group();
    scene.add(barsRoot);
    let hitProxies: THREE.Mesh[] = [];
    const disposableResources: Array<{ dispose: () => void }> = [];

    // Smooth camera preset interpolation state
    let activeCameraTransition = false;
    _targetCamPos.copy(camera.position);
    _targetLookAt.copy(controls.target);

    controls.addEventListener('start', () => {
      activeCameraTransition = false;
    });

    // Software-WebGL safe afterDraw & on-demand requestRender
    let frameId = 0;
    let renderBusy = false;
    let renderDirty = false;
    const clock = new THREE.Clock();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl || typeof gl.fenceSync !== 'function') {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function requestRender() {
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = requestAnimationFrame(() => {
        renderDirty = false;
        const dt = Math.min(clock.getDelta(), 0.1);

        if (activeCameraTransition) {
          const factor = isSoftwareGl ? 1 : 1 - Math.exp(-7 * dt);
          camera.position.lerp(_targetCamPos, factor);
          controls.target.lerp(_targetLookAt, factor);
          if (
            camera.position.distanceToSquared(_targetCamPos) < 0.002 &&
            controls.target.distanceToSquared(_targetLookAt) < 0.002
          ) {
            camera.position.copy(_targetCamPos);
            controls.target.copy(_targetLookAt);
            activeCameraTransition = false;
          } else {
            renderDirty = true;
          }
        }

        controls.update();
        renderer.render(scene, camera);

        const done = () => {
          renderBusy = false;
          if (renderDirty) requestRender();
        };
        if (isSoftwareGl) afterDraw(done);
        else done();
      });
    }

    controls.addEventListener('change', requestRender);

    // Build 3-12 part composite procedural 3D column groups for each fruit
    function rebuildBars(
      currentRows: ComputedFruitSale[],
      currentMetrics: SalesSummaryMetrics,
      selectedId: string | null,
      matMode: 'studio' | 'metallic'
    ) {
      // Clear previous bars
      while (barsRoot.children.length > 0) {
        barsRoot.remove(barsRoot.children[0]);
      }
      disposableResources.forEach((r) => r.dispose());
      disposableResources.length = 0;
      hitProxies = [];

      if (currentRows.length === 0) {
        requestRender();
        return;
      }

      const maxSales = Math.max(...currentRows.map((r) => r.totalSalesInr), 1000);
      const maxBarHeight = 4.65;
      const count = currentRows.length;
      const spacing = Math.min(2.05, 15.2 / Math.max(count, 1));
      const startX = -((count - 1) * spacing) / 2;

      currentRows.forEach((fruit, index) => {
        const xPos = startX + index * spacing;
        const normalizedH = Math.max(0.45, (fruit.totalSalesInr / maxSales) * maxBarHeight);
        const isSelected = fruit.id === selectedId;

        // Composite THREE.Group (7+ distinct parts per column)
        const columnGroup = new THREE.Group();
        columnGroup.position.set(xPos, 0, 0);
        barsRoot.add(columnGroup);

        // Part 1: Soft radial contact shadow disc at y = 0.015
        const shadowGeo = new THREE.CircleGeometry(0.85, 24);
        const shadowMat = new THREE.MeshBasicMaterial({
          map: shadowTex,
          transparent: true,
          depthWrite: false,
          opacity: 0.55,
        });
        const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
        shadowMesh.rotation.x = -Math.PI / 2;
        shadowMesh.position.y = 0.015;
        columnGroup.add(shadowMesh);
        disposableResources.push(shadowGeo, shadowMat);

        // Part 2: Tiered Stone/Slate Plinth Base (roughness 0.75)
        const plinthGeo = new THREE.CylinderGeometry(0.62, 0.7, 0.18, 8);
        const plinthMat = new THREE.MeshStandardMaterial({
          color: isSelected ? 0x0f172a : 0x334155,
          roughness: 0.72,
          metalness: 0.2,
        });
        const plinthMesh = new THREE.Mesh(plinthGeo, plinthMat);
        plinthMesh.position.y = 0.09;
        plinthMesh.castShadow = !isSoftwareGl;
        plinthMesh.receiveShadow = true;
        columnGroup.add(plinthMesh);
        disposableResources.push(plinthGeo, plinthMat);

        // Part 3: Brushed Metallic Collar Ring (roughness 0.25, metalness 0.85)
        const collarGeo = new THREE.TorusGeometry(0.54, 0.045, 12, 24);
        const collarMat = new THREE.MeshStandardMaterial({
          color: fruit.isHighest ? 0xfbbf24 : fruit.isLowest ? 0xf43f5e : 0xe2e8f0,
          roughness: 0.22,
          metalness: 0.88,
        });
        const collarMesh = new THREE.Mesh(collarGeo, collarMat);
        collarMesh.rotation.x = Math.PI / 2;
        collarMesh.position.y = 0.19;
        columnGroup.add(collarMesh);
        disposableResources.push(collarGeo, collarMat);

        // Part 4: Primary Extruded Beveled Column Shaft (pivoted from bottom)
        const shape = new THREE.Shape();
        const half = 0.36;
        shape.moveTo(-half, -half);
        shape.lineTo(half, -half);
        shape.lineTo(half, half);
        shape.lineTo(-half, half);
        shape.closePath();

        const extrudeGeo = new THREE.ExtrudeGeometry(shape, {
          depth: normalizedH,
          bevelEnabled: true,
          bevelSegments: 3,
          steps: 1,
          bevelSize: 0.06,
          bevelThickness: 0.06,
        });
        extrudeGeo.rotateX(-Math.PI / 2);

        const shaftMat = new THREE.MeshPhysicalMaterial({
          color: new THREE.Color(fruit.colorHex),
          roughness: matMode === 'metallic' ? 0.18 : 0.32,
          metalness: matMode === 'metallic' ? 0.72 : 0.18,
          clearcoat: 0.65,
          clearcoatRoughness: 0.15,
          bumpMap: bumpTex,
          bumpScale: 0.008,
          emissive: new THREE.Color(fruit.colorHex),
          emissiveIntensity: isSelected ? 0.25 : fruit.isHighest ? 0.12 : 0.03,
        });

        const shaftMesh = new THREE.Mesh(extrudeGeo, shaftMat);
        shaftMesh.position.y = 0.22;
        shaftMesh.castShadow = !isSoftwareGl;
        shaftMesh.receiveShadow = true;
        columnGroup.add(shaftMesh);
        disposableResources.push(extrudeGeo, shaftMat);

        const topY = 0.22 + normalizedH + 0.06;

        // Part 5: Crown Capital Pedestal Cap (roughness 0.55)
        const capGeo = new THREE.CylinderGeometry(0.52, 0.44, 0.14, 8);
        const capMat = new THREE.MeshStandardMaterial({
          color: 0x1e293b,
          roughness: 0.55,
          metalness: 0.35,
        });
        const capMesh = new THREE.Mesh(capGeo, capMat);
        capMesh.position.y = topY + 0.05;
        columnGroup.add(capMesh);
        disposableResources.push(capGeo, capMat);

        // Part 6: Sculptural Multi-Part 3D Fruit Model atop the Capital (scaled prominently so shapes like Crescent Banana, Grape Bunch, Pineapple, Strawberry are unmistakable)
        const fruitEmblem = createFruitEmblemGroup(fruit);
        fruitEmblem.scale.setScalar(1.52);
        fruitEmblem.position.y = topY + 0.34;
        columnGroup.add(fruitEmblem);

        // Part 7: Special Glowing Crown Halo for HIGHEST or Amber/Crimson Warning Bezel for LOWEST
        if (fruit.isHighest) {
          const haloGeo = new THREE.TorusGeometry(0.74, 0.055, 16, 36);
          const haloMat = new THREE.MeshStandardMaterial({
            color: 0x10b981,
            emissive: 0x059669,
            emissiveIntensity: 0.7,
            roughness: 0.15,
            metalness: 0.9,
          });
          const haloMesh = new THREE.Mesh(haloGeo, haloMat);
          haloMesh.rotation.x = Math.PI / 2;
          haloMesh.position.y = topY + 0.12;
          columnGroup.add(haloMesh);
          disposableResources.push(haloGeo, haloMat);

          // Golden Trophy Crown Finial
          const crownGeo = new THREE.OctahedronGeometry(0.18, 0);
          const crownMat = new THREE.MeshStandardMaterial({
            color: 0xfbbf24,
            emissive: 0xd97706,
            emissiveIntensity: 0.5,
            roughness: 0.15,
            metalness: 0.95,
          });
          const crownMesh = new THREE.Mesh(crownGeo, crownMat);
          crownMesh.position.y = topY + 1.28;
          columnGroup.add(crownMesh);
          disposableResources.push(crownGeo, crownMat);
        } else if (fruit.isLowest) {
          const lowRingGeo = new THREE.TorusGeometry(0.7, 0.05, 12, 24);
          const lowRingMat = new THREE.MeshStandardMaterial({
            color: 0xf43f5e,
            emissive: 0xe11d48,
            emissiveIntensity: 0.65,
            roughness: 0.25,
            metalness: 0.8,
          });
          const lowRingMesh = new THREE.Mesh(lowRingGeo, lowRingMat);
          lowRingMesh.rotation.x = Math.PI / 2;
          lowRingMesh.position.y = topY + 0.12;
          columnGroup.add(lowRingMesh);
          disposableResources.push(lowRingGeo, lowRingMat);
        }

        // Part 8: Floating 3D Value Label Sprite above each column
        const labelTex = createLabelSpriteTexture(renderer, fruit);
        const spriteMat = new THREE.SpriteMaterial({
          map: labelTex,
          transparent: true,
          depthWrite: false,
        });
        const labelSprite = new THREE.Sprite(spriteMat);
        labelSprite.scale.set(2.15, 0.92, 1);
        labelSprite.position.set(0, topY + (fruit.isHighest ? 1.88 : 1.56), 0);
        columnGroup.add(labelSprite);
        disposableResources.push(labelTex, spriteMat);

        // Invisible simplified proxy bounding box for high-performance raycasting
        const proxyGeo = new THREE.BoxGeometry(1.15, normalizedH + 1.4, 1.15);
        const proxyMat = new THREE.MeshBasicMaterial({ visible: false });
        const proxyMesh = new THREE.Mesh(proxyGeo, proxyMat);
        proxyMesh.position.set(xPos, (normalizedH + 1.4) / 2, 0);
        proxyMesh.userData = { fruit, topY };
        barsRoot.add(proxyMesh);
        hitProxies.push(proxyMesh);
        disposableResources.push(proxyGeo, proxyMat);
      });

      // Add horizontal translucent 3D Mean Benchmark Ribbon across all columns
      if (currentMetrics.averageSalesInr > 0) {
        const meanH =
          0.22 + Math.max(0.45, (currentMetrics.averageSalesInr / maxSales) * maxBarHeight);
        const barWidthSpan = Math.max(8, count * spacing + 1.5);
        const ribbonGeo = new THREE.BoxGeometry(barWidthSpan, 0.045, 1.45);
        const ribbonMat = new THREE.MeshStandardMaterial({
          color: 0x0f172a,
          transparent: true,
          opacity: 0.28,
          roughness: 0.4,
        });
        const ribbonMesh = new THREE.Mesh(ribbonGeo, ribbonMat);
        ribbonMesh.position.set(0, meanH, 0);
        barsRoot.add(ribbonMesh);
        disposableResources.push(ribbonGeo, ribbonMat);
      }

      requestRender();
    }

    function setCameraPreset(preset: CameraPreset) {
      activeCameraTransition = true;
      if (preset === 'isometric') {
        _targetCamPos.set(5.8, 8.2, 16.8);
        _targetLookAt.set(0, 2.4, 0);
      } else if (preset === 'front') {
        _targetCamPos.set(0, 4.8, 17.8);
        _targetLookAt.set(0, 2.4, 0);
      } else if (preset === 'top') {
        _targetCamPos.set(0, 17.5, 4.5);
        _targetLookAt.set(0, 1.2, 0);
      } else if (preset === 'spotlight') {
        // Focus on highest-selling fruit
        const currentRows = rowsRef.current;
        const highIdx = currentRows.findIndex((r) => r.isHighest);
        if (highIdx >= 0) {
          const count = currentRows.length;
          const spacing = Math.min(2.05, 15.2 / Math.max(count, 1));
          const startX = -((count - 1) * spacing) / 2;
          const highX = startX + highIdx * spacing;
          _targetCamPos.set(highX + 2.6, 6.4, 9.6);
          _targetLookAt.set(highX, 2.8, 0);
        } else {
          _targetCamPos.set(0, 7.8, 17.6);
          _targetLookAt.set(0, 2.5, 0);
        }
      }
      requestRender();
    }

    // Raycasting for hover tooltips and click-to-inspect
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let lastHoverCheck = 0;

    function getHitFruit(clientX: number, clientY: number): {
      fruit: ComputedFruitSale;
      screenX: number;
      screenY: number;
    } | null {
      const rect = renderer.domElement.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return null;
      pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObjects(hitProxies, false);
      if (intersects.length > 0) {
        const hit = intersects[0].object;
        const fruit = hit.userData.fruit as ComputedFruitSale;
        const topY = (hit.userData.topY as number) || 3;
        _scratchVec3.set(hit.position.x, topY + 0.5, 0).project(camera);
        return {
          fruit,
          screenX: ((_scratchVec3.x + 1) / 2) * rect.width,
          screenY: (-(_scratchVec3.y - 1) / 2) * rect.height,
        };
      }
      return null;
    }

    const handlePointerMove = (e: PointerEvent) => {
      const now = performance.now();
      if (now - lastHoverCheck < 45) return; // Throttled <= 22Hz
      lastHoverCheck = now;

      const hit = getHitFruit(e.clientX, e.clientY);
      if (hit) {
        renderer.domElement.style.cursor = 'pointer';
        setHoveredBar(hit);
      } else {
        renderer.domElement.style.cursor = 'grab';
        setHoveredBar(null);
      }
    };

    let pointerDownPos = { x: 0, y: 0 };
    const handlePointerDown = (e: PointerEvent) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
    };

    const handlePointerUp = (e: PointerEvent) => {
      const dist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
      if (dist > 6) return; // Dragged orbit controls, ignore as click
      const hit = getHitFruit(e.clientX, e.clientY);
      if (hit) {
        onSelectRef.current(
          selectedIdRef.current === hit.fruit.id ? null : hit.fruit.id
        );
      }
    };

    const domElem = renderer.domElement;
    domElem.addEventListener('pointermove', handlePointerMove);
    domElem.addEventListener('pointerdown', handlePointerDown);
    domElem.addEventListener('pointerup', handlePointerUp);

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 960;
      const h = container.clientHeight || 540;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      requestRender();
    };
    window.addEventListener('resize', handleResize);

    // Pre-warm shaders on hardware WebGL
    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    sceneApiRef.current = {
      requestRender,
      setCameraPreset,
      rebuildBars,
    };

    // Initial build
    rebuildBars(rowsRef.current, metrics, selectedIdRef.current, 'studio');

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', handleResize);
      domElem.removeEventListener('pointermove', handlePointerMove);
      domElem.removeEventListener('pointerdown', handlePointerDown);
      domElem.removeEventListener('pointerup', handlePointerUp);
      controls.dispose();
      disposableResources.forEach((r) => r.dispose());
      bumpTex.dispose();
      shadowTex.dispose();
      floorGeo.dispose();
      floorMat.dispose();
      envTarget.dispose();
      renderer.dispose();
    };
  }, []);

  // Synchronize 3D bars whenever dataset, selection, or material mode updates
  useEffect(() => {
    sceneApiRef.current?.rebuildBars(rows, metrics, selectedFruitId, materialStyle);
  }, [rows, metrics, selectedFruitId, materialStyle]);

  const handlePresetClick = useCallback((preset: CameraPreset) => {
    setActivePreset(preset);
    sceneApiRef.current?.setCameraPreset(preset);
  }, []);

  return (
    <div
      data-testid="threejs-3d-chart-container"
      className="relative w-full h-[540px] sm:h-[580px] rounded-xl border border-slate-200 bg-slate-100 overflow-hidden shadow-xs select-none"
    >
      {/* Dedicated WebGL Mount Container (isolated from React HUD siblings) */}
      <div
        ref={canvasMountRef}
        data-testid="threejs-canvas-mount"
        className="w-full h-full"
        aria-label="Interactive 3D Fruit Sales Bar Chart Scene"
      />

      {/* Top-Left Minimal Spec Header Overlay (Solid/RGBA surface, zero backdrop-filter) */}
      <div className="absolute top-3.5 left-3.5 z-10 pointer-events-none flex flex-wrap items-center gap-2">
        <div
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.92)' }}
          className="px-3.5 py-2 rounded-lg border border-slate-700 text-white shadow-sm pointer-events-auto"
        >
          <div className="flex items-center gap-3 text-xs">
            <span className="font-semibold tracking-tight text-emerald-400">
              3D Studio Bar Chart
            </span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className="text-slate-300 font-mono tabular-nums">
              {rows.length} Fruits Active
            </span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className="text-slate-300 hidden sm:inline">
              Drag to Orbit · Scroll to Zoom · Click Column to Inspect
            </span>
          </div>
        </div>
      </div>

      {/* Empty Dataset State Overlay when no CSV is uploaded yet */}
      {rows.length === 0 && (
        <div
          data-testid="empty-3d-chart-overlay"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.94)' }}
          className="absolute inset-x-6 top-1/2 -translate-y-1/2 max-w-md mx-auto z-20 rounded-xl border border-slate-300 p-6 text-center shadow-md"
        >
          <h3 className="text-base font-bold text-slate-900">
            Awaiting CSV Dataset Upload
          </h3>
          <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
            Upload your fruit sales CSV file (with columns like <code className="font-mono text-[11px] bg-slate-100 px-1 py-0.5 rounded">Fruit Name, Category, Quantity Sold (kg), Unit Price (INR)</code>) to render the 3D bar columns and authentic 3D fruit sculptures (crescent banana, grape bunch, pineapple, strawberry, mango, watermelon).
          </p>
          {onUploadCsvClick && (
            <button
              type="button"
              onClick={onUploadCsvClick}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors cursor-pointer shadow-xs"
            >
              Upload CSV File to Render 3D Scene
            </button>
          )}
        </div>
      )}

      {/* Hover Tooltip Overlay */}
      {hoveredBar && (
        <div
          data-testid="threejs-hover-tooltip"
          style={{
            left: Math.min(Math.max(hoveredBar.screenX, 110), 760),
            top: Math.max(hoveredBar.screenY - 16, 65),
            transform: 'translate(-50%, -100%)',
            backgroundColor: 'rgba(15, 23, 42, 0.96)',
          }}
          className="absolute z-20 pointer-events-none px-3.5 py-2.5 rounded-lg border border-slate-700 text-white shadow-md min-w-[210px]"
        >
          <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-xs shrink-0"
                style={{ backgroundColor: hoveredBar.fruit.colorHex }}
              />
              <span className="font-bold text-sm">{hoveredBar.fruit.fruitName}</span>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              {hoveredBar.fruit.category}
            </span>
          </div>
          <div className="mt-1.5 space-y-1 text-xs font-mono tabular-nums">
            <div className="flex justify-between gap-4">
              <span className="text-slate-400">Quantity Sold:</span>
              <span className="font-semibold text-white">{hoveredBar.fruit.quantityKg} kg</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-400">Unit Price:</span>
              <span className="font-semibold text-white">₹{hoveredBar.fruit.unitPriceInr}/kg</span>
            </div>
            <div className="flex justify-between gap-4 pt-1 border-t border-slate-800">
              <span className="text-emerald-400 font-semibold">Total Sales:</span>
              <span className="font-bold text-emerald-300">
                {formatInr(hoveredBar.fruit.totalSalesInr)} ({hoveredBar.fruit.revenueSharePct.toFixed(1)}%)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Selected Fruit Quick Inspection Pill in Top-Right (only when a bar is clicked) */}
      {selectedFruit && (
        <div
          data-testid="selected-fruit-inspector"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.96)' }}
          className="absolute top-3.5 right-3.5 z-10 w-64 rounded-xl border border-slate-300 p-3.5 shadow-md text-slate-900"
        >
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="w-3 h-3 rounded-xs shrink-0"
                style={{ backgroundColor: selectedFruit.colorHex }}
              />
              <h4 className="font-bold text-sm truncate">{selectedFruit.fruitName}</h4>
            </div>
            <button
              type="button"
              onClick={() => onSelectFruit(null)}
              aria-label="Close fruit inspection panel"
              className="p-1 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="mt-2.5 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Category</span>
              <span className="font-semibold text-slate-800">{selectedFruit.category}</span>
            </div>
            <div className="flex justify-between font-mono tabular-nums">
              <span className="text-slate-500">Sales Rank</span>
              <span className="font-semibold text-slate-900">
                #{selectedFruit.rank} of {rows.length}
              </span>
            </div>
            <div className="flex justify-between font-mono tabular-nums">
              <span className="text-slate-500">Quantity × Price</span>
              <span className="font-semibold text-slate-900">
                {selectedFruit.quantityKg} kg × ₹{selectedFruit.unitPriceInr}
              </span>
            </div>
            <div className="flex justify-between font-mono tabular-nums pt-1.5 border-t border-slate-100">
              <span className="font-semibold text-slate-700">Total Revenue</span>
              <span className="font-bold text-emerald-700">
                {formatInr(selectedFruit.totalSalesInr)}
              </span>
            </div>
            <div className="flex justify-between font-mono tabular-nums">
              <span className="text-slate-500">Revenue Share</span>
              <span className="font-semibold text-slate-800">
                {selectedFruit.revenueSharePct.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Unified Collapsible Bottom Control Dock (Zero Viewport Occlusion, No backdrop-filter) */}
      <div
        style={{
          bottom: '14px',
          left: '50%',
          transform: 'translateX(-50%)',
          maxWidth: 'min(900px, 95%)',
        }}
        className="absolute z-10 w-full flex flex-col items-center pointer-events-none"
      >
        {/* Collapse / Expand Drawer Handle */}
        <button
          type="button"
          onClick={() => setDockCollapsed((prev) => !prev)}
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.94)' }}
          className="pointer-events-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-t-lg border border-b-0 border-slate-700 text-[11px] font-semibold text-slate-200 hover:text-white cursor-pointer transition-colors"
        >
          {dockCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5 text-emerald-400" />
              Show 3D Controls
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5 text-emerald-400" />
              Hide Controls
            </>
          )}
        </button>

        {/* Bottom Dock Body */}
        {!dockCollapsed && (
          <div
            style={{ backgroundColor: 'rgba(15, 23, 42, 0.95)' }}
            className="pointer-events-auto w-full rounded-xl border border-slate-700 px-3.5 py-2.5 text-white shadow-lg flex flex-wrap items-center justify-between gap-3"
          >
            {/* Camera View Presets */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-medium text-slate-400 mr-1 inline-flex items-center gap-1">
                <Camera className="w-3.5 h-3.5 text-emerald-400" />
                Camera:
              </span>
              {(
                [
                  { id: 'isometric', label: 'Isometric 3D' },
                  { id: 'front', label: 'Front Elevation' },
                  { id: 'top', label: 'Top Plan' },
                  { id: 'spotlight', label: 'Spotlight Highest' },
                ] as const
              ).map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handlePresetClick(preset.id)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    activePreset === preset.id
                      ? 'bg-emerald-600 text-white font-semibold'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Finish Switcher & Quick Fruit Inspector Selector */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() =>
                  setMaterialStyle((prev) => (prev === 'studio' ? 'metallic' : 'studio'))
                }
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-800 text-slate-200 hover:bg-slate-700 cursor-pointer whitespace-nowrap shrink-0"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
                Finish: {materialStyle === 'studio' ? 'Studio Satin' : 'Anodized Metallic'}
              </button>

              <button
                type="button"
                onClick={() => handlePresetClick('isometric')}
                aria-label="Reset 3D Camera View"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-800 text-slate-200 hover:bg-slate-700 cursor-pointer whitespace-nowrap shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
                Reset Camera
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
