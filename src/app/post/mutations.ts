export const mutations = `#graphql
    createPost(payload: createPostData!): Post
    deletePost(postId: String!): Boolean!
    likePost(postId: String!): Boolean!
    commentPost(payload: commentPostData!): Comment!
    deleteCommentPost(commentId: String!): Boolean!
`

