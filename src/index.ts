//
//
//  Metal Server
//
//

// ROADMAP ----- MVP -----
// ROADMAP PLAN > insert
// ROADMAP PLAN > update
// ROADMAP PLAN > delete
// ROADMAP PLAN > calculate time in state
// ROADMAP Config > Secured Users authentication
// ROADMAP PLAN > free sql
// ROADMAP Server > Database/dataset
// ROADMAP Sources > Virtual operations (clone data & queue operations in case of deconnection)
// ROADMAP Config > Map schema
// ROADMAP Config > Entities relationship
// ROADMAP Provider > XML
// ROADMAP Provider > HTML
// ROADMAP Provider > CSV
// ROADMAP Provider > Redis
// ROADMAP Provider > MySQL
// ROADMAP Provider > ELK
// ROADMAP Provider > Cassandra
// ROADMAP Provider > SQLite
// ROADMAP Provider > MariaDB
// ROADMAP Provider > GraphQL
// ROADMAP API > GraphQL
// ROADMAP Config > Sharding > via routing rules
// ROADMAP Encrypted Request > user establish encrypted connection and send encrypted request to hide params
// ROADMAP Options > vendorExpression  vendor free form filter expression
// ROADMAP WorkSpace : create seperated spaces for each config (sources,schemas,plans,users,...)

import { Server } from './server/Server'

Server.Init()
Server.Start()