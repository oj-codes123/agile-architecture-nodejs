
var websock = require('nodejs-websocket');
var WsClientManager = require('./WsClientManager');

class WsClient
{
    constructor(name){
        this.name = name;
        this.url  = null;
        this.status = 0;
        this.intKey = 0;
        this.sock   = null;
        this.reConnect = true;
    }

    Connect(url){
        this.url  = url;
        this.ToConnect();
    }

    ToConnect(){
        var that  = this;
        let options = {};

        console.log("WsClient ToConnect url:" + this.url + " name:" + this.name + " intKey:" + this.intKey);

        try {
            this.sock = websock.connect(this.url, options, (args)=>{
                that.status = 1;
                if(that.intKey == 0){
                    that.intKey = WsClientManager.clients.GetIntKey();
                }
                WsClientManager.clients.OnConnected(that);

                that.sock.on('text', function(msg) {
                    WsClientManager.clients.OnMessage(that, msg);
                });
    
                that.sock.on("close", function (code, reason) {
                    that.status = -1;
                    WsClientManager.clients.OnClosed(that, code, reason);
                });
            });

            this.sock.on("error", function (code, reason) {
                if(that.status == 0 && that.reConnect && that.intKey == 0){
                    that.intKey = WsClientManager.clients.GetIntKey();
                    WsClientManager.clients.OnUnConnected(that);
                }
                WsClientManager.clients.OnError(that, code, reason);
            });
        } catch(e){
            console.log("fail to connect url:" + this.url);
        }
    }

    Send(msg){
        if(this.status <= 0){
            return;
        }
        this.sock.sendText(msg);
        //console.log("WsClient Send intKey:" + this.intKey + " msg:" + msg);
    }

    SendArgs(cmd, status, msg){
        if(this.status <= 0){
            return;
        }
        let packet = {
            cmd:cmd,
            status:status,
            data:msg
        };
        let data = JSON.stringify(packet);
        this.sock.sendText(data);
        //console.log("WsClient SendArgs intKey:" + this.intKey + " msg:" + msg);
    }

    Close(){
        this.sock.close(12345, "client close");
    }
};

module.exports = WsClient;

