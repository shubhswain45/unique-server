import express, { Request, Response } from 'express';
import cors from 'cors';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import bodyParser from 'body-parser';
import { GraphqlContext } from '../interfaces';
import JWTService from '../services/JWTService';
import { Auth } from './auth';
import { Post } from './post';
import cookieParser from 'cookie-parser'
import { User } from './user';

export async function initServer() {
    const app = express();

    // CORS configuration
    const corsOptions = { 
        origin: ['https://unique-client.vercel.app/'], // your frontend URL
        credentials: true, // Ensure cookies are sent with cross-origin requests
    };

    // Use CORS middleware
    app.use(cors(corsOptions));
    app.use(bodyParser.json({ limit: "10mb" }))
    app.use(cookieParser())

    const graphqlServer = new ApolloServer<GraphqlContext>({
        typeDefs: `
            ${Auth.types}
            ${Post.types}
            ${User.types}

            type Query {
                ${Auth.queries}
                ${Post.queries}
                ${User.queries}
            }
            
            type Mutation {
                ${Auth.mutations}
                ${Post.mutations}
                ${User.mutations}
            }
        `,
        resolvers: {
            Query: {
                ...Auth.resolvers.queries,
                ...Post.resolvers.queries,
                ...User.resolvers.queries
            },
            Mutation: {
                ...Auth.resolvers.mutations,
                ...Post.resolvers.mutations,
                ...User.resolvers.mutations
            },

            ...Post.resolvers.extraResolvers
        },
    });

    await graphqlServer.start();

    // GraphQL Middleware
    app.use(
        '/graphql',
        expressMiddleware(graphqlServer, {
            context: async ({ req, res }: { req: Request; res: Response }): Promise<GraphqlContext> => {
                let token = req.cookies["__moments_token"];

                let user = undefined;
                if (token) {
                    user = JWTService.decodeToken(token);
                    console.log("decoded user", user);
                    
                }

                return {
                    user,
                    req,
                    res,
                };
            },
        })
    );


    return app;
}
