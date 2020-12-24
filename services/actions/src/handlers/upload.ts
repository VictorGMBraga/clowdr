import { gql } from "@apollo/client/core";
import {
    AWSJobStatus,
    ContentBaseType,
    ContentBlob,
    ContentItemDataBlob,
    ContentItemVersionData,
    ContentType_Enum,
    VideoContentBlob,
} from "@clowdr-app/shared-types/build/content";
import AmazonS3URI from "amazon-s3-uri";
import assert from "assert";
import { htmlToText } from "html-to-text";
import R from "ramda";
import { is } from "typescript-is";
import { v4 as uuidv4 } from "uuid";
import { S3 } from "../aws/awsClient";
import {
    ContentItemAddNewVersionDocument,
    CreateContentItemDocument,
    Email_Insert_Input,
    GetUploadersDocument,
    InsertEmailsDocument,
    InsertSubmissionRequestEmailsDocument,
    RequiredItemDocument,
    RequiredItemFieldsFragment,
    SelectUploadersAndUserDocument,
    SetRequiredContentItemUploadsRemainingDocument,
    UploaderPartsFragment,
} from "../generated/graphql";
import { apolloClient } from "../graphqlClient";
import { getLatestVersion } from "../lib/contentItem";

gql`
    query RequiredItem($accessToken: String!) {
        RequiredContentItem(where: { accessToken: { _eq: $accessToken } }) {
            ...RequiredItemFields
            conference {
                configurations(where: { key: { _eq: "UPLOAD_CUTOFF_TIMESTAMP" } }) {
                    id
                    value
                }
            }
        }
    }

    fragment RequiredItemFields on RequiredContentItem {
        id
        contentTypeName
        accessToken
        name
        uploadsRemaining
        conference {
            id
            name
        }
        contentItem {
            id
            data
            contentTypeName
        }
        contentGroup {
            id
            title
        }
    }

    mutation CreateContentItem(
        $conferenceId: uuid!
        $contentGroupId: uuid!
        $contentTypeName: ContentType_enum!
        $data: jsonb!
        $isHidden: Boolean!
        $layoutData: jsonb!
        $name: String!
        $requiredContentId: uuid!
    ) {
        insert_ContentItem_one(
            object: {
                conferenceId: $conferenceId
                contentGroupId: $contentGroupId
                contentTypeName: $contentTypeName
                data: $data
                isHidden: $isHidden
                layoutData: $layoutData
                name: $name
                requiredContentId: $requiredContentId
            }
            on_conflict: { constraint: ContentItem_requiredContentId_key, update_columns: data }
        ) {
            id
        }
    }
`;

async function checkS3Url(
    url: string
): Promise<{ result: "success"; url: string } | { result: "error"; message: string }> {
    const { region, bucket, key } = AmazonS3URI(url);
    if (region !== process.env.AWS_REGION) {
        return { result: "error", message: "Invalid S3 URL (region mismatch)" };
    }
    if (bucket !== process.env.AWS_CONTENT_BUCKET_ID) {
        return { result: "error", message: "Invalid S3 URL (bucket mismatch)" };
    }
    if (!key) {
        return { result: "error", message: "Invalid S3 URL (missing key)" };
    }

    try {
        await S3.headObject({
            Bucket: bucket,
            Key: key,
        });
    } catch (e) {
        return {
            result: "error",
            message: "Could not retrieve object from S3",
        };
    }

    return { result: "success", url: `s3://${bucket}/${key}` };
}

