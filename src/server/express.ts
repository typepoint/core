import * as express from 'express';
import * as httpStatusCodes from 'http-status-codes';

import { EndpointContext, EndpointHandler, Request, Response, Router, UnprotectedRouter, IEndpointHandler } from '../server';
import { cleanseHttpMethod } from '../shared/http';
import { combineMiddlewares } from './express/middleware';
import { StrongPointExpressRequest } from './express/strongPointExpressRequest';
import { StrongPointExpressResponse } from './express/strongPointExpressResponse';
import { HandlerMatchIterator } from './middlewareHelper';

export interface ToMiddlewareOptions {
  expressMiddlewares?: express.RequestHandler[];
  log?: (...args: any[]) => void;
}

export function toMiddleware(router: Router, options?: ToMiddlewareOptions): express.RequestHandler {

  // tslint:disable-next-line:no-empty
  const noop = () => { };

  const log = (options && options.log) || noop;

  const handlersMiddleware: express.RequestHandler = async (
    req: express.Request, res: express.Response, next: express.NextFunction
  ) => {
    let context: EndpointContext<any, any, any> | undefined;

    try {
      const request = new StrongPointExpressRequest(req);
      const response = new StrongPointExpressResponse(res);
      context = { request, response };
    } catch (err) {
      log('Error constructing context: ', err);
      res.statusCode = httpStatusCodes.INTERNAL_SERVER_ERROR;
      res.end();
    }

    if (!context) {
      return;
    }

    try {
      const allHandlers: IEndpointHandler[] = [
        ...router.getMiddlewares(),
        ...router.getHandlers()
      ];

      const handlerMatchIterator = new HandlerMatchIterator(allHandlers, {
        method: cleanseHttpMethod(req.method),
        url: req.url
      });

      const executeNextHandler = async () => {
        const handlerMatch = handlerMatchIterator.getNextMatch();
        if (context && handlerMatch) {
          context.request.params = handlerMatch.parsedUrl.params;
          const type = handlerMatch.type;
          const handlerName = handlerMatch.handler.name;
          if (handlerName) {
            log(`Executing ${ type }: ${ handlerName }`);
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
      if (!context.response.hasFlushedHeaders) {
        context.response.statusCode = httpStatusCodes.INTERNAL_SERVER_ERROR;
        context.response.body = err && err.message;
        context.response.flush();
      }
    } finally {
      res.end();
    }
  };

  const allMiddleware: express.Handler[] = [
    ...(options && options.expressMiddlewares) || [],
    handlersMiddleware
  ];

  const combinedMiddleware = combineMiddlewares(allMiddleware);

  return combinedMiddleware;
}
