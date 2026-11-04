import { Router } from "express";
import { register, login, me } from "../controllers/auth.controller";
import { authGuard } from "../middlewares/auth.middleware";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", authGuard, me);

export default router;
