import { defineEventHandler } from 'h3'
import { getAllPlans } from "../utils/metrics"

export default defineEventHandler(() => {
	return getAllPlans()
})
