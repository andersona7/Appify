import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { AIGeneratorService } from '@/features/ai/generator';
import { AppMetadataSchema } from '@/features/ai/schema';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { prompt, tenantId: requestedTenantId } = body;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'A prompt string is required in the request body.' }, { status: 400 });
    }

    // Resolve or create default Tenant for dev/mock purposes
    let tenantId = requestedTenantId;
    if (!tenantId) {
      const defaultTenant = await prisma.tenant.upsert({
        where: { id: 'default-tenant-id' },
        update: {},
        create: {
          id: 'default-tenant-id',
          name: 'Default Development Tenant',
        },
      });
      tenantId = defaultTenant.id;
    }

    // Call AI Generation Service
    const aiService = new AIGeneratorService();
    const rawMetadata = await aiService.generateApp(prompt);

    // Validate the schema using Zod
    const parsed = AppMetadataSchema.safeParse(rawMetadata);
    if (!parsed.success) {
      console.error('Metadata Zod validation failed:', parsed.error.format());
      return NextResponse.json({
        error: 'Generated application metadata did not conform to the platform schema.',
        details: parsed.error.format()
      }, { status: 422 });
    }

    const appMetadata = parsed.data;

    // Save app definition to PostgreSQL inside a database transaction
    const newApp = await prisma.$transaction(async (tx: any) => {
      // 1. Create the App
      const app = await tx.app.create({
        data: {
          name: appMetadata.appName,
          description: appMetadata.description,
          tenantId,
        },
      });

      // 2. Create Entities
      for (const entity of appMetadata.entities) {
        await tx.entity.create({
          data: {
            appId: app.id,
            name: entity.name,
            displayName: entity.displayName,
            schema: entity.fields as any, // json type
          },
        });
      }

      // 3. Create Pages
      for (const page of appMetadata.pages) {
        await tx.page.create({
          data: {
            appId: app.id,
            slug: page.slug,
            title: page.title,
            layout: page.components as any, // json type
          },
        });
      }

      // 4. Create Workflows
      for (const workflow of appMetadata.workflows) {
        await tx.workflow.create({
          data: {
            appId: app.id,
            name: workflow.name,
            trigger: workflow.trigger as any,
            conditions: workflow.conditions as any,
            actions: workflow.actions as any,
            isActive: true,
          },
        });
      }

      return app;
    }, {
      timeout: 10000, // 10 seconds transaction timeout
    });

    return NextResponse.json({
      success: true,
      appId: newApp.id,
      appName: newApp.name,
      message: 'Application generated and synchronized successfully!'
    });

  } catch (error: any) {
    console.error('Generation endpoint fatal error:', error);
    return NextResponse.json({
      error: 'Failed to process prompt and generate application database schema.',
      details: error.message
    }, { status: 500 });
  }
}
