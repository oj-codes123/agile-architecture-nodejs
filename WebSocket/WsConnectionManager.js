
var HashMap = require('hashmap');
var WsConnection = require('./WsConnection');
var WsMsgHandler = require('./WsMsgHandler');

class WsConnectionManager
{
    constructor(){
        this.nconns = null;
        this.conns  = null;
        this.groupConns = null;
        this.groupConnNum = null;
        this.userKeyMap = null;
        this.msg_handler  = null;
        this.loginTimeout = 10;
        this.notLoginCode = -1000;
    }

    Init(loginTimeout, notLoginCode){
        this.nconns = new HashMap();
        this.conns  = new HashMap();
        this.groupConns = new HashMap();
        this.userKeyMap = new HashMap();
        this.groupConnNum = new HashMap();
        this.msg_handler  = new WsMsgHandler();
        this.loginTimeout = loginTimeout;
        this.notLoginCode = notLoginCode;
    }

    SetMsgHandler(handler){
        this.msg_handler = handler;
    }

    SetUserKeyMap(userKey, strKey){
        this.userKeyMap.set(userKey, strKey);
    }

    DelUserKeyMap(userKey){
        this.userKeyMap.delete(userKey);
    }

    OnConnected(intKey, strKey, conn){
        this.nconns.set(strKey, new WsConnection(intKey, strKey, conn) );
        if(null != this.msg_handler.OnConnected){
            this.msg_handler.OnConnected(this, conn, "on_connected", "on_connected");
        }
        //console.log("WsConnectionManager.OnConnected intKey:" + intKey + ", strKey:"+ strKey + ", size:" + this.nconns.size);
    }

    OnMessage(strKey, msg){
        
        let conn = this.conns.get(strKey);
        if(conn) {
            let jsonObj = null;
            try{
                jsonObj = JSON.parse(msg);
            }catch(e){
                console.error("WsConnectionManager.OnMessage JSON.parse err msg:" + msg);
                return;
            }

            if(null != jsonObj && null != jsonObj.cmd && null != jsonObj.data){
                this.msg_handler.OnMessage(this, conn, jsonObj.cmd, jsonObj.data);
            } else {
                console.error("WsConnectionManager.OnMessage jsonObj err msg:" + msg);
            }
        } else {
            let nconn = this.nconns.get(strKey);
            if(nconn) {
                if(nconn.loginStatus < 0){
                    console.error("WsConnectionManager.OnMessage loginStatus < 0 ");
                    return;
                }
                let jsonObj = null;
                try{
                    jsonObj = JSON.parse(msg);

                }catch(e){
                    console.error("WsConnectionManager.OnMessage JSON.parse err msg:" + msg);
                    return;
                }

                if(null == jsonObj){
                    console.error("WsConnectionManager.OnMessage jsonObj==null err msg:" + msg);
                    return;
                }
                if("login" === jsonObj.cmd){
                    if(null != jsonObj.data) {
                        this.msg_handler.OnMessage(this, nconn, jsonObj.cmd, jsonObj.data);
                    }
                } else {
                    nconn.SendArgs(jsonObj.cmd, this.notLoginCode, "not login");
                    console.error("WsConnectionManager.OnMessage no logined strKey:" + strKey + ", msg:" + msg);
                }
            } else {
                console.error("WsConnectionManager no conn key:" + strKey);
            }
        }
    }

    GetConnection(strKey){
        let nconn = this.nconns.get(strKey);
        if(nconn){
            return nconn;
        }
        let conn = this.conns.get(strKey);
        return conn;
    }

    OnClose(strKey, code, reason){
       // console.log("WsConnectionManager.OnClose key:" + strKey, ", code:" + code + ", reason:" + reason);

        let conn = this.nconns.get(strKey);
        if(conn){
            this.nconns.delete(strKey);
            return;
        }
        
        conn = this.conns.get(strKey);
        if(conn) {
            let args = {
                groupId:conn.groupId,
                userId:conn.userId,
                streamId:conn.streamId
            }
            
            let userKey = conn.userKey;

            this.LeaveGroup(strKey, conn.groupId);
            this.conns.delete(strKey);
    
            this.msg_handler.OnClose(this, conn, "on_close", args);

            this.userKeyMap.delete(userKey);
        }
    }

