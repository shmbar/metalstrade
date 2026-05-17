import { guardAiRequest } from '../../../../utils/aiGuard';

// Read-only status endpoint — tells the client whether the server has the env vars
// needed to send reminder emails. Never exposes the actual values.
export async function GET(request) {
    const guard = await guardAiRequest(request);
    if (guard.error) return Response.json({ error: guard.error }, { status: guard.status });

    const hasApiKey = !!process.env.RESEND_API_KEY;
    const hasFromEmail = !!process.env.RESEND_FROM_EMAIL;
    const fromEmail = process.env.RESEND_FROM_EMAIL || null;

    // Expose only the domain part so the user can confirm setup without leaking the full address
    let fromDomain = null;
    if (fromEmail) {
        const at = fromEmail.indexOf('@');
        fromDomain = at >= 0 ? fromEmail.slice(at + 1) : null;
    }

    return Response.json({
        ready: hasApiKey && hasFromEmail,
        hasApiKey,
        hasFromEmail,
        fromEmail,
        fromDomain,
    });
}
