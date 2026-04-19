import { BarChart } from "@mui/x-charts/BarChart";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Box from "@mui/material/Box";
import type { MovieStat } from "../model/analytics";

interface Props {
    movies: MovieStat[];
}

export default function TopMoviesChart({ movies }: Props) {
    const top = movies.slice(0, 10);
    const titles = top.map((m) => m.movieTitle);
    const views = top.map((m) => m.viewCount);

    return (
        <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
                Top Movies by Views
            </Typography>
            {top.length === 0 ? (
                <Box sx={{ py: 4, textAlign: "center", color: "text.secondary" }}>No data yet</Box>
            ) : (
                <BarChart
                    height={Math.max(200, top.length * 40)}
                    layout="horizontal"
                    yAxis={[{ scaleType: "band", data: titles }]}
                    series={[{ data: views, label: "Views", color: "#1976d2" }]}
                    margin={{ left: 180, right: 20, top: 10, bottom: 30 }}
                />
            )}
        </Paper>
    );
}
