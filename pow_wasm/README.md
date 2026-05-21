# Pow Service Wasm
* 源码放在这里以供后继维护
* 配置好 emsdk 后使用以下命令编译:
```shell
emcc powServiceWasm.c sha256.c -O3 \
 -sEXPORTED_FUNCTIONS=_invokeCustomPow,_free \
 -sEXPORTED_RUNTIME_METHODS=UTF8ToString,allocateUTF8 \
 -o powServiceWasm.js \
 -sMODULARIZE=1 \
 -sEXPORT_NAME=PowServiceWasm \
 -sEXPORT_ES6=1
```