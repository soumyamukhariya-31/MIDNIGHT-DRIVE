import * as THREE from 'three';
import { soundManager } from '../audio/soundManager';
import { TRACKS } from '../data/tracks';
import { GameInput, PlayerCarState, TrackId } from '../types/game';
import { Car3DInstance, createCarModel } from './carBuilder';
import { CarPhysics, PlayerPhysicsState } from './physics';
import { AIRival, buildTrack, createAIRivals, createTrafficSystem, TrackData, TrafficCar } from './trackBuilder';

export interface GameEngineCallbacks {
  onUpdateHUD: (state: PlayerPhysicsState) => void;
  onRaceFinish: (state: PlayerPhysicsState) => void;
  onCountdownTick: (count: number) => void;
}

export class GameEngine {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private animFrameId: number | null = null;
  private isDestroyed = false;

  private car3D: Car3DInstance | null = null;
  private physics: CarPhysics | null = null;
  private trackData: TrackData | null = null;
  private traffic: TrafficCar[] = [];
  private rivals: AIRival[] = [];

  private clock = new THREE.Clock();
  private callbacks: GameEngineCallbacks;

  // Countdown state
  public isCountdownActive = true;
  private countdownTimer = 3.8;
  private lastCountReported = 4;

  // Particle systems
  private tireSmokeParticles: THREE.Points | null = null;
  private smokePositions: Float32Array | null = null;
  private smokeLifetimes: Float32Array | null = null;

  // Camera settings
  private targetCameraPos = new THREE.Vector3();
  private targetLookAt = new THREE.Vector3();
  private cameraShake = 0;

  constructor(
    container: HTMLElement,
    trackId: TrackId,
    carId: string,
    carState: PlayerCarState,
    callbacks: GameEngineCallbacks
  ) {
    this.container = container;
    this.callbacks = callbacks;

    // 1. Scene & Environment
    const trackDef = TRACKS.find((t) => t.id === trackId) || TRACKS[0];
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(trackDef.skyColor);
    this.scene.fog = new THREE.FogExp2(trackDef.fogColor, trackDef.fogDensity);

    // 2. Camera
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(62, width / height, 0.2, 800);

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(this.renderer.domElement);

    // 4. Lighting
    this.setupLighting(trackDef);

    // 5. Track
    this.trackData = buildTrack(trackDef);
    this.scene.add(this.trackData.trackGroup);

    // 6. Car
    this.car3D = createCarModel(
      carId,
      carState?.customization?.underglowColor || '#ec4899',
      carState?.customization?.rimStyle || 'mesh'
    );
    this.scene.add(this.car3D.group);

    // 7. Physics
    this.physics = new CarPhysics(this.trackData.curve, carId, carState, trackId);

    // 8. Traffic & Rivals
    this.traffic = createTrafficSystem(this.trackData.curve, 8);
    this.traffic.forEach((t) => this.scene.add(t.mesh));

    this.rivals = createAIRivals(this.trackData.curve);
    this.rivals.forEach((r) => this.scene.add(r.mesh));

    // 9. Drift Smoke
    this.setupSmokeParticles();

    // 10. Initial camera positioning
    this.initCameraPosition();

    // 11. Audio start
    soundManager.startEngine();
    if (trackDef.rain) {
      soundManager.setRainActive(true);
    }

    // Resize listener
    window.addEventListener('resize', this.onWindowResize);

    // Start loop
    this.clock.start();
    this.animate();
  }

  private setupLighting(trackDef: typeof TRACKS[0]) {
    const ambient = new THREE.AmbientLight(trackDef.ambientColor, 1.4);
    this.scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.1);
    dirLight.position.set(60, 100, 40);
    this.scene.add(dirLight);

