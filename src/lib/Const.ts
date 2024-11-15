
//
//
//
//
//
import { Package } from "../utils/Package"


export const SERVER = {
    NAME: 'Metal',
    VERSION: Package.Json.version as string,
    BANNER: '<h1>\\m/ Metal Server</h1>',
    CONSOLE_BANNER: `\x1b[31m
               ,,,,,
             ▓▓▓▓▓▓▓▓▓
        ,    ▓▓▓▓▓▓▓▓▓    ,   \x1b[0m   ▄▄▄      ▄▄               ██▌             ██▌\x1b[31m
       ╓▓⌐   █╜¬╚▓▀"╙▓    ▓▄  \x1b[0m  ▐███     ████              ██▌             ██▌\x1b[31m
       ▓▓⌐   ▌   ╠   ▐    ▓▓  \x1b[0m  █████   ▐████    ▄█████▄  █████  ▄████▄██▌ ██▌\x1b[31m
      ▐▓▓⌐   ▌   ╠   ▐    ▓▓▌ \x1b[0m  ██▀██▌ ▐██▀██▌ ▄██▀   ▀██  ██▌ ▄██▀  ▀▀██▌ ██▌\x1b[31m
      ▐▓▓█w╓▄█▄wα█Wwg█▓╖╥▓▓▓▌ \x1b[0m ▐██ ▐██▄██▌ ███ ██████████▌ ██▌ ██▌     ██▌ ██▌\x1b[31m
       ▓▓▓▓▓▓▌       ▐▓▓▓▓▓█  \x1b[0m ██▌  ▐████  ▐██-▀██▄   ▄▄▄  ██▌ ▀██▄   ▄██▌ ██▌\x1b[31m
        ▀▓▓▓▓█▄▄╦╥   ▐▓▓▓▓▀   \x1b[0m▐██    ███    ██▌ ▀▀█████▀   ██▌  ▀▀████▀██▌ ██▌\x1b[31m
          ▀▓▓▓▓▓▓▓   ▐▓▓▀ 
             ╚▀▀▀▀   ▀        \x1b[0m M i d d l e w a r e     -     E T L    -    A I \x1b[31m
`
}

export enum ROUTE {
    USER_PATH = '/user',
    SERVER_PATH = '/server',
    SCHEMA_PATH = '/schema',
    PLAN_PATH = '/plan',
    CACHE_PATH = '/cache',
    SCHEDULE_PATH = '/schedule',
    SWAGGER_UI_PATH = '/api-docs'
}

export const RESPONSE_RESULT = {
    SUCCESS: {
        result: 'success'
    },
    ERROR: {
        result: 'error'
    },
    NOT_FOUND: {
        result: 'not found'
    }
}


export enum HTTP_METHOD {
    GET = 'GET',
    POST = 'POST',
    PUT = 'PUT',
    DELETE = 'DELETE',
    PATCH = 'PATCH',
    OPTIONS = 'OPTIONS',
    HEAD = 'HEAD'
}

export enum HTTP_STATUS_CODE {
    OK = 200,
    CREATED = 201,
    NO_CONTENT = 204,
    BAD_REQUEST = 400,
    UNAUTHORIZED = 401,
    FORBIDDEN = 403,
    NOT_FOUND = 404,
    CONFLICT = 409,
    METHOD_NOT_ALLOWED = 405,
    TOO_MANY_REQUESTS = 429,
    INTERNAL_SERVER_ERROR = 500,
    NOT_IMPLEMENTED = 501,
    CONTENT_TOO_LARGE = 413
}

export enum HTTP_STATUS_MESSAGE {
    OK = 'OK',
    CREATED = 'Created',
    NO_CONTENT = 'No Content',
    BAD_REQUEST = 'Bad Request',
    UNAUTHORIZED = 'Unauthorized',
    FORBIDDEN = 'Forbidden',
    NOT_FOUND = 'Not Found',
    CONFLICT = 'Conflict',
    METHOD_NOT_ALLOWED = 'Method Not Allowed',
    TOO_MANY_REQUESTS = 'Too many requests from this IP, please try again later',
    INTERNAL_SERVER_ERROR = 'Internal Server Error',
    NOT_IMPLEMENTED = 'Not Implemented',
    CONTENT_TOO_LARGE = 'Content Too Large'
}

