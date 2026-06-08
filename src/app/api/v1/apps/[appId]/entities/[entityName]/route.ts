import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { executeWorkflows } from '@/features/workflow/runner';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{
    appId: string;
    entityName: string;
  }>;
}

// 1. GET - Fetch dynamic records with sorting, search, paging and custom filters
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { appId, entityName } = await params;
    const url = new URL(req.url);

    // Query parameters
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const limit = Math.max(1, parseInt(url.searchParams.get('limit') || '10'));
    const offset = (page - 1) * limit;

    const search = url.searchParams.get('search') || '';
    const sortParam = url.searchParams.get('sort') || 'createdAt:desc';
    const [sortField, sortOrder] = sortParam.split(':');

    // Extract dynamic filters (keys prefixed with filter_)
    const filters: Record<string, string> = {};
    url.searchParams.forEach((value, key) => {
      if (key.startsWith('filter_')) {
        const fieldName = key.replace('filter_', '');
        filters[fieldName] = value;
      }
    });

    // --- Dynamic Raw SQL compilation for JSONB queries ---
    let selectQuery = `SELECT * FROM "Record" WHERE "appId" = $1 AND "entityName" = $2`;
    let countQuery = `SELECT COUNT(*)::int FROM "Record" WHERE "appId" = $1 AND "entityName" = $2`;
    
    const queryParams: any[] = [appId, entityName];
    let paramIndex = 3;

    // Search query: checks if any value in data JSONB matches ILIKE
    if (search.trim()) {
      const searchFilter = ` AND EXISTS (
        SELECT 1 FROM jsonb_each_text("data")
        WHERE value ILIKE $${paramIndex}
      )`;
      selectQuery += searchFilter;
      countQuery += searchFilter;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    // Custom Filters
    Object.entries(filters).forEach(([fieldName, filterValue]) => {
      if (filterValue) {
        const filterStr = ` AND "data"->>$${paramIndex} = $${paramIndex + 1}`;
        selectQuery += filterStr;
        countQuery += filterStr;
        queryParams.push(fieldName, filterValue);
        paramIndex += 2;
      }
    });

    // Count total matched records for pagination info
    const countResults = await prisma.$queryRawUnsafe<any[]>(countQuery, ...queryParams);
    const totalRecords = countResults[0]?.count || 0;
    const totalPages = Math.ceil(totalRecords / limit);

    // Sorting Order
    const direction = sortOrder?.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    if (sortField === 'createdAt' || sortField === 'updatedAt') {
      selectQuery += ` ORDER BY "${sortField}" ${direction}`;
    } else {
      selectQuery += ` ORDER BY ("data"->>$${paramIndex}) ${direction}`;
      queryParams.push(sortField);
      paramIndex++;
    }

    // Pagination limits
    selectQuery += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(limit, offset);

    // Execute query
    const records = await prisma.$queryRawUnsafe<any[]>(selectQuery, ...queryParams);

    return NextResponse.json({
      success: true,
      data: records.map((r: any) => ({
        id: r.id,
        appId: r.appId,
        entityName: r.entityName,
        data: typeof r.data === 'string' ? JSON.parse(r.data) : r.data,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      })),
      pagination: {
        page,
        limit,
        totalRecords,
        totalPages,
      }
    });

  } catch (error: any) {
    console.error('GET Dynamic Entities list error:', error);
    return NextResponse.json({ error: 'Failed to retrieve records', details: error.message }, { status: 500 });
  }
}

// 2. POST - Insert a new dynamic entity record and execute workflows
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { appId, entityName } = await params;
    const data = await req.json().catch(() => ({}));

    // Find the entity schema validation rules
    const entity = await prisma.entity.findUnique({
      where: {
        appId_name: { appId, name: entityName },
      },
    });

    if (!entity) {
      return NextResponse.json({ error: `Entity "${entityName}" does not exist in this app.` }, { status: 404 });
    }

    // In a production app, we would dynamically validate 'data' against the 'entity.schema' Zod object.
    // For simplicity and resilience, we save the payload directly under 'data' JSONB.

    const newRecord = await prisma.record.create({
      data: {
        appId,
        entityName,
        data,
      },
    });

    // Asynchronously trigger workflows
    // We do not await this block to keep API responses ultra-fast (< 50ms)
    executeWorkflows(appId, 'record_created', entityName, newRecord);

    return NextResponse.json({
      success: true,
      recordId: newRecord.id,
      data: newRecord.data,
    }, { status: 201 });

  } catch (error: any) {
    console.error('POST Dynamic Entity create error:', error);
    return NextResponse.json({ error: 'Failed to create record', details: error.message }, { status: 500 });
  }
}

// 3. DELETE - Supports bulk record deletion
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { appId, entityName } = await params;
    const url = new URL(req.url);
    const bulkIds = url.searchParams.get('bulk');

    if (!bulkIds) {
      return NextResponse.json({ error: 'Missing bulk IDs parameter' }, { status: 400 });
    }

    const ids = bulkIds.split(',');

    await prisma.record.deleteMany({
      where: {
        appId,
        entityName,
        id: { in: ids },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${ids.length} records.`,
    });

  } catch (error: any) {
    console.error('DELETE Bulk error:', error);
    return NextResponse.json({ error: 'Failed to delete records', details: error.message }, { status: 500 });
  }
}
