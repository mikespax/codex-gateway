<script setup lang="ts">
import { ChevronDownIcon, ChevronRightIcon, ChevronUpIcon, ListTreeIcon } from "@lucide/vue";
import { Badge } from "@codex-gateway/ui/badge";

const props = defineProps<{
  open: boolean;
  count: number;
  preview?: string;
  promptPreview?: string;
  footer?: boolean;
}>();

const emit = defineEmits<{
  toggle: [open: boolean];
}>();

const { t } = useI18n();
</script>

<template>
  <div class="w-full max-w-4xl space-y-2">
    <div
      v-if="!props.footer && props.promptPreview"
      data-testid="active-prompt-recall"
      class="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 md:hidden"
    >
      <div class="text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-primary">
        {{ t("app.latestRequest") }}
      </div>
      <p
        data-testid="active-prompt-recall-text"
        class="mt-0.5 line-clamp-2 text-xs leading-5 text-ink-secondary"
      >
        {{ props.promptPreview }}
      </p>
    </div>
    <button
      type="button"
      class="flex w-full items-start gap-2 rounded-md bg-canvas-soft px-3 py-2 text-left text-sm text-ink-secondary hover:bg-surface"
      :class="
        props.footer ? 'items-center justify-center border border-hairline bg-transparent' : ''
      "
      :aria-expanded="open"
      :data-state="open ? 'open' : 'closed'"
      :data-testid="open ? 'intermediate-steps' : undefined"
      @click="emit('toggle', !props.open)"
    >
      <ChevronUpIcon v-if="props.footer" class="size-4 shrink-0 text-ink-faint" />
      <ChevronDownIcon v-else-if="open" class="size-4 shrink-0 text-ink-faint" />
      <ChevronRightIcon v-else class="size-4 shrink-0 text-ink-faint" />
      <ListTreeIcon v-if="!props.footer" class="size-4 shrink-0 text-ink-faint" />
      <span v-if="props.footer" class="min-w-0 truncate">{{
        t("app.collapseIntermediateSteps")
      }}</span>
      <span v-else class="min-w-0 flex-1">
        <span class="block truncate font-medium">{{ t("app.intermediateSteps") }}</span>
        <span
          v-if="props.preview"
          data-testid="intermediate-steps-preview"
          class="mt-0.5 line-clamp-2 text-xs leading-4 text-ink-faint md:line-clamp-1"
        >
          {{ props.preview }}
        </span>
      </span>
      <Badge v-if="!props.footer" variant="outline">{{ count }}</Badge>
    </button>
  </div>
</template>
