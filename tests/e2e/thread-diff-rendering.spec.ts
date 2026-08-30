import { expect, test } from "@playwright/test";
import { openApp } from "./helpers/app";
import { seedGatewayThread } from "./helpers/gateway-store";
import type { ThreadHistoryState } from "../../shared/types";
import type { ThreadViewState } from "../../app/stores/gateway/types";
import { projectThreadTimelineHistory } from "../../shared/thread-history/timeline";
import { gatewayThreadFixture } from "./fixtures/gateway-thread";

test("expanded intermediate steps keep file summaries but hide code-change details", async ({
  page,
}) => {
  await openApp(page);
  const threadId = "e2e-diff-thread";
  const workspaceRoot = "/workspace/diff-ui";
  const changedFilePath = `${workspaceRoot}/src/example.py`;
  const diff = [
    "diff --git a/src/example.py b/src/example.py",
    "index 1111111..2222222 100644",
    "--- a/src/example.py",
    "+++ b/src/example.py",
    "@@ -1,2 +1,3 @@",
    " print('before')",
    "-old_value = 'short'",
    "+new_value = 'this is a deliberately long changed line to require horizontal scrolling in the diff viewport'",
    "+print(new_value)",
  ].join("\n");

  await seedGatewayThread(page, {
    threadId,
    projectId: 1,
    currentThread: { id: threadId, name: "Diff UI", cwd: workspaceRoot },
    history: {
      thread: {
        id: threadId,
        turns: [
          {
            id: "turn-1",
            status: "running",
            items: [
              {
                id: "user-1",
                type: "userMessage",
                content: [{ type: "text", text: "edit a file" }],
              },
              {
                id: "file-change-1",
                type: "fileChange",
                status: "completed",
                changes: [{ path: changedFilePath, kind: "update", diff }],
              },
            ],
          },
        ],
      },
    },
  });

  await openIntermediateSteps(page);
  await expect(page.getByTestId("file-change-summary")).toBeVisible();
  await expect(page.getByRole("button", { name: /src\/example\.py/ })).toHaveCount(0);
  await expect(page.getByText("new_value =")).toHaveCount(0);
  await expect(page.locator(".diff-markdown")).toHaveCount(0);
});

test("command labels unwrap official shell invocations and short output uses natural height", async ({
  page,
}) => {
  await openApp(page);
  const threadId = "e2e-short-command-output-thread";
  await seedGatewayThread(page, {
    threadId,
    currentThread: { id: threadId, name: "Short Command Output" },
    history: {
      thread: {
        id: threadId,
        turns: [
          {
            id: "turn-short-command",
            status: "running",
            items: [
              {
                id: "command-short-1",
                type: "commandExecution",
                status: "completed",
                command: "/bin/zsh -lc 'pwd && printf \"done\"'",
                aggregatedOutput: "/tmp/e2e\n",
              },
              {
                id: "command-plain-1",
                type: "commandExecution",
                status: "inProgress",
                command: "sleep 10",
                aggregatedOutput: "",
              },
              {
                id: "command-failed-1",
                type: "commandExecution",
                status: "failed",
                command: "false",
                aggregatedOutput: "",
                exitCode: 1,
              },
            ],
          },
        ],
      },
    },
  });

  await openIntermediateSteps(page);
  await expect(page.getByRole("button", { name: /pwd && printf "done"/ })).toBeVisible();
  const completedCommand = page.getByRole("button", { name: /pwd && printf "done"/ });
  const runningCommand = page.getByRole("button", { name: /sleep 10/ });
  const failedCommand = page.getByRole("button", { name: /false/ });
  await expect(runningCommand).toBeVisible();
  await expect(failedCommand).toBeVisible();
  await expect(completedCommand.getByTestId("command-status-completed")).toBeVisible();
  await expect(runningCommand.getByTestId("command-status-running")).toBeVisible();
  await expect(failedCommand.getByTestId("command-status-failed")).toBeVisible();
  await completedCommand.click();
  const commandOutput = page.getByTestId("chat-scroll-area").getByText("/tmp/e2e");
  await expect(commandOutput).toBeVisible();
  await expect
    .poll(async () =>
      commandOutput.evaluate((element: HTMLElement) => {
        const scrollArea = element.closest('[data-slot="scroll-area"]');
        if (!(scrollArea instanceof HTMLElement)) {
          throw new Error("Missing command output scroll area");
        }
        return scrollArea.getBoundingClientRect().height;
      }),
    )
    .toBeLessThan(96);
});

