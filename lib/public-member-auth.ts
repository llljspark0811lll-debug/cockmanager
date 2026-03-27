import { SignJWT, jwtVerify } from "jose";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET
);

export type PublicMemberAuthPayload = {
  type: "public-member";
  clubId: number;
  memberId: number;
};

export async function createPublicMemberToken(
  payload: Omit<PublicMemberAuthPayload, "type">
) {
  return await new SignJWT({
    ...payload,
    type: "public-member",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("180d")
    .sign(secret);
}

export async function verifyPublicMemberToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret);
    const parsed = payload as PublicMemberAuthPayload;

    if (parsed.type !== "public-member") {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}
