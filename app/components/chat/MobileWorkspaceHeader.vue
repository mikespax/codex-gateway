<script setup lang="ts">
import { ActivityIcon, ChartNoAxesCombinedIcon, GlobeIcon, TerminalIcon } from "@lucide/vue";
import { Button } from "@codex-gateway/ui/button";
import CodexUsageBadge from "@/components/chat/CodexUsageBadge.vue";

defineProps<{
  hostId: number | null;
  canOpenTerminal: boolean;
  tmuxActiveCount: number;
}>();

const emit = defineEmits<{
  openTerminal: [];
  openBrowser: [];
  openTmux: [];
  openHostMonitor: [];
}>();
</script>

<template>
  <header
    class="flex min-h-14 shrink-0 items-center gap-2 border-b border-hairline bg-surface/95 px-3 pt-[env(safe-area-inset-top)] backdrop-blur"
  >
    <div class="flex min-w-0 basis-[34vw] flex-none items-center gap-2 overflow-hidden">
      <slot name="start" />
    </div>
    <div class="relative z-10 ml-auto flex min-w-0 flex-1 items-center justify-end gap-2">
      <CodexUsageBadge :host-id="hostId" />
      <Button
        data-testid="open-tmux-mobile-button"
        variant="ghost"
        size="sm"
        class="relative h-8 shrink-0 rounded-md px-2 text-ink-muted hover:bg-canvas-soft hover:text-ink"
        :disabled="!canOpenTerminal"
        :aria-label="$t('app.openTmuxMonitor')"
        @click="emit('openTmux')"
      >
        <ActivityIcon class="size-4" />
        <span
          v-if="tmuxActiveCount"
          class="absolute -right-1 -top-1 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[0.625rem] font-semibold leading-4 text-primary-foreground"
        >
          {{ tmuxActiveCount }}
        </span>
      </Button>
      <Button
        data-testid="open-host-monitor-mobile-button"
        variant="ghost"
        size="sm"
        class="h-8 shrink-0 rounded-md px-2 text-ink-muted hover:bg-canvas-soft hover:text-ink"
        :disabled="!canOpenTerminal"
        :aria-label="$t('app.openHostMonitor')"
        @click="emit('openHostMonitor')"
      >
        <ChartNoAxesCombinedIcon class="size-4" />
      </Button>
      <Button
        data-testid="open-browser-mobile-button"
        variant="ghost"
        size="sm"
        class="h-8 shrink-0 rounded-md px-2 text-ink-muted hover:bg-canvas-soft hover:text-ink"
        :disabled="!canOpenTerminal"
        :aria-label="$t('app.openBrowser')"
        @click="emit('openBrowser')"
      >
        <GlobeIcon class="size-4" />
      </Button>
      <Button
        data-testid="open-terminal-mobile-button"
        variant="ghost"
        size="sm"
        class="h-8 shrink-0 rounded-md px-2 text-ink-muted hover:bg-canvas-soft hover:text-ink"
        :disabled="!canOpenTerminal"
        :aria-label="$t('app.openTerminal')"
        @click="emit('openTerminal')"
      >
        <TerminalIcon class="size-4" />
      </Button>
    </div>
  </header>
</template>
