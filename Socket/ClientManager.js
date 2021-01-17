
var HashMap = require('hashmap');

class ClientMsgHandler
{
    constructor(){
    }

    Init(){ }

    OnConnected(conns, conn, cmd, args) { }
    OnMessage(conns, conn, cmd, args) { }
    OnClose(conns, conn, cmd, args) { }
    OnError(conns, conn, cmd, args) { }
};

class ClientGroup{
    constructor(){
        this.conns = [];
        this.index = 0;
    }

    AddConn(conn){
        let index = this.conns.findIndex((val)=> val.intKey === conn.intKey);
        if(index < 0){
            this.conns.push(conn);
            return true;
        } else {
            console.error("ClientGroup.AddConn the same conn with intKey:", conn.intKey);
            return false;
        }
    }

    DeleteConn(intKey){
        let index = this.conns.findIndex((val)=> val.intKey === intKey);
        if(index >= 0){
            this.conns.splice(index, 1);
        }
    }

    Send(data){
        if(this.conns.length < 1){
            return;
        }

        if(this.index >= this.conns.length){
            this.index = 0;
        }
        this.conns[this.index].Send(data);
        ++this.index;
    }
};

class ClientManager
{
    constructor(){
        this.intKey    = 0;
        this.isStarted = false;

        this.pingTimer  = 10000;
        this.checkTimer = 3000;

        this.conns     = new HashMap();
        this.groupConns   = new HashMap();

        this.unconns      = new HashMap();

        this.msg_handler  = new ClientMsgHandler();
    }

    GetIntKey(){
        ++this.intKey;
        return this.intKey;
    }

    SetMsgHandler(handler){
        this.msg_handler = handler;
        if(this.msg_handler.Init){
            this.msg_handler.Init();
        } else {
            console.error("ClientManager.msg_handler.Init is null");
            return;
        }
        if(this.msg_handler.OnMessage == null){
            console.error("ClientManager.msg_handler.OnMessage is null");
            return;
        }

        if(this.msg_handler.OnClose == null){
            console.error("ClientManager.msg_handler.OnClose is null");
            return;
        }
    }

    OnUnConnected(client){
        let temp = this.unconns.get(client.intKey);
        if(null == temp){
            this.unconns.set(client.intKey, client);
        }
    }

    DeleteUnConnected(intKey){
        let temp = this.unconns.get(intKey);
        if(temp){
            this.unconns.delete(intKey);
        }
    }
    
    OnConnected(client){
        //console.log("ClientManager OnConnected intKey:", client.intKey);

        let temp = this.unconns.get(client.intKey);
        if(temp){
            this.unconns.delete(client.intKey);
        }

        let conn = this.conns.get(client.intKey);
        if(conn){
            this.DeleteUnConnected(client.intKey);
            console.error("ClientManager.OnConnected client exist in conns intKey:", client.intKey);
            return;
        }
        this.conns.set(client.intKey, client);

        let group = this.groupConns.get(client.name);
        if(group){
            group.AddConn(client);
        } else {
            group = new ClientGroup();
            group.AddConn(client);
            this.groupConns.set(client.name, group);
        }

        if(this.msg_handler.OnConnected){
            this.msg_handler.OnConnected(this, client, "on_connected", "on_connected");
        }
        this.DeleteUnConnected(client.intKey);
    }

    OnMessage(client, data) {
        let conn = this.conns.get(client.intKey);
        if(!conn){
            console.error("ClientManager.OnMessage no conn intKey:%s, data:%s", client.intKey, data);
            return;
        }
        
        let jsonObj = null;
        try{
            jsonObj = JSON.parse(data);
        }catch(e){
            console.error("ClientManager.OnMessage JSON.parse err data:" + data);
            return;
        }

        if(null != jsonObj && null != jsonObj.cmd && null != jsonObj.data){
            this.msg_handler.OnMessage(this, client, jsonObj.cmd, jsonObj.data);
        } else {
            console.error("ClientManager.OnMessage jsonObj err data:" + data);
        }
    }

    OnClosed(client) { 
        
        let conn = this.conns.get(client.intKey);
        if(!conn){
            console.error("ClientManager.OnClosed no client in conns intKey:", client.intKey);
            return;
        }

        if(client.reConnect){
            this.unconns.set(client.intKey, client);
        }

        let args = {
            name:client.name,
            intKey:client.intKey
        }

        let group = this.groupConns.get(client.name);
        if(group){
            group.DeleteConn(client.intKey);
        }
        this.conns.delete(client.intKey);

        this.msg_handler.OnClose(this, client, "on_close", args);
    }

    OnError(client, err) { 
        //console.error("ClientManager.OnError err:", err, " intKey:", client.intKey);
        
        let conn = this.conns.get(client.intKey);
        if(conn && null != this.msg_handler.OnError){
            this.msg_handler.OnError(this, client, "on_error", "on_error");
        }
    }

    SendInRound(groupName, data){
        let group = this.groupConns.get(groupName);
        if(group){
            group.Send(data);
        }
    }

    Ping(){
        let pingData = "pingpingpingpingpingpingpingping";
        let id = 1;
        this.conns.forEach(function(value, key) {
            value.SendArgs("ping", 0, pingData + id.toString());id++;
            value.SendArgs("ping", 0, pingData+ id.toString());id++;
            value.SendArgs("ping", 0, pingData+ id.toString());id++;
            value.SendArgs("ping", 0, pingData+ id.toString());id++;
            value.SendArgs("ping", 0, pingData+ id.toString());id++;
            value.SendArgs("ping", 0, pingData+ id.toString());
        });

        let that = this;
        setTimeout(function() { that.Ping(); }, this.pingTimer);  
    }

    Check(){

        this.unconns.forEach(function(value, key) {
            value.ToConnect();
        });

        let that = this;
        setTimeout(function() { that.Check(); }, this.checkTimer);
    }

    Start(){
        if(!this.isStarted){
            let that = this;

            setTimeout(function() { that.Ping(); }, this.pingTimer);
            setTimeout(function() { that.Check(); }, this.checkTimer);

            console.log("WsClientManager.Start ...");
        }
        this.isStarted = true;
    }
};

module.exports.clients = new ClientManager();
