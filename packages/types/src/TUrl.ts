import { z } from "zod"

export const z_TUrl = z.string().refine(
	(val) => {
		try {
			if (val.length > 2000) return false
			if (val.includes("@") && !val.startsWith("mailto:")) return false

			const url = new URL(val)

			const allowedProtocols = [
				"http:",
				"https:",
				"ws:",
				"wss:",
				"ftp:",
				"ftps:",
				"sftp:",
				"ssh:",
				"git:",
				"mailto:",
				"file:",
				"data:",
				"telnet:",
				"irc:",
				"news:",
				"gopher:",
				"nntp:",
				"smb:",
				"urn:",
				"magnet:",
			]

			const protocol = url.protocol.toLowerCase()
			if (!allowedProtocols.some((p) => p.toLowerCase() === protocol)) {
				return false
			}

			if (url.protocol !== "data:" && url.protocol !== "mailto:") {
				if (!url.hostname && url.protocol !== "file:") return false

				if (url.hostname) {
					if (url.hostname.includes("..")) return false

					if (url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "0.0.0.0") return true

					const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/
					const ipv4Match = url.hostname.match(ipv4Regex)
					if (ipv4Match) {
						return ipv4Match.slice(1).every((octet) => {
							const num = Number.parseInt(octet, 10)
							return num >= 0 && num <= 255
						})
					}

					if (url.hostname.startsWith("[") && url.hostname.endsWith("]")) {
						const ipv6 = url.hostname.slice(1, -1)
						const parts = ipv6.split(":")
						if (parts.length < 3 || parts.length > 8) return false
						return parts.every((part) => /^[0-9a-fA-F]{0,4}$/.test(part))
					}

					const labels = url.hostname.split(".")
					if (labels.length < 2) return false

					const labelRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/
					const tldRegex = /^[a-zA-Z]{2,}$/

					const tld = labels.pop()!
					return labels.every((label) => labelRegex.test(label)) && tldRegex.test(tld)
				}
			}

			return true
		} catch {
			return false
		}
	},
	{ message: "Invalid URL" },
)

export type TUrl = z.infer<typeof z_TUrl>
