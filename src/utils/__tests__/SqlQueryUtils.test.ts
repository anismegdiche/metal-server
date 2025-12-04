import { mock_Logger } from '../../__tests__/mockers'
mock_Logger()

import { SQL_TYPE, SqlQueryUtils } from '../SqlQueryUtils'
import { TRow } from '../../types/DataTable'
import { JsonUtils } from "../JsonUtils"
import { HttpErrorBadRequest } from "../../modules/errors/HttpErrors"

function mockEscapeField(field: string) {
    return `"${field}"`
}

describe('SqlQueryUtils', () => {
    describe('Value Formatting', () => {
        it('should handle null/undefined values', () => {
            const query = new SqlQueryUtils()
                .Update('users')
                .Set({
                    id: 1,
                    name: null,
                    age: undefined
                })
                .Where({ id: 1 })
            expect(query.Query()).toBe("UPDATE users SET id = ?, name = NULL, age = NULL WHERE id = 1")
            expect(query.QueryParams).toEqual([1])
        })

        it('should handle string values with single quotes', () => {
            const sql = new SqlQueryUtils()
                .Update('users')
                .Set({
                    id: 1,
                    name: "O'Reilly"
                })
            expect(sql.Query()).toBe("UPDATE users SET id = ?, name = ?")
            expect(sql.QueryParams).toEqual([1, "O'Reilly"])
        })

        it('should handle numeric values', () => {
            const sql = new SqlQueryUtils()
                .Update('products')
                .Set({
                    id: 1,
                    price: 9.99,
                    quantity: '10'
                })
            expect(sql.Query()).toBe("UPDATE products SET id = ?, price = ?, quantity = ?")
            expect(sql.QueryParams).toEqual([1, 9.99, '10'])
        })

        it('should handle object values with parameter binding', () => {
            const date = new Date()
            const sql = new SqlQueryUtils()
                .Update('events')
                .Set({
                    id: 1,
                    data: {
                        date,
                        type: 'test'
                    }
                })
            expect(sql.Query()).toBe('UPDATE events SET id = ?, data = ?')
            expect(sql.QueryParams).toEqual([1, { date, type: 'test' }])
        })

        it('should handle escaped field values', () => {
            const sql = new SqlQueryUtils()
                .Update('users')
                .Set({
                    id: 1,
                    lastLogin: '$>NOW()'
                })
            expect(sql.Query()).toBe('UPDATE users SET id = ?, lastLogin = NOW()')
            expect(sql.QueryParams).toEqual([1])
        })
    })

    describe('INSERT operations', () => {
        it('should handle multiple rows with values', () => {
            const sql = new SqlQueryUtils()
                .Insert('users')
                .Fields(['id', 'name', 'active'])
                .Values([
                    {
                        id: 1,
                        name: 'John',
                        active: true
                    },
                    {
                        id: 2,
                        name: 'Jane',
                        active: false
                    }
                ])

            expect(sql.Query()).toBe("INSERT INTO users(id, name, active) VALUES (?, ?, ?),  (?, ?, ?)")
            expect(sql.QueryParams).toEqual([
                1,
                'John',
                true,
                2,
                'Jane',
                false
            ])
        })

        it('should handle single row insert', () => {
            const sql = new SqlQueryUtils()
                .Insert('users')
                .Fields(['id', 'name'])
                .Values([
                    {
                        id: 1,
                        name: 'John'
                    }
                ])

            expect(sql.Query()).toBe("INSERT INTO users(id, name) VALUES (?, ?)")
            expect(sql.QueryParams).toEqual([1, 'John'])
        })
    })

    describe('UPDATE operations', () => {
        it('should handle simple updates', () => {
            const sql = new SqlQueryUtils()
                .Update('users')
                .Set({
                    name: 'John',
                    age: 30
                })
                .Where({ id: 1 })

            expect(sql.Query()).toBe("UPDATE users SET name = ?, age = ? WHERE id = 1")
            expect(sql.QueryParams).toEqual(['John', 30])
        })

        it('should handle complex updates with mixed types', () => {
            const sql = new SqlQueryUtils()
                .Update('products')
                .Set({
                    id: 1,
                    name: 'Laptop',
                    price: 999.99,
                    specs: {
                        ram: '16GB',
                        storage: '1TB'
                    },
                    updatedAt: '$>CURRENT_TIMESTAMP'
                })

            expect(sql.Query()).toBe("UPDATE products SET id = ?, name = ?, price = ?, specs = ?, updatedAt = CURRENT_TIMESTAMP")
            expect(sql.QueryParams).toEqual([1, 'Laptop', 999.99, { ram: '16GB', storage: '1TB' }])
        })
    })

    it("SetQuery", () => {
        const sql = new SqlQueryUtils()
        sql.SetQuery('SELECT * FROM users')
        expect(sql.Query()).toBe("SELECT * FROM users")
    })

    it("Select", () => {
        const sql = new SqlQueryUtils()
        sql.Select(['*']).From('users')
        expect(sql.Query()).toBe("SELECT * FROM users")
    })

    it("From", () => {
        const sql = new SqlQueryUtils()
        sql.Select(['*']).From('users')
        expect(sql.Query()).toBe("SELECT * FROM users")
    })

    it("Where string", () => {
        const queryHelper = new SqlQueryUtils()
        queryHelper.Select(['*']).From('users').Where("id = 1")
        expect(queryHelper.Query()).toBe("SELECT * FROM users WHERE id = 1")
    })

    it("Where json", () => {
        const queryHelper = new SqlQueryUtils()
        queryHelper.Select(['*']).From('users').Where({
            id: 1,
            name: 'John'
        })
        expect(queryHelper.Query()).toEqual("SELECT * FROM users WHERE id = 1 AND name = 'John'")
    })

    it("Where array of json", () => {
        const queryHelper = new SqlQueryUtils()
        const condition = JsonUtils.ToArray({
            id: 1,
            name: 'John'
        })
        queryHelper.Select(['*']).From('users').Where(condition)
        expect(queryHelper.Query()).toEqual("SELECT * FROM users WHERE id = 1 AND name = 'John'")
    })

    it("Delete", () => {
        const queryHelper = new SqlQueryUtils()
        queryHelper.Delete().From('users').Where("id = 1")
        expect(queryHelper.Query()).toBe("DELETE FROM users WHERE id = 1")
    })

    it("Update", () => {
        const queryHelper = new SqlQueryUtils()
        queryHelper.Update('users').Set({
            name: 'John',
            age: 33
        }).Where("id = 1")
        expect(queryHelper.Query()).toEqual("UPDATE users SET name = ?, age = ? WHERE id = 1")
        expect(queryHelper.QueryParams).toEqual(['John', 33])
    })

    it("Update with field value escape", () => {
        const queryHelper = new SqlQueryUtils()
        queryHelper.Update('users').Set({
            name: `$> firstname + ' ' + lastname`,
            age: `$>33 + 10`
        }).Where("id = 1")
        expect(queryHelper.Query()).toEqual("UPDATE users SET name = firstname + ' ' + lastname, age = 33 + 10 WHERE id = 1")
    })

    it("Fields string", () => {
        const queryHelper = new SqlQueryUtils()
        queryHelper.Insert('users').Fields(['name']).Values(<TRow[]>[
            {
                id: 1,
                name: 'John'
            }
        ])
        expect(queryHelper.Query()).toBe("INSERT INTO users(name) VALUES (?, ?)")
        expect(queryHelper.QueryParams).toEqual([1, 'John'])
    })

    it("Fields string with escape", () => {
        const queryHelper = new SqlQueryUtils(undefined, undefined, mockEscapeField)
        queryHelper.Insert('users').Fields(['name']).Values(<TRow[]>[
            {
                id: 1,
                name: 'John'
            }
        ])
        expect(queryHelper.Query()).toBe("INSERT INTO users(\"name\") VALUES (?, ?)")
        expect(queryHelper.QueryParams).toEqual([1, 'John'])
    })

    it("Fields array", () => {
        const queryHelper = new SqlQueryUtils()
        queryHelper.Insert('users').Fields(['id', 'name']).Values(<TRow[]>[
            {
                id: 1,
                name: 'John'
            }
        ])
        expect(queryHelper.Query()).toBe("INSERT INTO users(id, name) VALUES (?, ?)")
        expect(queryHelper.QueryParams).toEqual([1, 'John'])
    })

    it("Fields array with escape", () => {
        const queryHelper = new SqlQueryUtils(undefined, undefined, mockEscapeField)
        queryHelper.Insert('users').Fields(['id', 'name']).Values(<TRow[]>[
            {
                id: 1,
                name: 'John'
            }
        ])
        expect(queryHelper.Query()).toBe("INSERT INTO users(\"id\", \"name\") VALUES (?, ?)")
        expect(queryHelper.QueryParams).toEqual([1, 'John'])
    })

    describe("Tokenize", () => {
        it("should tokenize SELECT", () => {
            const queryHelper = new SqlQueryUtils("SELECT * FROM \"myTable\" WHERE id = 1")
            const tokens = queryHelper.Tokenize()
            expect(tokens).toEqual([
                { token: "SELECT", type: SQL_TYPE.COMMAND, context: 'SELECT' },
                { token: "*", type: SQL_TYPE.WILDCARD, context: 'SELECT' },
                { token: "FROM", type: SQL_TYPE.COMMAND, context: 'FROM' },
                { token: "\"myTable\"", type: SQL_TYPE.ENTITY, context: 'FROM' },
                { token: "WHERE", type: SQL_TYPE.COMMAND, context: 'WHERE' },
                { token: "id", type: SQL_TYPE.VARIABLE, context: 'WHERE' },
                { token: "=", type: SQL_TYPE.OPERATOR, context: 'WHERE' },
                { token: "1", type: SQL_TYPE.NUMBER, context: 'WHERE' }
            ])
        })

        it("should tokenize SELECT with a simple WHERE clause", () => {
            const queryHelper = new SqlQueryUtils("SELECT * FROM users WHERE id = '1 OR 1=1'")
            const tokens = queryHelper.Tokenize()
            expect(tokens).toEqual([
                { token: "SELECT", type: SQL_TYPE.COMMAND, context: 'SELECT' },
                { token: "*", type: SQL_TYPE.WILDCARD, context: 'SELECT' },
                { token: "FROM", type: SQL_TYPE.COMMAND, context: 'FROM' },
                { token: "users", type: SQL_TYPE.ENTITY, context: 'FROM' },
                { token: "WHERE", type: SQL_TYPE.COMMAND, context: 'WHERE' },
                { token: "id", type: SQL_TYPE.VARIABLE, context: 'WHERE' },
                { token: "=", type: SQL_TYPE.OPERATOR, context: 'WHERE' },
                { token: "'1 OR 1=1'", type: SQL_TYPE.STRING, context: 'WHERE' }
            ])
        })

        it("should tokenize INSERT with params", () => {
            const queryHelper = new SqlQueryUtils("INSERT INTO \"myTable\" VALUES (?, ?)")
            const tokens = queryHelper.Tokenize()
            expect(tokens).toEqual([
                { token: "INSERT", type: SQL_TYPE.COMMAND, context: 'INSERT' },
                { token: "INTO", type: SQL_TYPE.COMMAND, context: 'INTO' },
                { token: "\"myTable\"", type: SQL_TYPE.ENTITY, context: 'INTO' },
                { token: "VALUES", type: SQL_TYPE.COMMAND, context: 'VALUES' },
                { token: "(", type: SQL_TYPE.PAR_OPEN, context: 'VALUES' },
                { token: "?", type: SQL_TYPE.WILDCARD, context: 'VALUES' },
                { token: ",", type: SQL_TYPE.SEPARATOR, context: 'VALUES' },
                { token: "?", type: SQL_TYPE.WILDCARD, context: 'VALUES' },
                { token: ")", type: SQL_TYPE.PAR_CLOSED, context: 'VALUES' }
            ])
        })

        it("should tokenize INSERT with table fields", () => {
            const queryHelper = new SqlQueryUtils(`INSERT INTO "myTable"("name","age") VALUES ('John', 30)`)
            const tokens = queryHelper.Tokenize()
            expect(tokens).toEqual([
                { token: "INSERT", type: SQL_TYPE.COMMAND, context: 'INSERT' },
                { token: "INTO", type: SQL_TYPE.COMMAND, context: 'INTO' },
                { token: "\"myTable\"", type: SQL_TYPE.ENTITY, context: 'INTO' },
                { token: "(", type: SQL_TYPE.PAR_OPEN, context: 'INTO' },
                { token: "\"name\"", type: SQL_TYPE.FIELD, context: 'INTO' },
                { token: ",", type: SQL_TYPE.SEPARATOR, context: 'INTO' },
                { token: "\"age\"", type: SQL_TYPE.FIELD, context: 'INTO' },
                { token: ")", type: SQL_TYPE.PAR_CLOSED, context: 'INTO' },
                { token: "VALUES", type: SQL_TYPE.COMMAND, context: 'VALUES' },
                { token: "(", type: SQL_TYPE.PAR_OPEN, context: 'VALUES' },
                { token: "'John'", type: SQL_TYPE.STRING, context: 'VALUES' },
                { token: ",", type: SQL_TYPE.SEPARATOR, context: 'VALUES' },
                { token: "30", type: SQL_TYPE.NUMBER, context: 'VALUES' },
                { token: ")", type: SQL_TYPE.PAR_CLOSED, context: 'VALUES' },

            ])
        })

        it("should tokenize UPDATE with table fields", () => {
            const queryHelper = new SqlQueryUtils(`UPDATE "myTable" SET "name" = 'John', "age" = 30`)
            const tokens = queryHelper.Tokenize()
            expect(tokens).toEqual([
                { token: "UPDATE", type: SQL_TYPE.COMMAND, context: 'UPDATE' },
                { token: "\"myTable\"", type: SQL_TYPE.ENTITY, context: 'UPDATE' },
                { token: "SET", type: SQL_TYPE.COMMAND, context: 'SET' },
                { token: "\"name\"", type: SQL_TYPE.VARIABLE, context: 'SET' },
                { token: "=", type: SQL_TYPE.OPERATOR, context: 'SET' },
                { token: "'John'", type: SQL_TYPE.STRING, context: 'SET' },
                { token: ",", type: SQL_TYPE.SEPARATOR, context: 'SET' },
                { token: "\"age\"", type: SQL_TYPE.VARIABLE, context: 'SET' },
                { token: "=", type: SQL_TYPE.OPERATOR, context: 'SET' },
                { token: "30", type: SQL_TYPE.NUMBER, context: 'SET' },

            ])
        })

        it("should tokenize a simple where clause", () => {
            const queryHelper = new SqlQueryUtils("age > 10 AND value > 0")
            const tokens = queryHelper.Tokenize()
            expect(tokens).toEqual([
                { token: "age", type: SQL_TYPE.VARIABLE, context: 'WHERE' },
                { token: ">", type: SQL_TYPE.OPERATOR, context: 'WHERE' },
                { token: "10", type: SQL_TYPE.NUMBER, context: 'WHERE' },
                { token: "AND", type: SQL_TYPE.KEYWORD, context: 'WHERE' },
                { token: "value", type: SQL_TYPE.VARIABLE, context: 'WHERE' },
                { token: ">", type: SQL_TYPE.OPERATOR, context: 'WHERE' },
                { token: "0", type: SQL_TYPE.NUMBER, context: 'WHERE' }
            ])
        })
    })

    describe("Sql injection test", () => {

        it("should throw error for 1=1", () => {
            const queryHelper = new SqlQueryUtils(`SELECT * FROM users WHERE id = 1 OR 1=1`)
            expect(() => queryHelper.Query()).toThrow(HttpErrorBadRequest)
        })

        it("should not throw an error for 1=1 inside string", () => {
            const queryHelper = new SqlQueryUtils(`SELECT * FROM users WHERE id = '1 OR 1=1'`)
            expect(() => queryHelper.Query()).not.toThrow()
        })

        it("should throw for OR 1=1 with comment", () => {
            const queryHelper = new SqlQueryUtils(`SELECT * FROM users WHERE name = "' OR 1=1 --"`);
            expect(() => queryHelper.Query()).toThrow(HttpErrorBadRequest);
        });

        it("should throw for tautology OR 1=1", () => {
            const queryHelper = new SqlQueryUtils(`SELECT * FROM users WHERE name = '' OR '1'='1'`);
            expect(() => queryHelper.Query()).toThrow(HttpErrorBadRequest);
        });

        it("should throw for OR 1=1 with semicolon and comment", () => {
            const queryHelper = new SqlQueryUtils(`SELECT * FROM users WHERE name = "' OR 1=1; --"`);
            expect(() => queryHelper.Query()).toThrow(HttpErrorBadRequest);
        });

        it("should throw for OR 1=1 with LIMIT and comment", () => {
            const queryHelper = new SqlQueryUtils(`SELECT * FROM users WHERE name = "' OR '1'='1' LIMIT 1; --"`);
            expect(() => queryHelper.Query()).toThrow(HttpErrorBadRequest);
        });

        it("should throw error for semi-colon", () => {
            const queryHelper = new SqlQueryUtils()
            queryHelper.Select(['*']).From('users').Where("id = 1; DROP TABLE users")
            expect(() => queryHelper.Query()).toThrow(HttpErrorBadRequest)
        })

        it("should not throw error for semi-colon inside string", () => {
            const queryHelper = new SqlQueryUtils()
            queryHelper.Update('users').Set({
                name: "John; DROP TABLE users",
                age: 33
            }).Where("id = 1")
            expect(() => queryHelper.Query()).not.toThrow(HttpErrorBadRequest)
        })

        it("should throw error for comment", () => {
            const queryHelper = new SqlQueryUtils()
            queryHelper.Select(['*']).From('users').Where("id = 1 OR 1=1 --")
            expect(() => queryHelper.Query()).toThrow(HttpErrorBadRequest)
        })

        it("should throw error for union", () => {
            const queryHelper = new SqlQueryUtils()
            queryHelper.Select(['*']).From('users').Where("id = 1 UNION SELECT * FROM users")
            expect(() => queryHelper.Query()).toThrow(HttpErrorBadRequest)
        })

        it("should not throw error for comment inside string", () => {
            const queryHelper = new SqlQueryUtils()
            queryHelper.Select(['*']).From('users').Where({
                id: "1 OR 1=1 --",
                name: 'John'
            })
            expect(() => queryHelper.Query()).not.toThrow(HttpErrorBadRequest)
        })

        it("should throw error for union", () => {
            const queryHelper = new SqlQueryUtils("SELECT * FROM users WHERE id = 1 UNION SELECT * FROM users AND name = 'John'")
            expect(() => queryHelper.Query()).toThrow(HttpErrorBadRequest)
        })

        it("should not throw error for comment inside string", () => {
            const queryHelper = new SqlQueryUtils()
            queryHelper.Update('users').Set({
                name: "John --",
                age: 33
            }).Where("id = 1")
            expect(() => queryHelper.Query()).not.toThrow(HttpErrorBadRequest)
        })

        it("should throw error for union", () => {
            const queryHelper = new SqlQueryUtils(`UPDATE users SET name = 'John' UNION SELECT * FROM users WHERE id=1`)
            expect(() => queryHelper.Query()).toThrow(HttpErrorBadRequest)
        })

        it("should not throw error for escaped name", () => {
            const queryHelper = new SqlQueryUtils(`SELECT * FROM "users-table" WHERE id = 1`)
            expect(() => queryHelper.Query()).not.toThrow(HttpErrorBadRequest)
        })

        it("should throw error for non-escaped name", () => {
            const queryHelper = new SqlQueryUtils("SELECT * FROM users-table WHERE id = 1")
            expect(() => queryHelper.Query()).toThrow(HttpErrorBadRequest)
        })

        it("should not throw error for deny characters inside string", () => {
            const queryHelper = new SqlQueryUtils("SELECT * FROM users WHERE name = 'John; | AND OR | DROP TABLE users'")
            expect(() => queryHelper.Query()).not.toThrow(HttpErrorBadRequest)
        })

        it("should throw error for deny characters inside string and deny words", () => {
            const queryHelper = new SqlQueryUtils("SELECT * FROM users WHERE name = 'John; | AND OR | DROP TABLE users'; SELECT * FROM users;;; -- Comments")
            expect(() => queryHelper.Query()).toThrow(HttpErrorBadRequest)
        })

        it("should throw for stacked DROP after terminator", () => {
            const queryHelper = new SqlQueryUtils(`SELECT * FROM users WHERE name = ''; DROP TABLE users; --`);
            expect(() => queryHelper.Query()).toThrow(HttpErrorBadRequest);
        });

        it("should throw for embedded DROP with quotes", () => {
            const queryHelper = new SqlQueryUtils(`SELECT * FROM users WHERE name = "'; DROP TABLE users; --"`);
            expect(() => queryHelper.Query()).toThrow(HttpErrorBadRequest);
        });

        it("should throw for unterminated comment style payload", () => {
            const queryHelper = new SqlQueryUtils(`SELECT * FROM users WHERE name = "' OR '1'='1' /*"`);
            expect(() => queryHelper.Query()).toThrow(HttpErrorBadRequest);
        });

        it("should throw for UNION SELECT exfiltration", () => {
            const queryHelper = new SqlQueryUtils(`SELECT * FROM users WHERE name = "' UNION SELECT username, password FROM users --"`);
            expect(() => queryHelper.Query()).toThrow(HttpErrorBadRequest);
        });

        it("should throw for stacked sleep (time-based) attempt", () => {
            const queryHelper = new SqlQueryUtils(`SELECT * FROM products WHERE id = 1; SELECT pg_sleep(5);`);
            expect(() => queryHelper.Query()).toThrow(HttpErrorBadRequest);
        });

        it("should throw for pipe concatenation with subquery", () => {
            const queryHelper = new SqlQueryUtils(`SELECT * FROM users WHERE name = "' || (SELECT password FROM secrets WHERE id=1) || '"`);
            expect(() => queryHelper.Query()).toThrow(HttpErrorBadRequest);
        });

        it("should throw for comment-obfuscated OR", () => {
            const queryHelper = new SqlQueryUtils(`SELECT * FROM users WHERE name = "'/**/OR/**/1=1--"`);
            expect(() => queryHelper.Query()).toThrow(HttpErrorBadRequest);
        });

        it("should throw for percent-encoded UNION", () => {
            const queryHelper = new SqlQueryUtils(`SELECT * FROM users WHERE name = "'%75%6e%69%6f%6e%20select%20%2a%20from%20users%20--"`);
            expect(() => queryHelper.Query()).toThrow(HttpErrorBadRequest);
        });

        it("should not throw for string containing semicolon (if deny inside string)", () => {
            const queryHelper = new SqlQueryUtils(`SELECT * FROM users WHERE name = 'He said: "Use this; not that."'`);
            expect(() => queryHelper.Query()).not.toThrow(HttpErrorBadRequest);
        });

        it("should not throw for dash sequences inside string (if deny inside string)", () => {
            const queryHelper = new SqlQueryUtils(`SELECT * FROM users WHERE note = 'Range 10-20 -- note this is a string'`);
            expect(() => queryHelper.Query()).not.toThrow(HttpErrorBadRequest);
        });

        it("should throw for subquery returning multiple rows", () => {
            const queryHelper = new SqlQueryUtils(`SELECT (SELECT id FROM users) AS x FROM dual;`);
            expect(() => queryHelper.Query()).toThrow(HttpErrorBadRequest);
        });

        it("should throw for UNION column mismatch", () => {
            const queryHelper = new SqlQueryUtils(`SELECT id, name FROM users UNION SELECT id FROM users;`);
            expect(() => queryHelper.Query()).toThrow(HttpErrorBadRequest);
        });

        it("should throw for division by zero", () => {
            const queryHelper = new SqlQueryUtils(`SELECT 1 / 0;`);
            expect(() => queryHelper.Query()).toThrow(HttpErrorBadRequest);
        });

        it("should throw for invalid cast", () => {
            const queryHelper = new SqlQueryUtils(`SELECT CAST('notanumber' AS INTEGER);`);
            expect(() => queryHelper.Query()).toThrow(HttpErrorBadRequest);
        });

        it("should throw for stacked UPDATE after terminator", () => {
            const queryHelper = new SqlQueryUtils(`SELECT * FROM users WHERE name = "'; UPDATE users SET admin=1 WHERE id=1; --"`);
            expect(() => queryHelper.Query()).toThrow(HttpErrorBadRequest);
        });

        it("should throw for xp_cmdshell execution attempt", () => {
            const queryHelper = new SqlQueryUtils(`SELECT * FROM users WHERE name = "'; EXEC xp_cmdshell('dir'); --"`);
            expect(() => queryHelper.Query()).toThrow(HttpErrorBadRequest);
        });

        it("should throw for rename table attempt", () => {
            const queryHelper = new SqlQueryUtils(`SELECT * FROM users WHERE name = "'; RENAME TABLE users TO users_bak; --"`);
            expect(() => queryHelper.Query()).toThrow(HttpErrorBadRequest);
        });

        it("should throw for mixed terminator + select + comment", () => {
            const queryHelper = new SqlQueryUtils(`SELECT * FROM users WHERE name = "'value'); SELECT 1; /*"`);
            expect(() => queryHelper.Query()).toThrow(HttpErrorBadRequest);
        });

        // it("should throw for comment-only payload", () => {
        //     const queryHelper = new SqlQueryUtils(`-- Comment only`);
        //     expect(() => queryHelper.Query()).toThrow(HttpErrorBadRequest);
        // });

        it("should throw for INSERT into admin_log attempt", () => {
            const queryHelper = new SqlQueryUtils(`SELECT * FROM users WHERE name = "'; INSERT INTO admin_log (msg) VALUES ('hacked'); --"`);
            expect(() => queryHelper.Query()).toThrow(HttpErrorBadRequest);
        });

        // it("should throw for duplicate columns in INSERT", () => {
        //     const queryHelper = new SqlQueryUtils(`INSERT INTO tb (a,a) VALUES (1,2)`);
        //     expect(() => queryHelper.Query()).toThrow(HttpErrorBadRequest);
        // });

        // it("should throw for unterminated string in INSERT", () => {
        //     const queryHelper = new SqlQueryUtils(`INSERT INTO tbl (col) VALUES ('unterminated string`);
        //     expect(() => queryHelper.Query()).toThrow(HttpErrorBadRequest);
        // });

        // it("should throw for escaped-quote trick inside string", () => {
        //     const queryHelper = new SqlQueryUtils(`SELECT * FROM users WHERE name = 'a'' OR ''1''=''1'`);
        //     expect(() => queryHelper.Query()).toThrow(HttpErrorBadRequest);
        // });
    })
})
