import { z } from "zod";

export const MovieStatSchema = z.object({
    id: z.string(),
    movieId: z.string().optional(),
    movieTitle: z.string(),
    viewCount: z.number(),
    lastViewed: z.string(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
});

export const StatsResponseSchema = z.object({
    stats: z.array(MovieStatSchema),
    count: z.number(),
    connectedClients: z.number(),
});

export const WebSocketMessageSchema = z.object({
    type: z.string(),
    movieId: z.string().optional(),
    movieTitle: z.string().optional(),
    event: z.string().optional(),
    timestamp: z.string().optional(),
    viewCount: z.number().optional(),
    connectedClients: z.number().optional(),
});

export type MovieStat = z.infer<typeof MovieStatSchema>;
export type StatsResponse = z.infer<typeof StatsResponseSchema>;
export type WebSocketMessage = z.infer<typeof WebSocketMessageSchema>;
