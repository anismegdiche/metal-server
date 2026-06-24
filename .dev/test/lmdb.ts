import { open } from 'lmdb';


const db = open({ path: "./test.data" })

async function main() {
    // write
    await db.put("plan:1", { status: "running" })
    await db.put("plan:2", { status: "done" })
    await db.put("plan:12345672", { status: "done" })
    await db.put("plan:1", { status: "ok" })
    await db.put("plan:1:step", { rows: 13 })
    await db.put("step:1", { rows: 13 })

    //

    const range = db.getRange({
        start: "plan:",
        end: "plan:~"   // common trick to get range of starting with 'plan:'
    })

    for await (const { key, value } of range) {
        console.log(key, value)
    }
}

main()