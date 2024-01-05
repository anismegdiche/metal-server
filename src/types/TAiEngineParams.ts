//
//
//
//
//
import { TJson } from './TJson'


export type TAiEngineParams = {
    engine: "tesseractjs" | "tensorflowjs" | "nlpjs"
    model: string
    options: TJson
}