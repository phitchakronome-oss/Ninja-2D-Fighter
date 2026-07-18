/**
 * StateMachine.ts
 * Finite State Machine แบบง่าย ใช้คุมสถานะของ Character / Enemy / Boss
 * (Idle, Run, Jump, Attack, Hurt, Dead ฯลฯ)
 */

export interface StateHandler {
  onEnter?: () => void;
  onUpdate?: (deltaMs: number) => void;
  onExit?: () => void;
}

export class StateMachine {
  private states = new Map<string, StateHandler>();
  private currentState: string | null = null;

  addState(name: string, handler: StateHandler): this {
    this.states.set(name, handler);
    return this;
  }

  transition(name: string): void {
    if (this.currentState === name) return;
    if (!this.states.has(name)) {
      console.warn(`[StateMachine] Unknown state: ${name}`);
      return;
    }
    if (this.currentState) {
      this.states.get(this.currentState)?.onExit?.();
    }
    this.currentState = name;
    this.states.get(name)?.onEnter?.();
  }

  update(deltaMs: number): void {
    if (this.currentState) {
      this.states.get(this.currentState)?.onUpdate?.(deltaMs);
    }
  }

  get state(): string | null {
    return this.currentState;
  }
}
