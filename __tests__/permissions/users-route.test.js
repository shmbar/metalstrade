import { beforeEach, describe, expect, it, vi } from 'vitest';

// /api/users is the mobile app's way into Settings → Users. It must hand the caller's
// Bearer token to the same server actions web uses (so every permission rule stays in
// actions/pass.js), map their refusals to HTTP statuses, and never pass on the password
// hashes that listUsers() records carry.
const pass = vi.hoisted(() => ({
  getAllUsers: vi.fn(),
  createNewUser: vi.fn(),
  updateUser: vi.fn(),
  delUser: vi.fn(),
}));
vi.mock('../../actions/pass', () => pass);

const { GET, POST, PATCH, DELETE } = await import('../../app/api/users/route.js');

const req = (method, body, token = 'tok-123') =>
  new Request('http://x/api/users', {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });

beforeEach(() => Object.values(pass).forEach((f) => f.mockReset()));

describe('/api/users', () => {
  it('GET refuses a request with no token without calling the action', async () => {
    const res = await GET(req('GET', null, ''));
    expect(res.status).toBe(401);
    expect(pass.getAllUsers).not.toHaveBeenCalled();
  });

  it('GET lists members with the caller token and strips credentials', async () => {
    pass.getAllUsers.mockResolvedValue([
      {
        uid: 'u1', email: 'a@b.co', displayName: 'Anna', phoneNumber: '+331', disabled: false,
        passwordHash: 'HASH', passwordSalt: 'SALT', providerData: [{ uid: 'x' }], customClaims: { uidCollection: 'w' },
        role: 'admin', title: 'Admin', pages: ['dashboard'], customPages: true, isOwner: false, isSelf: true,
        userCreated: 'Tue, 01 Sep 2026 10:00:00 GMT', lastLogedIn: null,
      },
    ]);
    const res = await GET(req('GET'));
    expect(pass.getAllUsers).toHaveBeenCalledWith('tok-123');
    const { users } = await res.json();
    expect(users).toEqual([
      {
        uid: 'u1', email: 'a@b.co', displayName: 'Anna', phoneNumber: '+331', disabled: false,
        role: 'admin', title: 'Admin', pages: ['dashboard'], customPages: true, isOwner: false, isSelf: true,
        userCreated: 'Tue, 01 Sep 2026 10:00:00 GMT', lastLogedIn: null,
      },
    ]);
    expect(JSON.stringify(users)).not.toMatch(/HASH|SALT|providerData|customClaims/);
  });

  it('POST creates with the token from the header, never one from the body', async () => {
    pass.createNewUser.mockResolvedValue({ uid: 'n1', role: 'user', title: 'User', uidCollection: 'w' });
    const res = await POST(req('POST', { idToken: 'forged', uidCollection: 'other', email: 'n@b.co', password: 'secret1', displayName: 'New', role: 'user', pages: ['contracts'] }));
    expect(res.status).toBe(200);
    expect(pass.createNewUser).toHaveBeenCalledWith({ idToken: 'tok-123', email: 'n@b.co', password: 'secret1', displayName: 'New', role: 'user', pages: ['contracts'] });
    expect((await res.json()).uid).toBe('n1');
  });

  it('PATCH sends a password only when one was given', async () => {
    pass.updateUser.mockResolvedValue({ uid: 'u1', role: 'user' });
    await PATCH(req('PATCH', { uid: 'u1', email: 'a@b.co', displayName: 'Anna', phoneNumber: '', role: 'user', pages: [], password: '' }));
    expect(pass.updateUser.mock.calls[0][0]).not.toHaveProperty('password');
    await PATCH(req('PATCH', { uid: 'u1', email: 'a@b.co', displayName: 'Anna', role: 'user', password: 'newpass' }));
    expect(pass.updateUser.mock.calls[1][0]).toMatchObject({ idToken: 'tok-123', uid: 'u1', password: 'newpass' });
  });

  it('maps action refusals to 401 / 403 / 400 with the action message', async () => {
    pass.delUser.mockResolvedValueOnce({ error: { message: 'Your session has expired. Please sign in again.' } });
    let res = await DELETE(req('DELETE', { uid: 'u1' }));
    expect(res.status).toBe(401);

    pass.delUser.mockResolvedValueOnce({ error: { message: 'The workspace owner account cannot be modified or deleted.' } });
    res = await DELETE(req('DELETE', { uid: 'owner' }));
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe('The workspace owner account cannot be modified or deleted.');

    pass.createNewUser.mockResolvedValueOnce({ error: { message: 'That email address is already in use.' } });
    res = await POST(req('POST', { email: 'dup@b.co' }));
    expect(res.status).toBe(400);
    expect(pass.delUser).toHaveBeenCalledWith({ idToken: 'tok-123', uid: 'owner' });
  });
});
