import { SignJWT, jwtVerify } from 'jose';
import { JWTPayload } from '@/types/auth';
import { cookies } from 'next/headers';
import { getUser } from '@/lib/userRepository';

const SECRET_KEY = process.env.JWT_SECRET || 'default-secret-key-change-me';
const key = new TextEncoder().encode(SECRET_KEY);

export async function encrypt(payload: Omit<JWTPayload, 'iat' | 'exp'>) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(key);
}

export async function decrypt(input: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(input, key, {
    algorithms: ['HS256'],
  });
  return payload as unknown as JWTPayload;
}

export async function getSession(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get('session')?.value;
  if (!session) return null;
  try {
    const payload = await decrypt(session);
    if (!payload.email) return null;

    const user = await getUser(payload.email);
    if (!user) return null;

    return {
      email: user.email,
      role: user.role,
    };
  } catch (error) {
    return null;
  }
}

export async function createSession(payload: Omit<JWTPayload, 'iat' | 'exp'>) {
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const session = await encrypt(payload);
  const cookieStore = await cookies();

  cookieStore.set('session', session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires,
    sameSite: 'lax',
    path: '/',
  });
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete('session');
}
