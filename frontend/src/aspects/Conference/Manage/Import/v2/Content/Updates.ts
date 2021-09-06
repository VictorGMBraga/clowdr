import { gql } from "@apollo/client";
import { v4 as uuidv4 } from "uuid";
import type {
    ImportContent_ExhibitionFragment,
    ImportContent_ItemFragment,
    ImportContent_ProgramPersonFragment,
    ImportContent_TagFragment,
} from "../../../../../../generated/graphql";
import { createUpdate, ErrorInfo, Updates } from "../Types";
import type { Content_ImportStructure } from "./Types";

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

        const resultItemData: Updates<ImportContent_ItemFragment> | undefined | ErrorInfo =
            oldItemData && !("error" in oldItemData) ? { ...oldItemData } : oldItemData;
        if (oldItemData && !("error" in oldItemData) && resultItemData && !("error" in resultItemData)) {
            if (newItemData.title && oldItemData.title !== newItemData.title) {
                resultItemData.title = createUpdate(oldItemData.title, newItemData.title);
            }
            if (newItemData.shortTitle && oldItemData.shortTitle !== newItemData.shortTitle) {
                resultItemData.shortTitle = createUpdate(oldItemData.shortTitle, newItemData.shortTitle);
            }
            if (newItemData.type && oldItemData.typeName !== newItemData.type) {
                resultItemData.typeName = createUpdate(oldItemData.typeName, newItemData.type);
            }
            if (newItemData.chatId && oldItemData.chatId !== newItemData.chatId) {
                resultItemData.chatId = createUpdate(oldItemData.chatId, newItemData.chatId);
            }

            if (!resultItemData.originatingData && newItemData.externallySourcedDataIds) {
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
                    } else {
                        resultItemData.itemTags = resultItemData.itemTags ?? [];
                        const newTagIds: Set<string> = new Set();

                        if (resultItemData.itemTags instanceof Array) {
                            for (const newItemTagId of newItemData.tagIds) {
                                if (!resultItemData.itemTags.some((x) => x.tagId === newItemTagId)) {
                                    newTagIds.add(newItemTagId);
                                }
                            }
                        } else {
                            for (const newItemTagId of newItemData.tagIds) {
                                if (!resultItemData.itemTags.new.some((x) => x.tagId === newItemTagId)) {
                                    newTagIds.add(newItemTagId);
                                }
                            }
                        }

                        if (newTagIds.size > 0) {
                            resultItemData.itemTags = {
                                old:
                                    resultItemData.itemTags instanceof Array
                                        ? resultItemData.itemTags
                                        : resultItemData.itemTags.old,
                                new:
                                    resultItemData.itemTags instanceof Array
                                        ? [...resultItemData.itemTags, ...newTagIds].map((tagId) => ({
                                              id: { new: uuidv4() },
                                              tagId,
                                          }))
                                        : [
                                              ...resultItemData.itemTags.new,
                                              ...[...newTagIds].map((tagId) => ({ id: { new: uuidv4() }, tagId })),
                                          ],
                            };
                        }
                    }
                }
            }

            if (newItemData.tagNames) {
                if (!resultItemData.itemTags || !("error" in resultItemData.itemTags)) {
                    if ("error" in newItemData.tagNames) {
                        resultItemData.itemTags = newItemData.tagNames;
                    } else {
                        resultItemData.itemTags = resultItemData.itemTags ?? [];
                        const newTagIds: Set<string> = new Set();

                        if (resultItemData.itemTags instanceof Array) {
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
                                                if (!resultItemData.itemTags.some((x) => x.tagId === existingTag.id)) {
                                                    newTagIds.add(existingTag.id);
                                                }
                                            } else {
                                                if (
                                                    !resultItemData.itemTags.some((x) => x.tagId === existingTag.id.new)
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
                        } else {
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
                                                    !resultItemData.itemTags.new.some((x) => x.tagId === existingTag.id)
                                                ) {
                                                    newTagIds.add(existingTag.id);
                                                }
                                            } else {
                                                if (
                                                    !resultItemData.itemTags.new.some(
                                                        (x) => x.tagId === existingTag.id.new
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
                        }

                        if (newTagIds.size > 0) {
                            resultItemData.itemTags = {
                                old:
                                    resultItemData.itemTags instanceof Array
                                        ? resultItemData.itemTags
                                        : resultItemData.itemTags.old,
                                new:
                                    resultItemData.itemTags instanceof Array
                                        ? [...resultItemData.itemTags, ...newTagIds].map((tagId) => ({
                                              id: { new: uuidv4() },
                                              tagId,
                                          }))
                                        : [
                                              ...resultItemData.itemTags.new,
                                              ...[...newTagIds].map((tagId) => ({ id: { new: uuidv4() }, tagId })),
                                          ],
                            };
                        }
                    }
                }
            }

            if (newItemData.exhibitionIds) {
                if (!resultItemData.itemExhibitions || !("error" in resultItemData.itemExhibitions)) {
                    if ("error" in newItemData.exhibitionIds) {
                        resultItemData.itemExhibitions = newItemData.exhibitionIds;
                    } else {
                        resultItemData.itemExhibitions = resultItemData.itemExhibitions ?? [];
                        const newExhibitionIds: { priority: number; id: string }[] = [];

                        if (resultItemData.itemExhibitions instanceof Array) {
                            for (const newItemExhibitionId of newItemData.exhibitionIds) {
                                if (
                                    !resultItemData.itemExhibitions.some(
                                        (x) => x.exhibitionId === newItemExhibitionId.id
                                    )
                                ) {
                                    newExhibitionIds.push(newItemExhibitionId);
                                }
                            }
                        } else {
                            for (const newItemExhibitionId of newItemData.exhibitionIds) {
                                if (
                                    !resultItemData.itemExhibitions.new.some(
                                        (x) => x.exhibitionId === newItemExhibitionId.id
                                    )
                                ) {
                                    newExhibitionIds.push(newItemExhibitionId);
                                }
                            }
                        }

                        if (newExhibitionIds.length > 0) {
                            resultItemData.itemExhibitions = {
                                old:
                                    resultItemData.itemExhibitions instanceof Array
                                        ? resultItemData.itemExhibitions
                                        : resultItemData.itemExhibitions.old,
                                new:
                                    resultItemData.itemExhibitions instanceof Array
                                        ? [...resultItemData.itemExhibitions, ...newExhibitionIds].map(
                                              (exhibitionId) => ({
                                                  id: { new: uuidv4() },
                                                  exhibitionId: exhibitionId.id,
                                                  priority: exhibitionId.priority,
                                              })
                                          )
                                        : [
                                              ...resultItemData.itemExhibitions.new,
                                              ...[...newExhibitionIds].map((exhibitionId) => ({
                                                  id: { new: uuidv4() },
                                                  exhibitionId: exhibitionId.id,
                                                  priority: exhibitionId.priority,
                                              })),
                                          ],
                            };
                        }
                    }
                }
            }

            if (newItemData.exhibitionNames) {
                if (!resultItemData.itemExhibitions || !("error" in resultItemData.itemExhibitions)) {
                    if ("error" in newItemData.exhibitionNames) {
                        resultItemData.itemExhibitions = newItemData.exhibitionNames;
                    } else {
                        resultItemData.itemExhibitions = resultItemData.itemExhibitions ?? [];
                        const newExhibitionIds: Set<string> = new Set();

                        if (resultItemData.itemExhibitions instanceof Array) {
                            for (const newItemExhibitionName of newItemData.exhibitionNames) {
                                let added = false;
                                for (const existingExhibition of result.exhibitions.values()) {
                                    if (
                                        !("error" in existingExhibition) &&
                                        existingExhibition.name &&
                                        (typeof existingExhibition.name === "string" ||
                                            !("error" in existingExhibition.name)) &&
                                        existingExhibition.id &&
                                        (typeof existingExhibition.id === "string" ||
                                            !("error" in existingExhibition.id))
                                    ) {
                                        if (
                                            typeof existingExhibition.name === "string"
                                                ? existingExhibition.name === newItemExhibitionName
                                                : existingExhibition.name.new === newItemExhibitionName
                                        ) {
                                            if (typeof existingExhibition.id === "string") {
                                                if (
                                                    !resultItemData.itemExhibitions.some(
                                                        (x) => x.exhibitionId === existingExhibition.id
                                                    )
                                                ) {
                                                    newExhibitionIds.add(existingExhibition.id);
                                                }
                                            } else {
                                                if (
                                                    !resultItemData.itemExhibitions.some(
                                                        (x) => x.exhibitionId === existingExhibition.id.new
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
                        } else {
                            for (const newItemExhibitionName of newItemData.exhibitionNames) {
                                let added = false;
                                for (const existingExhibition of result.exhibitions.values()) {
                                    if (
                                        !("error" in existingExhibition) &&
                                        existingExhibition.name &&
                                        (typeof existingExhibition.name === "string" ||
                                            !("error" in existingExhibition.name)) &&
                                        existingExhibition.id &&
                                        (typeof existingExhibition.id === "string" ||
                                            !("error" in existingExhibition.id))
                                    ) {
                                        if (
                                            typeof existingExhibition.name === "string"
                                                ? existingExhibition.name === newItemExhibitionName
                                                : existingExhibition.name.new === newItemExhibitionName
                                        ) {
                                            if (typeof existingExhibition.id === "string") {
                                                if (
                                                    !resultItemData.itemExhibitions.new.some(
                                                        (x) => x.exhibitionId === existingExhibition.id
                                                    )
                                                ) {
                                                    newExhibitionIds.add(existingExhibition.id);
                                                }
                                            } else {
                                                if (
                                                    !resultItemData.itemExhibitions.new.some(
                                                        (x) => x.exhibitionId === existingExhibition.id.new
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
                        }

                        if (newExhibitionIds.size > 0) {
                            resultItemData.itemExhibitions = {
                                old:
                                    resultItemData.itemExhibitions instanceof Array
                                        ? resultItemData.itemExhibitions
                                        : resultItemData.itemExhibitions.old,
                                new:
                                    resultItemData.itemExhibitions instanceof Array
                                        ? [...resultItemData.itemExhibitions, ...newExhibitionIds].map(
                                              (exhibitionId) => ({
                                                  id: { new: uuidv4() },
                                                  exhibitionId,
                                              })
                                          )
                                        : [
                                              ...resultItemData.itemExhibitions.new,
                                              ...[...newExhibitionIds].map((exhibitionId) => ({
                                                  id: { new: uuidv4() },
                                                  exhibitionId,
                                              })),
                                          ],
                            };
                        }
                    }
                }
            }

            // TODO:
            // itemPeople

            // TODO:
            // elements
        }

        if (resultItemData) {
            result.items.set(
                resultItemData && !("error" in resultItemData) ? resultItemData.id : uuidv4(),
                resultItemData
            );
        }
    }

    return result;
}
