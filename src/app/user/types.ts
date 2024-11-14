export const types = `#graphql
    type getUserProfileResponse {
        id: ID!
        username: String!
        fullName: String!
        profileImageURL: String
        totalPosts: Int!
        totalFollowers: Int!
        totalFollowings: Int!
        followed: Boolean!
    }
`