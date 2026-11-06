import { Router } from "express";
import { predict } from "../controllers/predict.controller";
import { optionalAuthGuard } from "../middlewares/auth.middleware";
import { upload } from "../middlewares/upload.middleware";

const router = Router();

router.post("/predict", optionalAuthGuard, upload.single("file"), predict);

export default router;
