export class AppError extends Error {
  constructor(
    public readonly statusCode: 400 | 404 | 409,
    public readonly code: "bad_request" | "not_found" | "conflict",
    message: string,
  ) {
    super(message);
  }
}