async function createBlob(inputData: any, contentTypeName: ContentType_Enum): Promise<ContentBlob | { error: string }> {
    switch (contentTypeName) {
        case ContentType_Enum.Abstract:
        case ContentType_Enum.Text:
            if (!inputData.text) {
                return { error: "No text supplied" };
            }
            return {
                baseType: ContentBaseType.Text,
                type: contentTypeName,
                text: inputData.text,
            };
        case ContentType_Enum.ImageFile:
        case ContentType_Enum.PaperFile:
        case ContentType_Enum.PosterFile: {
            if (!inputData.s3Url) {
                return { error: "No S3 URL supplied" };
            }
            const result = await checkS3Url(inputData.s3Url);
            if (result.result === "error") {
                return { error: result.message };
            }
            return {
                baseType: ContentBaseType.File,
                type: contentTypeName,
                s3Url: result.url,
            };
        }
        case ContentType_Enum.ImageUrl:
        case ContentType_Enum.PaperUrl:
        case ContentType_Enum.PosterUrl:
        case ContentType_Enum.VideoUrl:
            if (!inputData.url) {
                return { error: "No URL supplied" };
            }
            return {
                baseType: ContentBaseType.URL,
                type: contentTypeName,
                url: inputData.url,
            };
        case ContentType_Enum.Link:
        case ContentType_Enum.LinkButton:
        case ContentType_Enum.PaperLink:
        case ContentType_Enum.VideoLink:
            if (!inputData.url || !inputData.text) {
                return { error: "Text or URL not supplied" };
            }
            return {
                baseType: ContentBaseType.Link,
                type: contentTypeName,
                text: inputData.text,
                url: inputData.url,
            };
        case ContentType_Enum.VideoBroadcast:
        case ContentType_Enum.VideoCountdown:
        case ContentType_Enum.VideoFile:
        case ContentType_Enum.VideoFiller:
        case ContentType_Enum.VideoPrepublish:
        case ContentType_Enum.VideoSponsorsFiller:
        case ContentType_Enum.VideoTitles: {
            if (!inputData.s3Url) {
                return { error: "No S3 URL supplied" };
            }
            const result = await checkS3Url(inputData.s3Url);
            if (result.result === "error") {
                return { error: result.message };
            }
            return {
                baseType: ContentBaseType.Video,
                type: contentTypeName,
                s3Url: result.url,
                subtitles: {},
            };
        }
    }
}

interface ItemByToken {
    requiredContentItem: RequiredItemFieldsFragment;
    uploadCutoffTimestamp?: Date;
}

async function getItemByToken(magicToken: string): Promise<ItemByToken | { error: string }> {
    if (!magicToken) {
        return {
            error: "Access token not provided.",
        };
    }

    const response = await apolloClient.query({
        query: RequiredItemDocument,
        variables: {
            accessToken: magicToken,
        },
    });

    if (response.data.RequiredContentItem.length !== 1) {
        return {
            error: "Could not find a required item that matched the request.",
        };
    }

    const requiredContentItem = response.data.RequiredContentItem[0];

    const result: ItemByToken = { requiredContentItem };

    if (requiredContentItem.conference.configurations.length === 1) {
        // UPLOAD_CUTOFF_TIMESTAMP is specified in epoch milliseconds
        result.uploadCutoffTimestamp = new Date(parseInt(requiredContentItem.conference.configurations[0].value));
    }

    return result;
}

gql`
    query GetUploaders($requiredContentItemId: uuid!) {
        Uploader(where: { requiredContentItem: { id: { _eq: $requiredContentItemId } } }) {
            name
            id
            email
        }
    }
`;

async function sendSubmittedEmail(
    requiredContentItemId: string,
    requiredContentItemName: string,
    contentGroupTitle: string,
    conferenceName: string
) {
    const uploaders = await apolloClient.query({
        query: GetUploadersDocument,
        variables: {
            requiredContentItemId,
        },
    });

    const emails: Email_Insert_Input[] = uploaders.data.Uploader.map((uploader) => {
        const htmlContents = `<p>Dear ${uploader.name},</p>
            <p>A new version of <em>${requiredContentItemName}</em> (${contentGroupTitle}) was uploaded to ${conferenceName}.</p>
            <p>You are receiving this email because you are listed as an uploader for this item.
            This is an automated email sent on behalf of Clowdr CIC. If you believe you have received this
            email in error, please contact us via ${process.env.STOP_EMAILS_CONTACT_EMAIL_ADDRESS}.</p>`;

        return {
            emailAddress: uploader.email,
            reason: "item_submitted",
            subject: `Clowdr: submitted item ${requiredContentItemName} to ${conferenceName}`,
            htmlContents,
            plainTextContents: htmlToText(htmlContents),
        };
    });

    await apolloClient.mutate({
        mutation: InsertEmailsDocument,
        variables: {
            objects: emails,
        },
    });
}

