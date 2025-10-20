

import { SqlQueryUtils } from '../SqlQueryUtils'
import { TRow } from '../../types/DataTable'
import { JsonUtils } from "../JsonUtils"
import { HttpErrorBadRequest } from "../../modules/errors/HttpErrors"

function mockEscapeField(field: string) {
    return `\`${field}\``
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
                .Query()
            expect(query).toContain('id = 1')
            expect(query).not.toContain('name=')
            expect(query).not.toContain('age=')
        })

        it('should handle string values with single quotes', () => {
            const query = new SqlQueryUtils()
                .Update('users')
                .Set({
                    id: 1,
                    name: "O'Reilly"
                })
                .Query()
            expect(query).toContain("name = 'O''Reilly'")
        })

        it('should handle numeric values', () => {
            const query = new SqlQueryUtils()
                .Update('products')
                .Set({
                    id: 1,
                    price: 9.99,
                    quantity: '10'
                })
                .Query()

            expect(query).toBe("UPDATE products SET id = 1, price = 9.99, quantity = '10'")
        })

        it('should handle object values with parameter binding', () => {
            const date = new Date()
            const query = new SqlQueryUtils()
                .Update('events')
                .Set({
                    id: 1,
                    data: {
                        date,
                        type: 'test'
                    }
                })
                .Query()

            expect(query).toBe('UPDATE events SET id = 1, data = ?')
        })

        it('should handle escaped field values', () => {
            const query = new SqlQueryUtils()
                .Update('users')
                .Set({
                    id: 1,
                    lastLogin: '$>NOW()'
                })
                .Query()
            expect(query).toContain('lastLogin = NOW()')
        })
    })

    describe('INSERT operations', () => {
        it('should handle multiple rows with values', () => {
            const query = new SqlQueryUtils()
                .Insert('users')
                .Fields('id, name, active')
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
                .Query()

            expect(query).toBe("INSERT INTO users(id, name, active) VALUES (1, 'John', 'true'),  (2, 'Jane', 'false')")
        })

        it('should handle single row insert', () => {
            const query = new SqlQueryUtils()
                .Insert('users')
                .Fields('id, name')
                .Values([
                    {
                        id: 1,
                        name: 'John'
                    }
                ])
                .Query()

            expect(query).toBe("INSERT INTO users(id, name) VALUES (1, 'John')")
        })
    })

    describe('UPDATE operations', () => {
        it('should handle simple updates', () => {
            const query = new SqlQueryUtils()
                .Update('users')
                .Set({
                    name: 'John',
                    age: 30
                })
                .Where({ id: 1 })
                .Query()

            expect(query).toBe("UPDATE users SET name = 'John', age = 30 WHERE id = 1")
        })

        it('should handle complex updates with mixed types', () => {
            const query = new SqlQueryUtils()
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
                .Query()

            expect(query).toContain("name = 'Laptop'")
            expect(query).toContain("price = 999.99")
            expect(query).toContain("updatedAt = CURRENT_TIMESTAMP")
        })
    })

    it("Set", () => {
        const queryHelper = new SqlQueryUtils()
        queryHelper.SetQuery('SELECT * FROM users')
        expect(queryHelper.Query()).toBe("SELECT * FROM users")
    })

    it("Select", () => {
        const queryHelper = new SqlQueryUtils()
        queryHelper.Select('*').From('users')
        expect(queryHelper.Query()).toBe("SELECT * FROM users")
    })

    it("From", () => {
        const queryHelper = new SqlQueryUtils()
        queryHelper.Select('*').From('users')
        expect(queryHelper.Query()).toBe("SELECT * FROM users")
    })

    it("Where string", () => {
        const queryHelper = new SqlQueryUtils()
        queryHelper.Select('*').From('users').Where("id = 1")
        expect(queryHelper.Query()).toBe("SELECT * FROM users WHERE id = 1")
    })

    it("Where json", () => {
        const queryHelper = new SqlQueryUtils()
        queryHelper.Select('*').From('users').Where({
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
        queryHelper.Select('*').From('users').Where(condition)
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
        expect(queryHelper.Query()).toEqual("UPDATE users SET name = 'John', age = 33 WHERE id = 1")
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
        queryHelper.Insert('users').Fields('name').Values(<TRow[]>[
            {
                id: 1,
                name: 'John'
            }
        ])
        expect(queryHelper.Query()).toBe("INSERT INTO users(name) VALUES (1, 'John')")
    })

    it("Fields string with escape", () => {
        const queryHelper = new SqlQueryUtils(undefined, undefined, mockEscapeField)
        queryHelper.Insert('users').Fields('name').Values(<TRow[]>[
            {
                id: 1,
                name: 'John'
            }
        ])
        expect(queryHelper.Query()).toBe("INSERT INTO users(`name`) VALUES (1, 'John')")
    })

    it("Fields array", () => {
        const queryHelper = new SqlQueryUtils()
        queryHelper.Insert('users').Fields(['id', 'name']).Values(<TRow[]>[
            {
                id: 1,
                name: 'John'
            }
        ])
        expect(queryHelper.Query()).toBe("INSERT INTO users(id, name) VALUES (1, 'John')")
    })

    it("Fields array with escape", () => {
        const queryHelper = new SqlQueryUtils(undefined, undefined, mockEscapeField)
        queryHelper.Insert('users').Fields(['id', 'name']).Values(<TRow[]>[
            {
                id: 1,
                name: 'John'
            }
        ])
        expect(queryHelper.Query()).toBe("INSERT INTO users(`id`, `name`) VALUES (1, 'John')")
    })

    describe("Sql injection test", () => {

        it("should throw error for 1=1", () => {
            const queryHelper = new SqlQueryUtils()
            queryHelper.Select('*').From('users').Where("id = 1 OR 1=1")
            expect(() => queryHelper.Query()).toThrow(HttpErrorBadRequest)
        })

        it("should not throw an error", () => {
            const queryHelper = new SqlQueryUtils()
            queryHelper.Select('*').From('users').Where("id = '1 OR 1=1'")
            expect(() => queryHelper.Query()).not.toThrow(HttpErrorBadRequest)
        })

        it("should throw error for semi-colon", () => {
            const queryHelper = new SqlQueryUtils()
            queryHelper.Select('*').From('users').Where("id = 1; DROP TABLE users")
            expect(() => queryHelper.Query()).toThrow(HttpErrorBadRequest)
        })

        it("should throw error for 1=1", () => {
            const queryHelper = new SqlQueryUtils("SELECT * FROM users WHERE id = 1 OR 1=1")
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
            queryHelper.Select('*').From('users').Where("id = 1 OR 1=1 --")
            expect(() => queryHelper.Query()).toThrow(HttpErrorBadRequest)
        })

        it("should throw error for union", () => {
            const queryHelper = new SqlQueryUtils()
            queryHelper.Select('*').From('users').Where("id = 1 UNION SELECT * FROM users")
            expect(() => queryHelper.Query()).toThrow(HttpErrorBadRequest)
        })

        it("should not throw error for comment inside string", () => {
            const queryHelper = new SqlQueryUtils()
            queryHelper.Select('*').From('users').Where({
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
            const queryHelper = new SqlQueryUtils()
            queryHelper.Update('users').Set({
                name: "John UNION SELECT * FROM users",
                age: 33
            }).Where("id = 1")
            expect(() => queryHelper.Query()).toThrow(HttpErrorBadRequest)
        })

        it("should not throw error", () => {
            const queryHelper = new SqlQueryUtils("SELECT * FROM users-table WHERE id = 1")
            expect(queryHelper.Query()).toBe("SELECT * FROM users-table WHERE id = 1")
        })

        it("should not throw error for deny characters inside string", () => {
            const queryHelper = new SqlQueryUtils("SELECT * FROM users WHERE name = 'John; | AND OR | DROP TABLE users'")
            expect(() => queryHelper.Query()).not.toThrow(HttpErrorBadRequest)
        })

        it("should throw error for deny characters inside string and deny words", () => {
            const queryHelper = new SqlQueryUtils("SELECT * FROM users WHERE name = 'John; | AND OR | DROP TABLE users'; SELECT * FROM users;;; -- Comments")
            expect(() => queryHelper.Query()).toThrow(HttpErrorBadRequest)
        })

        it("should throw for tautology OR 1=1", () => {
            const queryHelper = new SqlQueryUtils(`SELECT * FROM users WHERE name = '' OR '1'='1'`);
            expect(() => queryHelper.Query()).toThrow(HttpErrorBadRequest);
        });

        it("should throw for stacked DROP after terminator", () => {
            const queryHelper = new SqlQueryUtils(`SELECT * FROM users WHERE name = ''; DROP TABLE users; --`);
            expect(() => queryHelper.Query()).toThrow(HttpErrorBadRequest);
        });

        it("should throw for embedded DROP with quotes", () => {
            const queryHelper = new SqlQueryUtils(`SELECT * FROM users WHERE name = "'; DROP TABLE users; --"`);
            expect(() => queryHelper.Query()).toThrow(HttpErrorBadRequest);
        });

        it("should throw for OR 1=1 with comment", () => {
            const queryHelper = new SqlQueryUtils(`SELECT * FROM users WHERE name = "' OR 1=1 --"`);
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

        it("should throw for comment-only payload", () => {
            const queryHelper = new SqlQueryUtils(`-- Comment only`);
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
