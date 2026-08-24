<script setup lang="ts">
import { ActivityIcon, ChartNoAxesCombinedIcon, GlobeIcon, PlusIcon, TerminalIcon } from "@lucide/vue";
import { Button } from "@codex-gateway/ui/button";
import { SidebarTrigger } from "@codex-gateway/ui/sidebar";

defineProps<{ title: string; canLaunch: boolean; tmuxActiveCount: number }>();
const emit = defineEmits<{
  openTerminal: [];
  openBrowser: [];
  openTmux: [];
  openHostMonitor: [];
  newThread: [];
}>();
</script>

<template>
  <div class="flex h-11 shrink-0 items-center gap-1 border-b border-hairline px-3">
    <span class="min-w-0 flex-1 truncate text-sm font-semibold" :title="title">{{ title }}</span>
    <Button
      data-testid="open-tmux-button"
      variant="ghost"
      size="icon"
      class="relative size-8 shrink-0"
      :disabled="!canLaunch"
      :title="$t('app.openTmuxMonitor')"
      :aria-label="$t('app.openTmuxMonitor')"
      @click="emit('openTmux')"
    >
      <ActivityIcon class="size-4" />
      <span
        v-if="tmuxActiveCount"
        class="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[0.625rem] font-semibold leading-4 text-primary-foreground"
      >
        {{ tmuxActiveCount }}
      </span>
    </Button>
    <Button
      data-testid="open-host-monitor-button"
      variant="ghost"
      size="icon"
      class="size-8 shrink-0"
      :disabled="!canLaunch"
      :title="$t('app.openHostMonitor')"
      :aria-label="$t('app.openHostMonitor')"
      @click="emit('openHostMonitor')"
    >
      <ChartNoAxesCombinedIcon class="size-4" />
    </Button>
    <Button
      data-testid="open-terminal-button"
      variant="ghost"
      size="icon"
      class="size-8 shrink-0"
      :disabled="!canLaunch"
      :title="$t('app.openTerminal')"
      :aria-label="$t('app.openTerminal')"
      @click="emit('openTerminal')"
    >
      <TerminalIcon class="size-4" />
    </Button>
    <Button
      data-testid="open-browser-button"
      variant="ghost"
      size="icon"
      class="size-8 shrink-0"
      :disabled="!canLaunch"
      :title="$t('app.openBrowser')"
      :aria-label="$t('app.openBrowser')"
      @click="emit('openBrowser')"
    >
      <GlobeIcon class="size-4" />
    </Button>
    <Button
      data-testid="new-thread-button"
      variant="ghost"
      size="icon"
      class="size-8 shrink-0"
      :disabled="!canLaunch"
      :title="$t('app.newThread')"
      :aria-label="$t('app.newThread')"
      @click="emit('newThread')"
    >
      <PlusIcon class="size-4" />
    </Button>
    <SidebarTrigger
      data-testid="desktop-sidebar-collapse"
      class="size-8 shrink-0"
      :title="$t('app.hideSidebar')"
      :aria-label="$t('app.hideSidebar')"
    />
  </div>
</template>
