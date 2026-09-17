let enabled = true;
let ctx = null;

function audioContext() {
  if (!enabled || typeof window === "undefined") return null;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!ctx) ctx = new Ctx();
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

function tone(frequency, duration = .12, type = "sine", gainValue = .055, delay = 0) {
  const context = audioContext();
  if (!context) return;
  const start = context.currentTime + delay;
  const osc = context.createOscillator();
  const gain = context.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(gainValue, start + .015);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain).connect(context.destination);
  osc.start(start);
  osc.stop(start + duration + .03);
}

export const SoundEngine = {
  setEnabled(value) { enabled = Boolean(value); localStorage.setItem("abu-game-sound", enabled ? "1" : "0"); },
  isEnabled() { const saved = localStorage.getItem("abu-game-sound"); return saved == null ? enabled : saved === "1"; },
  sync() { enabled = this.isEnabled(); },
  tap() { tone(440,.07,"sine",.025); },
  correct() { tone(523,.10,"sine",.045); tone(659,.13,"sine",.045,.08); },
  wrong() { tone(220,.11,"triangle",.035); tone(196,.11,"triangle",.025,.08); },
  star() { tone(659,.1,"sine",.04); tone(784,.12,"sine",.04,.08); tone(988,.18,"sine",.035,.16); },
  win() { tone(523,.13,"sine",.045); tone(659,.13,"sine",.045,.1); tone(784,.16,"sine",.045,.2); tone(1047,.25,"sine",.035,.31); },
  tick() { tone(760,.035,"square",.012); },
  unlock() { tone(330,.08,"triangle",.035); tone(494,.18,"sine",.045,.09); },
  spin() { tone(300 + Math.random()*180,.045,"triangle",.015); },
};

SoundEngine.sync();
