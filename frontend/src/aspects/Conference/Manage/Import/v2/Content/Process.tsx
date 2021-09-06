import { Heading, VStack } from "@chakra-ui/react";
import React, { useEffect, useMemo } from "react";
import type { ParsedData } from "../../../../../Files/useCSVJSONXMLParser";
import { parseItem } from "./Parsers";
import type { Content_ImportStructure } from "./Types";

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

    useEffect(() => {
        console.log("Parsed data", parsedData);
    }, [parsedData]);

    return (
        <VStack alignItems="flex-start" spacing={6} w="100%">
            <Heading as="h2" fontSize="xl" textAlign="left">
                Step 2: Review the changes before saving
            </Heading>
        </VStack>
    );
}
