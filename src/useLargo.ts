import { useSyncExternalStore } from "react";

const LARGO = "(min-width: 960px)";

/** Verdadeiro quando a tela comporta a lista e o mapa lado a lado. */
export function useLargo() {
  return useSyncExternalStore(
    (avisar) => {
      const m = matchMedia(LARGO);
      m.addEventListener("change", avisar);
      return () => m.removeEventListener("change", avisar);
    },
    () => matchMedia(LARGO).matches,
  );
}
