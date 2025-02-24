'use strict';

import generateMeta from './swagger.mjs';
import fs from 'fs';
import path from 'path';
import writeFileStream from './writer.mjs';

class ServerlessDocsOnly {
  constructor(serverless, options) {
    // serverless, options, provider 기본 설정 저장함
    this.serverless = serverless;
    this.options = options;
    this.provider = 'aws';
    this.fs = fs;

    this.customVars = this.serverless.variables.service.custom; // serverless.yml에서 custom 섹션 가져옴
    // const naming = this.serverless.provider.aws.naming;
    // this.getMethodLogicalId = naming.getMethodLogicalId.bind(naming); // API GateWay의 메서드에 해당하는 cloudFormation logicalID반환
    // this.normalizePath = naming.normalizePath.bind(naming);

    this._beforeDeploy = this.beforeDeploy.bind(this);
    // this._download = downloadDocumentation.downloadDocumentation.bind(this);

    // Severless 특정 이벤트에서 실행할 함수 등록 commands:lifecycle
    this.hooks = {
      'before:package:finalize': this._beforeDeploy,
      'generateSwagger:generateSwagger': this._beforeDeploy, // TODO: geneateSwagger함수로 변경하기
    };

    // CLI에서 실행가능한 명령어 추가
    this.commands = {
      generateSwagger: {
        usage: 'Generate Swagger Docs for OpenAPI',
        lifecycleEvents: ['generateSwagger'],
        options: {
          outputFile: {
            required: false,
            default: 'swagger.yaml',
          },
        },
      },
    };
  }

  async beforeDeploy() {
    this.serverless.cli.log('Custom Plugin: beforeDeploy() running');

    this.customVars = this.serverless.variables.service.custom;
    if (!(this.customVars && this.customVars.documentation)) {
      this.serverless.cli.log('Custom Plugin: no documentation key in serverless.yml');
      return;
    }

    const ext = path.extname(this.options.outputFile).slice(1) || 'yaml';
    if (!['json', 'yaml'].includes(ext)) {
      this.serverless.cli.log(`Custom Plugin: ouputFile has invalid extensions: .${ext}. 'json' and 'yaml' only`);
      return;
    }

    this.serverless.cli.log('Custom Plugin: documentation key found');
    const swaggerMeta = generateMeta(this.customVars.documentation);
    await writeFileStream(this.options.outputFile, swaggerMeta);
  }
}

export default ServerlessDocsOnly;
