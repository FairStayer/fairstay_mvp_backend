import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      sessionId?: string;
    }
  }
}

declare module 'express' {
  export interface Request {
    sessionId?: string;
  }
}
