---
description: "Metal:Middleware, ETL & AI at the same place. Empower your projects with a free open-source data transformation solution"
---

# Sample Project Overview

## Introduction

This sample project showcases a Docker Compose stack comprising Metal Server and various Database Management System (DBMS) providers.

The stack comes preloaded with data, facilitating the execution and testing of diverse use cases.

The project has been tested on:

- CentOS 7
- Ubuntu 22

### Stack Services

Here's an overview of the key services included in the stack:

| Service Name           | Description                     | Docker Image                                                                                                               |
| ---------------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| metal                  | Metal Server                    | [metal-server Dockerfile](https://github.com/anismegdiche/metal-sample-project/blob/master/sample/metal-server/dockerfile) |
| mdb-mflix              | MongoDB                         | mongo:latest                                                                                                               |
| ms-hr                  | MS SQL Server 2019              | mcr.microsoft.com/mssql/server:2019-latest                                                                                 |
| pg-northwind           | PostgreSQL Server               | postgres:latest                                                                                                            |
| pg-clubdata            | PostgreSQL Server               | postgres:latest                                                                                                            |
| pg-clubdata-bookings   | PostgreSQL Server               | postgres:latest                                                                                                            |
| pg-clubdata-members    | PostgreSQL Server               | postgres:latest                                                                                                            |
| pg-clubdata-facilities | PostgreSQL Server               | postgres:latest                                                                                                            |
| azurite                | Microsoft Azure Storage Azurite | mcr.microsoft.com/azure-storage/azurite:latest                                                                             |
| ftp-server             | FTP Server                      | garethflowers/ftp-server:latest                                                                                            |

### Databases

For each DBMS, the project includes specific databases with associated tables or collections:

| Service Name           | Database Name | Tables/Collections Names                                                                                                                                                                    |
| ---------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| mdb-mflix              | mflix         | movies, users, sessions, comments, theaters                                                                                                                                                 |
| ms-hr                  | hr            | regions, countries, locations, jobs, departments, employees, dependents                                                                                                                     |
| pg-northwind           | northwind     | territories, order_details, employee_territories, us_states, customers, orders, employees, shippers, products, categories, suppliers, region, customer_demographics, customer_customer_demo |
| pg-clubdata            | clubdata      | members, facilities, bookings, mflix_log                                                                                                                                                    |
| pg-clubdata-members    | clubdata      | members                                                                                                                                                                                     |
| pg-clubdata-facilities | clubdata      | facilities                                                                                                                                                                                  |
| pg-clubdata-bookings   | clubdata      | bookings                                                                                                                                                                                    |

### Files

The project includes files to be used with File Data provider:

| File Name                                                                                                                  | Storage                  | Content   |
| -------------------------------------------------------------------------------------------------------------------------- | ------------------------ | --------- |
| [colors.json](https://github.com/anismegdiche/metal-sample-project/blob/0.2/sample/azurite/datacontainer1/colors.json)     | azurite (datacontainer1) | JSON data |
| [addresses.csv](https://github.com/anismegdiche/metal-sample-project/blob/0.2/sample/azurite/datacontainer1/addresses.csv) | azurite (datacontainer1) | CSV data  |

### Configuration File

The project includes a readily available configuration file for seamless setup.
[Configuration File](https://github.com/anismegdiche/metal-server/blob/main/config/config-sample-docker.yml)

## Prerequisites

Before delving into the sample project, ensure that your environment meets the following prerequisites:

- [Docker](https://www.docker.com/) 27 or newer
- [Git](https://git-scm.com/) 2.47 or newer

## Installation

Follow these steps to install the sample project:

1. Clone the sample project repository:

   ```bash
   git clone https://github.com/anismegdiche/metal-sample-project.git
   ```

2. Navigate to the project folder:

   ```bash
   cd metal-sample-project
   ```

3. Change the permissions of the `install.sh` script:

   ```bash
   chmod +x *.sh
   ```

4. Run the installation script:

   ```bash
   ./install.sh
   ```

   The stack will be up and ready after the installation process.

## Verification

To ensure everything is set up correctly, run the following command:

```bash
curl http://127.0.0.1:3000/server/info
```

You sould receive the following response:

```json
{ "server": "Metal", "version": "0.5" }
```

Congratulations! You have successfully configured and verified your Metal Server Sample Project.

For more configuration details and use cases, please refer to the section [Technical Guides](https://metal-docs-sh3b0.kinsta.page/guides/technical-guides.html)
