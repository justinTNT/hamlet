/**
 * Auto-Generated TypeScript Definitions
 * Generated from Elm models by BuildAmp
 *
 * DO NOT EDIT - Changes will be overwritten
 */

// =============================================================================
// UNION TYPES
// =============================================================================



// =============================================================================
// INTERFACES
// =============================================================================

export interface Guest {
    id: string;
    host: string;
    name: string;
    picture: string;
    sessionId: string;
    createdAt: number;
    deletedAt: number;
}

export interface ItemComment {
    id: string;
    host: string;
    itemId: string;
    guestId: string;
    parentId?: string;
    authorName: string;
    text: object;
    removed: boolean;
    createdAt: number;
    deletedAt: number;
}

export interface ItemTag {
    itemId: string;
    tagId: string;
    host: string;
    deletedAt: number;
}

export interface MicroblogItem {
    id: string;
    host: string;
    title: string;
    link?: string;
    image?: string;
    extract?: object;
    ownerComment: object;
    createdAt: number;
    updatedAt: number;
    viewCount: number;
    deletedAt: number;
}

export interface Tag {
    id: string;
    host: string;
    name: string;
    createdAt: number;
    deletedAt: number;
}

export interface GetFeedRequest {

}

export interface GetFeedResponse {
    items: Array<FeedItem>;
}

export interface FeedItem {
    id: string;
    title: string;
    image?: string;
    extract?: string;
    ownerComment: string;
    timestamp: number;
}

export interface GetItemRequest {
    id: string;
}

export interface GetItemResponse {
    item: MicroblogItem;
}

export interface GetItemsByTagRequest {
    tag: string;
}

export interface GetItemsByTagResponse {
    tag: string;
    items: Array<FeedItem>;
}

export interface GetTagsRequest {

}

export interface GetTagsResponse {
    tags: Array<string>;
}

export interface SubmitCommentRequest {
    itemId: string;
    parentId?: string;
    text: string;
    authorName?: string;
}

export interface SubmitCommentResponse {
    comment: CommentItem;
}

export interface SubmitCommentServerContext {
    freshGuestId: string;
    freshCommentId: string;
}

export interface CommentItem {
    id: string;
    itemId: string;
    guestId: string;
    parentId?: string;
    authorName: string;
    text: string;
    timestamp: number;
}

export interface SubmitItemRequest {
    title: string;
    link: string;
    image: string;
    extract: string;
    ownerComment: string;
    tags: Array<string>;
}

export interface SubmitItemResponse {
    item: MicroblogItem;
}

export interface SubmitItemServerContext {
    freshTagIds: Array<string>;
}

export interface MicroblogItem {
    id: string;
    title: string;
    link: string;
    image: string;
    extract: string;
    ownerComment: string;
    tags: Array<string>;
    comments: Array<CommentItem>;
    timestamp: number;
}

export interface TestCache {
    key: string;
    data: string;
    ttl: number;
}

export interface UserProfile {
    id: string;
    name: string;
    string: string;
}

export interface UserSession {
    profile: UserProfile;
    loginTime: number;
    permissions: Array<string>;
    ttl: number;
}

export interface GuestSession {
    guestId: string;
    displayName: string;
    createdAt: number;
}

export interface CommentModeratedEvent {
    commentId: string;
    removed: boolean;
}

export interface CommentRemovedEvent {
    commentId: string;
    postId: string;
    timestamp: number;
}

export interface NewCommentEvent {
    id: string;
    itemId: string;
    guestId: string;
    parentId?: string;
    authorName: string;
    text: string;
    timestamp: number;
}

export interface CommentModerated {
    recordId: string;
    table: string;
    field: string;
    oldValue: string;
    newValue: string;
}
