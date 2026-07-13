import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { QueryFailedError } from 'typeorm';
import { EntityNotFoundError } from 'typeorm/error/EntityNotFoundError';
import { CannotCreateEntityIdMapError } from 'typeorm/error/CannotCreateEntityIdMapError';

import { GlobalResponseError } from './global.response.error';

function getExceptionMessage(exception: any): string {
  if (typeof exception?.getResponse === 'function') {
    const response = exception.getResponse();
    if (typeof response === 'string') return response;
    if (response && typeof response === 'object') {
      const message = (response as any).message;
      if (Array.isArray(message)) return message.join(', ');
      if (typeof message === 'string') return message;
      if (typeof (response as any).error === 'string') {
        return (response as any).error;
      }
    }
  }

  if (typeof exception?.message === 'string') return exception.message;
  if (typeof exception?.message?.message === 'string') {
    return exception.message.message;
  }

  return 'Internal server error';
}

@Catch()
export class AppExceptionFilter
  extends BaseExceptionFilter
  implements ExceptionFilter
{
  constructor() {
    super();
  }

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    let message = getExceptionMessage(exception);
    let code = 'HttpException';
    let status = HttpStatus.INTERNAL_SERVER_ERROR;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      if (exception instanceof ForbiddenException) {
        code = 'Forbidden access to resource';
      }
      if (!Number.isInteger(status) || status < 100 || status >= 600) {
        status = HttpStatus.INTERNAL_SERVER_ERROR;
      }
    } else {
      switch (exception.constructor) {
        case QueryFailedError: // this is a TypeOrm error
          status = HttpStatus.UNPROCESSABLE_ENTITY;
          code = (exception as any).code;
          message = (exception as QueryFailedError).message;
          if (message.includes('duplicate key value violates')) {
            const qfe: any = exception;
            const entity = qfe.table.replace('app_', '').split('_').join(' ');
            message = `Duplicate key on entity "${entity}" for value ${qfe.detail}`;
          }
          break;
        case EntityNotFoundError: // this is another TypeOrm error
          status = HttpStatus.UNPROCESSABLE_ENTITY;
          message = (exception as EntityNotFoundError).message;
          code = (exception as any).code;
          break;
        case CannotCreateEntityIdMapError: // and another
          status = HttpStatus.UNPROCESSABLE_ENTITY;
          message = (exception as CannotCreateEntityIdMapError).message;
          code = (exception as any).code;
          break;
        default:
          status = HttpStatus.INTERNAL_SERVER_ERROR;
      }
    }

    response
      .status(status)
      .json(GlobalResponseError(status, message, code, request));
  }
}