    if (trackDef.neonTheme === 'pink_violet') {
      const pinkPoint = new THREE.PointLight(0xec4899, 3.0, 160);
      pinkPoint.position.set(0, 30, -50);
      this.scene.add(pinkPoint);
    } else if (trackDef.neonTheme === 'sunset_gold') {
      const sunLight = new THREE.DirectionalLight(0xfb923c, 2.2);
      sunLight.position.set(-150, 40, -100);
      this.scene.add(sunLight);
    }
  }

  private setupSmokeParticles() {
    const smokeCount = 120;
    this.smokePositions = new Float32Array(smokeCount * 3);
    this.smokeLifetimes = new Float32Array(smokeCount);

    const smokeGeo = new THREE.BufferGeometry();
    smokeGeo.setAttribute('position', new THREE.BufferAttribute(this.smokePositions, 3));

    const smokeMat = new THREE.PointsMaterial({
      color: 0x9ca3af,
      size: 1.2,
      transparent: true,
      opacity: 0.45,
      blending: THREE.NormalBlending,
      depthWrite: false,
    });

    this.tireSmokeParticles = new THREE.Points(smokeGeo, smokeMat);
    this.scene.add(this.tireSmokeParticles);
  }

  private initCameraPosition() {
    if (!this.physics) return;
    const p = this.physics.state.position;
    const angle = this.physics.state.rotationY;
    const backX = p.x - Math.sin(angle) * 8.5;
    const backZ = p.z - Math.cos(angle) * 8.5;
    this.camera.position.set(backX, p.y + 3.2, backZ);
    this.camera.lookAt(p.x, p.y + 1.2, p.z);
  }

  private onWindowResize = () => {
    if (!this.container || !this.renderer || !this.camera) return;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  private currentInput: GameInput = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    drift: false,
    nitro: false,
    restart: false,
  };

  public setInput(input: GameInput) {
    this.currentInput = input;
  }

  private animate = () => {
    if (this.isDestroyed) return;
    this.animFrameId = requestAnimationFrame(this.animate);

    const delta = Math.min(this.clock.getDelta(), 0.1);

    // Countdown handling
    if (this.isCountdownActive) {
      this.countdownTimer -= delta;
      const count = Math.ceil(this.countdownTimer);

      if (count !== this.lastCountReported) {
        this.lastCountReported = count;
        if (count >= 0) {
          soundManager.playCountdown(count);
          this.callbacks.onCountdownTick(count);
        }
      }

      if (this.countdownTimer <= 0) {
        this.isCountdownActive = false;
        this.callbacks.onCountdownTick(0); // GO!
      }
    }

    if (this.physics && this.car3D) {
      // Update Physics
      this.physics.update(
        this.currentInput,
        delta,
        this.traffic,
        this.rivals,
        this.isCountdownActive
      );

      const pState = this.physics.state;

      // Update 3D Car Position & Rotation
      this.car3D.group.position.copy(pState.position);
      this.car3D.group.rotation.y = pState.rotationY + pState.driftAngle;

      // Body roll/tilt during hard cornering
      const targetRoll = -pState.steerAngle * 0.18 - pState.driftAngle * 0.15;
      this.car3D.bodyMesh.rotation.z = THREE.MathUtils.lerp(this.car3D.bodyMesh.rotation.z, targetRoll, delta * 12);

      // Car animations (wheels, lights, exhaust flames)
      this.car3D.update(
        pState.forwardSpeed,
        (this.currentInput.left ? 1 : 0) - (this.currentInput.right ? 1 : 0),
        this.currentInput.backward && pState.forwardSpeed > 0,
        pState.isNitroActive,
        delta
      );

      // Tire smoke on drift
      this.updateSmoke(delta, pState);

      // Dynamic Camera
      this.updateCamera(delta, pState);

      // Environment rain update
      if (this.trackData) {
        this.trackData.updateEnvironment(delta, pState.position);
      }

      // HUD Callback
      this.callbacks.onUpdateHUD(pState);

      // Race Finish check
      if (pState.raceFinished) {
        this.callbacks.onRaceFinish(pState);
      }
    }

    this.renderer.render(this.scene, this.camera);
  };

  private updateCamera(delta: number, pState: PlayerPhysicsState) {
    const heading = pState.rotationY;
    const speedRatio = Math.min(1.4, pState.speedKmh / 240);

    // Chase distance increases slightly with speed
    const distance = 8.5 + speedRatio * 1.5;
    const height = 2.8 + speedRatio * 0.4;

    const camX = pState.position.x - Math.sin(heading) * distance;
    const camZ = pState.position.z - Math.cos(heading) * distance;
    const camY = pState.position.y + height;

    this.targetCameraPos.set(camX, camY, camZ);

    // Smooth chase interpolation
    const lerpSpeed = pState.isNitroActive ? 16 : 9;
    this.camera.position.lerp(this.targetCameraPos, delta * lerpSpeed);

    // Target look-ahead vector in front of car
    const lookAheadDist = 6.0 + speedRatio * 4.0;
    const lookX = pState.position.x + Math.sin(heading) * lookAheadDist;
    const lookZ = pState.position.z + Math.cos(heading) * lookAheadDist;
    const lookY = pState.position.y + 1.2;

    this.targetLookAt.set(lookX, lookY, lookZ);

    // Nitro and drift camera shake
    if (pState.isNitroActive) {
      this.cameraShake = THREE.MathUtils.lerp(this.cameraShake, 0.08, delta * 12);
    } else {
      this.cameraShake = THREE.MathUtils.lerp(this.cameraShake, 0, delta * 8);
    }

    if (this.cameraShake > 0.005) {
      this.camera.position.x += (Math.random() - 0.5) * this.cameraShake;
      this.camera.position.y += (Math.random() - 0.5) * this.cameraShake;
    }

    this.camera.lookAt(this.targetLookAt);

    // Dynamic FOV: pulls back on nitro for speed sensation
    const baseFov = 62;
    const targetFov = baseFov + speedRatio * 10 + (pState.isNitroActive ? 14 : 0);
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, delta * 6);
    this.camera.updateProjectionMatrix();
  }

  private updateSmoke(delta: number, pState: PlayerPhysicsState) {
    if (!this.tireSmokeParticles || !this.smokePositions || !this.smokeLifetimes) return;

    const count = this.smokeLifetimes.length;
    for (let i = 0; i < count; i++) {
      if (this.smokeLifetimes[i] > 0) {
        this.smokeLifetimes[i] -= delta;
        // Expand and rise
        this.smokePositions[i * 3 + 1] += delta * 1.5;
      }
    }

    // Spawn new smoke puffs if drifting
    if (pState.isDrifting && Math.abs(pState.forwardSpeed) > 10) {
      for (let s = 0; s < 3; s++) {
        const idx = Math.floor(Math.random() * count);
        if (this.smokeLifetimes[idx] <= 0) {
          const side = Math.random() > 0.5 ? 1 : -1;
          const heading = pState.rotationY + pState.driftAngle;
          const rearDist = -1.8;
          const sideDist = side * 0.9;

          const spawnX = pState.position.x + Math.sin(heading) * rearDist + Math.cos(heading) * sideDist;
          const spawnZ = pState.position.z + Math.cos(heading) * rearDist - Math.sin(heading) * sideDist;

          this.smokePositions[idx * 3] = spawnX + (Math.random() - 0.5) * 0.3;
          this.smokePositions[idx * 3 + 1] = pState.position.y + 0.2;
          this.smokePositions[idx * 3 + 2] = spawnZ + (Math.random() - 0.5) * 0.3;
          this.smokeLifetimes[idx] = 0.5 + Math.random() * 0.4;
        }
      }
    }

    this.tireSmokeParticles.geometry.attributes.position.needsUpdate = true;
  }

  public destroy() {
    this.isDestroyed = true;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
    }

    window.removeEventListener('resize', this.onWindowResize);

    soundManager.stopEngine();
    soundManager.setRainActive(false);
    soundManager.setNitroActive(false);
    soundManager.updateDriftSound(0);

    if (this.renderer.domElement && this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
    this.renderer.dispose();
  }
}
