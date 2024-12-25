//
//
//
//
//
import { Readable } from "node:stream"
import _ from "lodash"
import { XMLParser, XMLBuilder, XmlBuilderOptions } from "fast-xml-parser"
//
import { DataTable } from "../../types/DataTable"
import { Logger } from "../../utils/Logger"
import { HttpErrorInternalServerError } from "../../server/HttpErrors"
import { ReadableHelper } from "../../lib/ReadableHelper"
import { absContentProvider } from "../absContentProvider"
import { PlaceHolder } from "../../utils/PlaceHolder"
import { Sandbox } from "../../server/Sandbox"
import { JsonHelper } from "../../lib/JsonHelper"
import { TJson } from "../../types/TJson"
import { TContentConfig } from "../ContentProvider"


//
export type TXmlContentConfig = {
    "xml-path"?: string                  // XML path, if undefined will return the whole XML
    "xml-ignore-attributes"?: boolean    // Ignore XML attributes, default is true
    "xml-attribute-prefix"?: string      // Prefix for XML attributes, default is "@"
}


//
export class XmlContent extends absContentProvider {

    Params: TXmlContentConfig | undefined

    DEFAULT = {
        "xml-path": undefined,
        "xml-ignore-attributes": true,
        "xml-attribute-prefix": "@"
    }

    // XML Content
    ParserOptions: XmlBuilderOptions = {}

    SetConfig(contentConfig: TContentConfig): void {
        super.SetConfig(contentConfig)
        this.Params = _.merge(this.DEFAULT, this.Config)
        this.ParserOptions = {
            attributeNamePrefix: this.Params["xml-attribute-prefix"],
            ignoreAttributes: this.Params["xml-ignore-attributes"]
        }
    }

    @Logger.LogFunction()
    async InitContent(entity: string, content: Readable): Promise<void> {
        this.EntityName = entity
        this.Content.UploadFile(entity, content)
    }

    @Logger.LogFunction(Logger.Debug, true)
    async Get(sqlQuery: string | undefined = undefined): Promise<DataTable> {
        if (!this.Params || !this.Content)
            throw new HttpErrorInternalServerError('XmlContent: something is missing in the configuration')

        const xmlParser = new XMLParser(this.ParserOptions)
        const xmlData = xmlParser.parse(
            await ReadableHelper.ToString(this.Content.ReadFile(this.EntityName))
        )

        const path = PlaceHolder.EvaluateJsCode(
            this.Params["xml-path"],
            new Sandbox({
                $request: {
                    entity: this.EntityName
                }
            })
        )

        const data = JsonHelper.Get<TJson[]>(xmlData, path)

        if (!data)
            throw new HttpErrorInternalServerError(`Xml: Path ${path} not found`)

        return new DataTable(this.EntityName, Array.isArray(data)
            ? data
            : [data]).FreeSqlAsync(sqlQuery)
    }

    @Logger.LogFunction(Logger.Debug, true)
    async Set(data: DataTable): Promise<Readable> {
        if (!this.Params || !this.Content)
            throw new HttpErrorInternalServerError('XmlContent: something is missing in the configuration')

        const { "xml-path": jsonPath  } = this.Params

        const xmlParser = new XMLParser(this.ParserOptions)
        let xmlData = xmlParser.parse(
            await ReadableHelper.ToString(this.Content.ReadFile(this.EntityName))
        )

        const evalPath = PlaceHolder.EvaluateJsCode(
            jsonPath,
            new Sandbox({
                $request: {
                    entity: this.EntityName
                }
            })
        )

        xmlData = JsonHelper.Set(
            xmlData,
            evalPath,
            data.Rows
        )

        const xmlBuilder = new XMLBuilder(this.ParserOptions)
        const xmlString = xmlBuilder.build(xmlData)

        const streamOut = Readable.from(xmlString)
        this.Content.UploadFile(this.EntityName, streamOut)
        return this.Content.ReadFile(this.EntityName)
    }
}
