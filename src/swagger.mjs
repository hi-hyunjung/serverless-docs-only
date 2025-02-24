'use strict';

function generateOpenAPIMetaData(documentation) {
  const defaultInfo = {
    title: 'OpenAPI Swagger Documentation',
    version: '1.0.0',
    description: 'Automatically generated API docuemntation via serverless-docs-only plugins',
  };

  if (!documentation.api) {
    return {
      openapi: '3.0.0',
      info: defaultInfo,
      servers: [],
      tags: [],
    };
  }
  return {
    openapi: '3.0.0',
    info: generateInfo(documentation.api.info, defaultInfo),
    servers: generateServers(documentation.api.servers),
    tags: generateTags(documentation.api.tags),
  };
}

function generateInfo(info = {}, defaultInfo) {
  return {
    title: info?.title || defaultInfo.title,
    version: info?.version || defaultInfo.version,
    description: info?.description || defaultInfo.description,
  };
}

function generateServers(servers) {
  if (!servers || !Array.isArray(servers)) {
    return [];
  }
  return servers.map((server) => ({
    url: server.url || 'https://default.example.com',
    description: server.description || 'Default server',
  }));
}

function generateTags(tags) {
  if (!tags || !Array.isArray(tags)) {
    return [];
  }
  return tags.map((tag) => ({
    name: tag.name || 'default',
    description: tag.description || 'Default tag description',
  }));
}

export default function generateMeta(documentation) {
  return generateOpenAPIMetaData(documentation);
}
