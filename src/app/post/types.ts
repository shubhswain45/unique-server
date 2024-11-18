export const types = `#graphql
# Input type for creating a new post
input createPostData {
    content: String
    imgURL: String!
}

input commentPostData {
    content: String!
    postId: String!
}

input paginationPayload {
    take: Int!
    cursor: String
}
type Comment {
    id: String!
    content: String
    postId: String!

    author: User
}

# Post type
type Post {
    id: String!
    content: String
    imgURL: String!
    author: User
    totalLikeCount: Int!  # Total number of likes for the post
    bookmarked: Boolean!  # Total number of likes for the post
    userHasLiked: Boolean!  # Indicates whether the authenticated user has liked the post
}

type getFeedPostsResponse {
    posts: [Post]
    nextCursor: String
    hasMore: Boolean!
}

type getPostByIdResponse {
    id: String!
    content: String
    imgURL: String!
    author: User
    totalLikeCount: Int!  # Total number of likes for the post
    totalCommentCount: Int!  # Total number of likes for the post
    bookmarked: Boolean!  # Total number of likes for the post
    userHasLiked: Boolean!  # Indicates whether the authenticated user has liked the post
    comments: [Comment]

}
`
