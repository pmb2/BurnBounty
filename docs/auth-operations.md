# Auth Operations

Operational guide for monitoring and diagnosing BurnBounty auth behavior.

## Event Source

Primary auth observability source:

- `auth_audit_events` table

Important fields:

- `event_type`
- `outcome`
- `user_id`
- `address_normalized`
- `metadata_json`
- `created_at`

No private keys, seeds, or decrypted wallet material are logged.

## Event Taxonomy

Success/failure events currently emitted:

- `challenge_issued`
- `challenge_verified`
- `challenge_failed`
- `wallet_linked`
- `wallet_link_failed`
- `wallet_unlinked`
- `wallet_unlink_failed`
- `login_succeeded`
- `login_failed`
- `embedded_wallet_created`
- `embedded_wallet_export_requested`
- `sensitive_action_reauth_succeeded`
- `sensitive_action_reauth_failed`
- `session_revoked`

## Investigation Queries

### 1) Challenge failure spike (last 30m)

```sql
select date_trunc('minute', created_at) as minute, count(*) as failures
from auth_audit_events
where event_type = 'challenge_failed'
  and created_at > now() - interval '30 minutes'
group by 1
order by 1 desc;
```

### 2) Login failure spike by error code

```sql
select
  coalesce(metadata_json->>'error', 'unknown') as error_code,
  count(*) as n
from auth_audit_events
where event_type = 'login_failed'
  and created_at > now() - interval '1 hour'
group by 1
order by n desc;
```

### 3) Wallet link conflicts

```sql
select created_at, user_id, address_normalized, metadata_json
from auth_audit_events
where event_type = 'wallet_link_failed'
  and created_at > now() - interval '24 hours'
order by created_at desc;
```

### 4) Sensitive re-auth failures

```sql
select created_at, user_id, metadata_json
from auth_audit_events
where event_type = 'sensitive_action_reauth_failed'
  and created_at > now() - interval '24 hours'
order by created_at desc;
```

### 5) Session revocation volume

```sql
select date_trunc('hour', created_at) as hour, count(*) as n
from auth_audit_events
where event_type = 'session_revoked'
  and created_at > now() - interval '7 days'
group by 1
order by 1 desc;
```

## Alert Guidance

Set alerts when any of the following exceed baseline:

1. `challenge_failed` rate spikes.
2. `login_failed` spikes for `invalid_credentials`, `invalid_signature`, or `session_invalid`.
3. `wallet_link_failed` spikes (possible abuse or UX breakage).
4. `sensitive_action_reauth_failed` spikes (possible phishing or stale session UX issue).
5. Elevated `rate_limited` responses in app logs.

## Correlation Guidance

Correlate by:

- timestamp window
- `user_id`
- `address_normalized`
- hashed request fingerprints (`ip_fingerprint`, `user_agent_fingerprint`)

Avoid correlating via raw secrets or signatures.

## Incident Triage Steps

1. Confirm scope (single user, cohort, global).
2. Identify dominant error codes in `metadata_json`.
3. Verify DB health and auth table write latency.
4. Validate `AUTH_JWT_SECRET` consistency across instances.
5. Check for rollout/mixed-version mismatch.
6. Run smoke auth flow against live endpoints.

## Data Retention

Define retention policy for `auth_audit_events` per compliance posture.

Recommended:

- hot query window: 30–90 days
- archived retention: longer-term in low-cost storage
