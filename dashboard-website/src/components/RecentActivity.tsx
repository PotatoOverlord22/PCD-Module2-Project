import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import Box from "@mui/material/Box";

interface ActivityItem {
    movieId: string;
    movieTitle: string;
    viewCount: number;
    timestamp: string;
}

interface Props {
    activity: ActivityItem[];
}

export default function RecentActivity({ activity }: Props) {
    return (
        <Paper sx={{ p: 2, height: "100%" }}>
            <Typography variant="h6" gutterBottom>
                Recent Activity
            </Typography>
            {activity.length === 0 ? (
                <Box sx={{ py: 4, textAlign: "center", color: "text.secondary" }}>No activity yet</Box>
            ) : (
                <List dense disablePadding>
                    {activity.map((item, index) => (
                        <Box key={`${item.movieId}-${index}`}>
                            <ListItem disableGutters>
                                <ListItemText
                                    primary={item.movieTitle}
                                    secondary={`${item.viewCount} views · ${new Date(item.timestamp).toLocaleTimeString()}`}
                                />
                            </ListItem>
                            {index < activity.length - 1 && <Divider />}
                        </Box>
                    ))}
                </List>
            )}
        </Paper>
    );
}
