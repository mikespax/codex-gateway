<script setup lang="ts">
import { computed } from "vue";
import type { ThreadTimelineItem } from "~~/shared/types";
import { componentForThreadItem } from "@/utils/thread-item-registry";
import type { DisplayedTurnTiming } from "@/utils/turn-timing";

const props = defineProps<{
  item: ThreadTimelineItem;
  section?: "user" | "intermediate" | "final";
  hostId: number | null;
  threadId: string | null;
  userMessageVariant?: "normal" | "steer";
  turnTiming?: DisplayedTurnTiming | null;
  agentActionsAvailable?: boolean;
}>();

const itemComponent = computed(() => componentForThreadItem(props.item.type));
const itemPresentationProps = computed(() =>
  props.section === "intermediate" && props.item.type === "fileChange" ? { hideDetails: true } : {},
);
</script>

<template>
  <component
    :is="itemComponent"
    v-bind="itemPresentationProps"
    :item="item"
    :host-id="hostId"
    :thread-id="threadId"
    :variant="userMessageVariant"
    :turn-timing="item.type === 'agentMessage' ? turnTiming : undefined"
    :agent-actions-available="item.type === 'agentMessage' && agentActionsAvailable"
  />
</template>
