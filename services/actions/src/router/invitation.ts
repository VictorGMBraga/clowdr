import { json } from "body-parser";
import type { Request, Response } from "express";
import express from "express";
import { assertType } from "typescript-is";
import {
    handleInvitationInsert_AutomaticSend,
    handleInvitationInsert_AutomaticSendRepeat,
} from "../handlers/invitation";
import { checkEventSecret } from "../middlewares/checkEventSecret";
import type { InvitationData, Payload } from "../types/hasura/event";

export const router = express.Router();

// Protected routes
router.use(checkEventSecret);

router.post("/automatic", json(), async (req: Request, res: Response) => {
    try {
        assertType<Payload<InvitationData>>(req.body);
    } catch (e) {
        console.error(`${req.originalUrl}: received incorrect payload`, e);
        res.status(500).json("Unexpected payload");
        return;
    }
    try {
        await handleInvitationInsert_AutomaticSend(req.body);
    } catch (e) {
        console.error("Failure while handling invitation: automatic send", e);
        res.status(500).json("Failure while handling invitation: automatic send");
        return;
    }
    res.status(200).json("OK");
});

router.post("/automaticRepeat", json(), async (_req: Request, res: Response) => {
    try {
        await handleInvitationInsert_AutomaticSendRepeat();
    } catch (e) {
        console.error("Failure while handling invitation: automatic send repeat", e);
        res.status(500).json("Failure while handling invitation: automatic send repeat");
        return;
    }
    res.status(200).json("OK");
});
