import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import {
	AppShell,
	createApiClient,
	LoginScreen,
	useI18n,
	useSession,
} from "@ukemochi/ui";

const api = createApiClient(`${location.origin}/api`);
const TITLE = "Ukemochi Admin";

export function App() {
	const { t } = useI18n();
	const { session, login, logout } = useSession(api);

	if (session.status === "loading")
		return (
			<Box sx={{ display: "grid", placeItems: "center", minHeight: "100vh" }}>
				<CircularProgress aria-label={t("common.loading")} />
			</Box>
		);
	if (session.status === "anonymous")
		return <LoginScreen title={TITLE} onLogin={login} />;
	return (
		<AppShell title={TITLE} onLogout={logout}>
			<Typography>{t("auth.welcome", { name: session.user.name })}</Typography>
		</AppShell>
	);
}
