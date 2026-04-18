//
//
//

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { TRow } from "../../types/DataTable"
import { RowUtils } from "../RowUtils"

describe("RowUtils", () => {
	let testRow: TRow

	beforeEach(() => {
		testRow = {
			name: "John Doe",
			email: "john@example.com",
			age: 30,
			address: {
				street: "123 Main St",
				city: "New York",
				zip: "10001"
			},
			phone: null,
			bio: undefined,
			birthDate: new Date("1990-01-01"),
			score: 95.5,
			isActive: true,
			tags: ["developer", "javascript"]
		}
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	describe("Anonymize", () => {
		it("should pseudonymize specified fields by default", () => {
			const fieldsToAnonymize = new Set(["email", "name"])
			const result = RowUtils.Anonymize({ ...testRow }, fieldsToAnonymize)

			expect(result.email).not.toBe(testRow.email)
			expect(result.name).not.toBe(testRow.name)
			expect(result.email).toBe("5S3ARF06wRZpV9jBlC3SOUmHSrg+3yFo+CZ1rRlpiuo=")
			expect(result.name).toBe("XI+r9JfYCMYM/TeOLqzBmm6j9Vr9UkYo1B2vobIBP0k=")

			// Other fields should remain unchanged
			expect(result.age).toBe(testRow.age)
			expect(result.address).toBe(testRow.address)
			expect(result.birthDate).toBe(testRow.birthDate)
		})

		it("should anonymize specified fields when pseudo=false", () => {
			const fieldsToAnonymize = new Set(["email", "name"])
			const result = RowUtils.Anonymize({ ...testRow }, fieldsToAnonymize, false)

			expect(result.email).not.toBe(testRow.email)
			expect(result.name).not.toBe(testRow.name)
			expect(result.email).toMatch(/^[A-Za-z0-9+/]*={0,2}$/) // base64 pattern
			expect(result.name).toMatch(/^[A-Za-z0-9+/]*={0,2}$/) // base64 pattern

			// Other fields should remain unchanged
			expect(result.age).toBe(testRow.age)
			expect(result.address).toBe(testRow.address)
		})

		it("should handle null and undefined values correctly", () => {
			const fieldsToAnonymize = new Set(["phone", "bio"])
			const result = RowUtils.Anonymize({ ...testRow }, fieldsToAnonymize)

			// null and undefined should become empty string, then be hashed
			expect(result.phone).toMatch(/^[A-Za-z0-9+/]*={0,2}$/)
			expect(result.bio).toMatch(/^[A-Za-z0-9+/]*={0,2}$/)
		})

		it("should handle Date objects correctly", () => {
			const fieldsToAnonymize = new Set(["birthDate"])
			const result = RowUtils.Anonymize({ ...testRow }, fieldsToAnonymize)

			expect(result.birthDate).not.toBe(testRow.birthDate)
			expect(result.birthDate).toMatch(/^[A-Za-z0-9+/]*={0,2}$/)
		})

		it("should handle objects correctly", () => {
			const fieldsToAnonymize = new Set(["address"])
			const result = RowUtils.Anonymize({ ...testRow }, fieldsToAnonymize)

			expect(result.address).not.toBe(testRow.address)
			expect(result.address).toMatch(/^[A-Za-z0-9+/]*={0,2}$/)
		})

		it("should handle arrays correctly", () => {
			const fieldsToAnonymize = new Set(["tags"])
			const result = RowUtils.Anonymize({ ...testRow }, fieldsToAnonymize)

			expect(result.tags).not.toBe(testRow.tags)
			expect(result.tags).toMatch(/^[A-Za-z0-9+/]*={0,2}$/)
		})

		it("should handle numbers correctly", () => {
			const fieldsToAnonymize = new Set(["age", "score"])
			const result = RowUtils.Anonymize({ ...testRow }, fieldsToAnonymize)

			expect(result.age).not.toBe(testRow.age)
			expect(result.score).not.toBe(testRow.score)
			expect(result.age).toMatch(/^[A-Za-z0-9+/]*={0,2}$/)
			expect(result.score).toMatch(/^[A-Za-z0-9+/]*={0,2}$/)
		})

		it("should handle booleans correctly", () => {
			const fieldsToAnonymize = new Set(["isActive"])
			const result = RowUtils.Anonymize({ ...testRow }, fieldsToAnonymize)

			expect(result.isActive).not.toBe(testRow.isActive)
			expect(result.isActive).toMatch(/^[A-Za-z0-9+/]*={0,2}$/)
		})

		it("should not modify fields that are not in the fields set", () => {
			const fieldsToAnonymize = new Set(["email"])
			const result = RowUtils.Anonymize({ ...testRow }, fieldsToAnonymize)

			expect(result.email).not.toBe(testRow.email)
			expect(result.name).toBe(testRow.name)
			expect(result.age).toBe(testRow.age)
			expect(result.address).toBe(testRow.address)
			expect(result.phone).toBe(testRow.phone)
			expect(result.bio).toBe(testRow.bio)
			expect(result.birthDate).toBe(testRow.birthDate)
			expect(result.score).toBe(testRow.score)
			expect(result.isActive).toBe(testRow.isActive)
			expect(result.tags).toBe(testRow.tags)
		})

		it("should handle empty fields set", () => {
			const fieldsToAnonymize = new Set<string>()
			const result = RowUtils.Anonymize({ ...testRow }, fieldsToAnonymize)

			expect(result).toEqual(testRow)
		})

		it("should handle empty row", () => {
			const fieldsToAnonymize = new Set(["email", "name"])
			const result = RowUtils.Anonymize({}, fieldsToAnonymize)

			expect(result).toEqual({})
		})

		it("should handle row with missing fields", () => {
			const fieldsToAnonymize = new Set(["missingField", "email"])
			const result = RowUtils.Anonymize({ ...testRow }, fieldsToAnonymize)

			expect(result.email).not.toBe(testRow.email)
			expect(result.missingField).toBeUndefined()
		})

		it("should return a new row object (not mutate in place)", () => {
			const originalRow = { ...testRow }
			const fieldsToAnonymize = new Set(["email"])
			const result = RowUtils.Anonymize(originalRow, fieldsToAnonymize)

			expect(result).not.toBe(originalRow) // Different object reference
			expect(originalRow.email).toBe("john@example.com") // Original is unchanged
			expect(result.email).toMatch(/^[A-Za-z0-9+/]*={0,2}$/) // New row is anonymized
		})

		it("should handle complex nested objects", () => {
			const complexRow = {
				user: {
					personal: {
						name: "John",
						details: {
							email: "john@example.com",
							phone: "123-456-7890"
						}
					},
					preferences: {
						theme: "dark",
						notifications: true
					}
				},
				metadata: {
					created: new Date(),
					version: 1
				}
			}

			const fieldsToAnonymize = new Set(["user", "metadata"])
			const result = RowUtils.Anonymize({ ...complexRow }, fieldsToAnonymize)

			expect(result.user).toMatch(/^[A-Za-z0-9+/]*={0,2}$/)
			expect(result.metadata).toMatch(/^[A-Za-z0-9+/]*={0,2}$/)
		})

		it("should handle circular references gracefully", () => {
			const circularRow: TRow & { self?: TRow } = {
				name: "John",
				email: "john@example.com"
			}
			circularRow.self = circularRow

			const fieldsToAnonymize = new Set(["self"])
			const result = RowUtils.Anonymize(circularRow, fieldsToAnonymize)

			// Should handle circular reference without throwing
			expect(result.name).toBe("John")
			expect(result.email).toBe("john@example.com")
			expect(result.self).toMatch(/^[A-Za-z0-9+/]*={0,2}$/)
		})

		it("should produce consistent hashes for same input with pseudonymization", () => {
			const fieldsToAnonymize = new Set(["email"])
			const row1 = { email: "test@example.com" }
			const row2 = { email: "test@example.com" }

			const result1 = RowUtils.Anonymize(row1, fieldsToAnonymize, true)
			const result2 = RowUtils.Anonymize(row2, fieldsToAnonymize, true)

			expect(result1.email).toBe(result2.email)
		})

		it("should produce different hashes for same input with anonymization", () => {
			const fieldsToAnonymize = new Set(["email"])
			const row1 = { email: "test@example.com" }
			const row2 = { email: "test@example.com" }

			const result1 = RowUtils.Anonymize(row1, fieldsToAnonymize, false)
			const result2 = RowUtils.Anonymize(row2, fieldsToAnonymize, false)

			expect(result1.email).not.toBe(result2.email)
		})

		it("should handle special characters in values", () => {
			const specialRow = {
				name: "Jöhn Döé",
				email: "tëst@éxample.com",
				specialChars: "!@#$%^&*()_+-=[]{}|;':\",./<>?"
			}

			const fieldsToAnonymize = new Set(["name", "email", "specialChars"])
			const result = RowUtils.Anonymize({ ...specialRow }, fieldsToAnonymize)

			expect(result.name).toMatch(/^[A-Za-z0-9+/]*={0,2}$/)
			expect(result.email).toMatch(/^[A-Za-z0-9+/]*={0,2}$/)
			expect(result.specialChars).toMatch(/^[A-Za-z0-9+/]*={0,2}$/)
		})

		it("should handle very long strings", () => {
			const longString = "a".repeat(10000)
			const longRow = {
				short: "test",
				long: longString
			}

			const fieldsToAnonymize = new Set(["long"])
			const result = RowUtils.Anonymize({ ...longRow }, fieldsToAnonymize)

			expect(result.short).toBe("test")
			expect(result.long).toMatch(/^[A-Za-z0-9+/]*={0,2}$/)
			expect(result.long.length).toBeGreaterThan(0)
		})

		it("should handle empty string values", () => {
			const emptyRow = {
				name: "",
				email: "test@example.com",
				emptyString: ""
			}

			const fieldsToAnonymize = new Set(["name", "emptyString", "email"])
			const result = RowUtils.Anonymize({ ...emptyRow }, fieldsToAnonymize)

			// Empty strings should be hashed to a consistent value
			expect(result.name).toMatch(/^[A-Za-z0-9+/]*={0,2}$/)
			expect(result.emptyString).toMatch(/^[A-Za-z0-9+/]*={0,2}$/)
			expect(result.email).toMatch(/^[A-Za-z0-9+/]*={0,2}$/)
		})

		it("should handle zero values", () => {
			const zeroRow = {
				count: 0,
				balance: 0.0,
				score: 0,
				age: 30
			}

			const fieldsToAnonymize = new Set(["count", "balance", "score"])
			const result = RowUtils.Anonymize({ ...zeroRow }, fieldsToAnonymize)

			expect(result.count).toMatch(/^[A-Za-z0-9+/]*={0,2}$/)
			expect(result.balance).toMatch(/^[A-Za-z0-9+/]*={0,2}$/)
			expect(result.score).toMatch(/^[A-Za-z0-9+/]*={0,2}$/)
			expect(result.age).toBe(30) // Should remain unchanged
		})

		it("should match DataTableUtils expected hash for age field", () => {
			// This test matches the expected behavior from DataTableUtils.test.ts
			// where age: 30 should become "F2mdKMiTK6Wq34bDP1jIKrF9dNPtu/EJu8QgFJLNIsw="
			const testRow = {
				name: "Alice",
				age: 30,
			} 

			const fieldsToAnonymize = new Set(["age"])
			const result = RowUtils.Anonymize({ ...testRow }, fieldsToAnonymize)

			expect(result.name).toBe("Alice") // Should remain unchanged
			expect(result.age).toBe("F2mdKMiTK6Wq34bDP1jIKrF9dNPtu/EJu8QgFJLNIsw=")
		})
	})

	describe("Helper Functions", () => {
		describe("normalizeValue", () => {
			it("should handle null and undefined values", () => {
				// This is tested indirectly through Anonymize, but we can test the behavior
				const testRow = {
					nullValue: null,
					undefinedValue: undefined,
					stringValue: "test"
				}

				const fieldsToAnonymize = new Set(["nullValue", "undefinedValue", "stringValue"])
				const result = RowUtils.Anonymize({ ...testRow }, fieldsToAnonymize)

				// All should be hashed to base64 strings
				expect(result.nullValue).toMatch(/^[A-Za-z0-9+/]*={0,2}$/)
				expect(result.undefinedValue).toMatch(/^[A-Za-z0-9+/]*={0,2}$/)
				expect(result.stringValue).toMatch(/^[A-Za-z0-9+/]*={0,2}$/)
			})

			it("should handle Date objects correctly", () => {
				const date = new Date("1990-01-01")
				const testRow = {
					dateValue: date,
					stringValue: "test"
				}

				const fieldsToAnonymize = new Set(["dateValue"])
				const result = RowUtils.Anonymize({ ...testRow }, fieldsToAnonymize)

				expect(result.dateValue).toMatch(/^[A-Za-z0-9+/]*={0,2}$/)
				expect(result.stringValue).toBe("test") // Should remain unchanged
			})

			it("should handle objects that cannot be stringified", () => {
				const problematicObject: Record<string, unknown> & { circular?: Record<string, unknown> } = {}
				problematicObject.circular = problematicObject

				const testRow = {
					problematic: problematicObject,
					normal: "test"
				}

				const fieldsToAnonymize = new Set(["problematic"])
				const result = RowUtils.Anonymize({ ...testRow }, fieldsToAnonymize)

				// Should handle gracefully without throwing
				expect(result.problematic).toMatch(/^[A-Za-z0-9+/]*={0,2}$/)
				expect(result.normal).toBe("test")
			})
		})

		describe("Hash Functions", () => {
			it("should produce consistent pseudonymization results", () => {
				const testValue = "test@example.com"
				const row1 = { email: testValue }
				const row2 = { email: testValue }

				const fieldsToAnonymize = new Set(["email"])
				const result1 = RowUtils.Anonymize(row1, fieldsToAnonymize, true)
				const result2 = RowUtils.Anonymize(row2, fieldsToAnonymize, true)

				expect(result1.email).toBe(result2.email)
			})

			it("should produce different anonymization results", () => {
				const testValue = "test@example.com"
				const row1 = { email: testValue }
				const row2 = { email: testValue }

				const fieldsToAnonymize = new Set(["email"])
				const result1 = RowUtils.Anonymize(row1, fieldsToAnonymize, false)
				const result2 = RowUtils.Anonymize(row2, fieldsToAnonymize, false)

				expect(result1.email).not.toBe(result2.email)
			})

			it("should produce different results for different inputs", () => {
				const row1 = { email: "test1@example.com" }
				const row2 = { email: "test2@example.com" }

				const fieldsToAnonymize = new Set(["email"])
				const result1 = RowUtils.Anonymize(row1, fieldsToAnonymize, true)
				const result2 = RowUtils.Anonymize(row2, fieldsToAnonymize, true)

				expect(result1.email).not.toBe(result2.email)
			})
		})
	})

	describe("Edge Cases", () => {
		it("should handle very large number of fields", () => {
			const largeRow: TRow = {}
			const fieldsToAnonymize = new Set<string>()

			// Create a row with many fields
			for (let i = 0; i < 1000; i++) {
				largeRow[`field${i}`] = `value${i}`
				if (i % 2 === 0) {
					fieldsToAnonymize.add(`field${i}`)
				}
			}

			const result = RowUtils.Anonymize({ ...largeRow }, fieldsToAnonymize)

			// Check that half the fields are anonymized
			let anonymizedCount = 0
			let unchangedCount = 0

			for (let i = 0; i < 1000; i++) {
				if (i % 2 === 0) {
					expect(result[`field${i}`]).toMatch(/^[A-Za-z0-9+/]*={0,2}$/)
					anonymizedCount++
				} else {
					expect(result[`field${i}`]).toBe(`value${i}`)
					unchangedCount++
				}
			}

			expect(anonymizedCount).toBe(500)
			expect(unchangedCount).toBe(500)
		})

		it("should handle deeply nested property names", () => {
			const deepRow = {
				"very.deep.property.name": "deep value",
				"another.very.deep.nested.property": "nested value",
				simple: "simple value"
			}

			const fieldsToAnonymize = new Set(["very.deep.property.name", "another.very.deep.nested.property"])
			const result = RowUtils.Anonymize({ ...deepRow }, fieldsToAnonymize)

			expect(result["very.deep.property.name"]).toMatch(/^[A-Za-z0-9+/]*={0,2}$/)
			expect(result["another.very.deep.nested.property"]).toMatch(/^[A-Za-z0-9+/]*={0,2}$/)
			expect(result.simple).toBe("simple value")
		})

		it("should handle Unicode characters", () => {
			const unicodeRow = {
				emoji: "Hello World! emoji test",
				chinese: "Hello World! chinese test",
				arabic: "Hello World! arabic test",
				russian: "Hello World! russian test"
			}

			const fieldsToAnonymize = new Set(["emoji", "chinese", "arabic", "russian"])
			const result = RowUtils.Anonymize({ ...unicodeRow }, fieldsToAnonymize)

			Object.values(result).forEach(value => {
				expect(value).toMatch(/^[A-Za-z0-9+/]*={0,2}$/)
			})
		})
	})
})
