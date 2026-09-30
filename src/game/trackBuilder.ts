import * as THREE from 'three';
import { TrackDefinition, TrackId } from '../types/game';

export interface TrackData {
  curve: THREE.CatmullRomCurve3;
  roadMesh: THREE.Mesh;
  barrierMeshes: THREE.Mesh[];
  trackGroup: THREE.Group;
  rainSystem?: THREE.Points;
  updateEnvironment: (delta: number, playerPos: THREE.Vector3) => void;
  length: number;
}

export interface TrafficCar {
  mesh: THREE.Group;
  t: number; // progress 0 to 1 along curve
  speed: number; // progress speed
  laneOffset: number; // lateral offset from center
}

export interface AIRival {
  name: string;
  mesh: THREE.Group;
  t: number;
  targetSpeed: number;
  currentSpeed: number;
  laneOffset: number;
  lap: number;
  finished: boolean;
}

// Generates track control points based on track ID
export function getTrackPoints(trackId: TrackId): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];

  if (trackId === 'midnight_city') {
    // Urban grand circuit with long straights, 90-degree city turns, chicane, tunnel
    points.push(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -220),
      new THREE.Vector3(60, 2, -380),
      new THREE.Vector3(220, 0, -450),
      new THREE.Vector3(420, -1, -380),
      new THREE.Vector3(480, 0, -200),
      new THREE.Vector3(430, 4, 0),
      new THREE.Vector3(320, 8, 180), // elevated overpass
      new THREE.Vector3(180, 5, 260),
      new THREE.Vector3(40, 0, 280),
      new THREE.Vector3(-140, 0, 180),
      new THREE.Vector3(-180, 0, 20),
      new THREE.Vector3(-100, 0, -40)
    );
  } else if (trackId === 'rainy_boulevard') {
    // S-curves, industrial waterfront, bridges, sharp hairpin
    points.push(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(20, 0, -200),
      new THREE.Vector3(120, 0, -320),
      new THREE.Vector3(280, 2, -340),
      new THREE.Vector3(380, 0, -220),
      new THREE.Vector3(320, 0, -80),
      new THREE.Vector3(200, 0, 40),
      new THREE.Vector3(280, 4, 180), // bridge over water
      new THREE.Vector3(360, 2, 320),
      new THREE.Vector3(240, 0, 420), // hairpin
      new THREE.Vector3(80, 0, 360),
      new THREE.Vector3(-60, 0, 200),
      new THREE.Vector3(-40, 0, 50)
    );
  } else {
    // Sunset Highway: sweeping mountain coastal turns, elevation changes
    points.push(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 4, -260),
      new THREE.Vector3(140, 12, -440),
      new THREE.Vector3(340, 18, -480),
      new THREE.Vector3(520, 14, -360),
      new THREE.Vector3(580, 6, -160),
      new THREE.Vector3(480, 0, 80),
      new THREE.Vector3(320, -3, 260),
      new THREE.Vector3(120, 2, 380),
      new THREE.Vector3(-80, 8, 360),
      new THREE.Vector3(-220, 12, 220),
      new THREE.Vector3(-240, 6, 40),
      new THREE.Vector3(-120, 0, -30)
    );
  }

  return points;
}

