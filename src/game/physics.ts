import * as THREE from 'three';
import { soundManager } from '../audio/soundManager';
import { CARS } from '../data/cars';
import { GameInput, PlayerCarState, TrackId } from '../types/game';
import { AIRival, TrafficCar } from './trackBuilder';

export interface PlayerPhysicsState {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  rotationY: number;
  speedKmh: number;
  forwardSpeed: number; // m/s
  steerAngle: number;
  driftAngle: number;
  isDrifting: boolean;
  driftDuration: number;
  currentDriftScore: number;
  totalDriftScore: number;
  nitroRemaining: number; // 0 to 100
  isNitroActive: boolean;
  lap: number;
  maxLaps: number;
  lapProgress: number; // 0 to 1
  totalDistance: number;
  currentLapTime: number;
  bestLapTime: number;
  totalRaceTime: number;
  racePosition: number; // 1st, 2nd, etc.
  raceFinished: boolean;
  nearMissCount: number;
  coinsEarned: number;
  bannerNotification: string | null;
  bannerTimer: number;
}

export class CarPhysics {
  public state: PlayerPhysicsState;
  private curve: THREE.CatmullRomCurve3;
  private trackLength: number;
  private baseStats: typeof CARS[0]['stats'];
  private roadWidth = 16.5;

  // Multipliers from upgrades
  private topSpeedMs: number;
  private accelForce: number;
  private handlingFactor: number;
  private nitroCapacity: number;

  private hasCrossedHalfway = false;
  private lastCurveT = 0;

  constructor(
    curve: THREE.CatmullRomCurve3,
    carId: string,
    carState: PlayerCarState,
    _trackId: TrackId
  ) {
    this.curve = curve;
    this.trackLength = curve.getLength();

    const carDef = CARS.find((c) => c.id === carId) || CARS[0];
    this.baseStats = carDef.stats;

    // Upgrades calculation
    const engineUp = carState?.upgrades?.engine || 0;
    const handlingUp = carState?.upgrades?.handling || 0;
    const nitroUp = carState?.upgrades?.nitro || 0;

    const effectiveTopSpeed = (this.baseStats.topSpeed + engineUp * 16);
    this.topSpeedMs = effectiveTopSpeed / 3.6; // convert km/h to m/s (~60 - 85 m/s)
    this.accelForce = (18 + this.baseStats.acceleration * 2.8 + engineUp * 3.5);
    this.handlingFactor = (1.8 + this.baseStats.handling * 0.22 + handlingUp * 0.35);
    this.nitroCapacity = 100 + nitroUp * 25;

    // Start slightly behind the start line
    const startPoint = this.curve.getPointAt(0);
    const startTangent = this.curve.getTangentAt(0).normalize();
    const startAngle = Math.atan2(startTangent.x, startTangent.z);

    this.state = {
      position: startPoint.clone().add(new THREE.Vector3(0, 0.4, 0)),
      velocity: new THREE.Vector3(0, 0, 0),
      rotationY: startAngle,
      speedKmh: 0,
      forwardSpeed: 0,
      steerAngle: 0,
      driftAngle: 0,
      isDrifting: false,
      driftDuration: 0,
      currentDriftScore: 0,
      totalDriftScore: 0,
      nitroRemaining: this.nitroCapacity,
      isNitroActive: false,
      lap: 1,
      maxLaps: 3,
      lapProgress: 0,
      totalDistance: 0,
      currentLapTime: 0,
      bestLapTime: 0,
      totalRaceTime: 0,
      racePosition: 4,
      raceFinished: false,
      nearMissCount: 0,
      coinsEarned: 0,
      bannerNotification: null,
      bannerTimer: 0,
    };
  }