    OnError(strKey, code, reason){
        //console.log("WsConnectionManager.OnError OnError key:" + strKey, ", code:" + code + ", reason:" + reason);
        let conn = this.conns.get(strKey);
        if(conn && null != this.msg_handler.OnError)
        {
            this.msg_handler.OnError(this, conn, "on_error", "on_error");
        }
    }

    GetConnectionByUserKey(userKey){
        let strKey = this.userKeyMap.get(userKey);
        if(strKey){
            let conn = this.conns.get(strKey);
            return conn;
        }
        return null;
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

    BroadcastToAll(msg){
        this.conns.forEach(function(value, key) {
            value.conn.sendText(msg);
        });
    }

    BroadcastToAllArgs(cmd, status, msg){
        let packet = {
            cmd:cmd,
            status:status,
            data:msg
        };
    
        let str = JSON.stringify(packet);
    
        this.conns.forEach(function(value, key) {
            value.conn.sendText(str);
        });
    }
    
    BroadcastToGroup(groupId, msg){
        if(null == groupId){
            return;
        }
        let group = this.groupConns.get(groupId);
        if(group) {
            group.forEach(function(value, key) {
                value.conn.sendText(msg);
            });
            console.log("WsConnectionManager.BroadcastToGroup:" + groupId + " msg:" + msg);
        }
        else{
            console.log("WsConnectionManager.BroadcastToGroup no groupId:" + groupId);
        }
    }

    BroadcastToGroupArgs(groupId, cmd, status, msg){
        let packet = {
            cmd:cmd,
            status:status,
            data:msg
        };
    
        let str = JSON.stringify(packet);
        this.BroadcastToGroup(groupId, str);
    }

    UpdateLoginStatus(strKey, isLogin, statusVal){
        if(isLogin)
        {
            let conn = this.nconns.get(strKey);
            if(conn)
            {
                conn.loginStatus = statusVal;
                this.conns.set(strKey, conn);
                this.nconns.delete(strKey);
                return true;
            }
            return false;
        }
        else
        {
            let conn = this.conns.get(strKey);
            if(conn)
            {
                this.LeaveGroup(strKey, conn.groupId);
    
                conn.loginStatus = statusVal;
                this.nconns.set(strKey, conn);
                this.conns.delete(strKey);
                return true;
            }
        }
        return false;
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

    CheckGroupNum(){
        
        let that = this;

        let delGroups = [];
    
        this.groupConns.forEach(function(value, key) {

            let connSize = value.count();
            let tempVal = that.groupConnNum.get(key);

            if(tempVal != connSize){
                that.groupConnNum.set(key, connSize);
                that.BroadcastToGroupArgs(key, "update_channel_members", 0, {num:connSize});
            }
            if(connSize == 0){
                delGroups.push(key);
            }
        });
    
        for(let i = 0; i < delGroups.length; i++){
            this.groupConns.delete(delGroups[i]);
            this.groupConnNum.delete(delGroups[i]);
        }
    }

    GetGroupMemberNum(groupId){
        let group = this.groupConns.get(groupId);
        if(group)
        {
            return group.count();
        }
        return 0;
    }
    UpdateGroup(strKey, curGroupId, newGroupId){
        let conn = this.conns.get(strKey);
        if(conn)
        {
            if(curGroupId != null){
                let group = this.groupConns.get(curGroupId);
                if(group)
                {
                    group.delete(strKey);
                }
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
        this.conns.forEach(function(value, key) {
            value.SendArgs("ping", 0, "ping");
        });
    }

    CheckNConns(){
        let now = new Date();
        let curTime = now.getTime()/1000;
    
        let delKeys = [];
    
        var loginTimeoutVal = this.loginTimeout;
    
        this.nconns.forEach(function(value, key) {
            if( loginTimeoutVal + value.connTime < curTime){
                value.conn.close(456, "login status timeout");
                delKeys.push(key);
                console.log("WsConnectionManager.CheckNConns login timeout key:" + key);
            }
        });
    
        for(let i = 0; i < delKeys.length; i++){
            this.nconns.delete(delKeys[i]);
        }      
    }
};

module.exports = WsConnectionManager;
