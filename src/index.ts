import express from "express";
import {
	handlerApp,
	handlerCreateSchedule,
	handlerCreateUser,
	handlerError,
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
app.post("/schedules", handlerCreateSchedule); //TODO add auth

// Error Handling Middleware - must go last
app.use(handlerError);

app.listen(PORT, () => {
	console.log(`Server running at http://localhost:${PORT}`);
});
