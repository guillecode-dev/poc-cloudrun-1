import { v4 as uuidv4 } from 'uuid';
import { Timestamp, DocumentReference } from '@google-cloud/firestore';
import { getFirestore } from '../config/firestore';
import { config } from '../config/env';
import { logger } from '../config/logger';
import { SessionData } from '../types/index';

/**
 * Estructura almacenada en Firestore.
 * Path: sessions/{userId}/entries/{sessionId}
 */
interface FirestoreSession {
  sessionId: string;
  userId: string;
  createdAt: Timestamp;
  expireAt: Timestamp;
  lastAccessedAt: Timestamp;
}

function sessionRef(userId: string, sessionId: string): DocumentReference {
  return getFirestore()
    .collection('sessions')
    .doc(userId)
    .collection('entries')
    .doc(sessionId);
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Crea una nueva sesión en Firestore para el userId dado.
 * Si ya existe una sesión previa, se crea una nueva independiente.
 */
export async function createSession(userId: string): Promise<SessionData> {
  const sessionId = uuidv4();
  const now = new Date();
  const expireAt = new Date(now.getTime() + config.sessionDurationMin * 60_000);

  const firestoreData: FirestoreSession = {
    sessionId,
    userId,
    createdAt: Timestamp.fromDate(now),
    expireAt: Timestamp.fromDate(expireAt),
    lastAccessedAt: Timestamp.fromDate(now),
  };

  await sessionRef(userId, sessionId).set(firestoreData);

  logger.info({ userId, sessionId, expireAt: expireAt.toISOString() }, 'Session created');

  return {
    sessionId,
    userId,
    createdAt: now,
    expireAt,
    lastAccessedAt: now,
  };
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Valida la sesión. Si es válida y SESSION_SLIDING=true, extiende expireAt.
 * Si la sesión expiró o superó el máximo absoluto, la elimina y retorna null.
 */
export async function validateSession(
  userId: string,
  sessionId: string
): Promise<SessionData | null> {
  const ref = sessionRef(userId, sessionId);
  const doc = await ref.get();

  if (!doc.exists) {
    logger.warn({ userId, sessionId }, 'Session not found in Firestore');
    return null;
  }

  const raw = doc.data() as FirestoreSession;
  const now = new Date();
  const createdAt = raw.createdAt.toDate();
  let expireAt = raw.expireAt.toDate();

  // ── Verificar límite absoluto ──────────────────────────────────────────────
  const absoluteMax = new Date(createdAt.getTime() + config.sessionMaxMin * 60_000);
  if (now >= absoluteMax) {
    await ref.delete();
    logger.info({ userId, sessionId }, 'Session exceeded absolute max duration — deleted');
    return null;
  }

  // ── Verificar expiración deslizante ───────────────────────────────────────
  if (now >= expireAt) {
    await ref.delete();
    logger.info({ userId, sessionId }, 'Session expired — deleted');
    return null;
  }

  // ── Sliding session ────────────────────────────────────────────────────────
  if (config.sessionSliding) {
    const slidingExpire = new Date(
      Math.min(
        now.getTime() + config.sessionDurationMin * 60_000,
        absoluteMax.getTime()
      )
    );

    await ref.update({
      expireAt: Timestamp.fromDate(slidingExpire),
      lastAccessedAt: Timestamp.fromDate(now),
    });

    expireAt = slidingExpire;
    logger.debug(
      { userId, sessionId, newExpireAt: slidingExpire.toISOString() },
      'Session slid forward'
    );
  }

  return {
    sessionId,
    userId,
    createdAt,
    expireAt,
    lastAccessedAt: now,
  };
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Elimina la sesión de Firestore (logout explícito).
 * Es idempotente: no lanza error si el documento no existe.
 */
export async function deleteSession(userId: string, sessionId: string): Promise<void> {
  await sessionRef(userId, sessionId).delete();
  logger.info({ userId, sessionId }, 'Session deleted');
}
