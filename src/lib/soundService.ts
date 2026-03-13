let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;

const initAudio = () => {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  masterGain = audioCtx.createGain();
  masterGain.connect(audioCtx.destination);
};

export const setVolume = (volume: number) => {
  if (!masterGain) initAudio();
  if (masterGain) {
    masterGain.gain.setTargetAtTime(volume, audioCtx!.currentTime, 0.1);
  }
};

export const playTick = () => {
  if (!audioCtx) initAudio();
  if (audioCtx?.state === 'suspended') audioCtx.resume();
  
  const osc = audioCtx!.createOscillator();
  const gain = audioCtx!.createGain();
  
  osc.type = 'sine';
  osc.frequency.setValueAtTime(800, audioCtx!.currentTime);
  
  gain.gain.setValueAtTime(0.1, audioCtx!.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx!.currentTime + 0.1);
  
  osc.connect(gain);
  gain.connect(masterGain!);
  
  osc.start();
  osc.stop(audioCtx!.currentTime + 0.1);
};

export const playAlarm = () => {
  if (!audioCtx) initAudio();
  if (audioCtx?.state === 'suspended') audioCtx.resume();
  
  // Create a sequence of beeps
  for (let i = 0; i < 3; i++) {
    const startTime = audioCtx!.currentTime + (i * 0.4);
    const osc = audioCtx!.createOscillator();
    const gain = audioCtx!.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, startTime);
    osc.frequency.exponentialRampToValueAtTime(880, startTime + 0.2);
    
    gain.gain.setValueAtTime(0.2, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);
    
    osc.connect(gain);
    gain.connect(masterGain!);
    
    osc.start(startTime);
    osc.stop(startTime + 0.3);
  }
};
