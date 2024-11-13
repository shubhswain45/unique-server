export const mutations = `#graphql
    createPost(payload: createPostData!): Post
    likePost(postId: String!): Boolean!
    commentPost(payload: commentPostData!): Comment!
`

