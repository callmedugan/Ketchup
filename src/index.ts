import express from "express";
import {
	handlerApp,
	handlerCompareUsersSchedules,
	handlerCreateSchedule,
	handlerCreateUser,
	handlerDeleteSchedule,
	handlerError,
	handlerGetFriends,
	handlerGetFriendsOverlap,
	handlerGetProfile,
	handlerGetScheduleByUserId,
	handlerGetUsers,
	handlerLogin,
	handlerLogout,
	handlerRefresh,
	handlerRequestFriend,
	handlerReset,
} from "./handlers";
import { middlewareAuthentication, middlewareAuthorizedViewer } from "./middleware";
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
app.get("/api/users", handlerGetUsers);
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
// validates user cred and that user is friends with user before showing the schedule
app.get(
	"/api/schedules/:userId",
	middlewareAuthentication,
	middlewareAuthorizedViewer,
	handlerGetScheduleByUserId,
);

/* ========================================================================= */
//                   Error Handling Middleware - must go last
/* ========================================================================= */

app.use(handlerError);

app.listen(process.env.PORT, () => {
	console.log(`Server running at http://localhost:${process.env.PORT}`);
});
