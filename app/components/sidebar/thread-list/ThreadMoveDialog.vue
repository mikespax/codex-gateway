<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { HostRecord, ProjectRecord } from "~~/shared/types";
import { Button } from "@codex-gateway/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@codex-gateway/ui/dialog";
import { Input } from "@codex-gateway/ui/input";
import { Label } from "@codex-gateway/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@codex-gateway/ui/select";

const props = defineProps<{
  open: boolean;
  sourceHostId: number;
  sourceTitle: string;
  sourceCwd: string | null;
  hosts: HostRecord[];
  projects: ProjectRecord[];
  submitting: boolean;
  error?: string;
}>();

const emit = defineEmits<{
  "update:open": [open: boolean];
  submit: [
    input: { targetHostId: number; targetProjectId: number | null; targetCwd: string | null },
  ];
}>();

const targetHostId = ref<number | null>(null);
const targetProjectId = ref<number | null>(null);
const targetProjectChoice = ref<"custom" | "preset" | string>("custom");
const targetCwd = ref("");
const targetHosts = computed(() => props.hosts.filter((host) => host.id !== props.sourceHostId));
const targetHost = computed(() => props.hosts.find((host) => host.id === targetHostId.value));
const targetProjects = computed(() =>
  props.projects.filter((project) => project.hostId === targetHostId.value),
);
const recommendedTargetPath = computed(() => presetPathForHost(targetHost.value));
const targetProjectSelectValue = computed(() =>
  targetProjectId.value === null ? targetProjectChoice.value : String(targetProjectId.value),
);
const canSubmit = computed(
  () =>
    !props.submitting &&
    targetHostId.value !== null &&
    (targetProjectId.value !== null || targetCwd.value.trim() !== ""),
);

watch(
  () => props.open,
  (open) => {
    if (open) reset();
  },
);

watch(targetHostId, () => {
  configureTarget();
});

function selectProject(value: string | undefined) {
  if (value === undefined || value === "custom") {
    targetProjectId.value = null;
    targetProjectChoice.value = "custom";
    if (targetCwd.value.trim() === "") targetCwd.value = props.sourceCwd ?? "";
    return;
  }

  if (value === "preset") {
    targetProjectId.value = null;
    targetProjectChoice.value = "preset";
    targetCwd.value = recommendedTargetPath.value ?? props.sourceCwd ?? "";
    return;
  }

  const projectId = Number(value);
  if (!Number.isInteger(projectId)) return;
  targetProjectId.value = projectId;
  targetProjectChoice.value = value;
  const project = targetProjects.value.find((candidate) => candidate.id === projectId);
  if (project !== undefined) targetCwd.value = project.remotePath;
}

function reset() {
  const firstHost = targetHosts.value[0];
  targetHostId.value = firstHost?.id ?? null;
  configureTarget(firstHost);
}

function configureTarget(host = targetHost.value) {
  const firstProject = host
    ? props.projects.find((project) => project.hostId === host.id)
    : undefined;
  if (firstProject !== undefined) {
    targetProjectId.value = firstProject.id;
    targetProjectChoice.value = String(firstProject.id);
    targetCwd.value = firstProject.remotePath;
    return;
  }

  targetProjectId.value = null;
  const presetPath = presetPathForHost(host);
  targetProjectChoice.value = presetPath === null ? "custom" : "preset";
  targetCwd.value = presetPath ?? props.sourceCwd ?? "";
}

function presetPathForHost(host: HostRecord | undefined): string | null {
  if (host === undefined) return null;
  const name = host.name
    .trim()
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, " ");
  if (name.includes("lenovo")) return "/root/.codex";
  if (name.includes("mac")) return "/Users/Sparks/.codex";
  if (name.includes("vps") || name.includes("contabo")) return "/root";
  return null;
}

function submit() {
  if (!canSubmit.value || targetHostId.value === null) return;
  emit("submit", {
    targetHostId: targetHostId.value,
    targetProjectId: targetProjectId.value,
    targetCwd: targetCwd.value.trim() || null,
  });
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent data-testid="move-thread-dialog" class="sm:max-w-lg">
      <form class="grid gap-4" @submit.prevent="submit">
        <DialogHeader>
          <DialogTitle>{{ $t("app.moveThreadTitle") }}</DialogTitle>
          <DialogDescription>
            {{ $t("app.moveThreadDescription", { title: sourceTitle }) }}
          </DialogDescription>
        </DialogHeader>

        <div class="grid gap-2">
          <Label for="move-thread-host">{{ $t("app.moveThreadTargetHost") }}</Label>
          <Select
            :model-value="targetHostId === null ? undefined : String(targetHostId)"
            :disabled="submitting || targetHosts.length === 0"
            @update:model-value="targetHostId = Number($event)"
          >
            <SelectTrigger id="move-thread-host" data-testid="move-thread-host" class="w-full">
              <SelectValue :placeholder="$t('app.moveThreadTargetHost')" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="host in targetHosts" :key="host.id" :value="String(host.id)">
                {{ host.name }}
              </SelectItem>
            </SelectContent>
          </Select>
          <p v-if="targetHosts.length === 0" class="text-xs text-destructive">
            {{ $t("app.moveThreadNoTargets") }}
          </p>
        </div>

        <div class="grid gap-2">
          <Label for="move-thread-project">{{ $t("app.moveThreadTargetProject") }}</Label>
          <Select
            :model-value="targetProjectSelectValue"
            :disabled="submitting || targetHostId === null"
            @update:model-value="selectProject($event)"
          >
            <SelectTrigger
              id="move-thread-project"
              data-testid="move-thread-project"
              class="w-full"
            >
              <SelectValue :placeholder="$t('app.moveThreadTargetProject')" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-if="targetProjects.length === 0 && recommendedTargetPath !== null"
                value="preset"
              >
                Recommended — {{ recommendedTargetPath }}
              </SelectItem>
              <SelectItem value="custom">{{ $t("app.moveThreadCustomPath") }}</SelectItem>
              <SelectItem
                v-for="project in targetProjects"
                :key="project.id"
                :value="String(project.id)"
              >
                {{ project.name }} — {{ project.remotePath }}
              </SelectItem>
            </SelectContent>
          </Select>
          <p
            v-if="
              targetHostId !== null && targetProjects.length === 0 && recommendedTargetPath === null
            "
            class="text-xs text-ink-muted"
          >
            {{ $t("app.moveThreadNoProjects") }}
          </p>
        </div>

        <div class="grid gap-2">
          <Label for="move-thread-cwd">{{ $t("app.moveThreadTargetPath") }}</Label>
          <Input
            id="move-thread-cwd"
            v-model="targetCwd"
            data-testid="move-thread-cwd"
            :disabled="submitting"
            :placeholder="$t('app.moveThreadTargetPathPlaceholder')"
          />
          <p class="text-xs leading-5 text-ink-muted">{{ $t("app.moveThreadReconcileNotice") }}</p>
        </div>

        <div
          v-if="error"
          class="whitespace-pre-line rounded-md bg-destructive/10 p-3 text-sm text-destructive"
        >
          {{ error }}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            :disabled="submitting"
            @click="emit('update:open', false)"
          >
            {{ $t("app.cancel") }}
          </Button>
          <Button type="submit" data-testid="move-thread-submit" :disabled="!canSubmit">
            {{ $t("app.moveThreadAction") }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
