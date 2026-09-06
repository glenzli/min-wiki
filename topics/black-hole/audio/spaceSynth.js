/**
 * Procedural Space & Black Hole Sound Synthesizer using Web Audio API
 * Generates continuous cosmic drone, tidal disruption tearing, accretion crackle, and jet rumbles.
 * Zero external audio assets required.
 */

export class SpaceSynth {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.isPlaying = false;
    this.droneOsc1 = null;
    this.droneOsc2 = null;
    this.noiseNode = null;
    this.filterNode = null;
    this.jetGain = null;
    this.jetOsc = null;
  }

  init() {
    if (this.ctx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    // 1. Deep Sub-bass Gravitational Drone
    this.droneOsc1 = this.ctx.createOscillator();
    this.droneOsc1.type = 'sine';
    this.droneOsc1.frequency.setValueAtTime(45, this.ctx.currentTime); // 45 Hz deep rumble

    this.droneOsc2 = this.ctx.createOscillator();
    this.droneOsc2.type = 'triangle';
    this.droneOsc2.frequency.setValueAtTime(68, this.ctx.currentTime);

    // LFO for breathing drone
    const lfo = this.ctx.createOscillator();
    lfo.frequency.setValueAtTime(0.12, this.ctx.currentTime);
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(15, this.ctx.currentTime);
    lfo.connect(lfoGain);
    lfoGain.connect(this.droneOsc2.frequency);
    lfo.start();

    const droneMix = this.ctx.createGain();
    droneMix.gain.setValueAtTime(0.4, this.ctx.currentTime);
    this.droneOsc1.connect(droneMix);
    this.droneOsc2.connect(droneMix);

    // 2. Filtered Cosmic Noise (Accretion & Stellar Wind)
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    this.noiseNode = this.ctx.createBufferSource();
    this.noiseNode.buffer = noiseBuffer;
    this.noiseNode.loop = true;

    this.filterNode = this.ctx.createBiquadFilter();
    this.filterNode.type = 'bandpass';
    this.filterNode.frequency.setValueAtTime(320, this.ctx.currentTime);
    this.filterNode.Q.setValueAtTime(2.5, this.ctx.currentTime);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.15, this.ctx.currentTime);

    this.noiseNode.connect(this.filterNode);
    this.filterNode.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    // 3. Relativistic Jet Drone
    this.jetOsc = this.ctx.createOscillator();
    this.jetOsc.type = 'sawtooth';
    this.jetOsc.frequency.setValueAtTime(110, this.ctx.currentTime);

    const jetFilter = this.ctx.createBiquadFilter();
    jetFilter.type = 'lowpass';
    jetFilter.frequency.setValueAtTime(280, this.ctx.currentTime);

    this.jetGain = this.ctx.createGain();
    this.jetGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    this.jetOsc.connect(jetFilter);
    jetFilter.connect(this.jetGain);
    this.jetGain.connect(this.masterGain);

    // Connect Drone to Master
    droneMix.connect(this.masterGain);

    // Start Sources
    this.droneOsc1.start();
    this.droneOsc2.start();
    this.noiseNode.start();
    this.jetOsc.start();
  }

  start() {
    if (!this.ctx) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.masterGain.gain.linearRampToValueAtTime(0.12, this.ctx.currentTime + 1.2);
    }
    this.isPlaying = true;
  }

  stop() {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
      this.masterGain.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + 0.6);
    }
    this.isPlaying = false;
  }

  /**
   * Update audio characteristics based on simulation progress t (0 to 1)
   */
  updateProgress(t) {
    if (!this.isPlaying || !this.ctx) return;
    const time = this.ctx.currentTime;
    this.jetGain.gain.setValueAtTime(0.0, time);

    // Pitch & frequency increases around pericenter crossing (t ~ 0.25 - 0.45)
    let baseFreq = 45;
    let filterFreq = 300;

    if (t > 0.2 && t < 0.5) {
      // Tidal disruption tear
      const tearIntensity = Math.sin((t - 0.2) / 0.3 * Math.PI);
      baseFreq = 45 + tearIntensity * 35;
      filterFreq = 300 + tearIntensity * 800;
    } else if (t >= 0.5 && t < 0.75) {
      // High-energy accretion disk circularization
      const accIntensity = (t - 0.5) / 0.25;
      baseFreq = 50 + accIntensity * 20;
      filterFreq = 450 + accIntensity * 400;
    } else if (t >= 0.75) {
      // Relativistic Jet eruption
      const jetIntensity = (t - 0.75) / 0.25;
      baseFreq = 65 + jetIntensity * 20;
      filterFreq = 600 + jetIntensity * 600;
      // No jet effect in this encounter story.
    } else {
      this.jetGain.gain.setValueAtTime(0.0, time);
    }

    this.droneOsc1.frequency.setTargetAtTime(baseFreq, time, 0.1);
    this.filterNode.frequency.setTargetAtTime(filterFreq, time, 0.1);
  }
}
