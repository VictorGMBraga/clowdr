import {
    chakra,
    Code,
    Container,
    Flex,
    Heading,
    HStack,
    ListItem,
    Text,
    UnorderedList,
    VStack,
} from "@chakra-ui/react";
import React from "react";
import { Permissions_Permission_Enum } from "../../../../../../generated/graphql";
import PageNotFound from "../../../../../Errors/PageNotFound";
import { useTitle } from "../../../../../Utils/useTitle";
import RequireAtLeastOnePermissionWrapper from "../../../../RequireAtLeastOnePermissionWrapper";
import { useConference } from "../../../../useConference";

export default function ImportContent(): JSX.Element {
    const conference = useConference();
    const title = useTitle(`Import content for ${conference.shortName}`);

    return (
        <RequireAtLeastOnePermissionWrapper
            permissions={[Permissions_Permission_Enum.ConferenceManageContent]}
            componentIfDenied={<PageNotFound />}
        >
            {title}
            <Heading as="h1" fontSize="2.3rem" lineHeight="3rem" mt={4}>
                Import Content for {conference.shortName}
            </Heading>
            <HStack>
                <VStack>
                    <Container maxW="container.md">
                        <Text>
                            To obtain a template for your import, create a few sample pieces of content in Midspace.
                            Export the sample data and use the resulting CSV file as a template for your data import.
                        </Text>
                    </Container>
                    <Container maxW="container.md">
                        <Text mb={2}>
                            When filling out your import template, you should fill the following columns (and ignore any
                            others):
                        </Text>
                        <UnorderedList spacing={4} mt={4}>
                            <ListItem>
                                <VStack spacing={1} alignItems="flex-start">
                                    <Flex w="100%">
                                        <Code fontWeight="bold">Externally Sourced Data Id</Code>
                                        <chakra.span ml="auto">(optional)</chakra.span>
                                    </Flex>
                                    <Text>
                                        If you are importing data from another system, fill this column with the unique
                                        identifier of the content as specified in the other system. This will enable
                                        easy linking of people and events to your content.
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
                    </Container>
                </VStack>
            </HStack>
        </RequireAtLeastOnePermissionWrapper>
    );
}
