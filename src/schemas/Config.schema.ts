//
//
//
//
//
import _ from 'lodash'
//
import { VERBOSITY } from '../utils/Logger'
import DATA_PROVIDER from '../server/Source'
import { AI_ENGINE } from '../server/AiEngine'


export let ConfigSchema: any = {
    id: "/",
    type: "object",
    properties: {
        "version": {
            type: "string",
            enum: ["0.1", "0.2", "0.3"]
        },
        "server": {
            type: "object",
            properties: {
                "port": {
                    type: "integer",
                    minimum: 1,
                    maximum: 65_535
                },
                "verbosity": {
                    type: "string",
                    // eslint-disable-next-line you-dont-need-lodash-underscore/values
                    enum: _.values(VERBOSITY)
                },
                "timezone": { type: "string" },
                "authentication": { type: "null" },
                "request-limit": { type: "string" },
                // v0.3
                "response-limit": { type: "string" },
                // v0.3
                "response-rate": {
                    type: "object",
                    properties: {
                        "windowMs": { type: "integer" },
                        "max": { type: "integer" },
                        "message": { type: "string" }
                    },
                    required: ["windowMs", "max"]
                },
                "cache": { type: "object" }
            }
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
                            // eslint-disable-next-line you-dont-need-lodash-underscore/values
                            enum: _.values(DATA_PROVIDER)
                        },
                        "host": { type: "string" },
                        "port": {
                            type: "integer",
                            minimum: 1,
                            maximum: 65_535
                        },
                        "user": { type: "string" },
                        "password": { type: "string" },
                        "database": { type: "string" }
                    },
                    required: ["provider"]
                }
            }
        },
        "schemas": {
            type: "object",
            patternProperties: {
                ".*": {
                    type: "object",
                    properties: {
                        "sourceName": { type: "string" },
                        "entities": {
                            type: "object",
                            patternProperties: {
                                ".*": {
                                    type: "object",
                                    properties: {
                                        "sourceName": { type: "string" },
                                        "entityName": { type: "string" }
                                    },
                                    required: ["sourceName", "entityName"]
                                }
                            }
                        },
                        "anonymize": { type: "string" }
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
                            // eslint-disable-next-line you-dont-need-lodash-underscore/values
                            enum: _.values(AI_ENGINE)
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
                    required: ["engine", "model"]
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
                                // step
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
                        "planName": { type: "string" },
                        "entityName": { type: "string" },
                        "cron": {
                            type: "string",
                            pattern: "(@(annually|yearly|monthly|weekly|daily|hourly|start))|(@every (\\d+(ns|us|µs|ms|s|m|h))+)|((((\\d+,)+\\d+|([\\d\\*]+(\\/|-)\\d+)|\\d+|\\*) ?){5,7})"
                        }
                    },
                    required: ["planName", "entityName", "cron"]
                }
            }
        }
    }
}
