import { DriverConfig, VehicleConfig } from './types';

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  // Continuous engine oscillators
  private engineOsc1: OscillatorNode | null = null;
  private engineOsc2: OscillatorNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private engineGain: GainNode | null = null;

  // Continuous jet afterburner noise
  private jetNoise: AudioBufferSourceNode | null = null;
  private jetFilter: BiquadFilterNode | null = null;
  private jetGain: GainNode | null = null;

  private isRunning = false;
  private sfxEnabled = true;
  private voiceEnabled = true;
  private coinStreak = 0;
  private lastCoinTime = 0;
  private lastSpeechTime = 0;
  private lastLowFuelBeep = 0;
  private vehicleTone: VehicleConfig['engineTone'] = 'sedan';

  public setSettings(sfxEnabled: boolean, voiceEnabled: boolean): void {
    this.sfxEnabled = sfxEnabled;
    this.voiceEnabled = voiceEnabled;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(sfxEnabled ? 0.55 : 0, this.ctx.currentTime, 0.04);
    }
    if (!voiceEnabled && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore speech cancellation errors
      }
    }
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.sfxEnabled ? 0.55 : 0;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public startEngine(tone: VehicleConfig['engineTone']): void {
    this.vehicleTone = tone;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    if (this.isRunning) {
      this.stopEngine();
    }

    const now = ctx.currentTime;

    // Dual-oscillator procedural engine synth
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    if (tone === 'suv') {
      osc1.type = 'sawtooth';
      osc2.type = 'triangle';
    } else if (tone === 'coupe') {
      osc1.type = 'sawtooth';
      osc2.type = 'sawtooth';
    } else if (tone === 'jet') {
      osc1.type = 'triangle';
      osc2.type = 'sine';
    } else {
      osc1.type = 'sawtooth';
      osc2.type = 'triangle';
    }

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(280, now);
    filter.Q.setValueAtTime(2.5, now);

    gain.gain.setValueAtTime(0.001, now);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc1.start(now);
    osc2.start(now);

    this.engineOsc1 = osc1;
    this.engineOsc2 = osc2;
    this.engineFilter = filter;
    this.engineGain = gain;

    // White noise buffer for Jet Thruster roar
    const bufferSize = ctx.sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;

    const jetFilter = ctx.createBiquadFilter();
    jetFilter.type = 'bandpass';
    jetFilter.frequency.setValueAtTime(650, now);
    jetFilter.Q.setValueAtTime(0.7, now);

    const jetGain = ctx.createGain();
    jetGain.gain.setValueAtTime(0.0001, now);

    noise.connect(jetFilter);
    jetFilter.connect(jetGain);
    jetGain.connect(this.masterGain);
    noise.start(now);

    this.jetNoise = noise;
    this.jetFilter = jetFilter;
    this.jetGain = jetGain;
    this.isRunning = true;
  }

  public updateEngine(rpm: number, gasPressed: boolean, jetHeat: number, fuelEmpty: boolean): void {
    if (!this.isRunning || !this.ctx || !this.engineOsc1 || !this.engineOsc2 || !this.engineFilter || !this.engineGain) {
      return;
    }
    const now = this.ctx.currentTime;
    const clampedRpm = Math.max(0, Math.min(1.2, rpm));

    if (fuelEmpty) {
      this.engineGain.gain.setTargetAtTime(0.001, now, 0.08);
      if (this.jetGain) this.jetGain.gain.setTargetAtTime(0.0001, now, 0.06);
      return;
    }

    let baseFreq = 52;
    let spanFreq = 135;
    let harmonic = 1.5;
    let targetVol = gasPressed ? 0.14 : 0.07;

    if (this.vehicleTone === 'suv') {
      baseFreq = 38;
      spanFreq = 95;
      harmonic = 1.98;
      targetVol = gasPressed ? 0.17 : 0.09;
    } else if (this.vehicleTone === 'coupe') {
      baseFreq = 66;
      spanFreq = 225;
      harmonic = 1.498;
      targetVol = gasPressed ? 0.15 : 0.075;
    } else if (this.vehicleTone === 'jet') {
      baseFreq = 120;
      spanFreq = 380;
      harmonic = 2.02;
      targetVol = gasPressed ? 0.12 : 0.06;
    }

    const freq = baseFreq + clampedRpm * spanFreq;
    this.engineOsc1.frequency.setTargetAtTime(freq, now, 0.04);
    this.engineOsc2.frequency.setTargetAtTime(freq * harmonic, now, 0.04);
    this.engineFilter.frequency.setTargetAtTime(
      240 + clampedRpm * (gasPressed ? 1150 : 520),
      now,
      0.05
    );
    this.engineGain.gain.setTargetAtTime(targetVol, now, 0.06);

    if (this.jetGain && this.jetFilter) {
      const jt = Math.max(0, Math.min(1, jetHeat));
      this.jetGain.gain.setTargetAtTime(jt * 0.28, now, 0.05);
      this.jetFilter.frequency.setTargetAtTime(420 + jt * 950, now, 0.06);
    }
  }

  public stopEngine(): void {
    if (!this.isRunning) return;
    this.isRunning = false;
    try {
      this.engineOsc1?.stop();
      this.engineOsc2?.stop();
      this.jetNoise?.stop();
    } catch {
      // Ignore already stopped oscillators
    }
    this.engineOsc1?.disconnect();
    this.engineOsc2?.disconnect();
    this.engineFilter?.disconnect();
    this.engineGain?.disconnect();
    this.jetNoise?.disconnect();
    this.jetFilter?.disconnect();
    this.jetGain?.disconnect();
    this.engineOsc1 = null;
    this.engineOsc2 = null;
    this.engineFilter = null;
    this.engineGain = null;
    this.jetNoise = null;
    this.jetFilter = null;
    this.jetGain = null;
  }

  public playCoin(): void {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const now = ctx.currentTime;
    if (now - this.lastCoinTime < 0.65) {
      this.coinStreak = Math.min(8, this.coinStreak + 1);
    } else {
      this.coinStreak = 0;
    }
    this.lastCoinTime = now;

    const pitchMult = Math.pow(1.06, this.coinStreak);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(987.77 * pitchMult, now);
    osc.frequency.setValueAtTime(1318.5 * pitchMult, now + 0.055);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.24, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.24);
  }

  public playFuelPickup(): void {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const now = ctx.currentTime;
    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((freq, idx) => {
      const t = now + idx * 0.055;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.22, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(t);
      osc.stop(t + 0.18);
    });
  }

  public playStuntFanfare(): void {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const now = ctx.currentTime;
    const chord = [523.25, 659.25, 783.99, 1046.5];
    chord.forEach((freq, i) => {
      const t = now + i * 0.045;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 1800;

      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.14, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.36);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(t);
      osc.stop(t + 0.38);
    });
  }

  public playUpgradeClick(): void {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(920, now + 0.09);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  public playLowFuelBeep(): void {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const now = ctx.currentTime;
    if (now - this.lastLowFuelBeep < 0.72) return;
    this.lastLowFuelBeep = now;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(840, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.08, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  public playCrash(): void {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const now = ctx.currentTime;
    // Heavy sub thud
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(32, now + 0.28);
    gain.gain.setValueAtTime(0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.34);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.36);

    // Filtered noise crunch
    const len = Math.floor(ctx.sampleRate * 0.26);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.35));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const flt = ctx.createBiquadFilter();
    flt.type = 'lowpass';
    flt.frequency.value = 900;
    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.32, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
    noise.connect(flt);
    flt.connect(nGain);
    nGain.connect(this.masterGain);
    noise.start(now);

    // Cartoon neck-bonk downward whistle
    const bonk = ctx.createOscillator();
    const bonkGain = ctx.createGain();
    bonk.type = 'triangle';
    bonk.frequency.setValueAtTime(520, now + 0.04);
    bonk.frequency.exponentialRampToValueAtTime(150, now + 0.32);
    bonkGain.gain.setValueAtTime(0.16, now + 0.04);
    bonkGain.gain.exponentialRampToValueAtTime(0.001, now + 0.34);
    bonk.connect(bonkGain);
    bonkGain.connect(this.masterGain);
    bonk.start(now + 0.04);
    bonk.stop(now + 0.36);
  }

  public speakDriverLine(
    driver: DriverConfig,
    category: keyof DriverConfig['lines'],
    force = false
  ): string | null {
    const pool = driver.lines[category];
    if (!pool || pool.length === 0) return null;
    const text = pool[Math.floor(Math.random() * pool.length)];

    if (!this.voiceEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return text;
    }

    const nowMs = performance.now();
    if (!force && nowMs - this.lastSpeechTime < 3400) {
      return text;
    }
    this.lastSpeechTime = nowMs;

    try {
      if (force) {
        window.speechSynthesis.cancel();
      } else if (window.speechSynthesis.speaking) {
        return text;
      }
      const utter = new SpeechSynthesisUtterance(text);
      utter.pitch = driver.voicePitch;
      utter.rate = driver.voiceRate;
      utter.volume = 0.9;
      window.speechSynthesis.speak(utter);
    } catch {
      // Ignore speech synthesis restrictions
    }
    return text;
  }

  public cancelSpeech(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore
      }
    }
  }
}

export const soundEngine = new SoundEngine();
