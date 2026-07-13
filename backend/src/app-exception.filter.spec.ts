import {
  ArgumentsHost,
  BadRequestException,
  HttpStatus,
} from "@nestjs/common";
import { AppExceptionFilter } from "./app-exception.filter";

describe("AppExceptionFilter", () => {
  const createHost = () => {
    const response = {
      status: jest.fn(),
      json: jest.fn(),
    };
    response.status.mockReturnValue(response);

    const request = {
      method: "GET",
      url: "/api/media/not-a-uuid",
    };
    const host = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as ArgumentsHost;

    return { host, response };
  };

  it("preserves the status of HttpException subclasses", () => {
    const { host, response } = createHost();

    new AppExceptionFilter().catch(
      new BadRequestException("Validation failed (uuid is expected)"),
      host,
    );

    expect(response.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.BAD_REQUEST,
        message: "Validation failed (uuid is expected)",
        code: "HttpException",
      }),
    );
  });

  it("returns 500 for an unknown error", () => {
    const { host, response } = createHost();

    new AppExceptionFilter().catch(new Error("Unexpected failure"), host);

    expect(response.status).toHaveBeenCalledWith(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: "Unexpected failure",
        code: "HttpException",
      }),
    );
  });
});
