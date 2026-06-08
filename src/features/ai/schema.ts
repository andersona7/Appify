import { z } from 'zod';

export const FieldTypeSchema = z.enum([
  'text',
  'textarea',
  'number',
  'email',
  'password',
  'select',
  'radio',
  'checkbox',
  'date',
  'file',
]);

export const FieldMetadataSchema = z.object({
  name: z
    .string()
    .min(1)
    .regex(/^[a-z_][a-z0-9_]*$/, {
      message: 'Field name must be lowercase alphanumeric starting with a letter or underscore (e.g. first_name)',
    }),
  label: z.string().min(1),
  type: FieldTypeSchema,
  required: z.boolean().default(false),
  options: z.array(z.string()).optional(),
  defaultValue: z.string().optional(),
});

export const EntityMetadataSchema = z.object({
  name: z
    .string()
    .min(1)
    .regex(/^[a-z_][a-z0-9_]*$/, {
      message: 'Entity name must be lowercase alphanumeric starting with a letter or underscore (e.g. customer_lead)',
    }),
  displayName: z.string().min(1),
  fields: z.array(FieldMetadataSchema).min(1, 'Entities must have at least one field'),
});

export const ComponentTypeSchema = z.enum(['form', 'table', 'chart', 'dashboard', 'card']);

export const ComponentMetadataSchema = z.object({
  type: ComponentTypeSchema,
  entity: z.string().optional(),
  config: z
    .object({
      title: z.string().optional(),
      description: z.string().optional(),
      chartType: z.enum(['line', 'bar', 'pie']).optional(),
      metrics: z
        .array(
          z.object({
            label: z.string(),
            entity: z.string(),
            operation: z.enum(['count', 'sum', 'avg']),
            field: z.string().optional(),
          })
        )
        .optional(),
      columns: z.array(z.string()).optional(),
      defaultSort: z.string().optional(),
      allowSearch: z.boolean().optional(),
      allowFilters: z.boolean().optional(),
    })
    .optional(),
});

export const PageMetadataSchema = z.object({
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, {
      message: 'Slug must be URL-friendly (lowercase, numbers, and hyphens, e.g. lead-details)',
    }),
  title: z.string().min(1),
  components: z.array(ComponentMetadataSchema).min(1, 'Pages must contain at least one component'),
});

export const WorkflowMetadataSchema = z.object({
  name: z.string().min(1),
  trigger: z.object({
    type: z.enum(['record_created', 'record_updated', 'record_deleted']),
    entity: z.string(),
  }),
  conditions: z
    .array(
      z.object({
        field: z.string(),
        operator: z.enum(['equals', 'not_equals', 'contains', 'greater_than', 'less_than']),
        value: z.string(),
      })
    )
    .default([]),
  actions: z
    .array(
      z.object({
        type: z.enum(['send_email', 'create_record', 'update_record', 'notification']),
        targetEntity: z.string().optional(),
        data: z.record(z.string(), z.string()).optional(),
      })
    )
    .min(1, 'Workflows must contain at least one action'),
});

export const AppMetadataSchema = z.object({
  appName: z.string().min(2, 'App name must be at least 2 characters'),
  description: z.string().min(5, 'App description must be at least 5 characters'),
  entities: z.array(EntityMetadataSchema).min(1, 'App must define at least one entity'),
  pages: z.array(PageMetadataSchema).min(1, 'App must define at least one page'),
  workflows: z.array(WorkflowMetadataSchema).default([]),
});
