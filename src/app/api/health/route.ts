import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    platform: 'SOUQCLOUD',
    timestamp: new Date().toISOString(),
  });
}
