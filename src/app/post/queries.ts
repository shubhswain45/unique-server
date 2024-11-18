export const queries = `#graphql
    getFeedPosts(payload: paginationPayload!):getFeedPostsResponse
    getPostComments(postId: String!): [Comment]
    getUserPosts(username: String!):[Post]
    getPostById(postId: String!): getPostByIdResponse
`