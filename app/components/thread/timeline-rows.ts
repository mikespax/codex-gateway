import type { ThreadTimelineItem, ThreadTimelineTurn } from "~~/shared/types";
import type { DisplayedTurnTiming } from "@/utils/turn-timing";
import { threadItemText } from "@/utils/thread-items";
import { itemKey, userMessageVariant, type ThreadTurnSections } from "./thread-turn-sections";
import { commandDisplayLabel } from "@/utils/thread-item-display";

export type { ThreadTimelineTurn } from "~~/shared/types";

type ThreadTimelineItemSection = "user" | "intermediate" | "final";

const estimatedItemHeights: Partial<Record<ThreadTimelineItem["type"], number>> = {
  commandExecution: 48,
  fileChange: 48,
  agentMessage: 144,
  reasoning: 128,
  userMessage: 160,
};

export type ThreadTimelineRow =
  | {
      key: string;
      type: "intermediateHeader";
      turnId: string;
      count: number;
      open: boolean;
      preview: string;
      promptPreview?: string;
      footer?: boolean;
    }
  | {
      key: string;
      type: "item";
      turnId: string;
      section: ThreadTimelineItemSection;
      item: ThreadTimelineItem;
      userMessageVariant: "normal" | "steer";
      turnTiming: DisplayedTurnTiming | null;
      agentActionsAvailable: boolean;
    }
  | {
      key: string;
      type: "turnDuration";
      turnId: string;
      startedAt: number | null;
      completedAt: number | null;
      durationMs: number | null;
      active: boolean;
    }
  | {
      key: string;
      type: "workingStatus";
      turnId: string;
    };

export interface ThreadTimelineTurnState {
  turn: ThreadTimelineTurn;
  sections: ThreadTurnSections;
  intermediateOpen: boolean;
}

// Every visible entry is a direct row of the Agent timeline. Do not wrap intermediate items in a
// second virtualizer: two height caches sharing one scroll element can leave stale blank space on
// WebKit. Collapsing is represented only by omitting intermediate item rows from this flat model.
export function buildThreadTimelineRows(input: {
  threadId: string | null;
  turns: ThreadTimelineTurnState[];
  agentActionsAvailable: boolean;
}) {
  return input.turns.flatMap(({ turn, sections, intermediateOpen }) => {
    const rows: ThreadTimelineRow[] = [];
    const timing = displayedTurnTiming(turn);
    const timingTarget = sections.finalItems.findLast((item) => item.type === "agentMessage");
    appendItemRows(rows, input.threadId, turn.id, "user", sections.userItems, sections);

    const intermediatePresentation = presentIntermediateItems(sections);
    if (intermediatePresentation.count) {
      rows.push({
        key: `${input.threadId}:turn-${turn.id}:intermediate-header`,
        type: "intermediateHeader",
        turnId: turn.id,
        count: intermediatePresentation.count,
        open: intermediateOpen,
        preview: intermediatePreview(intermediatePresentation.items),
        promptPreview: sections.turnIsActive ? latestUserPromptPreview(sections.items) : undefined,
      });
      if (intermediateOpen) {
        appendItemRows(
          rows,
          input.threadId,
          turn.id,
          "intermediate",
          intermediatePresentation.items,
          sections,
        );
        if (intermediatePresentation.showWorkingStatus) {
          rows.push({
            key: `${input.threadId}:turn-${turn.id}:working-status`,
            type: "workingStatus",
            turnId: turn.id,
          });
        }
        rows.push({
          key: `${input.threadId}:turn-${turn.id}:intermediate-footer`,
          type: "intermediateHeader",
          turnId: turn.id,
          count: intermediatePresentation.count,
          open: true,
          preview: "",
          footer: true,
        });
      }
    }

    appendItemRows(
      rows,
      input.threadId,
      turn.id,
      "final",
      sections.finalItems,
      sections,
      timingTarget,
      timing,
      input.agentActionsAvailable,
    );
    // Completed turns normally render timing beside the final answer's copy action. Keep a
    // standalone row only for interrupted/error turns that never produced an Agent answer.
    if (input.agentActionsAvailable && hasTimingValue(timing) && timingTarget === undefined) {
      rows.push({
        key: `${input.threadId}:turn-${turn.id}:duration`,
        type: "turnDuration",
        turnId: turn.id,
        ...timing,
      });
    }
    return rows;
  });
}

export function reuseUnchangedTimelineRows(
  previous: ThreadTimelineRow[] | undefined,
  next: ThreadTimelineRow[],
) {
  if (previous === undefined || previous.length === 0) return next;
  const previousByKey = new Map(previous.map((row) => [row.key, row]));
  return next.map((row) => {
    const candidate = previousByKey.get(row.key);
    return candidate !== undefined && sameTimelineRow(candidate, row) ? candidate : row;
  });
}

export function estimateThreadTimelineRow(row: ThreadTimelineRow | undefined) {
  if (row === undefined) return 96;
  if (row.type === "intermediateHeader") {
    return row.promptPreview !== undefined && row.promptPreview !== "" ? 136 : 72;
  }
  if (row.type === "turnDuration") return 28;
  if (row.type === "workingStatus") return 36;
  return estimatedItemHeights[row.item.type] ?? 96;
}