export function buildTrack(trackDef: TrackDefinition): TrackData {
  const points = getTrackPoints(trackDef.id);
  const curve = new THREE.CatmullRomCurve3(points, true, 'centripetal', 0.5);
  const trackGroup = new THREE.Group();

  const numSegments = 380;
  const roadWidth = 17;

  // Road geometry creation
  const roadPositions: number[] = [];
  const roadNormals: number[] = [];
  const roadUvs: number[] = [];
  const roadIndices: number[] = [];

  // Barrier geometry creation
  const leftBarrierPositions: number[] = [];
  const rightBarrierPositions: number[] = [];

  const up = new THREE.Vector3(0, 1, 0);

  for (let i = 0; i <= numSegments; i++) {
    const t = i / numSegments;
    const pt = curve.getPointAt(t % 1);
    const tangent = curve.getTangentAt(t % 1).normalize();
    const binormal = new THREE.Vector3().crossVectors(tangent, up).normalize();

    // Left and Right road edge vertices
    const leftPt = pt.clone().add(binormal.clone().multiplyScalar(-roadWidth * 0.5));
    const rightPt = pt.clone().add(binormal.clone().multiplyScalar(roadWidth * 0.5));

    roadPositions.push(leftPt.x, leftPt.y, leftPt.z);
    roadPositions.push(rightPt.x, rightPt.y, rightPt.z);

    roadNormals.push(0, 1, 0);
    roadNormals.push(0, 1, 0);

    const uvV = (i / numSegments) * 90;
    roadUvs.push(0, uvV);
    roadUvs.push(1, uvV);

    // Left barrier
    leftBarrierPositions.push(leftPt.x, leftPt.y, leftPt.z);
    leftBarrierPositions.push(leftPt.x, leftPt.y + 1.2, leftPt.z);

    // Right barrier
    rightBarrierPositions.push(rightPt.x, rightPt.y, rightPt.z);
    rightBarrierPositions.push(rightPt.x, rightPt.y + 1.2, rightPt.z);

    if (i < numSegments) {
      const base = i * 2;
      // Road quad (2 triangles)
      roadIndices.push(base, base + 1, base + 2);
      roadIndices.push(base + 1, base + 3, base + 2);
    }
  }

  // Build Road Mesh
  const roadGeo = new THREE.BufferGeometry();
  roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(roadPositions, 3));
  roadGeo.setAttribute('normal', new THREE.Float32BufferAttribute(roadNormals, 3));
  roadGeo.setAttribute('uv', new THREE.Float32BufferAttribute(roadUvs, 2));
  roadGeo.setIndex(roadIndices);

  // Procedural road texture with center dashed neon line & edge borders
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Dark asphalt base
  ctx.fillStyle = trackDef.rain ? '#101217' : '#141419';
  ctx.fillRect(0, 0, 512, 1024);

  // Noise texture on asphalt
  ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
  for (let n = 0; n < 3000; n++) {
    const rx = Math.random() * 512;
    const ry = Math.random() * 1024;
    ctx.fillRect(rx, ry, 2, 2);
  }

  // Curbs / side stripes (pink/violet or red/white)
  const stripeColor = trackDef.neonTheme === 'sunset_gold' ? '#f59e0b' : '#ec4899';
  ctx.fillStyle = stripeColor;
  ctx.fillRect(0, 0, 24, 1024);
  ctx.fillRect(512 - 24, 0, 24, 1024);

  // Center dashed line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.lineWidth = 10;
  ctx.setLineDash([60, 60]);
  ctx.beginPath();
  ctx.moveTo(256, 0);
  ctx.lineTo(256, 1024);
  ctx.stroke();

  // Lane dividers
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 4;
  ctx.setLineDash([40, 50]);
  ctx.beginPath();
  ctx.moveTo(138, 0);
  ctx.lineTo(138, 1024);
  ctx.moveTo(374, 0);
  ctx.lineTo(374, 1024);
  ctx.stroke();

  const roadTex = new THREE.CanvasTexture(canvas);
  roadTex.wrapS = THREE.RepeatWrapping;
  roadTex.wrapT = THREE.RepeatWrapping;
  roadTex.repeat.set(1, 40);

  const roadMat = new THREE.MeshStandardMaterial({
    map: roadTex,
    roughness: trackDef.rain ? 0.15 : 0.45,
    metalness: trackDef.rain ? 0.65 : 0.2,
  });

  const roadMesh = new THREE.Mesh(roadGeo, roadMat);
  roadMesh.receiveShadow = true;
  trackGroup.add(roadMesh);

  // Guard Rails / Barriers
  const barrierIndices: number[] = [];
  for (let i = 0; i < numSegments; i++) {
    const base = i * 2;
    barrierIndices.push(base, base + 1, base + 2);
    barrierIndices.push(base + 1, base + 3, base + 2);
  }

  const leftBarrierGeo = new THREE.BufferGeometry();
  leftBarrierGeo.setAttribute('position', new THREE.Float32BufferAttribute(leftBarrierPositions, 3));
  leftBarrierGeo.setIndex(barrierIndices);
  leftBarrierGeo.computeVertexNormals();

  const rightBarrierGeo = new THREE.BufferGeometry();
  rightBarrierGeo.setAttribute('position', new THREE.Float32BufferAttribute(rightBarrierPositions, 3));
  rightBarrierGeo.setIndex(barrierIndices);
  rightBarrierGeo.computeVertexNormals();

  const barrierMat = new THREE.MeshStandardMaterial({
    color: 0x1b1c24,
    metalness: 0.8,
    roughness: 0.3,
  });

  const leftBarrier = new THREE.Mesh(leftBarrierGeo, barrierMat);
  const rightBarrier = new THREE.Mesh(rightBarrierGeo, barrierMat);
  trackGroup.add(leftBarrier);
  trackGroup.add(rightBarrier);

  // Start / Finish Line Gantry
  const startPt = curve.getPointAt(0);
  const startTangent = curve.getTangentAt(0).normalize();
  const startBinormal = new THREE.Vector3().crossVectors(startTangent, up).normalize();

  const gantryGroup = new THREE.Group();
  const gantryMat = new THREE.MeshStandardMaterial({ color: 0x22222c, metalness: 0.8 });
  const neonPinkMat = new THREE.MeshStandardMaterial({
    color: 0xec4899,
    emissive: 0xec4899,
    emissiveIntensity: 2.0,
  });

  // Vertical posts
  const postGeo = new THREE.BoxGeometry(1.2, 8.5, 1.2);
  const postLeft = new THREE.Mesh(postGeo, gantryMat);
  postLeft.position.copy(startPt).add(startBinormal.clone().multiplyScalar(-roadWidth * 0.58));
  postLeft.position.y += 4.2;

  const postRight = new THREE.Mesh(postGeo, gantryMat);
  postRight.position.copy(startPt).add(startBinormal.clone().multiplyScalar(roadWidth * 0.58));
  postRight.position.y += 4.2;

  // Cross arch
  const archGeo = new THREE.BoxGeometry(roadWidth * 1.25, 1.4, 1.6);
  const archMesh = new THREE.Mesh(archGeo, gantryMat);
  archMesh.position.copy(startPt);
  archMesh.position.y += 8.2;
  archMesh.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), startBinormal);

  // Glowing Start sign banner
  const bannerGeo = new THREE.BoxGeometry(roadWidth * 0.7, 0.9, 0.2);
  const bannerMesh = new THREE.Mesh(bannerGeo, neonPinkMat);
  bannerMesh.position.copy(startPt);
  bannerMesh.position.y += 8.2;
  bannerMesh.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), startBinormal);

  gantryGroup.add(postLeft);
  gantryGroup.add(postRight);
  gantryGroup.add(archMesh);
  gantryGroup.add(bannerMesh);
  trackGroup.add(gantryGroup);

  // Streetlights & Neon Architecture
  const streetLightMat = new THREE.MeshStandardMaterial({
    color: trackDef.neonTheme === 'sunset_gold' ? 0xffb703 : 0xec4899,
    emissive: trackDef.neonTheme === 'sunset_gold' ? 0xffb703 : 0xec4899,
    emissiveIntensity: 2.2,
  });

  const cyanLightMat = new THREE.MeshStandardMaterial({
    color: 0x06b6d4,
    emissive: 0x06b6d4,
    emissiveIntensity: 2.0,
  });

  const numLights = 32;
  for (let i = 0; i < numLights; i++) {
    const t = i / numLights;
    const pt = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t).normalize();
    const binormal = new THREE.Vector3().crossVectors(tangent, up).normalize();
    const side = i % 2 === 0 ? 1 : -1;

    // Pole
    const polePos = pt.clone().add(binormal.clone().multiplyScalar(side * (roadWidth * 0.55 + 1.2)));
    const poleMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 7.5, 8), gantryMat);
    poleMesh.position.copy(polePos);
    poleMesh.position.y += 3.75;
    trackGroup.add(poleMesh);

    // Lamp arm
    const lampArm = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.16, 0.16), gantryMat);
    lampArm.position.copy(polePos);
    lampArm.position.y += 7.2;
    lampArm.position.add(binormal.clone().multiplyScalar(-side * 1.0));
    trackGroup.add(lampArm);

    // Glowing bulb
    const bulbMat = i % 3 === 0 ? cyanLightMat : streetLightMat;
    const lampBulb = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 12), bulbMat);
    lampBulb.position.copy(polePos);
    lampBulb.position.y += 7.1;
    lampBulb.position.add(binormal.clone().multiplyScalar(-side * 2.0));
    trackGroup.add(lampBulb);
  }

  // Track scenery: Skyscrapers or Mountain ridges
  if (trackDef.id === 'midnight_city' || trackDef.id === 'rainy_boulevard') {
    // Generate towering neon skyscrapers
    const buildingMat = new THREE.MeshStandardMaterial({
      color: 0x0c0e14,
      roughness: 0.7,
      metalness: 0.3,
    });

    const windowColors = [0xec4899, 0xa855f7, 0x06b6d4, 0x3b82f6];

    for (let b = 0; b < 65; b++) {
      const t = (b / 65) + Math.random() * 0.02;
      const pt = curve.getPointAt(t % 1);
      const tangent = curve.getTangentAt(t % 1).normalize();
      const binormal = new THREE.Vector3().crossVectors(tangent, up).normalize();

      const sideDist = 26 + Math.random() * 55;
      const side = Math.random() > 0.5 ? 1 : -1;
      const bPos = pt.clone().add(binormal.clone().multiplyScalar(side * sideDist));

      const bWidth = 24 + Math.random() * 28;
      const bDepth = 24 + Math.random() * 28;
      const bHeight = 45 + Math.random() * 95;

      const bMesh = new THREE.Mesh(new THREE.BoxGeometry(bWidth, bHeight, bDepth), buildingMat);
      bMesh.position.set(bPos.x, bPos.y + bHeight * 0.5 - 2, bPos.z);
      trackGroup.add(bMesh);

      // Neon rooftop strip or logo
      const roofStripGeo = new THREE.BoxGeometry(bWidth * 0.95, 2.5, bDepth * 0.95);
      const roofCol = windowColors[b % windowColors.length];
      const roofMat = new THREE.MeshStandardMaterial({
        color: roofCol,
        emissive: roofCol,
        emissiveIntensity: 1.5,
      });
      const roofStrip = new THREE.Mesh(roofStripGeo, roofMat);
      roofStrip.position.set(bPos.x, bPos.y + bHeight - 1, bPos.z);
      trackGroup.add(roofStrip);
    }
  } else {
    // Sunset Highway: mountains and rocky terrain
    const mountainMat = new THREE.MeshStandardMaterial({
      color: 0x1f1424,
      roughness: 0.9,
    });
    for (let m = 0; m < 45; m++) {
      const t = m / 45;
      const pt = curve.getPointAt(t % 1);
      const tangent = curve.getTangentAt(t % 1).normalize();
      const binormal = new THREE.Vector3().crossVectors(tangent, up).normalize();
      const sideDist = 45 + Math.random() * 80;
      const side = Math.random() > 0.5 ? 1 : -1;
      const mPos = pt.clone().add(binormal.clone().multiplyScalar(side * sideDist));

      const mRadius = 40 + Math.random() * 60;
      const mHeight = 50 + Math.random() * 85;
      const mountain = new THREE.Mesh(new THREE.ConeGeometry(mRadius, mHeight, 7), mountainMat);
      mountain.position.set(mPos.x, mPos.y + mHeight * 0.45, mPos.z);
      trackGroup.add(mountain);
    }
  }

  // Rain particle system if rain track
  let rainSystem: THREE.Points | undefined;
  if (trackDef.rain) {
    const rainCount = 1800;
    const rainPositions = new Float32Array(rainCount * 3);
    for (let r = 0; r < rainCount; r++) {
      rainPositions[r * 3] = (Math.random() - 0.5) * 140;
      rainPositions[r * 3 + 1] = Math.random() * 45;
      rainPositions[r * 3 + 2] = (Math.random() - 0.5) * 140;
    }
    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
    const rainMat = new THREE.PointsMaterial({
      color: 0x93c5fd,
      size: 0.5,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
    });
    rainSystem = new THREE.Points(rainGeo, rainMat);
    trackGroup.add(rainSystem);
  }

  const trackLength = curve.getLength();

  return {
    curve,
    roadMesh,
    barrierMeshes: [leftBarrier, rightBarrier],
    trackGroup,
    rainSystem,
    length: trackLength,
    updateEnvironment(delta: number, playerPos: THREE.Vector3) {
      if (rainSystem) {
        // Move rain system with player
        rainSystem.position.copy(playerPos);
        const pos = rainSystem.geometry.attributes.position.array as Float32Array;
        for (let i = 1; i < pos.length; i += 3) {
          pos[i] -= delta * 70; // Fall downward
          if (pos[i] < -2) {
            pos[i] = 45;
          }
        }
        rainSystem.geometry.attributes.position.needsUpdate = true;
      }
    },
  };
}

