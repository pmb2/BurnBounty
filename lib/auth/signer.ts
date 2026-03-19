import { getManagedEmbeddedSignerForUser } from '@/lib/auth/embedded-custody';
import { authError } from '@/lib/auth/errors';
import type { SessionPayload } from '@/types/auth';

export async function resolveSessionSigner(input: {
  session: SessionPayload;
  providedWif?: string;
  preferredAddress?: string;
}) {
  const provided = input.providedWif?.trim();
  if (provided) return { wif: provided, source: 'provided_wif' as const };
  if (!input.session?.userId) throw authError('auth_required');
  const managed = await getManagedEmbeddedSignerForUser(input.session.userId, input.preferredAddress);
  return { wif: managed.wif, source: 'managed_embedded' as const, address: managed.address, walletId: managed.walletId };
}
