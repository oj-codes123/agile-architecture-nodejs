
var WsListener          = require('./WsListener');
var WsConnectionManager = require('./WsConnectionManager');
var WsMsgHandler        = require('./WsMsgHandler');

class WsServer
{
    constructor(){
        this.port          = 0;
        this.checkTime     = 10000;
        this.pingTime      = 10000;
        this.isInited      = false;
        this.isStarted     = false;
        this.handler       = new WsMsgHandler();
        this.webListener   = new WsListener();
        this.conns         = new WsConnectionManager();
    }

    Init(port,  loginTimeout, notLoginCode) {
        this.port = port;
        this.conns.Init(loginTimeout, notLoginCode);
        this.isInited = true;
    }

    SetArgs(checkTime, pingTime){
        this.checkTime = checkTime;
        this.pingTime  = pingTime;
    }

    SetMsgHandler(handler) {
        if(handler.Init == null || handler.OnMessage == null || handler.OnClose == null )
        {
            console.error("MsgHandler no Init | OnMessage | OnClose handler");   
            return;
        }
        this.handler = handler;
        this.handler.Init();
        this.conns.SetMsgHandler(this.handler);
    }

    Start(tag) {
        tag = typeof tag == 'undefined' ? 0 : tag;

        if(this.isStarted){
            console.error("wsserver isStarted");
            return;
        }
        if(!this.isInited){
            console.error("wsserver no init");
            return;
        }
        
        var that = this;
        setInterval( ()=>{
            that.conns.CheckNConns();
        }, that.checkTime);

        setInterval( ()=>{
            that.conns.Ping();
        }, that.pingTime);

        if(tag == 0){
            setInterval( ()=>{
                that.conns.CheckGroupNum();
            }, 1000);
        }

        this.webListener.Start(this.port, this.conns);
        this.isStarted = true;
    }
};
module.exports = WsServer;