// Spawns ambient traffic cars on the circuit
export function createTrafficSystem(curve: THREE.CatmullRomCurve3, count = 7): TrafficCar[] {
  const traffic: TrafficCar[] = [];
  const carColors = [0x475569, 0x64748b, 0x334155, 0x94a3b8, 0x1e293b];

  for (let i = 0; i < count; i++) {
    const group = new THREE.Group();
    const color = carColors[i % carColors.length];

    // Sedan / hatchback body
    const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.5 });
    const cabinMat = new THREE.MeshStandardMaterial({ color: 0x05070a, roughness: 0.1 });
    const headMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1.5 });
    const tailMat = new THREE.MeshStandardMaterial({ color: 0xff002b, emissive: 0xff002b, emissiveIntensity: 1.2 });

    const bodyMesh = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.65, 3.8), bodyMat);
    bodyMesh.position.y = 0.45;
    group.add(bodyMesh);

    const cabinMesh = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.55, 2.0), cabinMat);
    cabinMesh.position.set(0, 0.95, -0.2);
    group.add(cabinMesh);

    // Headlights
    const hl1 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.1), headMat);
    hl1.position.set(-0.6, 0.45, 1.9);
    const hl2 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.1), headMat);
    hl2.position.set(0.6, 0.45, 1.9);
    group.add(hl1);
    group.add(hl2);

    // Taillights
    const tl1 = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.12, 0.1), tailMat);
    tl1.position.set(-0.6, 0.55, -1.9);
    const tl2 = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.12, 0.1), tailMat);
    tl2.position.set(0.6, 0.55, -1.9);
    group.add(tl1);
    group.add(tl2);

    // Progress along curve
    const t = (i / count + 0.12) % 1;
    // Alternate lanes: -4.5 or 4.5
    const laneOffset = (i % 2 === 0 ? 1 : -1) * (3.8 + Math.random() * 1.5);
    const speed = 0.015 + Math.random() * 0.008; // ~50 - 70 km/h

    traffic.push({ mesh: group, t, speed, laneOffset });
  }

  return traffic;
}