export async function handleContentItemSubmitted(args: submitContentItemArgs): Promise<SubmitContentItemOutput> {
    const itemByToken = await getItemByToken(args.magicToken);
    if ("error" in itemByToken) {
        return {
            success: false,
            message: itemByToken.error,
        };
    }

    const requiredContentItem = itemByToken.requiredContentItem;

    if (requiredContentItem.uploadsRemaining === 0) {
        return {
            success: false,
            message: "No upload attempts remaining",
        };
    }

    if (itemByToken.uploadCutoffTimestamp && itemByToken.uploadCutoffTimestamp < new Date()) {
        return {
            success: false,
            message: "Upload deadline has passed",
        };
    }

    if (requiredContentItem.uploadsRemaining === 0) {
        return {
            success: false,
            message: "No upload attempts remaining",
        };
    }

    const newVersionData = await createBlob(args.data, requiredContentItem.contentTypeName);
    if ("error" in newVersionData) {
        return {
            success: false,
            message: newVersionData.error,
        };
    }

    if (!requiredContentItem.contentItem) {
        try {
            const data: ContentItemDataBlob = [
                {
                    createdAt: Date.now(),
                    createdBy: "user",
                    data: newVersionData,
                },
            ];
            await apolloClient.mutate({
                mutation: CreateContentItemDocument,
                variables: {
                    conferenceId: requiredContentItem.conference.id,
                    contentGroupId: requiredContentItem.contentGroup.id,
                    contentTypeName: requiredContentItem.contentTypeName,
                    data,
                    isHidden: false,
                    layoutData: {},
                    name: requiredContentItem.name,
                    requiredContentId: requiredContentItem.id,
                },
            });

            await sendSubmittedEmail(
                requiredContentItem.id,
                requiredContentItem.name,
                requiredContentItem.contentGroup.title,
                requiredContentItem.conference.name
            );
        } catch (e) {
            console.error("Failed to save new content item", e);
            return {
                success: false,
                message: "Failed to save new item.",
            };
        }
    } else if (requiredContentItem.contentItem.contentTypeName !== requiredContentItem.contentTypeName) {
        return {
            success: false,
            message: "An item of a different type has already been uploaded.",
        };
    } else {
        const latestVersion = await getLatestVersion(requiredContentItem.contentItem.id);

        if (newVersionData.type !== latestVersion?.data.type) {
            return {
                success: false,
                message: "An item of a different type has already been uploaded.",
            };
        } else {
            try {
                const newVersion: ContentItemVersionData = {
                    createdAt: Date.now(),
                    createdBy: "user",
                    data: newVersionData,
                };

                await apolloClient.mutate({
                    mutation: ContentItemAddNewVersionDocument,
                    variables: {
                        id: requiredContentItem.contentItem.id,
                        newVersion,
                    },
                });
                await sendSubmittedEmail(
                    requiredContentItem.id,
                    requiredContentItem.name,
                    requiredContentItem.contentGroup.title,
                    requiredContentItem.conference.name
                );
            } catch (e) {
                console.error("Failed to save new version of content item", e);
                return {
                    success: false,
                    message: "Failed to save new version of content item",
                };
            }
        }
    }

    gql`
        mutation SetRequiredContentItemUploadsRemaining($id: uuid!, $uploadsRemaining: Int!) {
            update_RequiredContentItem_by_pk(pk_columns: { id: $id }, _set: { uploadsRemaining: $uploadsRemaining }) {
                id
            }
        }
    `;

    if (requiredContentItem.uploadsRemaining) {
        apolloClient.mutate({
            mutation: SetRequiredContentItemUploadsRemainingDocument,
            variables: {
                id: requiredContentItem.id,
                uploadsRemaining: R.max(requiredContentItem.uploadsRemaining - 1, 0),
            },
        });
    }

    return {
        success: true,
        message: "",
    };
}

