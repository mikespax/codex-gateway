<script setup lang="ts">
import { ChevronDownIcon, SettingsIcon } from "@lucide/vue";
import { computed, nextTick, onMounted, ref } from "vue";
import { Button } from "@codex-gateway/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@codex-gateway/ui/dialog";
import SettingsPanel from "@/components/settings/SettingsPanel.vue";
import BrowserOpenDialog from "@/components/browser/BrowserOpenDialog.vue";
import { useLongPressContextMenu } from "@/composables/interactions/useLongPressContextMenu";
import { useWorkspaceLaunchActions } from "@/composables/workspace/useWorkspaceLaunchActions";
import { useGatewayCatalogStore } from "@/stores/gateway-catalog";
import { useGatewayNavigationStore } from "@/stores/gateway-navigation";
import { useGatewayThreadViewStore } from "@/stores/gateway-thread-view";
import AddProjectDialog from "./AddProjectDialog.vue";
import HostTree from "./host-tree/HostTree.vue";
import PinnedThreadList from "./thread-list/PinnedThreadList.vue";
import RecentThreadList from "./thread-list/RecentThreadList.vue";
import ThreadRenameDialog from "./thread-list/ThreadRenameDialog.vue";
import SidebarScrollArea from "./SidebarScrollArea.vue";
import { SidebarFooter } from "@codex-gateway/ui/sidebar";
import { useSidebarTree } from "./host-tree/useSidebarTree";
import { useThreadRename } from "./thread-list/useThreadRename";
import { useRecentThreadActivity } from "./thread-list/useRecentThreadActivity";
import SidebarWorkspaceToolbar from "./SidebarWorkspaceToolbar.vue";
import { useTmuxMonitorLauncher } from "@/composables/workspace/useTmuxMonitorLauncher";
import type { HostTreeController } from "./host-tree/controller";
import type { HostRecord, PinnedThreadRecord, ProjectRecord } from "./sidebar-types";
import { pinnedThreadKey } from "./sidebar-utils";

const PINNED_GROUPS_KEY = "codex-gateway-pinned-groups";
const SIDEBAR_SECTIONS_KEY = "codex-gateway-sidebar-sections";

const catalog = useGatewayCatalogStore();
const navigation = useGatewayNavigationStore();
const threadView = useGatewayThreadViewStore();
withDefaults(defineProps<{ workspaceToolbar?: boolean }>(), { workspaceToolbar: true });
const { t } = useI18n();
const showSettings = ref(false);
const showBrowserDialog = ref(false);
const projectEditor = ref<{ host: HostRecord; project: ProjectRecord | null } | null>(null);
const { longPressTriggered, longPressContextMenuHandlers } = useLongPressContextMenu();
const sidebarTree = useSidebarTree(longPressTriggered);
const threadRename = useThreadRename();
const recentActivity = useRecentThreadActivity();
const workspaceActions = useWorkspaceLaunchActions();
const tmuxLauncher = useTmuxMonitorLauncher();
const {
  hosts,
  pinnedThreads,
  selectedHostId,
  selectedThreadId,
  openPinnedThread,
  pinnedRuntimeStatus,
  pinnedCompletionAttention,
} = sidebarTree;
const { recentThreads } = recentActivity;
const { selectedHostTitle, canLaunch } = workspaceActions;
const { activeCount: tmuxActiveCount } = tmuxLauncher;
const inactivePinnedKeys = ref<Record<string, boolean>>({});
const activePinnedExpanded = ref(true);
const inactivePinnedExpanded = ref(false);
const recentChatsExpanded = ref(true);
const hostsExpanded = ref(true);
const activePinnedThreads = computed(() =>
  pinnedThreads.value.filter((thread) => !inactivePinnedKeys.value[pinnedThreadKey(thread)]),
);
const inactivePinnedThreads = computed(() =>
  pinnedThreads.value.filter((thread) => inactivePinnedKeys.value[pinnedThreadKey(thread)]),
);
const hostTreeController = computed<HostTreeController>(() => ({
  hosts: sidebarTree.hosts.value,
  availableProjectsByHost: sidebarTree.availableProjectsByHost.value,
  missingProjectsByHost: sidebarTree.missingProjectsByHost.value,
  projectThreads: sidebarTree.projectThreads.value,
  expandedHostIds: sidebarTree.expandedHostIds.value,
  expandedProjectIds: sidebarTree.expandedProjectIds.value,
  expandedMissingProjectHostIds: sidebarTree.expandedMissingProjectHostIds.value,
  selectedHostId: sidebarTree.selectedHostId.value,
  selectedProjectId: sidebarTree.selectedProjectId.value,
  selectedThreadId: sidebarTree.selectedThreadId.value,
  hostConnectionStatuses: sidebarTree.hostConnectionStatuses.value,
  longPressHandlers: longPressContextMenuHandlers,
  selectHost: sidebarTree.selectHost,
  addProject: openAddProject,
  deleteHost: catalog.deleteHost,
  monitorHost: openHostMonitor,
  selectProject: sidebarTree.selectProject,
  toggleMissingProjects: sidebarTree.toggleMissingProjects,
  editProject: openEditProject,
  deleteProject: catalog.deleteProject,
  startThreadInProject: sidebarTree.startThreadInProject,
  openThread: sidebarTree.openThread,
  toggleThreadPin: navigation.setThreadPinned,
  rename: threadRename.startRename,
  threadRuntimeStatus: sidebarTree.threadRuntimeStatus,
  threadCompletionAttention: sidebarTree.threadCompletionAttention,
}));

