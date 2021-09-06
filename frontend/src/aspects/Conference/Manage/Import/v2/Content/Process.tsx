import { Heading, VStack } from "@chakra-ui/react";
import React, { useEffect, useMemo, useState } from "react";
import { useImportContent_SelectAllQuery } from "../../../../../../generated/graphql";
import type { ParsedData } from "../../../../../Files/useCSVJSONXMLParser";
import { useConference } from "../../../../useConference";
import { parseItem } from "./Parsers";
import type { Content_ImportStructure } from "./Types";
import { computeUpdates, Content_DbData, Content_UpdatesDbData } from "./Updates";

function isNotErrorData(x: any): x is Content_ImportStructure {
    if ("error" in x) {
        return false;
    } else {
        return true;
    }
}

export default function Process({ data: files }: { data: ParsedData<any[]>[] | undefined }): JSX.Element {
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

            console.log("Updated data", newUpdates);
        }
    }, [oldDataResponse.data, parsedData]);

    return (
        <VStack alignItems="flex-start" spacing={6} w="100%">
            <Heading as="h2" fontSize="xl" textAlign="left">
                Step 2: Review the changes before saving
            </Heading>
        </VStack>
    );
}
