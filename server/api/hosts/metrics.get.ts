import { defineGatewayEventHandler } from "../../utils/gateway/http/errors";
import { hostMetricsManager } from "../../utils/gateway/infra/host-services";
import { hostStore } from "../../utils/gateway/state/hosts";
import type { HostResourceUsageSummary } from "~~/shared/types";

export default defineGatewayEventHandler((event): HostResourceUsageSummary[] => {
  const userId = event.context.auth!.user.id;
  // Start collectors for every configured host, including hosts that have not yet been opened in
  // the Gateway. Secrets stay server-side; only the resulting numeric summary is returned below.
  const hosts = hostStore.listWithSecret();
  for (const host of hosts) hostMetricsManager.ensureCollector(userId, host);

  return hosts.map((host) => {
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
