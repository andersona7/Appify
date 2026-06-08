import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { AppMetadata } from '@/types';
import { AppMetadataSchema } from './schema';

export class AIGeneratorService {
  private openai: OpenAI | null = null;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    const isMockKey = !apiKey || apiKey.startsWith('sk-mock') || apiKey === '';
    
    if (!isMockKey) {
      this.openai = new OpenAI({ apiKey });
    }
  }

  /**
   * Generates a full application metadata structure from a natural language prompt
   */
  async generateApp(prompt: string): Promise<AppMetadata> {
    console.log(`AI App Generation requested for prompt: "${prompt}"`);

    // Check if we need to fall back to the mock generator
    if (!this.openai) {
      console.log('OpenAI API Key is missing or mock; using local dynamic app compiler.');
      return this.compileMockApp(prompt);
    }

    try {
      const response = await this.openai.chat.completions.parse({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert software architect, database designer, and full-stack systems engineer.
Generate a complete application metadata structure according to the provided JSON schema based on the user's requirements.
Ensure the entities contain clean fields, logical select options, standard page slugs, dashboards with meaningful chart configs, and active workflows.
All entity names and field names MUST be lowercase alphanumeric with underscores only (e.g. first_name, customer_lead).
Page slugs must be URL-safe (lowercase and hyphens only).`,
          },
          { role: 'user', content: prompt },
        ],
        response_format: zodResponseFormat(AppMetadataSchema, 'appMetadata'),
        timeout: 25000, // 25 seconds timeout
      });

      const result = response.choices[0].message.parsed;
      if (!result) {
        throw new Error('LLM failed to return a parsed metadata object');
      }

      console.log(`Successfully generated metadata for: ${result.appName}`);
      return result as AppMetadata;
    } catch (error: any) {
      console.error('Error calling OpenAI Structured Outputs, falling back to local compiler:', error.message);
      return this.compileMockApp(prompt);
    }
  }

  /**
   * Local compiler that generates customized application metadata based on keyword mapping
   */
  private compileMockApp(prompt: string): AppMetadata {
    const lowercasePrompt = prompt.toLowerCase();

    // 1. CRM / Sales App Fallback
    if (lowercasePrompt.includes('crm') || lowercasePrompt.includes('sales') || lowercasePrompt.includes('lead') || lowercasePrompt.includes('pipeline')) {
      return {
        appName: 'Salesflow CRM',
        description: 'A comprehensive CRM for managing leads, contacts, deals, and sales pipelines dynamically.',
        entities: [
          {
            name: 'lead',
            displayName: 'Lead',
            fields: [
              { name: 'company', label: 'Company Name', type: 'text', required: true },
              { name: 'contact_name', label: 'Contact Person', type: 'text', required: true },
              { name: 'email', label: 'Email Address', type: 'email', required: true },
              { name: 'status', label: 'Lead Status', type: 'select', required: true, options: ['New', 'Contacted', 'Proposal Sent', 'Negotiating', 'Won', 'Lost'], defaultValue: 'New' },
              { name: 'estimated_value', label: 'Deal Value ($)', type: 'number', required: false, defaultValue: '0' },
              { name: 'notes', label: 'Notes', type: 'textarea', required: false },
            ],
          },
          {
            name: 'contact',
            displayName: 'Contact',
            fields: [
              { name: 'first_name', label: 'First Name', type: 'text', required: true },
              { name: 'last_name', label: 'Last Name', type: 'text', required: true },
              { name: 'email', label: 'Email', type: 'email', required: true },
              { name: 'phone', label: 'Phone Number', type: 'text', required: false },
              { name: 'job_title', label: 'Job Title', type: 'text', required: false },
            ],
          },
          {
            name: 'task',
            displayName: 'Sales Task',
            fields: [
              { name: 'title', label: 'Task Subject', type: 'text', required: true },
              { name: 'due_date', label: 'Due Date', type: 'date', required: true },
              { name: 'priority', label: 'Priority', type: 'select', required: true, options: ['Low', 'Medium', 'High'], defaultValue: 'Medium' },
              { name: 'status', label: 'Task Status', type: 'select', required: true, options: ['Todo', 'In Progress', 'Completed'], defaultValue: 'Todo' },
            ],
          },
        ],
        pages: [
          {
            slug: 'dashboard',
            title: 'Sales Dashboard',
            components: [
              {
                type: 'dashboard',
                config: {
                  title: 'Sales Pipeline Overview',
                  description: 'Key performance metrics and pipeline value analysis.',
                  metrics: [
                    { label: 'Total Leads', entity: 'lead', operation: 'count' },
                    { label: 'Total Value', entity: 'lead', operation: 'sum', field: 'estimated_value' },
                    { label: 'Tasks Pending', entity: 'task', operation: 'count' },
                  ],
                },
              },
              {
                type: 'chart',
                entity: 'lead',
                config: {
                  title: 'Lead Status Distribution',
                  chartType: 'bar',
                  columns: ['status'],
                },
              },
            ],
          },
          {
            slug: 'leads',
            title: 'Manage Leads',
            components: [
              {
                type: 'table',
                entity: 'lead',
                config: {
                  title: 'All Leads',
                  columns: ['company', 'contact_name', 'email', 'status', 'estimated_value'],
                  allowSearch: true,
                  allowFilters: true,
                },
              },
              {
                type: 'form',
                entity: 'lead',
                config: {
                  title: 'New Lead Registration',
                },
              },
            ],
          },
          {
            slug: 'contacts',
            title: 'Customer Directory',
            components: [
              {
                type: 'table',
                entity: 'contact',
                config: {
                  title: 'Contacts List',
                  columns: ['first_name', 'last_name', 'email', 'phone', 'job_title'],
                  allowSearch: true,
                },
              },
              {
                type: 'form',
                entity: 'contact',
                config: {
                  title: 'Create Contact',
                },
              },
            ],
          },
          {
            slug: 'tasks',
            title: 'Follow-ups & Tasks',
            components: [
              {
                type: 'table',
                entity: 'task',
                config: {
                  title: 'Your Tasks',
                  columns: ['title', 'due_date', 'priority', 'status'],
                  allowSearch: true,
                  allowFilters: true,
                },
              },
              {
                type: 'form',
                entity: 'task',
                config: {
                  title: 'Schedule Task',
                },
              },
            ],
          },
        ],
        workflows: [
          {
            name: 'Assign Default Task on Lead Creation',
            trigger: { type: 'record_created', entity: 'lead' },
            conditions: [],
            actions: [
              {
                type: 'create_record',
                targetEntity: 'task',
                data: {
                  title: 'Follow up with new lead',
                  priority: 'High',
                  status: 'Todo',
                },
              },
            ],
          },
        ],
      };
    }

    // 2. Project Task Manager Fallback
    if (lowercasePrompt.includes('task') || lowercasePrompt.includes('project') || lowercasePrompt.includes('todo') || lowercasePrompt.includes('kanban')) {
      return {
        appName: 'TaskSync Manager',
        description: 'A dynamic task management system for tracking projects, tasks, timelines, and priorities.',
        entities: [
          {
            name: 'project',
            displayName: 'Project',
            fields: [
              { name: 'name', label: 'Project Name', type: 'text', required: true },
              { name: 'description', label: 'Description', type: 'textarea', required: false },
              { name: 'status', label: 'Project Status', type: 'select', required: true, options: ['Planning', 'Active', 'Completed', 'On Hold'], defaultValue: 'Planning' },
              { name: 'start_date', label: 'Start Date', type: 'date', required: false },
            ],
          },
          {
            name: 'task',
            displayName: 'Task',
            fields: [
              { name: 'title', label: 'Task Title', type: 'text', required: true },
              { name: 'priority', label: 'Priority', type: 'select', required: true, options: ['Low', 'Medium', 'High', 'Critical'], defaultValue: 'Medium' },
              { name: 'status', label: 'Status', type: 'select', required: true, options: ['Todo', 'In Progress', 'Testing', 'Completed'], defaultValue: 'Todo' },
              { name: 'assigned_to', label: 'Assignee Email', type: 'email', required: false },
              { name: 'hours_estimate', label: 'Estimated Hours', type: 'number', required: false, defaultValue: '2' },
            ],
          },
        ],
        pages: [
          {
            slug: 'dashboard',
            title: 'Project Overview',
            components: [
              {
                type: 'dashboard',
                config: {
                  title: 'Task Execution Metrics',
                  description: 'Summary of project workloads and task statuses.',
                  metrics: [
                    { label: 'Active Projects', entity: 'project', operation: 'count' },
                    { label: 'Pending Tasks', entity: 'task', operation: 'count' },
                  ],
                },
              },
              {
                type: 'chart',
                entity: 'task',
                config: {
                  title: 'Tasks by Priority',
                  chartType: 'pie',
                  columns: ['priority'],
                },
              },
            ],
          },
          {
            slug: 'projects',
            title: 'Projects',
            components: [
              {
                type: 'table',
                entity: 'project',
                config: {
                  title: 'All Projects',
                  columns: ['name', 'status', 'start_date'],
                  allowSearch: true,
                },
              },
              {
                type: 'form',
                entity: 'project',
                config: {
                  title: 'Add New Project',
                },
              },
            ],
          },
          {
            slug: 'tasks',
            title: 'Tasks List',
            components: [
              {
                type: 'table',
                entity: 'task',
                config: {
                  title: 'All Project Tasks',
                  columns: ['title', 'priority', 'status', 'assigned_to', 'hours_estimate'],
                  allowSearch: true,
                  allowFilters: true,
                },
              },
              {
                type: 'form',
                entity: 'task',
                config: {
                  title: 'Create New Task',
                },
              },
            ],
          },
        ],
        workflows: [
          {
            name: 'Notify Completed Task',
            trigger: { type: 'record_updated', entity: 'task' },
            conditions: [
              { field: 'status', operator: 'equals', value: 'Completed' },
            ],
            actions: [
              {
                type: 'notification',
                data: {
                  subject: 'Task Completed!',
                  body: 'A task status has transitioned to Completed.',
                },
              },
            ],
          },
        ],
      };
    }

    // 3. Generic Catch-All App Compiler
    const cleanAppName = prompt.trim().split(/\s+/).slice(0, 3).join(' ') || 'Custom Hub';
    return {
      appName: cleanAppName,
      description: `A custom-tailored application matching your request for: "${prompt}"`,
      entities: [
        {
          name: 'item',
          displayName: 'Item Record',
          fields: [
            { name: 'name', label: 'Item Name', type: 'text', required: true },
            { name: 'description', label: 'Description', type: 'textarea', required: false },
            { name: 'status', label: 'Status', type: 'select', required: true, options: ['Draft', 'Active', 'Archived'], defaultValue: 'Draft' },
            { name: 'created_date', label: 'Date Registered', type: 'date', required: true },
          ],
        },
      ],
      pages: [
        {
          slug: 'dashboard',
          title: 'Analytics Dashboard',
          components: [
            {
              type: 'dashboard',
              config: {
                title: 'Item Record Analytics',
                metrics: [
                  { label: 'Total Records', entity: 'item', operation: 'count' },
                ],
              },
            },
          ],
        },
        {
          slug: 'items',
          title: 'Item Records',
          components: [
            {
              type: 'table',
              entity: 'item',
              config: {
                title: 'Records List',
                columns: ['name', 'description', 'status', 'created_date'],
                allowSearch: true,
                allowFilters: true,
              },
            },
            {
              type: 'form',
              entity: 'item',
              config: {
                title: 'Register New Record',
              },
            },
          ],
        },
      ],
      workflows: [],
    };
  }
}
