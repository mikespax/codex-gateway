import { randomUUID } from "node:crypto";
import { z } from "zod";
import { expect, test } from "./fixtures/remote-workspace";
import { openApp } from "./helpers/app";
import { execRemoteSsh } from "./helpers/remote-codex";

const uploadedFilesSchema = z.object({
  files: z.array(
    z.object({
      name: z.string(),
      path: z.string(),
      mimeType: z.string().nullable(),
      size: z.number().int().nonnegative(),
      isImage: z.boolean(),
    }),
  ),
});

test("uploads a ZIP attachment to the selected remote host", async ({ page, remoteWorkspace }) => {
  await openApp(page);
  const { host } = await remoteWorkspace.provision({
    hostName: `upload-host-${Date.now()}`,
  });
  const { remote } = remoteWorkspace;
  const fileName = `gateway-upload-${randomUUID()}.zip`;
  const response = await page.evaluate(
    async ({ hostId, fileName }) => {
      const token = localStorage.getItem("codex-gateway-auth-token");
      if (token === null || token === "") throw new Error("Missing auth token");
      const form = new FormData();
      form.append(
        "files",
        new File([new Uint8Array([0x50, 0x4b, 0x03, 0x04])], fileName, {
          type: "application/zip",
        }),
      );
      const result = await fetch(`/api/uploads?hostId=${hostId}`, {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
        body: form,
      });
      return { status: result.status, body: await result.text() };
    },
    { hostId: host.id, fileName },
  );

  expect(response.status, response.body).toBe(200);
  const uploaded = uploadedFilesSchema.parse(JSON.parse(response.body));
  expect(uploaded.files).toEqual([
    expect.objectContaining({
      name: fileName,
      mimeType: "application/zip",
      size: 4,
      isImage: false,
    }),
  ]);
  const remotePath = uploaded.files[0]!.path;
  expect(remotePath).toMatch(
    /^\/tmp\/codex-gateway-uploads\/upload\.[A-Za-z0-9]+\/[0-9a-f-]+\.zip$/,
  );
  const remoteDirectory = remotePath.slice(0, remotePath.lastIndexOf("/"));

  try {
    const inspection = await execRemoteSsh(
      remote,
      `wc -c < ${shellQuote(remotePath)} && od -An -tx1 -N4 ${shellQuote(remotePath)} | tr -d ' \\n'`,
    );
    expect(inspection.stdout.trim().split(/\s+/)).toEqual(["4", "504b0304"]);
  } finally {
    await execRemoteSsh(remote, `rm -rf -- ${shellQuote(remoteDirectory)}`);
  }
});

function shellQuote(value: string) {
  return `'${value.replaceAll("'", "'\\''")}'`;
}
