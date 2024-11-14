import { prismaClient } from "../../clients/db";
import { GraphqlContext } from "../../interfaces";

export const queries = {
    getUserProfile: async (parent: any, { username }: { username: string }, ctx: GraphqlContext) => {
        try {
            const user = await prismaClient.user.findUnique({
                where: { username }
            })

            return user
        } catch (error) {

        }
    }
}


export const mutations = {
    followUser: async (parent: any, { userId }: { userId: string }, ctx: GraphqlContext) => {
        // Ensure the user is authenticated
        if (!ctx.user) throw new Error("Please Login/Signup first");

        try {
            // Attempt to delete the like (unlike the post)
            await prismaClient.follow.delete({
                where: {
                    followerId_followingId: {
                        followerId: userId,
                        followingId: ctx.user.id
                    }
                }
            });

            // If successful, return a response indicating the post was unliked
            return false; // unfollowed

        } catch (error: any) {
            // If the like doesn't exist, handle the error and create the like (like the post)
            if (error.code === 'P2025') { // This error code indicates that the record was not found
                // Create a like entry (Prisma will automatically link the user and post)
                await prismaClient.follow.create({
                    data: {
                        followerId: userId,
                        followingId: ctx.user.id
                    }
                });
                return true; // followed
            }

            // Handle any other errors
            console.error("Error toggling like:", error);
            throw new Error(error.message || "An error occurred while toggling the like on the post.");
        }
    }
}

export const resolvers = { queries, mutations }