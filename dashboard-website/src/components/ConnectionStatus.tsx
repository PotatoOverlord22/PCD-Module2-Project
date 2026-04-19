import Chip from "@mui/material/Chip";
import PeopleIcon from "@mui/icons-material/People";
import WifiIcon from "@mui/icons-material/Wifi";
import WifiOffIcon from "@mui/icons-material/WifiOff";
import Box from "@mui/material/Box";

interface Props {
    connected: boolean;
    connectedClients: number;
}

export default function ConnectionStatus({ connected, connectedClients }: Props) {
    return (
        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <Chip
                icon={connected ? <WifiIcon /> : <WifiOffIcon />}
                label={connected ? "Connected" : "Disconnected"}
                color={connected ? "success" : "error"}
                size="small"
            />
            <Chip
                icon={<PeopleIcon />}
                label={`${connectedClients} viewer${connectedClients !== 1 ? "s" : ""}`}
                size="small"
                variant="outlined"
            />
        </Box>
    );
}
