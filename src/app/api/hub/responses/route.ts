import { NextRequest, NextResponse } from 'next/server';
import { submitHubResponse } from '@/actions/hubActions';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await submitHubResponse(body);
    return NextResponse.json(result, { status: result.success ? 201 : 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
