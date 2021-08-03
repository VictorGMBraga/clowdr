import { CloudFormation, DescribeStacksCommand } from "@aws-sdk/client-cloudformation";
import { Credentials as NewSdkCredentials } from "@aws-sdk/types";
import { Bunyan, RootLogger } from "@eropple/nestjs-bunyan/dist";
import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AWS_MODULE_OPTIONS } from "../constants";
import { AwsModuleOptions } from "./aws.module";

@Injectable()
export class AwsConfigService implements OnModuleInit {
    private readonly logger: Bunyan;

    private readonly credentials: NewSdkCredentials;
    private readonly region: string;
    private readonly cloudFormationStackArn?: string;
    private _cloudFormation: CloudFormation;

    public static mandatoryKeys = [
        "AWS_ACCOUNT_ID",
        "AWS_CLOUDFORMATION_NOTIFICATIONS_TOPIC_ARN",
        "AWS_CONTENT_BUCKET_ID",
        "AWS_MEDIALIVE_INPUT_SECURITY_GROUP_ID",
        "AWS_MEDIALIVE_NOTIFICATIONS_TOPIC_ARN",
        "AWS_MEDIALIVE_SERVICE_ROLE_ARN",
        "AWS_MEDIALIVE_SERVICE_ROLE_ARN",
        "AWS_PREFIX",
        "AWS_REGION",
        "AWS_SECRET_ACCESS_KEY",
    ] as const;
    public static optionalKeys = [] as const;
    public config:
        | { [T in typeof AwsConfigService.mandatoryKeys[number]]: string } &
              { [U in typeof AwsConfigService.optionalKeys[number]]?: string };

    constructor(
        @RootLogger() logger: Bunyan,
        @Inject(AWS_MODULE_OPTIONS) config: AwsModuleOptions,
        private configService: ConfigService
    ) {
        this.logger = logger.child({ component: this.constructor.name });
        this.credentials = config.credentials;
        this.region = config.region;
        this.cloudFormationStackArn = config.cloudFormationStackArn;
    }

    async onModuleInit(): Promise<void> {
        if (this.cloudFormationStackArn) {
            this.logger.info(
                { cloudFormationStackArn: this.cloudFormationStackArn },
                "Retrieving environment settings from CloudFormation stack"
            );
            this._cloudFormation = new CloudFormation({
                credentials: this.credentials,
                region: this.region,
            });

            const command = new DescribeStacksCommand({
                StackName: this.cloudFormationStackArn,
            });

            const stacks = await this._cloudFormation.send(command);

            if (!stacks.Stacks?.length) {
                this.logger.error(
                    {
                        stackArn: this.cloudFormationStackArn,
                    },
                    "Could not find the specified AWS CloudFormation stack"
                );
                throw new Error("Could not find the specified AWS CloudFormation stack");
            }

            const outputs = stacks.Stacks[0].Outputs ?? [];
            const config: Partial<{ [T in typeof AwsConfigService.mandatoryKeys[number]]: string }> &
                { [U in typeof AwsConfigService.optionalKeys[number]]?: string } = {};

            for (const key of AwsConfigService.mandatoryKeys) {
                const output = outputs.find((o) => o.OutputKey === key);
                if (!output || !output.OutputKey || !output.OutputValue) {
                    this.logger.error({ missingKey: key }, "Missing mandatory CloudFormation output");
                    throw new Error("Missing mandatory CloudFormation output");
                }
                config[output.OutputKey as typeof AwsConfigService.mandatoryKeys[number]] = output.OutputValue;
            }

            // Enable once there are optional keys
            // for (const key of AwsConfigService.optionalKeys) {
            //     const output = outputs.find((o) => o.OutputKey === key);
            //     if (!output || !output.OutputKey || !output.OutputValue) {
            //         this.logger.info({ missingKey: key }, "Missing optional CloudFormation output");
            //     } else {
            //         config[output.OutputKey as typeof AwsConfigService.optionalKeys[number]] = output.OutputValue;
            //     }
            // }

            this.config = config as unknown as any;
        } else {
            this.logger.info("No CloudFormation stack Arn supplied, using explicit values only.");
        }
    }

    public getAwsConfigValue(
        key: typeof AwsConfigService.mandatoryKeys[number] | typeof AwsConfigService.optionalKeys[number]
    ): string {
        const overrideValue = this.configService.get<string>(key);
        if (overrideValue) {
            return overrideValue;
        }
        if (!this.config) {
            this.logger.error({ key }, "Cannot retrieve requested AWS config (missing CloudFormation stack)");
            throw new Error("Cannot retrieve requested AWS config (missing CloudFormation stack)");
        }
        if (key in this.config) {
            return this.config[key];
        }
        this.logger.error({ key }, "Cannot retrieve requested AWS config (missing from CloudFormation stack outputs)");
        throw new Error("Cannot retrieve requested AWS config (missing from CloudFormation stack outputs)");
    }
}
