import * as express from 'express';

import * as httpStatusCodes from 'http-status-codes';
import { EndpointContext, EndpointHandler, Request, Response, Router, UnprotectedRouter } from '../server';
import { cleanseHttpMethod } from '../shared/http';
import { StrongPointExpressRequest } from './express/strongPointExpressRequest';
import { StrongPointExpressResponse } from './express/strongPointExpressResponse';
import { HandlerMatchIterator } from './middlewareHelper';

export interface ToMiddlewareOptions {
  log?: (...args: any[]) => void;
}

export function toMiddleware(router: Router, options?: ToMiddlewareOptions): express.RequestHandler {

  const noop = () => {
    //
  };
  const log = (options && options.log) || noop; // console.log;

  const middleware: express.RequestHandler = async (
    req: express.Request, res: express.Response, next: express.NextFunction
  ) => {
    const request = new StrongPointExpressRequest(req);
    const response = new StrongPointExpressResponse(res);

    const context: EndpointContext<any, any, any> = {
      request,
      response
    };

    try {
      const allHandlers = router.getHandlers();

      const handlerMatchIterator = new HandlerMatchIterator(allHandlers, {
        method: cleanseHttpMethod(req.method),
        url: req.url
      });

      const executeNextHandler = async () => {
        const handlerMatch = handlerMatchIterator.getNextMatch();
        if (handlerMatch) {
          context.request.params = handlerMatch.parsedUrl.params;
          const handlerName = handlerMatch.handler.constructor && handlerMatch.handler.constructor.name;
          if (handlerName) {
            log(`Executing handler: ${ handlerName }`);
          }
          await handlerMatch.handler.handle(context, executeNextHandler);
        }
      };

      await executeNextHandler();
      if (!context.response.hasFlushedHeaders && !context.response.statusCode) {
        context.response.statusCode = httpStatusCodes.NOT_FOUND;
      }
      context.response.flush();

    } catch (err) {
      log('ERROR: ', err);
      if (context.response.hasFlushedHeaders) {
        context.response.statusCode = httpStatusCodes.INTERNAL_SERVER_ERROR;
        context.response.body = err && err.message;
        context.response.flush();
      }
    } finally {
      res.end();
    }
  };

  return middleware;
}