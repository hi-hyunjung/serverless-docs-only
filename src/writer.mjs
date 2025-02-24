'use strict';

import fs from 'fs';
import yaml from 'js-yaml';
import path from 'path';

function resolveFilePath(outputFile) {
  const fullPath = path.resolve(outputFile || 'swagger.yaml');
  const outputPath = path.dirname(fullPath);
  const fileNameWithExt = path.basename(fullPath);
  const ext = path.extname(fileNameWithExt).slice(1) || 'yaml';
  const fileName = path.basename(fileNameWithExt, path.extname(fileNameWithExt));

  return { outputPath, fileName, outputFileFormat: ext };
}

function formatSwaggerContent(data, format = 'yaml') {
  if (format === 'json') {
    return JSON.stringify(data, null, 2);
  } else {
    return yaml.dump(data);
  }
}

export default function writeFileStream(outputFile, data) {
  return new Promise((resolve, reject) => {
    const { outputPath, fileName, outputFileFormat } = resolveFilePath(outputFile);
    const filePath = path.join(outputPath, `${fileName}.${outputFileFormat}`);
    const formattedData = formatSwaggerContent(data, outputFileFormat);

    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath, { recursive: true });
    }

    const writeStream = fs.createWriteStream(filePath, { encoding: 'utf8' });

    writeStream.write(formattedData);
    writeStream.end();

    writeStream.on('finish', () => {
      console.log(`File saved successfully at ${filePath}`);
      resolve();
    });

    writeStream.on('error', (err) => {
      console.error('Error writing file:', err);
      reject(err);
    });
  });
}
