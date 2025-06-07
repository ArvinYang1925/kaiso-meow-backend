import { Request, Response, NextFunction } from "express";
import { AppDataSource } from "../config/db";
import { Todo } from "../entities/Todo";

const todoRepository = AppDataSource.getRepository(Todo);

/**
 * API #100 GET /api/v1/todos
 *
 * 📘 [API 文件 Notion 連結](https://www.notion.so/GET-api-v1-todos)
 *
 * 此 API 用於獲取所有待辦事項
 */
export async function getTodos(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const todos = await todoRepository.find();
    res.json({ status: "success", data: todos });
  } catch (error) {
    next(error);
  }
}

/**
 * API #101 POST /api/v1/todos
 *
 * 📘 [API 文件 Notion 連結](https://www.notion.so/POST-api-v1-todos)
 *
 * 此 API 用於創建新的待辦事項
 */
export async function createTodo(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { title } = req.body;
    if (!title) {
      res.status(400).json({ status: "error", message: "Title is required" });
      return;
    }
    const newTodo = todoRepository.create({ title });
    const savedTodo = await todoRepository.save(newTodo);
    res.status(201).json({ status: "success", data: savedTodo });
  } catch (error) {
    next(error);
  }
}

/**
 * API #102 PUT /api/v1/todos/:id
 *
 * 📘 [API 文件 Notion 連結](https://www.notion.so/PUT-api-v1-todos-id)
 *
 * 此 API 用於更新指定待辦事項
 */
export async function updateTodo(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { title, completed } = req.body;
    const todo = await todoRepository.findOneBy({ id });

    if (!todo) {
      res.status(404).json({ status: "error", message: "Todo not found" });
      return;
    }

    todo.title = title !== undefined ? title : todo.title;
    todo.completed = completed !== undefined ? completed : todo.completed;
    const updatedTodo = await todoRepository.save(todo);
    res.json({ status: "success", data: updatedTodo });
  } catch (error) {
    next(error);
  }
}

/**
 * API #103 DELETE /api/v1/todos/:id
 *
 * 📘 [API 文件 Notion 連結](https://www.notion.so/DELETE-api-v1-todos-id)
 *
 * 此 API 用於刪除指定待辦事項
 */
export async function deleteTodo(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const result = await todoRepository.delete({ id });
    if (result.affected === 0) {
      res.status(404).json({ status: "error", message: "Todo not found" });
      return;
    }
    res.json({ status: "success", data: result });
  } catch (error) {
    next(error);
  }
}
