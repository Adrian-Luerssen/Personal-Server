import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { QueryFailedError } from 'typeorm';
import { EntityNotFoundError } from 'typeorm/error/EntityNotFoundError';
import { CannotCreateEntityIdMapError } from 'typeorm/error/CannotCreateEntityIdMapError';

import { GlobalResponseError } from './global.response.error';

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

    let message = (exception as any).message.message;
    let code = 'HttpException';
    let status = HttpStatus.INTERNAL_SERVER_ERROR;

    switch (exception.constructor) {
      case NotFoundException:
        status = (exception as HttpException).getStatus();
        break;
      case ForbiddenException:
        code = 'Forbidden access to resource';
        status = (exception as HttpException).getStatus();
        break;
      case HttpException:
        status = (exception as HttpException).getStatus();
        // check if status is valid and an integer
        if (isNaN(status) || status < 100 || status >= 600) {
          if (<any>status instanceof QueryFailedError) {
            exception = <any>status;
            status = HttpStatus.UNPROCESSABLE_ENTITY; // Handle as QueryFailedError
            code = (exception as any).code;
            message = (exception as QueryFailedError).message;
          } else {
            status = HttpStatus.INTERNAL_SERVER_ERROR;
          }
        }
        break;
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

    response
      .status(status)
      .json(GlobalResponseError(status, message, code, request));
  }
}
