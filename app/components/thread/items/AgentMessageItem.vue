<script setup lang="ts">
import type { ThreadHistoryItem } from "~~/shared/types";
import { computed } from "vue";
import { Message, MessageContent } from "@codex-gateway/ai-elements/message";
import MarkdownContent from "@/components/common/MarkdownContent.vue";
import AgentMessageActions from "@/components/thread/items/AgentMessageActions.vue";
import { isItemInProgress, threadItemText } from "@/utils/thread-items";
import type { DisplayedTurnTiming } from "@/utils/turn-timing";

const props = defineProps<{
  item: ThreadHistoryItem;
  turnTiming?: DisplayedTurnTiming | null;
  agentActionsAvailable?: boolean;
}>();

const text = computed(() => threadItemText(props.item));
const inProgress = computed(() => isItemInProgress(props.item));
const hasFooter = computed(
  () => Boolean(text.value) && props.turnTiming != null && props.agentActionsAvailable === true,
);
</script>

<template>
  <Message from="assistant" class="min-w-0 max-w-full lg:max-w-4xl">
    <MessageContent
      class="min-w-0 w-full gap-0 overflow-visible leading-8 text-ink"
      style="font-size: var(--chat-message-font-size, 0.9375rem)"
    >
      <MarkdownContent :content="text" :streaming="inProgress" />
      <AgentMessageActions v-if="hasFooter" :text="text" :turn-timing="turnTiming" />
    </MessageContent>
  </Message>
</template>
