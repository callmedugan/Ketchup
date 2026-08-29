import express from "express";
import {
	handlerCancelPlan,
	handlerCreatePlans,
	handlerCreateSchedule,
	handlerCreateUser,
	handlerDeleteSchedule,
	handlerError,
	handlerGetFriends,
	handlerGetFriendsOverlap,
	handlerGetPlans,
	handlerGetProfile,
	handlerGetSchedules,
	handlerSearchForUsers,
	handlerLogin,
	handlerLogout,
	handlerRefresh,
	handlerRequestFriend,
	handlerReset,
	handlerRespondToPlan,
	handlerRespondToFriendRequest,
	handlerRemoveFriend,
	handlerUpdateUser,
	handlerBlockUser,
	handlerUnblockUser,
} from "./handlers.js";
import { middlewareLoginLimiter, middlewareAuthentication, middlewareRegisterLimiter } from "./middleware.js";
import cors from "cors";
import path from "path";

const app = express();

//used to serve static files - process.cwd will be set in the start script
const clientPath = path.resolve(process.cwd(), "../client/dist");

//prevents browser blocking page from cors policy
const allowedOrigins = [process.env.FRONTEND_URL, process.env.DEV_FRONTEND_URL].filter((origin): origin is string => Boolean(origin));
app.use(cors({ origin: allowedOrigins, credentials: true }));

// allow json and limit to 100kb of data
app.use(express.json({ limit: "100kb" }));

//dev
app.post("/admin/reset", handlerReset);

/* ========================================================================= */
//                        handlers
/* ========================================================================= */

//auth
app.post("/auth/login", middlewareLoginLimiter, handlerLogin);
app.post("/auth/refresh", handlerRefresh);
app.post("/auth/logout", middlewareAuthentication, handlerLogout);
app.post("/api/users", middlewareRegisterLimiter, handlerCreateUser);

//users
app.get("/api/users", middlewareAuthentication, handlerSearchForUsers);
app.get("/api/profile", middlewareAuthentication, handlerGetProfile);
app.put("/api/users", middlewareAuthentication, handlerUpdateUser);

//friends
app.post("/api/friends/", middlewareAuthentication, handlerRequestFriend);
app.patch("/api/friends/:id/respond", middlewareAuthentication, handlerRespondToFriendRequest);
app.put("/api/friends/:id/block", middlewareAuthentication, handlerBlockUser);
app.delete("/api/friends/:id/block", middlewareAuthentication, handlerUnblockUser);
app.get("/api/friends/", middlewareAuthentication, handlerGetFriends);
app.delete("/api/friends/", middlewareAuthentication, handlerRemoveFriend);
app.get("/api/friends/overlap", middlewareAuthentication, handlerGetFriendsOverlap); //uses start and end date query params

//schedules
app.post("/api/schedules", middlewareAuthentication, handlerCreateSchedule);
app.delete("/api/schedules", middlewareAuthentication, handlerDeleteSchedule);
// validates user cred and that user is friends with user before showing the schedule (prob can remove since i wont need)
app.get("/api/schedules", middlewareAuthentication, handlerGetSchedules);

//plans
app.get("/api/plans", middlewareAuthentication, handlerGetPlans);
app.post("/api/plans", middlewareAuthentication, handlerCreatePlans);
app.patch("/api/plans/:id/respond", middlewareAuthentication, handlerRespondToPlan);
app.delete("/api/plans/:id", middlewareAuthentication, handlerCancelPlan);

/* ========================================================================= */
//                   Error Handling Middleware - must go last
/* ========================================================================= */

// Static frontend files
app.use(express.static(clientPath));

// React Router fallback
app.get("/{*splat}", (_req, res) => {
	res.sendFile(path.join(clientPath, "index.html"));
});

//used for any unknown routes
app.use("/api", (req, res) => {
	res.status(404).json({ error: "API route not found" });
});

app.use(handlerError);

app.listen(process.env.PORT, () => {
	console.log(`Server running at http://localhost:${process.env.PORT}`);
});
