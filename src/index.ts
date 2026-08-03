import express from "express";
import {
	handlerApp,
	handlerCompareUsersSchedules,
	handlerCreateSchedule,
	handlerCreateUser,
	handlerError,
	handlerGetScheduleByUserId,
	handlerGetUsers,
	handlerReset,
} from "./handlers";

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

//dev
app.post("/admin/reset", handlerReset);

// handlers
app.get("/", handlerApp);
app.get("/users", handlerGetUsers);
app.post("/users", handlerCreateUser);
app.get("/users/overlap", handlerCompareUsersSchedules); //TODO add auth

app.post("/schedules", handlerCreateSchedule); //TODO add auth
app.get("/schedules/:userId", handlerGetScheduleByUserId); //TODO add auth bc user should be owner or friends with owner

// Error Handling Middleware - must go last
app.use(handlerError);

app.listen(PORT, () => {
	console.log(`Server running at http://localhost:${PORT}`);
});
