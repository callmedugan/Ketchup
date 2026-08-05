import express from "express";
import {
	handlerApp,
	handlerCompareUsersSchedules,
	handlerCreateSchedule,
	handlerCreateUser,
	handlerError,
	handlerGetScheduleByUserId,
	handlerGetUsers,
	handlerLogin,
	handlerRefresh,
	handlerRequestFriend,
	handlerReset,
} from "./handlers";
import { middlewareAuthentication, middlewareAuthorizedViewer } from "./middleware";

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

//dev
app.post("/admin/reset", handlerReset);

/* ========================================================================= */
//                        handlers
/* ========================================================================= */

app.get("/api/", handlerApp);

app.post("/api/login", handlerLogin);

//TODO this should require some kind of query to filter users by or search for users to friend request
app.get("/api/users", handlerGetUsers);
app.post("/api/users", handlerCreateUser);
app.get("/api/users/overlap", middlewareAuthentication, handlerCompareUsersSchedules);
app.post("/api/refresh", handlerRefresh);

//friends
app.post("/api/friends/", middlewareAuthentication, handlerRequestFriend);

//schedules
app.post("/api/schedules", middlewareAuthentication, handlerCreateSchedule);
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

app.listen(PORT, () => {
	console.log(`Server running at http://localhost:${PORT}`);
});
