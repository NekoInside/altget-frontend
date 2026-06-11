import { createVerifierAndSalt, SRPClientSession, SRPParameters, SRPRoutines } from 'tssrp6a'

const routines = new SRPRoutines(new SRPParameters(undefined, SRPParameters.H.SHA256))

const toHex = (value: bigint) => value.toString(16)
const fromHex = (value: string) => BigInt(`0x${value}`)

export async function createSrpRegistration(username: string, password: string) {
  const { s: salt, v: verifier } = await createVerifierAndSalt(routines, username, password)
  return { salt: toHex(salt), verifier: toHex(verifier) }
}

export async function createSrpLoginProof(username: string, password: string, salt: string, serverPublicKey: string) {
  const step1 = await new SRPClientSession(routines).step1(username, password)
  const step2 = await step1.step2(fromHex(salt), fromHex(serverPublicKey))
  return { a: toHex(step2.A), m1: toHex(step2.M1) }
}

export function extractToken(data: unknown): string | null {
  if (typeof data === 'string') return data
  if (data && typeof data === 'object' && 'token' in data && typeof data.token === 'string') return data.token
  return null
}