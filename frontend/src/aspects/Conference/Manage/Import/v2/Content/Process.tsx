import {
    Accordion,
    AccordionButton,
    AccordionIcon,
    AccordionItem,
    AccordionPanel,
    Alert,
    AlertDescription,
    AlertIcon,
    AlertTitle,
    Box,
    chakra,
    Code,
    Heading,
    HStack,
    Table,
    Tag,
    Tbody,
    Td,
    Text,
    Th,
    Thead,
    Tr,
    useColorModeValue,
    VStack,
} from "@chakra-ui/react";
import React, { useEffect, useMemo, useState } from "react";
import { useImportContent_SelectAllQuery } from "../../../../../../generated/graphql";
import type { ParsedData } from "../../../../../Files/useCSVJSONXMLParser";
import FAIcon from "../../../../../Icons/FAIcon";
import { useConference } from "../../../../useConference";
import type { ErrorInfo } from "../Types";
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

const updatedRowBgColour_Light = "purple.200";
const updatedRowBgColour_Dark = "purple.700";

function UpdatedCell<T>({
    update,
    children,
}: {
    update:
        | T
        | {
              old?: T;
              new: T;
          }
        | ErrorInfo
        | undefined;
    children: (value: T) => JSX.Element | string | undefined;
}): JSX.Element {
    const updatedRowBgColour = useColorModeValue(updatedRowBgColour_Light, updatedRowBgColour_Dark);

    const contents = useMemo(() => {
        if (update === undefined) {
            return <>&lt;No value&gt;</>;
        } else if (typeof update === "object") {
            if ("error" in update) {
                return (
                    <Alert>
                        <AlertTitle>
                            <AlertIcon />
                            <Text as="span">Error processing this value</Text>
                        </AlertTitle>
                        <AlertDescription>
                            <Text>{update.error}</Text>
                            <Code>{update.rawValue}</Code>
                        </AlertDescription>
                    </Alert>
                );
            } else if ("new" in update) {
                return (
                    <VStack spacing={1} alignItems="flex-start" justifyContent="flex-start">
                        <Box fontSize="md">{children(update.new)}</Box>
                        {update.old !== undefined ? <Box fontSize="sm">{children(update.old)}</Box> : undefined}
                    </VStack>
                );
            }
        }

        return <Box fontSize="md">{children(update)}</Box>;
    }, [children, update]);

    return (
        <Td
            bgColor={
                update !== undefined && typeof update === "object" && "new" in update && update.old !== undefined
                    ? updatedRowBgColour
                    : undefined
            }
        >
            {contents}
        </Td>
    );
}

