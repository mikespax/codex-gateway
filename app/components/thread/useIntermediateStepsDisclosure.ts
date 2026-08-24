import { reactive, watch, type ComputedRef } from "vue";
import { itemStatusSignature, statusValue } from "./thread-turn-sections";
import type { ThreadTimelineItem } from "~~/shared/types";

interface IntermediateDisclosureTurn {
  id: string;
  status: unknown;
  items: ThreadTimelineItem[];
  turnIsActive: boolean;
}

export function useIntermediateStepsDisclosure(input: {
  turns: ComputedRef<IntermediateDisclosureTurn[]>;
  threadIsRunning: ComputedRef<boolean>;
  autoCollapseIntermediate: ComputedRef<boolean>;
}) {
  // Disclosure state belongs to the timeline, not to virtual row components. Rows are destroyed
  // offscreen, so keeping this small per-turn map here preserves explicit user choices without
  // coupling expansion to virtualizer measurements or a global store.
  const openByTurnId = reactive(new Map<string, boolean>());
  const touchedByUser = new Set<string>();

  watch(
    () => [
      input.threadIsRunning.value,
      input.autoCollapseIntermediate.value,
      ...input.turns.value.flatMap((turn) => [
        turn.id,
        statusValue(turn.status),
        ...itemStatusSignature(turn.items),
      ]),
    ],
    () => {
      const liveTurnIds = new Set(input.turns.value.map((turn) => turn.id));
      for (const turnId of openByTurnId.keys()) {
        if (!liveTurnIds.has(turnId)) {
          openByTurnId.delete(turnId);
          touchedByUser.delete(turnId);
        }
      }

      for (const turn of input.turns.value) {
        // Keep active intermediate work compact by default. The header shows the count and the
        // latest action; users can expand it when they need the full live trace. Preserve an
        // explicit open/closed choice while the turn continues streaming.
        if (input.threadIsRunning.value && turn.turnIsActive) {
          if (!openByTurnId.has(turn.id)) openByTurnId.set(turn.id, false);
          continue;
        }
        if (input.autoCollapseIntermediate.value && !touchedByUser.has(turn.id)) {
          openByTurnId.set(turn.id, false);
        } else if (!openByTurnId.has(turn.id)) {
          openByTurnId.set(turn.id, false);
        }
      }
    },
    { immediate: true },
  );

  function isIntermediateOpen(turnId: string) {
    return openByTurnId.get(turnId) ?? false;
  }

  function setIntermediateOpen(turnId: string, open: boolean) {
    touchedByUser.add(turnId);
    openByTurnId.set(turnId, open);
  }

  return {
    isIntermediateOpen,
    setIntermediateOpen,
  };
}
