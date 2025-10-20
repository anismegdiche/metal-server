import axios from "axios"
import typia from "typia"
import { DataTable, JOIN_TYPE, REMOVE_DUPLICATES_METHOD, REMOVE_DUPLICATES_STRATEGY, SORT_ORDER } from "../../../types/DataTable"
import { AI_ENGINE } from "../../ai-engine/@consts"
import { AiEngine } from "../../ai-engine/AiEngine"
import { TEXT_TASK } from "../../ai-engine/consts/TEXT"
import { ConfigManager } from "../../core/ConfigManager"
import { HttpResponse } from "../../core/HttpResponse"
import { HttpErrorInternalServerError, HttpErrorNotFound } from "../../errors/HttpErrors"
import { Schema } from "../../schema/Schema"
import { TInternalResponse } from "../../schema/types/TInternalResponse"
import { TSchemaResponse } from "../../schema/types/TSchemaResponse"
import { DATA_ENTITY_TYPE } from "../../source/@consts"
import { Plan } from "../Plan"
import { Plans } from "../Plans"
import { Step } from "../Step"
import { TStep } from "../types/TStep"
import { TStepArgsAnonymize, TStepArgsJoin, TStepArgsRun, TStepArgsSort } from "../types/TStepArgs"
import { Text } from "../../ai-engine/engine/Text"

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

const entitiesData = new DataTable("entities", [
    { name: "entity1", type: DATA_ENTITY_TYPE.PLAN_ENTITY },
    { name: "entity2", type: DATA_ENTITY_TYPE.PLAN_ENTITY }
]);

const aiData = new DataTable("aiData", [
    { filename: "ocr", content: "base64", text: "I'm not confident with this project!" }
]);

const rndResponse = typia.random<TInternalResponse<TSchemaResponse>>() as unknown as TInternalResponse<TSchemaResponse>

