import * as fs from 'fs';
import { Logger } from '@aws-lambda-powertools/logger';
import { APIGatewayProxyHandler } from 'aws-lambda';

const logger = new Logger({
  logLevel: 'INFO',
});

const MSG = fs.readFileSync('./msg.txt', 'utf8');

export const handler: APIGatewayProxyHandler = async (para, _context)=> {
  logger.debug(`Receiving event ${JSON.stringify(para, null, 2)}.`);

  const result = {
    statusCode: 200,
    body: MSG,
    isBase64Encoded: false,
  };
  logger.debug(`response result is ${JSON.stringify(result, null, 2)}`);

  return result;
};