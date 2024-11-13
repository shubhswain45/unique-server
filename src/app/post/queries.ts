export const queries = `#graphql
    getFeedPosts:[Post]
    getPostComments(postId: String!): [Comment]
`