describe('Step', () => {

    beforeEach(async () => {
        jest.clearAllMocks()
        Plans.Plans.clear()
    }, 120_000)

    describe('Select', () => {
        it('should return data from schema if schema and entity are given', async () => {
            const select = HttpResponse.Ok(<TSchemaResponse>{
                ...typia.random<TSchemaResponse>(),
                data: mySchemaEntity1
            })

            const spySchemaSelect = jest.spyOn(Schema, 'Select').mockResolvedValue(select);

            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: myPlanEntity1.Clone(),
                stepArgs: {
                    schema: "mySchema",
                    entity: mySchemaEntity1.Name
                }
            }

            const result = await Step.Select(step)

            expect(result).toBeInstanceOf(DataTable)
            expect(result.Name).toBe(mySchemaEntity1.Name)
            expect(result.GetFieldsName()).toEqual(mySchemaEntity1.GetFieldsName())
            expect(result.Rows()).toEqual(mySchemaEntity1.Rows())
            spySchemaSelect.mockRestore();
        })

        it('should return current data if schema and entity are not given', async () => {
            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: myPlanEntity1.Clone(),
                stepArgs: {}
            }

            const result = await Step.Select(step)

            expect(result).toBeInstanceOf(DataTable)
            expect(result.Name).toBe(myPlanEntity1.Name)
            expect(result.GetFieldsName()).toEqual(myPlanEntity1.GetFieldsName())
            expect(result.Rows()).toEqual(myPlanEntity1.Rows())
        })

        it('should return plan entity data from given plan entity', async () => {
            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: myPlanEntity1.Clone(),
                stepArgs: {
                    entity: myPlanEntity2.Name
                }
            }

            Plans.Plans.set(step.currentPlanName, new Plan(step.currentPlanName))

            const spyProcessSchemaRequest = jest.spyOn(Plans.Plans.get(step.currentPlanName)!, 'ProcessSchemaRequest').mockResolvedValue(myPlanEntity2);

            const result = await Step.Select(step)

            expect(result).toBeInstanceOf(DataTable)
            expect(result.Name).toBe(myPlanEntity2.Name)
            expect(result.GetFieldsName()).toEqual(myPlanEntity2.GetFieldsName())
            expect(result.Rows()).toEqual(myPlanEntity2.Rows())
            spyProcessSchemaRequest.mockRestore();
        })

        it('should throw error if only schema is given', async () => {
            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: myPlanEntity1.Clone(),
                stepArgs: {
                    schema: "mySchema"
                }
            }

            await expect(Step.Select(step)).rejects.toThrow(HttpErrorInternalServerError)
        })

        it('should throw error if plan entity not found', async () => {
            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: myPlanEntity1.Clone(),
                stepArgs: {
                    entity: "nonExistentEntity"
                }
            }

            Plans.Plans.set(step.currentPlanName, new Plan(step.currentPlanName))

            const spyProcessSchemaRequest = jest.spyOn(Plans.Plans.get(step.currentPlanName)!, 'ProcessSchemaRequest').mockRejectedValue(new HttpErrorNotFound("Entity not found"));

            await expect(Step.Select(step)).rejects.toThrow(HttpErrorNotFound)
            spyProcessSchemaRequest.mockRestore();
        })
    })

    describe('Insert', () => {
        it('should insert with schema, entity and data then return current datatable', async () => {
            const spySchemaInsert = jest.spyOn(Schema, 'Insert')
                .mockResolvedValue(rndResponse);

            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: myPlanEntity1.Clone(),
                stepArgs: {
                    schema: "mySchema",
                    entity: mySchemaEntity1.Name,
                    data: [{ name: "John", age: 25 }]
                }
            }

            const result = await Step.Insert(step)

            expect(result).toEqual(myPlanEntity1)
            spySchemaInsert.mockRestore();
        })

        it('should throw error if only entity was given', async () => {
            const spySchemaInsert = jest.spyOn(Schema, 'Insert').mockResolvedValue(rndResponse);

            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: myPlanEntity1.Clone(),
                stepArgs: {
                    entity: "users"
                }
            }

            await expect(Step.Insert(step)).rejects.toThrow(HttpErrorInternalServerError)
            spySchemaInsert.mockRestore();
        })

        it('should throw error if only schema was given', async () => {
            const spySchemaInsert = jest.spyOn(Schema, 'Insert').mockResolvedValue(rndResponse);

            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: myPlanEntity1.Clone(),
                stepArgs: {
                    schema: "mySchema"
                }
            }

            await expect(Step.Insert(step)).rejects.toThrow(HttpErrorInternalServerError)
            spySchemaInsert.mockRestore();
        })

        it('should add rows to current datatable when no schema and no entity', async () => {
            const spyAddRows = jest.spyOn(myPlanEntity1, 'AddRows').mockReturnValue(myPlanEntity1);

            const data = [{ name: "John", age: 25 }]

            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: myPlanEntity1.Clone(),
                stepArgs: {
                    data
                }
            }

            const result = await Step.Insert(step)
            expect(result).toBe(myPlanEntity1.AddRows(data))
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
            const spySchemaUpdate = jest.spyOn(Schema, 'Update')
                .mockResolvedValue(rndResponse);

            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: myPlanEntity1.Clone(),
                stepArgs: {
                    schema: "mySchema",
                    entity: "users",
                    data: [{ age: 30 }],
                    filter: { name: "John" }
                }
            }

            const result = await Step.Update(step)
            expect(result).toEqual(myPlanEntity1)
            spySchemaUpdate.mockRestore();
        })

        it('should throw error if only entity was given', async () => {
            const spySchemaUpdate = jest.spyOn(Schema, 'Update').mockResolvedValue(rndResponse);

            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: myPlanEntity1.Clone(),
                stepArgs: {
                    entity: "users"
                }
            }

            await expect(Step.Update(step)).rejects.toThrow(HttpErrorInternalServerError)
            spySchemaUpdate.mockRestore();
        })

        it('should throw error if only schema was given', async () => {
            const spySchemaUpdate = jest.spyOn(Schema, 'Update').mockResolvedValue(rndResponse);

            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: myPlanEntity1.Clone(),
                stepArgs: {
                    schema: "mySchema"
                }
            }

            await expect(Step.Update(step)).rejects.toThrow(HttpErrorInternalServerError)
            spySchemaUpdate.mockRestore();
        })

        it('should update current datatable when no schema and no entity', async () => {
            const data = [{ name: "David", age: 25, country: "France" }]

            const output = await myPlanEntity1
                .FreeSqlAsync(
                    `UPDATE [${myPlanEntity1.Name}] SET age = 25, country = 'France' WHERE name = 'David'`
                    , data
                )

            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: myPlanEntity1.Clone(),
                stepArgs: {
                    data: data,
                    filter: { name: "David" }
                }
            }

            const result = await Step.Update(step)
            expect(result).toEqual(output)
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
            const spySchemaDelete = jest.spyOn(Schema, 'Delete')
                .mockResolvedValue(rndResponse);

            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: myPlanEntity1.Clone(),
                stepArgs: {
                    schema: "mySchema",
                    entity: "users",
                    filter: { name: "John" }
                }
            }

            const result = await Step.Delete(step)
            expect(result).toEqual(myPlanEntity1)
            spySchemaDelete.mockRestore();
        })

        it('should throw error if only entity was given', async () => {
            const spySchemaDelete = jest.spyOn(Schema, 'Delete').mockResolvedValue(rndResponse);

            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: myPlanEntity1.Clone(),
                stepArgs: {
                    entity: "users"
                }
            }

            await expect(Step.Delete(step)).rejects.toThrow(HttpErrorInternalServerError)
            spySchemaDelete.mockRestore();
        })

        it('should throw error if only schema was given', async () => {
            const spySchemaDelete = jest.spyOn(Schema, 'Delete').mockResolvedValue(rndResponse);

            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: myPlanEntity1.Clone(),
                stepArgs: {
                    schema: "mySchema"
                }
            }

            await expect(Step.Delete(step)).rejects.toThrow(HttpErrorInternalServerError)
            spySchemaDelete.mockRestore();
        })

        it('should delete current datatable when no schema and no entity', async () => {

            const output = await myPlanEntity1.DeleteRows("name = 'David'")

            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: myPlanEntity1.Clone(),
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

            const spyListEntities = jest.spyOn(Schema, 'ListEntities').mockResolvedValue(
                HttpResponse.Ok(<TSchemaResponse>{
                    ...typia.random<TSchemaResponse>(),
                    data: entitiesData
                })
            );

            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: myPlanEntity1.Clone(),
                stepArgs: { schema: "mySchema" }
            }

            const result = await Step.ListEntities(step)

            expect(spyListEntities).toHaveBeenCalledWith({ schema: "mySchema" })
            expect(result).toBe(entitiesData)
            spyListEntities.mockRestore();
        })

        it('should return plan entities when no schema provided', async () => {
            const spyConfigManagerGet = jest.spyOn(ConfigManager, 'Get').mockReturnValue({
                entity1: {},
                entity2: {}
            });

            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: myPlanEntity1.Clone(),
                stepArgs: {}
            }

            const result = await Step.ListEntities(step)

            expect(spyConfigManagerGet).toHaveBeenCalledWith("plans.myPlan")
            expect(result).toBeInstanceOf(DataTable)
            expect(result.Rows()).toEqual([
                { name: "entity1", type: DATA_ENTITY_TYPE.PLAN_ENTITY },
                { name: "entity2", type: DATA_ENTITY_TYPE.PLAN_ENTITY }
            ])
            spyConfigManagerGet.mockRestore();
        })
    })

    describe('Join', () => {
        it('should perform left join with data from schema', async () => {
            const spySelect = jest.spyOn(Step, 'Select').mockResolvedValue(mySchemaEntity1);

            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: myPlanEntity2.Clone(),
                stepArgs: <TStepArgsJoin>{
                    type: JOIN_TYPE.LEFT,
                    schema: "mySchema",
                    entity: mySchemaEntity1.Name,
                    "left-field": "country",
                    "right-field": "country"
                }
            }

            const output = myPlanEntity2.Clone<DataTable>().RightJoin(mySchemaEntity1, "country", "country")
            const result = await Step.Join(step)

            expect(result).toEqual(output)

            spySelect.mockRestore();
        })

        it('should perform inner join with data from current plan', async () => {
            Plans.Plans.set("myPlan", new Plan("myPlan"))
            const spyProcessSchemaRequest = jest.spyOn(Plans.Plans.get("myPlan")!, 'ProcessSchemaRequest').mockResolvedValue(mySchemaEntity1);

            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: myPlanEntity1.Clone(),
                stepArgs: <TStepArgsJoin>{
                    entity: mySchemaEntity1.Name,
                    type: JOIN_TYPE.INNER,
                    "left-field": "country",
                    "right-field": "country"
                }
            }

            const output = myPlanEntity1.Clone<DataTable>().InnerJoin(mySchemaEntity1, "country", "country")
            const result = await Step.Join(step)

            expect(result).toEqual(output)

            spyProcessSchemaRequest.mockRestore();
        })

        it('should throw error when stepArgs is null', async () => {
            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: myPlanEntity1.Clone(),
                stepArgs: null
            }

            await expect(Step.Join(step)).rejects.toThrow(HttpErrorInternalServerError)
        })
    })

    describe('Fields', () => {
        it('should return current datatable when stepArgs is "*"', async () => {
            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: myPlanEntity1.Clone(),
                stepArgs: "*"
            }

            const result = await Step.Fields(step)
            expect(result).toEqual(myPlanEntity1)
        })

        it('should select specific fields from array', async () => {
            const spySelectFields = jest.spyOn(myPlanEntity1, 'SelectFields').mockReturnValue(myPlanEntity1);

            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: myPlanEntity1.Clone(),
                stepArgs: ["name", "age"]
            }

            const result = await Step.Fields(step)

            expect(spySelectFields).toHaveBeenCalledWith(["name", "age"])
            expect(result).toBe(myPlanEntity1)
            spySelectFields.mockRestore();
        })

        it('should select specific fields from comma-separated string', async () => {
            const spySelectFields = jest.spyOn(myPlanEntity1, 'SelectFields').mockReturnValue(myPlanEntity1);

            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: myPlanEntity1.Clone(),
                stepArgs: "name,age"
            }

            const result = await Step.Fields(step)

            expect(spySelectFields).toHaveBeenCalledWith(["name", "age"])
            expect(result).toBe(myPlanEntity1)
            spySelectFields.mockRestore();
        })
    })

    describe('Sort', () => {
        it('should sort datatable by specified criteria', async () => {

            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: myPlanEntity1.Clone(),
                stepArgs: <TStepArgsSort>{ age: SORT_ORDER.ASC }
            }

            const result = await Step.Sort(step)
            expect(result.Rows()[0].age).toEqual(14)
        })
    })

    describe('Debug', () => {
        it('should set debug metadata on datatable', async () => {
            const spySetMetaData = jest.spyOn(myPlanEntity1, 'SetMetaData');

            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: myPlanEntity1.Clone(),
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
                currentDataTable: mySchemaEntity1.Clone(),
                stepArgs: <TStepArgsAnonymize>["name"]
            }

            const result = await Step.Anonymize(step)
            const output = await mySchemaEntity1.Clone<DataTable>().Anonymize(["name"])
            expect(result).toEqual(output)
        })
    })

    describe('RemoveDuplicates', () => {
        it('should throw error when stepArgs is null', async () => {
            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: myPlanEntity1.Clone(),
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
                currentDataTable: myPlanEntity1.Clone(),
                stepArgs: {
                    keys: keys,
                    method: method,
                    strategy: strategy
                }
            }
            const output = await myPlanEntity1.Clone<DataTable>().RemoveDuplicates(keys, method, strategy)
            const result = await Step.RemoveDuplicates(step)

            expect(result).toEqual(output)
        })
    })

    describe('RemoveFields', () => {
        it('should remove specified fields from datatable', async () => {

            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: myPlanEntity1.Clone(),
                stepArgs: ["age"]
            }

            const result = await Step.RemoveFields(step)
            const output = myPlanEntity1.Clone<DataTable>().RemoveFields(["age"])
            expect(result).toEqual(output)
        })
    })

    describe('Break', () => {
        it('should throw __BREAK__ error', async () => {
            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: myPlanEntity1.Clone(),
                stepArgs: null
            }

            await expect(Step.Break(step)).rejects.toThrow("__BREAK__")
        })
    })

    describe('Run', () => {

        const spyAxios = jest.spyOn(axios, 'post');
        const spyAiEngineAiEnginesInstanceGet = jest.spyOn(AiEngine.AiEnginesInstance, 'get')
        const spyTextIsHealthy = jest.spyOn(Text.prototype, 'IsHealthy')
        const spyTextRun = jest.spyOn(Text.prototype, 'Run')
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
                currentDataTable: aiData.Clone(),
                stepArgs: <TStepArgsRun>{
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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            Object.values(result.Rows()[0][`${AI_ENGINE.TEXT}-${TEXT_TASK.EMOTION_DETECTION}`] as any).forEach(value => {
                expect(value).toEqual(expect.any(Number));
            });
        })

        it('should run specified task with output string', async () => {
            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: aiData.Clone(),
                stepArgs: <TStepArgsRun>{
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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            Object.values(result.Rows()[0]["result"] as any).forEach(value => {
                expect(value).toEqual(expect.any(Number));
            });
        })

        it('should run specified task with output mapped', async () => {
            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: aiData.Clone(),
                stepArgs: <TStepArgsRun>{
                    ai: AI_ENGINE.TEXT,
                    task: TEXT_TASK.EMOTION_DETECTION,
                    params: {
                        top: 10
                    },
                    input: "text",
                    output: {
                        joy: "emotion_joy",
                        surprise: "emotion_surprise"
                    }
                }
            }

            const result = await Step.Run(step)

            expect(result.Rows()[0]["emotion_joy"]).toEqual(expect.any(Number));
            expect(result.Rows()[0]["emotion_surprise"]).toEqual(expect.any(Number));
        })
    })
})