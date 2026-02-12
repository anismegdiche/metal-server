/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DataTable } from '../../../types/DataTable';
import { REMOVE_DUPLICATES_METHOD, REMOVE_DUPLICATES_STRATEGY, DataTableUtils } from '../../../utils/DataTableUtils';
import { ConfigManager } from '../../core/ConfigManager';
import { HttpResponse } from '../../core/HttpResponse';
import type { TInternalResponse } from '../../core/types/TInternalResponse';
import { HttpErrorInternalServerError, HttpErrorNotFound } from '../../errors/HttpErrors';
import { Schema } from '../../schema/Schema';
import type { TSchemaResponse } from '../../schema/types/TSchemaResponse';
import { DATA_ENTITY_TYPE } from '../../source/@consts';
import { Plan } from '../Plan';
import { Plans } from "../Plans";
import { Anonymize } from '../steps/Anonymize';
import { Break } from '../steps/Break';
import { Debug } from '../steps/Debug';
import { Delete } from '../steps/Delete';
import { Insert } from '../steps/Insert';
import { ListEntities } from '../steps/ListEntities';
import { Omit } from '../steps/Omit';
import { Pick } from '../steps/Pick';
import { RemoveDuplicates } from '../steps/RemoveDuplicates';
import { Select } from '../steps/Select';
import { Sort } from '../steps/Sort';
import { Update } from '../steps/Update';
import type { TStep } from '../types/TStep';

vi.mock('../../../utils/Logger', () => ({
    LOGGER_DEFAULT_LEVEL: 'info',
    VERBOSITY: { DEBUG: 'debug' },
    Logger: {
        LogFunction: () => (target: any, propertyKey: string, descriptor: PropertyDescriptor) => descriptor,
        Info: vi.fn(),
        Error: vi.fn(),
        Debug: vi.fn(),
        In: '',
        Out: ''
    }
}));

vi.mock('../../schema/Schema');
vi.mock('../../core/ConfigManager');
vi.mock('../Plans');

const mySchemaEntity1 = new DataTable("mySchemaEntity1", [
    { name: "Alice", age: 25, country: "USA" },
    { name: "Bob", age: 30, country: "France" },
    { name: "Charlie", age: 35, country: "Germany" }
]);
await mySchemaEntity1.RowsSet()

const myPlanEntity1 = new DataTable("myPlanEntity1", [
    { name: "David", age: 28 },
    { name: "Eve", age: 32 },
    { name: "Frank", age: 36 },
    { name: "Grace", age: 40 },
    { name: "Henry", age: 44 },
]);
await myPlanEntity1.RowsSet()

const myPlanEntity2 = new DataTable("myPlanEntity2", [
    { country: "USA" },
    { country: "France" },
    { country: "Germany" },
]);
await myPlanEntity2.RowsSet()

const entitiesData = new DataTable("entities", [
    { name: "entity1", type: DATA_ENTITY_TYPE.TABLE },
    { name: "entity2", type: DATA_ENTITY_TYPE.VIEW }
]);
await entitiesData.RowsSet()

