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
import { fetchStats, createWebSocketConnection } from "../api/gatewayClient";
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

    const loadStats = async () => {
        try {
            const data = await fetchStats();
            setTopMovies(data.stats);
            setConnectedClients(data.connectedClients);
        } catch (_) {}
    };

    const handleMessage = (msg: WebSocketMessage) => {
        if (msg.type !== "movie_viewed") return;

        if (msg.connectedClients !== undefined) {
            setConnectedClients(msg.connectedClients);
        }

        if (msg.movieId && msg.movieTitle && msg.viewCount !== undefined && msg.timestamp) {
            setActivity((prev) =>
                [
                    {
                        movieId: msg.movieId!,
                        movieTitle: msg.movieTitle!,
                        viewCount: msg.viewCount!,
                        timestamp: msg.timestamp!,
                    },
                    ...prev,
                ].slice(0, 20)
            );

            setTopMovies((prev) => {
                const exists = prev.find((m) => m.id === msg.movieId);
                const updated = exists
                    ? prev.map((m) =>
                          m.id === msg.movieId ? { ...m, viewCount: msg.viewCount!, lastViewed: msg.timestamp! } : m
                      )
                    : [
                          ...prev,
                          {
                              id: msg.movieId!,
                              movieTitle: msg.movieTitle!,
                              viewCount: msg.viewCount!,
                              lastViewed: msg.timestamp!,
                          },
                      ];
                return updated.sort((a, b) => b.viewCount - a.viewCount).slice(0, 20);
            });
        }
    };

    const connect = () => {
        wsRef.current?.close();
        const ws = createWebSocketConnection(
            handleMessage,
            () => {
                setConnected(true);
                loadStats();
            },
            () => {
                setConnected(false);
                retryRef.current = setTimeout(connect, 3000);
            }
        );
        wsRef.current = ws;
    };

    useEffect(() => {
        loadStats();
        connect();
        return () => {
            wsRef.current?.close();
            if (retryRef.current) clearTimeout(retryRef.current);
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
