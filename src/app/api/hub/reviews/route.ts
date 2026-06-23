import { NextRequest, NextResponse } from 'next/server';
import { submitHubReview, getUserHubReviews } from '@/actions/hubActions';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });
    const reviews = await getUserHubReviews(userId);
    return NextResponse.json({ reviews });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await submitHubReview(body);
    return NextResponse.json(result, { status: result.success ? 201 : 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
