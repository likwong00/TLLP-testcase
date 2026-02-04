import { Hono } from "hono";
import baseRouter from "./base";
import filesRouter from "./files";
import multipartRouter from "./multipart";
import shareRouter from "./share";

const router = new Hono();

router.route("/", baseRouter);
router.route("/", filesRouter);
router.route("/", multipartRouter);
router.route("/", shareRouter);

export default router;
