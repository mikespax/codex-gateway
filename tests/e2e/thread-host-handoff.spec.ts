import { randomUUID } from "node:crypto";
import { z } from "zod";
import { expect, test } from "./fixtures/remote-workspace";
import { authenticatedFetch, openApp } from "./helpers/app";
import { execRemoteSsh, startRemoteThreadFromProjectMenu } from "./helpers/remote-codex";
import { openThreadInStore } from "./helpers/gateway-store";

const threadMoveResultSchema = z
  .object({
    source: z.object({ hostId: z.number().int().positive(), threadId: z.string().min(1) }),
    target: z.object({
      hostId: z.number().int().positive(),
      projectId: z.number().int().positive(),
      threadId: z.string().min(1),
      title: z.string().min(1),
      cwd: z.string().min(1),
    }),
  })
  .strict();

const threadListSchema = z
  .object({
    data: z.array(z.object({ id: z.string().min(1) }).loose()),
  })
  .loose();

test("hands a thread off between isolated logical hosts without removing the source", async ({
  page,
  remoteWorkspace,
}) => {
  await openApp(page);

  const suffix = randomUUID();
  const sourcePath = `/tmp/codex-gateway-handoff-source-${suffix}`;
  const targetPath = `/tmp/codex-gateway-handoff-target-${suffix}`;
  await execRemoteSsh(
    remoteWorkspace.remote,
    `mkdir -p -- ${shellQuote(sourcePath)} ${shellQuote(targetPath)}`,
  );

  try {
    // These are two separately configured Gateway hosts pointing at the disposable E2E SSH
    // fixture. The distinct logical host IDs exercise the production cross-host boundary without
    // touching any user-configured VPS, Mac, or Lenovo host.
    const source = await remoteWorkspace.provision({
      hostName: `handoff-source-${suffix}`,
      remotePath: sourcePath,
    });
    const target = await remoteWorkspace.provision({
      hostName: `handoff-target-${suffix}`,
      remotePath: targetPath,
    });
    expect(source.host.id).not.toBe(target.host.id);

    const sourceThreadId = await startRemoteThreadFromProjectMenu(
      page,
      remoteWorkspace.remote,
      source.project.id,
    );
    const result = await authenticatedFetch(
      page,
      {
        url: "/api/threads/move",
        method: "POST",
        body: {
          sourceHostId: source.host.id,
          sourceProjectId: source.project.id,
          sourceThreadId,
          targetHostId: target.host.id,
          targetProjectId: target.project.id,
        },
      },
      (value) => threadMoveResultSchema.parse(value),
    );

    expect(result.source).toEqual({ hostId: source.host.id, threadId: sourceThreadId });
    expect(result.target.hostId).toBe(target.host.id);
    expect(result.target.projectId).toBe(target.project.id);
    expect(result.target.threadId).not.toBe(sourceThreadId);
    expect(result.target.cwd).toBe(targetPath);

    // Opening both returned identities through the real realtime activation path proves the
    // target handoff was accepted and the original source remains usable.
    await openThreadInStore(page, {
      hostId: target.host.id,
      projectId: target.project.id,
      threadId: result.target.threadId,
    });
    await expect
      .poll(() =>
        page.evaluate(() => window.__codexGatewayE2e?.navigation.selectedThreadId ?? null),
      )
      .toBe(result.target.threadId);

    const sourceListing = await authenticatedFetch(
      page,
      { url: `/api/threads?hostId=${source.host.id}&projectId=${source.project.id}&limit=100` },
      (value) => threadListSchema.parse(value),
    );
    expect(sourceListing.data.some((thread) => thread.id === sourceThreadId)).toBe(true);

    await openThreadInStore(page, {
      hostId: source.host.id,
      projectId: source.project.id,
      threadId: sourceThreadId,
    });
    await expect
      .poll(() =>
        page.evaluate(() => window.__codexGatewayE2e?.navigation.selectedThreadId ?? null),
      )
      .toBe(sourceThreadId);
  } finally {
    await execRemoteSsh(
      remoteWorkspace.remote,
      `rm -rf -- ${shellQuote(sourcePath)} ${shellQuote(targetPath)}`,
    );
  }
});

function shellQuote(value: string) {
  return `'${value.replaceAll("'", "'\\''")}'`;
}
