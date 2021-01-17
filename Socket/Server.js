
var Listener = require('./Listener');
var MsgHandler = require('./MsgHandler');
var ConnectionManager = require('./ConnectionManager');
var ClientManager = require('./ClientManager');

class Server
{
    constructor(){
        this.pingTime  = 10000;
        this.checkTime = 10000;
        this.isInited  = false;
        this.isStarted = false;
        this.sListener = new Listener();
        this.conns     = new ConnectionManager();
        this.handler   = new MsgHandler();
    }

    Init(port){
        this.isInited  = true;
        this.sListener.Init(this.conns, port, 10000);
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

    Start() {
        if(this.isStarted){
            console.error("server isStarted");
            return;
        }
        if(!this.isInited){
            console.error("server no init");
            return;
        }

        var that = this;

        setInterval( () => {
            that.conns.CheckNConns();
        }, that.checkTime ); 

        setInterval( () => {
            that.conns.Ping();
        }, that.pingTime ); 

        this.sListener.Start();
        this.isStarted = true;
    }
};

module.exports = Server;
