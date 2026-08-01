import { getDaysCommonOpenRange, type Day } from "./schedule";
import express, { Request, Response, NextFunction } from "express"; // 0.6.11

const app = express();
const PORT = process.env.PORT || 3000;

// JSON Middleware
app.use(express.json());

app.get("/", (req: Request, res: Response) => {
	res.status(200).json({ message: "Hello from TypeScript & Express!" });
});

// Basic Error Handling Middleware - must go last
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
	console.error(err.stack);
	res.status(500).json({ error: "Internal Server Error" });
});

app.listen(PORT, () => {
	console.log(`Server running at http://localhost:${PORT}`);
});
