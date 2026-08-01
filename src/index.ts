import { getDaysCommonOpenRange, type Day } from "./schedule";
import express, { Request, Response, NextFunction } from "express";
import { BadRequestError, NotFoundError, ForbiddenError, UnauthorizedError } from "./error";
import { addUserToDb, getAllUsersFromDb } from "./db/queries";
import { hashPassword } from "./db/auth";
import { db } from "./db";

function handlerApp(req: Request, res: Response) {
	return res.status(200).json({ message: "Hello from TypeScript & Express!" });
}

async function handlerCreateUser(req: Request, res: Response) {
	console.log("called create user");
	//define shape
	type Shape = {
		email: string;
		name: string;
		password: string;
	};

	//get parsed body
	const parse: Shape = req.body;

	//handle the parsed data
	if (!parse.email || parse.email === "") throw new BadRequestError("Email cannot be blank");
	if (!parse.name || parse.name === "") throw new BadRequestError("Name cannot be blank");
	if (!parse.password || parse.password === "")
		throw new BadRequestError("Password cannot be blank");

	//result
	const hashedPassword = await hashPassword(parse.password);

	//result
	const result = await addUserToDb({
		name: parse.name,
		email: parse.email,
		hashedPassword: hashedPassword,
	});
	if (result == undefined) throw new Error("something went wrong creating the user");

	//return 201 status with password omitted
	res.status(201).send({
		id: result.id,
		name: result.name,
		email: result.email,
		createdAt: result.createdAt,
		updatedAt: result.updatedAt,
	});
}

///for testing only
async function handlerGetUsers(req: Request, res: Response) {
	//console.log(await db.select());
	const users = await getAllUsersFromDb();
	if (users == undefined)
		throw new Error("something went wrong with getting user or user does not exist");

	const result = [];
	//build result structure
	for (const u of users) {
		result.push({
			id: u.id,
			createdAt: u.createdAt,
			updatedAt: u.updatedAt,
			name: u.name,
			email: u.email,
			hashPassword: u.hashedPassword,
		});
	}
	//success
	res.status(200);
	res.send(result);
}

function handlerError(err: Error, req: Request, res: Response, next: NextFunction) {
	console.error(err.stack);
	res.status(500).json({ error: "Internal Server Error" });
}

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// handlers
app.get("/", handlerApp);
app.get("/users", handlerGetUsers);
app.post("/users", handlerCreateUser);

// Error Handling Middleware - must go last
app.use(handlerError);

app.listen(PORT, () => {
	console.log(`Server running at http://localhost:${PORT}`);
});
