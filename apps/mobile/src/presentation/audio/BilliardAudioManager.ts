import { Platform } from 'react-native';

/**
 * Hyper-realistic tournament acoustic synthesizer for Carom Billiards / 3-Cushion audio.
 * Synthesizes physically accurate acoustic profiles:
 * - Cue tip chalked leather strike with follow-through ("atraviesa la bola") vs dry hit ("golpe seco")
 * - Ball-to-ball impact with crisp phenolic resin (Aramith Pro-Cup) resonance and thickness modulation
 * - Cushion rubber bounce with felt/slate dampening
 * - Carom score celebration
 */
class BilliardAudioManager {
    private ctx: AudioContext | null = null;
    private isUnlocked = false;

    constructor() {
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
            this.setupUnlockListeners();
        }
    }

    private setupUnlockListeners() {
        if (typeof window === 'undefined') return;
        const unlock = () => {
            if (!this.ctx) {
                const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
                if (AudioCtx) {
                    try {
                        this.ctx = new AudioCtx();
                    } catch {}
                }
            } else if (this.ctx.state === 'suspended') {
                this.ctx.resume().catch(() => {});
            }
            this.isUnlocked = true;
            window.removeEventListener('pointerdown', unlock);
            window.removeEventListener('keydown', unlock);
            window.removeEventListener('touchstart', unlock);
        };
        window.addEventListener('pointerdown', unlock, { once: true, passive: true });
        window.addEventListener('keydown', unlock, { once: true, passive: true });
        window.addEventListener('touchstart', unlock, { once: true, passive: true });
    }

    private getContext(): AudioContext | null {
        if (!this.ctx && Platform.OS === 'web' && typeof window !== 'undefined') {
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioCtx) {
                try {
                    this.ctx = new AudioCtx();
                } catch {}
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
        }
        return this.ctx;
    }

    /**
     * Cue stick leather tip strike on cue ball.
     * Accurately reflects how deeply the cue follows through ("atraviesa la bola").
     * @param power Power percentage (0 to 100) or rail speed (0 to 5)
     * @param strokeType Shot execution style ('normal' | 'extended' | 'dry' | 'follow')
     */
    playCueStrike(power: number = 70, strokeType: string = 'normal') {
        const ctx = this.getContext();
        if (!ctx) return;

        const now = ctx.currentTime;
        const normalizedPower = power <= 5 ? (power / 5.0) : Math.min(1, Math.max(0.1, power / 100));
        const isFollowThrough = strokeType === 'extended' || strokeType === 'follow' || normalizedPower > 0.65;
        const isDryHit = strokeType === 'dry';

        // 1. Initial Chalk/Leather Impact Transient Crack
        const crackDuration = isDryHit ? 0.015 : 0.028;
        const crackBufferSize = Math.floor(ctx.sampleRate * crackDuration);
        const crackBuffer = ctx.createBuffer(1, crackBufferSize, ctx.sampleRate);
        const crackData = crackBuffer.getChannelData(0);
        for (let i = 0; i < crackBufferSize; i++) {
            crackData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * (isDryHit ? 0.003 : 0.006)));
        }

        const crackSource = ctx.createBufferSource();
        crackSource.buffer = crackBuffer;

        const crackFilter = ctx.createBiquadFilter();
        crackFilter.type = 'bandpass';
        crackFilter.frequency.setValueAtTime(isDryHit ? 2400 : 1550, now);
        crackFilter.Q.setValueAtTime(isDryHit ? 3.5 : 2.2, now);

        const crackGain = ctx.createGain();
        const crackVol = 0.50 * normalizedPower;
        crackGain.gain.setValueAtTime(crackVol, now);
        crackGain.gain.exponentialRampToValueAtTime(0.001, now + crackDuration);

        crackSource.connect(crackFilter);
        crackFilter.connect(crackGain);
        crackGain.connect(ctx.destination);
        crackSource.start(now);

        // 2. Cue Shaft Wooden Body Compression (Maple / Ash vibration)
        const shaftOsc = ctx.createOscillator();
        const shaftGain = ctx.createGain();
        shaftOsc.type = 'sine';
        const startFreq = isDryHit ? 280 : (isFollowThrough ? 190 : 220);
        const endFreq = isDryHit ? 90 : (isFollowThrough ? 50 : 70);
        shaftOsc.frequency.setValueAtTime(startFreq, now);
        shaftOsc.frequency.exponentialRampToValueAtTime(endFreq, now + (isFollowThrough ? 0.065 : 0.04));

        const shaftVol = (isFollowThrough ? 0.45 : 0.35) * normalizedPower;
        shaftGain.gain.setValueAtTime(shaftVol, now);
        shaftGain.gain.exponentialRampToValueAtTime(0.001, now + (isFollowThrough ? 0.065 : 0.04));

        shaftOsc.connect(shaftGain);
        shaftGain.connect(ctx.destination);
        shaftOsc.start(now);
        shaftOsc.stop(now + 0.07);

        // 3. Follow-through stroke friction ("cuando el taco atraviesa la bola")
        if (isFollowThrough) {
            const glideDuration = 0.06;
            const glideBufferSize = Math.floor(ctx.sampleRate * glideDuration);
            const glideBuffer = ctx.createBuffer(1, glideBufferSize, ctx.sampleRate);
            const glideData = glideBuffer.getChannelData(0);
            for (let i = 0; i < glideBufferSize; i++) {
                glideData[i] = (Math.random() * 2 - 1) * Math.sin((i / glideBufferSize) * Math.PI);
            }

            const glideSource = ctx.createBufferSource();
            glideSource.buffer = glideBuffer;

            const glideFilter = ctx.createBiquadFilter();
            glideFilter.type = 'lowpass';
            glideFilter.frequency.setValueAtTime(650, now);

            const glideGain = ctx.createGain();
            glideGain.gain.setValueAtTime(0.18 * normalizedPower, now + 0.008);
            glideGain.gain.exponentialRampToValueAtTime(0.001, now + glideDuration);

            glideSource.connect(glideFilter);
            glideFilter.connect(glideGain);
            glideGain.connect(ctx.destination);
            glideSource.start(now + 0.005);
        }
    }

    /**
     * Ball-to-ball impact with crisp phenolic resin (Aramith) acoustic timbre.
     * High-speed physical crack + modal ring + mass pop according to thickness.
     * @param speed Impact velocity (cm/frame)
     * @param thickness Fraction of ball hit (0 = paper-thin graze, 0.5 = half-ball, 1.0 = full ball)
     */
    playBallCollision(speed: number = 10, thickness: number = 0.6) {
        const ctx = this.getContext();
        if (!ctx) return;

        const now = ctx.currentTime;
        const normalizedSpeed = Math.min(1.0, Math.max(0.12, speed / 22.0));
        const clampedThickness = Math.min(1.0, Math.max(0.05, Math.abs(thickness)));

        const masterVol = 0.62 * Math.pow(normalizedSpeed, 0.65);

        // 1. Ultra-sharp contact shockwave transient (instantaneous crack < 2.5ms)
        const transientSize = Math.floor(ctx.sampleRate * 0.012);
        const transientBuffer = ctx.createBuffer(1, transientSize, ctx.sampleRate);
        const tData = transientBuffer.getChannelData(0);
        for (let i = 0; i < transientSize; i++) {
            tData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.0015));
        }

        const tSource = ctx.createBufferSource();
        tSource.buffer = transientBuffer;

        const tFilter = ctx.createBiquadFilter();
        tFilter.type = 'bandpass';
        // Center frequency varies by cut: thin cut = 4800Hz, full ball = 3600Hz
        tFilter.frequency.setValueAtTime(4800 - clampedThickness * 1200, now);
        tFilter.Q.setValueAtTime(3.8, now);

        const tGain = ctx.createGain();
        tGain.gain.setValueAtTime(masterVol * 0.95, now);
        tGain.gain.exponentialRampToValueAtTime(0.001, now + 0.011);

        tSource.connect(tFilter);
        tFilter.connect(tGain);
        tGain.connect(ctx.destination);
        tSource.start(now);

        // 2. Primary Phenolic Resin Ring Mode (Aramith Pro-Cup ~3250Hz - 3600Hz)
        const primaryFreq = 3650 - clampedThickness * 850;
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(primaryFreq, now);

        const ringDuration = 0.018 + clampedThickness * 0.016;
        gain1.gain.setValueAtTime(masterVol * 0.70, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + ringDuration);

        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + ringDuration + 0.005);

        // 3. High Inharmonic Surface Shimmer (~5200Hz - 6400Hz)
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(primaryFreq * 1.55, now);

        gain2.gain.setValueAtTime(masterVol * 0.35, now);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.014);

        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now);
        osc2.stop(now + 0.018);

        // 4. Solid 210g Sphere Mass Body Pop (Low-mid punch for full & half hits)
        if (clampedThickness >= 0.2) {
            const oscBody = ctx.createOscillator();
            const gainBody = ctx.createGain();
            oscBody.type = 'sine';
            const bodyFreq = 780 - clampedThickness * 160;
            oscBody.frequency.setValueAtTime(bodyFreq, now);
            oscBody.frequency.exponentialRampToValueAtTime(bodyFreq * 0.65, now + 0.024);

            const bodyVol = masterVol * clampedThickness * 0.55;
            gainBody.gain.setValueAtTime(bodyVol, now);
            gainBody.gain.exponentialRampToValueAtTime(0.001, now + 0.028);

            oscBody.connect(gainBody);
            gainBody.connect(ctx.destination);
            oscBody.start(now);
            oscBody.stop(now + 0.032);
        }
    }

    /**
     * Ball-to-cushion rubber rail bounce.
     * Muffled, rubbery thud with cloth dampening.
     * @param speed Velocity of the ball entering cushion
     */
    playCushionBounce(speed: number = 8) {
        const ctx = this.getContext();
        if (!ctx) return;

        const now = ctx.currentTime;
        const normalizedSpeed = Math.min(1.0, Math.max(0.15, speed / 18.0));
        const vol = 0.38 * normalizedSpeed;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(55, now + 0.06);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(260, now);

        gain.gain.setValueAtTime(vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.065);
    }

    /**
     * Carom completed celebratory chord chime.
     */
    playCaromSuccess() {
        const ctx = this.getContext();
        if (!ctx) return;

        const now = ctx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 chord

        notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + idx * 0.07);

            gain.gain.setValueAtTime(0, now + idx * 0.07);
            gain.gain.linearRampToValueAtTime(0.22, now + idx * 0.07 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.45);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + idx * 0.07);
            osc.stop(now + idx * 0.07 + 0.50);
        });
    }
}

export const billiardAudio = new BilliardAudioManager();
