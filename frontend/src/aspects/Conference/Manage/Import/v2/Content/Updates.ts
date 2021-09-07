import { gql } from "@apollo/client";
import {
    ElementBaseTypes,
    ElementBlob,
    ElementDataBlob,
    ElementVersionData,
} from "@clowdr-app/shared-types/build/content";
import assert from "assert";
import { v4 as uuidv4 } from "uuid";
import type {
    Content_ElementType_Enum,
    ImportContent_ExhibitionFragment,
    ImportContent_ItemFragment,
    ImportContent_ProgramPersonFragment,
    ImportContent_TagFragment,
} from "../../../../../../generated/graphql";
import { createUpdate, ErrorInfo, Updates } from "../Types";
import type { Content_Element_LatestVersion_ImportStructure, Content_ImportStructure } from "./Types";

gql`
    ## Items

    fragment ImportContent_ItemTag on content_ItemTag {
        id
        tagId
    }

    fragment ImportContent_ItemExhibition on content_ItemExhibition {
        id
        exhibitionId
        priority
        layout
    }

    fragment ImportContent_Room on room_Room {
        id
        name
    }

    fragment ImportContent_Element on content_Element {
        id
        itemId
        name
        typeName
        data
        layoutData
        uploadsRemaining
        isHidden
        updatedAt
        conferenceId
        uploaders {
            ...ImportContent_Uploader
        }
    }

    fragment ImportContent_ProgramPerson on collection_ProgramPerson {
        id
        name
        affiliation
        email
        registrantId
    }

    fragment ImportContent_ItemProgramPerson on content_ItemProgramPerson {
        id
        priority
        roleName
        personId
    }

    fragment ImportContent_Uploader on content_Uploader {
        id
        email
        name
        emailsSentCount
    }

    fragment ImportContent_Item on content_Item {
        id
        conferenceId
        title
        shortTitle
        typeName
        originatingData {
            id
            sourceId
        }
        itemTags {
            ...ImportContent_ItemTag
        }
        itemExhibitions {
            ...ImportContent_ItemExhibition
        }
        rooms {
            ...ImportContent_Room
        }
        chatId
        itemPeople {
            ...ImportContent_ItemProgramPerson
        }
        elements {
            ...ImportContent_Element
        }
    }

    ## Tags

    fragment ImportContent_Tag on collection_Tag {
        id
        name
        colour
        priority
    }

    ## Exhibitions

    fragment ImportContent_Exhibition on collection_Exhibition {
        id
        name
        colour
        priority
        isHidden
    }

    query ImportContent_SelectAll($conferenceId: uuid!) {
        content_Item(where: { conferenceId: { _eq: $conferenceId } }) {
            ...ImportContent_Item
        }
        collection_ProgramPerson(where: { conferenceId: { _eq: $conferenceId } }) {
            ...ImportContent_ProgramPerson
        }
        collection_Tag(where: { conferenceId: { _eq: $conferenceId } }) {
            ...ImportContent_Tag
        }
        collection_Exhibition(where: { conferenceId: { _eq: $conferenceId } }) {
            ...ImportContent_Exhibition
        }
    }

    mutation ImportContent_InsertItems($items: [content_Item_insert_input!]!) {
        insert_content_Item(objects: $items) {
            affected_rows
        }
    }

    mutation ImportContent_InsertPeople($people: [collection_ProgramPerson_insert_input!]!) {
        insert_collection_ProgramPerson(objects: $people) {
            affected_rows
        }
    }

    mutation ImportContent_InsertTags($tags: [collection_Tag_insert_input!]!) {
        insert_collection_Tag(objects: $tags) {
            affected_rows
        }
    }

    mutation ImportContent_InsertExhibitions($exhibitions: [collection_Exhibition_insert_input!]!) {
        insert_collection_Exhibition(objects: $exhibitions) {
            affected_rows
        }
    }

    mutation ImportContent_UpdateItem($id: uuid!, $item: content_Item_set_input!) {
        update_content_Item_by_pk(pk_columns: { id: $id }, _set: $item) {
            id
        }
    }

    mutation ImportContent_UpdatePerson($id: uuid!, $person: collection_ProgramPerson_set_input!) {
        update_collection_ProgramPerson_by_pk(pk_columns: { id: $id }, _set: $person) {
            id
        }
    }

    mutation ImportContent_UpdateTag($id: uuid!, $tag: collection_Tag_set_input!) {
        update_collection_Tag_by_pk(pk_columns: { id: $id }, _set: $tag) {
            id
        }
    }

    mutation ImportContent_UpdateExhibition($id: uuid!, $exhibition: collection_Exhibition_set_input!) {
        update_collection_Exhibition_by_pk(pk_columns: { id: $id }, _set: $exhibition) {
            id
        }
    }
`;

