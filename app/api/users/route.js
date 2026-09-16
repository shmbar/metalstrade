export const dynamic = 'force-dynamic';
import { createNewUser, delUser, getAllUsers, updateUser } from '../../../actions/pass';

// Settings → Users over HTTP, for the mobile app. The web page calls the server
// actions in actions/pass.js directly; a phone can't, so this route hands the same
// actions the caller's Bearer token and returns what they return. Every rule —
// token check, same workspace, rank, protected owner, claim size — stays in
// pass.js, so web and mobile can never disagree about who may do what.

const tokenOf = (request) => {
    const h = request.headers.get('authorization') || '';
    return h.startsWith('Bearer ') ? h.slice(7).trim() : '';
};

// Actions report refusals as { error: { message } }. Permission and session
// refusals are 403/401; anything else (email taken, weak password) is 400.
const reply = (result) => {
    if (result?.error) {
        const message = result.error.message || 'Something went wrong.';
        const status = /sign(ed)? in|session/i.test(message) ? 401
            : /permission|cannot|protected|different workspace/i.test(message) ? 403
                : 400;
        return Response.json({ error: message }, { status });
    }
    return Response.json(result);
};

const bodyOf = async (request) => {
    try {
        return await request.json();
    } catch {
        return {};
    }
};

// The list the web table shows, minus what a phone has no business holding:
// listUsers() records carry password hashes and provider data.
const publicUser = (u) => ({
    uid: u.uid,
    email: u.email || '',
    displayName: u.displayName || '',
    phoneNumber: u.phoneNumber || '',
    disabled: Boolean(u.disabled),
    role: u.role,
    title: u.title,
    pages: u.pages || [],
    customPages: Boolean(u.customPages),
    isOwner: Boolean(u.isOwner),
    isSelf: Boolean(u.isSelf),
    userCreated: u.userCreated || null,
    lastLogedIn: u.lastLogedIn || null,
});

export async function GET(request) {
    const idToken = tokenOf(request);
    if (!idToken) return Response.json({ error: 'Authentication required' }, { status: 401 });
    const users = await getAllUsers(idToken);
    return Response.json({ users: (users || []).map(publicUser) });
}

export async function POST(request) {
    const b = await bodyOf(request);
    return reply(await createNewUser({
        idToken: tokenOf(request),
        email: b.email,
        password: b.password,
        displayName: b.displayName,
        role: b.role,
        pages: b.pages,
    }));
}

export async function PATCH(request) {
    const b = await bodyOf(request);
    const payload = {
        idToken: tokenOf(request),
        uid: b.uid,
        email: b.email,
        displayName: b.displayName,
        phoneNumber: b.phoneNumber,
        role: b.role,
        pages: b.pages,
    };
    if (b.password) payload.password = b.password;
    return reply(await updateUser(payload));
}

export async function DELETE(request) {
    const b = await bodyOf(request);
    return reply(await delUser({ idToken: tokenOf(request), uid: b.uid }));
}
