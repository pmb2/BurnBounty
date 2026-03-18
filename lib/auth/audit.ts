import crypto from 'node:crypto';
import { dbQuery } from '@/lib/db/postgres';

function hashValue(value?: string | null) {
  if (!value) return null;
  return crypto.createHash('sha256').update(value).digest('hex');
}

export async function recordAuthAuditEvent(input: {
  eventType:
    | 'challenge_issued'
    | 'challenge_verified'
    | 'challenge_failed'
    | 'wallet_linked'
    | 'wallet_link_failed'
    | 'wallet_unlinked'
    | 'wallet_unlink_failed'
    | 'login_succeeded'
    | 'login_failed'
    | 'embedded_wallet_created'
    | 'embedded_wallet_export_requested'
    | 'sensitive_action_reauth_succeeded'
    | 'sensitive_action_reauth_failed'
    | 'session_revoked';
  outcome: 'success' | 'failure';
  userId?: string | null;
  walletId?: string | null;
  addressNormalized?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
}) {
  await dbQuery(
    `
      insert into auth_audit_events (
        user_id, wallet_id, address_normalized, event_type, outcome,
        ip_fingerprint, user_agent_fingerprint, metadata_json
      ) values (
        $1, $2, $3, $4, $5, $6, $7, $8::jsonb
      )
    `,
    [
      input.userId || null,
      input.walletId || null,
      input.addressNormalized || null,
      input.eventType,
      input.outcome,
      hashValue(input.ipAddress),
      hashValue(input.userAgent),
      JSON.stringify(input.metadata || {})
    ]
  );
}

export async function recordAuthAuditEventSafe(input: Parameters<typeof recordAuthAuditEvent>[0]) {
  try {
    await recordAuthAuditEvent(input);
  } catch {
    // Audit telemetry must never block auth control flow.
  }
}
