class Container 
{
  constructor(name, key = {}, blobs = {}) 
  {
    this.name = null || name;
    this.key = {} || key;
    this.blobs = {} || blobs;
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
  constructor(agentId, containerObject) 
  {
    this.agentid   = null || agentId;
    this.container = null || containerObject;
    this.BrowserWindow = null;
  }

}


module.exports = {
  Container,
  Agent
};