export const RESPONSE_STATUS = {
    HTTP_200: {
        status: HTTP_STATUS_CODE.OK
    },
    HTTP_201: {
        status: HTTP_STATUS_CODE.CREATED
    },
    HTTP_400: {
        status: HTTP_STATUS_CODE.BAD_REQUEST
    },
    HTTP_404: {
        status: HTTP_STATUS_CODE.NOT_FOUND
    },
    HTTP_405: {
        status: HTTP_STATUS_CODE.METHOD_NOT_ALLOWED
    },
    HTTP_429: {
        status: HTTP_STATUS_CODE.TOO_MANY_REQUESTS
    },
    HTTP_500: {
        status: HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR
    }
}

export enum VALIDATION_ERROR_MESSAGE {
    MUST_BE_NUMBER = 'must be a number',
    MUST_BE_JSON = 'must be a JSON object',
    MUST_BE_JSON_ARRAY_OR_OBJECT = 'must be a JSON array or a JSON object',
    MUST_BE_STRING = 'must be a string'
}

export const RESPONSE = {
    SELECT: {
        SUCCESS: {
            STATUS: {
                status: HTTP_STATUS_CODE.OK
            },
            MESSAGE: {
                result: HTTP_STATUS_MESSAGE.OK
            }
        },
        BAD_REQUEST: {
            STATUS: {
                status: HTTP_STATUS_CODE.BAD_REQUEST
            },
            MESSAGE: {
                result: HTTP_STATUS_MESSAGE.BAD_REQUEST
            }
        },
        NOT_FOUND: {
            STATUS: {
                status: HTTP_STATUS_CODE.NOT_FOUND
            },
            MESSAGE: {
                result: HTTP_STATUS_MESSAGE.NOT_FOUND
            }
        }
    },
    INSERT: {
        SUCCESS: {
            STATUS: {
                status: HTTP_STATUS_CODE.CREATED
            },
            MESSAGE: {
                result: HTTP_STATUS_MESSAGE.CREATED
            }
        },
        BAD_REQUEST: {
            STATUS: {
                status: HTTP_STATUS_CODE.BAD_REQUEST
            },
            MESSAGE: {
                result: HTTP_STATUS_MESSAGE.BAD_REQUEST
            }
        },
        CONFLICT: {
            STATUS: {
                status: HTTP_STATUS_CODE.CONFLICT
            },
            MESSAGE: {
                result: HTTP_STATUS_MESSAGE.CONFLICT
            }
        }
    },
    UPDATE: {
        SUCCESS: {
            STATUS: {
                status: HTTP_STATUS_CODE.OK
            },
            MESSAGE: {
                result: HTTP_STATUS_MESSAGE.OK
            }
        },
        BAD_REQUEST: {
            STATUS: {
                status: HTTP_STATUS_CODE.BAD_REQUEST
            },
            MESSAGE: {
                result: HTTP_STATUS_MESSAGE.BAD_REQUEST
            }
        },
        NOT_FOUND: {
            STATUS: {
                status: HTTP_STATUS_CODE.NOT_FOUND
            },
            MESSAGE: {
                result: HTTP_STATUS_MESSAGE.NOT_FOUND
            }
        }
    },
    DELETE: {
        SUCCESS: {
            STATUS: {
                status: HTTP_STATUS_CODE.NO_CONTENT
            },
            MESSAGE: {
                result: HTTP_STATUS_MESSAGE.NO_CONTENT
            }
        },
        BAD_REQUEST: {
            STATUS: {
                status: HTTP_STATUS_CODE.BAD_REQUEST
            },
            MESSAGE: {
                result: HTTP_STATUS_MESSAGE.BAD_REQUEST
            }
        },
        NOT_FOUND: {
            STATUS: {
                status: HTTP_STATUS_CODE.NOT_FOUND
            },
            MESSAGE: {
                result: HTTP_STATUS_MESSAGE.NOT_FOUND
            }
        }
    },
    SERVER: {
        INTERNAL_SERVER_ERROR: {
            STATUS: {
                status: HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR
            },
            MESSAGE: {
                result: HTTP_STATUS_MESSAGE.INTERNAL_SERVER_ERROR
            }
        }
    }
}

export const METADATA = {
    CACHE: '__CACHE__',
    CACHE_EXPIRE: '__CACHE_EXPIRE__',
    PLAN_DEBUG: '__PLAN_DEBUG__',
    PLAN_ERRORS: '__PLAN_ERRORS__'
}