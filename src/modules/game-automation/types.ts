/**
 * Available automation modes for Fallout 76
 */
export enum FO76AutomationModes {
  HEAL = "heal",
  PIVOT = "pivot",
  AUTOMATION = "automation",
  VATS = "vats",
  INTERACT = "interact",
}

/**
 * Configuration for an automation loop
 */
export interface LoopConfig {
  isRunning: boolean;
  actionInterval: number;
  pauseDuration: number;
  action: () => Promise<void>;
}

/**
 * Configuration for an automation mode
 */
export interface FO76AutomationMode {
  name: FO76AutomationModes;
  interval?: number;
  pause?: number;
  enabled?: boolean;
  toggle?: boolean;
}

/**
 * State of the automation system
 */
export interface FO76AutomationState {
  enabled: boolean;
  modes: Map<string, LoopConfig>;
}

/**
 * Observer interface for automation state changes
 */
export interface FO76AutomationStateObserver {
  update(state: FO76AutomationState): void;
} 