import { NextRequest, NextResponse } from 'next/server';
import { getHubOrderDetails, closeHubOrder } from '@/actions/hubActions';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const details = await getHubOrderDetails(id);
    if (!details) return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 });
    return NextResponse.json(details);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    if (body.action === 'close') {
      const result = await closeHubOrder(id);
      return NextResponse.json(result);
    }
    return NextResponse.json({ error: 'Неизвестное действие' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
