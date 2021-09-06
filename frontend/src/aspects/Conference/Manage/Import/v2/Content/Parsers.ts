import * as uuid from "uuid";
import { Content_ElementType_Enum, Content_ItemType_Enum } from "../../../../../../generated/graphql";
import { parseEscapedList, parseNonEscapedList } from "../Escaping";
import type { Content_Element_ImportStructure, Content_ImportStructure, Content_Person_ImportStructure } from "./Types";

/**
 * This function will accept strings in both the Midspace full export format
 * as well as various of the informal ways a user might enter a person's
 * name/affiliation, such as:
 *
 * - name
 * - email
 * - (role) name
 * - (role) email
 * - name (affiliation)
 * - email (affiliation)
 * - (role) name (affiliation)
 * - (role) email (affiliation)
 * - name <email>
 * - name (affiliation) <email>
 * - (role) name <email>
 * - (role) name (affiliation) <email>
 * - (role) name <email> (affiliation)
 *
 * It has been tested and can cope with a pleasingly wide range of inputs :)
 *
 * The main edge case it can't handle is a person whose name ends in a bracket
 * or angle-bracketed part, such as "First Last (Other)" or
 * "First Last <Other>". In these cases, it "fails safe", ascribing no name (and
 * possibly no affiliation or email) to the person.
 */