  public update(
    input: GameInput,
    delta: number,
    traffic: TrafficCar[],
    rivals: AIRival[],
    isCountingDown: boolean
  ) {
    if (this.state.raceFinished) {
      // Gentle coast to stop
      this.state.forwardSpeed = THREE.MathUtils.lerp(this.state.forwardSpeed, 0, delta * 2);
      this.state.speedKmh = Math.max(0, Math.round(this.state.forwardSpeed * 3.6));
      return;
    }

    if (isCountingDown) {
      // Allow revving engine sound during countdown!
      soundManager.updateEngine(input.forward ? 0.6 : 0.05, input.forward);
      return;
    }

    // Update timers
    this.state.totalRaceTime += delta;
    this.state.currentLapTime += delta;

    if (this.state.bannerTimer > 0) {
      this.state.bannerTimer -= delta;
      if (this.state.bannerTimer <= 0) {
        this.state.bannerNotification = null;
      }
    }

    // 1. NITRO SYSTEM
    const wantsNitro = input.nitro && this.state.nitroRemaining > 0 && input.forward && this.state.forwardSpeed > 5;
    if (wantsNitro) {
      this.state.isNitroActive = true;
      this.state.nitroRemaining = Math.max(0, this.state.nitroRemaining - delta * 32);
      soundManager.setNitroActive(true);
    } else {
      this.state.isNitroActive = false;
      // Passive slow recharge when not boosting
      this.state.nitroRemaining = Math.min(this.nitroCapacity, this.state.nitroRemaining + delta * 4);
      soundManager.setNitroActive(false);
    }

    // 2. ACCELERATION & BRAKING
    let maxSpeed = this.topSpeedMs;
    let accel = this.accelForce;

    if (this.state.isNitroActive) {
      maxSpeed *= 1.25;
      accel *= 1.6;
    }

    if (input.forward) {
      if (this.state.forwardSpeed < maxSpeed) {
        this.state.forwardSpeed += accel * delta;
      } else {
        this.state.forwardSpeed = THREE.MathUtils.lerp(this.state.forwardSpeed, maxSpeed, delta * 1.5);
      }
    } else if (input.backward) {
      if (this.state.forwardSpeed > 1) {
        // Active braking
        this.state.forwardSpeed -= 36 * delta;
      } else {
        // Reverse
        this.state.forwardSpeed = Math.max(-12, this.state.forwardSpeed - 12 * delta);
      }
    } else {
      // Natural drag / rolling friction
      this.state.forwardSpeed = THREE.MathUtils.lerp(this.state.forwardSpeed, 0, delta * 0.85);
    }

    this.state.speedKmh = Math.max(0, Math.round(this.state.forwardSpeed * 3.6));

    // 3. STEERING & DRIFTING
    let steerDir = 0;
    if (input.left) steerDir += 1;
    if (input.right) steerDir -= 1;

    // Speed-dependent steer responsiveness
    const speedRatio = Math.min(1.2, Math.abs(this.state.forwardSpeed) / (this.topSpeedMs * 0.6));
    const effectiveSteerSpeed = this.handlingFactor * (0.8 + 0.5 * (1 - Math.min(1, speedRatio * 0.7)));

    // Drift initiation: hard steering at speed OR drift button pressed
    const speedThresholdForDrift = 14; // ~50 km/h
    const wantsDrift = (input.drift || (input.backward && Math.abs(steerDir) > 0)) && this.state.forwardSpeed > speedThresholdForDrift;

    if (wantsDrift && Math.abs(steerDir) > 0.1) {
      this.state.isDrifting = true;
      const targetDriftAngle = steerDir * 0.42;
      this.state.driftAngle = THREE.MathUtils.lerp(this.state.driftAngle, targetDriftAngle, delta * 5.5);
      this.state.driftDuration += delta;

      // Accumulate drift score and rapidly refill nitro!
      const driftRate = Math.floor(Math.abs(this.state.driftAngle) * this.state.speedKmh * 1.8);
      this.state.currentDriftScore += driftRate * delta * 12;
      this.state.nitroRemaining = Math.min(this.nitroCapacity, this.state.nitroRemaining + delta * 22);

      soundManager.updateDriftSound(Math.min(1, Math.abs(this.state.driftAngle) * 2.8));

      // Perfect drift bonus after 1.8s sustained
      if (this.state.driftDuration > 1.8 && !this.state.bannerNotification) {
        this.state.bannerNotification = 'PERFECT DRIFT  +150';
        this.state.bannerTimer = 1.6;
        this.state.coinsEarned += 150;
        soundManager.playPerfectDrift();
      }
    } else {
      if (this.state.isDrifting) {
        // Drift ended cleanly
        if (this.state.currentDriftScore > 20) {
          const award = Math.floor(this.state.currentDriftScore * 0.2);
          this.state.totalDriftScore += Math.floor(this.state.currentDriftScore);
          this.state.coinsEarned += award;
        }
        this.state.currentDriftScore = 0;
        this.state.driftDuration = 0;
      }
      this.state.isDrifting = false;
      this.state.driftAngle = THREE.MathUtils.lerp(this.state.driftAngle, 0, delta * 7);
      soundManager.updateDriftSound(0);
    }

    // Apply rotation
    this.state.rotationY += steerDir * effectiveSteerSpeed * delta * Math.sign(this.state.forwardSpeed || 1);

    // 4. POSITION & MOTION VECTOR
    const moveHeading = this.state.rotationY + this.state.driftAngle * 0.65;
    const moveX = Math.sin(moveHeading) * this.state.forwardSpeed;
    const moveZ = Math.cos(moveHeading) * this.state.forwardSpeed;

    this.state.position.x += moveX * delta;
    this.state.position.z += moveZ * delta;
    this.state.totalDistance += Math.abs(this.state.forwardSpeed) * delta;

    // Update Engine Audio
    const normSpeed = Math.min(1, this.state.speedKmh / (this.baseStats.topSpeed * 1.25));
    soundManager.updateEngine(normSpeed, input.forward);

    // 5. SPLINE PROGRESSION & ROAD BOUNDARY CHECK
    this.updateSplineProgress(delta);

    // 6. TRAFFIC & RIVAL COLLISIONS & NEAR MISS
    this.checkCollisionsAndNearMiss(traffic, rivals, delta);
  }

