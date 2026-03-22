import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { EventEmitter } from 'events';
import { Logger } from '../utils/logger';
import { Task, TaskStatus } from '../models/task';
import { CacheService } from './cache-service';

export interface TaskQueryOptions {
  status?: TaskStatus;
  assigneeId?: string;
  page: number;
  limit: number;
  sortBy?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  hasMore: boolean;
}

/**
 * Core business logic for task management.
 */
@Injectable()
export class TaskService {
  private logger: Logger;
  private events: EventEmitter;

  constructor(
    private readonly repo: Repository<Task>,
    private readonly cache: CacheService
  ) {
    this.logger = new Logger('TaskService');
    this.events = new EventEmitter();
  }

  async findByUser(userId: string, options: TaskQueryOptions): Promise<PaginatedResult<Task>> {
    const cacheKey = `tasks:${userId}:${options.page}`;
    const cached = await this.cache.get<PaginatedResult<Task>>(cacheKey);
    if (cached) return cached;

    const query = this.repo.createQueryBuilder('task')
      .where('task.userId = :userId', { userId });

    if (options.status) {
      query.andWhere('task.status = :status', { status: options.status });
    }
    if (options.assigneeId) {
      query.andWhere('task.assigneeId = :assigneeId', { assigneeId: options.assigneeId });
    }

    const skip = (options.page - 1) * options.limit;
    const [items, total] = await query
      .orderBy(`task.${options.sortBy || 'createdAt'}`, 'DESC')
      .skip(skip).take(options.limit).getManyAndCount();

    const result: PaginatedResult<Task> = { items, total, page: options.page, hasMore: skip + items.length < total };
    await this.cache.set(cacheKey, result, 60);
    return result;
  }

  async findById(id: string): Promise<Task | null> {
    return this.repo.findOne({ where: { id } });
  }

  async create(data: Partial<Task>, userId: string): Promise<Task> {
    const task = this.repo.create({ ...data, userId, status: 'todo' as TaskStatus });
    const saved = await this.repo.save(task);
    this.logger.info('Task created', { taskId: saved.id });
    this.events.emit('task:created', saved);
    await this.cache.invalidatePattern(`tasks:${userId}:*`);
    return saved;
  }

  async update(id: string, data: Partial<Task>): Promise<Task | null> {
    await this.repo.update(id, data);
    const updated = await this.findById(id);
    if (updated) {
      this.events.emit('task:updated', updated);
      await this.cache.invalidatePattern(`tasks:${updated.userId}:*`);
    }
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const task = await this.findById(id);
    if (!task) return false;
    await this.repo.delete(id);
    this.events.emit('task:deleted', { id });
    await this.cache.invalidatePattern(`tasks:${task.userId}:*`);
    this.logger.info('Task deleted', { taskId: id });
    return true;
  }

  async assign(taskId: string, assigneeId: string): Promise<Task> {
    const task = await this.findById(taskId);
    if (!task) throw new Error('Task not found');
    if (task.status === 'completed') throw new Error('Cannot assign completed task');
    task.assigneeId = assigneeId;
    task.status = 'assigned' as TaskStatus;
    return this.repo.save(task);
  }

  async markComplete(taskId: string): Promise<Task> {
    const task = await this.findById(taskId);
    if (!task) throw new Error('Task not found');
    task.status = 'completed' as TaskStatus;
    task.completedAt = new Date();
    const saved = await this.repo.save(task);
    this.events.emit('task:completed', saved);
    return saved;
  }

  async getStats(userId: string): Promise<{ total: number; completed: number; rate: number }> {
    const total = await this.repo.count({ where: { userId } });
    const completed = await this.repo.count({ where: { userId, status: 'completed' as TaskStatus } });
    return { total, completed, rate: total > 0 ? completed / total : 0 };
  }

  onEvent(event: string, handler: (data: any) => void): void {
    this.events.on(event, handler);
  }
}

export function isOverdue(task: Task): boolean {
  if (!task.dueDate || task.status === 'completed') return false;
  return new Date(task.dueDate) < new Date();
}

export function formatTaskResponse(task: Task, includeDetails: boolean = true): Record<string, unknown> {
  const base = { id: task.id, title: task.title, status: task.status };
  if (!includeDetails) return base;
  return { ...base, description: task.description, assigneeId: task.assigneeId, dueDate: task.dueDate };
}
