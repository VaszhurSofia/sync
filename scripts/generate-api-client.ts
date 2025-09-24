#!/usr/bin/env ts-node

/**
 * OpenAPI Client Generator
 * Generates TypeScript client from openapi.yaml
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const OPENAPI_SPEC_PATH = 'docs/openapi.yaml';
const TYPES_PACKAGE_PATH = 'packages/types';
const GENERATED_CLIENT_PATH = path.join(TYPES_PACKAGE_PATH, 'src/api-client.ts');
const GENERATED_TYPES_PATH = path.join(TYPES_PACKAGE_PATH, 'src/api-types.ts');

interface GenerationResult {
  success: boolean;
  error?: string;
  generatedFiles: string[];
  timestamp: string;
}

async function generateApiClient(): Promise<GenerationResult> {
  const timestamp = new Date().toISOString();
  const generatedFiles: string[] = [];

  try {
    console.log('🔍 Checking OpenAPI spec...');
    
    // Verify OpenAPI spec exists
    if (!fs.existsSync(OPENAPI_SPEC_PATH)) {
      throw new Error(`OpenAPI spec not found at ${OPENAPI_SPEC_PATH}`);
    }

    // Ensure types package directory exists
    if (!fs.existsSync(TYPES_PACKAGE_PATH)) {
      fs.mkdirSync(TYPES_PACKAGE_PATH, { recursive: true });
    }

    const srcDir = path.join(TYPES_PACKAGE_PATH, 'src');
    if (!fs.existsSync(srcDir)) {
      fs.mkdirSync(srcDir, { recursive: true });
    }

    console.log('📦 Installing openapi-generator if needed...');
    
    // Install openapi-generator if not present
    try {
      execSync('npx @openapitools/openapi-generator-cli version', { stdio: 'pipe' });
    } catch {
      console.log('Installing @openapitools/openapi-generator-cli...');
      execSync('npm install -g @openapitools/openapi-generator-cli', { stdio: 'inherit' });
    }

    console.log('🔧 Generating TypeScript client...');
    
    // Generate TypeScript client
    const generateCommand = [
      'npx @openapitools/openapi-generator-cli generate',
      `-i ${OPENAPI_SPEC_PATH}`,
      '-g typescript-axios',
      `-o ${TYPES_PACKAGE_PATH}/generated`,
      '--additional-properties=typescriptThreePlus=true,supportsES6=true,withInterfaces=true'
    ].join(' ');

    execSync(generateCommand, { stdio: 'inherit' });

    // Move generated files to our structure
    const generatedDir = path.join(TYPES_PACKAGE_PATH, 'generated');
    
    if (fs.existsSync(path.join(generatedDir, 'src'))) {
      // Copy generated files
      const generatedClient = path.join(generatedDir, 'src', 'api.ts');
      const generatedTypes = path.join(generatedDir, 'src', 'base.ts');
      
      if (fs.existsSync(generatedClient)) {
        fs.copyFileSync(generatedClient, GENERATED_CLIENT_PATH);
        generatedFiles.push(GENERATED_CLIENT_PATH);
      }
      
      if (fs.existsSync(generatedTypes)) {
        fs.copyFileSync(generatedTypes, GENERATED_TYPES_PATH);
        generatedFiles.push(GENERATED_TYPES_PATH);
      }
    }

    // Clean up generated directory
    if (fs.existsSync(generatedDir)) {
      fs.rmSync(generatedDir, { recursive: true, force: true });
    }

    // Create index file
    const indexContent = `/**
 * Generated API Client
 * Auto-generated from OpenAPI spec
 * Generated: ${timestamp}
 */

export * from './api-client';
export * from './api-types';
`;

    const indexPath = path.join(TYPES_PACKAGE_PATH, 'src', 'index.ts');
    fs.writeFileSync(indexPath, indexContent);
    generatedFiles.push(indexPath);

    // Update package.json
    const packageJsonPath = path.join(TYPES_PACKAGE_PATH, 'package.json');
    const packageJson = {
      name: '@sync/types',
      version: '1.0.0',
      description: 'Sync API types and client',
      main: 'dist/index.js',
      types: 'dist/index.d.ts',
      scripts: {
        build: 'tsc',
        'generate-client': 'ts-node ../../scripts/generate-api-client.ts'
      },
      dependencies: {
        'axios': '^1.6.0'
      },
      devDependencies: {
        '@types/node': '^20.0.0',
        'typescript': '^5.0.0'
      }
    };

    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    generatedFiles.push(packageJsonPath);

    // Create tsconfig.json
    const tsconfigContent = {
      compilerOptions: {
        target: 'ES2020',
        module: 'commonjs',
        lib: ['ES2020'],
        outDir: './dist',
        rootDir: './src',
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        declaration: true,
        declarationMap: true,
        sourceMap: true
      },
      include: ['src/**/*'],
      exclude: ['node_modules', 'dist']
    };

    const tsconfigPath = path.join(TYPES_PACKAGE_PATH, 'tsconfig.json');
    fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfigContent, null, 2));
    generatedFiles.push(tsconfigPath);

    console.log('✅ API client generated successfully!');
    console.log(`📁 Generated files: ${generatedFiles.length}`);
    
    return {
      success: true,
      generatedFiles,
      timestamp
    };

  } catch (error) {
    console.error('❌ Failed to generate API client:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      generatedFiles,
      timestamp
    };
  }
}

// Check for drift between OpenAPI spec and generated client
async function checkDrift(): Promise<boolean> {
  try {
    console.log('🔍 Checking for drift...');
    
    // Check if generated files exist
    if (!fs.existsSync(GENERATED_CLIENT_PATH) || !fs.existsSync(GENERATED_TYPES_PATH)) {
      console.log('⚠️ Generated client files not found - drift detected');
      return false;
    }

    // Check modification times
    const specStats = fs.statSync(OPENAPI_SPEC_PATH);
    const clientStats = fs.statSync(GENERATED_CLIENT_PATH);
    
    if (specStats.mtime > clientStats.mtime) {
      console.log('⚠️ OpenAPI spec is newer than generated client - drift detected');
      return false;
    }

    console.log('✅ No drift detected');
    return true;

  } catch (error) {
    console.error('❌ Error checking drift:', error);
    return false;
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'generate';

  switch (command) {
    case 'generate':
      const result = await generateApiClient();
      if (!result.success) {
        process.exit(1);
      }
      break;
      
    case 'check-drift':
      const noDrift = await checkDrift();
      if (!noDrift) {
        console.log('❌ Drift detected - run "npm run generate-client" to update');
        process.exit(1);
      }
      break;
      
    default:
      console.log('Usage: ts-node generate-api-client.ts [generate|check-drift]');
      process.exit(1);
  }
}

// Run main function if this file is executed directly
main().catch(console.error);
