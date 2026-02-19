import { NextRequest, NextResponse } from 'next/server';
import { AccessError, requireWorkspaceContext } from '@/lib/workspace';
import { createSetterAiSession, listSetterAiSessionsByEmail } from '@/lib/setterAiRepository';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const context = await requireWorkspaceContext();
    const sessions = await listSetterAiSessionsByEmail(context.sessionEmail);

    return NextResponse.json(
      {
        sessions,
        currentEmail: context.sessionEmail,
      },
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
    return NextResponse.json({ error: 'Failed to load sessions.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await requireWorkspaceContext();
    const body = await request.json().catch(() => null);
    const title = typeof body?.title === 'string' ? body.title : undefined;
    const session = await createSetterAiSession(context.sessionEmail, title);

    return NextResponse.json(
      { session },
      {
        status: 201,
        headers: {
          'Cache-Control': 'private, no-store',
        },
      }
    );
  } catch (error) {
    if (error instanceof AccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Failed to create session.' }, { status: 500 });
  }
}

