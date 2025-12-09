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
  ): [S, (value: S) => void]
  export function useEffect(
    effect: (...args: any[]) => void | (() => void),
    deps?: any[]
  ): void
  export * from 'react/jsx-runtime'
}

declare module 'lucide-react' {
  export const Share2: any
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

