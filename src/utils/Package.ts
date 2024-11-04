 
//
//
//
//
//
import * as Fs from 'fs'
import { TJson } from "../types/TJson"

const packageRaw = Fs.readFileSync('./package.json', 'utf8')

export class Package {
    static readonly Json : TJson = JSON.parse(packageRaw) 
}