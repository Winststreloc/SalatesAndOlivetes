// Minimal shims to satisfy TS when type packages are absent.

declare module 'react/jsx-runtime' {
  export const jsx: any
  export const jsxs: any
  export const Fragment: any
}

declare module 'react' {
  const React: any
  export default React
  export as namespace React
  export function useState<S = any>(initialState?: S): [S, (value: S | ((prev: S) => S)) => void]
  export function useEffect(effect: (...args: any[]) => void | (() => void), deps?: any[]): void
  export function useMemo<T = any>(factory: () => T, deps?: any[]): T
  export function useRef<T = any>(initialValue?: T): { current: T }
  export function useCallback<T extends (...args: any[]) => any>(cb: T, deps?: any[]): T
  export type ReactNode = any
  export type ComponentProps<T = any> = any
  export type ChangeEvent<T = any> = any
  export function forwardRef<T = any, P = any>(render: (props: P, ref: any) => any): any
  export namespace React {
    export type FormEvent<T = any> = any
    export type ChangeEvent<T = any> = any
  }
  export namespace JSX {
    interface IntrinsicElements {
      [elem: string]: any
    }
  }
  export * from 'react/jsx-runtime'
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any
    }
  }
}
// Minimal shims to satisfy TS when type packages are absent.

declare module 'react/jsx-runtime' {
  export const jsx: any
  export const jsxs: any
  export const Fragment: any
}

declare module 'react' {
  const React: any
  export default React
  export function useState<S = any>(initialState?: S): [S, (value: S | ((prev: S) => S)) => void]
  export function useEffect(effect: (...args: any[]) => void | (() => void), deps?: any[]): void
  export function useMemo<T = any>(factory: () => T, deps?: any[]): T
  export function useRef<T = any>(initialValue?: T): { current: T }
  export function useCallback<T extends (...args: any[]) => any>(cb: T, deps?: any[]): T
  export namespace JSX {
    interface IntrinsicElements {
      [elem: string]: any
    }
  }
  export type ReactNode = any
  export type ComponentProps<T = any> = any
  export type ChangeEvent<T = any> = any
  export function forwardRef<T = any, P = any>(render: (props: P, ref: any) => any): any
  export namespace React {
    export type FormEvent<T = any> = any
    export type ChangeEvent<T = any> = any
  }
  export * from 'react/jsx-runtime'
}

