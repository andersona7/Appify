// Base types for dynamically generated applications

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'email'
  | 'password'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'date'
  | 'file';

export interface FieldMetadata {
  name: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[]; // Used for select/radio/checkbox
  defaultValue?: string;
}

export interface EntityMetadata {
  name: string;
  displayName: string;
  fields: FieldMetadata[];
}

export type ComponentType = 'form' | 'table' | 'chart' | 'dashboard' | 'card';

export interface ComponentMetadata {
  type: ComponentType;
  entity?: string; // Target entity (e.g. "lead")
  config?: {
    title?: string;
    description?: string;
    chartType?: 'line' | 'bar' | 'pie';
    metrics?: Array<{
      label: string;
      entity: string;
      operation: 'count' | 'sum' | 'avg';
      field?: string;
    }>;
    columns?: string[]; // visible columns
    defaultSort?: string;
    allowSearch?: boolean;
    allowFilters?: boolean;
  };
}

export interface PageMetadata {
  slug: string;
  title: string;
  components: ComponentMetadata[];
}

export interface WorkflowMetadata {
  name: string;
  trigger: {
    type: 'record_created' | 'record_updated' | 'record_deleted';
    entity: string;
  };
  conditions: Array<{
    field: string;
    operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
    value: string;
  }>;
  actions: Array<{
    type: 'send_email' | 'create_record' | 'update_record' | 'notification';
    targetEntity?: string; // used for creating secondary records
    data?: Record<string, string>; // mapping or email template info
  }>;
}

export interface AppMetadata {
  appName: string;
  description: string;
  entities: EntityMetadata[];
  pages: PageMetadata[];
  workflows: WorkflowMetadata[];
}

// User role management
export type UserRole = 'ADMIN' | 'MANAGER' | 'USER';

export interface UserSession {
  id: string;
  name?: string;
  email: string;
  role: UserRole;
  tenantId: string;
}
