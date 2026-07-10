import z from "zod"
import { HttpErrorInternalServerError, HttpErrorNotFound } from "../../modules/errors/HttpErrors"
import { Assert } from "../Assert"

describe("Assert", () => {
	describe("Condition", () => {
		it("should not throw when condition is true", () => {
			expect(() => {
				Assert.Condition(true, "This should not throw")
			}).not.toThrow()
		})

		it("should throw HttpErrorInternalServerError when condition is false", () => {
			const errorMessage = "Condition failed"

			expect(() => {
				Assert.Condition(false, errorMessage)
			}).toThrow(HttpErrorInternalServerError)

			expect(() => {
				Assert.Condition(false, errorMessage)
			}).toThrow(errorMessage)
		})

		it("should throw with the provided message", () => {
			const errorMessage = "Custom error message"

			try {
				Assert.Condition(false, errorMessage)
			} catch (error: unknown) {
				expect(error).toBeInstanceOf(HttpErrorInternalServerError)
				expect((error as Error).message.endsWith(errorMessage)).toBe(true)
			}
		})

		it("should throw with the provided error", () => {
			const error = new HttpErrorNotFound()
			const errorMessage = "Custom error message"

			try {
				Assert.Condition(false, errorMessage, error)
			} catch (error: unknown) {
				expect(error).toBeInstanceOf(HttpErrorNotFound)
				expect((error as Error).message.endsWith(errorMessage)).toBe(true)
			}
		})

		it("should catch the first assert when there are 2", () => {
			const errorMessage1 = "Condition failed 1"
			const errorMessage2 = "Condition failed 2"
			try {
				Assert.Condition(false, errorMessage1)
				Assert.Condition(false, errorMessage2)
			} catch (error: unknown) {
				expect(error).toBeInstanceOf(HttpErrorInternalServerError)
				expect((error as Error).message.endsWith(errorMessage1)).toBe(true)
			}
		})
	})

	describe("Var", () => {
		interface User {
			id: number
			name: string
		}

		const guard = (user: unknown): user is User => {
			return typeof user === "object" && user !== null && "id" in user && "name" in user
		}

		it("should throw default error for variable - message", () => {
			expect(() => {
				Assert.Var(undefined, "This should throw")
			}).toThrow(HttpErrorInternalServerError)
		})

		it("should throw provided error for variable - message - error", () => {
			expect(() => {
				Assert.Var(undefined, "This should throw", new HttpErrorNotFound())
			}).toThrow(HttpErrorNotFound)
		})
		///
		it("should throw default error for variable - condition - message", () => {
			expect(() => {
				Assert.Var(false, false, "This should throw")
			}).toThrow(HttpErrorInternalServerError)
		})

		it("should throw provided error for variable - condition - message - error", () => {
			expect(() => {
				Assert.Var(false, false, "This should throw", new HttpErrorNotFound())
			}).toThrow(HttpErrorNotFound)
		})
		///

		it("should throw default error for variable - guard - message", () => {
			expect(() => {
				Assert.Var(false, false, "This should throw")
			}).toThrow(HttpErrorInternalServerError)
		})

		it("should throw provided error for variable - guard - message - error", () => {
			expect(() => {
				Assert.Var(false, false, "This should throw", new HttpErrorNotFound())
			}).toThrow(HttpErrorNotFound)
		})

		it("should not throw when type assertion condition is true", () => {
			const user = {
				id: 1,
				name: "John",
			}
			expect(() => {
				Assert.Var<User>(user, true, "This should not throw")
			}).not.toThrow()
		})

		it("should not throw when type assertion condition is true with guard", () => {
			const user = {
				id: 1,
				name: "John",
			}
			expect(() => {
				Assert.Var<User>(user, guard, "This should not throw")
			}).not.toThrow()
		})

		it("should throw when type assertion condition is false with guard", () => {
			const user = {
				name: "John",
			}
			expect(() => {
				Assert.Var<User>(user, guard, "This should not throw")
			}).toThrow(HttpErrorInternalServerError)
		})

		it("should throw when type assertion condition is false", () => {
			const user = {
				id: 1,
				name: "John",
			}
			const errorMessage = "Invalid user type"

			expect(() => {
				Assert.Var<User>(user, false, errorMessage)
			}).toThrow(HttpErrorInternalServerError)

			expect(() => {
				Assert.Var<User>(user, false, errorMessage)
			}).toThrow(errorMessage)
		})

		it("should allow using the variable as the asserted type after successful assertion", () => {
			const maybeUser: unknown = {
				id: 1,
				name: "John",
			}

			Assert.Var<User>(maybeUser, true, "Not a valid user")

			// TypeScript should now recognize maybeUser as User type
			expect((maybeUser as User).id).toBe(1)
			expect((maybeUser as User).name).toBe("John")
		})

		it("should handle null and undefined values", () => {
			expect(() => {
				Assert.Var<User>(null, true, "Null value")
			}).not.toThrow()

			expect(() => {
				Assert.Var<User>(undefined, true, "Undefined value")
			}).not.toThrow()
		})

		it("should handle number primitive value", () => {
			expect(() => {
				Assert.Var<number>(42, true, "Number value")
			}).not.toThrow()
		})

		it("should handle string primitive value", () => {
			expect(() => {
				Assert.Var<string>("test", true, "String value")
			}).not.toThrow()
		})

		it("should not throw when asserting true boolean value", () => {
			expect(() => {
				Assert.Var<boolean>(true as unknown, true, "Boolean true value")
			}).not.toThrow()
		})

		it("should not throw when asserting false boolean value", () => {
			expect(() => {
				Assert.Var<boolean>(false as unknown, true, "Boolean false value")
			}).not.toThrow()
		})

		it("should throw when condition is false for boolean assertion", () => {
			expect(() => {
				Assert.Var<boolean>(true as unknown, false, "Boolean value with false condition")
			}).toThrow(HttpErrorInternalServerError)
		})

		it("should maintain boolean type after type assertion", () => {
			const maybeBool: unknown = true
			Assert.Var<boolean>(maybeBool, true, "Boolean type assertion")
			expect(typeof maybeBool).toBe("boolean")
		})
	})

	describe("ZodSchema", () => {
		interface User {
			id: number
			name: string
			email?: string
		}

		const userSchema: z.ZodSchema<User> = z.object({
			id: z.number(),
			name: z.string(),
			email: z.string().optional(),
		})

		it("should return parsed value when validation succeeds", () => {
			const validUser = {
				id: 1,
				name: "John Doe",
				email: "john@example.com",
			}

			const result = Assert.ZodSchema(validUser, userSchema, "Validation failed")

			expect(result).toEqual(validUser)
			expect(result.id).toBe(1)
			expect(result.name).toBe("John Doe")
			expect(result.email).toBe("john@example.com")
		})

		it("should return parsed value with inferred type when validation succeeds", () => {
			const validUser = {
				id: 2,
				name: "Jane Smith",
			}

			const result = Assert.ZodSchema(validUser, userSchema, "Validation failed")

			// TypeScript should infer the correct type
			expect(typeof result.id).toBe("number")
			expect(typeof result.name).toBe("string")
			expect(result.email).toBeUndefined()
		})

		it("should throw HttpErrorInternalServerError when validation fails", () => {
			const invalidUser = {
				id: "not-a-number",
				name: "Invalid User",
			}

			expect(() => {
				Assert.ZodSchema(invalidUser, userSchema, "User validation failed")
			}).toThrow(HttpErrorInternalServerError)
		})

		it("should concatenate custom message before zod error message", () => {
			const invalidUser = {
				id: "invalid",
				name: 123, // wrong type
			}

			try {
				Assert.ZodSchema(invalidUser, userSchema, "Custom prefix message")
			} catch (error: unknown) {
				expect(error).toBeInstanceOf(HttpErrorInternalServerError)
				const errorMessage = (error as Error).message
				expect(errorMessage).toContain("Custom prefix message")
				expect(errorMessage).toContain("Invalid input: expected number, received string")
				expect(errorMessage).toContain("Invalid input: expected string, received number")
			}
		})

		it("should handle missing required fields", () => {
			const incompleteUser = {
				name: "Missing ID",
			}

			try {
				Assert.ZodSchema(incompleteUser, userSchema, "Incomplete user data")
			} catch (error: unknown) {
				expect(error).toBeInstanceOf(HttpErrorInternalServerError)
				const errorMessage = (error as Error).message
				expect(errorMessage).toContain("Incomplete user data")
				expect(errorMessage).toContain("id")
			}
		})

		it("should handle primitive string schema", () => {
			const stringSchema = z.string()

			const result = Assert.ZodSchema("valid string", stringSchema, "String validation failed")
			expect(result).toBe("valid string")
			expect(typeof result).toBe("string")
		})

		it("should handle primitive number schema", () => {
			const numberSchema = z.number()

			const result = Assert.ZodSchema(42, numberSchema, "Number validation failed")
			expect(result).toBe(42)
			expect(typeof result).toBe("number")
		})

		it("should handle array schema", () => {
			const arraySchema = z.array(z.string())

			const validArray = ["item1", "item2", "item3"]
			const result = Assert.ZodSchema(validArray, arraySchema, "Array validation failed")

			expect(result).toEqual(validArray)
			expect(Array.isArray(result)).toBe(true)
		})

		it("should handle union schema", () => {
			const unionSchema = z.union([z.string(), z.number()])

			const stringResult = Assert.ZodSchema("test", unionSchema, "Union validation failed")
			expect(stringResult).toBe("test")

			const numberResult = Assert.ZodSchema(123, unionSchema, "Union validation failed")
			expect(numberResult).toBe(123)
		})

		it("should throw when union schema validation fails", () => {
			const unionSchema = z.union([z.string(), z.number()])

			expect(() => {
				Assert.ZodSchema({ invalid: "object" }, unionSchema, "Union validation failed")
			}).toThrow(HttpErrorInternalServerError)
		})

		it("should handle optional fields correctly", () => {
			const userWithoutEmail = {
				id: 3,
				name: "User without email",
			}

			const result = Assert.ZodSchema(userWithoutEmail, userSchema, "User validation failed")
			expect(result.email).toBeUndefined()
		})

		it("should handle null and undefined values appropriately", () => {
			const nullableStringSchema = z.string().nullable()

			const result = Assert.ZodSchema(null, nullableStringSchema, "Nullable validation failed")
			expect(result).toBeNull()
		})

		it("should handle complex nested schemas", () => {
			const addressSchema = z.object({
				street: z.string(),
				city: z.string(),
				zipCode: z.string(),
			})

			const userWithAddressSchema = z.object({
				id: z.number(),
				name: z.string(),
				address: addressSchema,
			})

			const validUserWithAddress = {
				id: 4,
				name: "User with address",
				address: {
					street: "123 Main St",
					city: "Anytown",
					zipCode: "12345",
				},
			}

			const result = Assert.ZodSchema(validUserWithAddress, userWithAddressSchema, "Complex validation failed")

			expect(result).toEqual(validUserWithAddress)
			expect(result.address.city).toBe("Anytown")
		})

		it("should handle error when zod throws non-Error object", () => {
			// Mock a scenario where zod might throw something that's not an Error
			const mockSchema = {
				parse: () => {
					throw "String error instead of Error object"
				},
			} as unknown as z.ZodSchema<string>

			expect(() => {
				Assert.ZodSchema("test", mockSchema, "Mock schema validation")
			}).toThrow(HttpErrorInternalServerError)
		})

		it("should preserve type inference for complex transformations", () => {
			const transformSchema = z.string().transform((val) => val.toUpperCase())

			const result = Assert.ZodSchema("lowercase", transformSchema, "Transform validation failed")
			expect(result).toBe("LOWERCASE")
			expect(typeof result).toBe("string")
		})
	})
})
