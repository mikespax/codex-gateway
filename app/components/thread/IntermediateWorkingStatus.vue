<script setup lang="ts">
import { Loader } from "@codex-gateway/ai-elements/loader";
import TurnElapsedPill from "@/components/thread/TurnElapsedPill.vue";

const props = defineProps<{ startedAt: number | null }>();
const { t } = useI18n();
</script>

<template>
  <div
    data-testid="intermediate-working-status"
    class="flex max-w-4xl items-center gap-2 py-1 text-[0.9375rem] text-ink-muted"
    role="status"
    aria-live="polite"
  >
    <Loader class="size-4 shrink-0 text-primary" />
    <span>{{ t("app.working") }}</span>
    <TurnElapsedPill
      class="ml-auto"
      :started-at="props.startedAt"
      test-id="intermediate-working-duration"
    />
  </div>
</template>
