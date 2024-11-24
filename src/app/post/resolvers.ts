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

interface paginationPayload {
    take: number
    cursor: string
}
const queries = {
    //[1,2,3,4,5,6,7,8,9,10,11,12]
    getFeedPosts: async (parent: any, { payload }: { payload: paginationPayload }, ctx: GraphqlContext) => {
        if (!ctx.user) {
            return null; // Ensure the user is authenticated
        }

        const { take, cursor } = payload
        const userId = ctx.user.id; // Current user ID

        try {
            // Fetch posts by users whom the current user follows
            const posts = await prismaClient.post.findMany({
                where: {
                    author: {
                        followers: {
                            some: {
                                followerId: userId, // Match users followed by the current user
                            },
                        },
                    },
                },
                orderBy: { createdAt: "desc" }, // Order by most recent posts
                include: {
                    _count: {
                        select: { likes: true }, // Count likes on the post
                    },
                    likes: {
                        where: { userId }, // Check if the current user liked the post
                        select: { userId: true },
                    },
                    bookmarks: {
                        where: { userId }, // Check if the current user bookmarked the post
                        select: { userId: true },
                    },
                },
                take: take + 1, // Fetch one extra post to check for more pages
                skip: cursor ? 1 : 0, // Skip the cursor post if it exists
                cursor: cursor ? { id: cursor } : undefined, // Apply pagination cursor
            });

            // Check if there are more posts
            const hasMore = posts.length > take;
            if (hasMore) {
                posts.pop(); // Remove the extra post used for pagination check
            }

            const nextCursor = posts.length > 0 ? posts[posts.length - 1].id : null; // Set next cursor

            // Map posts to include calculated fields
            return {
                posts: posts.map((post) => ({
                    ...post,
                    totalLikeCount: post._count.likes, // Total likes count
                    userHasLiked: post.likes.length > 0, // If the user liked the post
                    bookmarked: post.bookmarks.length > 0, // If the user bookmarked the post
                })),
                nextCursor, // Return the cursor for the next page
                hasMore, // Boolean indicating if there are more posts
            };
        } catch (error) {
            console.error("Error fetching feed posts:", error);
            throw new Error("Failed to fetch feed posts.");
        }
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

    getUserPosts: async (
        parent: any,
        { username }: { username: string },
        ctx: GraphqlContext
    ) => {
        try {
            // Fetch and sort posts by creation date in descending order
            const posts = await prismaClient.post.findMany({
                where: { author: { username } },
                orderBy: {
                    createdAt: "desc", // Sort by createdAt in descending order
                },
                include: {
                    author: true,
                    _count: {
                        select: { likes: true }, // Get the count of likes as totalLikeCount
                    },
                    likes: {
                        where: { userId: ctx.user?.id }, // Check if the specific user has liked the post
                        select: { userId: true },
                    },
                    bookmarks: {
                        where: { userId: ctx.user?.id }, // Check if the specific user has bookmarked the post
                        select: { userId: true },
                    },
                },
            });


            return posts.map(post => ({
                ...post,
                totalLikeCount: post._count.likes, // Total count of likes from Prisma
                userHasLiked: post.likes.length > 0, // Check if the likes array has the current user's like
                bookmarked: post.bookmarks.length > 0, // Check if the bookmarks array has the current user's bookmark
            }));
        } catch (error) {
            // Log the error for debugging
            console.error("Error fetching user posts:", error);

            // Throw a generic error message to the client
            throw new Error("Failed to fetch user posts. Please try again.");
        }
    },

    getPostById: async (
        parent: any,
        { postId }: { postId: string },
        ctx: GraphqlContext
    ) => {
        try {
            // Fetch the post along with related data
            const post = await prismaClient.post.findUnique({
                where: { id: postId },
                include: {
                    author: true,
                    _count: {
                        select: { likes: true, comments: true }, // Get the count of likes and comments
                    },
                    likes: {
                        where: { userId: ctx.user?.id }, // Check if the specific user has liked the post
                        select: { userId: true },
                    },
                    bookmarks: {
                        where: { userId: ctx.user?.id }, // Check if the specific user has bookmarked the post
                        select: { userId: true },
                    },
                    comments: {
                        orderBy: { createdAt: 'desc' }, // Order comments by createdAt in descending order
                    },
                },
            });

            if (!post) {
                return null;
            }

            console.log({
                ...post,
                totalLikeCount: post?._count?.likes, // Total count of likes from Prisma
                totalCommentCount: post?._count?.comments, // Total count of comments from Prisma
                userHasLiked: post?.likes?.length > 0, // Check if the user has liked the post
                bookmarked: post?.bookmarks?.length > 0, // Check if the user has bookmarked the post
                comments: post.comments, // Include the top 5 comments
            });

            return {
                id: post.id,
                content: post.content,
                imgURL: post.imgURL,
                author: post.author,
                totalLikeCount: post?._count?.likes, // Total count of likes from Prisma
                totalCommentCount: post?._count?.comments, // Total count of comments from Prisma
                bookmarked: post?.bookmarks?.length > 0, // Check if the user has bookmarked the post
                userHasLiked: post?.likes?.length > 0, // Check if the user has liked the post
                comments: post.comments, // Include the top 5 comments
            };

            
        } catch (error) {
            // Log the error for debugging
            console.error("Error fetching post:", error);
            throw new Error("Failed to fetch the post. Please try again.");
        }
    }

};

const mutations = {
    createPost: async (
        parent: any,
        { payload }: { payload: CreatePostPayload },
        ctx: GraphqlContext
    ) => {
        try {
            // Ensure the user is authenticated
            if (!ctx.user) throw new Error("Please Login/Signup first!");

            const { imgURL, content } = payload;
            // Validate the image URL before uploading
            if (!imgURL) throw new Error("Image URL is required");


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
        } catch (error: any) {
            // Handle errors gracefully (Cloudinary or Prisma issues)
            console.error("Error toggling like:", error);
            throw new Error(error.message || "An error occurred while toggling the like on the post.");
        }
    },

    deletePost: async (
        parent: any,
        { postId }: { postId: string },
        ctx: GraphqlContext
    ) => {
        try {
            // Ensure the user is authenticated
            if (!ctx.user) throw new Error("Please Login/Signup first!");

            const post = await prismaClient.post.findUnique({ where: { id: postId } })

            if (!post) {
                throw new Error("Post Doest exist!");
            }

            if (post.authorId.toString() != ctx.user.id.toString()) {
                throw new Error("You cant delete someone else post!");
            }

            await prismaClient.post.delete({ where: { id: postId } })

            return true


        } catch (error: any) {
            // Handle errors gracefully (Cloudinary or Prisma issues)
            console.error("Error toggling like:", error);
            throw new Error(error.message || "An error occurred while toggling the like on the post.");
        }
    },

    likePost: async (parent: any, { postId }: { postId: string }, ctx: GraphqlContext) => {

        try {
            // Ensure the user is authenticated
            if (!ctx.user) throw new Error("Please Login/Signup first");

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
                        userId: ctx?.user?.id || "",  // User ID from the context
                        postId,  // Post ID to associate the like with
                    }
                });
                return true; // Post was liked
            }

           // Handle errors gracefully (Cloudinary or Prisma issues)
           console.error("Error toggling like:", error);
           throw new Error(error.message || "An error occurred while toggling the like on the post.");
        }
    },

    commentPost: async (parent: any, { payload }: { payload: commentPostData }, ctx: GraphqlContext) => {
        try {
            // Ensure the user is authenticated
            if (!ctx.user) throw new Error("Please Login/Signup first");

            const { postId, content } = payload

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

    bookMarkPost: async (parent: any, { postId }: { postId: string }, ctx: GraphqlContext) => {
        
        try {
            // Ensure the user is authenticated
            if (!ctx.user) throw new Error("Please Login/Signup first");

            // Attempt to delete the like (unlike the post)
            await prismaClient.bookMark.delete({
                where: {
                    userId_postId: {
                        userId: ctx.user.id,  // User ID from the context
                        postId,
                    }
                }
            });

            // If successful, return a response indicating the post was unliked
            return false;

        } catch (error: any) {
            // If the like doesn't exist, handle the error and create the like (like the post)
            if (error.code === 'P2025') { // This error code indicates that the record was not found
                // Create a like entry (Prisma will automatically link the user and post)
                await prismaClient.bookMark.create({
                    data: {
                        userId: ctx?.user?.id || "",  // User ID from the context
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