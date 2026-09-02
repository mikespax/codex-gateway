import { defineGatewayEventHandler } from "../../utils/gateway/http/errors";
import { hostMetricsManager } from "../../utils/gateway/infra/host-services";
import { hostStore } from "../../utils/gateway/state/hosts";
import type { HostResourceUsageSummary } from "~~/shared/types";

export default defineGatewayEventHandler((event): HostResourceUsageSummary[] => {
  const userId = event.context.auth!.user.id;
  return hostStore.list().map((host) => {
    const snapshot = hostMetricsManager.snapshot(userId, host.id);
    const latest = snapshot.samples.at(-1);
    return {
      hostId: host.id,
      status: snapshot.status,
      cpuPercent: latest?.cpu.usagePercent ?? null,
      memoryPercent: latest?.memory.usagePercent ?? null,
      sampledAt: latest?.sampledAt ?? null,
    };
  });
});
