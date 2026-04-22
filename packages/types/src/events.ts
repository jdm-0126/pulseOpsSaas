import { z } from "zod";

export const EventSchema = z.object({
  idempotencyKey: z.string(),
  type: z.enum(["payment_success", "user_signup"]),
  payload: z.record(z.any()),
  accountId: z.number().optional(),
  createdAt: z.string().optional()
});

export type EventInput = z.infer<typeof EventSchema>;
