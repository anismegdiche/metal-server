---
layout: home
title: Middleware - ETL - AI
description: "Metal:Middleware, ETL & AI at the same place. Empower your projects with a free open-source data transformation solution"


hero:
  name: Metal
  text: Middleware, ETL & AI<br/>at the same place
  image:
    src: /metal-logo-icon.png
    alt: Metal logo
  tagline: |
    Empower your projects with a free open-source data transformation solution.<br><center>
    <div class="technology">
      <!-- Data -->
      <img src="/logo/azure-sql-database.png" title="Azure SQL Database" class="technology-logo">
      <img src="/logo/azure-cosmos-db.png" title="Azure Cosmos DB" class="technology-logo">
      <img src="/logo/mongodb.png" title="MongoDB" class="technology-logo">
      <img src="/logo/postgres.png" title="PostgreSQL" class="technology-logo">
      <img src="/logo/mysql.png" title="MySQL" class="technology-logo">
      <img src="/logo/sql-server.svg" title="SQL Server" class="technology-logo">
      <img src="/logo/swagger.svg"  title="Rest API" class="technology-logo">
      <img src="/logo/soap.png" title="SOAP" class="technology-logo">

      <!-- Storage -->
      <img src="/logo/s3.png" tiltle="Amazon S3" class="technology-logo">
      <img src="/logo/azure-blob-storage.svg" title="Azure Blob Storage" class="technology-logo">
      <img src="/logo/azure-file-storage.png" title="Azure File Storage" class="technology-logo">
      <img src="/logo/azure-datalake.svg" title="Azure Datalake Gen2" class="technology-logo">
      <img src="/logo/ftp.svg" tiltle="FTP" class="technology-logo">
      <img src="/logo/smb.png" tiltle="SMB" class="technology-logo">

      <!-- Content -->
      <img src="/logo/xml.svg" title="XML" class="technology-logo">
      <img src="/logo/csv.svg" alt="Microsoft CSV Icon" class="technology-logo">
      <img src="/logo/json.png" title="JSON" class="technology-logo">
      <img src="/logo/xls.svg" alt="Microsoft Excel" class="technology-logo">

      <!-- Auth -->
      <img src="/logo/openid.svg" title="OpenID Connect" class="technology-logo">
    </div>
  actions:
    - theme: brand
      text: Learn more
      link: /documentation/about
    - theme: brand
      text: Get Started
      link: /documentation/get-started
    - theme: brand
      text: What's new
      link: /documentation/whats-new
    - theme: alt
      text: View on GitHub
      link: https://github.com/anismegdiche

link: https://github.com/anismegdiche

features:
  - icon: "<i class='fa-solid fa-network-wired' style='color:var(--color-red)'></i>"
    title: Modernize Access
    details: Metal provides a unified REST API that allows you to modernize the way you interact with popular DBMS like MS SQL Server, PostgreSQL, MySQL, or MariaDB.
  - icon: "<i class='fa-solid fa-sitemap' style='color:var(--color-red)'></i>"
    title: Virtualize Schema
    details: Metal enables you to virtualize schemas, allowing you to deliver different schema names and user credentials based on specific requirements.
  - icon: "<i class='fa-solid fa-robot' style='color:var(--color-red)'></i>"
    title: Leverage Artificial Intelligence
    details: Enable AI-driven capabilities for automatic identification of patterns, trends, and anomalies within your datasets.
  - icon: "<i class='fa-solid fa-arrows-spin' style='color:var(--color-red)'></i>"
    title: Streamlined ETL
    details: Apply data transformations dynamically at runtime or through scheduled jobs.
---
<script setup>
import FancySection from '.vitepress/theme/components/FancySection.vue'
</script>
<br>
<br>
<h1 class="red" >Boost Your Application with Metal</h1>
<p>
Metal revolutionizes application development by seamlessly decoupling business logic from data infrastructure. This critical separation future-proofs your architecture, accelerates development cycles, and unlocks unparalleled flexibility – making it the ultimate choice for modern systems designed to scale and adapt.
Here's how Metal supercharges key architectures:
</p>

<FancySection image="/archi/hexagonal.png">
<h2 class="index-h2">Hexagonal Architecture</h2> Metal focus on abstraction, unified interfaces, and separation of concerns, makes it a good fit for applications designed using hexagonal architecture. It can serve as a valuable component in isolating your core business logic from the complexities of data access and management.
</FancySection>

<FancySection image="/archi/microservices.png" reverse>
<h2 class="index-h2">Microservices Architecture</h2>
Metal's ability to abstract database access and provide a unified API makes it suitable for microservices. Each microservice can use Metal to interact with its data store without needing to implement database-specific logic. Metal can also help with data integration between microservices.
</FancySection>

<FancySection image="/archi/api-gateway.webp">
<h2 class="index-h2">API Gateway Pattern</h2> 
Metal can act as a backend-for-frontend (BFF) or API gateway, providing a unified API for client applications while handling the complexities of interacting with different databases and data sources. This simplifies the client-side development and allows for more flexibility in the backend.
</FancySection>

<FancySection image="/archi/datalake.webp" reverse>
<h2 class="index-h2">Data Lake/Data Mesh Architecture</h2> 
Metal's capability to merge schemas from multiple databases and data providers makes it useful in a data lake or data mesh environment. It can provide a unified view of data across different data sources, enabling data analysis and reporting.
</FancySection>

<FancySection image="/archi/layered.png">
<h2 class="index-h2">Layered Architecture</h2> 
Metal fits well within a layered architecture, acting as a data access layer that abstracts the complexities of database interactions from the business logic layer.
</FancySection>
