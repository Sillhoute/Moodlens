import { Router } from "express";
import {
  getHistory,
  deleteOneHistory,
  deleteAllHistory,
} from "../controllers/history.controller";
import { authGuard } from "../middlewares/auth.middleware";

const router = Router();

router.get("/", authGuard, getHistory);
router.delete("/:id", authGuard, deleteOneHistory);
router.delete("/", authGuard, deleteAllHistory);

export default router;
