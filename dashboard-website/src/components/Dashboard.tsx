import { useEffect, useRef, useState } from "react";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import Box from "@mui/material/Box";
import ConnectionStatus from "./ConnectionStatus";
import TopMoviesChart from "./TopMoviesChart";
import TopMoviesTable from "./TopMoviesTable";
import RecentActivity from "./RecentActivity";
import { createWebSocketConnection } from "../api/gatewayClient";
import { WebSocketMessageType } from "../model/analytics";
import type { MovieStat, WebSocketMessage } from "../model/analytics";

interface ActivityItem {
    movieId: string;
    movieTitle: string;
    viewCount: number;
    timestamp: string;
}

export default function Dashboard() {
    const [connected, setConnected] = useState(false);
    const [connectedClients, setConnectedClients] = useState(0);
    const [topMovies, setTopMovies] = useState<MovieStat[]>([]);
    const [activity, setActivity] = useState<ActivityItem[]>([]);
    const wsRef = useRef<WebSocket | null>(null);
    const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const mountedRef = useRef(true);

    const handleMessage = (msg: WebSocketMessage) => {
        switch (msg.type) {
            case WebSocketMessageType.InitialStats:
                setTopMovies(msg.stats);
                setActivity(msg.recentActivity);
                setConnectedClients(msg.connectedClients);
                break;

            case WebSocketMessageType.ClientCount:
                setConnectedClients(msg.connectedClients);
                break;

            case WebSocketMessageType.MovieViewed:
                setConnectedClients(msg.connectedClients);
                setActivity((prev) =>
                    [
                        {
                            movieId: msg.movieId,
                            movieTitle: msg.movieTitle,
                            viewCount: msg.viewCount,
                            timestamp: msg.timestamp,
                        },
                        ...prev,
                    ].slice(0, 20)
                );
                setTopMovies((prev) => {
                    const exists = prev.find((m) => m.id === msg.movieId);
                    const updated = exists
                        ? prev.map((m) =>
                              m.id === msg.movieId ? { ...m, viewCount: msg.viewCount, lastViewed: msg.timestamp } : m
                          )
                        : [
                              ...prev,
                              {
                                  id: msg.movieId,
                                  movieTitle: msg.movieTitle,
                                  viewCount: msg.viewCount,
                                  lastViewed: msg.timestamp,
                              },
                          ];
                    return updated.sort((a, b) => b.viewCount - a.viewCount).slice(0, 20);
                });
                break;
        }
    };

    const connect = () => {
        const ws = createWebSocketConnection(
            handleMessage,
            () => setConnected(true),
            () => {
                setConnected(false);
                if (mountedRef.current) {
                    retryRef.current = setTimeout(connect, 3000);
                }
            }
        );
        wsRef.current = ws;
    };

    useEffect(() => {
        mountedRef.current = true;
        connect();
        return () => {
            mountedRef.current = false;
            if (retryRef.current) clearTimeout(retryRef.current);
            wsRef.current?.close();
        };
    }, []);

    return (
        <>
            <AppBar position="static">
                <Toolbar>
                    <Typography variant="h6" sx={{ flexGrow: 1 }}>
                        Analytics Dashboard
                    </Typography>
                    <ConnectionStatus connected={connected} connectedClients={connectedClients} />
                </Toolbar>
            </AppBar>
            <Container maxWidth="xl" sx={{ py: 3 }}>
                <Grid container spacing={3}>
                    <Grid size={{ xs: 12, md: 8 }}>
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                            <TopMoviesChart movies={topMovies} />
                            <TopMoviesTable movies={topMovies} />
                        </Box>
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                        <RecentActivity activity={activity} />
                    </Grid>
                </Grid>
            </Container>
        </>
    );
}
