'use strict';

import fs from 'fs';
import yaml from 'js-yaml';
import path from 'path';
import { fileURLToPath } from 'url';
import writeFileStream from './writer.mjs';

// CloudFormation `!Ref`, `!Sub`, `!GetAtt` 태그를 처리를 위해 커스텀 스키마 추가
const customSchema = yaml.DEFAULT_SCHEMA.extend([
  new yaml.Type('!Ref', { kind: 'scalar', construct: (data) => `REF:${data}` }),
  new yaml.Type('!Sub', { kind: 'scalar', construct: (data) => `SUB:${data}` }),
  new yaml.Type('!GetAtt', { kind: 'scalar', construct: (data) => `GETATT:${data}` }),
]);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function loadServerlessFunctions(serverlessConfigPath) {
  const serverlessConfig = yaml.load(fs.readFileSync(serverlessConfigPath, 'utf8'), { schema: customSchema });

  const functionFiles = serverlessConfig.functions;

  let processedFiles = [];

  functionFiles.forEach((filePath) => {
    const cleanedPath = filePath.replace('${file(', '').replace(')}', '');
    const resolvedPath = path.resolve(process.cwd(), cleanedPath);

    if (fs.existsSync(resolvedPath)) {
      const functionData = yaml.load(fs.readFileSync(resolvedPath, 'utf8'), { schema: customSchema });

      let validFunctionNames = [];

      Object.keys(functionData).forEach((functionName) => {
        const func = functionData[functionName];

        if (func.events) {
          const hasHttpEvents = func.events.some((event) => event.http);
          if (!hasHttpEvents) {
            return;
          }

          const hasHttpDocumentation = func.events.some((event) => event.http && event.http.documentation);

          if (hasHttpDocumentation) {
            validFunctionNames.push(functionName);
          }
        }
      });

      if (validFunctionNames.length > 0) {
        processedFiles.push({
          filePath: cleanedPath,
          functionNames: validFunctionNames,
        });
      }
    } else {
      console.warn('File NOT found:', resolvedPath);
    }
  });

  return processedFiles;
}

export function generatePaths(serverlessFunctions, outputFile, components, apiTags) {
  serverlessFunctions.forEach(({ filePath, functionNames }) => {
    const resolvedPath = path.resolve(process.cwd(), filePath);

    if (fs.existsSync(resolvedPath)) {
      console.log(`Processing file: ${resolvedPath}`);
      const functionData = yaml.load(fs.readFileSync(resolvedPath, 'utf8'));

      functionNames.forEach((functionName) => {
        const func = functionData[functionName];

        if (func.events) {
          func.events.forEach((event) => {
            if (!event.http || !event.http.documentation) {
              return;
            }

            const { path, method, documentation } = event.http;

            const pathData = {
              [path]: {
                [method]: {
                  summary: documentation?.summary || 'No summary provided',
                  description: documentation?.description || 'No description provided',
                  operationId: documentation?.operationId || path,
                  parameters: [],
                  responses: {
                    200: { description: 'Success' },
                    400: { description: 'Bad Request' },
                    500: { description: 'Internal Server Error' },
                  },
                },
              },
            };

            if (documentation?.requestHeaders) {
              documentation.requestHeaders.forEach((headerName) => {
                const headerConfig = components?.headers?.[headerName];

                if (headerConfig) {
                  pathData[path][method].parameters.push({
                    name: headerName,
                    in: 'header',
                    description: headerConfig.description || `Header parameter ${headerName}`,
                    required: headerConfig.required || false,
                    schema: headerConfig.schema || { type: 'string' },
                  });
                } else {
                  console.log(`Header not found in components: ${headerName}`);
                  pathData[path][method].parameters.push({
                    name: headerName,
                    in: 'header',
                    description: `Header parameter ${headerName}`,
                    required: false,
                    schema: { type: 'string' },
                  });
                }
              });
            }

            if (documentation?.tags) {
              const validTags = documentation.tags.filter((tag) => {
                const isValid = apiTags.some((apiTag) => apiTag.name === tag);
                if (!isValid) {
                  console.warn(`Tag '${tag}' is not found in custom.documentation.api.tags, skipping`);
                }
                return isValid;
              });

              if (validTags.length > 0) {
                pathData[path][method].tags = validTags;
              }
            }

            writeFileStream(outputFile, { paths: pathData }, true);
          });
        }
      });
    } else {
      console.warn(`File NOT found: ${resolvedPath}`);
    }
  });
}
