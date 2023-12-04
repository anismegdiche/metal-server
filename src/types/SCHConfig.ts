
export const SCHConfigRoot = {
    version: {
        type: String,
        required: true
    },
    server: {
        port: { type: Number },
        verbosity: { type: String },
        cache: { type: Object }
    },
    sources: {
        type: Object
    },
    schemas: {
        type: Object
    },
    plans: { type: Object },
    schedules: { type: Object },
    "ai-engines": { type: Object }
}

export const SCHConfigSource = {
    provider: {
        type: String,
        required: true
    },
    host: { type: String },
    port: { type: Number },
    user: { type: String },
    password: { type: String },
    database: { type: String },
    options: { type: Object }
}

export const SCHConfigSchema = {
    source: { type: String },
    entities: { type: Object },
    plan: { type: String }
}

export const SCHConfigPlan = {
    select: { type: Object },
    join: { type: Object },
    fields: { type: Object },
    sort: { type: Object }
}