import { BxLogger } from './bx-logger'

// Declare a global interface to extend Window
declare global {
  interface Window {
    BXCState: BXCStateType
  }
}

// Define the shape of the state
interface StateType {
  [key: string]: any
}

// Define the shape of BXCState
interface BXCStateType {
  _state: StateType
  _listeners: Set<(state: StateType) => void>
  setState(newState: Partial<StateType>): void
  getState(): StateType
  subscribe(listener: (state: StateType) => void): () => boolean
  _notifyListeners(): void
}

// Define a state management object
const BXCState: BXCStateType = {
  _state: {},
  _listeners: new Set<(state: StateType) => void>(),

  setState(newState: Partial<StateType>) {
    this._state = { ...this._state, ...newState }
    this._notifyListeners()

    // Dispatch a custom event for external listeners (like the React app)
    window.dispatchEvent(new CustomEvent('BXCStateUpdate', { detail: this._state }))

    BxLogger.info('BXCState', 'setState', newState)
  },

  getState() {
    return { ...this._state } // Return a shallow copy to prevent direct mutations
  },

  subscribe(listener: (state: StateType) => void) {
    this._listeners.add(listener)
    return () => this._listeners.delete(listener)
  },

  _notifyListeners() {
    this._listeners.forEach((listener) => listener({ ...this._state }))
  },
}

// Expose the state object to the window
window.BXCState = BXCState

export { BXCState }
