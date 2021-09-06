// See also: Import/v2/Escaping.parseEscapedList

import { parseEscapedList } from "../Import/v2/Escaping";

// The test function below should hold true
export function escapeArrayForExport(arr: string[]): string[] {
    return arr.map((x) => x.replace(/\\/g, "\\\\").replace(/,/g, "\\,"));
}

// This has been tested with 500 randomly generated strings containing
// `abcdef\, ` and held true as of 2021-09-06 10:14 +01:00 by @EdNutting
// The dataset was validated to ensure it contained obvious corner cases
// such as `\` `,` `\,` `,\` `abc\` `abc,` and `\,abc\`
export function testEscapingArrays(values: string[]): boolean {
    const escaped = escapeArrayForExport(values);
    const value = escaped.join(","); // What Papa does when encoding an array for CSV
    const parsed = parseEscapedList(value);
    return parsed.every((value, idx) => values[idx] === value);
}
