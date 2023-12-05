/* eslint-disable */

test(`nothing`, () => expect(null).toStrictEqual(null));

// (async () => {
//   const MetalClient = require("../metal_client");
//   //
//   const _metalClient = new MetalClient({
//     RestApiUrl: "http://localhost:3000",
//   });

//   const schema = "demo";
//   const entity = "res_users";

//   let response;

//   test(`Cache`, async () => {
//     response = await _metalClient.DataSelect(schema, entity, {
//       fields: "id, login",
//       cache: "36000",
//     });
//     expect(response.data).toStrictEqual({
//       result: "success",
//       rows: [
//         {
//           id: 7,
//           login: "portal",
//         },
//         {
//           id: 3,
//           login: "default",
//         },
//         {
//           id: 11,
//           login: "zkthiri@cloudcontrol.fr",
//         },
//         {
//           id: 4,
//           login: "public",
//         },
//         {
//           id: 5,
//           login: "portaltemplate",
//         },
//         {
//           id: 1,
//           login: "__system__",
//         },
//         {
//           id: 12,
//           login: "demo2",
//         },
//         {
//           id: 6,
//           login: "demo",
//         },
//         {
//           id: 2,
//           login: "admin",
//         },
//         {
//           id: 10,
//           login: "amegdiche@cloudcontrol.fr",
//         },
//         {
//           id: 9,
//           login: "shady@cloudcontrol.fr",
//         },
//         {
//           id: 8,
//           login: "admin_tenant",
//         },
//       ],
//       status: 200,
//       transaction: "select",
//     });
//   });

//   test(`Cache - Select`, async () => {
//     response = await _metalClient.DataSelect("cache", "cache", {})
//     console.log(response)
//     console.log(response?.rows?.length)
//     expect(response?.rows?.length).toBeGreaterThan(0)
// })

//   test(`Cache - Select Hash`, async () => {
//     response = await _metalClient.DataSelect("cache", "cache", {
//       "filter-expression": "hash = '63e7867a0c24b1e7f222c5bc800e8c0e4a7c55e99382c5d4f573b20d1b620eb3820deb5c7aefe03ff16f882b312e2afa3f74021e58e5e2fb94be13bd883e43fc'"
//     })
//     console.log(response)
//     console.log(response?.rows?.length)
//     expect(response.data).toStrictEqual(0)
// })

// })();
