export class TokenInvalidError extends Error {
  readonly statusCode = 401;
  readonly code = 'TOKEN_INVALID';
  constructor(message = 'Token expired or revoked') {
    super(message);
    this.name = 'TokenInvalidError';
  }
}

export class RateLimitError extends Error {
  readonly statusCode = 429;
  readonly code = 'RATE_LIMIT';
  constructor(message = 'Shopify API rate limit exceeded') {
    super(message);
    this.name = 'RateLimitError';
  }
}
