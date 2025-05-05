{
  "targets": [
    {
      "target_name": "COFFLoader",
      "sources": [ 
        "COFFLoader.cpp", 
        "beacon_compatibility.c"
      ],
      "include_dirs": [
        "node_modules/node-addon-api"
      ],
      "dependencies": [
        "<!(node -p \"require('node-addon-api').gyp\")"
      ],
      "cflags_cc": [ "-std=c++17" ],
      "defines": [ "NAPI_DISABLE_CPP_EXCEPTIONS" ]
    }
  ]
}
