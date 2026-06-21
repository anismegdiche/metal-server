import { getPlanMetrics } from "../../utils/metrics"

export default defineEventHandler((event) => {
  const name = getRouterParam(event, "name")

  if (!name) {
    throw createError({ statusCode: 400, statusMessage: "Plan name is required" })
  }

  const metrics = getPlanMetrics(name)

  if (!metrics) {
    throw createError({ statusCode: 404, statusMessage: `Plan '${name}' not found` })
  }

  return metrics
})
