// .vitepress/config.js
import { withMermaid } from "vitepress-plugin-mermaid"

export default withMermaid({
  head: [
    ['link', { rel: 'icon', href: '/favicon.ico' }],
    [
      'script',
      { async: '', src: 'https://www.googletagmanager.com/gtag/js?id=G-8TBX91GK8B' }
    ],
    [
      'script',
      {},
      `var host = window.location.hostname;
      if(host != "localhost")
      {
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '8TBX91GK8B');
      }`
    ]
  ],
  titleTemplate: 'Metal',
  themeConfig: {
    logo: '/metal-logo-icon.png',
    siteTitle: 'Metal',
    search: {
      provider: 'local'
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/anismegdiche/metal-server' },
      { icon: 'linkedin', link: 'https://linkedin.com/in/anismegdiche' },
    ],
    footer: {
      message: 'Released under the GNU v3 License.',
      copyright: 'Copyright © 2024-present Anis Megdiche',
    },
    outline: 'deep',
    nav: [
      { text: 'About Metal', link: '/documentation/about' },
      { text: 'What\'s new', link: '/documentation/whats-new' },
      { text: 'Get Started', link: '/documentation/get-started' },
      {
        text: 'Documentation', items: [
          { text: 'Configuration file', link: '/documentation/config-yml' },
          { text: 'Data Providers Configurations', link: '/documentation/data-providers-config' },
          { text: 'Container Provider Configurations', link: '/documentation/container-provider-config' },
          { text: 'AI Engines Configurations', link: '/documentation/ai-engines' },
          { text: 'Optional Parameters', link: '/documentation/optional-parameters' },
          { text: 'Dynamic Expression Engine', link: '/documentation/dynamic-expression-engine' },
          { text: 'Understanding Authentication', link: '/guides/authentication' },
          { text: 'Metal API', link: '/documentation/rest-api' },
        ],
      },
      { text: 'Sample Project', link: '/sample-project' },
      { text: 'Technical Guides', link: '/guides/technical-guides' },
      { text: 'Change Log', link: 'https://github.com/anismegdiche/metal-server/blob/latest/CHANGELOG.md' },
    ],
    sidebar: {
      '/documentation/': [
        {
          text: 'Introduction',
          collapsible: false,
          items: [
            { text: 'About Metal', link: '/documentation/about' },
            { text: 'Key Features', link: '/documentation/about#key-features' },
            { text: 'Get Started', link: '/documentation/get-started' },
            { text: 'Swagger UI', link: '/documentation/get-started#swagger-ui' },
          ],
        },
        {
          text: 'Configuration file',
          collapsible: false,
          items: [
            { text: 'version', link: '/documentation/config-yml#version' },
            { text: 'server', link: '/documentation/config-yml#server' },
            { text: 'roles', link: '/documentation/config-yml#roles' },
            { text: 'users', link: '/documentation/config-yml#users' },
            { text: 'sources', link: '/documentation/config-yml#sources' },
            { text: 'schemas', link: '/documentation/config-yml#schemas' },
            { text: 'plans', link: '/documentation/config-yml#plans' },
            { text: 'schedules', link: '/documentation/config-yml#schedules' },
          ],
        },
        {
          text: 'Metal API',
          collapsible: false,
          items: [
            { text: 'Introduction', link: '/documentation/rest-api' },
            { text: 'User', link: '/documentation/rest-api#user' },
            { text: 'Server', link: '/documentation/rest-api#server' },
            { text: 'Schema', link: '/documentation/rest-api#schema' },
            { text: 'Plan', link: '/documentation/rest-api#plan' },
            { text: 'Cache', link: '/documentation/rest-api#cache' },
          ],
        },
        // {
        //   text: 'Expand your knowledge',
        //   collapsible: false,
        //   items: [
        //     { text: 'Understand cache mecanism', link: '#' },
        //     { text: 'Architecture', link: '/documentation/' },
        //   ],
        // },
      ],
      '/guides/': [
        {
          text: 'Server Configuration',
          collapsible: false,
          items: [
            { text: 'Understanding Authentication', link: '/guides/authentication' },
          ],
        },
        {
          text: 'API',
          collapsible: false,
          items: [
            { text: 'PostgreSQL database HTTP API', link: '/guides/postgresql-http-api' },
            { text: 'Exposing Selected Tables from MS SQL Server through HTTP API', link: '/guides/mssql-table-http-api' },
            { text: 'Microservice HTTP Middleware', link: '/guides/microservice-http-api' },
            { text: 'Schema with Plan table', link: '/guides/schema-plan-table' },
          ],
        },
        {
          text: 'Data Transformation',
          collapsible: false,
          items: [
            { text: 'Scheduled ETL', link: '/guides/scheduled-etl' },
            { text: 'Plan using AI Image classifier', link: '/guides/ai-image-classify' },
            { text: 'Transforming Azure Blob CSV Files into Data Tables', link: '/guides/azure-csv' },
          ],
        }
      ]
    },
  },
  lastUpdated: true

  // mermaid: {
  //   // refer https://mermaid.js.org/config/setup/modules/mermaidAPI.html#mermaidapi-configuration-defaults for options
  // },
  // // optionally set additional config for plugin itself with MermaidPluginConfig
  // mermaidPlugin: {
  //   class: "mermaid my-class", // set additional css classes for parent container 
  // },
})
