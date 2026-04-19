import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import type { MovieStat } from "../model/analytics";

interface Props {
    movies: MovieStat[];
}

export default function TopMoviesTable({ movies }: Props) {
    return (
        <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
                Rankings
            </Typography>
            <TableContainer>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>#</TableCell>
                            <TableCell>Title</TableCell>
                            <TableCell align="right">Views</TableCell>
                            <TableCell align="right">Last Viewed</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {movies.map((movie, index) => (
                            <TableRow key={movie.id} hover>
                                <TableCell>{index + 1}</TableCell>
                                <TableCell>{movie.movieTitle}</TableCell>
                                <TableCell align="right">{movie.viewCount}</TableCell>
                                <TableCell align="right">{new Date(movie.lastViewed).toLocaleTimeString()}</TableCell>
                            </TableRow>
                        ))}
                        {movies.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} align="center" sx={{ color: "text.secondary", py: 4 }}>
                                    No data yet
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Paper>
    );
}
