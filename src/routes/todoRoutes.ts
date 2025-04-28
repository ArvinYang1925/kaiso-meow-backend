import { Router } from "express";
import { getTodos, createTodo, updateTodo, deleteTodo } from "../controllers/todoController";
import { isAuth } from "../middleware/isAuth";
import { isStudent } from "../middleware/isStudent";
import { isInstructor } from "../middleware/isInstructor";

const router = Router();

router.get("/", isAuth, isStudent, getTodos);
router.post("/", createTodo);
router.put("/:id", updateTodo);
router.delete("/:id", isAuth, isInstructor, deleteTodo);

export default router;
