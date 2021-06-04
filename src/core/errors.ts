export abstract class CodedError extends Error {
  code: string;
  details?: Record<string, any>;

  constructor(code: string, message: string, details?: Record<string, any>) {
    super(message);
    this.code = code;
    this.details = details;
  }

  toJSON() {
    return {
      message: this.message,
      code: this.code,
      details: this.details,
    };
  }
}

export class UserNotFoundError extends CodedError {
  constructor() {
    super('USER_NOT_FOUND', 'User not found.');
  }
}
