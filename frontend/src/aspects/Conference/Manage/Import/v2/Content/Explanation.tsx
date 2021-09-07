import {
    Accordion,
    AccordionButton,
    AccordionIcon,
    AccordionItem,
    AccordionPanel,
    chakra,
    Code,
    Flex,
    Heading,
    ListItem,
    Text,
    UnorderedList,
    VStack,
} from "@chakra-ui/react";
import React from "react";

export default function Explanation(): JSX.Element {
    return (
        <VStack flex="0 0 30em" maxW="container.sm" spacing={6}>
            <Heading as="h2" fontSize="xl" textAlign="left" alignSelf="flex-start">
                Instructions
            </Heading>
            <Accordion spacing={6} allowMultiple allowToggle w="100%">
                <AccordionItem>
                    <AccordionButton fontSize="md" textAlign="left" fontWeight="bold">
                        <AccordionIcon mr={2} /> Download a template
                    </AccordionButton>
                    <AccordionPanel>
                        <VStack spacing={3}>
                            <Text>
                                To obtain a template for your import, create a few sample pieces of content in Midspace.
                                Export the sample data and use the resulting CSV file as a template for your data
                                import.
                            </Text>
                        </VStack>
                    </AccordionPanel>
                </AccordionItem>
                <AccordionItem>
                    <AccordionButton fontSize="md" textAlign="left" fontWeight="bold">
                        <AccordionIcon mr={2} /> Using your template for your first import
                    </AccordionButton>
                    <AccordionPanel>
                        <VStack spacing={3}>
                            <Text mb={2}>
                                When filling out your import template, you should fill the following columns (and ignore
                                any others):
                            </Text>
                            <UnorderedList spacing={4} pl={4}>
                                <ListItem>
                                    <VStack spacing={1} alignItems="flex-start">
                                        <Flex w="100%">
                                            <Code fontWeight="bold">Externally Sourced Data Id</Code>
                                            <chakra.span ml="auto">(optional)</chakra.span>
                                        </Flex>
                                        <Text>
                                            If you are importing data from another system, fill this column with the
                                            unique identifier of the content as specified in the other system. This will
                                            enable easy linking of people and events to your content.
                                        </Text>
                                    </VStack>
                                </ListItem>
                                <ListItem>
                                    <VStack spacing={1} alignItems="flex-start">
                                        <Flex w="100%">
                                            <Code fontWeight="bold">Title</Code>
                                            <chakra.span ml="auto">(required)</chakra.span>
                                        </Flex>
                                        <Text>TODO</Text>
                                    </VStack>
                                </ListItem>
                                <ListItem>
                                    <VStack spacing={1} alignItems="flex-start">
                                        <Flex w="100%">
                                            <Code fontWeight="bold">Short Title</Code>
                                            <chakra.span ml="auto">(optional)</chakra.span>
                                        </Flex>
                                        <Text>TODO</Text>
                                    </VStack>
                                </ListItem>
                                <ListItem>
                                    <VStack spacing={1} alignItems="flex-start">
                                        <Flex w="100%">
                                            <Code fontWeight="bold">Type</Code>
                                            <chakra.span ml="auto">(required)</chakra.span>
                                        </Flex>
                                        <Text>TODO</Text>
                                    </VStack>
                                </ListItem>
                                <ListItem>
                                    <VStack spacing={1} alignItems="flex-start">
                                        <Flex w="100%">
                                            <Code fontWeight="bold">Tag Names</Code>
                                            <chakra.span ml="auto">(optional)</chakra.span>
                                        </Flex>
                                        <Text>TODO</Text>
                                    </VStack>
                                </ListItem>
                                <ListItem>
                                    <VStack spacing={1} alignItems="flex-start">
                                        <Flex w="100%">
                                            <Code fontWeight="bold">Exhibition Names</Code>
                                            <chakra.span ml="auto">(optional)</chakra.span>
                                        </Flex>
                                        <Text>TODO</Text>
                                    </VStack>
                                </ListItem>
                                <ListItem>
                                    <VStack spacing={1} alignItems="flex-start">
                                        <Flex w="100%">
                                            <Code fontWeight="bold">People</Code>
                                            <chakra.span ml="auto">(optional)</chakra.span>
                                        </Flex>
                                        <Text>TODO</Text>
                                    </VStack>
                                </ListItem>
                                <ListItem>
                                    <VStack spacing={1} alignItems="flex-start">
                                        <Flex w="100%">
                                            <Code fontWeight="bold">Elements</Code>
                                            <chakra.span ml="auto">(optional)</chakra.span>
                                        </Flex>
                                        <Text>TODO</Text>
                                    </VStack>
                                </ListItem>
                            </UnorderedList>
                        </VStack>
                    </AccordionPanel>
                </AccordionItem>
                <AccordionItem>
                    <AccordionButton fontSize="md" textAlign="left" fontWeight="bold">
                        <AccordionIcon mr={2} /> Using your template for updating existing data in Midspace
                    </AccordionButton>
                    <AccordionPanel>
                        <VStack spacing={3}>
                            <Text mb={2}>
                                When filling out your import template for a re-import, you should fill the following
                                columns (and ignore any others):
                            </Text>
                            <Text>TODO</Text>
                        </VStack>
                    </AccordionPanel>
                </AccordionItem>
            </Accordion>
        </VStack>
    );
}
