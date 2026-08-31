import { createHash, randomBytes, randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { z } from "zod";
import { expect, test } from "./fixtures/remote-workspace";
import { E2E_USERNAME, openApp } from "./helpers/app";
import { sendTextTurn } from "./helpers/remote-codex";

const supervisorThreadSchema = z
  .object({
    scope: z.object({
      hostId: z.number().int().positive(),
      projectId: z.number().int().positive().nullable(),
      threadId: z.string().min(1),
      permissions: z.tuple([z.literal("thread.history.read"), z.literal("thread.events.read")]),
    }),
    history: z.object({
      thread: z.object({ id: z.string().min(1), turns: z.array(z.unknown()) }),
    }),
  })
  .loose();

const supervisorEventsSchema = z
  .object({
    scope: z.object({
      hostId: z.number().int().positive(),
      projectId: z.number().int().positive().nullable(),
      threadId: z.string().min(1),
    }),
    eventEpoch: z.string().min(1),
    replayGap: z.boolean(),
    latestEventId: z.number().int().nonnegative(),
    events: z.array(z.unknown()),
  })
  .loose();

test("a scoped supervisor reads one thread but cannot use ordinary Gateway APIs", async ({
  page,
  remoteWorkspace,
}) => {
  await openApp(page);
  const { host, project } = await remoteWorkspace.provision({
    hostName: `supervisor-readonly-host-${Date.now()}`,
  });
  const threadId = await remoteWorkspace.startThread(project.id);
  const marker = `E2E supervisor transcript ${Date.now()}`;
  await sendTextTurn(page, marker);
  await expect(page.getByTestId("send-turn-button")).toHaveAttribute(
    "aria-label",
    /Completed|已完成/,
    { timeout: 120_000 },
  );

  const token = `sg_${randomBytes(32).toString("base64url")}`;
  const grantId = randomUUID();
  const dbPath = resolve(process.env.CODEX_GATEWAY_DB_PATH ?? ".data-e2e/codex-gateway.db");
  const database = new DatabaseSync(dbPath);
  const user = database.prepare("SELECT id FROM users WHERE username = ?").get(E2E_USERNAME);
  if (user === undefined) throw new Error("Missing E2E Gateway user");
  database
    .prepare(
      `
        INSERT INTO supervisor_grants
          (id, user_id, token_hash, host_id, project_id, thread_id, label,
           expires_at, revoked_at, created_at, last_used_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, NULL)
      `,
    )
    .run(
      grantId,
      Number(user.id),
      createHash("sha256").update(token).digest("hex"),
      host.id,
      project.id,
      threadId,
      "E2E read-only supervisor",
      new Date(Date.now() + 3_600_000).toISOString(),
      new Date().toISOString(),
    );

  try {
    const authorization = { authorization: `Supervisor ${token}` };
    const historyResponse = await page.request.get("/api/supervisor/thread?limit=10", {
      headers: authorization,
    });
    expect(historyResponse.status()).toBe(200);
    const history = supervisorThreadSchema.parse(await historyResponse.json());
    expect(history.scope).toMatchObject({ hostId: host.id, projectId: project.id, threadId });
    expect(JSON.stringify(history.history)).toContain(marker);

    const eventsResponse = await page.request.get("/api/supervisor/thread/events?afterId=0", {
      headers: authorization,
    });
    expect(eventsResponse.status()).toBe(200);
    const events = supervisorEventsSchema.parse(await eventsResponse.json());
    expect(events.scope).toMatchObject({ hostId: host.id, projectId: project.id, threadId });

    const unauthorizedHistory = await page.request.get("/api/supervisor/thread");
    expect(unauthorizedHistory.status()).toBe(401);

    const ordinaryApiResponse = await page.request.get("/api/hosts", {
      headers: authorization,
    });
    expect(ordinaryApiResponse.status()).toBe(401);

    const writeResponse = await page.request.post("/api/threads/settings", {
      headers: authorization,
      data: { hostId: host.id, threadId, model: "must-not-apply" },
    });
    expect(writeResponse.status()).toBe(401);
  } finally {
    database.prepare("DELETE FROM supervisor_grants WHERE id = ?").run(grantId);
    database.close();
  }
});
