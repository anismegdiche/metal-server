

export type TXlsContentConfig = {
    "xls-sheet"?: string; // Specify which sheet to use, default first sheet
    "xls-starting-cell"?: string; // Specify the starting cell (e.g., 'B2'), default 'A1'
    "xls-default"?: number | string | null; // Default value for empty cells
    "xls-parse-dates"?: boolean; // Parse dates from cells, default false
    "xls-date-format"?: string; // Specify the date format for parsing dates
};
