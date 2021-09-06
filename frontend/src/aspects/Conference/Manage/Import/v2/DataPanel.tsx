import { Heading, HStack, Text, VStack } from "@chakra-ui/react";
import React, { useEffect } from "react";
import useCSVJSONXMLFileSelector from "../../../../Files/useCSVJSONXMLFileSelector";
import useCSVJSONXMLImportOptions from "../../../../Files/useCSVJSONXMLImportOptions";
import useCSVJSONXMLParse, { ParsedData, ParserResult } from "../../../../Files/useCSVJSONXMLParser";

function parser(data: any): ParserResult<any[]> {
    // Researchr XML
    if (data.subevent) {
        data = data.subevent;
    }

    return {
        ok: true,
        data,
    };
}

export default function DataPanel({
    onData,
}: {
    onData?: (data: ParsedData<any[]>[] | undefined) => void;
}): JSX.Element {
    const { acceptedFiles, component: fileImporterEl } = useCSVJSONXMLFileSelector();
    const { importOptions, replaceImportOptions, openOptionsButton, optionsComponent } =
        useCSVJSONXMLImportOptions(acceptedFiles);
    const { data } = useCSVJSONXMLParse(importOptions, parser);

    useEffect(() => {
        let newOptionsChanged = false;

        if (data) {
            const newOptions = importOptions.map((x) => ({ ...x }));
            for (const aData of data) {
                if ("error" in aData) {
                    // Excel saves CSVs as ANSI encoded by default,
                    // so we accomodate this common exception case automatically
                    if (aData.error === "TextDecoder.decode: Decoding failed.") {
                        const options = newOptions.find((x) => x.file.name === aData.fileName);
                        if (options?.encoding === "utf-8" || options?.encoding === "utf8") {
                            options.encoding = "ansi_x3.4-1968";
                            newOptionsChanged = true;
                        }
                    }
                }
            }

            if (newOptionsChanged) {
                replaceImportOptions(newOptions);
            }
        }

        if (!newOptionsChanged) {
            onData?.(data);
        }
    }, [data, importOptions, onData, replaceImportOptions]);

    return (
        <VStack alignItems="flex-start" spacing={6} w="100%">
            <Heading as="h2" fontSize="xl" textAlign="left">
                Step 1: Select your files
            </Heading>
            <HStack w="100%" alignItems="flex-start" spacing={4}>
                {fileImporterEl}
                <VStack alignItems="flex-start" maxW="20em">
                    <Heading as="h3" fontSize="md" textAlign="left" alignSelf="flex-start">
                        File Options
                    </Heading>
                    <Text>Use the importer options to configure our file reader to interpret your files.</Text>
                    <Text>
                        For example, for CSV files you may need to change the separator from a comma to a semi-colon.
                    </Text>
                    {openOptionsButton}
                </VStack>
            </HStack>
            {optionsComponent}
        </VStack>
    );
}
