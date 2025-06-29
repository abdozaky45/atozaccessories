import jwt, { JwtPayload } from 'jsonwebtoken';

interface TokenOptions {
  payload?: object;
  signature?: string;
}
interface VerifyTokenOptions {
  token: string;
  signature?: string;
}
export const generateAccessToken = ({
  payload = {},
  signature = process.env.TOKEN_SIGNATURE,
}: TokenOptions = {}): string => {
  const token = jwt.sign(payload, signature as string, {
  });
  return token;
};
export const generateRefreshToken = ({
  payload = {},
  signature = process.env.TOKEN_SIGNATURE,
}: TokenOptions = {}): string => {
  const token = jwt.sign(payload, signature as string, {
    expiresIn: '365d',
  });
  return token;
};
export const verifyToken = ({
  token,
  signature = process.env.TOKEN_SIGNATURE,
}: VerifyTokenOptions): JwtPayload | null => {
  if (!signature) {
    throw new Error("Token signature is not defined");
  }

  if (!token) {
    throw new Error("Token must be provided");
  }
  try {
    const decoded = jwt.verify(token, signature) as JwtPayload;
    return decoded;
  } catch (error) {
    throw new Error("Invalid token or expired");
  }
};

