import { createTheme, ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import Dashboard from "./Dashboard";

const theme = createTheme({ palette: { mode: "dark" } });

export default function App() {
    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <Dashboard />
        </ThemeProvider>
    );
}
