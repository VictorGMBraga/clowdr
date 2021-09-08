import { Accordion, Heading, VStack } from "@chakra-ui/react";
import React, { useEffect, useMemo, useState } from "react";
import {
    ImportContent_ExhibitionFragment,
    ImportContent_ItemFragment,
    ImportContent_ProgramPersonFragment,
    ImportContent_TagFragment,
    useImportContent_SelectAllQuery,
} from "../../../../../../generated/graphql";
import type { ParsedData } from "../../../../../Files/useCSVJSONXMLParser";
import { useConference } from "../../../../useConference";
import type { RenderableColumns, Updates } from "../Types";
import Updated, { UpdateKey } from "../Updated";
import { parseItem } from "./Parsers";
import type { Content_ImportStructure } from "./Types";
import { computeUpdates, Content_DbData, Content_UpdatesDbData } from "./Updates";

const tagColumnNames: RenderableColumns<Updates<ImportContent_TagFragment>> = {
    id: 0,
    name: 1,
    priority: 2,
    colour: 3,
};
const exhibitionColumnNames: RenderableColumns<Updates<ImportContent_ExhibitionFragment>> = {
    id: 0,
    name: 1,
    priority: 2,
    colour: 3,
    isHidden: 4,
};
const peopleColumnNames: RenderableColumns<Updates<ImportContent_ProgramPersonFragment>> = {
    id: 0,
    name: 2,
    affiliation: 3,
    email: 4,
    registrantId: 5,
};
const itemColumnNames: RenderableColumns<Updates<ImportContent_ItemFragment>> = {
    id: 0,
    title: 1,
    shortTitle: 2,
    typeName: 3,
    chatId: 4,
    rooms: {
        priority: 5,
        columns: {
            id: 0,
            name: 1,
        },
    },
    itemTags: {
        priority: 6,
        columns: {
            id: 0,
            tagId: 1,
        },
    },
    itemExhibitions: {
        priority: 7,
        columns: {
            id: 0,
            exhibitionId: 1,
        },
    },
    itemPeople: {
        priority: 8,
        columns: {
            id: 0,
            personId: 1,
            priority: 2,
            roleName: 3,
        },
    },
    elements: {
        priority: 9,
        columns: {
            id: 0,
            name: 1,
            typeName: 2,
            isHidden: 3,
            data: 4,
            layoutData: 5,
            updatedAt: 6,
            uploadsRemaining: 7,
            uploaders: {
                priority: 8,
                columns: {
                    id: 0,
                    name: 1,
                    email: 2,
                },
            },
        },
    },
};

function isNotErrorData(x: any): x is Content_ImportStructure {
    if ("error" in x) {
        return false;
    } else {
        return true;
    }
}

export default function Process({
    data: files,
    onUpdates,
}: {
    data: ParsedData<any[]>[] | undefined;
    onUpdates: (updates: Content_UpdatesDbData | undefined) => void;
}): JSX.Element {
    const parsedData = useMemo(
        () =>
            files?.flatMap<
                | Content_ImportStructure
                | {
                      fileName: string;
                      error: string;
                  }
            >((file) =>
                "data" in file
                    ? file.fileName.endsWith(".csv")
                        ? file.data.map<Content_ImportStructure>(parseItem)
                        : file.data
                    : [file]
            ),
        [files]
    );

    const conference = useConference();
    const oldDataResponse = useImportContent_SelectAllQuery({
        variables: {
            conferenceId: conference.id,
        },
        fetchPolicy: "no-cache",
    });

    const [updates, setUpdates] = useState<Content_UpdatesDbData | undefined>();
    useEffect(() => {
        const availableParsedData = parsedData?.filter(isNotErrorData);
        if (oldDataResponse.data && availableParsedData && availableParsedData.length) {
            console.log("Parsed data", parsedData);

            const oldData: Content_DbData = {
                items: new Map(oldDataResponse.data.content_Item.map((x) => [x.id, x])),
                exhibitions: new Map(oldDataResponse.data.collection_Exhibition.map((x) => [x.id, x])),
                tags: new Map(oldDataResponse.data.collection_Tag.map((x) => [x.id, x])),
                people: new Map(oldDataResponse.data.collection_ProgramPerson.map((x) => [x.id, x])),
            };
            const newUpdates = computeUpdates(oldData, availableParsedData);
            setUpdates(newUpdates);
            onUpdates(newUpdates);

            console.log("Updated data", newUpdates);
        }
    }, [oldDataResponse.data, parsedData, onUpdates]);

    const tagsTable = useMemo(
        () =>
            Updated({
                updates: updates?.tags ? [...updates.tags.values()] : undefined,
                columns: tagColumnNames,
                tableName: "Tags",
            }).el,
        [updates?.tags]
    );
    const exhibitionsTable = useMemo(
        () =>
            Updated({
                updates: updates?.exhibitions ? [...updates.exhibitions.values()] : undefined,
                columns: exhibitionColumnNames,
                tableName: "Exhibitions",
            }).el,
        [updates?.exhibitions]
    );
    const peopleTable = useMemo(
        () =>
            Updated({
                updates: updates?.people ? [...updates.people.values()] : undefined,
                columns: peopleColumnNames,
                tableName: "People",
            }).el,
        [updates?.people]
    );
    const itemsTable = useMemo(
        () =>
            Updated({
                updates: updates?.items ? [...updates.items.values()] : undefined,
                columns: itemColumnNames,
                tableName: "Items",
            }).el,
        [updates?.items]
    );

    return (
        <VStack alignItems="flex-start" spacing={6} w="100%">
            <Heading as="h2" fontSize="xl" textAlign="left">
                Step 2: Review the changes before saving
            </Heading>
            <UpdateKey />
            <Accordion reduceMotion allowToggle allowMultiple w="100%">
                {tagsTable}
                {exhibitionsTable}
                {peopleTable}
                {itemsTable}
            </Accordion>
            {/*
                TODO: Updated items
                    - TODO: Updated or new tags
                    - TODO: Updated or new exhibitions
                    - TODO: Updated or new people
                    - TODO: Updated or new elements
                        - TODO: Updated or new uploaders
            */}
        </VStack>
    );
}
