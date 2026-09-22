import { multiplayer } from '../multiplayer/multiplayerService';

export interface IdleState {
  isAfk: boolean;
  isAsleep: boolean;
  idleDurationMs: number;
}

type IdleListener = (state: IdleState) => void;

class IdleManager {
  private lastActivityTime: number = Date.now();
  private isAfk: boolean = false;
  private isAsleep: boolean = false;
  private isTabHidden: boolean = false;
  private tabHiddenTime: number = 0;
  private checkInterval: NodeJS.Timeout | null = null;
  private listeners: Set<IdleListener> = new Set();

  // Thresholds
  public readonly AFK_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes
  public readonly TAB_HIDDEN_AFK_MS = 30 * 1000; // 30 seconds if tab is hidden
  public readonly SLEEP_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes

  constructor() {
    if (typeof window !== 'undefined') {
      this.init();
    }
  }

  private init() {
    const handleActivity = () => {
      this.recordActivity();
    };

    // User activity listeners
    window.addEventListener('mousemove', handleActivity, { passive: true });
    window.addEventListener('mousedown', handleActivity, { passive: true });
    window.addEventListener('keydown', handleActivity, { passive: true });
    window.addEventListener('touchstart', handleActivity, { passive: true });
    window.addEventListener('pointerdown', handleActivity, { passive: true });
    window.addEventListener('wheel', handleActivity, { passive: true });

    // Tab visibility listener
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.isTabHidden = true;
        this.tabHiddenTime = Date.now();
      } else {
        this.isTabHidden = false;
        // Tab restored - record activity
        this.recordActivity();
      }
    });

    // Check timer every 2 seconds
    this.checkInterval = setInterval(() => {
      this.checkIdleStatus();
    }, 2000);
  }

  public recordActivity() {
    this.lastActivityTime = Date.now();

    // If player was asleep, require explicit wakeUp call or resume
    if (this.isAsleep) {
      return;
    }

    if (this.isAfk) {
      this.isAfk = false;
      multiplayer.setAfk(false);
      this.notify();
    }
  }

  private checkIdleStatus() {
    const now = Date.now();
    const idleTime = now - this.lastActivityTime;

    // Check for Deep Sleep (15 minutes)
    if (!this.isAsleep && idleTime >= this.SLEEP_THRESHOLD_MS) {
      this.isAsleep = true;
      this.isAfk = true;
      multiplayer.setAfk(true);
      this.notify();
      return;
    }

    // Check for AFK (2 minutes normal, or 30s if tab hidden)
    const shouldBeAfk =
      idleTime >= this.AFK_THRESHOLD_MS ||
      (this.isTabHidden && now - this.tabHiddenTime >= this.TAB_HIDDEN_AFK_MS);

    if (shouldBeAfk && !this.isAfk) {
      this.isAfk = true;
      multiplayer.setAfk(true);
      this.notify();
    } else if (!shouldBeAfk && this.isAfk && !this.isAsleep) {
      this.isAfk = false;
      multiplayer.setAfk(false);
      this.notify();
    }
  }

  public wakeUp() {
    this.lastActivityTime = Date.now();
    this.isAfk = false;
    this.isAsleep = false;
    multiplayer.setAfk(false);
    this.notify();
  }

  public getStatus(): IdleState {
    return {
      isAfk: this.isAfk,
      isAsleep: this.isAsleep,
      idleDurationMs: Date.now() - this.lastActivityTime,
    };
  }

  public subscribe(listener: IdleListener): () => void {
    this.listeners.add(listener);
    listener(this.getStatus());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const status = this.getStatus();
    this.listeners.forEach((listener) => {
      try {
        listener(status);
      } catch (err) {
        console.error('Error in idle listener:', err);
      }
    });
  }

  public destroy() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.listeners.clear();
  }
}

export const idleManager = new IdleManager();
