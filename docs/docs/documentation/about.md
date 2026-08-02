---
description: "Metal:Middleware, ETL & AI at the same place. Empower your projects with a free open-source data transformation solution"
---
# About Metal

Metal (**M**iddleware, **E**xtraction, **T**ransformation, **A**rtificial Intelligence, and **L**oad) is an advanced technology that seamlessly merges artificial intelligence with database middleware and ETL functionalities, propelling enhanced performance and automating decision-making processes. 

It streamlines and modernizes CRUD operations and data transformation tasks across SQL and NoSQL databases, instigating a paradigm shift in data management and processing. Operating as an advanced middleware layer between the database system and HTTP requests, Metal manages communication with popular DBMS, particularly beneficial for systems like MS SQL Server and PostgreSQL that lack built-in REST APIs.

Going beyond traditional middleware, Metal natively speaks the Model Context Protocol (MCP) — the emerging standard that lets AI agents and LLM applications act directly on your data. With a simple declarative configuration, your schemas and entities become callable tools for the AI era, turning Metal into the bridge between your data infrastructure and the growing ecosystem of intelligent, autonomous applications.

```mermaid
flowchart TD
  A((Web Application)) --> M[Metal Server]
  L((AI/LLM Applications)) --> M

  subgraph P[Core Platform]
    M[Metal Server]
  end

  subgraph D[Data Stores]
    A1[(Relational DB)]
    B1[(Document DB)]
    C1[(Event Store)]
    F1[Files]
  end

  subgraph X[External Systems]
    W((Web services))
  end

  M --> A1
  M --> B1
  M --> C1
  M --> F1
  M --> W

  classDef core fill:#f8f8f8,stroke:#666,stroke-width:1px,rx:10,ry:10;
  classDef store fill:#fff,stroke:#666,stroke-width:1px;
  classDef ext fill:#f3f3ff,stroke:#666,stroke-width:1px;
  classDef actor fill:#ffffff,stroke:#666,stroke-width:1px,stroke-dasharray: 4 3;

  class M core;
  class A1,B1,C1,F1 store;
  class W ext;
  class A,L actor;
```

As a conduit between applications and the underlying DBMS, Metal accommodates various database operations, presenting a uniform interface for developers to construct and maintain applications that seamlessly interact with data. By abstracting complexities associated with direct DBMS engagement, Metal empowers developers to focus on core functionality, fostering productivity and manageability.

With its built-in MCP server, Metal extends this same abstraction to intelligent agents: AI assistants, chatbots, and automation pipelines can query, create, update, and manage your data through standardized MCP tools — secured by role-based access control, so you get the power of agentic data access without compromising security or control.

## Key Features

Metal offers a wide range of powerful features designed to enhance flexibility, security, and efficiency in data operations:

- **Unified REST API:** Modernize access to traditional database management systems like MS SQL Server, PostgreSQL, MySQL, or MariaDB through a unified REST API, simplifying integration processes.
  
- **Schema Virtualization:** Deliver different schema names and user credentials based on specific requirements, allowing your application to adapt to various environments without significant modifications.

- **Schema Merging:** Merge schemas from multiple databases and tables—even from different data providers—providing a unified view for seamless data analysis and manipulation.

- **AI-Powered Insights:** Leverage cutting-edge artificial intelligence to automatically identify patterns, trends, and anomalies within your datasets. This feature transforms raw data into strategic assets through intelligent insights.

- **MCP Server:** Expose Metal schemas and entities as MCP (Model Context Protocol) tools, enabling LLM clients and AI agents to read, create, update, delete, and list data through a declarative configuration.

- **Enhanced Security:** Prioritize security with an additional login process and granular access control. Enforce different levels of permissions per table and per MCP tool to protect sensitive data.

- **Dynamic Transformations:** Execute transformations on the fly without modifying existing schemas. This real-time processing capability eliminates the need for costly schema alterations.

## Benefits

By integrating an API with ETL capabilities, Metal provides numerous benefits:

- **Improved Productivity:** Developers can focus on core functionalities rather than dealing with complex database interactions.
  
- **Real-Time Data Processing:** With dynamic transformations and real-time access through the API, organizations can make timely decisions based on up-to-date information.

