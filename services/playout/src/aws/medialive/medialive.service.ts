import {
    BatchUpdateScheduleCommand,
    ChannelState,
    ChannelSummary,
    DescribeChannelCommand,
    DescribeChannelResponse,
    MediaLive,
    paginateDescribeSchedule,
    paginateListChannels,
    ScheduleAction,
    StartChannelCommand,
    StopChannelCommand,
} from "@aws-sdk/client-medialive";
import { Credentials as NewSdkCredentials } from "@aws-sdk/types";
import { Bunyan, RootLogger } from "@eropple/nestjs-bunyan/dist";
import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import { DescribeScheduleRequest } from "aws-sdk/clients/medialive";
import { AWS_MODULE_OPTIONS } from "../../constants";
import { AwsModuleOptions } from "../aws.module";

@Injectable()
export class MediaLiveService implements OnModuleInit {
    private readonly logger: Bunyan;

    private readonly credentials: NewSdkCredentials;
    private readonly region: string;
    private _mediaLive: MediaLive;

    constructor(@RootLogger() logger: Bunyan, @Inject(AWS_MODULE_OPTIONS) config: AwsModuleOptions) {
        this.logger = logger.child({ component: this.constructor.name });

        this.credentials = config.credentials;
        this.region = config.region;
    }

    onModuleInit(): void {
        this._mediaLive = new MediaLive({
            credentials: this.credentials,
            region: this.region,
        });
    }

    public async getChannelState(channelId: string): Promise<ChannelState | string | null> {
        const description = await this._mediaLive.describeChannel({
            ChannelId: channelId,
        });

        return description.State ?? null;
    }

    public async describeSchedule(channelId: string): Promise<ScheduleAction[]> {
        const request: DescribeScheduleRequest = { ChannelId: channelId };
        const paginatorConfig = {
            client: this._mediaLive,
            pageSize: 50,
        };
        const paginator = paginateDescribeSchedule(paginatorConfig, request);
        const scheduleActions: ScheduleAction[] = [];
        for await (const page of paginator) {
            if (!page.ScheduleActions) {
                throw new Error("Could not retrieve MediaLive schedule");
            }
            scheduleActions.push(...page.ScheduleActions);
        }
        return scheduleActions;
    }

    public async updateSchedule(
        channelId: string,
        deleteActionNames: string[],
        createActions: ScheduleAction[]
    ): Promise<void> {
        const action = new BatchUpdateScheduleCommand({
            Deletes: {
                ActionNames: deleteActionNames,
            },
            Creates: {
                ScheduleActions: createActions,
            },
            ChannelId: channelId,
        });
        await this._mediaLive.send(action);
    }

    public async channelExists(channelId: string): Promise<boolean> {
        const channels: ChannelSummary[] = [];
        const paginator = paginateListChannels(
            {
                client: this._mediaLive,
            },
            {}
        );
        for await (const page of paginator) {
            channels.push(...(page.Channels ?? []));
        }
        return !!channels?.find((channel) => channel.Id === channelId);
    }

    public async startChannel(channelId: string): Promise<void> {
        const command = new StartChannelCommand({ ChannelId: channelId });
        await this._mediaLive.send(command);
    }

    public async stopChannel(channelId: string): Promise<void> {
        const command = new StopChannelCommand({ ChannelId: channelId });
        await this._mediaLive.send(command);
    }

    public async describeChannel(channelId: string): Promise<DescribeChannelResponse> {
        const command = new DescribeChannelCommand({ ChannelId: channelId });
        const result = await this._mediaLive.send(command);
        return result;
    }
}
