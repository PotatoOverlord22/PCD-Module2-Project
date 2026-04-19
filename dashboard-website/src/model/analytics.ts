import { z } from "zod";

export enum WebSocketMessageType {
    MovieViewed = "movie_viewed",
    InitialStats = "initial_stats",
    ClientCount = "client_count",
}

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

export const WebSocketMessageSchema = z.discriminatedUnion("type", [
    z.object({
        type: z.literal("movie_viewed"),
        movieId: z.string(),
        movieTitle: z.string(),
        event: z.string(),
        timestamp: z.string(),
        viewCount: z.number(),
        connectedClients: z.number(),
    }),
    z.object({
        type: z.literal("initial_stats"),
        stats: z.array(MovieStatSchema),
        connectedClients: z.number(),
    }),
    z.object({
        type: z.literal("client_count"),
        connectedClients: z.number(),
    }),
]);

export type MovieStat = z.infer<typeof MovieStatSchema>;
export type StatsResponse = z.infer<typeof StatsResponseSchema>;
export type WebSocketMessage = z.infer<typeof WebSocketMessageSchema>;
