import * as THREE from 'three';
import { CARS } from '../data/cars';
import { RimStyle } from '../types/game';

export interface Car3DInstance {
  group: THREE.Group;
  bodyMesh: THREE.Mesh;
  frontLeftWheel: THREE.Group;
  frontRightWheel: THREE.Group;
  rearLeftWheel: THREE.Group;
  rearRightWheel: THREE.Group;
  taillightMaterial: THREE.MeshStandardMaterial;
  headlightMaterial: THREE.MeshStandardMaterial;
  underglowLight: THREE.PointLight;
  underglowMesh: THREE.Mesh;
  nitroFlames: THREE.Mesh[];
  steerAngle: number;
  wheelRotation: number;
  update: (speed: number, steer: number, isBraking: boolean, isNitro: boolean, delta: number) => void;
  setUnderglowColor: (hexColor: string) => void;
  setRimStyle: (style: RimStyle) => void;
}

export function createCarModel(
  carId: string,
  underglowColor = '#ec4899',
  rimStyle: RimStyle = 'mesh',
  customBodyColor?: string
): Car3DInstance {
  const carDef = CARS.find((c) => c.id === carId) || CARS[0];
  const group = new THREE.Group();

  const bodyColor = customBodyColor || carDef.baseColor;
  const accentColor = carDef.accentColor;

  // Body paint material
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(bodyColor),
    metalness: 0.85,
    roughness: 0.22,
    envMapIntensity: 1.2,
  });

  const carbonMaterial = new THREE.MeshStandardMaterial({
    color: 0x111115,
    roughness: 0.5,
    metalness: 0.6,
  });

  const accentMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(accentColor),
    metalness: 0.7,
    roughness: 0.3,
  });

  const glassMaterial = new THREE.MeshStandardMaterial({
    color: 0x0a0c10,
    metalness: 0.9,
    roughness: 0.05,
    transparent: true,
    opacity: 0.88,
  });

  const taillightMaterial = new THREE.MeshStandardMaterial({
    color: 0x330005,
    emissive: 0xff1e46,
    emissiveIntensity: 0.8,
    roughness: 0.2,
  });

  const headlightMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0x93c5fd,
    emissiveIntensity: 1.6,
    roughness: 0.1,
  });

  // Base dimensions
  const length = 4.2;
  const width = 1.95;
  const height = 0.95;

  // 1. Lower chassis / floor
  const floorGeo = new THREE.BoxGeometry(width * 0.94, 0.2, length);
  const floorMesh = new THREE.Mesh(floorGeo, carbonMaterial);
  floorMesh.position.y = 0.25;
  group.add(floorMesh);

  // 2. Main aerodynamic body shape
  const bodyGeo = new THREE.BoxGeometry(width, 0.45, length * 0.92);
  const bodyMesh = new THREE.Mesh(bodyGeo, bodyMaterial);
  bodyMesh.position.y = 0.48;
  bodyMesh.castShadow = true;
  group.add(bodyMesh);

  // 3. Cockpit / Greenhouse cabin
  let cabinLength = length * 0.48;
  let cabinWidth = width * 0.78;
  let cabinZ = -0.15;

  if (carId === 'valkyrie_r' || carId === 'solaris_evo') {
    // Sleeker teardrop prototype canopy
    cabinLength = length * 0.52;
    cabinWidth = width * 0.72;
    cabinZ = -0.22;
  }

  const cabinGeo = new THREE.BoxGeometry(cabinWidth, height * 0.52, cabinLength);
  const cabinMesh = new THREE.Mesh(cabinGeo, glassMaterial);
  cabinMesh.position.set(0, 0.82, cabinZ);
  cabinMesh.castShadow = true;
  group.add(cabinMesh);

  // Cabin roof
  const roofGeo = new THREE.BoxGeometry(cabinWidth * 0.92, 0.06, cabinLength * 0.88);
  const roofMesh = new THREE.Mesh(roofGeo, bodyMaterial);
  roofMesh.position.set(0, 1.08, cabinZ);
  group.add(roofMesh);

  // 4. Hood slope & front nose
  const noseGeo = new THREE.BoxGeometry(width * 0.95, 0.28, length * 0.25);
  const noseMesh = new THREE.Mesh(noseGeo, bodyMaterial);
  noseMesh.position.set(0, 0.38, length * 0.38);
  group.add(noseMesh);

  // Front Splitter (carbon fiber)
  const splitterGeo = new THREE.BoxGeometry(width * 1.04, 0.05, 0.45);
  const splitterMesh = new THREE.Mesh(splitterGeo, carbonMaterial);
  splitterMesh.position.set(0, 0.16, length * 0.48);
  group.add(splitterMesh);

  // 5. Rear diffuser & spoiler
  const diffuserGeo = new THREE.BoxGeometry(width * 0.96, 0.16, 0.4);
  const diffuserMesh = new THREE.Mesh(diffuserGeo, carbonMaterial);
  diffuserMesh.position.set(0, 0.2, -length * 0.46);
  group.add(diffuserMesh);

  // Rear spoiler based on car design
  if (carId === 'valkyrie_r' || carId === 'nocturne_koenig' || carId === 'solaris_evo') {
    // Elevated GT wing
    const wingGeo = new THREE.BoxGeometry(width * 1.02, 0.05, 0.38);
    const wingMesh = new THREE.Mesh(wingGeo, accentMaterial);
    wingMesh.position.set(0, 1.02, -length * 0.42);

    const postL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.38, 0.12), carbonMaterial);
    postL.position.set(-0.6, 0.82, -length * 0.42);
    const postR = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.38, 0.12), carbonMaterial);
    postR.position.set(0.6, 0.82, -length * 0.42);

    group.add(wingMesh);
    group.add(postL);
    group.add(postR);
  } else {
    // Sleek ducktail spoiler lip
    const lipGeo = new THREE.BoxGeometry(width * 0.88, 0.1, 0.2);
    const lipMesh = new THREE.Mesh(lipGeo, accentMaterial);
    lipMesh.position.set(0, 0.72, -length * 0.44);
    group.add(lipMesh);
  }

  // 6. Accent Side blades / skirts
  const skirtL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.16, length * 0.65), accentMaterial);
  skirtL.position.set(-width * 0.51, 0.22, 0);
  const skirtR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.16, length * 0.65), accentMaterial);
  skirtR.position.set(width * 0.51, 0.22, 0);
  group.add(skirtL);
  group.add(skirtR);

  // 7. Headlights (sleek horizontal strip LEDs)
  const headGeo = new THREE.BoxGeometry(0.42, 0.08, 0.08);
  const headL = new THREE.Mesh(headGeo, headlightMaterial);
  headL.position.set(-0.68, 0.45, length * 0.47);
  headL.rotation.y = 0.25;

  const headR = new THREE.Mesh(headGeo, headlightMaterial);
  headR.position.set(0.68, 0.45, length * 0.47);
  headR.rotation.y = -0.25;

  group.add(headL);
  group.add(headR);

  // 8. Taillights (full-width continuous modern cyber light bar)
  const tailGeo = new THREE.BoxGeometry(width * 0.88, 0.08, 0.06);
  const tailMesh = new THREE.Mesh(tailGeo, taillightMaterial);
  tailMesh.position.set(0, 0.62, -length * 0.47);
  group.add(tailMesh);

  // 9. Wheels & Rims
  function createWheelGroup(style: RimStyle): { wheelGroup: THREE.Group; rimMesh: THREE.Mesh } {
    const wGroup = new THREE.Group();

    // Rubber Tire
    const tireGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.28, 24);
    tireGeo.rotateZ(Math.PI / 2);
    const tireMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a1d,
      roughness: 0.85,
      metalness: 0.1,
    });
    const tireMesh = new THREE.Mesh(tireGeo, tireMat);
    wGroup.add(tireMesh);

    // Rim inner hub
    const rimRadius = 0.24;
    let rimGeo: THREE.BufferGeometry;
    if (style === 'aero') {
      rimGeo = new THREE.CylinderGeometry(rimRadius, rimRadius, 0.29, 16);
    } else if (style === 'star') {
      rimGeo = new THREE.CylinderGeometry(rimRadius, rimRadius, 0.29, 5);
    } else if (style === 'hex') {
      rimGeo = new THREE.CylinderGeometry(rimRadius, rimRadius, 0.29, 6);
    } else {
      // Mesh style
      rimGeo = new THREE.CylinderGeometry(rimRadius, rimRadius, 0.29, 12);
    }
    rimGeo.rotateZ(Math.PI / 2);

    const rimMat = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      metalness: 0.95,
      roughness: 0.15,
    });
    const rimMesh = new THREE.Mesh(rimGeo, rimMat);
    wGroup.add(rimMesh);

    // Glowing brake caliper behind rim
    const caliperGeo = new THREE.BoxGeometry(0.18, 0.12, 0.12);
    const caliperMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(accentColor),
      emissive: new THREE.Color(accentColor),
      emissiveIntensity: 0.4,
      roughness: 0.3,
    });
    const caliperMesh = new THREE.Mesh(caliperGeo, caliperMat);
    caliperMesh.position.set(0, 0.16, 0);
    wGroup.add(caliperMesh);

    return { wheelGroup: wGroup, rimMesh };
  }

  // Create wheel assemblies
  const frontLeft = createWheelGroup(rimStyle);
  const frontRight = createWheelGroup(rimStyle);
  const rearLeft = createWheelGroup(rimStyle);
  const rearRight = createWheelGroup(rimStyle);

  const wheelTrack = width * 0.52;
  const wheelBase = length * 0.31;
  const wheelY = 0.34;

  frontLeft.wheelGroup.position.set(-wheelTrack, wheelY, wheelBase);
  frontRight.wheelGroup.position.set(wheelTrack, wheelY, wheelBase);
  rearLeft.wheelGroup.position.set(-wheelTrack, wheelY, -wheelBase);
  rearRight.wheelGroup.position.set(wheelTrack, wheelY, -wheelBase);

  group.add(frontLeft.wheelGroup);
  group.add(frontRight.wheelGroup);
  group.add(rearLeft.wheelGroup);
  group.add(rearRight.wheelGroup);

  // 10. Underglow Light & Ground Glow Plane
  const underglowLight = new THREE.PointLight(new THREE.Color(underglowColor), 2.2, 4.5);
  underglowLight.position.set(0, 0.1, 0);
  group.add(underglowLight);

  const glowPlaneGeo = new THREE.PlaneGeometry(width * 1.1, length * 0.9);
  const glowPlaneMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(underglowColor),
    transparent: true,
    opacity: 0.45,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const underglowMesh = new THREE.Mesh(glowPlaneGeo, glowPlaneMat);
  underglowMesh.rotation.x = Math.PI / 2;
  underglowMesh.position.y = 0.05;
  group.add(underglowMesh);

  // 11. Exhaust Tips and Nitro Jet Flames
  const nitroFlames: THREE.Mesh[] = [];
  const exhaustPositions = [-0.38, 0.38];
  exhaustPositions.forEach((xPos) => {
    // Exhaust pipe
    const pipeGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.2, 12);
    pipeGeo.rotateX(Math.PI / 2);
    const pipeMesh = new THREE.Mesh(pipeGeo, carbonMaterial);
    pipeMesh.position.set(xPos, 0.26, -length * 0.47);
    group.add(pipeMesh);

    // Nitro flame cone
    const flameGeo = new THREE.ConeGeometry(0.12, 0.8, 12);
    flameGeo.rotateX(-Math.PI / 2);
    const flameMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
    });
    const flameMesh = new THREE.Mesh(flameGeo, flameMat);
    flameMesh.position.set(xPos, 0.26, -length * 0.58);
    flameMesh.scale.set(0.01, 0.01, 0.01);
    group.add(flameMesh);
    nitroFlames.push(flameMesh);
  });

  const carInstance: Car3DInstance = {
    group,
    bodyMesh,
    frontLeftWheel: frontLeft.wheelGroup,
    frontRightWheel: frontRight.wheelGroup,
    rearLeftWheel: rearLeft.wheelGroup,
    rearRightWheel: rearRight.wheelGroup,
    taillightMaterial,
    headlightMaterial,
    underglowLight,
    underglowMesh,
    nitroFlames,
    steerAngle: 0,
    wheelRotation: 0,
    update(speed: number, steer: number, isBraking: boolean, isNitro: boolean, delta: number) {
      // Steer front wheels smoothly
      this.steerAngle = THREE.MathUtils.lerp(this.steerAngle, -steer * 0.45, delta * 14);
      this.frontLeftWheel.rotation.y = this.steerAngle;
      this.frontRightWheel.rotation.y = this.steerAngle;

      // Spin wheels based on forward/backward velocity
      this.wheelRotation += (speed / 0.36) * delta;
      this.frontLeftWheel.children[0].rotation.x = this.wheelRotation;
      this.frontRightWheel.children[0].rotation.x = this.wheelRotation;
      this.rearLeftWheel.children[0].rotation.x = this.wheelRotation;
      this.rearRightWheel.children[0].rotation.x = this.wheelRotation;

      // Taillights brighten significantly when braking or reversing
      if (isBraking) {
        this.taillightMaterial.emissiveIntensity = 2.4;
        this.taillightMaterial.emissive.setHex(0xff002b);
      } else {
        this.taillightMaterial.emissiveIntensity = 0.8;
        this.taillightMaterial.emissive.setHex(0xff1e46);
      }

      // Nitro flame animation
      if (isNitro) {
        const flicker = 0.8 + Math.random() * 0.4;
        this.nitroFlames.forEach((flame) => {
          (flame.material as THREE.MeshBasicMaterial).opacity = 0.95;
          flame.scale.set(flicker, flicker, flicker * 1.4);
        });
      } else {
        this.nitroFlames.forEach((flame) => {
          (flame.material as THREE.MeshBasicMaterial).opacity = 0;
          flame.scale.set(0.01, 0.01, 0.01);
        });
      }
    },
    setUnderglowColor(hexColor: string) {
      const col = new THREE.Color(hexColor);
      this.underglowLight.color = col;
      (this.underglowMesh.material as THREE.MeshBasicMaterial).color = col;
    },
    setRimStyle(_style: RimStyle) {
      // Allows swapping rim style on customization
    },
  };

  return carInstance;
}
