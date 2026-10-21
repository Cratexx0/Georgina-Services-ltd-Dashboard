import {
	createContext,
	useContext,
	useState,
	useEffect,
	ReactNode,
	useRef,
} from "react";
import { useToast } from "@/hooks/use-toast";
import adminApiService, { AUTH_EXPIRED_EVENT, User } from "./adminApiService";

interface AuthContextType {
	user: User | null;
	login: (email: string, password: string) => Promise<void>;
	logout: () => void;
	changePassword: (
		currentPassword: string,
		newPassword: string,
	) => Promise<{
		success: boolean;
		message: string;
		user?: User;
	}>;
	isAuthenticated: boolean;
	isLoading: boolean;
	error: string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

const isTokenExpired = (token: string) => {
	const payload = token.split(".")[1];

	if (!payload) {
		return false;
	}

	try {
		const decodedPayload = JSON.parse(
			atob(payload.replace(/-/g, "+").replace(/_/g, "/")),
		);
		return (
			typeof decodedPayload.exp === "number" &&
			decodedPayload.exp * 1000 <= Date.now()
		);
	} catch {
		return true;
	}
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
	const [user, setUser] = useState<User | null>(null);
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);
	const { toast } = useToast();
	const initializedRef = useRef(false);

	const logout = () => {
		setUser(null);
		setError(null);
		adminApiService.clearToken();
		localStorage.removeItem("e-commerce-admin-user");
		localStorage.removeItem("e-commerce-admin-token");
		toast({
			title: "Logged out",
			description: "You have been logged out successfully.",
		});
	};

	useEffect(() => {
		const handleAuthExpired = () => {
			setUser(null);
			setError("Your session has expired. Please log in again.");
			adminApiService.clearToken();
			localStorage.removeItem("e-commerce-admin-user");
			localStorage.removeItem("e-commerce-admin-token");
		};

		window.addEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
		return () =>
			window.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
	}, []);

	useEffect(() => {
		// Prevent double initialization in StrictMode
		if (initializedRef.current) {
			return;
		}
		initializedRef.current = true;

		const storedUser = localStorage.getItem("e-commerce-admin-user");
		const storedToken = localStorage.getItem("e-commerce-admin-token");

		if (storedUser && storedToken && !isTokenExpired(storedToken)) {
			try {
				const userData = JSON.parse(storedUser);

				// Set token in API service
				adminApiService.setToken(storedToken);

				// Set user state
				setUser(userData);
			} catch (error) {
				error();
				localStorage.removeItem("e-commerce-admin-user");
				localStorage.removeItem("e-commerce-admin-token");
			}
		} else {
			localStorage.removeItem("e-commerce-admin-user");
			localStorage.removeItem("e-commerce-admin-token");
			adminApiService.clearToken();
		}

		setIsLoading(false);
	}, []);

	const login = async (email: string, password: string) => {
		setIsLoading(true);
		setError(null);

		try {
			const response = await adminApiService.login(email, password);

			const userData = response.admin;
			const token = response.token;

			if (!userData || !token) {
				throw new Error("Invalid response format from server");
			}

			// --- ROBUST ADMIN ROLE CHECK ---

			// Normalize role checking (handles casing like 'Admin' or 'ADMIN' and trims spaces)
			const userRole =
				typeof userData.role === "string"
					? userData.role.toLowerCase().trim()
					: "";

			if (userRole !== "admin") {
				toast({
					variant: "destructive",
					title: "Access denied",
					description: `You don't have admin privileges. (Detected role: ${userData.role || "none"})`,
				});
				throw new Error("Access denied: Admin privileges required");
			}

			// Set user state FIRST
			setUser(userData);

			// Then set token and localStorage
			adminApiService.setToken(token);
			localStorage.setItem("e-commerce-admin-user", JSON.stringify(userData));
			localStorage.setItem("e-commerce-admin-token", token);

			toast({
				title: "Login successful",
				description: "Welcome back to the dashboard!",
			});
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "Login failed. Please try again.";
			setError(errorMessage);
			toast({
				variant: "destructive",
				title: "Login failed",
				description: errorMessage,
			});
			throw err;
		} finally {
			setIsLoading(false);
		}
	};

	const changePassword = async (
		currentPassword: string,
		newPassword: string,
	): Promise<{
		success: boolean;
		message: string;
		user?: User;
	}> => {
		setIsLoading(true);
		setError(null);

		try {
			const response = await adminApiService.changePassword(
				currentPassword,
				newPassword,
			);

			if (response.success) {
				if (response.admin) {
					setUser(response.admin);
					localStorage.setItem(
						"e-commerce-admin-user",
						JSON.stringify(response.admin),
					);
				}

				toast({
					title: "Password updated",
					description: "Your password has been changed successfully.",
				});

				return {
					success: response.success,
					message: response.message,
					user: response.admin,
				};
			} else {
				throw new Error(response.message || "Failed to change password");
			}
		} catch (err) {
			const errorMessage =
				err instanceof Error
					? err.message
					: "Password change failed. Please try again.";
			setError(errorMessage);
			toast({
				variant: "destructive",
				title: "Password change failed",
				description: errorMessage,
			});
			throw err;
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<AuthContext.Provider
			value={{
				changePassword,
				user,
				login,
				logout,
				isAuthenticated: !!user,
				isLoading,
				error,
			}}
		>
			{children}
		</AuthContext.Provider>
	);
};

export const useAuth = () => {
	const context = useContext(AuthContext);
	if (!context) {
		throw new Error("useAuth must be used within an AuthProvider");
	}
	return context;
};
