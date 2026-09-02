<script setup lang="ts">
import ThreadRow from "./ThreadRow.vue";
import { formatRelative, pinnedThreadId, pinnedThreadKey } from "../sidebar-utils";
import type { HostRecord, PinnedThreadRecord } from "../sidebar-types";
import type { ThreadRuntimeStatus } from "@/stores/gateway/types";

const props = defineProps<{
  threads: PinnedThreadRecord[];
  hosts: HostRecord[];
  selectedHostId: number | null;
  selectedThreadId: string | null;
  longPressHandlers?: Record<string, unknown>;
  runtimeStatus: (thread: PinnedThreadRecord) => ThreadRuntimeStatus;
  completionAttention: (thread: PinnedThreadRecord) => boolean;
  resourceUsageForHost?: (hostId: number) => string | null;
  headerLabel?: string;
  showHeader?: boolean;
  moveLabel?: string;
}>();

const emit = defineEmits<{
  open: [thread: PinnedThreadRecord];
  unpin: [thread: PinnedThreadRecord];
  rename: [thread: PinnedThreadRecord];
  move: [thread: PinnedThreadRecord];
}>();

function subtitleForPinnedThread(thread: PinnedThreadRecord) {
  const hostName = props.hosts.find((host) => host.id === thread.hostId)?.name;
  return hostName || formatRelative(thread.updatedAt);
}

function isSelectedPinnedThread(thread: PinnedThreadRecord) {
  return (
    pinnedThreadId(thread) === String(props.selectedThreadId) &&
    thread.hostId === props.selectedHostId
  );
}
</script>

<template>
  <section class="flex min-w-0 max-w-full flex-col overflow-hidden">
    <div
      v-if="props.showHeader !== false"
      class="flex h-8 items-center justify-between gap-2 px-2 pb-2 text-sm text-ink-muted"
    >
      <span>{{ props.headerLabel ?? $t("app.pinned") }}</span>
      <slot name="header-action" />
    </div>
    <div v-if="threads.length" class="space-y-1">
      <ThreadRow
        v-for="thread in threads"
        :key="pinnedThreadKey(thread)"
        :thread="thread"
        :test-id="`pinned-thread-button-${pinnedThreadId(thread)}`"
        :selected="isSelectedPinnedThread(thread)"
        :status="runtimeStatus(thread)"
        :completion-attention="completionAttention(thread)"
        :subtitle="subtitleForPinnedThread(thread) || formatRelative(thread.updatedAt)"
        :resource-usage="props.resourceUsageForHost?.(thread.hostId)"
        :pin-label="$t('app.unpinThread')"
        :move-label="props.moveLabel"
        :long-press-handlers="longPressHandlers"
        show-pinned-icon
        @open="emit('open', thread)"
        @toggle-pin="emit('unpin', thread)"
        @move="emit('move', thread)"
        @rename="emit('rename', thread)"
      />
    </div>
  </section>
</template>