// Spawns 3 AI Rivals competing against player
export function createAIRivals(curve: THREE.CatmullRomCurve3): AIRival[] {
  const rivalsData = [
    { name: 'KIRA', color: 0x38bdf8, baseSpeed: 0.048, offset: -2.8 },
    { name: 'VESPER', color: 0xa855f7, baseSpeed: 0.046, offset: 2.8 },
    { name: 'NYX', color: 0xf43f5e, baseSpeed: 0.044, offset: -1.2 },
  ];

  return rivalsData.map((d, index) => {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({
      color: d.color,
      metalness: 0.8,
      roughness: 0.25,
    });
    const cabinMat = new THREE.MeshStandardMaterial({ color: 0x05070a, roughness: 0.1 });
    const headMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1.8 });
    const tailMat = new THREE.MeshStandardMaterial({ color: 0xff0033, emissive: 0xff0033, emissiveIntensity: 1.5 });

    // Sleek sports silhouette
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.55, 4.0), bodyMat);
    body.position.y = 0.42;
    group.add(body);

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.45, 2.2), cabinMat);
    cabin.position.set(0, 0.82, -0.2);
    group.add(cabin);

    // Spoiler
    const spoiler = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.06, 0.35), bodyMat);
    spoiler.position.set(0, 0.95, -1.8);
    group.add(spoiler);

    // Headlights & Taillights
    const hl = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 0.1), headMat);
    hl.position.set(0, 0.42, 2.0);
    group.add(hl);

    const tl = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 0.1), tailMat);
    tl.position.set(0, 0.52, -2.0);
    group.add(tl);

    // Initial grid position slightly ahead or behind start line
    const startT = (0.015 * (index + 1));

    return {
      name: d.name,
      mesh: group,
      t: startT,
      targetSpeed: d.baseSpeed,
      currentSpeed: 0,
      laneOffset: d.offset,
      lap: 1,
      finished: false,
    };
  });
}
