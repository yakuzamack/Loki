const {generateUUID,generateAESKey} = require('./crypt.js');
class Window {
  constructor() {
    this.BrowserWindow = null;
  }
  setBrowserWindow(BrowserWindow) {
    this.BrowserWindow = BrowserWindow;
  }
}
class Container 
{
  constructor() 
  {
    this.name  = 's'+generateUUID(10);
    this.key   = generateAESKey();
    this.blobs = {
      'key':     'k-'+generateUUID(10),
      'checkin': 'c-'+generateUUID(10),
      'in':      'i-'+generateUUID(10),
      'out':     'o-'+generateUUID(10)
    };
  }
  setName(name) {
    this.name = name;
  }
  setKey(key) {
    this.key = {
      'key' : key.key,
      'iv' : key.iv
    };
  }
}

class Agent 
{
  constructor(windowid, status = null) 
  {
    this.window = new Window(windowid, status);
    this.agentid = 'a'+generateUUID(16);
    this.container = new Container();
    this.checkin = Date.now();
    this.sleepinterval = 5;
    this.sleepjitter   = 15;
    this.thissleep = 5000;
  }
  setAgentId(agentid) {
    this.agentid = agentid;
  }
  setContainer(container) {
    this.container = container;
  }
  // Method to replace the window
  setWindow(window) {
    this.window = window;
  }
}

module.exports = {
  Agent,
  Window,
  Container
};
