import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { Octokit } from 'octokit';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{
    appId: string;
  }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { appId } = await params;
    const { githubToken, repoName: requestedRepoName } = await req.json();

    const app = await prisma.app.findUnique({
      where: { id: appId },
      include: {
        entities: true,
        pages: true,
        workflows: true,
      },
    });

    if (!app) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    const repoName = requestedRepoName || app.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    // 1. COMPILE STANDALONE CODE FILES
    const files: Record<string, string> = {};

    // package.json
    files['package.json'] = JSON.stringify({
      name: repoName,
      version: '0.1.0',
      private: true,
      scripts: {
        dev: 'next dev',
        build: 'next build',
        start: 'next start',
        postinstall: 'prisma generate'
      },
      dependencies: {
        next: '15.0.0',
        react: '19.0.0',
        'react-dom': '19.0.0',
        '@prisma/client': '^5.0.0',
        'lucide-react': '^0.300.0',
        zod: '^3.0.0',
        'react-hook-form': '^7.0.0',
        '@hookform/resolvers': '^3.0.0'
      },
      devDependencies: {
        typescript: '^5.0.0',
        '@types/node': '^20.0.0',
        '@types/react': '^19.0.0',
        tailwindcss: '^4.0.0',
        prisma: '^5.0.0'
      }
    }, null, 2);

    // prisma/schema.prisma (DEDICATED POSTGRESQL TABLES)
    let prismaSchema = `datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}
`;

    app.entities.forEach((entity: any) => {
      const fields = typeof entity.schema === 'string' ? JSON.parse(entity.schema) : entity.schema;
      prismaSchema += `\nmodel ${entity.displayName.replace(/\s+/g, '')} {
  id        String   @id @default(uuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt\n`;

      fields.forEach((field: any) => {
        let typeStr = 'String';
        if (field.type === 'number') typeStr = 'Float';
        if (field.type === 'checkbox') typeStr = 'Boolean';
        if (field.type === 'date') typeStr = 'DateTime';
        
        prismaSchema += `  ${field.name} ${typeStr}${field.required ? '' : '?'}\n`;
      });

      prismaSchema += `}\n`;
    });

    files['prisma/schema.prisma'] = prismaSchema;

    // README.md
    files['README.md'] = `# ${app.name}

This application was compiled and exported using the Antigravity App Generator.

## Getting Started

1. Clone this repository.
2. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`
3. Set up your database environment variables in a \`.env\` file:
   \`\`\`env
   DATABASE_URL="postgresql://user:password@localhost:5432/dbname"
   \`\`\`
4. Push the database schema:
   \`\`\`bash
   npx prisma db push
   \`\`\`
5. Start the development server:
   \`\`\`bash
   npm run dev
   \`\`\`
`;

    // 2. EXPORT ROUTINE (Live GitHub API or Mock preview fallback)
    const isMockToken = !githubToken || githubToken.startsWith('ghp_mock');
    
    if (isMockToken) {
      console.log(`Exporting app ${appId} in dry-run mode (Mock Token).`);
      return NextResponse.json({
        success: true,
        dryRun: true,
        repoName,
        message: 'Compilation complete! In production, this pushes directly to your repository.',
        files: Object.keys(files).reduce((acc, key) => {
          acc[key] = files[key].substring(0, 400) + (files[key].length > 400 ? '\n... (truncated)' : '');
          return acc;
        }, {} as Record<string, string>)
      });
    }

    // Live Push using Octokit
    const octokit = new Octokit({ auth: githubToken });
    
    // Get authenticated user details
    const { data: user } = await octokit.rest.users.getAuthenticated();
    const owner = user.login;

    // Create Repository
    try {
      await octokit.rest.repos.createForAuthenticatedUser({
        name: repoName,
        private: true,
        description: app.description || 'Exported dynamic Next.js application.',
      });
      console.log(`Created new private repository: ${owner}/${repoName}`);
    } catch (createErr: any) {
      // If repository already exists, continue pushing
      if (createErr.status !== 422) {
        throw createErr;
      }
      console.log(`Repository ${owner}/${repoName} already exists, committing to active repository.`);
    }

    // Commit files
    for (const [path, content] of Object.entries(files)) {
      try {
        // Check if file exists to get its sha (updating file)
        let sha: string | undefined;
        try {
          const { data: fileData } = await octokit.rest.repos.getContent({
            owner,
            repo: repoName,
            path,
          });
          if (!Array.isArray(fileData)) {
            sha = fileData.sha;
          }
        } catch (contentErr) {}

        await octokit.rest.repos.createOrUpdateFileContents({
          owner,
          repo: repoName,
          path,
          message: `chore: export ${path} from app generator`,
          content: Buffer.from(content).toString('base64'),
          sha,
        });
      } catch (fileErr: any) {
        console.error(`Error committing file ${path}:`, fileErr.message);
      }
    }

    return NextResponse.json({
      success: true,
      repoUrl: `https://github.com/pages/${owner}/${repoName}`,
      message: `Successfully created and pushed source code repository to ${owner}/${repoName}!`,
    });

  } catch (error: any) {
    console.error('GitHub export error:', error);
    return NextResponse.json({ error: 'Failed to export codebase to GitHub', details: error.message }, { status: 500 });
  }
}
