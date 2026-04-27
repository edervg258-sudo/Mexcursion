export {};

declare module 'react' {
  interface HTMLAttributes<T> {
    testID?: string;
    onPress?: (...args: unknown[]) => unknown;
  }
  interface SVGProps<T> {
    testID?: string;
  }
}
