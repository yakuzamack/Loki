
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl build-essential libgtk-3-dev libnss3 libasound2

sudo apt install -y nodejs npm

npm install -g electron

cd `LokiC2/agent/`
npm install --save-dev electron
npm start
npm install --save-dev electron-builder
npm run build
