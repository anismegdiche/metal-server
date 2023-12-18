import { Validator } from 'jsonschema'
const v = new Validator()

let config = {
    "version": "0.1",
    "server": {
        "port": 3000,
        "verbosity": "debug",
        "timezone": "UTC",
        "authentication": null,
        "request-limit": "100mb",
        "cache": {
            "provider": "mongodb",
            "host": "mongodb://localhost:27017/",
            "database": "metal_cache",
            "options": {
                "connectTimeoutMS": 5000,
                "serverSelectionTimeoutMS": 5000
            }
        }
    },
    "users": {
        "admin": 123456,
        "guest": "654321"
    },
    "sources": {
        "ms-hr": {
            "provider": "mssql",
            "host": "localhost",
            "port": 1433,
            "user": "sa",
            "password": "Azerty123!",
            "database": "hr"
        },
        "mdb-mflix": {
            "provider": "mongodb",
            "host": "mongodb://localhost:27017/",
            "database": "mflix",
            "options": {
                "connectTimeoutMS": 5000,
                "serverSelectionTimeoutMS": 5000
            }
        },
        "pg-northwind": {
            "provider": "postgres",
            "host": "localhost",
            "port": 5432,
            "user": "admin",
            "password": "123456",
            "database": "northwind"
        },
        "pg-clubdata": {
            "provider": "postgres",
            "host": "localhost",
            "port": 5433,
            "user": "admin",
            "password": "123456",
            "database": "clubdata"
        },
        "pg-clubdata-bookings": {
            "provider": "postgres",
            "host": "localhost",
            "port": 5434,
            "user": "admin",
            "password": "123456",
            "database": "clubdata"
        },
        "pg-clubdata-facilities": {
            "provider": "postgres",
            "host": "localhost",
            "port": 5435,
            "user": "admin",
            "password": "123456",
            "database": "clubdata"
        },
        "pg-clubdata-members": {
            "provider": "postgres",
            "host": "localhost",
            "port": 5436,
            "user": "admin",
            "password": "123456",
            "database": "clubdata"
        },
        "plan-etl1": {
            "provider": "plan",
            "database": "etl1"
        }
    },
    "schemas": {
        "northwind": {
            "source": "pg-northwind"
        },
        "hr": {
            "source": "ms-hr"
        },
        "mflix": {
            "source": "mdb-mflix"
        },
        "clubdata": {
            "entities": {
                "members": {
                    "source": "pg-clubdata-members",
                    "entity": "members"
                },
                "facilities": {
                    "source": "pg-clubdata-facilities",
                    "entity": "facilities"
                },
                "bookings": {
                    "source": "pg-clubdata-bookings",
                    "entity": "bookings"
                }
            }
        },
        "merge": {
            "source": "pg-clubdata",
            "entities": {
                "orders": {
                    "source": "pg-northwind",
                    "entity": "orders"
                },
                "users": {
                    "source": "mdb-mflix",
                    "entity": "users"
                }
            }
        },
        "sch-etl1": {
            "source": "plan-etl1"
        }
    },
    "schedules": {
        "run entity contact of my etl1 plan": {
            "plan": 2,
            "entity": "aitest",
            "cron": "*/5 * * * * *"
        }
    },
    "ai-engines": {
        "ocr": {
            "engine": "tesseractjs",
            "model": "eng"
        },
        "object": {
            "engine": "tensorflowjs",
            "model": "object"
        },
        "sentiment": {
            "engine": "nlpjs",
            "model": "sentiment",
            "options": {
                "lang": "en"
            }
        },
        "guess-lang": {
            "engine": "nlpjs",
            "model": "guess-lang",
            "options": {
                "accept": "en,fr"
            }
        }
    },
    "plans": {
        "etl1": {
            "src": [
                {
                    "insert": {
                        "data": [
                            {
                                "img_to_text": "https://tesseract.projectnaptha.com/img/eng_bw.png",
                                "img_to_object": "https://thumbs.dreamstime.com/b/isolated-classical-guitar-photo-png-format-available-full-transparent-background-54363220.jpg"
                            },
                            {
                                "img_to_text": "https://jeroen.github.io/images/testocr.png",
                                "img_to_object": "https://img.freepik.com/premium-photo/golden-retriever-lying-panting-isolated-white_191971-16974.jpg"
                            },
                            {
                                "img_to_text": "https://www.srcmake.com/uploads/5/3/9/0/5390645/ocr_orig.png",
                                "img_to_object": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTPpDgjJjrakUj3VlDC0K6XtdCRu5TK7CPXr7QHVjiL&s"
                            }
                        ]
                    }
                }
            ],
            "aitest2": [
                {
                    "debug": null
                },
                {
                    "select": {
                        "schema": "mflix",
                        "entity": "movies",
                        "filter": {
                            "year": 2001
                        },
                        "fields": "title"
                    }
                },
                {
                    "run": {
                        "ai": "sentiment",
                        "input": "title",
                        "output": {
                            "vote": "sentiment"
                        }
                    }
                }
            ],
            "aitest": [
                {
                    "debug": null
                },
                {
                    "insert": {
                        "data": [
                            {
                                "img_to_text": "https://tesseract.projectnaptha.com/img/eng_bw.png",
                                "img_to_object": "https://thumbs.dreamstime.com/b/isolated-classical-guitar-photo-png-format-available-full-transparent-background-54363220.jpg"
                            },
                            {
                                "img_to_text": "https://jeroen.github.io/images/testocr.png",
                                "img_to_object": "https://img.freepik.com/premium-photo/golden-retriever-lying-panting-isolated-white_191971-16974.jpg"
                            },
                            {
                                "img_to_text": "https://www.srcmake.com/uploads/5/3/9/0/5390645/ocr_orig.png",
                                "img_to_object": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTPpDgjJjrakUj3VlDC0K6XtdCRu5TK7CPXr7QHVjiL&s"
                            }
                        ]
                    }
                },
                {
                    "run": {
                        "ai": "ocr",
                        "input": "img_to_text",
                        "output": {
                            "confidence": "ocr_confidence",
                            "text": "ocr_text"
                        }
                    }
                },
                {
                    "run": {
                        "ai": "object",
                        "input": "img_to_object",
                        "output": {
                            "class": "object"
                        }
                    }
                },
                {
                    "run": {
                        "ai": "sentiment",
                        "input": "ocr_text",
                        "output": "sentiment"
                    }
                },
                {
                    "run": {
                        "ai": "guess-lang",
                        "input": "ocr_text",
                        "output": null
                    }
                }
            ],
            "contact": [
                {
                    "debug": null
                },
                {
                    "select": {
                        "schema": "demo",
                        "entity": "res_partner",
                        "fields": "id, name, display_name"
                    }
                },
                {
                    "add-field": {
                        "name": "quality",
                        "type": "integer"
                    }
                },
                {
                    "sort": {
                        "id": null
                    }
                },
                {
                    "update": {
                        "filter-expression": "id < 10",
                        "data": {
                            "name": "AAA",
                            "display_name": "BBB"
                        }
                    }
                },
                {
                    "delete": {
                        "filter-expression": "id >= 100"
                    }
                },
                {
                    "insert": {
                        "data": {
                            "name": "Anis",
                            "display_name": "Mr. Anis"
                        }
                    }
                }
            ],
            "login": [
                {
                    "debug": null
                },
                {
                    "select": {
                        "schema": "demo",
                        "entity": "res_users",
                        "fields": "login, partner_id"
                    }
                },
                {
                    "join": {
                        "type": "left",
                        "entity": "contact",
                        "left-field": "partner_id",
                        "right-field": "id"
                    }
                },
                {
                    "fields": "id, name, login"
                },
                {
                    "sort": {
                        "login": "asc",
                        "name": "desc"
                    }
                },
                {
                    "insert": {
                        "schema": "demo",
                        "entity": "res_users"
                    }
                },
                {
                    "delete": {
                        "schema": "demo",
                        "entity": "res_users",
                        "filter": {
                            "lang": "fr_FR"
                        }
                    }
                }
            ]
        }
    }
}


