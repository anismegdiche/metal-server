// .vitepress/config.js
import { withMermaid } from "vitepress-plugin-mermaid"
import MarkdownItContainer from "markdown-it-container"

const AboutMetal = [
	{ text: "Introduction", link: "/documentation/about" },
	{ text: "Get Started", link: "/documentation/get-started" },
	{ text: "What's new", link: "/documentation/whats-new" },
	{ text: "Key Features", link: "/documentation/about#key-features" },
	{ text: "Understanding Concepts", link: "/documentation/concepts" },
	{ text: "Sample Project", link: "/sample-project" },
]

export default withMermaid({
	markdown: {
		config(md) {
			md.use(MarkdownItContainer, "half", {
				render(tokens, idx) {
					if (tokens[idx].nesting === 1) return `<div class="half custom-block">\n`
					return `</div>\n`
				},
			})
		},
	},
	head: [
		["link", { rel: "icon", href: "/favicon.ico" }],
		["script", { async: "", src: "https://www.googletagmanager.com/gtag/js?id=G-8TBX91GK8B" }],
		[
			"script",
			{},
			`var host = window.location.hostname;
      if(host != "localhost")
      {
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '8TBX91GK8B');
      }`,
		],
	],
	titleTemplate: "Metal",
	themeConfig: {
		logo: "/metal-logo-icon.png",
		siteTitle: "Metal",
		search: {
			provider: "local",
		},
		socialLinks: [
			{ icon: "github", link: "https://github.com/anismegdiche/metal-server" },
			{ icon: "linkedin", link: "https://linkedin.com/in/anismegdiche" },
		],
		footer: {
			message: "Released under the GNU v3 License.",
			copyright: "Copyright © 2024-present Anis Megdiche",
		},
		outline: "deep",
		nav: [
			{
				text: "About Metal",
				items: AboutMetal,
			},
			{
				text: "Server",
				items: [
					{ text: "Configuration file", link: "/documentation/config-yml" },
					{ text: "Data Providers Configurations", link: "/documentation/data-providers-config" },
					{ text: "Container Provider Configurations", link: "/documentation/container-provider-config" },
					{ text: "AI Engines Configurations", link: "/documentation/ai-engines" },
					{ text: "Understanding Authentication", link: "/guides/authentication" },
					{ text: "Error Handling Configuration", link: "/documentation/on-error-yml" },
					{
						items: [
							{ text: "Environment Variables", link: "/documentation/env" },
							{ text: "Optional Parameters", link: "/documentation/optional-parameters" },
							{ text: "Dynamic Expression Engine", link: "/documentation/dynamic-expression-engine" },
						],
					},
					{ text: "Metal REST API", link: "/documentation/rest-api" },
					{ text: "Metal MCP Server", link: "/documentation/mcp-server" },
				],
			},
			{
				text: "Studio",
				items: [
					{ text: "Overview", link: "/documentation/studio" },
					{ text: "Dashboard", link: "/documentation/studio/dashboard" },
					{ text: "Data", link: "/documentation/studio/data" },
					{ text: "MCP Tools", link: "/documentation/studio/mcp-tools" },
					{ text: "Designer", link: "/documentation/studio/designer" },
					{ text: "Scheduler", link: "/documentation/studio/scheduler" },
					{ text: "Config", link: "/documentation/studio/config" },
					{ text: "Logs", link: "/documentation/studio/logs" },
				],
			},
			{ text: "Technical Guides", link: "/guides/technical-guides" },
			{ text: "Change Log", link: "https://github.com/anismegdiche/metal-server/blob/latest/CHANGELOG.md" },
		],
		sidebar: {
			"/documentation/": [
				{
					text: "ℹ️ About Metal",
					collapsed: false,
					items: AboutMetal,
				},
				{
					text: "📚 Catalogue",
					collapsed: false,
					items: [
						{ text: "Data Providers", link: "/documentation/catalogue#data-providers" },
						{ text: "Storage Providers", link: "/documentation/catalogue#storage-providers" },
						{ text: "Content Providers", link: "/documentation/catalogue#content-providers" },
						{ text: "AI Tasks", link: "/documentation/catalogue#ai-tasks" },
						{ text: "Container Providers", link: "/documentation/catalogue#container-providers" },
						{ text: "Authentication Providers", link: "/documentation/catalogue#authentication-providers" },
					],
				},
				{
					text: "🛠️ Configuration file",
					collapsed: false,
					items: [
						{ text: "server", link: "/documentation/config-yml#server" },
						{ text: "mcp", link: "/documentation/config-yml#mcp" },
						{ text: "roles", link: "/documentation/config-yml#roles" },
						{ text: "users", link: "/documentation/config-yml#users" },
						{ text: "sources", link: "/documentation/config-yml#sources" },
						{ text: "schemas", link: "/documentation/config-yml#schemas" },
						{ text: "plans", link: "/documentation/config-yml#plans" },
						{ text: "schedules", link: "/documentation/config-yml#schedules" },
						{ text: "Environment Variables", link: "/documentation/env" },
					],
				},
				{
					text: "🖥️ Studio",
					collapsed: false,
					items: [
						{ text: "Overview", link: "/documentation/studio" },
						{ text: "Get Started", link: "/documentation/studio/get-started" },
						{ text: "Dashboard", link: "/documentation/studio/dashboard" },
						{ text: "Data", link: "/documentation/studio/data" },
						{ text: "MCP Tools", link: "/documentation/studio/mcp-tools" },
						{ text: "Designer", link: "/documentation/studio/designer" },
						{ text: "Scheduler", link: "/documentation/studio/scheduler" },
						{ text: "Config", link: "/documentation/studio/config" },
						{ text: "Logs", link: "/documentation/studio/logs" },
					],
				},
				{
					text: "🌐 API",
					collapsed: false,
					items: [
						{ text: "Metal REST API", link: "/documentation/rest-api" },
						{ text: "Metal MCP Server", link: "/documentation/mcp-server" },
					],
				},
			],
			"/guides/": [
				{
					text: "Server Configuration",
					collapsed: false,
					items: [{ text: "Understanding Authentication", link: "/guides/authentication" }],
				},
				{
					text: "MCP Server",
					collapsed: false,
					items: [{ text: "MCP Tools Guide", link: "/guides/mcp-tools" }],
				},
				{
					text: "REST API",
					collapsed: false,
					items: [
						{ text: "PostgreSQL database HTTP API", link: "/guides/postgresql-http-api" },
						{ text: "Exposing Selected Tables from MS SQL Server through HTTP API", link: "/guides/mssql-table-http-api" },
						{ text: "Microservice HTTP Middleware", link: "/guides/microservice-http-api" },
						{ text: "Schema with Plan table", link: "/guides/schema-plan-table" },
					],
				},
				{
					text: "Data Transformation",
					collapsed: false,
					items: [
						{ text: "Scheduled ETL", link: "/guides/scheduled-etl" },
						{ text: "Plan using AI Image classifier", link: "/guides/ai-image-classify" },
						{ text: "Transforming Azure Blob CSV Files into Data Tables", link: "/guides/azure-csv" },
					],
				},
			],
		},
	},
	lastUpdated: true,

	// mermaid: {
	//   // refer https://mermaid.js.org/config/setup/modules/mermaidAPI.html#mermaidapi-configuration-defaults for options
	// },
	// // optionally set additional config for plugin itself with MermaidPluginConfig
	// mermaidPlugin: {
	//   class: "mermaid my-class", // set additional css classes for parent container
	// },
})
