import type { Content_ElementType_Enum, Content_ItemType_Enum } from "../../../../../../generated/graphql";
import type { PartialOrError } from "../Types";

export type Content_ImportStructure = PartialOrError<{
    conferenceId: string;
    contentId: string;
    externallySourcedDataIds: string[];

    title: string;
    shortTitle: string;
    type: Content_ItemType_Enum;
    tagIds: string[];
    tagNames: string[];
    exhibitionIds: { priority: number; id: string }[];
    exhibitionNames: string[];
    discussionRoomIds: string[];
    chatId: string;

    people: Content_Person_ImportStructure[];
    elements: Content_Element_ImportStructure[];
}>;

export type Content_Element_LatestVersion_ImportStructure = PartialOrError<{
    createdAt: Date;
    createdBy: string;
    data:
        | {
              altText: string;
              s3Url: string;
          }
        | {
              title: string;
              url: string;
          }
        | {
              text: string;
              url: string;
          }
        | {
              text: string;
          }
        | {
              s3Url: string;
              subtitles: any;
              fullData: any;
          };
}>;

export type Content_Element_ImportStructure = PartialOrError<{
    id: string;
    name: string;
    typeName: Content_ElementType_Enum;
    latestVersion: Content_Element_LatestVersion_ImportStructure;
    layout: PartialOrError<{
        hidden: boolean;
        priority: number;
        wide: boolean;
    }>;
    uploadsRemaining: number;
    hidden: boolean;
    uploaders: Content_Uploader_ImportStructure[];
}>;

export type Content_Person_ImportStructure = PartialOrError<{
    priority: number;
    id: string;
    roleName: string;
    name: string;
    affiliation: string;
    email: string;
}>;

export type Content_Uploader_ImportStructure = PartialOrError<{
    name: string;
    email: string;
}>;
