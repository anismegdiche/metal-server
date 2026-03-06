import { describe, expect, it, vi } from "vitest"

vi.mock("express", () => {
	const mRouter = {
		route: vi.fn().mockReturnThis(),
		get: vi.fn().mockReturnThis(),
		post: vi.fn().mockReturnThis(),
		all: vi.fn().mockReturnThis(),
	}
	return {
		Router: () => mRouter,
	}
})

vi.mock("../response/UserResponse")
vi.mock("../response/ServerResponse")

describe("ServerRouter", () => {
	it("should define routes", async () => {
		// Import the router to trigger its definition
		await import("../ServerRouter")
		const express = await import("express")
		const mRouter = (express.Router as any)()

		expect(mRouter.route).toHaveBeenCalledWith("/info")
		expect(mRouter.route).toHaveBeenCalledWith("/reload")
	})
})
