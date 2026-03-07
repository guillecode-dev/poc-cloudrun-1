import { Firestore } from '@google-cloud/firestore';
import { config } from './env';
import { logger } from './logger';

let instance: Firestore | null = null;

/**
 * Devuelve el cliente Firestore singleton.
 * Usa Application Default Credentials (ADC) en Cloud Run.
 */
export function getFirestore(): Firestore {
  if (!instance) {
    instance = new Firestore({
      projectId: config.firestoreProjectId,
      // ADC se resuelve automáticamente en Cloud Run.
      // En local: GOOGLE_APPLICATION_CREDENTIALS apunta al service account key.
    });
    logger.info({ projectId: config.firestoreProjectId }, 'Firestore client initialized');
  }
  return instance;
}
