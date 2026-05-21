/**
 * Convert a Base64url-encoded string to an ArrayBuffer.
 * Needed because WebAuthn API uses ArrayBuffers but the server sends Base64url strings.
 */
export function base64urlToBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/')
  const pad = base64.length % 4 === 0 ? '' : '='.repeat(4 - (base64.length % 4))
  const binary = atob(base64 + pad)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

/**
 * Convert an ArrayBuffer to a Base64url-encoded string.
 */
export function bufferToBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

type PublicKeyCredentialDescriptorJson = {
  id: string
  type: PublicKeyCredentialType
  transports?: string[]
}

type RegistrationCreationOptionsJson = {
  publicKey: {
    challenge: string
    user: {
      id: string
      name: string
      displayName: string
    }
    rp: PublicKeyCredentialRpEntity
    pubKeyCredParams: PublicKeyCredentialParameters[]
    timeout?: number
    excludeCredentials?: Array<PublicKeyCredentialDescriptorJson>
    authenticatorSelection?: AuthenticatorSelectionCriteria
    attestation?: AttestationConveyancePreference
    extensions?: AuthenticationExtensionsClientInputs
  }
}

type AuthenticationRequestOptionsJson = {
  publicKey: {
    challenge: string
    timeout?: number
    rpId?: string
    allowCredentials?: Array<PublicKeyCredentialDescriptorJson>
    userVerification?: UserVerificationRequirement
    extensions?: AuthenticationExtensionsClientInputs
  }
}

export function parseRegistrationCreationOptions(optionsJson: string): CredentialCreationOptions {
  const options = JSON.parse(optionsJson) as RegistrationCreationOptionsJson

  return {
    publicKey: {
      rp: options.publicKey.rp,
      user: {
        ...options.publicKey.user,
        id: base64urlToBuffer(options.publicKey.user.id),
      },
      challenge: base64urlToBuffer(options.publicKey.challenge),
      pubKeyCredParams: options.publicKey.pubKeyCredParams,
      timeout: options.publicKey.timeout,
      authenticatorSelection: options.publicKey.authenticatorSelection,
      attestation: options.publicKey.attestation,
      extensions: options.publicKey.extensions,
      excludeCredentials: options.publicKey.excludeCredentials?.map(credential => ({
        ...credential,
        transports: credential.transports as AuthenticatorTransport[] | undefined,
        id: base64urlToBuffer(credential.id),
      })),
    },
  }
}

export function parseAuthenticationRequestOptions(optionsJson: string): CredentialRequestOptions {
  const options = JSON.parse(optionsJson) as AuthenticationRequestOptionsJson

  return {
    publicKey: {
      challenge: base64urlToBuffer(options.publicKey.challenge),
      timeout: options.publicKey.timeout,
      rpId: options.publicKey.rpId,
      userVerification: options.publicKey.userVerification,
      extensions: options.publicKey.extensions,
      allowCredentials: options.publicKey.allowCredentials?.map(credential => ({
        ...credential,
        transports: credential.transports as AuthenticatorTransport[] | undefined,
        id: base64urlToBuffer(credential.id),
      })),
    },
  }
}

export function serializeRegistrationCredential(credential: PublicKeyCredential): string {
  const response = credential.response as AuthenticatorAttestationResponse
  return JSON.stringify({
    id: credential.id,
    rawId: bufferToBase64url(credential.rawId),
    type: credential.type,
    authenticatorAttachment: credential.authenticatorAttachment,
    response: {
      attestationObject: bufferToBase64url(response.attestationObject),
      clientDataJSON: bufferToBase64url(response.clientDataJSON),
      transports: typeof response.getTransports === 'function' ? response.getTransports() : undefined,
      publicKeyAlgorithm: typeof response.getPublicKeyAlgorithm === 'function' ? response.getPublicKeyAlgorithm() : undefined,
      publicKey: typeof response.getPublicKey === 'function' && response.getPublicKey()
        ? bufferToBase64url(response.getPublicKey() as ArrayBuffer)
        : undefined,
    },
    clientExtensionResults: credential.getClientExtensionResults(),
  })
}
