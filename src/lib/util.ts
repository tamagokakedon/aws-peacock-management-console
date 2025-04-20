import { Account } from "./account-name-repository";

const AWS_SERVICE_ROLE_FOR_SSO_PREFIX = /AWSReservedSSO_/ // https://docs.aws.amazon.com/singlesignon/latest/userguide/using-service-linked-roles.html
const AWS_IAM_ROLE_NAME_PATTERN = /[\w+=,.@-]+/ // https://docs.aws.amazon.com/IAM/latest/APIReference/API_CreateRole.html
const AWS_SSO_USR_NAME_PATTERN = /[\w+=,.@-]+/ // Username can contain alphanumeric characters, or any of the following: +=,.@-

export const updateAccounts = (previous: Account[], current: Account[]): Account[] => {
    const accountMap = new Map<string, Account>();

    previous.forEach(account => accountMap.set(account.accountId, account));
    current.forEach(account => accountMap.set(account.accountId, account));

    return Array.from(accountMap.values());
}

export const selectElement = (query: string): HTMLElement | null =>
    document.querySelector<HTMLElement>(query)

export const toAccountNameAndId = (
    accountListCell: HTMLButtonElement
): Account | null => {
    const accountName = accountListCell.querySelector<HTMLElement>('strong')?.textContent
    const divs = accountListCell.querySelectorAll<HTMLDivElement>('div')
    const accountId = Array.from(divs).map(div => div.textContent?.match(/^\d{12}/)?.[0]?.trim()).find(id => id != null);
    return accountName && accountId ? { accountName, accountId } : null
}

const getUserName = () => selectElement('[data-testid="more-menu__awsc-nav-account-menu-button"]')?.getAttribute('aria-label')
export const getAccountMenuButtonSpan = () => selectElement('[data-testid="more-menu__awsc-nav-account-menu-button"] span[title]')

const isNotIamUserButAwsSsoUser = (userName: string) => {
    const awsSsoUserNameRe = new RegExp(
        `^${AWS_SERVICE_ROLE_FOR_SSO_PREFIX.source + AWS_IAM_ROLE_NAME_PATTERN.source
        }/${AWS_SSO_USR_NAME_PATTERN.source}`
    )
    return awsSsoUserNameRe.test(userName)
}

export const extractPermissionSetName = (title: string): string | null => {
    if (!isNotIamUserButAwsSsoUser(title)) {
        return null
    }
    
    // Format is typically: AWSReservedSSO_PermissionSetName_hash/username
    const match = title.match(new RegExp(`^${AWS_SERVICE_ROLE_FOR_SSO_PREFIX.source}([^/]+)`))
    if (match && match[1]) {
        // Extract the PermissionSet name without the hash part
        const permissionSetWithHash = match[1]
        const permissionSetMatch = permissionSetWithHash.match(/^(.+?)(_[a-f0-9]+)?$/)
        return permissionSetMatch ? permissionSetMatch[1] : permissionSetWithHash
    }
    return null
}

export const patchAccountNameIfAwsSso = (accountName: Account) => {
    const accountMenuButtonSpan = getAccountMenuButtonSpan()
    if (!accountMenuButtonSpan) {
        return
    }
    const userName = getUserName()
    const title = accountMenuButtonSpan.getAttribute('title')
    if (userName && title && isNotIamUserButAwsSsoUser(title)) {
        accountMenuButtonSpan.innerText = `${userName} @ ${accountName.accountName}`
    } // else not login by user, like root user or IAM role
}