export async function handleUpdateSubtitles(args: updateSubtitlesArgs): Promise<SubmitUpdatedSubtitlesOutput> {
    const itemByToken = await getItemByToken(args.magicToken);
    if ("error" in itemByToken) {
        return {
            success: false,
            message: itemByToken.error,
        };
    }

    const requiredContentItem = itemByToken.requiredContentItem;

    if (!requiredContentItem.contentItem) {
        return {
            message: "No matching content item",
            success: false,
        };
    }

    const latestVersion = await getLatestVersion(requiredContentItem.contentItem.id);

    if (!latestVersion) {
        return {
            message: "No existing content item data",
            success: false,
        };
    }

    const newVersion = R.clone(latestVersion);
    newVersion.createdAt = new Date().getTime();
    newVersion.createdBy = "user";
    assert(is<VideoContentBlob>(newVersion.data), "Content item is not a video");

    const bucket = process.env.AWS_CONTENT_BUCKET_ID;
    const key = `${uuidv4()}.srt`;

    try {
        await S3.putObject({
            Bucket: bucket,
            Key: key,
            Body: args.subtitleText,
        });
    } catch (e) {
        console.error("Failed to upload new subtitles", e);
        return {
            message: "Failed to upload new subtitles",
            success: false,
        };
    }

    if (!newVersion.data.subtitles) {
        newVersion.data.subtitles = {};
    }

    newVersion.data.subtitles["en_US"] = {
        s3Url: `s3://${bucket}/${key}`,
        status: AWSJobStatus.Completed,
    };

    try {
        await apolloClient.mutate({
            mutation: ContentItemAddNewVersionDocument,
            variables: {
                id: requiredContentItem.contentItem.id,
                newVersion,
            },
        });
    } catch (e) {
        console.error("Failed to save new content item version", e);
        return {
            message: "Failed to save new content item version",
            success: false,
        };
    }

    return {
        message: "",
        success: true,
    };
}

gql`
    fragment UploaderParts on Uploader {
        id
        conference {
            id
            name
        }
        email
        emailsSentCount
        name
        requiredContentItem {
            ...RequiredItemFields
        }
    }

    query SelectUploadersAndUser($uploaderIds: [uuid!]!, $userId: String!) {
        Uploader(where: { id: { _in: $uploaderIds } }) {
            ...UploaderParts
        }

        User_by_pk(id: $userId) {
            id
        }
    }

    mutation InsertSubmissionRequestEmails($emails: [Email_insert_input!]!, $uploaderIds: [uuid!]!) {
        insert_Email(objects: $emails) {
            affected_rows
        }
        update_Uploader(where: { id: { _in: $uploaderIds } }, _inc: { emailsSentCount: 1 }) {
            affected_rows
        }
    }
`;

async function getUploadersAndUser(
    uploaderIds: string[],
    userId: string
): Promise<{
    uploaders: UploaderPartsFragment[];
    user: { id: string };
}> {
    const query = await apolloClient.query({
        query: SelectUploadersAndUserDocument,
        variables: {
            uploaderIds,
            userId,
        },
    });
    assert(query.data.Uploader);
    assert(query.data.User_by_pk);
    const uploaders = query.data.Uploader;
    const user = query.data.User_by_pk;
    return {
        uploaders,
        user,
    };
}

