import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { executeWorkflows } from '@/features/workflow/runner';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{
    appId: string;
    entityName: string;
    recordId: string;
  }>;
}

// 1. GET - Fetch a single dynamic entity record
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { appId, entityName, recordId } = await params;

    const record = await prisma.record.findUnique({
      where: { id: recordId },
    });

    if (!record || record.appId !== appId || record.entityName !== entityName) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: record.id,
        appId: record.appId,
        entityName: record.entityName,
        data: typeof record.data === 'string' ? JSON.parse(record.data) : record.data,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      },
    });

  } catch (error: any) {
    console.error('GET Single Record error:', error);
    return NextResponse.json({ error: 'Failed to retrieve record', details: error.message }, { status: 500 });
  }
}

// 2. PUT - Update a dynamic record and evaluate update workflows (transitions)
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const { appId, entityName, recordId } = await params;
    const bodyData = await req.json().catch(() => ({}));

    // Find the current record state to pass as the "old state" in status checks
    const oldRecord = await prisma.record.findUnique({
      where: { id: recordId },
    });

    if (!oldRecord || oldRecord.appId !== appId || oldRecord.entityName !== entityName) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    // Merge or completely overwrite details depending on custom fields
    const updatedRecord = await prisma.record.update({
      where: { id: recordId },
      data: {
        data: bodyData,
      },
    });

    // Run updated workflows asynchronously
    executeWorkflows(appId, 'record_updated', entityName, updatedRecord, oldRecord);

    return NextResponse.json({
      success: true,
      data: updatedRecord.data,
      message: 'Record updated successfully.',
    });

  } catch (error: any) {
    console.error('PUT Update Record error:', error);
    return NextResponse.json({ error: 'Failed to update record', details: error.message }, { status: 500 });
  }
}

// 3. DELETE - Delete single record and evaluate workflows
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { appId, entityName, recordId } = await params;

    const oldRecord = await prisma.record.findUnique({
      where: { id: recordId },
    });

    if (!oldRecord || oldRecord.appId !== appId || oldRecord.entityName !== entityName) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    await prisma.record.delete({
      where: { id: recordId },
    });

    // Trigger deleted workflows
    executeWorkflows(appId, 'record_deleted', entityName, oldRecord);

    return NextResponse.json({
      success: true,
      message: 'Record deleted successfully.',
    });

  } catch (error: any) {
    console.error('DELETE Record error:', error);
    return NextResponse.json({ error: 'Failed to delete record', details: error.message }, { status: 500 });
  }
}
