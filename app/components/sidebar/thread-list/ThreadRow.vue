<script setup lang="ts">
import { StarIcon } from "@lucide/vue";
import { computed } from "vue";
import { Button } from "@codex-gateway/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@codex-gateway/ui/context-menu";
import type { ThreadRuntimeStatus } from "@/stores/gateway/types";
import { titleForThread } from "@/stores/gateway/thread-utils/identity";
import { selectedRowClass } from "../sidebar-utils";
import SidebarRowLabel from "../SidebarRowLabel.vue";
import ThreadStatusIndicator from "./ThreadStatusIndicator.vue";
import type { SidebarThreadRow } from "../sidebar-types";

const props = defineProps<{
  thread: SidebarThreadRow;
  testId: string;
  selected: boolean;
  status: ThreadRuntimeStatus;
  completionAttention?: boolean;
  subtitle?: string;
  pinLabel: string;
  moveLabel?: string;
  showPinnedIcon?: boolean;
  longPressHandlers?: Record<string, unknown>;
}>();

const emit = defineEmits<{
  open: [];
  togglePin: [];
  move: [];
  rename: [];
}>();

const pressHandlers = computed(() => props.longPressHandlers ?? {});
</script>

<template>
  <ContextMenu>
    <ContextMenuTrigger as-child>
      <Button
        :data-testid="testId"
        v-bind="pressHandlers"
        :data-selected="selected ? 'true' : 'false'"
        variant="ghost"
        class="h-auto min-h-9 w-full min-w-0 justify-start overflow-hidden rounded-lg px-3 py-2 text-sm font-normal hover:bg-surface"
        :class="selectedRowClass(selected)"
        @click="emit('open')"
      >
        <SidebarRowLabel :title="titleForThread(thread)" :subtitle="subtitle">
          <template #title-prefix>
            <StarIcon
              v-if="showPinnedIcon"
              class="size-3.5 shrink-0 fill-current text-accent-orange"
            />
          </template>
          <template #trailing>
            <ThreadStatusIndicator :status="status" :completion-attention="completionAttention" />
          </template>
        </SidebarRowLabel>
      </Button>
    </ContextMenuTrigger>
    <ContextMenuContent :collision-padding="12" prioritize-position class="w-40">
      <ContextMenuItem @select="emit('togglePin')">
        {{ pinLabel }}
      </ContextMenuItem>
      <ContextMenuItem v-if="moveLabel" @select="emit('move')">
        {{ moveLabel }}
      </ContextMenuItem>
      <ContextMenuItem @select="emit('rename')">
        {{ $t("app.renameThread") }}
      </ContextMenuItem>
    </ContextMenuContent>
  </ContextMenu>
</template>
