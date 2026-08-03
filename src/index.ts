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
import { middlewareAuthentication } from "./middleware";

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
//users
app.post("/api/login", handlerLogin);
app.get("/api/users", handlerGetUsers);
app.post("/api/users", handlerCreateUser);
app.get("/api/users/overlap", middlewareAuthentication, handlerCompareUsersSchedules);
app.post("/api/refresh", handlerRefresh);
//friends
app.post("/api/friends/", middlewareAuthentication, handlerRequestFriend);
//schedules
app.post("/api/schedules", middlewareAuthentication, handlerCreateSchedule);
app.get("/api/schedules/:userId", handlerGetScheduleByUserId); //TODO add auth bc user should be owner or friends with owner

/* ========================================================================= */
//                   Error Handling Middleware - must go last
/* ========================================================================= */

app.use(handlerError);

app.listen(PORT, () => {
	console.log(`Server running at http://localhost:${PORT}`);
});
