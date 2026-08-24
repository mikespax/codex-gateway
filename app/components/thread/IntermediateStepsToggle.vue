<script setup lang="ts">
import { ChevronDownIcon, ChevronRightIcon, ListTreeIcon } from "@lucide/vue";
import { Badge } from "@codex-gateway/ui/badge";

const props = defineProps<{
  open: boolean;
  count: number;
  preview?: string;
}>();

const emit = defineEmits<{
  toggle: [open: boolean];
}>();

const { t } = useI18n();
</script>

<template>
  <button
    type="button"
    class="flex w-full max-w-4xl items-center gap-2 rounded-md bg-canvas-soft px-3 py-2 text-left text-sm text-ink-secondary hover:bg-surface"
    :aria-expanded="open"
    :data-state="open ? 'open' : 'closed'"
    :data-testid="open ? 'intermediate-steps' : undefined"
    @click="emit('toggle', !props.open)"
  >
    <ChevronDownIcon v-if="open" class="size-4 shrink-0 text-ink-faint" />
    <ChevronRightIcon v-else class="size-4 shrink-0 text-ink-faint" />
    <ListTreeIcon class="size-4 shrink-0 text-ink-faint" />
    <span class="min-w-0 flex-1 truncate">{{ t("app.intermediateSteps") }}</span>
    <span v-if="props.preview" class="max-w-[min(45%,28rem)] truncate text-xs text-ink-faint">
      {{ props.preview }}
    </span>
    <Badge variant="outline">{{ count }}</Badge>
  </button>
</template>
