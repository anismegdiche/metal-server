import alasql from 'alasql'
const sql =  "CREATE TABLE output(name, mimeType, `type`, `size`, createdAt, modifiedAt, path, ocr_text, translated);"


const sql2 = 
"INSERT INTO output(name, mimeType, `type`, `size`, createdAt, modifiedAt, path, ocr_text, translated) VALUES ('ocr-1.png', 'image/png', 'file', 130403, 0, 0, 'data/img/ocr-1.png', 'Cedric himself')"

const sql3 = ";SELECT * from output"

const res = alasql(sql + sql2 + sql3)

console.log(res)