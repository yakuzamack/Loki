const fs = require('fs');

// Define file path
const filePath = "a.b";

// Read file into a byte array
fs.readFile(filePath, (err, data) => {
  if (err) throw err;
  
  let a = require("./scexec/build/Debug/api.node");
  a.run_array(data);
});

