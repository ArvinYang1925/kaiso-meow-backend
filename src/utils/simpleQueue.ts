// src/utils/simpleQueue.ts
type Task = () => Promise<void>;

class SimpleQueue {
  private queue: Task[] = [];
  private isRunning = false;

  public add = (task: Task): void => {
    this.queue.push(task);
    this.run(); // 觸發執行
  };

  private run = async (): Promise<void> => {
    if (this.isRunning) return;
    this.isRunning = true;

    while (this.queue.length > 0) {
      const task = this.queue.shift();
      if (!task) continue;

      try {
        await task();
      } catch (err) {
        console.error("❌ 任務執行錯誤：", err);
      }
    }

    this.isRunning = false;
  };
}

export const simpleQueue = new SimpleQueue();