const configSchema = {
    id: "/",
    type: "object",
    properties: {
        "version": { type: "string" },
        "server": {
            type: "object",
            properties: {
                "port": {
                    type: "integer",
                    minimum: 1,
                    maximum: 65535
                },
                "verbosity": {
                    type: "string",
                    enum: ["debug", "info", "warn", "error", "trace"]
                },
                "timezone": { type: "string" },
                "authentication": { type: "null" },
                "request-limit": { type: "string" },
                "cache": { type: "object" }
            },
            required: ["port"]
        },
        "users": {
            type: "object",
            patternProperties: {
                ".*": {
                    type: ["string", "number"]
                }
            }
        },
        "sources": {
            type: "object",
            patternProperties: {
                ".*": {
                    type: "object",
                    properties: {
                        "provider": {
                            type: "string",
                            enum: ["plan", "postgres", "mongodb", "mssql"]
                        },
                        "host": { type: "string" },
                        "port": {
                            type: "integer",
                            minimum: 1,
                            maximum: 65535
                        },
                        "user": { type: "string" },
                        "password": { type: "string" },
                        "database": { type: "string" }
                    },
                    required: ["provider", "database"]
                }
            }
        },
        "schemas": {
            type: "object",
            patternProperties: {
                ".*": {
                    type: "object",
                    properties: {
                        "source": { type: "string" },
                        "entities": {
                            type: "object",
                            patternProperties: {
                                ".*": {
                                    type: "object",
                                    properties: {
                                        "source": { type: "string" },
                                        "entity": { type: "string" }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        "ai-engines": {
            type: "object",
            patternProperties: {
                ".*": {
                    type: "object",
                    properties: {
                        "engine": {
                            type: "string",
                            enum: ["tesseractjs", "tensorflowjs", "nlpjs"]
                        },
                        "model": { type: "string" },
                        "options": {
                            type: "object",
                            patternProperties: {
                                ".*": {
                                    type: "any"
                                }
                            }
                        }
                    },
                    dependencies: {
                        "engine": ["model"]
                    }
                }
            }
        },
        "plans": {
            type: "object",
            patternProperties: {
                // planName
                ".*": {
                    type: "object",
                    patternProperties: {
                        // entityName
                        ".*": {
                            type: "array",
                            items: {
                                type: "object",
                                patternProperties: {
                                    ".*": {
                                        type: "any"
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        "schedules": {
            type: "object",
            patternProperties: {
                ".*": {
                    type: "object",
                    properties: {
                        "plan": { type: "string" },
                        "entity": { type: "string" },
                        "cron": { type: "string" }
                    },
                    required: ["plan", "entity", "cron","t"]
                }
            }
        }
    }
}


//v.addSchema(addressSchema, '/SimpleAddress')
console.log((v.validate(config, configSchema)).errors.map(i => i.stack.replace(/instance\./, '')))