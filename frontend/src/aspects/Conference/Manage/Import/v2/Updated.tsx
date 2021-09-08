import {
    Accordion,
    AccordionButton,
    AccordionIcon,
    AccordionItem,
    AccordionPanel,
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
    VStack,
} from "@chakra-ui/react";
import React, { Fragment } from "react";
import FAIcon from "../../../../Icons/FAIcon";
import type { ErrorInfo, RenderableColumns, Updates } from "./Types";

const newRowBgColour = "green.100";
const updatedRowBgColour = "purple.100";
const errorRowBgColour = "blue.100";

function CellValue({ value }: { value: unknown }): JSX.Element {
    if (typeof value === "undefined") {
        return <></>;
    } else if (typeof value === "string" || typeof value === "symbol") {
        return <>{value}</>;
    } else if (typeof value === "number" || typeof value === "bigint") {
        return <>{value}</>;
    } else if (typeof value === "boolean") {
        return <>{value ? "Yes" : "No"}</>;
    } else {
        return <Code color="black">{JSON.stringify(value)}</Code>;
    }
}

function UpdatedCell<K extends string | number | symbol, T>(
    columnName: K,
    update:
        | Array<Updates<T> | ErrorInfo>
        | T
        | {
              old?: T;
              new: T;
          }
        | ErrorInfo
        | undefined,
    columns?: RenderableColumns<Updates<T>>
): { columnName: K; el: JSX.Element | undefined; errored: boolean; updated: boolean; isArray: boolean } {
    const { isNew, contents, errored, updated } = (() => {
        if (update === undefined || update === null) {
            return { contents: undefined, errored: false, updated: false };
        } else if (update instanceof Array && columns) {
            // If columns is not defined, then this wasn't a nested table
            // but just a JSON (/jsonb) column that happened to contain an array
            const prettyName = [...(columnName as string)].reduce(
                (acc, part) =>
                    acc.length === 0 ? part.toUpperCase() : part.match(/[A-Z]/) ? acc + " " + part : acc + part,
                ""
            );
            const { el, errorCount, updatedCount, newCount } = Updated({
                updates: update,
                columns,
                tableName: prettyName,
            });
            return {
                contents: el,
                errored: errorCount > 0,
                updated: updatedCount > 0 || newCount > 0,
            };
        } else if (typeof update === "object") {
            if ("error" in update) {
                return {
                    contents: (
                        <Box>
                            <Box>
                                <FAIcon iconStyle="s" icon="exclamation-triangle" />
                                <span>Error processing this value</span>
                            </Box>
                            <Box>
                                <p>{update.error}</p>
                                <code>{update.rawValue}</code>
                            </Box>
                        </Box>
                    ),
                    errored: true,
                    updated: false,
                };
            } else if ("new" in update) {
                return {
                    contents: (
                        <VStack spacing={2} alignItems="flex-start" justifyContent="flex-start">
                            {update.old !== undefined ? (
                                <Heading as="h5" fontSize="sm" textAlign="left">
                                    New
                                </Heading>
                            ) : undefined}
                            <Box>
                                <CellValue value={update.new} />
                            </Box>
                            {update.old !== undefined ? (
                                <>
                                    <Heading as="h5" fontSize="sm" textAlign="left">
                                        Old
                                    </Heading>
                                    <Box>
                                        <CellValue value={update.old} />
                                    </Box>
                                </>
                            ) : undefined}
                        </VStack>
                    ),
                    errored: false,
                    updated: true,
                    isNew: !("old" in update),
                };
            }
        }

        return {
            contents: <CellValue value={update} />,
            errored: false,
            updated: false,
        };
    })();

    return {
        columnName,
        el:
            !!update && update instanceof Array ? (
                contents
            ) : (
                <Td
                    key={columnName as string}
                    bgColor={
                        errored ? errorRowBgColour : isNew ? newRowBgColour : updated ? updatedRowBgColour : undefined
                    }
                    color={errored || updated ? "black" : undefined}
                    borderTop="none"
                >
                    {contents}
                </Td>
            ),
        errored,
        updated,
        isArray: !!update && update instanceof Array,
    };
}

const NewRowIcon = () => <FAIcon iconStyle="s" icon="plus" fontSize="xs" mr={1} aria-label="New record" />;
const UpdatedRowIcon = () => <FAIcon iconStyle="s" icon="edit" fontSize="xs" mr={1} aria-label="Updated record" />;
const ErrorRowIcon = () => (
    <FAIcon iconStyle="s" icon="exclamation-triangle" fontSize="xs" mr={1} aria-label="Record encountered an error" />
);

export function UpdateKey(): JSX.Element {
    return (
        <HStack spacing={4}>
            <Text>Key</Text>
            <Tag size="md" variant="solid" bgColor={newRowBgColour} color="black">
                <NewRowIcon />
                New
            </Tag>
            <Tag size="md" variant="solid" bgColor={updatedRowBgColour} color="black">
                <UpdatedRowIcon />
                Updated
            </Tag>
            <Tag size="md" variant="solid" bgColor={errorRowBgColour} color="black">
                <ErrorRowIcon />
                Error
            </Tag>
        </HStack>
    );
}

function getColumnPriority(c: number | { priority: number; columns: any } | undefined): number {
    if (c === undefined) {
        return 0;
    } else if (typeof c === "number") {
        return c;
    } else {
        return c.priority;
    }
}

function getInnerColumns<C>(c: number | { priority: number; columns: C } | undefined): C | undefined {
    if (c) {
        if (typeof c !== "number") {
            return c.columns;
        }
    }
    return undefined;
}

