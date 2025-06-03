// src/utils/simpleQueue.ts
// src/utils/simpleQueue.ts

type Task = () => Promise<void>;

class SimpleQueue {
  private queue: { task: Task; key: string }[] = [];
  private taskKeys: Set<string> = new Set();
  private isRunning = false;

  public add = (task: Task, key: string): void => {
    if (this.taskKeys.has(key)) return; // 防止重複加入
    this.queue.push({ task, key });
    this.taskKeys.add(key);
    this.run();
  };

  public hasTask = (key: string): boolean => {
    return this.taskKeys.has(key);
  };

  private run = async (): Promise<void> => {
    if (this.isRunning) return;
    this.isRunning = true;

    while (this.queue.length > 0) {
      const { task, key } = this.queue.shift()!;
      try {
        await task();
      } catch (err) {
        console.error("❌ 任務執行錯誤：", err);
      } finally {
        this.taskKeys.delete(key); // 不管成功失敗都移除
      }
    }

    this.isRunning = false;
  };
}

export const simpleQueue = new SimpleQueue();
