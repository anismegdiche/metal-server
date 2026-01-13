

import axios from "axios"
import { DataTable, SORT_ORDER } from "../../../types/DataTable"
import { DataTableUtils, JOIN_TYPE, REMOVE_DUPLICATES_METHOD, REMOVE_DUPLICATES_STRATEGY } from "../../../utils/DataTableUtils"
import { AI_ENGINE } from "../../ai-engine/@consts"
import { AiEngine } from "../../ai-engine/AiEngine"
import { TEXT_TASK } from "../../ai-engine/consts/TEXT"
import { Text } from "../../ai-engine/engine/Text"
import { HTTP_STATUS_CODE } from "../../core/@consts"
import { ConfigManager } from "../../core/ConfigManager"
import { HttpResponse } from "../../core/HttpResponse"
import type { TInternalResponse } from "../../core/types/TInternalResponse"
import { HttpErrorInternalServerError, HttpErrorNotFound } from "../../errors/HttpErrors"
import { Schema } from "../../schema/Schema"
import type { TSchemaResponse } from "../../schema/types/TSchemaResponse"
import { DATA_ENTITY_TYPE } from "../../source/@consts"
import { Plan } from "../Plan"
import { Plans } from "../Plans"
import { Step } from "../Step"
import type { TStep } from "../types/TStep"
import type {
    U_config_plans_plan_entity_anonymize_Params,
    U_config_plans_plan_entity_delete_Params,
    U_config_plans_plan_entity_insert_Params,
    U_config_plans_plan_entity_join_Params,
    U_config_plans_plan_entity_list_entities_Params,
    U_config_plans_plan_entity_pick_Params,
    U_config_plans_plan_entity_remove_duplicates_Params,
    U_config_plans_plan_entity_run_Params,
    U_config_plans_plan_entity_select_Params,
    U_config_plans_plan_entity_sort_Params,
    U_config_plans_plan_entity_update_Params
} from "../types/U_config_plans_plan_entity_step"

const mySchemaEntity1 = new DataTable("mySchemaEntity1", [
    { name: "Alice", age: 25, country: "USA" },
    { name: "Bob", age: 30, country: "France" },
    { name: "Charlie", age: 35, country: "Germany" }
]);

const myPlanEntity1 = new DataTable("myPlanEntity1", [
    { name: "David", age: 28 },
    { name: "Eve", age: 32 },
    { name: "Frank", age: 36 },
    { name: "Grace", age: 14 },
    { name: "Henry", age: 44 },
    { name: "Henry", age: 50 }
]);

const myPlanEntity2 = new DataTable("myPlanEntity2", [
    { country: "USA", code: "US" },
    { country: "France", code: "FR" },
    { country: "Germany", code: "DE" },
]);



const aiData = new DataTable("aiData", [
    { filename: "ocr", content: "base64", text: "I'm not confident with this project!" }
]);

const rndResponse = {
    StatusCode: 200,
    Body: {
        schema: "testSchema",
        entity: "testEntity"
    }
} as unknown as TInternalResponse<TSchemaResponse>

let dt_entity1: DataTable
let dt_entity2: DataTable

