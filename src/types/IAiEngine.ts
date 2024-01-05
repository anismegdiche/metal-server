/* eslint-disable no-unused-vars */

import { TJson } from './TJson'
import { Page } from 'tesseract.js'

export interface IAiEngine {
    AiEngineName: string
    InstanceName: string
    Model: string
    Options?: TJson
    Init: () => Promise<void|null>
    Run: (image: string) => Promise<void | Page>
}