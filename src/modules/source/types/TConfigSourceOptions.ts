import { TJson } from "../../../types/TJson";

// sources.*.options


export type TConfigSourceOptions = {
    [key: string]: string | number | TJson | boolean;
};
