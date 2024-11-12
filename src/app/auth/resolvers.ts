import axios from 'axios';
import { prismaClient } from '../../clients/db';
import JWTService from '../../services/JWTService';
import { GraphqlContext, JWTUser } from '../../interfaces';

interface GoogleJwtPayload {
    iss: string;
    azp: string;
    aud: string;
    sub: string;
    email: string;
    email_verified: string; // Consider converting to `boolean` if consistently boolean
    nbf: string;
    name: string;
    picture: string;
    given_name: string;
    family_name: string;
    iat: string;
    exp: string;
    jti: string;
    alg: string;
    kid: string;
    typ: string;
}

const mutations = {
    loginWithGoogle: async (parent: any, { token }: { token: string }, ctx: GraphqlContext) => {
        try {
            const googleOauthURL = new URL("https://oauth2.googleapis.com/tokeninfo");
            googleOauthURL.searchParams.set('id_token', token);

            const { data } = await axios.get<GoogleJwtPayload>(googleOauthURL.toString(), {
                responseType: 'json'
            });

            // Check if the email is verified
            if (data.email_verified !== "true") {
                throw new Error("Email not verified by Google.");
            }

            let user = await prismaClient.user.findUnique({ where: { email: data.email } });

            const fullName = data.family_name ? `${data.given_name} ${data.family_name}` : data.given_name;

            if (!user) {
                user = await prismaClient.user.create({
                    data: {
                        username: data.email.split("@")[0],
                        fullName,
                        email: data.email,
                        profileImageURL: data.picture,
                        isVerified: true,
                    }
                });
            }

            const payload = {
                id: user.id,
                username: user.username
            } as JWTUser;

            const userToken = JWTService.generateTokenForUser(payload);

            // Set the JWT token in the cookie
            ctx.res.cookie('__moments_token', userToken, {
                httpOnly: true, // Ensures the cookie is not accessible via JavaScript (security measure)
                secure: false,  // Set to false for local dev (use true for production with HTTPS)
                maxAge: 1000 * 60 * 60 * 24, // Cookie expires in 1 day
                sameSite: 'none', // Use lowercase 'lax' for local dev, 'none' for production with HTTPS
                path: '/' // Path to which the cookie applies
            });
            

            return userToken; // Optionally, you can still return the token in the response
        } catch (error: any) {
            console.log(error, "error");
            throw new Error(error?.message || "Failed to authenticate with Google.");
        }
    },
};

export const resolvers = { mutations };
