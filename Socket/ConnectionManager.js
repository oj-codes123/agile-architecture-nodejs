
var HashMap = require('hashmap');
var Connection = require('./Connection');
var MsgHandler = require('./MsgHandler');

class ConnectionManager
{
    constructor(){
        this.conns = new HashMap();
        this.userKeyMap   = new HashMap();
        this.groupConns   = new HashMap();
        this.msg_handler  = new MsgHandler();
    }

    SetMsgHandler(handler){
        this.msg_handler = handler;
    }

    GetConnection(strKey){
        let conn = this.conns.get(strKey);
        return conn;
    }

    SetUserKeyMap(userKey, conn){
        conn.userKey = userKey;
        this.userKeyMap.set(userKey, conn.strKey);
    }

    DelUserKeyMap(userKey){
        this.userKeyMap.delete(userKey);
    }

    OnConnected(intKey, strKey, conn){
        this.conns.set(strKey, new Connection(intKey, strKey, conn) );
        if(null != this.msg_handler.OnConnected){
            this.msg_handler.OnConnected(this, conn, "on_connected", "on_connected");
        }
       // console.log("ConnectionManager.OnConnected intKey:%d, strKey:%s, size:%d", intKey, strKey, this.conns.size);
    }
    OnMessage(strKey, data){
        let conn = this.conns.get(strKey);
        if(!conn){
            console.error("ConnectionManager.OnMessage no ws conn strKey:%s, data:%s", strKey, data);
            return;
        }

        let array = conn.OnData(data);
        if(array != null){
            for(let i = 0; i < array.length; i++){
                this.OnData(conn, array[i]);
            }
        }
    }

    OnData(conn, data){
        let jsonObj = null;
        try{
            jsonObj = JSON.parse(data);
        }catch(e){
            console.error("ConnectionManager.OnMessage JSON.parse err data:" + data);
            return;
        }

        if(null != jsonObj && null != jsonObj.cmd && null != jsonObj.data)
        {
            this.msg_handler.OnMessage(this, conn, jsonObj.cmd, jsonObj.data);
        }
        else
        {
            console.error("ConnectionManager.OnMessage msg no cmd or data : %s", data);
        }
    }

    OnClose(strKey){
        //console.log("ConnectionManager.OnClose key:" + strKey);
        let conn = this.conns.get(strKey);
        if(conn)
        {
            let args = {
                groupId:conn.groupId,
                strKey:strKey,
                intKey:conn.intKey
            }
            
            if(conn.userKey){
                this.userKeyMap.delete(conn.userKey);
            }
            this.LeaveGroup(strKey, conn.groupId);
            this.conns.delete(strKey);
            
            this.msg_handler.OnClose(this, conn, "on_close", args);
        }
    }

    OnError(strKey, err){
        //console.log("ConnectionManager.OnError OnError key:" + strKey + " err:" + err);
        let conn = this.conns.get(strKey);
        if(conn && null != this.msg_handler.OnError)
        {
            this.msg_handler.OnError(this, conn, "on_error", "on_error");
        }
    }

    SendByUserKey(userKey, data){
        let strKey = this.userKeyMap.get(userKey);
        if(strKey){
            let conn = this.conns.get(strKey);
            if(conn){
                conn.Send(data);
            }
        }
    }

    SendByStrKey(strKey, data){
        let conn = this.conns.get(strKey);
        if(conn){
            conn.Send(data);
        }
    }

    BroadcastToAll(data){
        this.conns.forEach(function(value, key) {
            value.conn.Send(data);
        });
    }

    BroadcastToAllArgs(cmd, status, msg){
        let packet = {
            cmd:cmd,
            status:status,
            data:msg
        };
    
        let data = JSON.stringify(packet);
    
        this.conns.forEach(function(value, key) {
            value.conn.Send(data);
        });
    }

    BroadcastToGroup(groupId, data){
        let group = this.groupConns.get(groupId);
        if(group)
        {
            group.forEach(function(value, key) {
                value.conn.Send(data);
            });
            console.log("ConnectionManager.BroadcastToGroup:%s data:%s", groupId, data);
        }
        else
        {
            console.log("ConnectionManager.BroadcastToGroup no groupId:%d", groupId);
        }        
    }

    BroadcastToGroupArgs(groupId, cmd, status, msg){
        let packet = {
            cmd:cmd,
            status:status,
            data:msg
        };
    
        let data = JSON.stringify(packet);
        this.BroadcastToGroup(groupId, data);
    }

    LeaveGroup(strKey, groupId){
        if(!groupId)
        {
            return;
        }
    
        let group = this.groupConns.get(groupId);
        if(group)
        {
            group.delete(strKey);
        }
    }

    UpdateGroup(strKey, curGroupId, newGroupId)
    {
        let conn = this.conns.get(strKey);
        if(conn)
        {
            let group = this.groupConns.get(curGroupId);
            if(group)
            {
                group.delete(strKey);
            }
    
            conn.groupId = newGroupId;
            if(!newGroupId)
            {
                return;
            }
    
            let groupNew = this.groupConns.get(newGroupId);
            if(groupNew)
            {
                groupNew.set(strKey, conn);
            }
            else
            {
                let newVal = new HashMap();
                newVal.set(strKey, conn);
                this.groupConns.set(newGroupId, newVal);
            }
        }
    }

    Ping(){
        let pingData = "pingpingpingpingpingpingpingping server";
        let id = 1;
        this.conns.forEach(function(value, key) {
            value.SendArgs("ping", 0, pingData + id.toString());id++;
            value.SendArgs("ping", 0, pingData+ id.toString());id++;
            /*value.SendArgs("ping", 0, pingData+ id.toString());id++;
            value.SendArgs("ping", 0, pingData+ id.toString());id++;
            value.SendArgs("ping", 0, pingData+ id.toString());id++;
            value.SendArgs("ping", 0, pingData+ id.toString());*/
        });
/*
        let pingData = "pingpingpingpingpingpingpingping";
        this.conns.forEach(function(value, key) {
            value.SendArgs("ping", 0, pingData);
            value.SendArgs("ping", 0, pingData);
            value.SendArgs("ping", 0, pingData);
            value.SendArgs("ping", 0, pingData);
            value.SendArgs("ping", 0, pingData);
        });*/
    }

    CheckNConns(){
        let delGroups = [];

        this.groupConns.forEach(function(value, key) {
            if(value.count() == 0){
                delGroups.push(key);
            }
        });
    
        for(let i = 0; i < delGroups.length; i++){
            this.groupConns.delete(delGroups[i]);
        }
    }
};

module.exports = ConnectionManager;
