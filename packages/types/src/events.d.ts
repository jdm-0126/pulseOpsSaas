import { z } from "zod";
export declare const EventSchema: z.ZodObject<{
    idempotencyKey: z.ZodString;
    type: z.ZodEnum<["payment_success", "user_signup"]>;
    payload: z.ZodRecord<z.ZodString, z.ZodAny>;
    accountId: z.ZodOptional<z.ZodNumber>;
    createdAt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    idempotencyKey: string;
    type: "payment_success" | "user_signup";
    payload: Record<string, any>;
    accountId?: number | undefined;
    createdAt?: string | undefined;
}, {
    idempotencyKey: string;
    type: "payment_success" | "user_signup";
    payload: Record<string, any>;
    accountId?: number | undefined;
    createdAt?: string | undefined;
}>;
export type EventInput = z.infer<typeof EventSchema>;
//# sourceMappingURL=events.d.ts.map