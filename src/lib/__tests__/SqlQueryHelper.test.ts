

import { ESCAPE_FIELD_VALUE, SqlQueryHelper } from '../SqlQueryHelper'
import { TRow } from '../../types/DataTable'
import { JsonHelper } from "../JsonHelper"


function mockEscapeField(field: string) {
    return `\`${field}\``
}

describe('SqlQueryHelper', () => {

    it("Values", () => {
        const queryHelper = new SqlQueryHelper()
        const data: TRow[] = [
            {
                id: 1,
                name: 'John'
            },
            {
                id: 2,
                name: 'Jane'
            }
        ]
        queryHelper.Insert('users').Fields('id, name').Values(data)
        expect(queryHelper.Query).toEqual("INSERT INTO users(id,name) VALUES ('1','John'),  ('2','Jane')")
    })

    it("Set", () => {
        const queryHelper = new SqlQueryHelper()
        queryHelper.SetQuery('SELECT * FROM users')
        expect(queryHelper.Query).toBe("SELECT * FROM users")
    })

    it("Select", () => {
        const queryHelper = new SqlQueryHelper()
        queryHelper.Select('*').From('users')
        expect(queryHelper.Query).toBe("SELECT * FROM users")
    })

    it("From", () => {
        const queryHelper = new SqlQueryHelper()
        queryHelper.Select('*').From('users')
        expect(queryHelper.Query).toBe("SELECT * FROM users")
    })

    it("Where string", () => {
        const queryHelper = new SqlQueryHelper()
        queryHelper.Select('*').From('users').Where("id = 1")
        expect(queryHelper.Query).toBe("SELECT * FROM users WHERE id = 1")
    })

    it("Where json", () => {
        const queryHelper = new SqlQueryHelper()
        queryHelper.Select('*').From('users').Where({
            id: 1,
            name: 'John'
        })
        expect(queryHelper.Query).toEqual("SELECT * FROM users WHERE id = 1 AND name = 'John'")
    })

    it("Where array of json", () => {
        const queryHelper = new SqlQueryHelper()
        const condition = JsonHelper.ToArray({
            id: 1,
            name: 'John'
        })
        queryHelper.Select('*').From('users').Where(condition)
        expect(queryHelper.Query).toEqual("SELECT * FROM users WHERE id = 1 AND name = 'John'")
    })

    it("Delete", () => {
        const queryHelper = new SqlQueryHelper()
        queryHelper.Delete().From('users').Where("id = 1")
        expect(queryHelper.Query).toBe("DELETE FROM users WHERE id = 1")
    })

    it("Update", () => {
        const queryHelper = new SqlQueryHelper()
        queryHelper.Update('users').Set({
            name: 'John',
            age: 33
        }).Where("id = 1")
        expect(queryHelper.Query).toEqual("UPDATE users SET name='John',age=33 WHERE id = 1")
    })

    it("Update", () => {
        const queryHelper = new SqlQueryHelper()
        queryHelper.Update('users').Set({
            name: `$> firstname + ' ' + lastname`,
            age: `$>33 + 10`
        }).Where("id = 1")
        expect(queryHelper.Query).toEqual("UPDATE users SET name=firstname + ' ' + lastname,age=33 + 10 WHERE id = 1")
    })

    it("Fields string", () => {
        const queryHelper = new SqlQueryHelper()
        queryHelper.Insert('users').Fields('name').Values(<TRow[]>[
            {
                id: 1,
                name: 'John'
            }
        ])
        expect(queryHelper.Query).toBe("INSERT INTO users(name) VALUES ('1','John')")
    })

    it("Fields string with escape", () => {
        const queryHelper = new SqlQueryHelper(undefined,undefined,mockEscapeField)
        queryHelper.Insert('users').Fields('name').Values(<TRow[]>[
            {
                id: 1,
                name: 'John'
            }
        ])
        expect(queryHelper.Query).toBe("INSERT INTO users(`name`) VALUES ('1','John')")
    })

    it("Fields array", () => {
        const queryHelper = new SqlQueryHelper()
        queryHelper.Insert('users').Fields(['id', 'name']).Values(<TRow[]>[
            {
                id: 1,
                name: 'John'
            }
        ])
        expect(queryHelper.Query).toBe("INSERT INTO users(id,name) VALUES ('1','John')")
    })

    it("Fields array with escape", () => {
        const queryHelper = new SqlQueryHelper(undefined,undefined,mockEscapeField)
        queryHelper.Insert('users').Fields(['id', 'name']).Values(<TRow[]>[
            {
                id: 1,
                name: 'John'
            }
        ])
        expect(queryHelper.Query).toBe("INSERT INTO users(`id`,`name`) VALUES ('1','John')")
    })
})
