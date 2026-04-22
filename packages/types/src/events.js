"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventSchema = void 0;
const zod_1 = require("zod");
exports.EventSchema = zod_1.z.object({
    idempotencyKey: zod_1.z.string(),
    type: zod_1.z.enum(["payment_success", "user_signup"]),
    payload: zod_1.z.record(zod_1.z.any()),
    accountId: zod_1.z.number().optional(),
    createdAt: zod_1.z.string().optional()
});
//# sourceMappingURL=events.js.map