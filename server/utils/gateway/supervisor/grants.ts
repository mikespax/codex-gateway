import { gatewayDatabase } from "../storage/database";
import { hashToken } from "../storage/crypto";

export interface SupervisorGrant {
  id: string;
  userId: number;
  username: string;
  hostId: number;
  projectId: number | null;
  threadId: string;
  label: string;
  expiresAt: string;
}

export const supervisorGrantStore = {
  authenticate(token: string): SupervisorGrant | null {
    if (token === "" || token.length > 256) return null;
    const row = gatewayDatabase()
      .prepare(
        `
          SELECT supervisor_grants.id,
                 supervisor_grants.user_id,
                 supervisor_grants.host_id,
                 supervisor_grants.project_id,
                 supervisor_grants.thread_id,
                 supervisor_grants.label,
                 supervisor_grants.expires_at,
                 users.username,
                 users.is_active
          FROM supervisor_grants
          JOIN users ON users.id = supervisor_grants.user_id
          WHERE supervisor_grants.token_hash = ?
            AND supervisor_grants.revoked_at IS NULL
        `,
      )
      .get(hashToken(token));
    if (row === undefined || Number(row.is_active) !== 1) return null;
    if (Date.parse(String(row.expires_at)) <= Date.now()) return null;

    const now = new Date().toISOString();
    gatewayDatabase()
      .prepare("UPDATE supervisor_grants SET last_used_at = ? WHERE id = ?")
      .run(now, String(row.id));
    return {
      id: String(row.id),
      userId: Number(row.user_id),
      username: String(row.username),
      hostId: Number(row.host_id),
      projectId: row.project_id === null ? null : Number(row.project_id),
      threadId: String(row.thread_id),
      label: String(row.label),
      expiresAt: String(row.expires_at),
    };
  },
};
