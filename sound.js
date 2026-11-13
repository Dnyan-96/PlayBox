const SoundFX = (() => {
  let enabled = true;
  let ctx = null;

  function ensureContext() {
    if (!ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) ctx = new AudioCtx();
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  function tone(freq, duration = 0.09, type = 'sine', gainVal = 0.12) {
    if (!enabled) return;
    ensureContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(gainVal, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  return {
    setEnabled(val) { enabled = Boolean(val); },
    isEnabled() { return enabled; },
    tap() { tone(520, 0.06, 'triangle', 0.1); },
    drop() { tone(320, 0.1, 'sine', 0.14); },
    score() {
      tone(587.33, 0.08, 'square', 0.08);
      setTimeout(() => tone(880, 0.12, 'square', 0.08), 75);
    },
    win() {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
        setTimeout(() => tone(f, 0.16, 'triangle', 0.13), i * 90);
      });
    },
    lose() {
      tone(240, 0.18, 'sawtooth', 0.1);
      setTimeout(() => tone(170, 0.25, 'sawtooth', 0.1), 150);
    }
  };
})();
