//
//
//
import { X2jOptions, XMLBuilder, XmlBuilderOptions, XMLParser } from "fast-xml-parser"
import _ from "lodash"
import { Readable } from "node:stream"
import typia from "typia"
//
import { DataTable } from "../../../types/DataTable"
import { TJson } from "../../../types/TJson"
import { JsonUtils } from "../../../utils/JsonUtils"
import { Logger } from "../../../utils/Logger"
import { PlaceHolder } from "../../../utils/PlaceHolder"
import { ReadableUtils } from "../../../utils/ReadableUtils"
//
import { HttpErrorInternalServerError } from "../../errors/HttpErrors"
import { Sandbox } from "../../sandbox/Sandbox"
import { TContext } from "../../sandbox/types/TContext"
//
import { Assert } from "../../../utils/Assert"
import { VirtualFileSystem } from "../../../utils/VirtualFileSystem"
import { TContentConfig } from "../@types"
import { absContentProvider } from "../base/absContentProvider"
import { TXmlContentConfig } from "../types/TXmlContentConfig"


//
export class XmlContent extends absContentProvider {

    Params: TXmlContentConfig | undefined

    DEFAULT = {
        "xml-path": undefined,
        "xml-ignore-attributes": true,
        "xml-attribute-prefix": "@",
        "xml-remove-ns-prefix": true
    }

    // XML Content
    ParserOptions: X2jOptions = {}

    SetConfig(contentConfig: TContentConfig): void {
        super.SetConfig(contentConfig)
        this.Params = _.merge(this.DEFAULT, this.Config)
        this.ParserOptions = {
            attributeNamePrefix: this.Params["xml-attribute-prefix"],
            ignoreAttributes: this.Params["xml-ignore-attributes"],
            removeNSPrefix: this.Params["xml-remove-ns-prefix"]
        }
    }

    @Logger.LogFunction()
    InitContent(entity: string, content: Readable): void {
        this.EntityName = entity
        this.Content.UploadFile(entity, content)
    }

    @Logger.LogFunction(['$context'])
    async Get(sqlQuery: string | undefined, $context: Partial<TContext>): Promise<DataTable> {
        Assert.Var<TXmlContentConfig>(this.Params, 
            typia.is<TXmlContentConfig>(this.Params),
            'Params is not defined')

        Assert.Var<VirtualFileSystem>(this.Content, 
            VirtualFileSystem.Is(this.Content),
            'Content is not defined')

        const xmlParser = new XMLParser(this.ParserOptions)
        const xmlData = xmlParser.parse(
            await ReadableUtils.ToString(this.Content.ReadFile(this.EntityName))
        )

        const $__path = PlaceHolder.EvaluateJsCode<string>(
            $context?.$request?.["data-path"] ?? this.Params["xml-path"],
            new Sandbox($context)
        )

        const data = JsonUtils.Get<TJson[]>(xmlData, $__path)

        if (!data)
            throw new HttpErrorInternalServerError(`Xml: No data found at Path ${$__path}`)

        return new DataTable(this.EntityName, Array.isArray(data)
            ? data
            : [data]).FreeSqlAsync(sqlQuery)
    }

    @Logger.LogFunction(true)
    async Set(data: DataTable, $context: Partial<TContext>): Promise<Readable> {
        Assert.Var<TXmlContentConfig>(this.Params, 
            typia.is<TXmlContentConfig>(this.Params),
            'Params is not defined')

        Assert.Var<VirtualFileSystem>(this.Content, 
            VirtualFileSystem.Is(this.Content),
            'Content is not defined')

        const { "xml-path": jsonPath  } = this.Params

        const xmlParser = new XMLParser(this.ParserOptions)
        let xmlData = xmlParser.parse(
            await ReadableUtils.ToString(this.Content.ReadFile(this.EntityName))
        )

        const $__evalPath = PlaceHolder.EvaluateJsCode<string>(
            jsonPath,
            new Sandbox($context)
        )

        JsonUtils.Set(
            xmlData,
            $__evalPath,
            data.Rows
        )

        const xmlBuilder = new XMLBuilder(this.ParserOptions as XmlBuilderOptions)
        const xmlString = xmlBuilder.build(xmlData)

        const streamOut = Readable.from(xmlString)
        this.Content.UploadFile(this.EntityName, streamOut)
        return this.Content.ReadFile(this.EntityName)
    }
}
