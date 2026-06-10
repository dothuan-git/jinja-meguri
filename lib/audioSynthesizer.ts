// Procedural Shinto Seasonal Audio Synthesizer utilizing Web Audio API
// High-craft, self-contained, low resource overhead, works zero-network-latency.

class ShintoSeasonSynthesizer {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private currentSeason: "spring" | "summer" | "autumn" | "winter" = "spring";
  private isPlaying: boolean = false;
  
  // Node references for scheduled timers and active sources
  private windNode: AudioScheduledSourceNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private cricketNode: OscillatorNode | null = null;
  private cricketGain: GainNode | null = null;
  private soundIntervalRef: any = null;
  private noiseBuffer: AudioBuffer | null = null;

  constructor() {
    // Lazy initialisation inside browser environment
  }

  private initContext() {
    if (this.ctx) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioContextClass();
      this.masterGain = this.ctx.createGain();
      // Keep master volume very faint, delicate, and atmospheric
      this.masterGain.gain.setValueAtTime(0.04, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
      
      // Pre-generate white noise buffer
      const bufferSize = this.ctx.sampleRate * 4; // 4 seconds of unique noise
      this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
    } catch (e) {
      console.warn("Web Audio API not supported", e);
    }
  }

  public setSeason(season: "spring" | "summer" | "autumn" | "winter") {
    this.currentSeason = season;
    if (this.isPlaying) {
      this.stopSynthesizers();
      this.startSynthesizers();
    }
  }

  public toggle(forceState?: boolean): boolean {
    this.initContext();
    if (!this.ctx) return false;

    const targetState = forceState !== undefined ? forceState : !this.isPlaying;
    
    if (targetState) {
      if (this.ctx.state === "suspended") {
        this.ctx.resume();
      }
      this.startSynthesizers();
      this.isPlaying = true;
    } else {
      this.stopSynthesizers();
      this.isPlaying = false;
    }
    
    return this.isPlaying;
  }

  private startSynthesizers() {
    if (!this.ctx || !this.masterGain) return;

    this.stopSynthesizers();

    // Start background elemental wind/breeze synthesizer (ubiquitous to all seasons but with different characters)
    this.startWindSynth();

    // Start seasonal insect/ornament triggers
    switch (this.currentSeason) {
      case "spring":
        // Delicate, intermittent wind chimes (Fūrin)
        this.startWindChimesSynth();
        break;
      case "summer":
        // Higurashi Cicada / Summer nocturnal crickets
        this.startSummerCricketsSynth();
        break;
      case "autumn":
        // Suzumushi (bell crickets) with ringing shimmers
        this.startAutumnSuzumushiSynth();
        break;
      case "winter":
        // Freezing mountain peaks - gustier howling wind, no insects, deep stillness
        this.makeWindGustier();
        break;
    }
  }

  private stopSynthesizers() {
    if (this.soundIntervalRef) {
      clearInterval(this.soundIntervalRef);
      this.soundIntervalRef = null;
    }
    
    if (this.windNode) {
      try { this.windNode.stop(); } catch(e) {}
      this.windNode = null;
    }
    this.windFilter = null;

    if (this.cricketNode) {
      try { this.cricketNode.stop(); } catch(e) {}
      this.cricketNode = null;
    }
    this.cricketGain = null;
  }

  // General Wind/Breeze generator
  private startWindSynth() {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer) return;

    // Use our pre-generated white noise buffer for maximum performance
    const source = this.ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    source.loop = true;

    // Filter to create a natural, soft breeze structure
    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    
    // Choose appropriate frequency depending on season
    if (this.currentSeason === "winter") {
      filter.frequency.setValueAtTime(350, this.ctx.currentTime);
      filter.Q.setValueAtTime(5.0, this.ctx.currentTime); // high Q sounds cold/whistling
    } else {
      filter.frequency.setValueAtTime(450, this.ctx.currentTime);
      filter.Q.setValueAtTime(1.5, this.ctx.currentTime); // warm and soft
    }

    const windVolume = this.ctx.createGain();
    // Keep baseline wind extremely faint so it won't overwhelm
    windVolume.gain.setValueAtTime(0.12, this.ctx.currentTime);

    // Connect nodes
    source.connect(filter);
    filter.connect(windVolume);
    windVolume.connect(this.masterGain);

    source.start(0);
    this.windNode = source;
    this.windFilter = filter;

