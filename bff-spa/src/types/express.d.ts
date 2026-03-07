import { JwtPayload } from 'jsonwebtoken';

declare global {
  namespace Express {
    interface Request {
      /** UUID generado por requestIdMiddleware, presente en todos los requests */
      requestId: string;
      /** Payload del JWT validado por authMiddleware */
      user?: JwtPayload & {
        sub: string;
        oid?: string;
        preferred_username?: string;
        name?: string;
        roles?: string[];
        scp?: string;
      };
    }
  }
}

export {};