const NewRowIcon = () => <FAIcon iconStyle="s" icon="plus" fontSize="xs" mr={1} aria-label="New record" />;
const UpdatedRowIcon = () => <FAIcon iconStyle="s" icon="edit" fontSize="xs" mr={1} aria-label="Updated record" />;
const ErrorRowIcon = () => (
    <FAIcon iconStyle="s" icon="exclamation-triangle" fontSize="xs" mr={1} aria-label="Record encountered an error" />
);

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

    const textBgColor = useColorModeValue("black", "white");
    const errorRowBgColour = useColorModeValue("blue.200", "blue.700");
    const newRowBgColour = useColorModeValue("green.200", "green.700");
    const updatedRowBgColour = useColorModeValue(updatedRowBgColour_Light, updatedRowBgColour_Dark);

    // TODO: Only render these table elements when the relevant section is expanded

    const { tagEls, errorTagsCount, newTagsCount, updatedTagsCount } = useMemo(() => {
        const result: JSX.Element[] = [];
        let newTagsCount = 0;
        let updatedTagsCount = 0;
        let errorTagsCount = 0;
        if (updates) {
            for (const x of updates.tags.values()) {
                if ("error" in x) {
                    errorTagsCount++;
                    result.push(
                        <Tr key={"Error-" + Math.random()} bgColor={errorRowBgColour}>
                            <Td>
                                <ErrorRowIcon />
                            </Td>
                            <Td colSpan={2}>{x.error}</Td>
                            <Td colSpan={2}>{x.rawValue}</Td>
                        </Tr>
                    );
                } else if (typeof x.id !== "string" && "new" in x.id) {
                    if (x.id.old === undefined) {
                        newTagsCount++;
                    } else {
                        updatedTagsCount++;
                    }
                    result.push(
                        <Tr key={x.id.new} bgColor={newRowBgColour}>
                            <Td>{x.id.old === undefined ? <NewRowIcon /> : <UpdatedRowIcon />}</Td>
                            <UpdatedCell update={x.id}>{(id) => <Code>{id}</Code>}</UpdatedCell>
                            <UpdatedCell update={x.name}>{(name) => name}</UpdatedCell>
                            <UpdatedCell update={x.priority}>{(priority) => <>{priority}</>}</UpdatedCell>
                            <UpdatedCell update={x.colour}>{(colour) => colour}</UpdatedCell>
                        </Tr>
                    );
                }
            }
        }
        return { tagEls: result, newTagsCount, updatedTagsCount, errorTagsCount };
    }, [errorRowBgColour, newRowBgColour, updates]);

    const { exhibitionEls, errorExhibitionsCount, newExhibitionsCount, updatedExhibitionsCount } = useMemo(() => {
        const result: JSX.Element[] = [];
        let newExhibitionsCount = 0;
        let updatedExhibitionsCount = 0;
        let errorExhibitionsCount = 0;
        if (updates) {
            for (const x of updates.exhibitions.values()) {
                if ("error" in x) {
                    errorExhibitionsCount++;
                    result.push(
                        <Tr key={"Error-" + Math.random()} bgColor={errorRowBgColour}>
                            <Td>
                                <ErrorRowIcon />
                            </Td>
                            <Td colSpan={2}>{x.error}</Td>
                            <Td colSpan={3}>{x.rawValue}</Td>
                        </Tr>
                    );
                } else if (typeof x.id !== "string" && "new" in x.id) {
                    if (x.id.old === undefined) {
                        newExhibitionsCount++;
                    } else {
                        updatedExhibitionsCount++;
                    }
                    result.push(
                        <Tr key={x.id.new} bgColor={newRowBgColour}>
                            <Td>{x.id.old === undefined ? <NewRowIcon /> : <UpdatedRowIcon />}</Td>
                            <UpdatedCell update={x.id}>{(id) => <Code>{id}</Code>}</UpdatedCell>
                            <UpdatedCell update={x.name}>{(name) => name}</UpdatedCell>
                            <UpdatedCell update={x.priority}>{(priority) => <>{priority}</>}</UpdatedCell>
                            <UpdatedCell update={x.colour}>{(colour) => colour}</UpdatedCell>
                            <UpdatedCell update={x.isHidden}>{(isHidden) => (isHidden ? "Yes" : "No")}</UpdatedCell>
                        </Tr>
                    );
                }
            }
        }
        return { exhibitionEls: result, newExhibitionsCount, updatedExhibitionsCount, errorExhibitionsCount };
    }, [errorRowBgColour, newRowBgColour, updates]);

    const { personEls, errorPersonsCount, newPersonsCount, updatedPersonsCount } = useMemo(() => {
        const result: JSX.Element[] = [];
        let newPersonsCount = 0;
        let updatedPersonsCount = 0;
        let errorPersonsCount = 0;
        if (updates) {
            for (const x of updates.people.values()) {
                if ("error" in x) {
                    errorPersonsCount++;
                    result.push(
                        <Tr key={"Error-" + Math.random()} bgColor={errorRowBgColour}>
                            <Td>
                                <ErrorRowIcon />
                            </Td>
                            <Td colSpan={2}>{x.error}</Td>
                            <Td colSpan={3}>{x.rawValue}</Td>
                        </Tr>
                    );
                } else if (typeof x.id !== "string" && "new" in x.id) {
                    if (x.id.old === undefined) {
                        newPersonsCount++;
                    } else {
                        updatedPersonsCount++;
                    }
                    result.push(
                        <Tr key={x.id.new} bgColor={newRowBgColour}>
                            <Td>{x.id.old === undefined ? <NewRowIcon /> : <UpdatedRowIcon />}</Td>
                            <UpdatedCell update={x.id}>{(id) => <Code>{id}</Code>}</UpdatedCell>
                            <UpdatedCell update={x.name}>{(name) => name}</UpdatedCell>
                            <UpdatedCell update={x.affiliation}>{(affiliation) => affiliation ?? ""}</UpdatedCell>
                            <UpdatedCell update={x.email}>{(email) => email ?? ""}</UpdatedCell>
                            <UpdatedCell update={x.registrantId}>{(registrantId) => registrantId ?? ""}</UpdatedCell>
                        </Tr>
                    );
                }
            }
        }
        return { personEls: result, newPersonsCount, updatedPersonsCount, errorPersonsCount };
    }, [errorRowBgColour, newRowBgColour, updates]);

    const { itemEls, errorItemsCount, newItemsCount, updatedItemsCount } = useMemo(() => {
        const result: JSX.Element[] = [];
        let newItemsCount = 0;
        let updatedItemsCount = 0;
        let errorItemsCount = 0;
        if (updates) {
            for (const x of updates.items.values()) {
                if ("error" in x) {
                    errorItemsCount++;
                    result.push(
                        <Tr key={"Error-" + Math.random()} bgColor={errorRowBgColour}>
                            <Td>
                                <ErrorRowIcon />
                            </Td>
                            <Td colSpan={2}>{x.error}</Td>
                            <Td colSpan={3}>{x.rawValue}</Td>
                        </Tr>
                    );
                } else if (typeof x.id !== "string" && "new" in x.id) {
                    if (x.id.old === undefined) {
                        newItemsCount++;
                    } else {
                        updatedItemsCount++;
                    }
                    result.push(
                        <Tr key={x.id.new} bgColor={newRowBgColour}>
                            <Td>{x.id.old === undefined ? <NewRowIcon /> : <UpdatedRowIcon />}</Td>
                            <UpdatedCell update={x.id}>{(id) => <Code>{id}</Code>}</UpdatedCell>
                            <UpdatedCell update={x.title}>{(title) => title}</UpdatedCell>
                            <UpdatedCell update={x.shortTitle}>{(shortTitle) => shortTitle ?? ""}</UpdatedCell>
                            <UpdatedCell update={x.typeName}>{(typeName) => typeName}</UpdatedCell>
                            <UpdatedCell update={x.chatId}>{(chatId) => chatId ?? ""}</UpdatedCell>
                            {/*
                                originatingData {
                                    id
                                    sourceId
                                }
                                itemTags
                                itemExhibitions
                                rooms
                                itemPeople
                                elements
                            */}
                        </Tr>
                    );
                }
            }
        }
        return { itemEls: result, newItemsCount, updatedItemsCount, errorItemsCount };
    }, [errorRowBgColour, newRowBgColour, updates]);

    return (
        <VStack alignItems="flex-start" spacing={6} w="100%">
            <Heading as="h2" fontSize="xl" textAlign="left">
                Step 2: Review the changes before saving
            </Heading>
            <HStack spacing={4}>
                <Text>Key</Text>
                <Tag size="md" variant="solid" bgColor={newRowBgColour} color={textBgColor}>
                    <NewRowIcon />
                    New
                </Tag>
                <Tag size="md" variant="solid" bgColor={updatedRowBgColour} color={textBgColor}>
                    <UpdatedRowIcon />
                    Updated
                </Tag>
                <Tag size="md" variant="solid" bgColor={errorRowBgColour} color={textBgColor}>
                    <ErrorRowIcon />
                    Error
                </Tag>
            </HStack>
            <Accordion reduceMotion allowToggle allowMultiple w="100%">
                <AccordionItem w="100%">
                    <AccordionButton>
                        <AccordionIcon mr={2} />
                        <chakra.span mr={2}>Tags</chakra.span>
                        <chakra.span ml="auto">
                            ({newTagsCount} new; {updatedTagsCount} updated; {errorTagsCount} unrecognised)
                        </chakra.span>
                    </AccordionButton>
                    <AccordionPanel w="100%" overflow="auto">
                        <Table colorScheme="gray">
                            <Thead>
                                <Tr>
                                    <Th></Th>
                                    <Th>Id</Th>
                                    <Th>Name</Th>
                                    <Th>Priority</Th>
                                    <Th>Colour</Th>
                                </Tr>
                            </Thead>
                            <Tbody>
                                {tagEls && tagEls.length > 0 ? (
                                    tagEls
                                ) : (
                                    <Tr>
                                        <Td colSpan={5}>No records</Td>
                                    </Tr>
                                )}
                            </Tbody>
                        </Table>
                    </AccordionPanel>
                </AccordionItem>
                <AccordionItem w="100%">
                    <AccordionButton>
                        <AccordionIcon mr={2} />
                        <chakra.span mr={2}>Exhibitions</chakra.span>
                        <chakra.span ml="auto">
                            ({newExhibitionsCount} new; {updatedExhibitionsCount} updated; {errorExhibitionsCount}{" "}
                            unrecognised)
                        </chakra.span>
                    </AccordionButton>
                    <AccordionPanel w="100%" overflow="auto">
                        <Table colorScheme="gray">
                            <Thead>
                                <Tr>
                                    <Th></Th>
                                    <Th>Id</Th>
                                    <Th>Name</Th>
                                    <Th>Priority</Th>
                                    <Th>Colour</Th>
                                    <Th>Is Hidden?</Th>
                                </Tr>
                            </Thead>
                            <Tbody>
                                {exhibitionEls && exhibitionEls.length > 0 ? (
                                    exhibitionEls
                                ) : (
                                    <Tr>
                                        <Td colSpan={5}>No records</Td>
                                    </Tr>
                                )}
                            </Tbody>
                        </Table>
                    </AccordionPanel>
                </AccordionItem>
                <AccordionItem w="100%">
                    <AccordionButton>
                        <AccordionIcon mr={2} />
                        <chakra.span mr={2}>People</chakra.span>
                        <chakra.span ml="auto">
                            ({newPersonsCount} new; {updatedPersonsCount} updated; {errorPersonsCount} unrecognised)
                        </chakra.span>
                    </AccordionButton>
                    <AccordionPanel w="100%" overflow="auto">
                        <Table colorScheme="gray">
                            <Thead>
                                <Tr>
                                    <Th></Th>
                                    <Th>Id</Th>
                                    <Th>Name</Th>
                                    <Th>Affiliation</Th>
                                    <Th>Email</Th>
                                    <Th>Registrant Id</Th>
                                </Tr>
                            </Thead>
                            <Tbody>
                                {personEls && personEls.length > 0 ? (
                                    personEls
                                ) : (
                                    <Tr>
                                        <Td colSpan={5}>No records</Td>
                                    </Tr>
                                )}
                            </Tbody>
                        </Table>
                    </AccordionPanel>
                </AccordionItem>
                <AccordionItem w="100%">
                    <AccordionButton>
                        <AccordionIcon mr={2} />
                        <chakra.span mr={2}>Items</chakra.span>
                        <chakra.span ml="auto">
                            ({newItemsCount} new; {updatedItemsCount} updated; {errorItemsCount} unrecognised)
                        </chakra.span>
                    </AccordionButton>
                    <AccordionPanel w="100%" overflow="auto">
                        <Table colorScheme="gray">
                            <Thead>
                                <Tr>
                                    <Th></Th>
                                    <Th>Id</Th>
                                    <Th>Title</Th>
                                    <Th>Short Title</Th>
                                    <Th>Type</Th>
                                    <Th>Chat Id</Th>
                                </Tr>
                            </Thead>
                            <Tbody>
                                {itemEls && itemEls.length > 0 ? (
                                    itemEls
                                ) : (
                                    <Tr>
                                        <Td colSpan={5}>No records</Td>
                                    </Tr>
                                )}
                            </Tbody>
                        </Table>
                    </AccordionPanel>
                </AccordionItem>
            </Accordion>
            {/*
                TODO: New items
                TODO: Updated items
                    - TODO: Updated primitive fields
                    - TODO: Updated or new tags
                    - TODO: Updated or new exhibitions
                    - TODO: Updated or new people
                    - TODO: Updated or new elements
                        - TODO: Updated or new uploaders
            */}
        </VStack>
    );
}
