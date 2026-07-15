import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import birthRecordsRouter from "./birthRecords";
import statsRouter from "./stats";
import sevispassRouter from "./sevispass";
import oidc4vpRouter from "./oidc4vp";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(birthRecordsRouter);
router.use(statsRouter);
router.use(sevispassRouter);
router.use(oidc4vpRouter);

export default router;