- **Scalability:** The architecture supports growing data needs efficiently without performance degradation.

- **Simplified Data Management:** A unified interface for diverse data sources simplifies CRUD operations and enhances overall data management practices.

## Understanding Metal Concepts

In the realm of Metal, several key concepts facilitate effective data management:

- **Source:** Represents the origin of data, encompassing various sources such as DBMS (SQL or NoSQL), JSON files, or flat files, serving as the primary entry point for data ingestion into the Metal framework.

- **Schema:** Acts as a standardized representation of the underlying database structure exposed to users, simplifying interaction with the data.

- **Entity:** Similar to tables in traditional databases, entities represent distinct sets of related information within Metal.

- **Field:** Equivalent to columns in conventional databases, fields define individual data attributes within entities.

- **Plan:** Encapsulates predefined steps for conducting ETL operations, enabling efficient transformation and integration of diverse data sources into a cohesive format.

- **AI Engine:** A sophisticated component that harnesses artificial intelligence to enhance decision-making by identifying patterns and trends in data.

- **MCP Tool:** A declarative mapping between an LLM-friendly input shape and a Metal schema operation, exposed to AI clients through the Model Context Protocol endpoint.

Metal's comprehensive feature set empowers developers while simplifying CRUD operations and enabling efficient integration across various database systems. By harnessing the power of artificial intelligence for advanced insights, Metal transforms how organizations approach database management and data transformation.


**Source**

The source represents the wellspring of data in Metal's ecosystem. It can take the form of a DBMS, be it SQL or NoSQL, a JSON file, or even a flat file. The source serves as the initial gateway through which data enters the Metal framework.

```mermaid
graph LR
    Source(Source) -- Connect --> DBMS(DBMS)
    Source(Source) -- Access --> Files(Files)
    Source(Source) -- Request --> WebService(WebService)
    Source(Source) -- Execute --> Plans(Plans)
```

**Schema**

The schema, in Metal's context, acts as the facade that encompasses the database structure exposed to users. It provides a standardized and unified representation of the underlying data, simplifying the interaction and understanding of the database's structure.

```mermaid
graph LR
    Schema(Schema) -- Connect --> Sources(Sources)
    Schema(Schema) -- Expose --> Entities(Entities)
```


**Entity**

Entities, akin to tables in traditional database terminology, are the building blocks of data organization within Metal. These entities represent distinct sets of related information and serve as the fundamental units for data management and retrieval.

```mermaid
graph LR
    Schema(Schema) -- Parent --> Entities(Entities)
```

**Field**

Fields, equivalent to columns in conventional databases, are the individual data attributes that make up an entity. They define the characteristics and properties of the data, enabling precise and granular data manipulation within Metal.

```mermaid
graph LR
    Entity(Entity) -- Parent --> Fields(Fields)
```

**Plan**

Plans within Metal encapsulate a predefined sequence of steps for conducting ETL (Extraction, Transformation, Load) operations. These plans facilitate the transformation and integration of data from diverse sources into a cohesive and structured format, enabling efficient data processing and analysis.

```mermaid
graph LR
    Plan(Plan) -- Parent --> Steps(Steps)
```

**AI Engine**

The AI Engine is a sophisticated component integrated into Metal's architecture. It harnesses the power of artificial intelligence to empower data-driven insights and decision-making. This engine automatically identifies patterns, trends, and anomalies within the data, enhancing the overall intelligence and functionality of the Metal platform. It acts as the catalyst for transforming raw data into strategic assets through intelligent analysis and predictive capabilities.

```mermaid
graph LR
    Step(Step) -- Run --> AI-Engine(AI Engine) -- Transform/Produce --> Data(Data)
```

**MCP Tool**

The MCP Tool exposes Metal schemas and entities to LLM clients through the Model Context Protocol. Each tool maps an LLM-friendly input shape to a schema operation (`read`, `create`, `update`, `delete`, or `list`) and is protected by role-based access control.

```mermaid
graph LR
    LLM(LLM Client) -- JSON-RPC --> MCP(MCP Endpoint) -- Operate --> Schema(Schema) -- Access --> Data(Data)
```

