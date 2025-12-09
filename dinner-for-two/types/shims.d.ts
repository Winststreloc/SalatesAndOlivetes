// Temporary shims to satisfy type checking in isolated envs where
// React type packages are unavailable. Replace with proper @types
// installations in normal development.

declare module 'react/jsx-runtime' {
  export const jsx: any
  export const jsxs: any
  export const Fragment: any
}

declare module 'react' {
  const React: any
  export default React
  export function useState<S = undefined>(
    initialState?: S
  ): [S, (value: S | ((prev: S) => S)) => void]
  export function useEffect(
    effect: (...args: any[]) => void | (() => void),
    deps?: any[]
  ): void
  export function useMemo<T = any>(factory: () => T, deps?: any[]): T
  export function useRef<T = any>(initialValue?: T): { current: T }
  export function useCallback<T extends (...args: any[]) => any>(
    cb: T,
    deps?: any[]
  ): T
  export function createContext<T = any>(defaultValue?: T): any
  export function useContext<T = any>(ctx: any): T
  export * from 'react/jsx-runtime'
}

declare module 'lucide-react' {
  export const Trash2: any
  export const Key: any
  export const Share2: any
  export const Loader2: any
  export const Plus: any
  export const Calendar: any
  export const CheckCircle2: any
  export const Lightbulb: any
  export const BookOpen: any
  export const LogOut: any
  export const Wifi: any
  export const WifiOff: any
  export const Search: any
  export const History: any
  export const Moon: any
  export const Sun: any
  export const Download: any
  export const Edit2: any
  export const X: any
  const icons: Record<string, any>
  export default icons
}

declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any
  }
}

declare const process: {
  env: Record<string, string | undefined>
}