function presentIntermediateItems(sections: ThreadTurnSections) {
  if (!sections.turnIsActive) {
    return {
      items: sections.intermediateItems,
      count: sections.intermediateItems.length,
      showWorkingStatus: false,
    };
  }

  const items = sections.intermediateItems.filter((item) => !isRoutineLiveActivity(item));
  const showWorkingStatus = items.length !== sections.intermediateItems.length;
  return {
    items,
    count: items.length + (showWorkingStatus ? 1 : 0),
    showWorkingStatus,
  };
}

function isRoutineLiveActivity(item: ThreadTimelineItem) {
  if (item.type === "commandExecution") {
    return item.pendingApproval == null;
  }
  if (item.type === "reasoning") {
    return threadItemText(item).trim() === "";
  }
  return false;
}

function intermediatePreview(items: ThreadTimelineItem[]) {
  return items
    .slice(-2)
    .map(intermediateItemPreview)
    .filter((value, index, values) => value !== "" && values.indexOf(value) === index)
    .join(" · ")
    .slice(0, 240);
}

function intermediateItemPreview(item: ThreadTimelineItem) {
  if (item.type === "commandExecution") {
    return commandDisplayLabel(item.command).replace(/\s+/g, " ");
  }
  if (item.type === "reasoning") {
    return threadItemText(item).replace(/\s+/g, " ").trim() || "Thinking…";
  }
  if (item.type === "webSearch") {
    return typeof item.query === "string" && item.query.trim() !== ""
      ? item.query.replace(/\s+/g, " ").trim()
      : "Web search";
  }
  const text = "text" in item && typeof item.text === "string" ? item.text : "";
  return text.replace(/\s+/g, " ").trim() || item.type;
}

function latestUserPromptPreview(items: ThreadTimelineItem[]) {
  const userMessage = items.findLast((item) => item.type === "userMessage");
  if (!userMessage) return undefined;
  const text = threadItemText(userMessage).replace(/\s+/g, " ").trim();
  if (!text) return undefined;
  return text.length > 220 ? `${text.slice(0, 219).trimEnd()}…` : text;
}

function appendItemRows(
  rows: ThreadTimelineRow[],
  threadId: string | null,
  turnId: string,
  section: ThreadTimelineItemSection,
  items: ThreadTimelineItem[],
  sections: ThreadTurnSections,
  timingTarget?: ThreadTimelineItem,
  timing: DisplayedTurnTiming | null = null,
  agentActionsAvailable = false,
) {
  items.forEach((item, index) => {
    rows.push({
      key: `${threadId}:turn-${turnId}:${section}:${itemKey(item, section, index)}`,
      type: "item",
      turnId,
      section,
      item,
      userMessageVariant: userMessageVariant(item, sections),
      turnTiming: item === timingTarget ? timing : null,
      agentActionsAvailable: item === timingTarget && agentActionsAvailable,
    });
  });
}

function displayedTurnTiming(turn: ThreadTimelineTurn): DisplayedTurnTiming {
  return {
    startedAt: typeof turn.startedAt === "number" ? turn.startedAt : null,
    completedAt: typeof turn.completedAt === "number" ? turn.completedAt : null,
    durationMs: turn.durationMs ?? null,
    active: turn.status === "inProgress",
  };
}

function hasTimingValue(timing: DisplayedTurnTiming) {
  return timing.startedAt !== null || timing.durationMs !== null;
}

function sameTimelineRow(left: ThreadTimelineRow, right: ThreadTimelineRow) {
  if (left.type !== right.type) return false;
  if (left.type === "intermediateHeader" && right.type === "intermediateHeader") {
    return (
      left.count === right.count &&
      left.open === right.open &&
      left.preview === right.preview &&
      left.promptPreview === right.promptPreview &&
      left.footer === right.footer &&
      left.turnId === right.turnId
    );
  }
  if (left.type === "item" && right.type === "item") {
    // App-server deltas mutate this reactive item proxy in place. Reuse the lightweight row wrapper
    // so unrelated mounted Markdown rows do not rerender, but never clone or mark the item raw:
    // nested text/output reactivity is the official Vue update path that feeds TanStack's row
    // ResizeObserver. A separate presentation revision would duplicate timeline state.
    return (
      left.item === right.item &&
      left.turnId === right.turnId &&
      left.section === right.section &&
      left.userMessageVariant === right.userMessageVariant &&
      left.agentActionsAvailable === right.agentActionsAvailable &&
      sameTurnTiming(left.turnTiming, right.turnTiming)
    );
  }
  if (left.type === "turnDuration" && right.type === "turnDuration") {
    return (
      left.turnId === right.turnId &&
      left.startedAt === right.startedAt &&
      left.completedAt === right.completedAt &&
      left.durationMs === right.durationMs &&
      left.active === right.active
    );
  }
  if (left.type === "workingStatus" && right.type === "workingStatus") {
    return left.turnId === right.turnId;
  }
  return false;
}

function sameTurnTiming(left: DisplayedTurnTiming | null, right: DisplayedTurnTiming | null) {
  if (left === null || right === null) return left === right;
  return (
    left.startedAt === right.startedAt &&
    left.completedAt === right.completedAt &&
    left.durationMs === right.durationMs &&
    left.active === right.active
  );
}
