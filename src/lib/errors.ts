export class ServiceError extends Error {
  constructor(
    public code: "BAD_REQUEST" | "UNAUTHENTICATED" | "FORBIDDEN" | "NOT_FOUND" | "CONFLICT" | "TOO_LARGE" | "UNSUPPORTED",
    message: string,
  ) {
    super(message);
  }
  get status() {
    return { BAD_REQUEST: 400, UNAUTHENTICATED: 401, FORBIDDEN: 403, NOT_FOUND: 404, CONFLICT: 409, TOO_LARGE: 413, UNSUPPORTED: 415 }[this.code];
  }
}