export function parsePerson(rawValue: string, index: number): Content_Person_ImportStructure {
    let value = rawValue.trim();
    const result: Content_Person_ImportStructure = {};

    const priorityMatch = value.match(/^([0-9]+|N): ?(.*)/);
    if (priorityMatch) {
        result.priority = priorityMatch[1] === "N" ? index : parseInt(priorityMatch[1], 10);
        value = priorityMatch[2].trim();
    }

    const idMatch = value.match(/^([0-9a-f-]+)( .*$|$)/i);
    if (idMatch) {
        const potentialId = idMatch[1];
        if (uuid.validate(potentialId)) {
            result.id = potentialId;
            value = idMatch[2].trim();
        }
    }

    if (value.startsWith("(")) {
        let accumulatedRole = "";
        let bracketsToClose = 1;
        let idx = 1;
        for (; idx < value.length; idx++) {
            if (value[idx] === ")") {
                bracketsToClose--;
                if (bracketsToClose === 0) {
                    break;
                } else {
                    accumulatedRole += ")";
                }
            } else {
                accumulatedRole += value[idx];
            }
        }
        result.roleName = accumulatedRole;
        value = value.slice(idx + 1).trim();
    }

    if (value.startsWith("[") && value.endsWith("]")) {
        // Strip Midspace export format brackets
        value = value.slice(1, value.length - 1);
    }

    const nameAndOrEmailMatch = value.match(
        /^(.*[^)>])( ((\([^(<]*\))$|(<[^(<]*>)$|(\([^(<]*\)) (<[^(<]*>)$|(<[^(<]*>) (\([^(<]*\))$)|$)/
    );
    if (nameAndOrEmailMatch) {
        // One of the informal user formats
        let affiliation = nameAndOrEmailMatch[4] ?? nameAndOrEmailMatch[6] ?? nameAndOrEmailMatch[9];
        let email: string | undefined = nameAndOrEmailMatch[5] ?? nameAndOrEmailMatch[7] ?? nameAndOrEmailMatch[8];
        let name: string | undefined;
        if (email) {
            name = nameAndOrEmailMatch[1];
        } else {
            name = !nameAndOrEmailMatch[1].includes("@") ? nameAndOrEmailMatch[1] : undefined;
            email = nameAndOrEmailMatch[1].includes("@") ? nameAndOrEmailMatch[1] : undefined;
        }

        affiliation = affiliation?.trim();
        email = email?.trim();
        name = name?.trim();

        result.affiliation =
            affiliation?.startsWith("(") && affiliation?.endsWith(")")
                ? affiliation.slice(1, affiliation.length - 1)
                : affiliation;
        result.name = name;
        result.email = email?.startsWith("<") && email?.endsWith(">") ? email.slice(1, email.length - 1) : email;
    }

    return result;
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function parseElement(data: any, baseName: string): Content_Element_ImportStructure {
    const result: Content_Element_ImportStructure = {};

    if (data[`${baseName}: Id`]?.length) {
        if (uuid.validate(data[`${baseName}: Id`])) {
            result.id = data[`${baseName}: Id`];
        } else {
            result.id = { error: "Not a valid UUID", rawValue: data[`${baseName}: Id`] };
        }
    }

    if (data[`${baseName}: Type`]?.length) {
        const typeName = data[`${baseName}: Type`].toUpperCase();
        if (Object.values(Content_ElementType_Enum).includes(typeName)) {
            result.typeName = typeName;
        } else {
            result.typeName = { error: "Not a valid element type!", rawValue: typeName };
        }
    }

    if (data[`${baseName}: Name`]?.length) {
        result.name = data[`${baseName}: Name`];
    }

    if (data[`${baseName}: Latest Version: Created At`]?.length) {
        result.latestVersion = result.latestVersion ?? {};

        if (!("error" in result.latestVersion)) {
            try {
                const dateVal = new Date(data[`${baseName}: Latest Version: Created At`]);
                result.latestVersion.createdAt = dateVal;
            } catch (err) {
                result.latestVersion.createdAt = {
                    error: "Not a valid date! " + err.toString(),
                    rawValue: data[`${baseName}: Latest Version: Created At`],
                };
            }
        }
    }

    if (data[`${baseName}: Latest Version: Created By`]?.length) {
        result.latestVersion = result.latestVersion ?? {};

        if (!("error" in result.latestVersion)) {
            result.latestVersion.createdBy = data[`${baseName}: Latest Version: Created By`];
        }
    }

    if (data[`${baseName}: Latest Version: Data`]?.length) {
        result.latestVersion = result.latestVersion ?? {};
    } else if (data[`${baseName}: Latest Version: Text`]?.length && data[`${baseName}: Latest Version: URL`]?.length) {
        result.latestVersion = result.latestVersion ?? {};

        if (!("error" in result.latestVersion)) {
            result.latestVersion.data = {
                text: data[`${baseName}: Latest Version: Text`],
                url: data[`${baseName}: Latest Version: URL`],
            };
        }
    } else if (data[`${baseName}: Latest Version: Text`]?.length) {
        result.latestVersion = result.latestVersion ?? {};

        if (!("error" in result.latestVersion)) {
            result.latestVersion.data = { text: data[`${baseName}: Latest Version: Text`] };
        }
    } else if (data[`${baseName}: Latest Version: URL`]?.length) {
        result.latestVersion = result.latestVersion ?? {};

        if (!("error" in result.latestVersion)) {
            result.latestVersion.data = {
                url: data[`${baseName}: Latest Version: URL`],
                title: data[`${baseName}: Latest Version: Title`],
            };
        }
    } else if (data[`${baseName}: Latest Version: S3 URL`]?.length) {
        result.latestVersion = result.latestVersion ?? {};

        if (!("error" in result.latestVersion)) {
            result.latestVersion.data = {
                s3Url: data[`${baseName}: Latest Version: S3 URL`],
                altText: data[`${baseName}: Latest Version: Alt Text`],
            };
        }
    } else if (
        data[`${baseName}: Latest Version: A/V: S3 URL`]?.length &&
        data[`${baseName}: Latest Version: A/V: Full Data`]?.length
    ) {
        result.latestVersion = result.latestVersion ?? {};

        if (!("error" in result.latestVersion)) {
            result.latestVersion.data = {
                s3Url: data[`${baseName}: Latest Version: S3 URL`],
                subtitles: data[`${baseName}: Latest Version: Subtitles`]?.length
                    ? JSON.parse(data[`${baseName}: Latest Version: Subtitles`])
                    : undefined,
                fullData: JSON.parse(data[`${baseName}: Latest Version: Full Data`]),
            };
        }
    }

    if (data[`${baseName}: Layout: Is Hidden`]?.length) {
        result.layout = result.layout ?? {};

        if (!("error" in result.layout)) {
            result.layout.hidden = data[`${baseName}: Layout: Is Hidden`].toUpperCase() !== "NO";
        }
    }

    if (data[`${baseName}: Layout: Priority`]?.length) {
        result.layout = result.layout ?? {};

        if (!("error" in result.layout)) {
            result.layout.priority = parseInt(data[`${baseName}: Layout: Priority`], 10);
        }
    }

    if (data[`${baseName}: Layout: Is Wide`]?.length) {
        result.layout = result.layout ?? {};

        if (!("error" in result.layout)) {
            result.layout.wide = data[`${baseName}: Layout: Is Wide`].toUpperCase() !== "NO";
        }
    }

    if (data[`${baseName}: Uploads Remaining`]?.length) {
        result.uploadsRemaining = parseInt(data[`${baseName}: Uploads Remaining`]);
    }

    if (data[`${baseName}: Is Hidden`]?.length) {
        result.hidden = data[`${baseName}: Is Hidden`].toUpperCase() === "YES";
    }

    if (data[`${baseName}: Uploaders`]?.length) {
        const peopleStrs = parseEscapedList(data[`${baseName}: Uploaders`]);
        // As it happens, parsePerson will do the job (and the emails sent count
        // will come out as an affiliation, which we don't care about)
        const people = peopleStrs.map(parsePerson);
        result.uploaders = people.map((person) => ({
            name: person.name,
            email: person.email,
        }));
    }

    return result;
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function parseItem(data: any): Content_ImportStructure {
    const result: Content_ImportStructure = {};

    if (data["Conference Id"]?.length) {
        if (uuid.validate(data["Conference Id"])) {
            result.conferenceId = data["Conference Id"];
        } else {
            result.conferenceId = { error: "Not a valid UUID", rawValue: data["Conference Id"] };
        }
    }
    if (data["Content Id"]?.length) {
        if (uuid.validate(data["Content Id"])) {
            result.conferenceId = data["Content Id"];
        } else {
            result.conferenceId = { error: "Not a valid UUID", rawValue: data["Content Id"] };
        }
    }
    if (data["Externally Sourced Data Ids"]?.length) {
        result.externallySourcedDataIds = data["Externally Sourced Data Ids"].split("¬");
    }
    if (data["Title"]?.length) {
        result.title = data["Title"];
    }
    if (data["Short Title"]?.length) {
        result.shortTitle = data["Short Title"];
    }
    if (data["Type"]?.length) {
        const typeName = data["Type"].toUpperCase();
        if (Object.values(Content_ItemType_Enum).includes(typeName)) {
            result.type = typeName;
        } else {
            result.type = { error: "Not a valid content item type!", rawValue: typeName };
        }
    }
    if (data["Tag Ids"]?.length) {
        const ids: string[] = parseNonEscapedList(data["Tag Ids"]);
        if (ids.every((id) => uuid.validate(id))) {
            result.tagIds = ids;
        } else {
            result.tagIds = { error: "One or more values is not a valid UUID!", rawValue: data["Tag Ids"] };
        }
    }
    if (data["Tag Names"]?.length) {
        const names = parseEscapedList(data["Tag Names"]).filter((x) => !!x.length);
        result.tagNames = names;
    }
    if (data["Exhibition Ids"]?.length) {
        const ids = parseNonEscapedList(data["Exhibition Ids"]);
        if (ids.every((id) => uuid.validate(id.includes(":") ? id.split(":")[1] : id))) {
            result.exhibitionIds = ids.map((id) => {
                const parts = id.includes(":") ? id.split(":") : ["100", id];
                return {
                    priority: parseInt(parts[0], 10),
                    id: parts[1],
                };
            });
        } else {
            result.exhibitionIds = {
                error: "One or more values is not a valid UUID!",
                rawValue: data["Exhibition Ids"],
            };
        }
    }
    if (data["Exhibition Names"]?.length) {
        const names = parseEscapedList(data["Exhibition Names"]).filter((x) => !!x.length);
        result.exhibitionNames = names;
    }
    if (data["Discussion Room Ids"]?.length) {
        const ids = parseNonEscapedList(data["Discussion Room Ids"]);
        if (ids.every((id) => uuid.validate(id))) {
            result.discussionRoomIds = ids;
        } else {
            result.discussionRoomIds = {
                error: "One or more values is not a valid UUID!",
                rawValue: data["Discussion Room Ids"],
            };
        }
    }
    if (data["Chat Id"]?.length) {
        if (uuid.validate(data["Chat Id"])) {
            result.chatId = data["Chat Id"];
        } else {
            result.chatId = { error: "Not a valid UUID", rawValue: data["Chat Id"] };
        }
    }
    if (data["People"]?.length) {
        const peopleStrs = parseEscapedList(data["People"]).filter((x) => !!x.length);
        const people = peopleStrs.map(parsePerson);
        result.people = people;
    }

    result.elements = [];
    let elementIdx = 0;
    const dataKeys = Object.keys(data);
    // No doubt some user is not going to understand 0-based indexing :)
    while (elementIdx <= 1 || dataKeys.some((key) => key.startsWith(`Element ${elementIdx}`))) {
        const baseName = `Element ${elementIdx}`;
        const element = parseElement(data, baseName);

        if ("error" in element) {
            result.elements.push(element);
        } else {
            for (const key in element) {
                if (key in element && (element as any)[key] !== undefined) {
                    result.elements.push(element);
                    break;
                }
            }
        }

        elementIdx++;
    }

    return result;
}
