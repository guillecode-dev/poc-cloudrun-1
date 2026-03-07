import { Router, Request, Response, NextFunction } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { logger } from '../config/logger';

const router = Router();

router.use(authMiddleware);

/**
 * GET /authz
 *
 * Devuelve roles y permisos del usuario autenticado.
 * En producción, esta información se derivaría de los claims del JWT
 * (grupos de Azure AD / app roles) o de una política almacenada en Firestore.
 * Para la PoC se devuelven permisos estáticos de "viewer".
 *
 * Response 200: { roles: string[], permissions: string[] }
 */
router.get(
  '/',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.sub;

      logger.info(
        { requestId: req.requestId, userId },
        'Authz check requested'
      );

      // Derivar roles desde claims del token si existen (app roles de Entra ID)
      const tokenRoles: string[] = req.user?.roles ?? [];
      const roles = tokenRoles.length > 0 ? tokenRoles : ['viewer'];

      // Mapa de permisos por rol (en producción: tabla en DB o documento Firestore)
      const permissionsByRole: Record<string, string[]> = {
        viewer: ['items.read', 'orders.read', 'orders.create'],
        admin: ['items.read', 'items.write', 'orders.read', 'orders.create', 'orders.delete'],
      };

      const permissions = Array.from(
        new Set(roles.flatMap(r => permissionsByRole[r] ?? []))
      );

      res.status(200).json({ roles, permissions });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
