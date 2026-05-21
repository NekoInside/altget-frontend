import PowServiceWasm from './powServiceWasm.js'
import powServiceWasmPath from './powServiceWasm.wasm?url'

interface PowModule {
  allocateUTF8(str: string): number
  UTF8ToString(ptr: number): string
  _invokeCustomPow(dataPtr: number, difficulty: number): number
  _free(ptr: number): void
}

let powModulePromise: Promise<PowModule> | null = null

function getPowModule(): Promise<PowModule> {
  if (!powModulePromise) {
    powModulePromise = (PowServiceWasm as unknown as (opts: { locateFile: (p: string) => string }) => Promise<PowModule>)(
      { locateFile: (_path: string) => powServiceWasmPath }
    )
    powModulePromise.catch(() => {
      powModulePromise = null
    })
  }
  return powModulePromise
}

export async function invokeCustomPow(data: string, difficulty: number): Promise<string> {
  const module = await getPowModule()
  const dataPtr = module.allocateUTF8(data)
  const resultPtr = module._invokeCustomPow(dataPtr, difficulty)
  const result = module.UTF8ToString(resultPtr)
  module._free(dataPtr)
  module._free(resultPtr)
  return result
}

export async function getPowTask(target: string): Promise<{ taskId: string; nonce: string }> {
  const res = await fetch(`/api/getPowWasmTask?target=${target}`, { credentials: 'include' })
  const { taskId, data, difficulty } = await res.json()
  const nonce = await invokeCustomPow(data, difficulty)
  return { taskId, nonce }
}
