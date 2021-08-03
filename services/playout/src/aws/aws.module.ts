import { Bunyan, RootLogger } from "@eropple/nestjs-bunyan";
import { DynamicModule, FactoryProvider, Global, Module, ModuleMetadata, OnModuleInit } from "@nestjs/common";
import { AWS_MODULE_OPTIONS } from "../constants";
import { AwsConfigService } from "./aws-config.service";
import { AwsService } from "./aws.service";
import { CloudFormationService } from "./cloud-formation/cloud-formation.service";
import { MediaLiveService } from "./medialive/medialive.service";
import { SnsService } from "./sns/sns.service";

export type AwsModuleOptions = {
    credentials: {
        accessKeyId: string;
        secretAccessKey: string;
    };
    region: string;
    cloudFormationStackArn?: string;
};

@Global()
@Module({
    providers: [AwsService, AwsConfigService, CloudFormationService, MediaLiveService, SnsService],
    exports: [AwsService, AwsConfigService, CloudFormationService, MediaLiveService, SnsService],
})
export class AwsModule implements OnModuleInit {
    static forRoot(config: AwsModuleOptions): DynamicModule {
        return {
            module: AwsModule,
            imports: [],
            providers: [
                AwsService,
                {
                    provide: AWS_MODULE_OPTIONS,
                    useValue: config,
                },
            ],
            exports: [AwsService],
        };
    }

    static forRootAsync(
        config: Omit<FactoryProvider<AwsModuleOptions | Promise<AwsModuleOptions>>, "provide"> &
            Pick<ModuleMetadata, "imports">
    ): DynamicModule {
        return {
            module: AwsModule,
            imports: config.imports ?? [],
            providers: [
                AwsService,
                {
                    provide: AWS_MODULE_OPTIONS,
                    useFactory: config.useFactory,
                    inject: config.inject,
                },
            ],
            exports: [AwsService],
        };
    }

    private readonly logger: Bunyan;

    constructor(
        private snsService: SnsService,
        @RootLogger() logger: Bunyan,
        private awsConfigService: AwsConfigService
    ) {
        this.logger = logger.child({ component: this.constructor.name });
    }

    async onModuleInit(): Promise<void> {
        this.logger.info("Subscribing to CloudFormation SNS notifications");
        const cloudFormationNotificationsTopicArn = this.awsConfigService.getAwsConfigValue(
            "AWS_CLOUDFORMATION_NOTIFICATIONS_TOPIC_ARN"
        );
        await this.snsService.subscribeToTopic(cloudFormationNotificationsTopicArn, "/aws/cloudformation/notify");

        this.logger.info("Subscribing to MediaLive SNS notifications");
        const mediaLiveNotificationsTopicArn = this.awsConfigService.getAwsConfigValue(
            "AWS_MEDIALIVE_NOTIFICATIONS_TOPIC_ARN"
        );
        await this.snsService.subscribeToTopic(mediaLiveNotificationsTopicArn, "/aws/medialive/notify");
    }
}
