import { useEffect, useRef } from "react";

/**
 * Returns a stable ref whose `.current` is `true` while the component is
 * mounted and `false` after unmount. Use it to guard `setState` calls that
 * run inside async callbacks (mutations, promises, timers) to avoid the
 * React warning "Can't perform a React state update on a component that
 * hasn't mounted yet" during rapid navigation.
 *
 * @example
 * const mounted = useIsMounted();
 * mutation.mutateAsync().then(() => {
 *   if (!mounted.current) return;
 *   setOpen(false);
 * });
 */
export function useIsMounted() {
  const ref = useRef(true);
  useEffect(() => {
    ref.current = true;
    return () => {
      ref.current = false;
    };
  }, []);
  return ref;
}