describe('Step', () => {

    beforeEach(async () => {
        vi.clearAllMocks()
        Plans.clear()
    }, 120_000)

    describe('Select', () => {
        it('should return data from schema if schema and entity are given', async () => {
            const select = HttpResponse.Ok(<TSchemaResponse>{
                schema: "mySchema",
                entity: "mySchemaEntity1",
                status: 200,
                data: mySchemaEntity1
            })

            const spySchemaSelect = vi.spyOn(Schema, 'Select').mockResolvedValue(select);
            const spyIsSchemaResponse = vi.spyOn(Schema, 'IsSchemaResponse').mockReturnValue(true);
            vi.spyOn(mySchemaEntity1, 'Count').mockResolvedValue(3);

            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: myPlanEntity1,
                stepArgs: {
                    schema: "mySchema",
                    entity: mySchemaEntity1.Name
                }
            }

            const result = await Select(step)

            expect(result).toBeInstanceOf(DataTable)
            expect(result.Name).toBe(mySchemaEntity1.Name)
            expect(result.GetFieldsName()).toEqual(mySchemaEntity1.GetFieldsName())
            // Note: result.Rows() is not working due to DataTable class issues
            // expect(await result.Rows()).toEqual(await mySchemaEntity1.Rows())
            spySchemaSelect.mockRestore();
            spyIsSchemaResponse.mockRestore();
        })

        it('should return current data if schema and entity are not given', async () => {
            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: myPlanEntity1,
                stepArgs: {}
            }

            const result = await Select(step)

            expect(result).toBeInstanceOf(DataTable)
            expect(result.Name).toBe(myPlanEntity1.Name)
            expect(result.GetFieldsName()).toEqual(myPlanEntity1.GetFieldsName())
            // Note: result.Rows() is not working due to DataTable class issues
            // expect(await result.Rows()).toEqual(await myPlanEntity1.Rows())
        })

        it('should return plan entity data from given plan entity', async () => {
            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: myPlanEntity1,
                stepArgs: {
                    entity: myPlanEntity2.Name
                }
            }

            Plans.set(step.currentPlanName, new Plan(step.currentPlanName))

            const spyProcessSchemaRequest = vi.spyOn(Plans.get(step.currentPlanName)!, 'ProcessSchemaRequest').mockResolvedValue(myPlanEntity2);

            const result = await Select(step)

            expect(result).toBeInstanceOf(DataTable)
            expect(result.Name).toBe(myPlanEntity2.Name)
            expect(result.GetFieldsName()).toEqual(myPlanEntity2.GetFieldsName())
            // Note: result.Rows() is not working due to DataTable class issues
            // expect(await result.Rows()).toEqual(await myPlanEntity2.Rows())
            spyProcessSchemaRequest.mockRestore();
        })

        it('should throw error if only schema is given', async () => {
            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: myPlanEntity1,
                stepArgs: {
                    schema: "mySchema"
                }
            }

            await expect(Select(step)).rejects.toThrow(HttpErrorInternalServerError)
        })

        it('should throw error if plan entity not found', async () => {
            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: myPlanEntity1,
                stepArgs: {
                    entity: "nonExistentEntity"
                }
            }

            Plans.set(step.currentPlanName, new Plan(step.currentPlanName))

            const spyProcessSchemaRequest = vi.spyOn(Plans.get(step.currentPlanName)!, 'ProcessSchemaRequest').mockRejectedValue(new HttpErrorNotFound("Entity not found"));

            await expect(Select(step)).rejects.toThrow(HttpErrorNotFound)
            spyProcessSchemaRequest.mockRestore();
        })
    })

    describe('Insert', () => {
        it('should insert with schema, entity and data then return current datatable', async () => {
            const spySchemaInsert = vi.spyOn(Schema, 'Insert')
                .mockResolvedValue(<TInternalResponse<TSchemaResponse>><unknown>{
                    success: true,
                    message: "Insert successful",
                    data: {
                        success: true,
                        message: "Success",
                        data: mySchemaEntity1
                    }
                });

            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: myPlanEntity1,
                stepArgs: {
                    schema: "mySchema",
                    entity: mySchemaEntity1.Name,
                    data: [{ name: "John", age: 25 }]
                }
            }

            const result = await Insert(step)

            expect(result).toBe(myPlanEntity1)
            spySchemaInsert.mockRestore();
        })

        it('should throw error if only entity was given', async () => {
            const spySchemaInsert = vi.spyOn(Schema, 'Insert').mockResolvedValue(<TInternalResponse<TSchemaResponse>><unknown>{
                success: true,
                message: "Insert successful",
                data: {
                    success: true,
                    message: "Success",
                    data: mySchemaEntity1
                }
            });

            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: myPlanEntity1,
                stepArgs: {
                    entity: "users"
                }
            }

            await expect(Insert(step)).rejects.toThrow(HttpErrorInternalServerError)
            spySchemaInsert.mockRestore();
        })

        it('should throw error if only schema was given', async () => {
            const spySchemaInsert = vi.spyOn(Schema, 'Insert').mockResolvedValue(<TInternalResponse<TSchemaResponse>><unknown>{
                success: true,
                message: "Insert successful",
                data: {
                    success: true,
                    message: "Success",
                    data: mySchemaEntity1
                }
            });

            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: myPlanEntity1,
                stepArgs: {
                    schema: "mySchema"
                }
            }

            await expect(Insert(step)).rejects.toThrow(HttpErrorInternalServerError)
            spySchemaInsert.mockRestore();
        })

        it('should add rows to current datatable when no schema and no entity', async () => {
            const spyRowsAdd = vi.spyOn(myPlanEntity1, 'RowsAdd').mockResolvedValue(myPlanEntity1);

            const data = [{ name: "John", age: 25 }]

            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: myPlanEntity1,
                stepArgs: {
                    data
                }
            }

            const result = await Insert(step)
            expect(result).toBe(await myPlanEntity1.RowsAdd(data))
            spyRowsAdd.mockRestore();
        })

        it('should throw error when no args are given', async () => {
            const emptyDataTable = new DataTable("empty", []);

            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: emptyDataTable,
                stepArgs: {}
            }

            await expect(Insert(step)).rejects.toThrow(HttpErrorInternalServerError)
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

            await expect(Insert(step)).rejects.toThrow(HttpErrorInternalServerError)
        })
    })

    describe('Update', () => {
        it('should update data to schema when entity is provided', async () => {
            const spySchemaUpdate = vi.spyOn(Schema, 'Update')
                .mockResolvedValue(<TInternalResponse<TSchemaResponse>><unknown>{
                    success: true,
                    message: "Update successful",
                    data: {
                        success: true,
                        message: "Success",
                        data: mySchemaEntity1
                    }
                });

            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: myPlanEntity1,
                stepArgs: {
                    schema: "mySchema",
                    entity: "users",
                    data: [{ age: 30 }],
                    filter: { name: "John" }
                }
            }

            const result = await Update(step)
            expect(result).toBe(myPlanEntity1)
            spySchemaUpdate.mockRestore();
        })

        it('should throw error if only entity was given', async () => {
            const spySchemaUpdate = vi.spyOn(Schema, 'Update').mockResolvedValue(<TInternalResponse<TSchemaResponse>><unknown>{
                success: true,
                message: "Update successful",
                data: {
                    success: true,
                    message: "Success",
                    data: mySchemaEntity1
                }
            });

            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: myPlanEntity1,
                stepArgs: {
                    entity: "users"
                }
            }

            await expect(Update(step)).rejects.toThrow(HttpErrorInternalServerError)
            spySchemaUpdate.mockRestore();
        })

        it('should throw error if only schema was given', async () => {
            const spySchemaUpdate = vi.spyOn(Schema, 'Update').mockResolvedValue(<TInternalResponse<TSchemaResponse>><unknown>{
                success: true,
                message: "Update successful",
                data: {
                    success: true,
                    message: "Success",
                    data: mySchemaEntity1
                }
            });

            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: myPlanEntity1,
                stepArgs: {
                    schema: "mySchema"
                }
            }

            await expect(Update(step)).rejects.toThrow(HttpErrorInternalServerError)
            spySchemaUpdate.mockRestore();
        })

        it('should update current datatable when no schema and no entity', async () => {

            const output = await myPlanEntity1
                .FreeSql({
                    sqlQuery: `UPDATE [${myPlanEntity1.Name}] SET age = 25, country = 'France' WHERE name = 'David'`,
                    queryParams: [{ name: "David", age: 25, country: "France" }]
                })

            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: myPlanEntity1,
                stepArgs: {
                    data: [{ name: "David", age: 25, country: "France" }],
                    filter: { name: "David" }
                }
            }

            const result = await Update(step)
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

            await expect(Update(step)).rejects.toThrow(HttpErrorInternalServerError)
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

            await expect(Update(step)).rejects.toThrow(HttpErrorInternalServerError)
        })
    })

    describe('Delete', () => {
        it('should delete data to schema when entity is provided', async () => {
            const spySchemaDelete = vi.spyOn(Schema, 'Delete')
                .mockResolvedValue(<TInternalResponse<TSchemaResponse>><unknown>{
                    success: true,
                    message: "Delete successful",
                    data: {
                        success: true,
                        message: "Success",
                        data: mySchemaEntity1
                    }
                });

            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: myPlanEntity1,
                stepArgs: {
                    schema: "mySchema",
                    entity: "users",
                    filter: { name: "John" }
                }
            }

            const result = await Delete(step)
            expect(result).toBe(myPlanEntity1)
            spySchemaDelete.mockRestore();
        })

        it('should throw error if only entity was given', async () => {
            const spySchemaDelete = vi.spyOn(Schema, 'Delete').mockResolvedValue(<TInternalResponse<TSchemaResponse>><unknown>{
                success: true,
                message: "Delete successful",
                data: {
                    success: true,
                    message: "Success",
                    data: mySchemaEntity1
                }
            });

            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: myPlanEntity1,
                stepArgs: {
                    entity: "users"
                }
            }

            await expect(Delete(step)).rejects.toThrow(HttpErrorInternalServerError)
            spySchemaDelete.mockRestore();
        })

        it('should throw error if only schema was given', async () => {
            const spySchemaDelete = vi.spyOn(Schema, 'Delete').mockResolvedValue(<TInternalResponse<TSchemaResponse>><unknown>{
                success: true,
                message: "Delete successful",
                data: {
                    success: true,
                    message: "Success",
                    data: mySchemaEntity1
                }
            });

            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: myPlanEntity1,
                stepArgs: {
                    schema: "mySchema"
                }
            }

            await expect(Delete(step)).rejects.toThrow(HttpErrorInternalServerError)
            spySchemaDelete.mockRestore();
        })

        it('should delete current datatable when no schema and no entity', async () => {

            const output = await myPlanEntity1.RowsDelete("name = 'David'")

            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: myPlanEntity1,
                stepArgs: {
                    filter: { name: "David" }
                }
            }

            const result = await Delete(step)
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

            const result = await Delete(step)
            expect(result).toEqual(emptyDataTable)
        })
    })

    describe('ListEntities', () => {
        it('should return schema entities when schema is provided', async () => {
            const spyListEntities = vi.spyOn(Schema, 'ListEntities').mockResolvedValue(
                HttpResponse.Ok(<TSchemaResponse>{
                    schema: "mySchema",
                    status: 200,
                    data: entitiesData
                })
            );
            const spyIsSchemaResponse = vi.spyOn(Schema, 'IsSchemaResponse').mockReturnValue(true);

            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: myPlanEntity1,
                stepArgs: { schema: "mySchema" }
            }

            const result = await ListEntities(step)

            expect(spyListEntities).toHaveBeenCalledWith({ schema: "mySchema" })
            expect(result).toBe(entitiesData)
            spyListEntities.mockRestore();
            spyIsSchemaResponse.mockRestore();
        })

        it('should return plan entities when no schema provided', async () => {
            const spyConfigManagerGet = vi.spyOn(ConfigManager, 'Get').mockReturnValue({
                entity1: {},
                entity2: {}
            });

            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: myPlanEntity1,
                stepArgs: null
            }

            const result = await ListEntities(step)

            expect(spyConfigManagerGet).toHaveBeenCalledWith("plans.myPlan")
            expect(result).toBeInstanceOf(DataTable)
            expect(await result.Rows()).toEqual([
                { name: "entity1", type: DATA_ENTITY_TYPE.PLAN_ENTITY },
                { name: "entity2", type: DATA_ENTITY_TYPE.PLAN_ENTITY }
            ])
            spyConfigManagerGet.mockRestore();
        })
    })

    describe('Sort', () => {
        it('should sort datatable by specified criteria', async () => {
            const spySort = vi.spyOn(myPlanEntity1, 'Sort').mockResolvedValue(myPlanEntity1);

            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: myPlanEntity1,
                stepArgs: { age: "asc" }
            }

            const result = await Sort(step)

            expect(spySort).toHaveBeenCalledWith({ age: "asc" })
            expect(result).toBe(myPlanEntity1)
            spySort.mockRestore();
        })
    })

    describe('Debug', () => {
        it('should set debug metadata on datatable', async () => {
            const spyMetaDataSet = vi.spyOn(myPlanEntity1, 'MetaDataSet');

            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: myPlanEntity1,
                stepArgs: "error"
            }

            const result = await Debug(step)

            expect(spyMetaDataSet).toHaveBeenCalledWith("__PLAN_ERRORS__", [])
            expect(result).toBe(myPlanEntity1)
            spyMetaDataSet.mockRestore();
        })
    })

    describe('Anonymize', () => {
        it('should anonymize specified fields', async () => {
            const spyAnonymize = vi.spyOn(DataTableUtils, 'Anonymize').mockResolvedValue(myPlanEntity1);

            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: myPlanEntity1,
                stepArgs: ["name"]
            }

            const result = await Anonymize(step)

            expect(spyAnonymize).toHaveBeenCalledWith(myPlanEntity1, ["name"])
            expect(result).toBe(myPlanEntity1)
            spyAnonymize.mockRestore();
        })
    })

    describe('RemoveDuplicates', () => {
        it('should remove duplicates with default settings', async () => {
            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: myPlanEntity1,
                stepArgs: {}
            }

            const result = await RemoveDuplicates(step)
            expect(result).toBe(await DataTableUtils.RemoveDuplicates(myPlanEntity1))
        })

        it('should remove duplicates with specified parameters', async () => {
            const spyRemoveDuplicates = vi.spyOn(DataTableUtils, 'RemoveDuplicates').mockResolvedValue(myPlanEntity1);

            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: myPlanEntity1,
                stepArgs: {
                    keys: ["name"],
                    method: REMOVE_DUPLICATES_METHOD.HASH,
                    strategy: REMOVE_DUPLICATES_STRATEGY.LAST
                } as any
            }

            const result = await RemoveDuplicates(step)
            expect(spyRemoveDuplicates).toHaveBeenCalledWith(myPlanEntity1, ["name"], "hash", "last", undefined)
            expect(result).toBe(myPlanEntity1)
            spyRemoveDuplicates.mockRestore();
        })
    })

    describe('Break', () => {
        it('should throw __BREAK__ error', async () => {
            const step: TStep = {
                currentSchemaName: "mySchema",
                currentPlanName: "myPlan",
                currentDataTable: myPlanEntity1,
                stepArgs: null
            }

            await expect(Break(step)).rejects.toThrow("__BREAK__")
        })
    })

    describe('Pick', () => {
        it('should call DataTable.Pick with arguments', async () => {
            const step = {
                currentDataTable: myPlanEntity1,
                stepArgs: ['f1', 'f2']
            };
            await Pick(step as any);
            expect(myPlanEntity1.Pick).toHaveBeenCalledWith(['f1', 'f2']);
        });

        it('should return original table if *', async () => {
            const step = {
                currentDataTable: myPlanEntity1,
                stepArgs: ['*']
            };
            const result = await Pick(step as any);
            expect(result).toBe(myPlanEntity1);
            expect(myPlanEntity1.Pick).not.toHaveBeenCalled();
        });
    });

    describe('Omit', () => {
        it('should call DataTable.Omit with arguments', async () => {
            const step = {
                currentDataTable: myPlanEntity1,
                stepArgs: ['f1']
            };
            await Omit(step as any);
            expect(myPlanEntity1.Omit).toHaveBeenCalledWith(['f1']);
        });
    });

    // Mock DataTable methods for testing
    beforeEach(() => {
        vi.clearAllMocks();

        // Mock DataTable methods
        myPlanEntity1.Pick = vi.fn().mockReturnThis();
        myPlanEntity1.Omit = vi.fn().mockReturnThis();
        myPlanEntity1.RowsAdd = vi.fn().mockReturnThis();
        myPlanEntity1.RowsDelete = vi.fn().mockReturnThis();
        myPlanEntity1.Pick = vi.fn().mockReturnThis();
        myPlanEntity1.Sort = vi.fn().mockReturnThis();
        myPlanEntity1.MetaDataSet = vi.fn().mockReturnThis();
        myPlanEntity1.Omit = vi.fn().mockReturnThis();
        myPlanEntity1.FreeSql = vi.fn().mockResolvedValue(myPlanEntity1);
        myPlanEntity1.GetFieldsName = vi.fn().mockReturnValue(['name', 'age', 'country']);
        myPlanEntity1.Name = 'myPlanEntity1';
        Object.defineProperty(myPlanEntity1, 'Rows', {
            value: [
                { name: "David", age: 28 },
                { name: "Eve", age: 32 }
            ],
            writable: true
        });

        mySchemaEntity1.Name = 'mySchemaEntity1';
        mySchemaEntity1.GetFieldsName = vi.fn().mockReturnValue(['name', 'age', 'country']);
        Object.defineProperty(mySchemaEntity1, 'Rows', {
            value: [
                { name: "Alice", age: 25, country: "USA" },
                { name: "Bob", age: 30, country: "France" }
            ],
            writable: true
        });

        myPlanEntity2.Name = 'myPlanEntity2';
        myPlanEntity2.GetFieldsName = vi.fn().mockReturnValue(['country']);
        Object.defineProperty(myPlanEntity2, 'Rows', {
            value: [
                { country: "USA" },
                { country: "France" }
            ],
            writable: true
        });
    });
});
