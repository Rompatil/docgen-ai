export { TaskService } from './task-service';
export { CacheService } from './cache-service';

export type ServiceName = 'task' | 'cache' | 'auth';

export interface ServiceConfig {
  timeout: number;
  retries: number;
  baseUrl?: string;
}

export const DEFAULT_TIMEOUT = 5000;
export const MAX_RETRIES = 3;
