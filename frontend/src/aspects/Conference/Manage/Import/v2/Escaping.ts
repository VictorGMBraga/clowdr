export function parseNonEscapedList(value: string): string[] {
    return value.split(",").filter((x) => !!x.length);
}

// See also: Export/Escaping.escapeArrayForExport
// This function has been tested using pseudo-random generation
// and functions correctly as of 2021-09-06 10:14 +01:00 (by @EdNutting)
export function parseEscapedList(value: string): string[] {
    const parts = value.split(",");
    let appendToPrevious = false;
    const result: string[] = [];
    for (const part of parts) {
        if (appendToPrevious) {
            result[result.length - 1] += "," + part;
        } else {
            result.push(part);
        }

        // Determine whether the string ends with an odd number of backslashes
        // If so, a comma was escpaed at the end of this part
        // So the next part should be appended rather than pushed
        // (Don't worry, Regex will do just fine because we're counting distinct
        //  groups not trying to match opening / closing groups)
        appendToPrevious = !!part.match(/^([^\\]|\\\\)*(\\)$/)?.length;
    }
    return result.map((x) => x.replace(/\\,/g, ",").replace(/\\\\/g, "\\"));
}