    // Animate the wind gusts slowly over time
    this.animateWindBreeze();
  }

  private animateWindBreeze() {
    if (!this.ctx || !this.windFilter) return;

    const ctx = this.ctx;
    const filter = this.windFilter;
    const season = this.currentSeason;

    const runWindAnimation = () => {
      if (!this.windFilter || !this.isPlaying) return;
      
      const now = ctx.currentTime;
      const duration = 5 + Math.random() * 5; // next gust in 5-10 seconds
      
      // Map wind character per season
      let targetFreq = 400 + Math.random() * 300;
      let targetQ = 1.0 + Math.random() * 2.0;

      if (season === "winter") {
        targetFreq = 250 + Math.random() * 450;
        targetQ = 4.0 + Math.random() * 6.0; // intense, cold whistle
      }

      filter.frequency.exponentialRampToValueAtTime(targetFreq, now + duration);
      filter.Q.exponentialRampToValueAtTime(targetQ, now + duration);

      this.soundIntervalRef = setTimeout(runWindAnimation, duration * 1000);
    };

    runWindAnimation();
  }

  private makeWindGustier() {
    // For winter, elevate the wind gain slightly to accentuate the mountain howl
    // It's handled dynamically by the high Q values inside 'animateWindBreeze'
  }

  // --- SPRING: Delicate Shinto Wind Chimes (Fūrin) ---
  private startWindChimesSynth() {
    if (!this.ctx || !this.masterGain) return;
    const ctx = this.ctx;
    const master = this.masterGain;

    const playSingleChimeRing = () => {
      if (!this.isPlaying || this.currentSeason !== "spring") return;

      const now = ctx.currentTime;
      
      // Beautiful pentatonic tones for absolute traditional harmony
      const frequencies = [659.25, 783.99, 880.00, 987.77, 1174.66, 1318.51, 1567.98];
      const baseFreq = frequencies[Math.floor(Math.random() * frequencies.length)];

      // Create primary resonator and several harmonics for metallic resonance
      const chimeNodes: { osc: OscillatorNode; gain: GainNode }[] = [];
      const numHarmonics = 3;
      
      const overallRingGain = ctx.createGain();
      // Super delicate volume
      overallRingGain.gain.setValueAtTime(0.0, now);
      overallRingGain.gain.linearRampToValueAtTime(0.18, now + 0.01);
      overallRingGain.gain.exponentialRampToValueAtTime(0.0001, now + 3.5);

      for (let i = 0; i < numHarmonics; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        // Shinto brass metal chimes have rich, slightly non-integral harmonics
        const freqOffset = i === 0 ? 1 : (i === 1 ? 2.52 : 4.11);
        osc.frequency.setValueAtTime(baseFreq * freqOffset, now);
        osc.type = "sine";

        // Higher parts decay faster
        const partVolume = i === 0 ? 0.6 : (i === 1 ? 0.25 : 0.1);
        gain.gain.setValueAtTime(partVolume, now);

        osc.connect(gain);
        gain.connect(overallRingGain);
        
        osc.start(now);
        osc.stop(now + 4.0);
      }

      overallRingGain.connect(master);

      // Re-trigger random chime event
      const nextChimeMs = 4000 + Math.random() * 6000;
      this.soundIntervalRef = setTimeout(playSingleChimeRing, nextChimeMs);
    };

    // First trigger
    this.soundIntervalRef = setTimeout(playSingleChimeRing, 2000);
  }

  // --- SUMMER: Traditional Higurashi Cicada Nocturne ---
  private startSummerCricketsSynth() {
    if (!this.ctx || !this.masterGain) return;
    const ctx = this.ctx;
    const master = this.masterGain;

    const playSummerCicadaPulse = () => {
      if (!this.isPlaying || this.currentSeason !== "summer") return;

      const now = ctx.currentTime;
      
      // Every summer burst represents a standard "kana-kana-kana" cicada drone
      const duration = 2.8;
      
      const carrier = ctx.createOscillator();
      carrier.type = "sine";
      carrier.frequency.setValueAtTime(2800, now); // classic sharp cicada frequency

      // Frequency modulator for cicada chirp buzz
      const modulator = ctx.createOscillator();
      modulator.type = "triangle";
      modulator.frequency.setValueAtTime(14, now); // vibrato rate (14 chirps/sec)

      const modGain = ctx.createGain();
      modGain.gain.setValueAtTime(180, now); // depth of vibrato

      // Amplitude Modulator (for strict rhythmic gating sound of "kana-kana")
      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(0, now);

      // Generate the swelling pulse pattern
      gainNode.gain.linearRampToValueAtTime(0.2, now + 0.1);
      
      // Let it ring with dynamic vibrato envelope
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      // Connect modulator
      modulator.connect(modGain);
      modGain.connect(carrier.frequency); // frequency modulation

      // Connect fully modulated carrier
      carrier.connect(gainNode);
      gainNode.connect(master);

      modulator.start(now);
      carrier.start(now);

      modulator.stop(now + duration + 0.1);
      carrier.stop(now + duration + 0.1);

      // Schedule next call
      const nextCicadaMs = 6000 + Math.random() * 5000;
      this.soundIntervalRef = setTimeout(playSummerCicadaPulse, nextCicadaMs);
    };

    // Low steady cricket chirper in background
    const startNocturnalCrickets = () => {
      if (!ctx || !this.isPlaying || this.currentSeason !== "summer") return;
      
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(3600, now); // beautiful sweet night cricket

      gain.gain.setValueAtTime(0, now);

      // Amplitude Modulation using a very rapid LFO
      const lfo = ctx.createOscillator();
      lfo.frequency.setValueAtTime(8, now); // 8 amplitude pulses per second
      const lfoGain = ctx.createGain();
      lfoGain.gain.setValueAtTime(0.08, now);

      lfo.connect(lfoGain);
      // Connect to gain control
      lfoGain.connect(gain.gain);

      // Gentle burst duration
      const burstDuration = 1.2;
      
      // Fade-in/out burst
      gain.gain.setValueAtTime(0.0, now);
      gain.gain.linearRampToValueAtTime(0.06, now + 0.1);
      gain.gain.setValueAtTime(0.06, now + burstDuration - 0.1);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + burstDuration);

      osc.connect(gain);
      gain.connect(master);
      
      lfo.start(now);
      osc.start(now);
      
      lfo.stop(now + burstDuration);
      osc.stop(now + burstDuration);

      setTimeout(startNocturnalCrickets, 4000 + Math.random() * 3000);
    };

    // Trigger both summer loops
    playSummerCicadaPulse();
    setTimeout(startNocturnalCrickets, 1000);
  }

  // --- AUTUMN: Pure crystalline "Suzumushi" (Bell Cricket) ---
  private startAutumnSuzumushiSynth() {
    if (!this.ctx || !this.masterGain) return;
    const ctx = this.ctx;
    const master = this.masterGain;

    const playBellCricketRing = () => {
      if (!this.isPlaying || this.currentSeason !== "autumn") return;

      const now = ctx.currentTime;
      const duration = 2.0;

      // Suzumushi rings beautifully at ~4500Hz with high frequency tremolo
      const carrier = ctx.createOscillator();
      carrier.type = "sine";
      carrier.frequency.setValueAtTime(4500, now);

      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(0, now);

      // Tremolo modulator to represent cricket shell wings vibrating
      const tremolo = ctx.createOscillator();
      tremolo.type = "sine";
      tremolo.frequency.setValueAtTime(55, now); // high rate for buzzing ring

      const tremoloGain = ctx.createGain();
      tremoloGain.gain.setValueAtTime(0.08, now);

      // Envelope the ring shape "chin... chin..."
      gainNode.gain.linearRampToValueAtTime(0.08, now + 0.2);
      gainNode.gain.linearRampToValueAtTime(0.08, now + duration - 0.4);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      tremolo.connect(tremoloGain);
      tremoloGain.connect(gainNode.gain);

      carrier.connect(gainNode);
      gainNode.connect(master);

      tremolo.start(now);
      carrier.start(now);

      tremolo.stop(now + duration + 0.1);
      carrier.stop(now + duration + 0.1);

      // Random next trigger
      const nextRingMs = 3500 + Math.random() * 4000;
      this.soundIntervalRef = setTimeout(playBellCricketRing, nextRingMs);
    };

    playBellCricketRing();
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getSeason(): "spring" | "summer" | "autumn" | "winter" {
    return this.currentSeason;
  }
}

// Single active service instance to maintain state cleanly in the applet
export const shintoSynth = new ShintoSeasonSynthesizer();
