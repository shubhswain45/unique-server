import { Post, Comment } from "@prisma/client";
import { prismaClient } from "../../clients/db";
import { GraphqlContext } from "../../interfaces";
import { v2 as cloudinary } from 'cloudinary';

interface CreatePostPayload {
    content?: string;
    imgURL: string;
}

interface commentPostData {
    content: string;
    postId: string;
}

const queries = {
    getFeedPosts: async (parent: any, args: any, ctx: GraphqlContext) => {
        // Ensure the user is authenticated
        console.log(ctx.user, "ctx.user");

        if (!ctx.user?.id) {
            return null; // Return null if the user is not authenticated
        }

        const userId = ctx.user.id;


        // Fetch the first 5 posts along with aggregated likes and a check if the user has liked each post
        const posts = await prismaClient.post.findMany({
            take: 5, // Fetch the first 5 posts
            include: {
                author: true,
                _count: {
                    select: { likes: true }, // Get the count of likes as totalLikeCount
                },
                likes: {
                    where: { userId }, // Check if the specific user has liked the post
                    select: { userId: true },
                },
            },
        });

        if (!posts) {
            return []; // Return an empty array if no posts are found
        }

        // Map the posts to format the response with totalLikeCount and userHasLiked
        return posts.map(post => ({
            ...post,
            totalLikeCount: post._count.likes, // Total count of likes from Prisma
            userHasLiked: post.likes.length > 0, // Check if the likes array has the current user's like
        }));
    },

    getPostComments: async (parent: any, { postId }: { postId: string }, ctx: GraphqlContext) => {
        // Ensure the user is authenticated
        console.log(ctx.user, "ctx.user");

        if (!ctx.user?.id) {
            return null; // Return null if the user is not authenticated
        }

        const userId = ctx.user.id;

        // Fetch the post and include the comments
        const postWithComments = await prismaClient.post.findUnique({
            where: { id: postId },
            include: {
                comments: {
                    
                }
            },
        });

        // If the post is not found, return null
        if (!postWithComments) {
            return null;
        }

        console.log(postWithComments);
        
        // Return the comments
        return postWithComments.comments 
    },

};

const mutations = {
    createPost: async (
        parent: any,
        { payload }: { payload: CreatePostPayload },
        ctx: GraphqlContext
    ) => {
        // Ensure the user is authenticated
        if (!ctx.user) throw new Error("Please Login/Signup first!");

        const { imgURL, content } = payload;

        // Validate the image URL before uploading
        if (!imgURL) throw new Error("Image URL is required");

        try {
            // Upload image to Cloudinary
            const uploadResult = await cloudinary.uploader.upload(imgURL);

            // Create post in the database
            const post = await prismaClient.post.create({
                data: {
                    content,
                    imgURL: uploadResult.secure_url, // Store the Cloudinary URL
                    author: { connect: { id: ctx.user.id } } // Associate post with authenticated user
                }
            });

            return post; // Return the created post
        } catch (error) {
            // Handle errors gracefully (Cloudinary or Prisma issues)
            console.error("Error creating post:", error);
            throw new Error("Failed to create post. Please try again.");
        }
    },

    deletePost: async (
        parent: any,
        { postId }: { postId: string },
        ctx: GraphqlContext
    ) => {
        // Ensure the user is authenticated
        try {
            if (!ctx.user) throw new Error("Please Login/Signup first!");

            const post = await prismaClient.post.findUnique({ where: { id: postId } })

            if (!post) {
                throw new Error("Post Doest exist!");
            }

            console.log(post.authorId, ctx.user.id, "----------------------------");


            if (post.authorId.toString() != ctx.user.id.toString()) {
                throw new Error("You cant delete someone else post!");
            }

            await prismaClient.post.delete({ where: { id: postId } })
            console.log("post deleted succesfully");
            return true


        } catch (error: any) {
            // Handle errors gracefully (Cloudinary or Prisma issues)
            console.error("Error creating post:", error);
            throw new Error(error.message);
        }
    },

    likePost: async (parent: any, { postId }: { postId: string }, ctx: GraphqlContext) => {
        // Ensure the user is authenticated
        if (!ctx.user) throw new Error("Please Login/Signup first");

        try {
            // Attempt to delete the like (unlike the post)
            await prismaClient.like.delete({
                where: {
                    userId_postId: {
                        userId: ctx.user.id,  // User ID from the context
                        postId,
                    }
                }
            });

            // If successful, return a response indicating the post was unliked
            return false; // Post was unliked

        } catch (error: any) {
            // If the like doesn't exist, handle the error and create the like (like the post)
            if (error.code === 'P2025') { // This error code indicates that the record was not found
                // Create a like entry (Prisma will automatically link the user and post)
                await prismaClient.like.create({
                    data: {
                        userId: ctx.user.id,  // User ID from the context
                        postId,  // Post ID to associate the like with
                    }
                });
                return true; // Post was liked
            }

            // Handle any other errors
            console.error("Error toggling like:", error);
            throw new Error(error.message || "An error occurred while toggling the like on the post.");
        }
    },

    commentPost: async (parent: any, { payload }: { payload: commentPostData }, ctx: GraphqlContext) => {
        // Ensure the user is authenticated
        if (!ctx.user) throw new Error("Please Login/Signup first");

        const { postId, content } = payload
        try {
            // Attempt to delete the like (unlike the post)
            const comment = await prismaClient.comment.create({
                data: {
                    postId,
                    content,
                    userId: ctx.user.id
                }
            })

            return comment;

        } catch (error: any) {
            // Handle any other errors
            console.error("Error comment post:", error);
            throw new Error(error.message || "An error occurred while commenting on the post.");
        }
    },

    deleteCommentPost: async (
        parent: any,
        { commentId }: { commentId: string },
        ctx: GraphqlContext
    ) => {
        // Ensure the user is authenticated
        try {
            if (!ctx.user) throw new Error("Please Login/Signup first!");

            await prismaClient.comment.delete({ where: { id: commentId } })
            return true


        } catch (error: any) {
            // Handle errors gracefully (Cloudinary or Prisma issues)
            console.error("Error creating post:", error);
            throw new Error(error.message);
        }
    },
};

const extraResolvers = {
    Post: {
        author: async (parent: Post) => await prismaClient.user.findUnique({ where: { id: parent.authorId } })
    },
    Comment: {
        author: async (parent: Comment) => await prismaClient.user.findUnique({ where: { id: parent.userId } })
    }
}


export const resolvers = { queries, mutations, extraResolvers };