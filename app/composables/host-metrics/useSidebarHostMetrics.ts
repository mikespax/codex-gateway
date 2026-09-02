import { onBeforeUnmount, onMounted, ref, watch, type Ref } from "vue";
import type { HostRecord, HostResourceUsageSummary } from "~~/shared/types";
import { storeToRefs } from "pinia";
import { useAuthStore } from "@/stores/auth";
import { gatewayApi } from "@/utils/gateway-api";

export const SIDEBAR_HOST_METRICS_REFRESH_MS = 180_000;

export function useSidebarHostMetrics(hosts: Ref<HostRecord[]>) {
  const auth = useAuthStore();
  const { isAuthenticated } = storeToRefs(auth);
  const usageByHost = ref<Record<number, HostResourceUsageSummary>>({});
  let refreshTimer: ReturnType<typeof setTimeout> | null = null;
  let requestVersion = 0;
  let disposed = false;

  function clearRefreshTimer() {
    if (refreshTimer === null) return;
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }

  function scheduleRefresh() {
    clearRefreshTimer();
    if (disposed) return;
    refreshTimer = setTimeout(() => {
      refreshTimer = null;
      void refresh();
    }, SIDEBAR_HOST_METRICS_REFRESH_MS);
  }

  async function refresh() {
    if (!auth.isAuthenticated) return;
    const version = ++requestVersion;
    try {
      const rows = await gatewayApi<HostResourceUsageSummary[]>("/api/hosts/metrics");
      if (disposed || version !== requestVersion) return;
      const knownHostIds = new Set(hosts.value.map((host) => host.id));
      usageByHost.value = Object.fromEntries(
        rows.filter((row) => knownHostIds.has(row.hostId)).map((row) => [row.hostId, row]),
      );
    } catch {
      // Resource summaries are optional decoration; leave the last known values visible on a
      // transient request failure and retry on the normal three-minute cadence.
    } finally {
      if (!disposed && version === requestVersion) scheduleRefresh();
    }
  }

  function usageForHost(hostId: number) {
    const summary = usageByHost.value[hostId];
    if (summary === undefined) return null;
    return `CPU ${formatPercent(summary.cpuPercent)} · RAM ${formatPercent(summary.memoryPercent)}`;
  }

  onMounted(() => {
    auth.hydrate();
    if (auth.isAuthenticated) void refresh();
  });
  watch(isAuthenticated, (authenticated) => {
    if (authenticated) {
      void refresh();
      return;
    }
    usageByHost.value = {};
    requestVersion += 1;
    clearRefreshTimer();
  });
  watch(
    hosts,
    () => {
      if (auth.isAuthenticated) void refresh();
    },
    { deep: true },
  );
  onBeforeUnmount(() => {
    disposed = true;
    requestVersion += 1;
    clearRefreshTimer();
  });

  return { usageByHost, usageForHost, refresh };
}

function formatPercent(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "—";
  return `${Math.round(value * 10) / 10}%`;
}
