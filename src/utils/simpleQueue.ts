// src/utils/simpleQueue.ts

type Task = () => Promise<void>;

export type TaskStatus = "pending" | "processing" | "completed" | "failed";

export interface TaskInfo {
  id: string;
  status: TaskStatus;
}

class SimpleQueue {
  private queue: { task: Task; info: TaskInfo }[] = [];
  private isRunning = false;
  private taskMap = new Map<string, TaskInfo>();

  public add = (task: Task, taskId: string): void => {
    if (!taskId) {
      throw new Error("任務必須提供 ID");
    }

    if (this.taskMap.has(taskId)) {
      throw new Error(`任務 ID ${taskId} 已存在`);
    }

    const taskInfo: TaskInfo = {
      id: taskId,
      status: "pending",
    };

    this.queue.push({ task, info: taskInfo });
    this.taskMap.set(taskId, taskInfo);
    this.run();
  };

  public hasTask = (taskId: string): boolean => {
    return this.taskMap.has(taskId);
  };

  public getTaskInfo = (taskId: string): TaskInfo | null => {
    return this.taskMap.get(taskId) || null;
  };

  private updateTaskStatus = (taskId: string, status: TaskStatus): void => {
    const info = this.taskMap.get(taskId);
    if (info) {
      info.status = status;
    }
  };

  private run = async (): Promise<void> => {
    if (this.isRunning) return;
    this.isRunning = true;

    while (this.queue.length > 0) {
      const { task, info } = this.queue.shift()!;

      try {
        this.updateTaskStatus(info.id, "processing");
        await task();
        this.updateTaskStatus(info.id, "completed");
      } catch (err) {
        console.error("❌ 任務執行錯誤：", err);
        this.updateTaskStatus(info.id, "failed");
      } finally {
        // 任務完成或失敗後，從 taskMap 中移除
        this.taskMap.delete(info.id);
      }
    }

    this.isRunning = false;
  };
}

export const simpleQueue = new SimpleQueue();
