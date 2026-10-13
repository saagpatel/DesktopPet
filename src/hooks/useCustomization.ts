import { useCallback, useEffect, useState } from "react";
import { invokeMaybe, invokeOr } from "../lib/tauri";
import type { CustomizationLoadout } from "../store/types";

export function useCustomization() {
  const [loadouts, setLoadouts] = useState<CustomizationLoadout[]>([]);

  useEffect(() => {
    let cancelled = false;
    invokeOr<CustomizationLoadout[]>(
      "get_customization_loadouts",
      undefined,
      [],
    ).then((value) => {
      if (!cancelled) {
        setLoadouts(value);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const saveLoadout = useCallback(
    async (loadout: CustomizationLoadout) => {
      const updated = await invokeMaybe<CustomizationLoadout[]>(
        "save_customization_loadout",
        {
          loadout,
        },
      );
      if (!updated) return loadouts;
      setLoadouts(updated);
      return updated;
    },
    [loadouts],
  );

  const applyLoadout = useCallback(async (name: string) => {
    const applied = await invokeMaybe<CustomizationLoadout>(
      "apply_customization_loadout",
      {
        name,
      },
    );
    if (!applied) return null;
    return applied;
  }, []);

  return { loadouts, saveLoadout, applyLoadout };
}
