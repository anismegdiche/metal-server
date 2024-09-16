//
//
//
//
//
import { NextFunction, Request, Response, Router } from "express"
//
import { HTTP_METHOD } from "../lib/Const"
import { SchemaResponse } from "../response/SchemaResponse"
import { UserResponse } from "../response/UserResponse"
import { ServerResponse } from "../response/ServerResponse"
import { CacheResponse } from "../response/CacheResponse"

export const SchemaRouter = Router()


SchemaRouter.route("/:schemaName")
    .all(
        (req: Request, res: Response, next: NextFunction) => ServerResponse.AllowMethods(req, res, next, HTTP_METHOD.GET),
        UserResponse.IsAuthenticated,
        SchemaResponse.ParameterValidation,
        SchemaResponse.CheckParameters
    )
    /**
     * @swagger
     * /schema/{schemaName}:
     *   get:
     *     summary: List entities in a schema
     *     description: Retrieves a list of entities in the specified schema
     *     tags:
     *       - Schema
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: schemaName
     *         schema:
     *           type: string
     *         required: true
     *         description: The name of the schema
     *     responses:
     *       200:
     *         description: A list of entities in the schema
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 $ref: '#/components/schemas/Entity'
     *       401:
     *         description: Unauthorized
     *       404:
     *         description: Schema not found
     */
    .get(SchemaResponse.ListEntities)

SchemaRouter.route("/:schemaName/:entityName")
    .all(ServerResponse.AllowOnlyCrudMethods,
        UserResponse.IsAuthenticated,
        SchemaResponse.ParameterValidation,
        SchemaResponse.CheckParameters
    )
    /**
     * @swagger
     * /schema/{schemaName}/{entityName}:
     *   get:
     *     summary: Get data from an entity in the schema
     *     description: Retrieves data from an entity in the specified schema
     *     tags:
     *       - Entity
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: schemaName
     *         schema:
     *           type: string
     *         required: true
     *         description: The name of the schema
     *       - in: path
     *         name: entityName
     *         schema:
     *           type: string
     *         required: true
     *         description: The name of the entity
     *     responses:
     *       200:
     *         description: Entity retrieved successfully
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Entity'
     *       401:
     *         description: Unauthorized
     *       404:
     *         description: Schema or entity not found
     */
    .get(CacheResponse.Get, SchemaResponse.Select)
    /**
     * @swagger
     * /schema/{schemaName}/{entityName}:
     *   post:
     *     summary: Insert Data in an entity in the schema
     *     description: Creates a new entity in the specified schema
     *     tags:
     *       - Entity
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: schemaName
     *         schema:
     *           type: string
     *         required: true
     *         description: The name of the schema
     *       - in: path
     *         name: entityName
     *         schema:
     *           type: string
     *         required: true
     *         description: The name of the entity
     *       - in: body
     *         name: entity
     *         schema:
     *           $ref: '#/components/schemas/Entity'
     *         required: true
     *         description: The entity to be inserted
     *     responses:
     *       201:
     *         description: Entity inserted successfully
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Entity'
     *       401:
     *         description: Unauthorized
     *       404:
     *         description: Schema or entity not found
     *       409:
     *         description: Entity already exists
     */
    .post(SchemaResponse.Insert)
    /**
     * @swagger
     * /schema/{schemaName}/{entityName}:
     *   patch:
     *     summary: Update Data in an entity in the schema
     *     description: Updates an existing entity in the specified schema
     *     tags:
     *       - Entity
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: schemaName
     *         schema:
     *           type: string
     *         required: true
     *         description: The name of the schema
     *       - in: path
     *         name: entityName
     *         schema:
     *           type: string
     *         required: true
     *         description: The name of the entity
     *       - in: body
     *         name: entity
     *         schema:
     *           $ref: '#/components/schemas/Entity'
     *         required: true
     *         description: The updated entity
     *     responses:
     *       200:
     *         description: Entity updated successfully
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Entity'
     *       401:
     *         description: Unauthorized
     *       404:
     *         description: Schema or entity not found
     *       409:
     *         description: Entity with new name already exists
     */    
    .patch(SchemaResponse.Update)
    /**
     * @swagger
     * /schema/{schemaName}/{entityName}:
     *   delete:
     *     summary: Delete Data from an entity in the schema
     *     description: Deletes an existing entity in the specified schema
     *     tags:
     *       - Entity
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: schemaName
     *         schema:
     *           type: string
     *         required: true
     *         description: The name of the schema
     *       - in: path
     *         name: entityName
     *         schema:
     *           type: string
     *         required: true
     *         description: The name of the entity
     *     responses:
     *       200:
     *         description: Entity deleted successfully
     *       401:
     *         description: Unauthorized
     *       404:
     *         description: Schema or entity not found
     */
    .delete(SchemaResponse.Delete)

//ROADMAP
SchemaRouter.route("/:schemaName/:entityName/:id")
    .all(ServerResponse.AllowOnlyCrudMethods,
        UserResponse.IsAuthenticated,
        SchemaResponse.ParameterValidation,
        SchemaResponse.CheckParameters
    )
    .get(ServerResponse.NotImplemented)
    .post(ServerResponse.NotImplemented)
    .patch(ServerResponse.NotImplemented)
    .delete(ServerResponse.NotImplemented)