export type Content_DbData = {
    items: Map<string, ImportContent_ItemFragment>;
    people: Map<string, ImportContent_ProgramPersonFragment>;
    tags: Map<string, ImportContent_TagFragment>;
    exhibitions: Map<string, ImportContent_ExhibitionFragment>;
};

export type Content_UpdatesDbData = {
    items: Map<string, Updates<ImportContent_ItemFragment> | ErrorInfo>;
    people: Map<string, Updates<ImportContent_ProgramPersonFragment> | ErrorInfo>;
    tags: Map<string, Updates<ImportContent_TagFragment> | ErrorInfo>;
    exhibitions: Map<string, Updates<ImportContent_ExhibitionFragment> | ErrorInfo>;
};

function convertElementData(
    newElementTypeName: Content_ElementType_Enum,
    newElementLatestVersion: Content_Element_LatestVersion_ImportStructure
): ElementVersionData {
    assert(newElementLatestVersion.data);
    assert(!("error" in newElementLatestVersion.data));
    return {
        createdAt: (newElementLatestVersion.createdAt
            ? "error" in newElementLatestVersion.createdAt
                ? new Date()
                : newElementLatestVersion.createdAt
            : new Date()
        ).getTime(),
        createdBy: newElementLatestVersion.createdBy
            ? typeof newElementLatestVersion.createdBy !== "string"
                ? "importer"
                : newElementLatestVersion.createdBy
            : "importer",
        data:
            "altText" in newElementLatestVersion.data
                ? ({
                      type: newElementTypeName,
                      baseType: ElementBaseTypes[newElementTypeName],
                      s3Url: newElementLatestVersion.data.s3Url,
                      altText: newElementLatestVersion.data.altText,
                  } as ElementBlob)
                : "title" in newElementLatestVersion.data
                ? ({
                      type: newElementTypeName,
                      baseType: ElementBaseTypes[newElementTypeName],
                      url: newElementLatestVersion.data.url,
                      title: newElementLatestVersion.data.title,
                  } as ElementBlob)
                : "url" in newElementLatestVersion.data
                ? ({
                      type: newElementTypeName,
                      baseType: ElementBaseTypes[newElementTypeName],
                      url: newElementLatestVersion.data.url,
                      text: newElementLatestVersion.data.text,
                  } as ElementBlob)
                : "text" in newElementLatestVersion.data
                ? ({
                      type: newElementTypeName,
                      baseType: ElementBaseTypes[newElementTypeName],
                      text: newElementLatestVersion.data.text,
                  } as ElementBlob)
                : ({
                      type: newElementTypeName,
                      baseType: ElementBaseTypes[newElementTypeName],
                      s3Url: newElementLatestVersion.data.s3Url,
                      subtitles: newElementLatestVersion.data.subtitles,
                      // Do we ever want to make use of the "fullData" property?
                  } as ElementBlob),
    };
}

