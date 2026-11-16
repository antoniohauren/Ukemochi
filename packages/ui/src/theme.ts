import { createTheme } from "@mui/material/styles";

/** One theme for every app. Large controls by default for touch use. */
export const theme = createTheme({
	palette: {
		primary: { main: "#b71c1c" },
		secondary: { main: "#263238" },
	},
	shape: { borderRadius: 8 },
	components: {
		MuiButton: { defaultProps: { size: "large" } },
		MuiTextField: { defaultProps: { fullWidth: true } },
	},
});