function persistSidebarSections() {
  localStorage.setItem(
    SIDEBAR_SECTIONS_KEY,
    JSON.stringify({
      activePinnedExpanded: activePinnedExpanded.value,
      inactivePinnedExpanded: inactivePinnedExpanded.value,
      recentChatsExpanded: recentChatsExpanded.value,
      hostsExpanded: hostsExpanded.value,
    }),
  );
}

function movePinnedThread(thread: PinnedThreadRecord, inactive: boolean) {
  const key = pinnedThreadKey(thread);
  if (inactive) inactivePinnedKeys.value = { ...inactivePinnedKeys.value, [key]: true };
  else {
    const next = { ...inactivePinnedKeys.value };
    delete next[key];
    inactivePinnedKeys.value = next;
  }
  localStorage.setItem(PINNED_GROUPS_KEY, JSON.stringify(inactivePinnedKeys.value));
}

onMounted(() => {
  try {
    inactivePinnedKeys.value = JSON.parse(localStorage.getItem(PINNED_GROUPS_KEY) ?? "{}") ?? {};
    const sections = JSON.parse(localStorage.getItem(SIDEBAR_SECTIONS_KEY) ?? "null");
    if (sections && typeof sections === "object") {
      if (typeof sections.activePinnedExpanded === "boolean") activePinnedExpanded.value = sections.activePinnedExpanded;
      if (typeof sections.inactivePinnedExpanded === "boolean") inactivePinnedExpanded.value = sections.inactivePinnedExpanded;
      if (typeof sections.recentChatsExpanded === "boolean") recentChatsExpanded.value = sections.recentChatsExpanded;
      if (typeof sections.hostsExpanded === "boolean") hostsExpanded.value = sections.hostsExpanded;
    }
  } catch {
    inactivePinnedKeys.value = {};
  }
});

defineOptions({
  inheritAttrs: false,
});

function openAddProject(host: HostRecord) {
  projectEditor.value = { host, project: null };
}

function openEditProject(project: ProjectRecord) {
  const host = hosts.value.find((item) => item.id === project.hostId);
  if (!host) {
    return;
  }
  projectEditor.value = { host, project };
}

async function openHostMonitor(hostId: number) {
  if (selectedHostId.value !== hostId) await catalog.selectHost(hostId);
  await nextTick();
  workspaceActions.openHostMonitor();
}
</script>

