import { Request, Response } from "express";
import { UnauthorizedError, BadRequestError, ForbiddenError, NotFoundError } from "../error.js";
import z from "zod";
import { createPlanRequestSchema, respondToPlanRequestSchema } from "@ketchup/shared";
import {
	addPlanToDb,
	areSchedulesAvailableForPlan,
	cancelPlanInDb,
	checkUsersAreFriendsFromDb,
	getPlansFromDb,
	respondToPlanInDb,
	verifyPlanSchedulesOwnership,
} from "../db/queries.js";
import { logInfo } from "./logging.js";

const planParamsSchema = z.object({ id: z.uuid() });

export async function handlerGetPlans(req: Request, res: Response) {
	// validate user
	const userId = req.userId;
	if (!userId) throw new UnauthorizedError("User not authenticated");

	// call db
	const plans = await getPlansFromDb(userId);

	// return
	res.status(200).json(plans);
}

export async function handlerCreatePlans(req: Request, res: Response) {
	// validate user
	const userId = req.userId;
	if (!userId) throw new UnauthorizedError("User not authenticated");

	// validate body
	const body = createPlanRequestSchema.safeParse(req.body);
	if (!body.success) throw new BadRequestError(body.error.issues[0]?.message ?? "Invalid request body");

	const { friendId, meetTime, title, comments, location, scheduleIds } = body.data;

	// validate friendship
	const areFriends = await checkUsersAreFriendsFromDb(userId, friendId);
	if (!areFriends) throw new ForbiddenError("User is not friends with other user");

	// validate the two schedules this plan was proposed from actually belong to the creator/friend pair
	const [creatorScheduleId, friendScheduleId] = scheduleIds;
	const ownershipValid = await verifyPlanSchedulesOwnership(creatorScheduleId, userId, friendScheduleId, friendId);
	if (!ownershipValid) throw new BadRequestError("Invalid availability selected for this plan");

	// a schedule already committed to another pending/confirmed plan can't be reused
	const schedulesAvailable = await areSchedulesAvailableForPlan(scheduleIds);
	if (!schedulesAvailable) throw new BadRequestError("One of these availabilities is already part of another plan");

	// call db
	const result = await addPlanToDb(
		{
			creatorId: userId,
			friendId,
			status: "pending",
			meetTime,
			title,
			comments: comments ?? "",
			location: location ?? "",
			lastUpdatedBy: userId,
		},
		scheduleIds,
	);

	if (result == undefined) throw new Error("something went wrong adding the plan to the db");

	logInfo("plan.created", { userId, planId: result.id, friendId });

	// return
	res.status(201).json(result);
}

export async function handlerRespondToPlan(req: Request, res: Response) {
	// validate user
	const userId = req.userId;
	if (!userId) throw new UnauthorizedError("User not authenticated");

	// validate body
	const body = respondToPlanRequestSchema.safeParse(req.body);
	if (!body.success) throw new BadRequestError(body.error.issues[0]?.message ?? "Invalid request body");

	// validate params
	const params = planParamsSchema.safeParse(req.params);
	if (!params.success) throw new BadRequestError(params.error.issues[0]?.message ?? "Invalid params provided");

	// call db
	const planResponse = await respondToPlanInDb(userId, params.data.id, body.data.response);
	if (!planResponse) throw new NotFoundError("Failed to respond to plan");

	logInfo("plan.responded", { userId, planId: params.data.id, response: body.data.response });

	// return
	res.status(200).json(planResponse);
}

export async function handlerCancelPlan(req: Request, res: Response) {
	// validate user
	const userId = req.userId;
	if (!userId) throw new UnauthorizedError("User not authenticated");

	// validate params
	const params = planParamsSchema.safeParse(req.params);
	if (!params.success) throw new BadRequestError(params.error.issues[0]?.message ?? "Invalid params provided");

	// call db
	const cancelledPlan = await cancelPlanInDb(userId, params.data.id);
	if (!cancelledPlan) throw new NotFoundError("Failed to cancel plan");

	logInfo("plan.cancelled", { userId, planId: params.data.id });

	// return
	res.status(200).json(cancelledPlan);
}
