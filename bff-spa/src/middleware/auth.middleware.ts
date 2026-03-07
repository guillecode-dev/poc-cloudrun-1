import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload, GetPublicKeyOrSecret } from 'jsonwebtoken';
import jwksClient, { JwksClient } from 'jwks-rsa';
import { config } from '../config/env';
import { logger } from '../config/logger';

let jwks: JwksClient | null = null;

function getJwksClient(): JwksClient {
  if (!jwks) {
    jwks = jwksClient({
      jwksUri: `${config.authAuthority}/discovery/v2.0/keys`,
      cache: true,
      cacheMaxAge: 86_400_000, // 24 h — rotación de claves es poco frecuente
      rateLimit: true,
      jwksRequestsPerMinute: 10,
    });
  }
  return jwks;
}

/**
 * Valida el Bearer JWT contra el JWKS de Entra ID.
 * Verifica: firma RS256, issuer, audience, expiración.
 */
function verifyToken(token: string): Promise<JwtPayload> {
  return new Promise((resolve, reject) => {
    const getKey: GetPublicKeyOrSecret = (header, callback) => {
      if (!header.kid) {
        return callback(new Error('JWT header missing kid'));
      }
      getJwksClient().getSigningKey(header.kid, (err, key) => {
        if (err) return callback(err);
        callback(null, key?.getPublicKey());
      });
    };

    jwt.verify(
      token,
      getKey,
      {
        issuer: `https://login.microsoftonline.com/${config.authTenant}/v2.0`,
        audience: config.authAudience,
        algorithms: ['RS256'],
      },
      (err, decoded) => {
        if (err) return reject(err);
        resolve(decoded as JwtPayload);
      }
    );
  });
}

/**
 * Middleware de autenticación.
 * Debe aplicarse a /api/*, /session/* y /authz.
 * Adjunta req.user con el payload validado.
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers['authorization'];

  if (!authHeader?.startsWith('Bearer ')) {
    logger.warn({ requestId: req.requestId, path: req.path },
      'Missing or malformed Authorization header');
    res.status(401).json({ error: 'Missing or malformed Authorization header' });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const payload = await verifyToken(token);
    req.user = payload as Request['user'];
    next();
  } catch (err: unknown) {
    const reason = err instanceof Error ? err.message : 'Unknown error';
    logger.warn({ requestId: req.requestId, reason }, 'JWT validation failed');
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
