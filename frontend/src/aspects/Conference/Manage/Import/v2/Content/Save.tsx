import { gql } from "@apollo/client";
import { Button, Heading, Spinner, VStack } from "@chakra-ui/react";
import React, { useCallback } from "react";
import { Content_Element_Set_Input, useImport_UpdateElementMutation } from "../../../../../../generated/graphql";
import type { DeepWriteable } from "../../../../../CRUDTable2/CRUDTable2";
import type { Content_UpdatesDbData } from "./Updates";

gql`
    mutation Import_UpdateElement($id: uuid!, $set: content_Element_set_input!) {
        update_content_Element_by_pk(pk_columns: { id: $id }, _set: $set) {
            id
        }
    }
`;

export default function Save({ updates }: { updates: Content_UpdatesDbData | undefined }): JSX.Element {
    const [updateElement, updateElementResponse] = useImport_UpdateElementMutation();

    const save = useCallback(async () => {
        // TODO: Catch errors and log and display them

        if (updates) {
            for (const itemUpdate of updates.items.values()) {
                if (!("error" in itemUpdate)) {
                    if (itemUpdate.elements && !("error" in itemUpdate.elements)) {
                        for (const element of itemUpdate.elements) {
                            if (
                                !("error" in element) &&
                                element.id &&
                                (typeof element.id !== "object" || !("error" in element.id))
                            ) {
                                const updateObj: DeepWriteable<Content_Element_Set_Input> = {};
                                let anyUpdated = false;
                                const isNew = typeof element.id === "object" && "new" in element.id;
                                if (element.data && !("error" in element.data)) {
                                    updateObj.data =
                                        "new" in element.data ? element.data.new : isNew ? element.data : undefined;
                                    anyUpdated ||= "new" in element.data;
                                }
                                if (
                                    element.itemId &&
                                    (typeof element.itemId !== "object" || !("error" in element.itemId))
                                ) {
                                    updateObj.itemId =
                                        typeof element.itemId === "object" && "new" in element.itemId
                                            ? element.itemId.new
                                            : isNew
                                            ? element.itemId
                                            : undefined;
                                    anyUpdated ||= typeof element.itemId === "object" && "new" in element.itemId;
                                }
                                if (element.name && (typeof element.name !== "object" || !("error" in element.name))) {
                                    updateObj.name =
                                        typeof element.name === "object" && "new" in element.name
                                            ? element.name.new
                                            : isNew
                                            ? element.name
                                            : undefined;
                                    anyUpdated ||= typeof element.name === "object" && "new" in element.name;
                                }
                                if (
                                    element.typeName &&
                                    (typeof element.typeName !== "object" || !("error" in element.typeName))
                                ) {
                                    updateObj.typeName =
                                        typeof element.typeName === "object" && "new" in element.typeName
                                            ? element.typeName.new
                                            : isNew
                                            ? element.typeName
                                            : undefined;
                                    anyUpdated ||= typeof element.typeName === "object" && "new" in element.typeName;
                                }
                                if (element.layoutData && !("error" in element.layoutData)) {
                                    updateObj.layoutData =
                                        typeof element.name === "object" && "new" in element.layoutData
                                            ? element.layoutData.new
                                            : isNew
                                            ? element.layoutData
                                            : undefined;
                                    anyUpdated ||=
                                        typeof element.layoutData === "object" && "new" in element.layoutData;
                                }
                                if (
                                    element.uploadsRemaining !== undefined &&
                                    element.uploadsRemaining !== null &&
                                    (typeof element.uploadsRemaining !== "object" ||
                                        !("error" in element.uploadsRemaining))
                                ) {
                                    updateObj.uploadsRemaining =
                                        typeof element.uploadsRemaining === "object" &&
                                        "new" in element.uploadsRemaining
                                            ? element.uploadsRemaining.new
                                            : isNew
                                            ? element.uploadsRemaining
                                            : undefined;
                                    anyUpdated ||=
                                        typeof element.uploadsRemaining === "object" &&
                                        "new" in element.uploadsRemaining;
                                }
                                if (
                                    element.isHidden !== undefined &&
                                    element.isHidden !== null &&
                                    (typeof element.isHidden !== "object" || !("error" in element.isHidden))
                                ) {
                                    updateObj.isHidden =
                                        typeof element.isHidden === "object" && "new" in element.isHidden
                                            ? element.isHidden.new
                                            : isNew
                                            ? element.isHidden
                                            : undefined;
                                    anyUpdated ||= typeof element.isHidden === "object" && "new" in element.isHidden;
                                }

                                // TODO: If isNew, insert

                                if (anyUpdated && !isNew) {
                                    await updateElement({
                                        variables: {
                                            id:
                                                typeof element.id !== "string" && "new" in element.id
                                                    ? element.id.new
                                                    : element.id,
                                            set: updateObj,
                                        },
                                    });
                                }
                            }
                        }
                    }
                }
            }
        }
    }, [updateElement, updates]);

    const isLoading = updateElementResponse.loading;

    return (
        <VStack alignItems="flex-start" spacing={6} w="100%">
            <Heading as="h2" fontSize="xl" textAlign="left">
                Step 3: Save your changes
            </Heading>
            {isLoading ? <Spinner /> : undefined}
            <Button colorScheme="green" onClick={save} isDisabled={!updates} isLoading={isLoading}>
                Save changes
            </Button>
        </VStack>
    );
}