function generateEmailContents(uploader: UploaderPartsFragment) {
    const contentTypeFriendlyName = generateContentTypeFriendlyName(uploader.requiredContentItem.contentTypeName);
    const url = `${process.env.FRONTEND_PROTOCOL}://${process.env.FRONTEND_DOMAIN}/upload/${uploader.requiredContentItem.id}/${uploader.requiredContentItem.accessToken}`;

    // TODO: Add info like deadlines, max file sizes, tutorial video link, etc
    const htmlContents = `<p>Dear ${uploader.name},</p>
    <p>
        The organisers of ${uploader.conference.name} are requesting that you or
        your co-authors/co-presenters upload ${contentTypeFriendlyName} for
        "${uploader.requiredContentItem.contentGroup.title}".
    </p>
    <p>
        Please do not forward or share this email: anyone with the link contained
        herein can use it to upload content to your conference item.
    </p>
    <p>
        Please submit your content <a href="${url}">here</a>.
    </p>
    <p>
        You should have already received instructions from your conference
        organisers about the requirements for this content (e.g. maximum length,
        upload deadlines, etc). You should also have received a link to the
        tutorial video explaining how to upload your content.
    </p>
    <p>
        Please note: For video content, you are allowed a maximum of 3 
        uploaded versions per item. Your last submitted version will be the one
        used. Any late submissions may or may not be processed, in accordance
        with the guidance provided by your conference organisers.
    </p>
    <p>We hope you enjoy your conference,<br/>
    The Clowdr team
    </p>
    <p>This is an automated email sent on behalf of Clowdr CIC. If you believe you have
    received this email in error, please contact us via <a href="mailto:${process.env.STOP_EMAILS_CONTACT_EMAIL_ADDRESS}">${process.env.STOP_EMAILS_CONTACT_EMAIL_ADDRESS}</a></p>`;

    const plainTextContents = htmlToText(htmlContents);
    return {
        htmlContents,
        plainTextContents,
    };
}

function generateContentTypeFriendlyName(type: ContentType_Enum) {
    switch (type) {
        case ContentType_Enum.Abstract:
            return "Abstract";
        case ContentType_Enum.ImageFile:
            return "Image file";
        case ContentType_Enum.ImageUrl:
            return "Image URL";
        case ContentType_Enum.Link:
            return "Link";
        case ContentType_Enum.LinkButton:
            return "Link button";
        case ContentType_Enum.PaperFile:
            return "Paper file";
        case ContentType_Enum.PaperLink:
            return "Paper link";
        case ContentType_Enum.PaperUrl:
            return "Paper URL";
        case ContentType_Enum.PosterFile:
            return "Poster file";
        case ContentType_Enum.PosterUrl:
            return "Poster URL";
        case ContentType_Enum.Text:
            return "Text";
        case ContentType_Enum.VideoBroadcast:
            return "Video for broadcast";
        case ContentType_Enum.VideoCountdown:
            return "Video countdown";
        case ContentType_Enum.VideoFile:
            return "Video file";
        case ContentType_Enum.VideoFiller:
            return "Filler video";
        case ContentType_Enum.VideoLink:
            return "Link to video";
        case ContentType_Enum.VideoPrepublish:
            return "Video for pre-publication";
        case ContentType_Enum.VideoSponsorsFiller:
            return "Sponsors filler video";
        case ContentType_Enum.VideoTitles:
            return "Pre-roll titles video";
        case ContentType_Enum.VideoUrl:
            return "Video URL";
    }
}

export async function uploadSendSubmissionRequestsHandler(
    args: uploadSendSubmissionRequestsArgs,
    userId: string
): Promise<UploaderSendSubmissionRequestResult[]> {
    const { uploaders, user } = await getUploadersAndUser(args.uploaderIds, userId);
    assert(user.id);

    let ok = false;
    try {
        const newEmails: Email_Insert_Input[] = uploaders.map((uploader) => {
            const { htmlContents, plainTextContents } = generateEmailContents(uploader);
            const contentTypeFriendlyName = generateContentTypeFriendlyName(
                uploader.requiredContentItem.contentTypeName
            );
            return {
                emailAddress: uploader.email,
                htmlContents,
                plainTextContents,
                reason: "upload-request",
                subject: `Clowdr: Submission required: ${contentTypeFriendlyName}`,
            };
        });

        await apolloClient.mutate({
            mutation: InsertSubmissionRequestEmailsDocument,
            variables: {
                emails: newEmails,
                uploaderIds: uploaders.map((x) => x.id),
            },
        });

        ok = true;
    } catch (_e) {
        ok = false;
    }

    return uploaders.map((x) => ({ uploaderId: x.id, sent: ok }));
}