export default function Updated<T extends Record<"id", string>>({
    columns,
    updates,
    tableName,
}: {
    columns: RenderableColumns<Updates<T>>;
    updates: (ErrorInfo | Updates<T>)[] | undefined;
    tableName: string;
}): { el: JSX.Element; errorCount: number; newCount: number; updatedCount: number } {
    const columnNames = Object.keys(columns) as (keyof RenderableColumns<Updates<T>>)[];
    const columnHeaderEls = columnNames
        .sort((x, y) => getColumnPriority(columns[x]) - getColumnPriority(columns[y]))
        .filter((name) => typeof columns[name] === "number")
        .map((columnName) => {
            const prettyName = [...(columnName as string)].reduce(
                (acc, part) =>
                    acc.length === 0 ? part.toUpperCase() : part.match(/[A-Z]/) ? acc + " " + part : acc + part,
                ""
            );
            return <th key={columnName as string}>{prettyName}</th>;
        });
    const { rowEls, errorCount, newCount, updatedCount } = (() => {
        const result: JSX.Element[] = [];
        let errorCount = 0;
        let newCount = 0;
        let updatedCount = 0;

        if (updates) {
            for (const x of updates) {
                if ("error" in x) {
                    errorCount++;
                    result.push(
                        <Tr key={"Error-" + Math.random()} bgColor={errorRowBgColour} color="black">
                            <Td>
                                <ErrorRowIcon />
                            </Td>
                            <Td colSpan={Math.min(2, columnHeaderEls.length)}>{x.error}</Td>
                            <Td colSpan={Math.max(1, columnHeaderEls.length - 2)}>{x.rawValue}</Td>
                        </Tr>
                    );
                } else {
                    const columnEls = columnNames.map((columnName) =>
                        UpdatedCell(columnName, x[columnName], getInnerColumns(columns[columnName]))
                    );
                    columnEls.sort((rowA, rowB) =>
                        rowA.isArray && rowB.isArray
                            ? columnNames.indexOf(rowA.columnName) - columnNames.indexOf(rowB.columnName)
                            : rowA.isArray
                            ? 1
                            : rowB.isArray
                            ? -1
                            : columnNames.indexOf(rowA.columnName) - columnNames.indexOf(rowB.columnName)
                    );
                    const isNew = x.id && typeof x.id !== "string" && "new" in x.id && x.id.old === undefined;
                    const anyUpdates = !isNew && columnEls.some((x) => x.updated);
                    const anyErrors = columnEls.some((x) => x.errored);

                    const ordinaryCells = columnEls.filter((x) => !x.isArray).map((x) => x.el);
                    const arrayCells = columnEls.filter((x) => x.isArray && (x.errored || x.updated)).map((x) => x.el);
                    let icon: JSX.Element | undefined;
                    let bgColour: string | undefined;
                    if (x.id && typeof x.id !== "string" && "new" in x.id && x.id.old === undefined) {
                        icon = <NewRowIcon />;
                        bgColour = newRowBgColour;
                    } else if (anyUpdates) {
                        icon = <UpdatedRowIcon />;
                    } else if (anyErrors) {
                        icon = <ErrorRowIcon />;
                    }

                    if (icon) {
                        result.push(
                            <Fragment
                                key={
                                    (x.id
                                        ? typeof x.id === "string"
                                            ? x.id
                                            : "new" in x.id
                                            ? x.id.new
                                            : undefined
                                        : undefined) ?? "Unknown-" + Math.random()
                                }
                            >
                                <Tr
                                    bgColor={bgColour}
                                    color={bgColour && "black"}
                                    borderBottom={arrayCells.length > 0 ? "none" : undefined}
                                >
                                    <Td>{icon}</Td>
                                    {ordinaryCells}
                                </Tr>
                                {arrayCells.length > 0 ? (
                                    <Tr bgColor={bgColour}>
                                        <Td></Td>
                                        <Td colSpan={columnHeaderEls.length}>
                                            <Accordion reduceMotion allowToggle allowMultiple w="100%">
                                                {arrayCells}
                                            </Accordion>
                                        </Td>
                                    </Tr>
                                ) : undefined}
                            </Fragment>
                        );
                    }

                    if (anyErrors) {
                        errorCount++;
                    } else if (isNew) {
                        newCount++;
                    } else if (anyUpdates) {
                        updatedCount++;
                    }
                }
            }
        }

        return { rowEls: result, errorCount, newCount, updatedCount };
    })();

    return {
        el: (
            <AccordionItem key={tableName} w="100%">
                <AccordionButton
                    bgColor={
                        errorCount > 0
                            ? errorRowBgColour
                            : updatedCount > 0
                            ? updatedRowBgColour
                            : newCount > 0
                            ? newRowBgColour
                            : undefined
                    }
                    color={errorCount > 0 || updatedCount > 0 || newCount > 0 ? "black" : undefined}
                >
                    <AccordionIcon mr={2} />
                    <chakra.span mr={2}>{tableName}</chakra.span>
                    <chakra.span ml="auto">
                        ({newCount} new; {updatedCount} updated; {errorCount} unrecognised)
                    </chakra.span>
                </AccordionButton>
                <AccordionPanel w="100%" overflow="auto">
                    <Table colorScheme="gray">
                        <Thead>
                            <Tr>
                                <Th aria-label="Record status"></Th>
                                {columnHeaderEls}
                            </Tr>
                        </Thead>
                        <Tbody>
                            {rowEls?.length ? (
                                rowEls
                            ) : (
                                <Tr>
                                    <Td colSpan={columnNames.length + 1}>No changes</Td>
                                </Tr>
                            )}
                        </Tbody>
                    </Table>
                </AccordionPanel>
            </AccordionItem>
        ),
        errorCount,
        newCount,
        updatedCount,
    };
}
