//
//
//
import { XMLBuilder, XMLParser, type X2jOptions, type XmlBuilderOptions } from 'fast-xml-parser'
import { merge } from 'lodash-es'
import { Readable } from "node:stream"
import z from "zod"
//
import type { TRowsCopyParams } from "../../../types/DataTable"
import { DataTable } from "../../../types/DataTable"
import type { TJson } from "../../../types/TJson"
import { Assert } from "../../../utils/Assert"
import { JsonUtils } from "../../../utils/JsonUtils"
import { Logger } from "../../../utils/Logger"
import { PlaceHolder } from "../../../utils/PlaceHolder"
import { ReadableUtils } from "../../../utils/ReadableUtils"
import { VirtualFileSystem } from "../../../utils/VirtualFileSystem"
import { Sandbox } from "../../sandbox/Sandbox"
import type { TContext } from "../../sandbox/types/TContext"
import { absContentProvider } from "../base/absContentProvider"


//

export const z_U__source_options_content_xml = z.object({
    "xml-path": z.string().describe("XML path, if undefined will return the whole XML").optional(),
    "xml-ignore-attributes": z.boolean().describe("Ignore XML attributes, default is true").optional(),
    "xml-attribute-prefix": z.string().describe("Prefix for XML attributes, default is `@`").optional(),
    "xml-remove-ns-prefix": z.boolean().describe("remove namespace string from tag and attribute names, default `true`").optional(),
});


//
export type U__source_options_content_xml = z.infer<typeof z_U__source_options_content_xml>


//
export class XmlContent extends absContentProvider {

    Params: U__source_options_content_xml | undefined

    DEFAULT: U__source_options_content_xml = {
        "xml-path": undefined,
        "xml-ignore-attributes": true,
        "xml-attribute-prefix": "@",
        "xml-remove-ns-prefix": true
    }

    // XML Content
    ParserOptions: X2jOptions = {}

    SetConfig(contentConfig: U__source_options_content_xml): void {
        super.SetConfig(contentConfig)
        this.Params = merge(this.DEFAULT, this.Config)
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
    async Get(rowsParams: TRowsCopyParams, $context: Partial<TContext>): Promise<DataTable> {
        Assert.Var<U__source_options_content_xml>(this.Params,
            z_U__source_options_content_xml.safeParse(this.Params).success,
            'Params is not defined')

        Assert.Var<VirtualFileSystem>(this.Content,
            VirtualFileSystem.Is(this.Content),
            'Content is not defined')

        const xmlParser = new XMLParser(this.ParserOptions);
        const xmlData = xmlParser.parse(
            await ReadableUtils.ToString(this.Content.ReadFile(this.EntityName))
        )

        const $__path = PlaceHolder.EvaluateJsCode<string>(
            $context?.$request?.["data-path"] ?? this.Params["xml-path"],
            new Sandbox($context)
        )

        const data = JsonUtils.Get<TJson[]>(xmlData, $__path)

        Assert.Condition(data !== undefined, `No data found at Path ${$__path}`)

        using result = new DataTable(
            this.EntityName,
            Array.isArray(data)
                ? data
                : [data]
        )

        return result.Copy(this.EntityName, rowsParams)
    }

    @Logger.LogFunction(true)
    async Set(data: DataTable, $context: Partial<TContext>): Promise<Readable> {
        Assert.Var<U__source_options_content_xml>(this.Params,
            z_U__source_options_content_xml.safeParse(this.Params).success,
            'Params is not defined')

        Assert.Var<VirtualFileSystem>(this.Content,
            VirtualFileSystem.Is(this.Content),
            'Content is not defined')

        const { "xml-path": jsonPath } = this.Params

        const xmlParser = new XMLParser(this.ParserOptions);
        const xmlData = xmlParser.parse(
            await ReadableUtils.ToString(this.Content.ReadFile(this.EntityName))
        )

        const $__evalPath = PlaceHolder.EvaluateJsCode<string>(
            jsonPath,
            new Sandbox($context)
        )

        JsonUtils.Set(
            xmlData,
            $__evalPath,
            await data.Rows()
        )

        const xmlBuilder = new XMLBuilder(this.ParserOptions as XmlBuilderOptions);
        const xmlString = xmlBuilder.build(xmlData)

        const streamOut = Readable.from(xmlString)
        this.Content.UploadFile(this.EntityName, streamOut)
        return this.Content.ReadFile(this.EntityName)
    }
}