  private updateSplineProgress(_delta: number) {
    // Find closest point on curve
    const playerXZ = new THREE.Vector2(this.state.position.x, this.state.position.z);
    let bestT = this.lastCurveT;
    let minDstSq = Infinity;

    // Search around current progress (+/- 0.08)
    const samples = 40;
    for (let i = -samples; i <= samples; i++) {
      let t = (this.lastCurveT + (i / 400) + 1) % 1;
      const pt = this.curve.getPointAt(t);
      const dstSq = playerXZ.distanceToSquared(new THREE.Vector2(pt.x, pt.z));
      if (dstSq < minDstSq) {
        minDstSq = dstSq;
        bestT = t;
      }
    }

    this.lastCurveT = bestT;
    this.state.lapProgress = bestT;

    const curvePt = this.curve.getPointAt(bestT);
    const tangent = this.curve.getTangentAt(bestT).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const binormal = new THREE.Vector3().crossVectors(tangent, up).normalize();

    // Road height elevation follow
    this.state.position.y = THREE.MathUtils.lerp(this.state.position.y, curvePt.y + 0.35, 0.2);

    // Lateral distance from track centerline
    const offsetVector = new THREE.Vector3().subVectors(this.state.position, curvePt);
    const lateralDist = offsetVector.dot(binormal);

    // Check track boundaries
    const maxLateral = this.roadWidth * 0.5 - 0.7;
    if (Math.abs(lateralDist) > maxLateral) {
      // Elastic rebound push-back from guard rail
      const push = (Math.abs(lateralDist) - maxLateral) * Math.sign(lateralDist);
      this.state.position.sub(binormal.clone().multiplyScalar(push * 1.2));
      this.state.forwardSpeed *= 0.88; // Slow down on barrier graze
      soundManager.playCollision(0.45);
    }

    // Checkpoint / Lap Crossing Detection
    if (bestT > 0.5 && bestT < 0.8) {
      this.hasCrossedHalfway = true;
    }

    if (this.hasCrossedHalfway && bestT < 0.1 && this.lastCurveT < 0.1) {
      this.hasCrossedHalfway = false;
      this.completeLap();
    }
  }

