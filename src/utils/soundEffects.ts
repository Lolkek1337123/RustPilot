// Unified Sound Engine Wrapper - delegates directly to soundService to maintain 100% single AudioContext & single Mute state
import { sound } from '../services/soundService';

export const soundEffects = {
  setMuted: (muted: boolean) => sound.setSoundEnabled(!muted),
  playClick: () => sound.playClick(),
  playSuccess: () => sound.playSuccess(),
  playError: () => sound.playError(),
  playWarning: () => sound.playWarning()
};
