// ============================================================================
// GAME SOUNDS — Efectos de sonido generados con Web Audio API
// Sin assets externos. Lazy-init en primer click del usuario.
// ============================================================================

class GameSounds {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null

  private getCtx(): AudioContext | null {
    if (typeof window === 'undefined') return null
    if (this.ctx) return this.ctx
    try {
      const AudioContextCtor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AudioContextCtor) return null
      this.ctx = new AudioContextCtor()
      this.masterGain = this.ctx.createGain()
      this.masterGain.gain.value = 0.5
      this.masterGain.connect(this.ctx.destination)
    } catch {
      return null
    }
    return this.ctx
  }

  resume(): void {
    const ctx = this.getCtx()
    if (ctx && ctx.state === 'suspended') {
      void ctx.resume()
    }
  }

  private tone(
    frequency: number,
    duration: number,
    options: {
      type?: OscillatorType
      volume?: number
      rampTo?: number
      rampDuration?: number
      delay?: number
    } = {}
  ): void {
    const ctx = this.getCtx()
    if (!ctx || !this.masterGain) return
    const { type = 'sine', volume = 0.2, rampTo, rampDuration, delay = 0 } = options
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.value = frequency
    const start = ctx.currentTime + delay
    gain.gain.setValueAtTime(0, start)
    gain.gain.linearRampToValueAtTime(volume, start + 0.005)
    if (rampTo !== undefined && rampDuration !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(rampTo, start + rampDuration)
    }
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration)
    osc.connect(gain)
    gain.connect(this.masterGain)
    osc.start(start)
    osc.stop(start + duration + 0.05)
  }

  tick(): void {
    this.tone(800, 0.04, { type: 'square', volume: 0.05 })
  }

  win(): void {
    this.tone(523, 0.15, { type: 'triangle', volume: 0.18, delay: 0 })
    this.tone(659, 0.15, { type: 'triangle', volume: 0.18, delay: 0.1 })
    this.tone(784, 0.3, { type: 'triangle', volume: 0.2, delay: 0.2 })
  }

  jackpot(): void {
    const notes = [523, 659, 784, 1047, 1319]
    notes.forEach((freq, i) => {
      this.tone(freq, 0.25, { type: 'triangle', volume: 0.22, delay: i * 0.08 })
    })
  }

  flap(): void {
    this.tone(200, 0.08, {
      type: 'square',
      volume: 0.08,
      rampTo: 450,
      rampDuration: 0.05,
    })
  }

  score(): void {
    this.tone(660, 0.06, { type: 'sine', volume: 0.08 })
  }

  crash(): void {
    const ctx = this.getCtx()
    if (!ctx || !this.masterGain) return
    const noise = ctx.createBufferSource()
    const bufferSize = ctx.sampleRate * 0.4
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize)
    }
    noise.buffer = buffer
    const gain = ctx.createGain()
    gain.gain.value = 0.25
    noise.connect(gain)
    gain.connect(this.masterGain)
    noise.start()
    noise.stop(ctx.currentTime + 0.4)

    this.tone(120, 0.5, {
      type: 'sawtooth',
      volume: 0.15,
      rampTo: 40,
      rampDuration: 0.5,
    })
  }

  coin(): void {
    this.tone(1200, 0.1, { type: 'sine', volume: 0.12 })
    this.tone(1800, 0.12, { type: 'sine', volume: 0.1, delay: 0.05 })
  }

  upgrade(): void {
    this.tone(440, 0.12, { type: 'triangle', volume: 0.15 })
    this.tone(660, 0.12, { type: 'triangle', volume: 0.15, delay: 0.1 })
    this.tone(880, 0.2, { type: 'triangle', volume: 0.18, delay: 0.2 })
  }

  click(): void {
    this.tone(600, 0.05, { type: 'square', volume: 0.06 })
  }
}

export const gameSounds = new GameSounds()
