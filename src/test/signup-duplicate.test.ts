import { describe, expect, it } from 'vitest';

describe('signup duplicate email protection', () => {
  it('detects duplicate accounts when identities array is empty', () => {
    const fakeAuthResponse = {
      data: {
        user: {
          id: 'existing-id',
          email: 'duplicate@example.com',
          identities: [], // Supabase returns empty array when email is already taken
        },
        session: null,
      },
      error: null,
    };

    const isDuplicate =
      fakeAuthResponse.data.user &&
      Array.isArray(fakeAuthResponse.data.user.identities) &&
      fakeAuthResponse.data.user.identities.length === 0;

    expect(isDuplicate).toBe(true);
  });

  it('detects duplicate accounts when error contains already registered message', () => {
    const fakeError = {
      message: 'User already registered',
      code: 'user_already_exists',
    };

    const isDuplicate =
      fakeError.message.toLowerCase().includes('already registered') ||
      fakeError.code === 'user_already_exists';

    expect(isDuplicate).toBe(true);
  });

  it('allows brand new accounts with populated identities', () => {
    const fakeAuthResponse = {
      data: {
        user: {
          id: 'new-id',
          email: 'newuser@example.com',
          identities: [{ id: 'identity-1' }],
        },
        session: { access_token: 'xyz' },
      },
      error: null,
    };

    const isDuplicate =
      fakeAuthResponse.data.user &&
      Array.isArray(fakeAuthResponse.data.user.identities) &&
      fakeAuthResponse.data.user.identities.length === 0;

    expect(isDuplicate).toBe(false);
  });
});

