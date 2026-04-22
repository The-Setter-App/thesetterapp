"use client";

type Unlock = () => void;

interface LockState {
  locked: boolean;
  waiters: Unlock[];
}

export class KeyedMutex {
  private readonly locks = new Map<string, LockState>();

  private async lock(key: string): Promise<void> {
    const state = this.locks.get(key) ?? { locked: false, waiters: [] };
    this.locks.set(key, state);

    if (!state.locked) {
      state.locked = true;
      return;
    }

    await new Promise<void>((resolve) => {
      state.waiters.push(resolve);
    });
    state.locked = true;
  }

  private unlock(key: string): void {
    const state = this.locks.get(key);
    if (!state) return;

    const next = state.waiters.shift();
    if (next) {
      next();
      return;
    }

    state.locked = false;
    this.locks.delete(key);
  }

  async runExclusive<T>(key: string, runner: () => Promise<T>): Promise<T> {
    await this.lock(key);
    try {
      return await runner();
    } finally {
      this.unlock(key);
    }
  }
}
