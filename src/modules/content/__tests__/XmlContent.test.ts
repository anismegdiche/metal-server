
import { Readable } from "node:stream"
import { ReadableUtils } from "../../../utils/ReadableUtils"
import { HttpErrorInternalServerError } from "../../../modules/errors/HttpErrors"
import { DataTable } from "../../../types/DataTable"
import { XmlContent } from "../providers/XmlContent"
import type { TContentConfig } from "../@types"

const xmlUsers = `<?xml version="1.0" encoding="UTF-8"?>
<users>
    <user>
        <id>1</id>
        <firstname>John</firstname>
        <lastname>Doe</lastname>
    </user>
    <user>
        <id>2</id>
        <firstname>Jane</firstname>
        <lastname>Smith</lastname>
    </user>
    <user>
        <id>3</id>
        <firstname>Emily</firstname>
        <lastname>Johnson</lastname>
    </user>
</users>
`

const xmlUsersSoap = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
    <soap:Body>
        <GetUsersResponse xmlns="http://example.com/users">
            <GetUsersResult>
                <users>
                    <user>
                        <id>1</id>
                        <firstname>John</firstname>
                        <lastname>Doe</lastname>
                    </user>
                    <user>
                        <id>2</id>
                        <firstname>Jane</firstname>
                        <lastname>Smith</lastname>
                    </user>
                    <user>
                        <id>3</id>
                        <firstname>Emily</firstname>
                        <lastname>Johnson</lastname>
                    </user>
                </users>
            </GetUsersResult>
        </GetUsersResponse>
    </soap:Body>
