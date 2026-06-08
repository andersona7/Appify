import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{
    appId: string;
  }>;
}

// 1. GET - Fetch all workflows for an application
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { appId } = await params;
    const workflows = await prisma.workflow.findMany({
      where: { appId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: workflows.map((w: any) => ({
        id: w.id,
        name: w.name,
        trigger: typeof w.trigger === 'string' ? JSON.parse(w.trigger) : w.trigger,
        conditions: typeof w.conditions === 'string' ? JSON.parse(w.conditions) : w.conditions,
        actions: typeof w.actions === 'string' ? JSON.parse(w.actions) : w.actions,
        isActive: w.isActive,
        createdAt: w.createdAt,
      })),
    });
  } catch (error: any) {
    console.error('GET Workflows error:', error);
    return NextResponse.json({ error: 'Failed to retrieve workflows', details: error.message }, { status: 500 });
  }
}

// 2. POST - Create a new workflow rule
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { appId } = await params;
    const body = await req.json();

    const { name, trigger, conditions, actions } = body;

    if (!name || !trigger || !actions) {
      return NextResponse.json({ error: 'Missing required fields (name, trigger, actions)' }, { status: 400 });
    }

    const workflow = await prisma.workflow.create({
      data: {
        appId,
        name,
        trigger,
        conditions: conditions || [],
        actions,
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: workflow,
      message: 'Workflow created successfully.',
    });
  } catch (error: any) {
    console.error('POST Workflow error:', error);
    return NextResponse.json({ error: 'Failed to create workflow', details: error.message }, { status: 500 });
  }
}
