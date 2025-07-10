declare module 'animejs' {
  // Minimal typings for v4 usage we need
  export function animate(targets: any, params: any): any;
  export const utils: {
    set(targets: any, props: any): void;
    // allow other utils to be indexable without strict typing
    [key: string]: any;
  };
} 