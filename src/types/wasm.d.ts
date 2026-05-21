// Type declarations for powServiceWasm.js (emscripten ES6 module)
declare module '*/powServiceWasm.js' {
  interface PowModule {
    allocateUTF8(str: string): number
    UTF8ToString(ptr: number): string
    _invokeCustomPow(dataPtr: number, difficulty: number): number
    _free(ptr: number): void
  }
  function PowServiceWasm(options?: { locateFile?: (path: string, dir: string) => string }): Promise<PowModule>
  export default PowServiceWasm
}

// Type declaration for *.wasm?url imports
declare module '*.wasm?url' {
  const url: string
  export default url
}

// Geetest4 global
interface GeetestCaptchaObj {
  appendTo(selector: string): void
  onSuccess(cb: () => void): void
  getValidate(): {
    captcha_id: string
    captcha_output: string
    gen_time: string
    lot_number: string
    pass_token: string
  }
  destroy(): void
}

declare function initGeetest4(
  config: { captchaId: string; product: 'popup' | 'float' | 'bind' },
  callback: (captchaObj: GeetestCaptchaObj) => void
): void
