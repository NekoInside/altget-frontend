#include <stdint.h>
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <ctype.h>
#include <emscripten/emscripten.h>
#include "sha256.h"

static const char* ERR = "error";
static const int MAX_NONCE = 100000000;

int sha256_hex(const char* input, char* output) {
    /*
        const char* str = "test";
        char hash[65] = {0}; // Notice the additional null-byte
        sha256_easy_hash_hex(str, strlen(str), hash);
        printf("%s\n", hash);
    */
    sha256_easy_hash_hex(input, strlen(input), output);
    return 0;
}

static int hex_char_to_val(char c) {
    if ('0' <= c && c <= '9') return c - '0';
    c = tolower((unsigned char)c);
    if ('a' <= c && c <= 'f') return 10 + (c - 'a');
    return -1; // 非法
}

int parse_sbox(const char *hex, uint8_t *sbox, size_t sbox_len) {
    size_t hex_len = strlen(hex);

    if (hex_len != sbox_len * 2) return -1;

    for (size_t i = 0; i < sbox_len; i++) {
        int hi = hex_char_to_val(hex[2 * i]);
        int lo = hex_char_to_val(hex[2 * i + 1]);
        if (hi < 0 || lo < 0) return -2;
        sbox[i] = (uint8_t)((hi << 4) | lo);
    }
    return 0;
}

int swipe_box(char* data, uint8_t *sbox) {
    size_t data_len = strlen(data);
    
    if (data_len != 64) return -1;
    
    char origin_data[65];
    snprintf(origin_data, sizeof(origin_data), "%s", data);
    
    for (int i=0;i<64;i++) {
        data[i] = origin_data[sbox[i]];
    }
    
    return 0;
}

EMSCRIPTEN_KEEPALIVE
char* invokeCustomPow(const char* input, int difficulty) {
    size_t input_size = strlen(input);
    if (input_size < 129) return (char*)ERR;
    if (input_size > 629) return (char*)ERR;
    
    if (difficulty <= 0 || difficulty >= 64)
        return (char*)ERR;
    
    char target[64];
    memset(target, '0', difficulty);
    target[difficulty] = 0;
    
    char sbox_hex[129];
    memcpy(sbox_hex, input, 128);
    sbox_hex[128] = '\0';
    uint8_t sbox[64];
    if (parse_sbox(sbox_hex, sbox, 64) != 0) {
        return (char*)ERR;
    }
    
    size_t data_len = input_size - 128;
    char* data = (char*)malloc(data_len + 1);
    memcpy(data, input + 128, data_len);
    data[data_len] = '\0';

    char seed_input[512];
    snprintf(seed_input, sizeof(seed_input), "%s%d", data, difficulty);

    char tireSeed[65];
    sha256_hex(seed_input, tireSeed);

    if (swipe_box(tireSeed, sbox) != 0) goto err;

    int nonce = 0;
    char sign[65];
    char candidate[1024];
    char hash[65];

    while (1) {
        if (nonce > MAX_NONCE) goto err;
        
        char nonce_str[32];
        sprintf(nonce_str, "%d", nonce);

        char tmp[512];
        snprintf(tmp, sizeof(tmp), "%s%s", nonce_str, tireSeed);
        sha256_hex(tmp, sign);

        for (int i=0;i<64;i++) {
            if (i != 0 && nonce % i == 0 && sign[i] >= 'a' && sign[i] <= 'z')
                sign[i] -= 32;
        }

        snprintf(candidate, sizeof(candidate), "%s%s", data, sign);
        sha256_hex(candidate, hash);
        
        if (strncmp(hash, target, difficulty) == 0)
            break;

        nonce++;
    }
    
    free(data);
    
    if (swipe_box(sign, sbox) != 0) goto err;

    char* result = (char*)malloc(128);
    sprintf(result, "%s%d", sign, nonce);
    return result;

    err:
    free(data);
    return (char*)ERR;
}