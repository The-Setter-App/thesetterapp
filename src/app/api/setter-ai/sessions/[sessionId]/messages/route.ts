import { NextResponse } from 'next/server';
import { AccessError, requireWorkspaceContext } from '@/lib/workspace';
import { getSetterAiSessionById, listSetterAiMessages } from '@/lib/setterAiRepository';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  context: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionEmail } = await requireWorkspaceContext();
    const { sessionId } = await context.params;

    const session = await getSetterAiSessionById(sessionEmail, sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Session not found.' }, { status: 404 });
    }

    const messages = await listSetterAiMessages(sessionEmail, sessionId);
    return NextResponse.json(
      { messages },
      {
        headers: {
          'Cache-Control': 'private, no-store',
        },
      }
    );
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Failed to load session messages.' }, { status: 500 });
  }
}

