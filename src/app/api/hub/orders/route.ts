import { NextRequest, NextResponse } from 'next/server';
import { getHubOrders, createHubOrder } from '@/actions/hubActions';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filters = {
      query: searchParams.get('query') || undefined,
      city: searchParams.get('city') || undefined,
      category: searchParams.get('category') as any || undefined,
      budgetMin: searchParams.get('budgetMin') ? Number(searchParams.get('budgetMin')) : undefined,
      budgetMax: searchParams.get('budgetMax') ? Number(searchParams.get('budgetMax')) : undefined,
      sortBy: searchParams.get('sortBy') as any || undefined,
    };
    const orders = await getHubOrders(filters);
    return NextResponse.json({ orders });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await createHubOrder(body);
    return NextResponse.json(result, { status: result.success ? 201 : 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
