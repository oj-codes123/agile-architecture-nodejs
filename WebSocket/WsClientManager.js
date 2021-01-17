
var HashMap = require('hashmap');

class WsClientMsgHandler
{
    constructor(){
    }

    Init(){ }

    OnConnected(conns, conn, cmd, args) { }
    OnMessage(conns, conn, cmd, args) { }
    OnClose(conns, conn, cmd, args) { }
    OnError(conns, conn, cmd, args) { }
};

class WsClientGroup{
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
            console.error("WsClientGroup.AddConn the same conn with intKey:", conn.intKey);
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

    SendArgs(cmd, status, msg){
        if(this.conns.length < 1){
            return;
        }

        if(this.index >= this.conns.length){
            this.index = 0;
        }
        this.conns[this.index].SendArgs(cmd, status, msg);
        ++this.index;
    }

    Broadcast(data){
        for(let i = 0; i < this.conns.length; i++){
            this.conns[i].Send(data);
        }
    }

    BroadcastArgs(cmd, status, msg){
        for(let i = 0; i < this.conns.length; i++){
            this.conns[i].SendArgs(cmd, status, msg);
        }
    }
};

class WsClientManager
{
    constructor(){
        this.intKey    = 0;
        this.isStarted = false;

        this.pingTimer  = 10000;
        this.checkTimer = 3000;
        
        this.unconns    = new HashMap();
        this.conns      = new HashMap();
        this.groupConns = new HashMap();

        this.msg_handler  = new WsClientMsgHandler();
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
            console.error("WsClientManager.msg_handler.Init is null");
            return;
        }
        if(this.msg_handler.OnMessage == null){
            console.error("WsClientManager.msg_handler.OnMessage is null");
            return;
        }

        if(this.msg_handler.OnClose == null){
            console.error("WsClientManager.msg_handler.OnClose is null");
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
        //console.log("WsClientManager OnConnected intKey:", client.intKey);

        let temp = this.unconns.get(client.intKey);
        if(temp){
            this.unconns.delete(client.intKey);
        }

        let conn = this.conns.get(client.intKey);
        if(conn){
            this.DeleteUnConnected(client.intKey);
            console.error("WsClientManager.OnConnected client exist in conns intKey:", client.intKey);
            return;
        }
        this.conns.set(client.intKey, client);

        let group = this.groupConns.get(client.name);
        if(group){
            group.AddConn(client);
        } else {
            group = new WsClientGroup();
            group.AddConn(client);
            this.groupConns.set(client.name, group);
        }

        if(this.msg_handler.OnConnected){
            this.msg_handler.OnConnected(this, client, "on_connected", "on_connected");
        }
        this.DeleteUnConnected(client.intKey);
    }

    OnMessage(client, msg) {
        let conn = this.conns.get(client.intKey);
        if(!conn){
            console.error("WsClientManager.OnMessage no conn intKey:%s, msg:%s", client.intKey, data);
            return;
        }
        
        let jsonObj = null;
        try{
            jsonObj = JSON.parse(msg);
        }catch(e){
            console.error("WsClientManager.OnMessage JSON.parse err msg:" + msg);
            return;
        }

        if(null != jsonObj && null != jsonObj.cmd && null != jsonObj.data){
            this.msg_handler.OnMessage(this, client, jsonObj.cmd, jsonObj.data);
        } else {
            console.error("WsClientManager.OnMessage jsonObj err msg:" + msg);
        }
    }

    OnClosed(client, code, reason) { 
        let conn = this.conns.get(client.intKey);
        if(!conn){
            console.error("WsClientManager.OnClosed no client in conns intKey:", client.intKey);
            return;
        }

        if(client.reConnect && code != 12345){
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

    OnError(client, code, reason) { 
        //console.error("WsClientManager.OnError code:", code, " reason:", reason, " intKey:", client.intKey);
        let conn = this.conns.get(client.intKey);
        if(conn && null != this.msg_handler.OnError){
            this.msg_handler.OnError(this, client, "on_error", "on_error");
        }
    }

    Send(intKey, msg){
        let conn = this.conns.get(intKey);
        if(conn){
            conn.Send(msg);
        }
    }

    SendArgs(intKey, cmd, status, msg){
        let conn = this.conns.get(intKey);
        if(conn){
            conn.SendArgs(cmd, status, msg);
        }
    }

    SendInRound(groupName, msg){
        let group = this.groupConns.get(groupName);
        if(group){
            group.Send(msg);
        }
    }

    SendInRoundArgs(groupName, cmd, status, msg){
        let group = this.groupConns.get(groupName);
        if(group){
            group.SendArgs(cmd, status, msg);
        }
    }

    BroadcastGroup(groupName, data){
        let group = this.groupConns.get(groupName);
        if(group){
            group.Broadcast(data);
        }
    }

    BroadcastGroupArgs(groupName, cmd, status, msg){
        let group = this.groupConns.get(groupName);
        if(group){
            group.BroadcastArgs(cmd, status, msg);
        }
    }

    Broadcast(data){
        this.conns.forEach(function(value, key) {
            value.Send(data);
        });
    }

    BroadcastArgs(cmd, status, msg){
        this.conns.forEach(function(value, key) {
            value.SendArgs(cmd, status, msg);
        });
    }

    Ping(){
        this.conns.forEach(function(value, key) {
            value.SendArgs("ping", 0, "ping");
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

module.exports.clients = new WsClientManager();
