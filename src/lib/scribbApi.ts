import { auth } from '@/lib/firebase';

export const SCRIBB_API_BASE_URL =
  import.meta.env.VITE_SCRIBB_API_BASE_URL ?? 'https://api.scribb.net';

interface ApiErrorPayload {
  success?: false;
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
}

export class ScribbApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ScribbApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function scribbApiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const user = auth?.currentUser;
  if (!user) {
    throw new ScribbApiError(401, 'AUTH_REQUIRED', 'You must be signed in.');
  }

  const idToken = await user.getIdToken();

  const response = await fetch(`${SCRIBB_API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
      ...options.headers,
    },
  });

  const result = (await response.json()) as T | ApiErrorPayload;

  if (!response.ok) {
    const errorResult = result as ApiErrorPayload;
    throw new ScribbApiError(
      response.status,
      errorResult.error?.code ?? 'API_REQUEST_FAILED',
      errorResult.error?.message ?? 'The request could not be completed.',
      errorResult.error?.details
    );
  }

  return result as T;
}

// User-facing messages for the documented backend error codes.
export function describeApiError(err: unknown): string {
  if (!(err instanceof ScribbApiError)) {
    return err instanceof Error ? err.message : 'Something went wrong.';
  }
  switch (err.code) {
    case 'AUTH_TOKEN_REQUIRED':
    case 'AUTH_TOKEN_INVALID':
    case 'AUTH_REQUIRED':
      return 'Your session has expired. Please sign in again.';
    case 'INVALID_ORGANIZATION_REQUEST':
      return err.message || 'Some of the information provided is invalid.';
    case 'ORGANIZATION_OWNER_REQUIRED':
      return 'Only the organization owner can manage billing.';
    case 'ORGANIZATION_ACCESS_DENIED':
      return 'You do not have access to this organization.';
    case 'SUBSCRIPTION_ALREADY_EXISTS':
      return 'This organization already has an active or unresolved subscription.';
    case 'STRIPE_CUSTOMER_NOT_FOUND':
      return 'No paid billing account exists for this organization.';
    case 'INTERNAL_SERVER_ERROR':
      return 'Scribb could not complete the request. Please try again.';
    default:
      return err.message || 'Scribb could not complete the request. Please try again.';
  }
}
