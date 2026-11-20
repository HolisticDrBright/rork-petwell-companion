import { useCallback, useRef, useState } from "react";

/** A tap guard and visible failure state shared by explicit save actions. */
export function useSaveAction() {
  const inFlight = useRef(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const runSave = useCallback(async (action: () => Promise<void>) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setSaving(true);
    setSaveError(null);
    try { await action(); }
    catch { setSaveError("Couldn’t save. Your entry is still here. Check your connection and try again."); }
    finally { inFlight.current = false; setSaving(false); }
  }, []);
  return { saving, saveError, runSave };
}
