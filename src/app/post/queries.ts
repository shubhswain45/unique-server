export const queries = `#graphql
    getFeedPosts:[Post]
    getPostComments(postId: String!): [Comment]
    getUserPosts(username: String!):[Post]
    getPostById(postId: String!): getPostByIdResponse
`