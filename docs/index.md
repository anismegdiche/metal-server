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
    <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 20px; justify-items: center; align-items: center; text-align: center;">

    <!-- Azure SQL Database -->
    <img src="https://azure.microsoft.com/svghandler/sql-database/?width=600&height=315" title="Azure SQL Database" style="height:60px; filter:grayscale(100%);">

    <!-- MongoDB -->
    <img src="https://www.mongodb.com/assets/images/global/leaf.png" title="MongoDB" style="height:60px; filter:grayscale(100%);">

    <!-- PostgreSQL -->
    <img src="https://www.postgresql.org/media/img/about/press/elephant.png" title="PostgreSQL" style="height:60px; filter:grayscale(100%);">

    <!-- MySQL -->
    <img src="https://www.mysql.com/common/logos/logo-mysql-170x115.png" title="MySQL" style="height:60px; filter:grayscale(100%);">

    <!-- SQL Server -->
    <img src="https://www.svgrepo.com/download/303229/microsoft-sql-server-logo.svg" title="SQL Server" style="height:80px; filter:grayscale(100%);">

    <!-- Rest API -->
    <img src="https://static1.smartbear.co/swagger/media/assets/images/swagger_logo.svg"  title="Rest API" style="height:80px; filter:grayscale(100%);">

    <!-- SOAP -->
    <img src=https://xpertlab.com/wp-content/uploads/2020/12/icon-soap.png" title="SOAP" style="height:60px; filter:grayscale(100%);">

    <!-- Azure Blob Storage -->
    <img src="https://www.svgrepo.com/download/448272/azure-blob-storage.svg" title="Azure Blob Storage" style="height:60px; filter:grayscale(100%);">

    <!-- XML -->
    <img src="https://www.svgrepo.com/download/56785/xml.svg" title="XML" style="height:60px; filter:grayscale(100%);">

    <!-- CSV -->
    <img src="https://www.svgrepo.com/download/38911/csv.svg" alt="Microsoft CSV Icon" style="height:60px; filter:grayscale(100%);">

    <!-- JSON -->
    <img src="https://www.liblogo.com/img-logo/max/js8750je7e-json-logo-json-logo-icon-in-vector-logo.png" title="JSON" style="height:60px; filter:grayscale(100%);">

    <!-- FTP -->
    <img src="https://www.svgrepo.com/download/49250/ftp-upload.svg" tiltle="FTP" style="height:60px; filter:grayscale(100%);">
    
    <!-- Excel -->
    <img src="https://www.svgrepo.com/download/44103/xls.svg" alt="Microsoft Excel" style="height:60px; filter:grayscale(100%);">
    
    <img src="https://upload.wikimedia.org/wikipedia/commons/a/a2/OpenID_logo_2.svg" title="OpenID Connect" style="height:40px; filter:grayscale(100%);">

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





The key is that Metal excels at decoupling your application logic from the specifics of data storage and access. Any architecture that benefits from this decoupling can potentially work well with Metal:


<FancySection image="https://miro.medium.com/v2/resize:fit:2000/1*mGLO5IfhJv4o0NYOAZI60A.png">
<h1>Hexagonal Architecture</h1> Metal focus on abstraction, unified interfaces, and separation of concerns, makes it a good fit for applications designed using hexagonal architecture. It can serve as a valuable component in isolating your core business logic from the complexities of data access and management.
</FancySection>

<FancySection image="https://upload.wikimedia.org/wikipedia/commons/a/ab/Microservice_Databases.png" reverse>
<h1>Microservices Architecture</h1>
Metal's ability to abstract database access and provide a unified API makes it suitable for microservices. Each microservice can use Metal to interact with its data store without needing to implement database-specific logic. Metal can also help with data integration between microservices.
</FancySection>

<FancySection image="/images/example.jpg">
<h1>API Gateway Pattern</h1> 
Metal can act as a backend-for-frontend (BFF) or API gateway, providing a unified API for client applications while handling the complexities of interacting with different databases and data sources. This simplifies the client-side development and allows for more flexibility in the backend.
</FancySection>

<FancySection image="/images/example2.jpg" reverse>
<h1>Data Lake/Data Mesh Architecture</h1> 
Metal's capability to merge schemas from multiple databases and data providers makes it useful in a data lake or data mesh environment. It can provide a unified view of data across different data sources, enabling data analysis and reporting.
</FancySection>

<FancySection image="/images/example.jpg">
<h1>Layered Architecture</h1> 
Metal fits well within a layered architecture, acting as a data access layer that abstracts the complexities of database interactions from the business logic layer.
</FancySection>

<FancySection image="/images/example2.jpg" reverse>
<h1>Event-Driven Architecture</h1> 
Metal can be integrated with an event-driven architecture by publishing events when data changes occur in the underlying databases. This allows other services to react to data changes in real-time.
</FancySection>


<Badge type="warning" text="📜" style="line-height:0.9rem;padding:1px;margin:1px"/>