test("switching threads keeps hidden diff details out of the intermediate summary", async ({
  page,
}) => {
  await openApp(page);
  const diffThreadId = "e2e-async-diff-layout-thread";
  const shortThreadId = "e2e-async-diff-short-thread";
  const finalMarker = "final answer after the asynchronously highlighted diff";
  const diff = [
    "diff --git a/src/async.py b/src/async.py",
    "--- a/src/async.py",
    "+++ b/src/async.py",
    "@@ -1,1 +1,120 @@",
    ...Array.from(
      { length: 120 },
      (_, index) => `+async_diff_line_${String(index + 1).padStart(3, "0")} = ${index + 1}`,
    ),
  ].join("\n");
  const diffHistory = {
    thread: {
      id: diffThreadId,
      turns: [
        {
          id: "turn-async-diff",
          status: "running",
          items: [
            {
              id: "file-async-diff",
              type: "fileChange",
              status: "completed",
              changes: [{ path: "src/async.py", kind: "update", diff }],
            },
            {
              id: "agent-after-async-diff",
              type: "agentMessage",
              phase: "final_answer",
              text: finalMarker,
            },
          ],
        },
      ],
    },
  };
  const shortHistory = {
    thread: {
      id: shortThreadId,
      turns: [
        {
          id: "turn-short",
          status: "completed",
          items: [
            {
              id: "agent-short",
              type: "agentMessage",
              phase: "final_answer",
              text: "short thread content",
            },
          ],
        },
      ],
    },
  };

  await seedGatewayThread(page, {
    threadId: diffThreadId,
    projectId: 1,
    status: "running",
    currentThread: { id: diffThreadId, name: "Async Diff" },
    history: diffHistory,
    threads: [
      { id: diffThreadId, name: "Async Diff", updatedAt: 2 },
      { id: shortThreadId, name: "Short Thread", updatedAt: 1 },
    ],
    threadViews: {
      [`1:${diffThreadId}`]: cachedThreadView(diffThreadId, diffHistory),
      [`1:${shortThreadId}`]: cachedThreadView(shortThreadId, shortHistory),
    },
  });

  await page.getByTestId(`thread-button-${shortThreadId}`).click();
  await expect(page.getByText("short thread content")).toBeVisible();
  await page.getByTestId(`thread-button-${diffThreadId}`).click();
  await expect(page.getByTestId("file-change-summary")).toBeVisible();
  await expect(page.getByRole("button", { name: /src\/async\.py/ })).toHaveCount(0);
  await expect(page.getByText("async_diff_line_120")).toHaveCount(0);
  await expect(page.getByText(finalMarker)).toBeVisible();
});

function cachedThreadView(threadId: string, history: ThreadHistoryState): ThreadViewState {
  const timelineTurns = projectThreadTimelineHistory(history).thread.turns;
  return {
    hostId: 1,
    projectId: 1,
    threadId,
    currentThread: gatewayThreadFixture({ id: threadId }, { projectId: 1 }),
    history,
    timelineTurns,
    events: [],
    olderTurnsCursor: null,
    newerTurnsCursor: null,
    lastEventId: 0,
    eventEpoch: "e2e-event-epoch",
    loading: false,
    error: null,
  };
}

async function openIntermediateSteps(page: import("@playwright/test").Page) {
  const toggle = page.getByRole("button", { name: /中间过程/ }).first();
  await expect(toggle).toBeVisible();
  if ((await toggle.getAttribute("data-state")) !== "open") {
    await toggle.click();
  }
  await expect(toggle).toHaveAttribute("data-state", "open");
}