export function computeUpdates(oldData: Content_DbData, newData: Content_ImportStructure[]): Content_UpdatesDbData {
    const result: Content_UpdatesDbData = {
        items: new Map(),
        people: new Map(oldData.people),
        tags: new Map(oldData.tags),
        exhibitions: new Map(oldData.exhibitions),
    };

    for (const newItemData of newData) {
        let oldItemData: ImportContent_ItemFragment | undefined | ErrorInfo;

        if (newItemData.contentId) {
            if (typeof newItemData.contentId === "string") {
                oldItemData = oldData.items.get(newItemData.contentId);
            } else {
                oldItemData = {
                    error: "Could not find old data because the new data contentId encountered a processing error.",
                    rawValue: JSON.stringify(newItemData.contentId),
                };
            }
        }

        if (!oldItemData && newItemData.externallySourcedDataIds) {
            if (newItemData.externallySourcedDataIds instanceof Array) {
                const possibleOldItems: ImportContent_ItemFragment[] = [];
                for (const oldItem of oldData.items.values()) {
                    const oldSourceIds = oldItem.originatingData?.sourceId.split("¬");
                    if (oldSourceIds) {
                        if (newItemData.externallySourcedDataIds.every((sourceId) => oldSourceIds.includes(sourceId))) {
                            possibleOldItems.push(oldItem);
                        }
                    }
                }

                if (possibleOldItems.length > 0) {
                    const matchTo = newItemData.externallySourcedDataIds.join("¬");
                    const exactItem = possibleOldItems.find(
                        (possibleOldItem) => possibleOldItem.originatingData?.sourceId === matchTo
                    );
                    if (exactItem) {
                        oldItemData = exactItem;
                    } else {
                        oldItemData = possibleOldItems.sort((x, y) => {
                            if (!y.originatingData) {
                                return -1;
                            } else if (!x.originatingData) {
                                return 1;
                            }

                            return y.originatingData.sourceId.length - x.originatingData.sourceId.length;
                        })[0];
                    }
                }
            } else {
                oldItemData = {
                    error: "Could not find old data because the new data externally sourced data ids encountered a processing error.",
                    rawValue: JSON.stringify(newItemData.contentId),
                };
            }
        }

        if (!oldItemData && newItemData.title) {
            if (typeof newItemData.title === "string") {
                for (const oldItem of oldData.items.values()) {
                    if (oldItem.title === newItemData.title) {
                        oldItemData = oldItem;
                        break;
                    }
                }
            } else {
                oldItemData = {
                    error: "Could not find old data because the new data title encountered a processing error.",
                    rawValue: JSON.stringify(newItemData.contentId),
                };
            }
        }

        const resultItemData: Updates<ImportContent_ItemFragment> | undefined | ErrorInfo = oldItemData
            ? "error" in oldItemData
                ? oldItemData
                : {
                      ...oldItemData,
                      itemTags: [...oldItemData.itemTags],
                      itemExhibitions: [...oldItemData.itemExhibitions],
                      itemPeople: [...oldItemData.itemPeople],
                      rooms: [...oldItemData.rooms],
                      elements: oldItemData.elements.map((element) => ({
                          ...element,
                          uploaders: [...element.uploaders],
                      })),
                  }
            : { id: { new: uuidv4() } };
        if ((!oldItemData || !("error" in oldItemData)) && resultItemData && !("error" in resultItemData)) {
            if (newItemData.title && oldItemData?.title !== newItemData.title) {
                resultItemData.title = createUpdate(oldItemData?.title, newItemData.title);
            }
            if (newItemData.shortTitle && oldItemData?.shortTitle !== newItemData.shortTitle) {
                resultItemData.shortTitle = createUpdate(oldItemData?.shortTitle, newItemData.shortTitle);
            }
            if (newItemData.type && oldItemData?.typeName !== newItemData.type) {
                resultItemData.typeName = createUpdate(oldItemData?.typeName, newItemData.type);
            }
            if (newItemData.chatId && oldItemData?.chatId !== newItemData.chatId) {
                resultItemData.chatId = createUpdate(oldItemData?.chatId, newItemData.chatId);
            }

            if (!resultItemData?.originatingData && newItemData.externallySourcedDataIds) {
                if ("error" in newItemData.externallySourcedDataIds) {
                    resultItemData.originatingData = newItemData.externallySourcedDataIds;
                } else {
                    resultItemData.originatingData = createUpdate(undefined, {
                        id: { new: uuidv4() },
                        sourceId: newItemData.externallySourcedDataIds.join("¬"),
                        data: newItemData,
                    });
                }
            }

            if (newItemData.tagIds) {
                if (!resultItemData.itemTags || !("error" in resultItemData.itemTags)) {
                    if ("error" in newItemData.tagIds) {
                        resultItemData.itemTags = newItemData.tagIds;
                    } else if (!resultItemData.itemTags || !("error" in resultItemData.itemTags)) {
                        resultItemData.itemTags = resultItemData.itemTags ?? [];
                        const newTagIds: Set<string> = new Set();

                        for (const newItemTagId of newItemData.tagIds) {
                            if (!resultItemData.itemTags.some((x) => !("error" in x) && x.tagId === newItemTagId)) {
                                newTagIds.add(newItemTagId);
                            }
                        }

                        if (newTagIds.size > 0) {
                            resultItemData.itemTags = [...resultItemData.itemTags, ...newTagIds].map((tagId) => ({
                                id: { new: uuidv4() },
                                tagId,
                            }));
                        }
                    }
                }
            }

            if (newItemData.tagNames) {
                if (!resultItemData.itemTags || !("error" in resultItemData.itemTags)) {
                    if ("error" in newItemData.tagNames) {
                        resultItemData.itemTags = newItemData.tagNames;
                    } else if (!resultItemData.itemTags || !("error" in resultItemData.itemTags)) {
                        resultItemData.itemTags = resultItemData.itemTags ?? [];
                        const newTagIds: Set<string> = new Set();

                        for (const newItemTagName of newItemData.tagNames) {
                            let added = false;
                            for (const existingTag of result.tags.values()) {
                                if (
                                    !("error" in existingTag) &&
                                    existingTag.name &&
                                    (typeof existingTag.name === "string" || !("error" in existingTag.name)) &&
                                    existingTag.id &&
                                    (typeof existingTag.id === "string" || !("error" in existingTag.id))
                                ) {
                                    if (
                                        typeof existingTag.name === "string"
                                            ? existingTag.name === newItemTagName
                                            : existingTag.name.new === newItemTagName
                                    ) {
                                        if (typeof existingTag.id === "string") {
                                            if (
                                                !resultItemData.itemTags.some(
                                                    (x) => !("error" in x) && x.tagId === existingTag.id
                                                )
                                            ) {
                                                newTagIds.add(existingTag.id);
                                            }
                                        } else {
                                            if (
                                                !resultItemData.itemTags.some(
                                                    (x) => !("error" in x) && x.tagId === existingTag.id.new
                                                )
                                            ) {
                                                newTagIds.add(existingTag.id.new);
                                            }
                                        }
                                        added = true;
                                        break;
                                    }
                                }
                            }
                            if (!added) {
                                const newTag = {
                                    id: { new: uuidv4() },
                                    name: newItemTagName,
                                    colour: "rgba(0,0,0,1)",
                                    priority: 10,
                                };
                                result.tags.set(newTag.id.new, newTag);
                                newTagIds.add(newTag.id.new);
                            }
                        }

                        if (newTagIds.size > 0) {
                            resultItemData.itemTags = [...resultItemData.itemTags, ...newTagIds].map((tagId) => ({
                                id: { new: uuidv4() },
                                tagId,
                            }));
                        }
                    }
                }
            }

            if (newItemData.exhibitionIds) {
                if (!resultItemData.itemExhibitions || !("error" in resultItemData.itemExhibitions)) {
                    if ("error" in newItemData.exhibitionIds) {
                        resultItemData.itemExhibitions = newItemData.exhibitionIds;
                    } else if (!resultItemData.itemExhibitions || !("error" in resultItemData.itemExhibitions)) {
                        resultItemData.itemExhibitions = resultItemData.itemExhibitions ?? [];
                        const newExhibitionIds: { priority: number; id: string }[] = [];

                        for (const newItemExhibitionId of newItemData.exhibitionIds) {
                            if (
                                !resultItemData.itemExhibitions.some(
                                    (x) => !("error" in x) && x.exhibitionId === newItemExhibitionId.id
                                )
                            ) {
                                newExhibitionIds.push(newItemExhibitionId);
                            }
                        }

                        if (newExhibitionIds.length > 0) {
                            resultItemData.itemExhibitions = [
                                ...resultItemData.itemExhibitions,
                                ...newExhibitionIds.map((exhibitionId) => ({
                                    id: { new: uuidv4() },
                                    exhibitionId: exhibitionId.id,
                                    priority: exhibitionId.priority,
                                })),
                            ];
                        }
                    }
                }
            }

            if (newItemData.exhibitionNames) {
                if (!resultItemData.itemExhibitions || !("error" in resultItemData.itemExhibitions)) {
                    if ("error" in newItemData.exhibitionNames) {
                        resultItemData.itemExhibitions = newItemData.exhibitionNames;
                    } else if (!resultItemData.itemExhibitions || !("error" in resultItemData.itemExhibitions)) {
                        resultItemData.itemExhibitions = resultItemData.itemExhibitions ?? [];
                        const newExhibitionIds: Set<string> = new Set();

                        for (const newItemExhibitionName of newItemData.exhibitionNames) {
                            let added = false;
                            for (const existingExhibition of result.exhibitions.values()) {
                                if (
                                    !("error" in existingExhibition) &&
                                    existingExhibition.name &&
                                    (typeof existingExhibition.name === "string" ||
                                        !("error" in existingExhibition.name)) &&
                                    existingExhibition.id &&
                                    (typeof existingExhibition.id === "string" || !("error" in existingExhibition.id))
                                ) {
                                    if (
                                        typeof existingExhibition.name === "string"
                                            ? existingExhibition.name === newItemExhibitionName
                                            : existingExhibition.name.new === newItemExhibitionName
                                    ) {
                                        if (typeof existingExhibition.id === "string") {
                                            if (
                                                !resultItemData.itemExhibitions.some(
                                                    (x) => !("error" in x) && x.exhibitionId === existingExhibition.id
                                                )
                                            ) {
                                                newExhibitionIds.add(existingExhibition.id);
                                            }
                                        } else {
                                            if (
                                                !resultItemData.itemExhibitions.some(
                                                    (x) =>
                                                        !("error" in x) && x.exhibitionId === existingExhibition.id.new
                                                )
                                            ) {
                                                newExhibitionIds.add(existingExhibition.id.new);
                                            }
                                        }
                                        added = true;
                                        break;
                                    }
                                }
                            }
                            if (!added) {
                                const newExhibition = {
                                    id: { new: uuidv4() },
                                    name: newItemExhibitionName,
                                    colour: "rgba(0,0,0,1)",
                                    priority: 10,
                                    isHidden: false,
                                };
                                result.exhibitions.set(newExhibition.id.new, newExhibition);
                                newExhibitionIds.add(newExhibition.id.new);
                            }
                        }

                        if (newExhibitionIds.size > 0) {
                            resultItemData.itemExhibitions = [
                                ...resultItemData.itemExhibitions,
                                ...[...newExhibitionIds].map((exhibitionId) => ({
                                    id: { new: uuidv4() },
                                    exhibitionId,
                                })),
                            ];
                        }
                    }
                }
            }

            if (newItemData.people) {
                if ("error" in newItemData.people) {
                    resultItemData.itemPeople = newItemData.people;
                } else if (!resultItemData.itemPeople || !("error" in resultItemData.itemPeople)) {
                    resultItemData.itemPeople = resultItemData.itemPeople ?? [];

                    for (const newItemPerson of newItemData.people) {
                        if (newItemPerson.roleName && typeof newItemPerson.roleName !== "string") {
                            resultItemData.itemPeople.push(newItemPerson.roleName);
                        } else if (newItemPerson.id && typeof newItemPerson.id !== "string") {
                            resultItemData.itemPeople.push(newItemPerson.id);
                        } else if (newItemPerson.priority && typeof newItemPerson.priority !== "number") {
                            resultItemData.itemPeople.push(newItemPerson.priority);
                        } else if (newItemPerson.name && typeof newItemPerson.name !== "string") {
                            resultItemData.itemPeople.push(newItemPerson.name);
                        } else if (newItemPerson.affiliation && typeof newItemPerson.affiliation !== "string") {
                            resultItemData.itemPeople.push(newItemPerson.affiliation);
                        } else if (newItemPerson.email && typeof newItemPerson.email !== "string") {
                            resultItemData.itemPeople.push(newItemPerson.email);
                        } else {
                            let added = false;
                            if (oldItemData) {
                                for (const oldItemPerson of oldItemData.itemPeople) {
                                    if (!newItemPerson.roleName || oldItemPerson.roleName === newItemPerson.roleName) {
                                        if (newItemPerson.id === oldItemPerson.personId) {
                                            added = true;
                                            break;
                                        } else if (!newItemPerson.id) {
                                            const oldPersonData = result.people.get(oldItemPerson.personId);
                                            if (oldPersonData && !("error" in oldPersonData)) {
                                                if (
                                                    oldPersonData.name &&
                                                    typeof oldPersonData.name === "string" &&
                                                    newItemPerson.name === oldPersonData.name &&
                                                    ((newItemPerson.affiliation &&
                                                        oldPersonData.affiliation &&
                                                        typeof oldPersonData.affiliation === "string" &&
                                                        newItemPerson.affiliation === oldPersonData.affiliation) ||
                                                        (!newItemPerson.affiliation &&
                                                            oldPersonData.affiliation &&
                                                            typeof oldPersonData.affiliation === "string" &&
                                                            oldPersonData.affiliation === ""))
                                                ) {
                                                    added = true;
                                                    break;
                                                } else if (
                                                    oldPersonData.email &&
                                                    typeof oldPersonData.email === "string" &&
                                                    newItemPerson.email === oldPersonData.email
                                                ) {
                                                    added = true;
                                                    break;
                                                }
                                            }
                                        }
                                    }
                                }
                            }

                            if (!added) {
                                const _person: ErrorInfo | Updates<ImportContent_ProgramPersonFragment> | undefined =
                                    newItemPerson.id ? result.people.get(newItemPerson.id) : undefined;
                                let person: Updates<ImportContent_ProgramPersonFragment> | undefined;
                                if (_person && !("error" in _person)) {
                                    person = _person;
                                }
                                if (!person) {
                                    if (newItemPerson.name) {
                                        for (const possiblePerson of result.people.values()) {
                                            if (!("error" in possiblePerson) && possiblePerson.name) {
                                                if (
                                                    newItemPerson.name === possiblePerson.name &&
                                                    ((!newItemPerson.affiliation &&
                                                        possiblePerson.affiliation === "") ||
                                                        (newItemPerson.affiliation &&
                                                            possiblePerson.affiliation === newItemPerson.affiliation))
                                                ) {
                                                    person = possiblePerson;
                                                    break;
                                                }
                                            }
                                        }
                                    }
                                }
                                if (!person) {
                                    if (newItemPerson.email) {
                                        for (const possiblePerson of result.people.values()) {
                                            if (!("error" in possiblePerson) && possiblePerson.email) {
                                                if (
                                                    newItemPerson.email === possiblePerson.email &&
                                                    ((!newItemPerson.affiliation &&
                                                        possiblePerson.affiliation === "") ||
                                                        (newItemPerson.affiliation &&
                                                            possiblePerson.affiliation === newItemPerson.affiliation))
                                                ) {
                                                    person = possiblePerson;
                                                    break;
                                                }
                                            }
                                        }
                                    }
                                }

                                if (!person) {
                                    person = {
                                        id: { new: uuidv4() },
                                        affiliation: newItemPerson.affiliation,
                                        email: newItemPerson.email,
                                        name: newItemPerson.name,
                                    };
                                    result.people.set(person.id.new, person);
                                }

                                resultItemData.itemPeople.push({
                                    id: { new: uuidv4() },
                                    personId: person.id,
                                    priority: newItemPerson.priority,
                                    roleName: newItemPerson.roleName,
                                });
                            }
                        }
                    }
                }
            }

            if (newItemData.elements) {
                if ("error" in newItemData.elements) {
                    resultItemData.elements = newItemData.elements;
                } else if (!resultItemData.elements || !("error" in resultItemData.elements)) {
                    resultItemData.elements = resultItemData.elements ?? [];

                    for (const newElement of newItemData.elements) {
                        if (newElement.id && typeof newElement.id !== "string") {
                            resultItemData.elements.push(newElement.id);
                        } else if (newElement.hidden !== undefined && typeof newElement.hidden !== "boolean") {
                            resultItemData.elements.push(newElement.hidden);
                        } else if (newElement.latestVersion !== undefined && "error" in newElement.latestVersion) {
                            resultItemData.elements.push(newElement.latestVersion);
                        } else if (newElement.layout !== undefined && "error" in newElement.layout) {
                            resultItemData.elements.push(newElement.layout);
                        } else if (newElement.name !== undefined && typeof newElement.name !== "string") {
                            resultItemData.elements.push(newElement.name);
                        } else if (newElement.typeName !== undefined && typeof newElement.typeName !== "string") {
                            resultItemData.elements.push(newElement.typeName);
                        } else if (newElement.uploaders !== undefined && "error" in newElement.uploaders) {
                            resultItemData.elements.push(newElement.uploaders);
                        } else if (
                            newElement.uploadsRemaining !== undefined &&
                            typeof newElement.uploadsRemaining !== "number"
                        ) {
                            resultItemData.elements.push(newElement.uploadsRemaining);
                        } else if (!newElement.typeName) {
                            resultItemData.elements.push({
                                error: "No element type provided!",
                                rawValue: JSON.stringify(newElement),
                            });
                        } else {
                            let added = false;

                            for (const oldElement of resultItemData.elements) {
                                if (!("error" in oldElement)) {
                                    if (
                                        (oldElement.id && newElement.id && oldElement.id === newElement.id) ||
                                        (oldElement.name && newElement.name && oldElement.name === newElement.name)
                                    ) {
                                        added = true;
                                        if (newElement.name) {
                                            if (!oldElement.name || typeof oldElement.name === "string") {
                                                oldElement.name = createUpdate(oldElement.name, newElement.name);
                                            }
                                        }
                                        if (newElement.typeName) {
                                            if (!oldElement.typeName || typeof oldElement.typeName === "string") {
                                                oldElement.typeName = createUpdate(
                                                    oldElement.typeName,
                                                    newElement.typeName
                                                );
                                            }
                                        }
                                        if (newElement.hidden !== undefined) {
                                            if (
                                                oldElement.isHidden === undefined ||
                                                typeof oldElement.isHidden === "boolean"
                                            ) {
                                                oldElement.isHidden = createUpdate(
                                                    oldElement.isHidden,
                                                    newElement.hidden
                                                );
                                            }
                                        }
                                        if (newElement.uploadsRemaining !== undefined) {
                                            if (
                                                oldElement.uploadsRemaining === undefined ||
                                                typeof oldElement.uploadsRemaining === "number"
                                            ) {
                                                oldElement.uploadsRemaining = createUpdate(
                                                    oldElement.uploadsRemaining,
                                                    newElement.uploadsRemaining
                                                );
                                            }
                                        }
                                        if (newElement.layout) {
                                            if (!oldElement.layoutData || !("error" in oldElement.layoutData)) {
                                                oldElement.layoutData = createUpdate(
                                                    oldElement.layoutData,
                                                    newElement.layout
                                                );
                                            }
                                        }
                                        if (newElement.latestVersion) {
                                            if (!oldElement.data || !("error" in oldElement.data)) {
                                                oldElement.data = createUpdate(
                                                    oldElement.data,
                                                    "error" in newElement.latestVersion
                                                        ? newElement.latestVersion
                                                        : [
                                                              convertElementData(
                                                                  newElement.typeName,
                                                                  newElement.latestVersion
                                                              ),
                                                          ]
                                                );
                                            }
                                        }
                                        if (newElement.uploaders) {
                                            oldElement.uploaders = oldElement.uploaders ?? [];
                                            if (!("error" in oldElement.uploaders)) {
                                                for (const newUploader of newElement.uploaders) {
                                                    if (!newUploader.name) {
                                                        oldElement.uploaders.push({
                                                            error: "No name provided for uploader",
                                                            rawValue: JSON.stringify(newUploader),
                                                        });
                                                    } else if (typeof newUploader.name !== "string") {
                                                        oldElement.uploaders.push(newUploader.name);
                                                    } else if (!newUploader.email) {
                                                        oldElement.uploaders.push({
                                                            error: "No email provided for uploader",
                                                            rawValue: JSON.stringify(newUploader),
                                                        });
                                                    } else if (typeof newUploader.email !== "string") {
                                                        oldElement.uploaders.push(newUploader.email);
                                                    } else {
                                                        let added = false;

                                                        for (const oldUploader of oldElement.uploaders) {
                                                            if (!("error" in oldUploader)) {
                                                                if (
                                                                    oldUploader.email &&
                                                                    oldUploader.email === newUploader.email
                                                                ) {
                                                                    added = true;
                                                                    if (
                                                                        !oldUploader.name ||
                                                                        typeof oldUploader.name === "string"
                                                                    ) {
                                                                        oldUploader.name = createUpdate(
                                                                            oldUploader.name,
                                                                            newUploader.name
                                                                        );
                                                                    }
                                                                    break;
                                                                } else if (
                                                                    oldUploader.name &&
                                                                    oldUploader.name === newUploader.name
                                                                ) {
                                                                    added = true;
                                                                    if (
                                                                        !oldUploader.email ||
                                                                        typeof oldUploader.email === "string"
                                                                    ) {
                                                                        oldUploader.email = createUpdate(
                                                                            oldUploader.email,
                                                                            newUploader.email
                                                                        );
                                                                    }
                                                                    break;
                                                                }
                                                            }
                                                        }

                                                        if (!added) {
                                                            oldElement.uploaders.push({
                                                                id: { new: uuidv4() },
                                                                name: newUploader.name,
                                                                email: newUploader.email,
                                                            });
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                        break;
                                    }
                                }
                            }

                            if (!added) {
                                const newElementInnerData: ElementDataBlob | ErrorInfo = newElement.latestVersion
                                    ? newElement.latestVersion.data
                                        ? "error" in newElement.latestVersion.data
                                            ? newElement.latestVersion.data
                                            : [convertElementData(newElement.typeName, newElement.latestVersion)]
                                        : []
                                    : [];

                                resultItemData.elements.push({
                                    id: {
                                        new: newElement.id ?? uuidv4(),
                                    },
                                    name: newElement.name,
                                    typeName: newElement.typeName,
                                    isHidden: newElement.hidden,
                                    uploadsRemaining: newElement.uploadsRemaining,
                                    uploaders:
                                        newElement.uploaders?.map((uploader) => ({
                                            id: { new: uuidv4() },
                                            name: uploader.name,
                                            email: uploader.email,
                                        })) ?? [],

                                    data: newElementInnerData,
                                });
                            }
                        }
                    }
                }
            }
        }

        if (resultItemData) {
            result.items.set(
                resultItemData &&
                    !("error" in resultItemData) &&
                    resultItemData.id &&
                    typeof resultItemData.id === "string"
                    ? resultItemData.id
                    : uuidv4(),
                resultItemData
            );
        }
    }

    return result;
}
