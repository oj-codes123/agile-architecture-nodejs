
var fs = require("fs");

function ConfigData() 
{
    this.data = null;

    this.Init = function (fileName){
        let str = fs.readFileSync(fileName);
        this.data = JSON.parse(str); 
        console.log("config data: " + str.toString());
    };
};

module.exports.Config = new ConfigData();

ConfigData.prototype.GetServerConfig = function(serverName)
{
    if(!this.data.servers){
        console.error("no servers config");
        return null;
    }
    for(let i = 0; i < this.data.servers.length; i++){
        if(serverName == this.data.servers[i].name){
            return this.data.servers[i];
        }
    }
    console.error("no server config serverName:" +  serverName);
    return null;
}
