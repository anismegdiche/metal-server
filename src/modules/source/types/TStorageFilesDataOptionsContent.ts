
//

import { CONTENT } from "../../content/@consts";
import { TContentConfig } from "../../content/@types";


export type TStorageFilesDataOptionsContent = {
    [pattern: string]: {
        "content-type": CONTENT;
    } & TContentConfig;
};
