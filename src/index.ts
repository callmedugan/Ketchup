import express from "express";
import {
	handlerApp,
	handlerCancelPlan,
	handlerCompareUsersSchedules,
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
	handlerGetUsers,
	handlerLogin,
	handlerLogout,
	handlerRefresh,
	handlerRequestFriend,
	handlerReset,
	handlerRespondToPlan,
} from "./handlers";
import { middlewareAuthentication } from "./middleware";
import cors from "cors";

const app = express();

//prevents browser blocking page from cors policy
app.use(
	cors({
		origin: "http://localhost:5173",
	}),
);

// Middleware
app.use(express.json());

//dev
app.post("/admin/reset", handlerReset);

/* ========================================================================= */
//                        handlers
/* ========================================================================= */

app.get("/api/", handlerApp);

app.post("/auth/login", handlerLogin);
app.post("/auth/refresh", handlerRefresh);
app.post("/auth/logout", middlewareAuthentication, handlerLogout);

//TODO this should require some kind of query to filter users by or search for users to friend request
app.get("/api/users", middlewareAuthentication, handlerGetUsers);
app.post("/api/users", handlerCreateUser);
app.get("/api/profile", middlewareAuthentication, handlerGetProfile);
app.get("/api/users/overlap", middlewareAuthentication, handlerCompareUsersSchedules);

//friends
app.post("/api/friends/", middlewareAuthentication, handlerRequestFriend);
app.get("/api/friends/", middlewareAuthentication, handlerGetFriends);
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

//used for any unknown routes
app.use("/api", (req, res) => {
	res.status(404).json({
		error: "API route not found",
	});
});

app.use(handlerError);

app.listen(process.env.PORT, () => {
	console.log(`Server running at http://localhost:${process.env.PORT}`);
});
