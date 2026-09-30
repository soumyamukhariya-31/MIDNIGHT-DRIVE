/**
 * Web Audio API synthesizer for Midnight Drive.
 * Completely self-contained, no external audio file dependencies.
 */

class SoundManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private engineGain: GainNode | null = null;

  // Engine sound nodes
  private engineOsc1: OscillatorNode | null = null;
  private engineOsc2: OscillatorNode | null = null;
  private engineSubOsc: OscillatorNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private isEngineRunning = false;

  // Skid sound nodes
  private skidNode: AudioBufferSourceNode | null = null;
  private skidGain: GainNode | null = null;
  private skidFilter: BiquadFilterNode | null = null;

  // Nitro sound nodes
  private nitroNoiseNode: AudioBufferSourceNode | null = null;
  private nitroGain: GainNode | null = null;
  private nitroFilter: BiquadFilterNode | null = null;

  // Rain sound nodes
  private rainNode: AudioBufferSourceNode | null = null;
  private rainGain: GainNode | null = null;

  private isMuted = false;
  private masterVolume = 0.85;
  private sfxVolume = 0.9;
  private engineVolume = 0.85;

  private noiseBuffer: AudioBuffer | null = null;

  constructor() {
    // Initialized on first user interaction
  }

  public init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      // Master bus
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // SFX bus
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      // Engine bus
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.engineGain.connect(this.masterGain);

      // Create reusable 2-second looping white noise buffer
      const bufferSize = this.ctx.sampleRate * 2;
      this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      this.initSkidNode();
      this.initNitroNode();
      this.initRainNode();
    } catch (e) {
      console.warn('AudioContext not available:', e);
    }
  }

  public setVolumes(master: number, sfx: number, engine: number) {
    this.masterVolume = master;
    this.sfxVolume = sfx;
    this.engineVolume = engine;

    if (!this.ctx || !this.masterGain || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : this.masterVolume, now, 0.05);
    this.sfxGain.gain.setTargetAtTime(this.sfxVolume, now, 0.05);
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : this.masterVolume, this.ctx.currentTime, 0.05);
    }
  }

  // --- ENGINE SYNTHESIS ---
  public startEngine() {
    this.init();
    if (!this.ctx || !this.engineGain || this.isEngineRunning) return;

    try {
      const now = this.ctx.currentTime;

      // Filter for warm, throaty tone
      this.engineFilter = this.ctx.createBiquadFilter();
      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.setValueAtTime(450, now);
      this.engineFilter.Q.setValueAtTime(3.5, now);
      this.engineFilter.connect(this.engineGain);

      // Primary cylinder rumble (sawtooth)
      this.engineOsc1 = this.ctx.createOscillator();
      this.engineOsc1.type = 'sawtooth';
      this.engineOsc1.frequency.setValueAtTime(48, now);

      // Secondary harmonic (triangle)
      this.engineOsc2 = this.ctx.createOscillator();
      this.engineOsc2.type = 'triangle';
      this.engineOsc2.frequency.setValueAtTime(96, now);

      // Sub-rumble (square)
      this.engineSubOsc = this.ctx.createOscillator();
      this.engineSubOsc.type = 'sine';
      this.engineSubOsc.frequency.setValueAtTime(24, now);

      this.engineOsc1.connect(this.engineFilter);
      this.engineOsc2.connect(this.engineFilter);
      this.engineSubOsc.connect(this.engineFilter);

      this.engineOsc1.start();
      this.engineOsc2.start();
      this.engineSubOsc.start();

      this.engineGain.gain.setTargetAtTime(this.engineVolume * 0.45, now, 0.2);
      this.isEngineRunning = true;
    } catch (e) {
      console.warn('Failed to start engine audio:', e);
    }
  }

  public updateEngine(speedNormalized: number, throttle: boolean) {
    if (!this.ctx || !this.isEngineRunning || !this.engineOsc1 || !this.engineOsc2 || !this.engineSubOsc || !this.engineFilter || !this.engineGain) {
      return;
    }

    const now = this.ctx.currentTime;
    // Base frequency scales from 45Hz idle to 240Hz redline
    const rpmPitch = 48 + speedNormalized * 180 + (throttle ? 18 : 0);
    this.engineOsc1.frequency.setTargetAtTime(rpmPitch, now, 0.08);
    this.engineOsc2.frequency.setTargetAtTime(rpmPitch * 1.5, now, 0.08);
    this.engineSubOsc.frequency.setTargetAtTime(rpmPitch * 0.5, now, 0.08);

    // Filter opens up with throttle and speed
    const cutoff = 400 + speedNormalized * 1400 + (throttle ? 700 : 0);
    this.engineFilter.frequency.setTargetAtTime(cutoff, now, 0.08);

    // Engine volume
    const targetVol = (0.28 + speedNormalized * 0.45 + (throttle ? 0.15 : 0)) * this.engineVolume;
    this.engineGain.gain.setTargetAtTime(targetVol, now, 0.06);
  }

  public stopEngine() {
    if (!this.ctx || !this.isEngineRunning) return;
    try {
      const now = this.ctx.currentTime;
      if (this.engineGain) {
        this.engineGain.gain.setTargetAtTime(0, now, 0.1);
      }
      setTimeout(() => {
        try {
          this.engineOsc1?.stop();
          this.engineOsc2?.stop();
          this.engineSubOsc?.stop();
          this.engineOsc1?.disconnect();
          this.engineOsc2?.disconnect();
          this.engineSubOsc?.disconnect();
        } catch {
          // ignore
        }
        this.isEngineRunning = false;
      }, 120);
    } catch {
      this.isEngineRunning = false;
    }
  }

  // --- TIRE SKID / DRIFT SOUND ---
  private initSkidNode() {
    if (!this.ctx || !this.noiseBuffer || !this.sfxGain) return;
    try {
      this.skidFilter = this.ctx.createBiquadFilter();
      this.skidFilter.type = 'bandpass';
      this.skidFilter.frequency.setValueAtTime(1100, this.ctx.currentTime);
      this.skidFilter.Q.setValueAtTime(4.0, this.ctx.currentTime);

      this.skidGain = this.ctx.createGain();
      this.skidGain.gain.setValueAtTime(0, this.ctx.currentTime);

      this.skidFilter.connect(this.skidGain);
      this.skidGain.connect(this.sfxGain);

      this.skidNode = this.ctx.createBufferSource();
      this.skidNode.buffer = this.noiseBuffer;
      this.skidNode.loop = true;
      this.skidNode.connect(this.skidFilter);
      this.skidNode.start();
    } catch (e) {
      console.warn('Failed to init skid audio:', e);
    }
  }

  public updateDriftSound(driftIntensity: number) {
    if (!this.ctx || !this.skidGain || !this.skidFilter) return;
    const now = this.ctx.currentTime;
    const clamped = Math.min(1, Math.max(0, driftIntensity));
    const targetGain = clamped > 0.05 ? clamped * 0.45 * this.sfxVolume : 0;
    this.skidGain.gain.setTargetAtTime(targetGain, now, 0.08);

    // Pitch shifts slightly with intensity
    this.skidFilter.frequency.setTargetAtTime(900 + clamped * 500, now, 0.08);
  }

  // --- NITRO BOOST SOUND ---
  private initNitroNode() {
    if (!this.ctx || !this.noiseBuffer || !this.sfxGain) return;
    try {
      this.nitroFilter = this.ctx.createBiquadFilter();
      this.nitroFilter.type = 'lowpass';
      this.nitroFilter.frequency.setValueAtTime(800, this.ctx.currentTime);

      this.nitroGain = this.ctx.createGain();
      this.nitroGain.gain.setValueAtTime(0, this.ctx.currentTime);

      this.nitroFilter.connect(this.nitroGain);
      this.nitroGain.connect(this.sfxGain);

      this.nitroNoiseNode = this.ctx.createBufferSource();
      this.nitroNoiseNode.buffer = this.noiseBuffer;
      this.nitroNoiseNode.loop = true;
      this.nitroNoiseNode.connect(this.nitroFilter);
      this.nitroNoiseNode.start();
    } catch (e) {
      console.warn('Failed to init nitro audio:', e);
    }
  }

  public setNitroActive(active: boolean) {
    if (!this.ctx || !this.nitroGain || !this.nitroFilter) return;
    const now = this.ctx.currentTime;
    if (active) {
      this.nitroFilter.frequency.setTargetAtTime(2200, now, 0.15);
      this.nitroGain.gain.setTargetAtTime(0.55 * this.sfxVolume, now, 0.1);
      // Play sudden ignition pop
      this.playTone(180, 70, 0.12, 'triangle', 0.4);
    } else {
      this.nitroGain.gain.setTargetAtTime(0, now, 0.2);
    }
  }

  // --- RAIN / AMBIENCE SOUND ---
  private initRainNode() {
    if (!this.ctx || !this.noiseBuffer || !this.sfxGain) return;
    try {
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1400, this.ctx.currentTime);

      this.rainGain = this.ctx.createGain();
      this.rainGain.gain.setValueAtTime(0, this.ctx.currentTime);

      filter.connect(this.rainGain);
      this.rainGain.connect(this.sfxGain);

      this.rainNode = this.ctx.createBufferSource();
      this.rainNode.buffer = this.noiseBuffer;
      this.rainNode.loop = true;
      this.rainNode.connect(filter);
      this.rainNode.start();
    } catch (e) {
      console.warn('Failed to init rain audio:', e);
    }
  }

  public setRainActive(active: boolean) {
    if (!this.ctx || !this.rainGain) return;
    const now = this.ctx.currentTime;
    this.rainGain.gain.setTargetAtTime(active ? 0.22 * this.sfxVolume : 0, now, 0.5);
  }

  // --- SOUND EFFECTS ---
  public playCollision(intensity = 1.0) {
    this.init();
    if (!this.ctx || !this.sfxGain) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(32, now + 0.22);

      const impactVol = Math.min(0.8, 0.3 + intensity * 0.45) * this.sfxVolume;
      gain.gain.setValueAtTime(impactVol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.26);

      // Noise crunch
      if (this.noiseBuffer) {
        const crunchSource = this.ctx.createBufferSource();
        crunchSource.buffer = this.noiseBuffer;
        const crunchFilter = this.ctx.createBiquadFilter();
        crunchFilter.type = 'bandpass';
        crunchFilter.frequency.setValueAtTime(600, now);

        const crunchGain = this.ctx.createGain();
        crunchGain.gain.setValueAtTime(impactVol * 0.6, now);
        crunchGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

        crunchSource.connect(crunchFilter);
        crunchFilter.connect(crunchGain);
        crunchGain.connect(this.sfxGain);

        crunchSource.start(now);
        crunchSource.stop(now + 0.2);
      }
    } catch {
      // ignore
    }
  }

  public playNearMiss() {
    this.init();
    // High-tech subtle whoosh
    this.playTone(580, 880, 0.14, 'sine', 0.25);
  }

  public playCountdown(count: number) {
    this.init();
    if (count > 0) {
      // Low tone for 3, 2, 1
      this.playTone(440, 440, 0.18, 'sine', 0.4);
    } else {
      // High bright chord for GO!
      this.playTone(880, 1100, 0.45, 'triangle', 0.55);
      setTimeout(() => {
        this.playTone(1320, 1320, 0.4, 'sine', 0.4);
      }, 50);
    }
  }

  public playLapComplete() {
    this.init();
    this.playTone(523.25, 659.25, 0.2, 'sine', 0.35); // C5 -> E5
    setTimeout(() => {
      this.playTone(783.99, 1046.5, 0.3, 'sine', 0.4); // G5 -> C6
    }, 120);
  }

  public playPerfectDrift() {
    this.init();
    this.playTone(880, 1200, 0.18, 'sine', 0.3);
  }

  public playRaceFinish() {
    this.init();
    const notes = [440, 554, 659, 880];
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, freq * 1.05, 0.35, 'triangle', 0.4);
      }, idx * 110);
    });
  }

  public playUIClick() {
    this.init();
    this.playTone(800, 400, 0.04, 'triangle', 0.18);
  }

  public playUIHover() {
    this.init();
    this.playTone(600, 750, 0.03, 'sine', 0.08);
  }

  public playPurchase() {
    this.init();
    this.playTone(520, 780, 0.15, 'sine', 0.35);
    setTimeout(() => {
      this.playTone(780, 1040, 0.2, 'triangle', 0.35);
    }, 100);
  }

  private playTone(
    startFreq: number,
    endFreq: number,
    duration: number,
    type: OscillatorType = 'sine',
    volume = 0.3
  ) {
    if (!this.ctx || !this.sfxGain) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);

      gain.gain.setValueAtTime(volume * this.sfxVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + duration + 0.02);
    } catch {
      // ignore
    }
  }
}

export const soundManager = new SoundManager();