<template>
  <aside
    v-bind="$attrs"
    class="relative flex h-full min-h-0 flex-col border-r border-hairline bg-canvas-soft"
  >
    <SidebarWorkspaceToolbar
      v-if="workspaceToolbar"
      :title="selectedHostTitle"
      :can-launch="canLaunch"
      :tmux-active-count="tmuxActiveCount"
      @open-tmux="tmuxLauncher.open"
      @open-terminal="workspaceActions.openTerminal"
      @open-browser="showBrowserDialog = true"
      @open-host-monitor="workspaceActions.openHostMonitor"
      @new-thread="threadView.startThread()"
    />
    <div class="flex min-h-0 flex-1 overflow-hidden px-3 py-3">
      <SidebarScrollArea>
        <div class="min-w-0 max-w-full space-y-4 overflow-hidden pr-1">
          <section class="flex min-w-0 max-w-full flex-col overflow-hidden">
            <button
              class="flex h-8 w-full items-center justify-between gap-2 rounded px-2 pb-2 text-left text-sm text-ink-muted hover:bg-surface"
              :aria-expanded="activePinnedExpanded"
              @click="activePinnedExpanded = !activePinnedExpanded; persistSidebarSections()"
            >
              <span>Active <span class="text-xs text-ink-faint">({{ activePinnedThreads.length }})</span></span>
              <ChevronDownIcon class="size-4 transition-transform" :class="{ '-rotate-90': !activePinnedExpanded }" />
            </button>
            <PinnedThreadList
              v-if="activePinnedExpanded"
              :threads="activePinnedThreads"
              :hosts="hosts"
              :selected-host-id="selectedHostId"
              :selected-thread-id="selectedThreadId"
              :long-press-handlers="longPressContextMenuHandlers"
              :runtime-status="pinnedRuntimeStatus"
              :completion-attention="pinnedCompletionAttention"
              move-label="Move to Inactive"
              :show-header="false"
              @open="openPinnedThread"
              @unpin="navigation.setPinnedThread($event, false)"
              @move="movePinnedThread($event, true)"
              @rename="threadRename.startRename"
            />
          </section>

          <section class="flex min-w-0 max-w-full flex-col overflow-hidden">
            <button
              class="flex h-8 w-full items-center justify-between gap-2 rounded px-2 pb-2 text-left text-sm text-ink-muted hover:bg-surface"
              :aria-expanded="inactivePinnedExpanded"
              @click="inactivePinnedExpanded = !inactivePinnedExpanded; persistSidebarSections()"
            >
              <span>Inactive <span class="text-xs text-ink-faint">({{ inactivePinnedThreads.length }})</span></span>
              <ChevronDownIcon class="size-4 transition-transform" :class="{ '-rotate-90': !inactivePinnedExpanded }" />
            </button>
            <PinnedThreadList
              v-if="inactivePinnedExpanded"
              :threads="inactivePinnedThreads"
              :hosts="hosts"
              :selected-host-id="selectedHostId"
              :selected-thread-id="selectedThreadId"
              :long-press-handlers="longPressContextMenuHandlers"
              :runtime-status="pinnedRuntimeStatus"
              :completion-attention="pinnedCompletionAttention"
              move-label="Move to Active"
              :show-header="false"
              @open="openPinnedThread"
              @unpin="navigation.setPinnedThread($event, false)"
              @move="movePinnedThread($event, false)"
              @rename="threadRename.startRename"
            />
          </section>

          <RecentThreadList
            :threads="recentThreads"
            :selected-host-id="selectedHostId"
            :selected-thread-id="selectedThreadId"
            :long-press-handlers="longPressContextMenuHandlers"
            :expanded="recentChatsExpanded"
            @open="recentActivity.openRecentThread"
            @pin="recentActivity.pinRecentThread"
            @rename="threadRename.startRename"
            @toggle="recentChatsExpanded = !recentChatsExpanded; persistSidebarSections()"
          />

          <section class="flex min-w-0 max-w-full flex-col overflow-hidden">
            <button
              class="flex h-8 w-full items-center justify-between gap-2 rounded px-2 pb-2 text-left text-sm text-ink-muted hover:bg-surface"
              :aria-expanded="hostsExpanded"
              @click="hostsExpanded = !hostsExpanded; persistSidebarSections()"
            >
              <span>{{ $t("app.hosts") }}</span>
              <ChevronDownIcon class="size-4 transition-transform" :class="{ '-rotate-90': !hostsExpanded }" />
            </button>
            <HostTree v-if="hostsExpanded" :controller="hostTreeController" :show-header="false" />
          </section>
        </div>
      </SidebarScrollArea>
    </div>

    <SidebarFooter class="shrink-0 border-t border-hairline p-3">
      <Button
        data-testid="settings-toggle"
        variant="ghost"
        class="h-10 w-full justify-start gap-3 rounded-lg px-3 text-[0.9375rem] font-normal hover:bg-surface"
        @click="showSettings = !showSettings"
      >
        <SettingsIcon class="size-4" />
        {{ t("app.settings") }}
      </Button>
    </SidebarFooter>

    <BrowserOpenDialog
      v-if="workspaceToolbar"
      v-model:open="showBrowserDialog"
      :open-target="workspaceActions.openBrowser"
    />

    <Dialog v-model:open="showSettings">
      <DialogContent
        class="flex h-[min(54rem,calc(100vh-3rem))] w-[min(70rem,calc(100vw-3rem))] !max-w-[min(70rem,calc(100vw-3rem))] flex-col overflow-hidden p-0"
        data-testid="settings-dialog"
        close-button-test-id="settings-close-button"
      >
        <DialogHeader class="border-b border-hairline px-6 py-5">
          <DialogTitle class="text-lg">{{ t("app.settings") }}</DialogTitle>
          <DialogDescription>{{ t("app.settingsDescription") }}</DialogDescription>
        </DialogHeader>
        <div class="flex min-h-0 flex-1 overflow-hidden">
          <SettingsPanel @close="showSettings = false" />
        </div>
      </DialogContent>
    </Dialog>

    <AddProjectDialog
      :open="Boolean(projectEditor)"
      :host="projectEditor?.host ?? null"
      :project="projectEditor?.project ?? null"
      @update:open="projectEditor = $event ? projectEditor : null"
    />

    <!-- Rename is a single modal workflow for desktop context-click and mobile long-press. Keep
         it outside row renderers: context menus unmount after selection, and an inline input inside
         that subtree loses focus or disappears when a mobile sidebar Sheet updates. -->
    <ThreadRenameDialog
      v-model:open="threadRename.open.value"
      v-model="threadRename.renameValue.value"
      :submitting="threadRename.submitting.value"
      @submit="threadRename.submitRename"
    />
  </aside>
</template>
