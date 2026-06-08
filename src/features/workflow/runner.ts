import { prisma } from '@/lib/db';
import { WorkflowMetadata } from '@/types';

/**
 * Workflow Runner Engine
 * Evaluates triggers, conditions, and executes workflows asynchronously
 */
export async function executeWorkflows(
  appId: string,
  triggerType: 'record_created' | 'record_updated' | 'record_deleted',
  entityName: string,
  record: any, // The current record (id, data, etc.)
  oldRecord?: any // The previous record state (for update checks)
) {
  try {
    // 1. Fetch active workflows matching the trigger
    const workflows = await prisma.workflow.findMany({
      where: {
        appId,
        isActive: true,
      },
    });

    const activeWorkflows = workflows.filter((w) => {
      const trigger = typeof w.trigger === 'string' ? JSON.parse(w.trigger) : w.trigger;
      return trigger && trigger.type === triggerType && trigger.entity === entityName;
    });

    if (activeWorkflows.length === 0) return;

    console.log(`Evaluating ${activeWorkflows.length} workflows for app ${appId} on event ${triggerType} [${entityName}]`);

    // Process each workflow
    for (const w of activeWorkflows) {
      const trigger = typeof w.trigger === 'string' ? JSON.parse(w.trigger) : w.trigger;
      const conditions = typeof w.conditions === 'string' ? JSON.parse(w.conditions) : w.conditions;
      const actions = typeof w.actions === 'string' ? JSON.parse(w.actions) : w.actions;

      // 2. Evaluate Conditions
      let conditionsPassed = true;

      if (Array.isArray(conditions) && conditions.length > 0) {
        for (const cond of conditions) {
          const currentValue = String(record.data?.[cond.field] || '');
          const expectedValue = String(cond.value || '');

          if (cond.operator === 'equals' && currentValue !== expectedValue) {
            conditionsPassed = false;
          } else if (cond.operator === 'not_equals' && currentValue === expectedValue) {
            conditionsPassed = false;
          } else if (cond.operator === 'contains' && !currentValue.includes(expectedValue)) {
            conditionsPassed = false;
          } else if (cond.operator === 'greater_than') {
            if (Number(currentValue) <= Number(expectedValue)) conditionsPassed = false;
          } else if (cond.operator === 'less_than') {
            if (Number(currentValue) >= Number(expectedValue)) conditionsPassed = false;
          }

          // Special check: status transition check (e.g. status changed to Completed)
          // We only want to run if it wasn't already at this value in the old record
          if (conditionsPassed && oldRecord && triggerType === 'record_updated') {
            const oldVal = String(oldRecord.data?.[cond.field] || '');
            if (oldVal === expectedValue && currentValue === expectedValue) {
              // Status was already "Completed", so don't re-trigger
              conditionsPassed = false;
            }
          }
        }
      }

      if (!conditionsPassed) {
        console.log(`Workflow "${w.name}" conditions check failed.`);
        continue;
      }

      console.log(`Workflow "${w.name}" conditions passed. Executing ${actions.length} actions.`);

      // 3. Execute Actions
      for (const action of actions) {
        try {
          if (action.type === 'send_email') {
            // Mock Email Sending
            console.log(`\n==================================================`);
            console.log(`MOCK EMAIL SENT:`);
            console.log(`Subject: ${action.data?.subject || 'Workflow Alert'}`);
            console.log(`Body: ${action.data?.body || 'A workflow condition was met.'}`);
            console.log(`Target: Record ID ${record.id}`);
            console.log(`==================================================\n`);
          } 
          
          else if (action.type === 'notification') {
            // Create in-app log notification output
            console.log(`[Notification Alert]: "${w.name}" - ${action.data?.body}`);
          } 
          
          else if (action.type === 'create_record' && action.targetEntity) {
            // Create a child or related record in the database
            const mappedData: Record<string, any> = {};

            // Map static action data (evaluating defaults)
            if (action.data) {
              Object.entries(action.data).forEach(([key, val]) => {
                // If value references parent record data (e.g., "$parent.id")
                if (String(val).startsWith('$parent.')) {
                  const parentKey = String(val).replace('$parent.', '');
                  mappedData[key] = record.data?.[parentKey] || record[parentKey] || '';
                } else {
                  mappedData[key] = val;
                }
              });
            }

            // Always add a reference back to the parent if the field exists (e.g. lead_id)
            mappedData[`${entityName}_id`] = record.id;

            // Handle date defaults (like adding due date)
            if (!mappedData.due_date && action.targetEntity === 'task') {
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);
              mappedData.due_date = tomorrow.toISOString().split('T')[0];
            }

            await prisma.record.create({
              data: {
                appId,
                entityName: action.targetEntity,
                data: mappedData,
              },
            });
            console.log(`Workflow successfully created related "${action.targetEntity}" record.`);
          }
        } catch (actionErr: any) {
          console.error(`Error executing action in workflow ${w.name}:`, actionErr.message);
        }
      }
    }
  } catch (err: any) {
    console.error('Workflow Runner encountered a fatal error:', err.message);
  }
}
