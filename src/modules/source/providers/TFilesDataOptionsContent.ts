
//

import { CONTENT } from "../../content/@consts";
import { TContentConfig } from "../../content/@types";


export type TFilesDataOptionsContent = {
    [pattern: string]: {
        type: CONTENT;
    } & TContentConfig;
};