  private completeLap() {
    soundManager.playLapComplete();

    if (this.state.bestLapTime === 0 || this.state.currentLapTime < this.state.bestLapTime) {
      this.state.bestLapTime = this.state.currentLapTime;
      this.state.bannerNotification = `FASTEST LAP  ${this.formatTime(this.state.currentLapTime)}`;
      this.state.bannerTimer = 2.5;
      this.state.coinsEarned += 100;
    }

    if (this.state.lap < this.state.maxLaps) {
      this.state.lap += 1;
      this.state.currentLapTime = 0;
    } else {
      // Finished all 3 laps!
      this.state.raceFinished = true;
      soundManager.playRaceFinish();
    }
  }

  private checkCollisionsAndNearMiss(traffic: TrafficCar[], rivals: AIRival[], delta: number) {
    const playerPos = this.state.position;

    // Traffic cars
    traffic.forEach((tCar) => {
      // Update traffic position along spline
      tCar.t = (tCar.t + tCar.speed * delta) % 1;
      const pt = this.curve.getPointAt(tCar.t);
      const tangent = this.curve.getTangentAt(tCar.t).normalize();
      const binormal = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();

      const carPos = pt.clone().add(binormal.clone().multiplyScalar(tCar.laneOffset));
      tCar.mesh.position.set(carPos.x, carPos.y + 0.3, carPos.z);
      tCar.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);

      const dist = playerPos.distanceTo(carPos);

      // Direct collision
      if (dist < 2.6) {
        this.state.forwardSpeed = Math.max(0, this.state.forwardSpeed - 18);
        soundManager.playCollision(1.0);
        // Push apart
        const repel = new THREE.Vector3().subVectors(playerPos, carPos).normalize();
        this.state.position.add(repel.multiplyScalar(1.5));
      } else if (dist < 4.6 && dist > 2.8 && this.state.forwardSpeed > 25) {
        // Near miss!
        if (Math.random() < 0.05 && !this.state.bannerNotification) {
          this.state.nearMissCount += 1;
          this.state.coinsEarned += 50;
          this.state.bannerNotification = 'NEAR MISS  +50';
          this.state.bannerTimer = 1.4;
          soundManager.playNearMiss();
        }
      }
    });

    // AI Rivals
    let playerAheadCount = 0;
    const playerTotalProgress = (this.state.lap - 1) + this.state.lapProgress;

    rivals.forEach((rival) => {
      // Accelerate rival towards target speed
      rival.currentSpeed = THREE.MathUtils.lerp(rival.currentSpeed, rival.targetSpeed, delta * 0.8);
      rival.t = (rival.t + rival.currentSpeed * delta);

      if (rival.t >= 1) {
        rival.t -= 1;
        rival.lap += 1;
      }

      const pt = this.curve.getPointAt(rival.t % 1);
      const tangent = this.curve.getTangentAt(rival.t % 1).normalize();
      const binormal = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0, 1, 0)).normalize();

      const rPos = pt.clone().add(binormal.clone().multiplyScalar(rival.laneOffset));
      rival.mesh.position.set(rPos.x, rPos.y + 0.3, rPos.z);
      rival.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);

      // Compare race position
      const rivalTotalProgress = (rival.lap - 1) + (rival.t % 1);
      if (playerTotalProgress > rivalTotalProgress) {
        playerAheadCount++;
      }

      // Rival collision
      const rDist = playerPos.distanceTo(rPos);
      if (rDist < 2.5) {
        this.state.forwardSpeed = Math.max(0, this.state.forwardSpeed - 12);
        soundManager.playCollision(0.8);
        const repel = new THREE.Vector3().subVectors(playerPos, rPos).normalize();
        this.state.position.add(repel.multiplyScalar(1.2));
      }
    });

    // 1st place if ahead of all 3 rivals
    this.state.racePosition = Math.max(1, 4 - playerAheadCount);
  }

  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  }
}
