import { ArnPrincipal, Construct, PolicyPrincipal, PolicyStatement, Token } from '@aws-cdk/core';
import { iam } from '@aws-cdk/resources';
import { Group } from './group';
import { IIdentityResource, Policy } from './policy';
import { AttachedPolicies, undefinedIfEmpty } from './util';

export interface UserProps {
    /**
     * Groups to add this user to. You can also use `addToGroup` to add this
     * user to a group.
     */
    groups?: Group[];

    /**
     * A list of ARNs for managed policies attacherd to this user.
     * You can use `addManagedPolicy(arn)` to attach a managed policy to this user.
     * @default No managed policies.
     */
    managedPolicyArns?: any[];

    /**
     * The path for the user name. For more information about paths, see IAM
     * Identifiers in the IAM User Guide.
     */
    path?: string;

    /**
     * A name for the IAM user. For valid values, see the UserName parameter for
     * the CreateUser action in the IAM API Reference. If you don't specify a
     * name, AWS CloudFormation generates a unique physical ID and uses that ID
     * for the user name.
     *
     * If you specify a name, you cannot perform updates that require
     * replacement of this resource. You can perform updates that require no or
     * some interruption. If you must replace the resource, specify a new name.
     *
     * If you specify a name, you must specify the CAPABILITY_NAMED_IAM value to
     * acknowledge your template's capabilities. For more information, see
     * Acknowledging IAM Resources in AWS CloudFormation Templates.
     *
     * @default Generated by CloudFormation (recommended)
     */
    userName?: string;

    /**
     * The password for the user. This is required so the user can access the
     * AWS Management Console.
     *
     * @default User won't be able to access the management console without a password.
     */
    password?: string;

    /**
     * Specifies whether the user is required to set a new password the next
     * time the user logs in to the AWS Management Console.
     *
     * If this is set to 'true', you must also specify "initialPassword".
     *
     * @default false
     */
    passwordResetRequired?: boolean;
}

export class User extends Construct implements IIdentityResource {

    /**
     * An attribute that represents the user name.
     */
    public readonly userName: UserName;

    /**
     * An attribute that represents the user's ARN.
     */
    public readonly userArn: iam.UserArn;

    /**
     * Returns the ARN of this user.
     */
    public readonly principal: PolicyPrincipal;

    private readonly groups = new Array<any>();
    private readonly managedPolicies = new Array<string>();
    private readonly attachedPolicies = new AttachedPolicies();
    private defaultPolicy?: Policy;

    constructor(parent: Construct, name: string, props: UserProps = {}) {
        super(parent, name);

        const user = new iam.UserResource(this, 'Resource', {
            userName: props.userName,
            groups: undefinedIfEmpty(() => this.groups),
            managedPolicyArns: undefinedIfEmpty(() => this.managedPolicies),
            path: props.path,
            loginProfile: this.parseLoginProfile(props)
        });

        this.userName = user.ref;
        this.userArn = user.userArn;
        this.principal = new ArnPrincipal(this.userArn);

        if (props.groups) {
            props.groups.forEach(g => this.addToGroup(g));
        }
    }

    /**
     * Adds this user to a group.
     */
    public addToGroup(group: Group) {
        this.groups.push(group.groupName);
    }

    /**
     * Attaches a managed policy to the user.
     * @param arn The ARN of the managed policy to attach.
     */
    public attachManagedPolicy(arn: any) {
        this.managedPolicies.push(arn);
    }

    /**
     * Attaches a policy to this user.
     */
    public attachInlinePolicy(policy: Policy) {
        this.attachedPolicies.attach(policy);
        policy.attachToUser(this);
    }

    /**
     * Adds an IAM statement to the default policy.
     */
    public addToPolicy(statement: PolicyStatement) {
        if (!this.defaultPolicy) {
            this.defaultPolicy = new Policy(this, 'DefaultPolicy');
            this.defaultPolicy.attachToUser(this);
        }

        this.defaultPolicy.addStatement(statement);
    }

    private parseLoginProfile(props: UserProps): iam.UserResource.LoginProfileProperty | undefined {
        if (props.password) {
            return {
                password: props.password,
                passwordResetRequired: props.passwordResetRequired
            };
        }

        if (props.passwordResetRequired) {
            throw new Error('Cannot set "passwordResetRequired" without specifying "initialPassword"');
        }

        return undefined; // no console access
    }
}

export class UserName extends Token {

}