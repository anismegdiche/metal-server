//
//
//
//
//
import { SqlQueryHelper } from '../SqlQueryHelper'
import { TRow } from '../../types/DataTable'
import { JsonHelper } from "../JsonHelper"


describe('SqlQueryHelper_class', () => {

    // Tests that Values method sets the Query property correctly with the given TRow[] data. 
    it("test_values", () => {
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
        expect(queryHelper.Query).toEqual("INSERT INTO users(id, name) VALUES ('1','John'),  ('2','Jane')")
    })

    // Tests that SetQuery method sets the Query property correctly. 
    it("test_set_query", () => {
        const queryHelper = new SqlQueryHelper()
        queryHelper.SetQuery('SELECT * FROM users')
        expect(queryHelper.Query).toBe("SELECT * FROM users")
    })

    // Tests that Select method sets the Query property correctly with the given fields. 
    it("test_select", () => {
        const queryHelper = new SqlQueryHelper()
        queryHelper.Select('*').From('users')
        expect(queryHelper.Query).toBe("SELECT * FROM users")
    })

    // Tests that From method sets the Query property correctly with the given entity. 
    it("test_from", () => {
        const queryHelper = new SqlQueryHelper()
        queryHelper.Select('*').From('users')
        expect(queryHelper.Query).toBe("SELECT * FROM users")
    })

    // Tests that Where method sets the Query property correctly with the given string condition. 
    it("test_where_string", () => {
        const queryHelper = new SqlQueryHelper()
        queryHelper.Select('*').From('users').Where("id = 1")
        expect(queryHelper.Query).toBe("SELECT * FROM users WHERE id = 1")
    })

    // Tests that Where method sets the Query property correctly with the given object condition. 
    it("test_where_json", () => {
        const queryHelper = new SqlQueryHelper()
        queryHelper.Select('*').From('users').Where({
            id: 1,
            name: 'John'
        })
        expect(queryHelper.Query).toEqual("SELECT * FROM users WHERE id = 1 AND name = 'John'")
    })

    // Tests that Where method sets the Query property correctly with the given object condition. 
    it("test_where_array of json", () => {
        const queryHelper = new SqlQueryHelper()
        const condition = JsonHelper.ToArray({
            id: 1,
            name: 'John'
        })
        queryHelper.Select('*').From('users').Where(condition)
        expect(queryHelper.Query).toEqual("SELECT * FROM users WHERE id = 1 AND name = 'John'")
    })

    // Tests that Delete method sets the Query property correctly. 
    it("test_delete", () => {
        const queryHelper = new SqlQueryHelper()
        queryHelper.Delete().From('users').Where("id = 1")
        expect(queryHelper.Query).toBe("DELETE FROM users WHERE id = 1")
    })

    // Tests that Update method sets the Query property correctly with the given entity. 
    it("test_update", () => {
        const queryHelper = new SqlQueryHelper()
        queryHelper.Update('users').Set({
            name: 'John',
            age: 33
        }).Where("id = 1")
        expect(queryHelper.Query).toEqual("UPDATE users SET name='John',age=33 WHERE id = 1")
    })

    // Tests that Insert method sets the Query property correctly with the given entity. 
    it("test_insert", () => {
        const queryHelper = new SqlQueryHelper()
        queryHelper.Insert('users').Fields('id, name').Values(<TRow[]>[
            {
                id: 1,
                name: 'John'
            }
        ])
        expect(queryHelper.Query).toBe("INSERT INTO users(id, name) VALUES ('1','John')")
    })

    // Tests that Fields method sets the Query property correctly with the given string data. 
    it("test_fields_string", () => {
        const queryHelper = new SqlQueryHelper()
        queryHelper.Insert('users').Fields('id, name').Values(<TRow[]>[
            {
                id: 1,
                name: 'John'
            }
        ])
        expect(queryHelper.Query).toBe("INSERT INTO users(id, name) VALUES ('1','John')")
    })

    // Tests that Fields method sets the Query property correctly with the given array data. 
    it("test_fields_array", () => {
        const queryHelper = new SqlQueryHelper()
        queryHelper.Insert('users').Fields(['id', 'name']).Values(<TRow[]>[
            {
                id: 1,
                name: 'John'
            }
        ])
        expect(queryHelper.Query).toBe("INSERT INTO users(id,name) VALUES ('1','John')")
    })
})