describe('Step', () => {

    beforeEach(async () => {
        vi.clearAllMocks()
        Plans.Plans.clear()
        dt_entity1 = await myPlanEntity1.Copy()
        dt_entity2 = await myPlanEntity2.Copy()
    }, 120_000)

    describe('Select', () => {
        it('should return data from schema if schema and entity are given', async () => {
            const intRespSelect = HttpResponse.Ok(<TSchemaResponse>{
                schema: "mySchema",
                entity: dt_entity1.Name,
                status: HTTP_STATUS_CODE.OK,
                data: dt_entity1
            })

            const spySchemaSelect = vi.spyOn(Schema, 'Select').mockResolvedValue(intRespSelect);

            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: dt_entity1,
                stepArgs: {
                    schema: "mySchema",
                    entity: dt_entity1.Name
                }
            }

            const result = await Step.Select(step)

            expect(result).toBeInstanceOf(DataTable)
            expect(result.Name).toBe(dt_entity1.Name)
            expect(result.GetFieldsName()).toEqual(dt_entity1.GetFieldsName())
            expect(await result.Rows()).toEqual(await dt_entity1.Rows())
            spySchemaSelect.mockRestore();
        })

        it('should return current data if schema and entity are not given', async () => {
            const stepSelect: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: dt_entity1,
                stepArgs: {}
            }

            const result = await Step.Select(stepSelect)

            expect(result).toBeInstanceOf(DataTable)
            expect(result.Name).toBe(dt_entity1.Name)
            expect(result.GetFieldsName()).toEqual(dt_entity1.GetFieldsName())
            expect(await result.Rows()).toEqual(await dt_entity1.Rows())
        })

        it('should return plan entity data from given plan entity', async () => {
            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: dt_entity1,
                stepArgs: {
                    entity: dt_entity2.Name
                }
            }

            Plans.Plans.set(step.currentPlanName, new Plan(step.currentPlanName))

            const spyProcessSchemaRequest = vi.spyOn(Plans.Plans.get(step.currentPlanName)!, 'ProcessSchemaRequest').mockResolvedValue(dt_entity2);

            const result = await Step.Select(step)

            expect(result).toBeInstanceOf(DataTable)
            expect(result.Name).toBe(dt_entity2.Name)
            expect(result.GetFieldsName()).toEqual(dt_entity2.GetFieldsName())
            expect(await result.Rows()).toEqual(await dt_entity2.Rows())
            spyProcessSchemaRequest.mockRestore();
        })

        it('should throw error if only schema is given', async () => {
            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: dt_entity1,
                stepArgs: <U_config_plans_plan_entity_select_Params>{
                    schema: "mySchema"
                }
            }

            await expect(Step.Select(step)).rejects.toThrow(HttpErrorInternalServerError)
        })

        it('should throw error if plan entity not found', async () => {
            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: dt_entity1,
                stepArgs: {
                    entity: "nonExistentEntity"
                }
            }

            Plans.Plans.set(step.currentPlanName, new Plan(step.currentPlanName))

            const spyProcessSchemaRequest = vi.spyOn(Plans.Plans.get(step.currentPlanName)!, 'ProcessSchemaRequest').mockRejectedValue(new HttpErrorNotFound("Entity not found"));

            await expect(Step.Select(step)).rejects.toThrow(HttpErrorNotFound)
            spyProcessSchemaRequest.mockRestore();
        })
    })

    describe('Insert', () => {
        it('should insert with schema, entity and data then return current datatable', async () => {
            const spySchemaInsert = vi.spyOn(Schema, 'Insert')
                .mockResolvedValue(rndResponse);

            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: dt_entity1,
                stepArgs: {
                    schema: "mySchema",
                    entity: mySchemaEntity1.Name,
                    data: [{ name: "John", age: 25 }]
                }
            }

            const result = await Step.Insert(step)

            expect(result).toEqual(dt_entity1)
            spySchemaInsert.mockRestore();
        })

        it('should throw error if only entity was given', async () => {
            const spySchemaInsert = vi.spyOn(Schema, 'Insert').mockResolvedValue(rndResponse);

            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: dt_entity1,
                stepArgs: {
                    entity: "users"
                }
            }

            await expect(Step.Insert(step)).rejects.toThrow(HttpErrorInternalServerError)
            spySchemaInsert.mockRestore();
        })

        it('should throw error if only schema was given', async () => {
            const spySchemaInsert = vi.spyOn(Schema, 'Insert').mockResolvedValue(rndResponse);

            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: dt_entity1,
                stepArgs: <U_config_plans_plan_entity_insert_Params>{
                    schema: "mySchema"
                }
            }

            await expect(Step.Insert(step)).rejects.toThrow(HttpErrorInternalServerError)
            spySchemaInsert.mockRestore();
        })

        it('should add rows to current datatable when no schema and no entity', async () => {
            const spyAddRows = vi.spyOn(dt_entity1, 'RowsAdd').mockImplementation(() => Promise.resolve(dt_entity1));

            const data = [{ name: "John", age: 25 }]

            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: dt_entity1,
                stepArgs: {
                    data
                }
            }

            const result = await Step.Insert(step)
            expect(result).toBe(await dt_entity1.RowsAdd(data))
            spyAddRows.mockRestore();
        })

        it('should throw error when no args are given', async () => {
            const emptyDataTable = new DataTable("empty", []);

            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: emptyDataTable,
                stepArgs: {}
            }

            await expect(Step.Insert(step)).rejects.toThrow(HttpErrorInternalServerError)
        })

        it('should throw error when no data is given', async () => {
            const emptyDataTable = new DataTable("empty", []);

            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: emptyDataTable,
                stepArgs: {
                    schema: "mySchema",
                    entity: mySchemaEntity1.Name
                }
            }

            await expect(Step.Insert(step)).rejects.toThrow(HttpErrorInternalServerError)
        })
    })

    describe('Update', () => {
        it('should update data to schema when entity is provided', async () => {
            const spySchemaUpdate = vi.spyOn(Schema, 'Update')
                .mockResolvedValue(rndResponse);

            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: dt_entity1,
                stepArgs: {
                    schema: "mySchema",
                    entity: "users",
                    data: [{ age: 30 }],
                    filter: { name: "John" }
                }
            }

            const result = await Step.Update(step)
            expect(result).toEqual(dt_entity1)
            spySchemaUpdate.mockRestore();
        })

        it('should throw error if only entity was given', async () => {
            const spySchemaUpdate = vi.spyOn(Schema, 'Update').mockResolvedValue(rndResponse);

            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: dt_entity1,
                stepArgs: {
                    entity: "users"
                }
            }

            await expect(Step.Update(step)).rejects.toThrow(HttpErrorInternalServerError)
            spySchemaUpdate.mockRestore();
        })

        it('should throw error if only schema was given', async () => {
            const spySchemaUpdate = vi.spyOn(Schema, 'Update').mockResolvedValue(rndResponse);

            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: dt_entity1,
                stepArgs: <U_config_plans_plan_entity_update_Params>{
                    schema: "mySchema"
                }
            }

            await expect(Step.Update(step)).rejects.toThrow(HttpErrorInternalServerError)
            spySchemaUpdate.mockRestore();
        })

        it('should update current datatable when no schema and no entity', async () => {
            const data = [{ age: 25, country: "France" }]

            const output = await dt_entity1.Copy()
            await output.FreeSql({
                sqlQuery: `UPDATE "${dt_entity1.Name}" SET age = 25, country = 'France' WHERE name = 'David'`
            })

            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: dt_entity1,
                stepArgs: {
                    data: data,
                    filter: { name: "David" }
                }
            }

            const result = await Step.Update(step)

            const outputRows = await output.Rows()
            const resultRows = await result.Rows()

            expect(resultRows).toEqual(outputRows)
        })

        it('should throw error when no args are given', async () => {
            const emptyDataTable = new DataTable("empty", []);

            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: emptyDataTable,
                stepArgs: {}
            }

            await expect(Step.Update(step)).rejects.toThrow(HttpErrorInternalServerError)
        })

        it('should throw error when no data is given', async () => {
            const emptyDataTable = new DataTable("empty", []);

            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: emptyDataTable,
                stepArgs: {
                    schema: "mySchema",
                    entity: mySchemaEntity1.Name
                }
            }

            await expect(Step.Update(step)).rejects.toThrow(HttpErrorInternalServerError)
        })
    })

    describe('Delete', () => {
        it('should delete data to schema when entity is provided', async () => {
            const spySchemaDelete = vi.spyOn(Schema, 'Delete')
                .mockResolvedValue(rndResponse);

            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: dt_entity1,
                stepArgs: {
                    schema: "mySchema",
                    entity: "users",
                    filter: { name: "John" }
                }
            }

            const result = await Step.Delete(step)
            expect(result).toEqual(dt_entity1)
            spySchemaDelete.mockRestore();
        })

        it('should throw error if only entity was given', async () => {
            const spySchemaDelete = vi.spyOn(Schema, 'Delete').mockResolvedValue(rndResponse);

            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: dt_entity1,
                stepArgs: {
                    entity: "users"
                }
            }

            await expect(Step.Delete(step)).rejects.toThrow(HttpErrorInternalServerError)
            spySchemaDelete.mockRestore();
        })

        it('should throw error if only schema was given', async () => {
            const spySchemaDelete = vi.spyOn(Schema, 'Delete').mockResolvedValue(rndResponse);

            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: dt_entity1,
                stepArgs: <U_config_plans_plan_entity_delete_Params>{
                    schema: "mySchema"
                }
            }

            await expect(Step.Delete(step)).rejects.toThrow(HttpErrorInternalServerError)
            spySchemaDelete.mockRestore();
        })

        it('should delete current datatable when no schema and no entity', async () => {

            const output = await dt_entity1.RowsDelete("name = 'David'")

            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: dt_entity1,
                stepArgs: {
                    filter: { name: "David" }
                }
            }

            const result = await Step.Delete(step)
            expect(result).toEqual(output)
        })

        it('should remove all data from plan when no args are given', async () => {
            const emptyDataTable = new DataTable("empty", []);

            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: emptyDataTable,
                stepArgs: {}
            }

            const result = await Step.Delete(step)
            expect(result).toEqual(emptyDataTable)
        })
    })

    describe('ListEntities', () => {
        it('should return schema entities when schema is provided', async () => {
            const entitiesData = new DataTable("entities", [
                { name: "entity1", type: "table" },
                { name: "entity2", type: "view" }
            ]);

            const spyListEntities = vi.spyOn(Schema, 'ListEntities').mockResolvedValue(
                HttpResponse.Ok(<TSchemaResponse>{
                    schema: "mySchema",
                    status: HTTP_STATUS_CODE.OK,
                    data: entitiesData
                })
            );

            const stepListEntities: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: dt_entity1,
                stepArgs: <U_config_plans_plan_entity_list_entities_Params>{
                    schema: "mySchema"
                }
            }

            const result = await Step.ListEntities(stepListEntities)

            expect(spyListEntities).toHaveBeenCalledWith({ schema: "mySchema" })
            expect(result).toBe(entitiesData)
            spyListEntities.mockRestore();
        })

        it('should return plan entities when no schema provided', async () => {
            const spyConfigManagerGet = vi.spyOn(ConfigManager, 'Get').mockReturnValue({
                entity1: {},
                entity2: {}
            });

            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: dt_entity1,
                stepArgs: null
            }

            const result = await Step.ListEntities(step)

            expect(spyConfigManagerGet).toHaveBeenCalledWith("plans.myPlan")
            expect(result).toBeInstanceOf(DataTable)
            expect(await result.Rows()).toEqual([
                { name: "entity1", type: DATA_ENTITY_TYPE.PLAN_ENTITY },
                { name: "entity2", type: DATA_ENTITY_TYPE.PLAN_ENTITY }
            ])
            spyConfigManagerGet.mockRestore();
        })
    })

    describe('Join', () => {
        it('should perform left join with data from schema', async () => {
            const spySelect = vi.spyOn(Step, 'Select').mockResolvedValue(mySchemaEntity1);

            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: dt_entity2,
                stepArgs: <U_config_plans_plan_entity_join_Params>{
                    type: JOIN_TYPE.LEFT,
                    schema: "mySchema",
                    entity: mySchemaEntity1.Name,
                    "left-field": "country",
                    "right-field": "country"
                }
            }

            const output = await DataTableUtils.RightJoin(
                dt_entity2,
                dt_entity1,
                "country", "country")
            const result = await Step.Join(step)

            expect(result).toEqual(output)

            spySelect.mockRestore();
        })

        it('should perform inner join with data from current plan', async () => {
            Plans.Plans.set("myPlan", new Plan("myPlan"))
            const spyProcessSchemaRequest = vi.spyOn(Plans.Plans.get("myPlan")!, 'ProcessSchemaRequest').mockResolvedValue(mySchemaEntity1);

            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: dt_entity1,
                stepArgs: <U_config_plans_plan_entity_join_Params>{
                    entity: mySchemaEntity1.Name,
                    type: JOIN_TYPE.INNER,
                    "left-field": "country",
                    "right-field": "country"
                }
            }

            const output = await DataTableUtils.InnerJoin(
                dt_entity1,
                mySchemaEntity1,
                "country", "country")
            const result = await Step.Join(step)

            expect(result).toEqual(output)

            spyProcessSchemaRequest.mockRestore();
        })

        it('should throw error when stepArgs is null', async () => {
            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: dt_entity1,
                stepArgs: null
            }

            await expect(Step.Join(step)).rejects.toThrow(HttpErrorInternalServerError)
        })
    })

    describe('Pick', () => {
        it('should return current datatable when stepArgs is "*"', async () => {
            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: dt_entity1,
                stepArgs: <U_config_plans_plan_entity_pick_Params>["*"]
            }

            const result = await Step.Pick(step)
            expect(result).toEqual(dt_entity1)
        })

        it('should select specific fields from array', async () => {
            const spySelectFields = vi.spyOn(dt_entity1, 'Pick').mockReturnValue(Promise.resolve(dt_entity1));

            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: dt_entity1,
                stepArgs: <U_config_plans_plan_entity_pick_Params>["name", "age"]
            }

            const result = await Step.Pick(step)

            expect(spySelectFields).toHaveBeenCalledWith(["name", "age"])
            expect(result).toBe(dt_entity1)
            spySelectFields.mockRestore();
        })

        it('should select specific fields from comma-separated string', async () => {
            const spySelectFields = vi.spyOn(dt_entity1, 'Pick').mockReturnValue(Promise.resolve(dt_entity1));

            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: dt_entity1,
                stepArgs: <U_config_plans_plan_entity_pick_Params>["name", "age"]
            }

            const result = await Step.Pick(step)

            expect(spySelectFields).toHaveBeenCalledWith(["name", "age"])
            expect(result).toBe(dt_entity1)
            spySelectFields.mockRestore();
        })
    })

    describe('Sort', () => {
        it('should sort datatable by specified criteria', async () => {

            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: dt_entity1,
                stepArgs: <U_config_plans_plan_entity_sort_Params>{ age: SORT_ORDER.ASC }
            }

            const result = await Step.Sort(step)
            expect((await result.Rows())[0]!.age).toEqual(14)
        })
    })

    describe('Debug', () => {
        it('should set debug metadata on datatable', async () => {
            const spySetMetaData = vi.spyOn(dt_entity1, 'MetaDataSet');

            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: dt_entity1,
                stepArgs: "error"
            }

            const result = await Step.Debug(step)

            expect(spySetMetaData).toHaveBeenCalledWith("__PLAN_ERRORS__", [])
            expect(result).toHaveProperty("MetaData.__PLAN_ERRORS__")
            expect(result).toHaveProperty("MetaData.__PLAN_DEBUG__")
            spySetMetaData.mockRestore();
        })
    })

    describe('Anonymize', () => {
        it('should anonymize specified fields', async () => {
            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: dt_entity1,
                stepArgs: <U_config_plans_plan_entity_anonymize_Params>["name"]
            }

            const result = await Step.Anonymize(step)
            const output = await DataTableUtils.Anonymize(dt_entity1, ["name"])
            expect(result).toEqual(output)
        })
    })

    describe('RemoveDuplicates', () => {
        it('should throw error when stepArgs is null', async () => {
            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: dt_entity1,
                stepArgs: null
            }

            await expect(Step.RemoveDuplicates(step)).rejects.toThrow(HttpErrorInternalServerError)
        })

        it('should remove duplicates with specified parameters', async () => {

            const keys = ["name"]
            const method = REMOVE_DUPLICATES_METHOD.HASH
            const strategy = REMOVE_DUPLICATES_STRATEGY.LAST

            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: dt_entity1,
                stepArgs: <U_config_plans_plan_entity_remove_duplicates_Params>{
                    keys: keys,
                    method: method,
                    strategy: strategy
                }
            }
            const output = await DataTableUtils.RemoveDuplicates(dt_entity1, keys, method, strategy)
            const result = await Step.RemoveDuplicates(step)

            expect(result).toEqual(output)
        })
    })

    describe('RemoveFields', () => {
        it('should remove specified fields from datatable', async () => {

            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: dt_entity1,
                stepArgs: ["age"]
            }

            const result = await Step.Omit(step)
            const output = await dt_entity1.Omit(["age"])
            expect(result).toEqual(output)
        })
    })

    describe('Break', () => {
        it('should throw __BREAK__ error', async () => {
            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: dt_entity1,
                stepArgs: null
            }

            await expect(Step.Break(step)).rejects.toThrow("__BREAK__")
        })
    })

    describe('Run', () => {

        const spyAxios = vi.spyOn(axios, 'post');
        const spyAiEngineAiEnginesInstanceGet = vi.spyOn(AiEngine.AiEnginesInstance, 'get')
        const spyTextIsHealthy = vi.spyOn(Text.prototype, 'IsHealthy')
        const spyTextRun = vi.spyOn(Text.prototype, 'Run')
        spyAxios.mockImplementation(() => {
            return Promise.resolve({
                data: {
                    result: [
                        [
                            {
                                "label": "joy",
                                "score": "0.9658117294311523"
                            },
                            {
                                "label": "surprise",
                                "score": "0.02311941795051098"
                            },
                            {
                                "label": "neutral",
                                "score": "0.006501524709165096"
                            },
                            {
                                "label": "anger",
                                "score": "0.0017172531224787235"
                            },
                            {
                                "label": "sadness",
                                "score": "0.0012625681702047586"
                            },
                            {
                                "label": "fear",
                                "score": "0.001110117882490158"
                            },
                            {
                                "label": "disgust",
                                "score": "0.0004773985710926354"
                            }
                        ]
                    ]
                }
            });
        });

        spyAiEngineAiEnginesInstanceGet.mockImplementation(() => new Text())
        spyTextIsHealthy.mockImplementation(() => Promise.resolve(true))
        spyTextRun.mockImplementation(() => Promise.resolve({
            "joy": 0.9658117294311523,
            "surprise": 0.02311941795051098,
            "neutral": 0.006501524709165096,
            "anger": 0.0017172531224787235,
            "sadness": 0.0012625681702047586,
            "fear": 0.001110117882490158,
            "disgust": 0.0004773985710926354
        }))

        beforeEach(() => {
            // spyAxios.mockClear();
        });

        it('should run specified task with output null', async () => {
            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: await aiData.Copy(),
                stepArgs: <U_config_plans_plan_entity_run_Params>{
                    ai: AI_ENGINE.TEXT,
                    task: TEXT_TASK.EMOTION_DETECTION,
                    params: {
                        top: 10
                    },
                    input: "text",
                    output: null
                }
            }

            const result = await Step.Run(step)
            const rows = await result.Rows()
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            Object.values(rows[0]![`${AI_ENGINE.TEXT}-${TEXT_TASK.EMOTION_DETECTION}`] as any).forEach(value => {
                expect(value).toEqual(expect.any(Number));
            });
        })

        it('should run specified task with output string', async () => {
            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: await aiData.Copy(),
                stepArgs: <U_config_plans_plan_entity_run_Params>{
                    ai: AI_ENGINE.TEXT,
                    task: TEXT_TASK.EMOTION_DETECTION,
                    params: {
                        top: 10
                    },
                    input: "text",
                    output: "result"
                }
            }

            const result = await Step.Run(step)
            const rows = await result.Rows()
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            Object.values(rows[0]!["result"] as any).forEach(value => {
                expect(value).toEqual(expect.any(Number));
            });
        })

        it('should run specified task with output mapped', async () => {
            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: await aiData.Copy(),
                stepArgs: <U_config_plans_plan_entity_run_Params>{
                    ai: AI_ENGINE.TEXT,
                    task: TEXT_TASK.EMOTION_DETECTION,
                    params: {
                        top: 10
                    },
                    input: "text",
                    output: {
                        emotion_joy: "joy",
                        emotion_surprise: "surprise"
                    }
                }
            }

            const result = await Step.Run(step)

            const rows = await result.Rows()

            expect(rows[0]!["emotion_joy"]).toEqual(expect.any(Number));
            expect(rows[0]!["emotion_surprise"]).toEqual(expect.any(Number));
        })
    })
})