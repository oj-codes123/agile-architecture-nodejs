
class WsConnection
{
    constructor(intKey, strKey, conn){
        this.intKey   = intKey;
        this.strKey   = strKey;
        this.conn     = conn;
        this.userKey  = null;
        this.groupId  = null;
        this.streamId = null;
        this.ext      = null;
        this.userId   = null;
        this.userName = null;
        this.loginStatus = 0;//0:no status 1:logined
        this.connTime    = 0;
    
        let now = new Date();
        this.connTime = now.getTime()/1000;
    }

    Send(msg){
        this.conn.sendText(msg);
    }

    SendArgs(cmd, status, obj){
        let packet = {
            cmd:cmd,
            status:status,
            data:obj
        };
        let str = JSON.stringify(packet);
        this.conn.sendText(str);
    }
};

module.exports = WsConnection;