</soap:Envelope>
`

describe('XmlContent', () => {

    // InitContent successfully initializes XML content with valid entity and content stream
    it('should initialize content with valid entity and stream', async () => {
        const xmlContent = new XmlContent()
        const entity = 'users'
        const content = Readable.from(xmlUsers)
        const config = { 'xml-path': 'users.user' }

        xmlContent.SetConfig(config as TContentConfig)
        xmlContent.InitContent(entity, content)

        expect(xmlContent.EntityName).toBe(entity)
        expect(xmlContent.Params?.["xml-path"]).toBe('users.user')
    })

    // Get retrieves and parses XML data correctly with valid path
    it('should retrieve and parse XML data with valid path', async () => {
        const xmlContent = new XmlContent()
        xmlContent.EntityName = 'users'
        xmlContent.Content.UploadFile('users', Readable.from(xmlUsers))
        xmlContent.Params = { "xml-path": 'users.user' }

        const result = await xmlContent.Get({}, {})

        expect(result).toBeInstanceOf(DataTable)
        expect(await result.Rows()).toEqual([
            {
                id: 1,
                firstname: "John",
                lastname: "Doe"
            },
            {
                id: 2,
                firstname: "Jane",
                lastname: "Smith"
            },
            {
                id: 3,
                firstname: "Emily",
                lastname: "Johnson"
            }
        ])
    })

    // Set updates XML content and saves changes successfully
    it('should update XML content and save changes', async () => {
        const xmlContent = new XmlContent()
        const initialXml = '<root><data>old</data></root>'
        xmlContent.Params = { "xml-path": 'root.data' }
        xmlContent.Content.UploadFile('test', Readable.from(initialXml))
        xmlContent.EntityName = 'test'

        const newData = new DataTable('test', [{ data: 'new' }])
        const result = await xmlContent.Set(newData, {})

        const updatedContent = await ReadableUtils.ToString(result)
        expect(updatedContent).toContain('<data>new</data>')
    })

    // SQL queries execute correctly on retrieved XML data
    it('should execute SQL queries on XML data', async () => {
        const xmlContent = new XmlContent()
        xmlContent.Params = { "xml-path": 'users.user' }
        xmlContent.Content.UploadFile('users', Readable.from(xmlUsers))
        xmlContent.EntityName = 'users'

        const result = await xmlContent.Get({
            filter: 'id = 1'
        }, {})

        const rows = await result.Rows()

        expect(rows).toHaveLength(1)
        expect(rows).toEqual([
            {
                id: 1,
                firstname: "John",
                lastname: "Doe"
            }
        ])
    })

    // Handle undefined or missing Params configuration
    it('should throw error when Params is undefined', async () => {
        const xmlContent = new XmlContent()
        xmlContent.Content.UploadFile('test', Readable.from('<root/>'))
        xmlContent.EntityName = 'test'

        await expect(xmlContent.Get({}, {}))
            .rejects
            .toThrow(HttpErrorInternalServerError)

        const dt = new DataTable('test')
        await expect(xmlContent.Set(dt, {}))
            .rejects
            .toThrow(HttpErrorInternalServerError)
    })

    it('should retrieve and parse SOAP XML data with valid path', async () => {
        const xmlContent = new XmlContent()
        xmlContent.EntityName = 'users'
        xmlContent.Content.UploadFile('users', Readable.from(xmlUsersSoap))
        xmlContent.Params = { "xml-path": 'soap:Envelope.soap:Body.GetUsersResponse.GetUsersResult.users.user' }

        const result = await xmlContent.Get({}, {})

        expect(result).toBeInstanceOf(DataTable)
        expect(await result.Rows()).toEqual([
            {
                id: 1,
                firstname: "John",
                lastname: "Doe"
            },
            {
                id: 2,
                firstname: "Jane",
                lastname: "Smith"
            },
            {
                id: 3,
                firstname: "Emily",
                lastname: "Johnson"
            }
        ])
    })

    it('should execute SQL queries on SOAP XML data', async () => {
        const xmlContent = new XmlContent()
        xmlContent.Params = { "xml-path": 'soap:Envelope.soap:Body.GetUsersResponse.GetUsersResult.users.user' }
        xmlContent.Content.UploadFile('users', Readable.from(xmlUsersSoap))
        xmlContent.EntityName = 'users'

        const result = await xmlContent.Get({
            filter: 'id = 1'
        }, {})

        expect(await result.Rows()).toHaveLength(1)
        expect((await result.Rows())[0]).toEqual({
            id: 1,
            firstname: "John",
            lastname: "Doe"
        })
    })

    it('should throw error when XML content is empty', async () => {
        const xmlContent = new XmlContent()
        xmlContent.EntityName = 'users'
        xmlContent.Content.UploadFile('users', Readable.from(''))
        xmlContent.Params = { "xml-path": 'users.user' }

        await expect(xmlContent.Get({}, {}))
            .rejects
            .toThrow(HttpErrorInternalServerError)
    })

    it('should throw error when XML content is malformed', async () => {
        const xmlContent = new XmlContent()
        xmlContent.EntityName = 'users'
        xmlContent.Content.UploadFile('users', Readable.from('<root> invalid xml </root>'))
        xmlContent.Params = { "xml-path": 'users.user' }

        await expect(xmlContent.Get({}, {}))
            .rejects
            .toThrow(HttpErrorInternalServerError)
    })

    it('should handle XML content with missing path', async () => {
        const xmlContent = new XmlContent()
        xmlContent.EntityName = 'users'
        xmlContent.Content.UploadFile('users', Readable.from(xmlUsers))
        xmlContent.Params = { "xml-path": 'missing.path' }

        await expect(xmlContent.Get({}, {}))
            .rejects
            .toThrow(HttpErrorInternalServerError)
    })

    it('should handle XML content with invalid path', async () => {
        const xmlContent = new XmlContent()
        xmlContent.EntityName = 'users'
        xmlContent.Content.UploadFile('users', Readable.from(xmlUsers))
        xmlContent.Params = { "xml-path": 'users invalid.path' }

        await expect(xmlContent.Get({}, {}))
            .rejects
            .toThrow(HttpErrorInternalServerError)
    })
})
