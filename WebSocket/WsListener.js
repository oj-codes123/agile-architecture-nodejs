
var websock = require('nodejs-websocket');

class ConnsInterface
{
    constructor(){ }
    OnConnected(intKey, strKey, conn) { }
    OnMessage(strKey, msg) { }
    OnClose(strKey, code, reason) { }
    OnError(strKey, code, reason) { }
};

class WsListener
{
    constructor(){
        this.conns  = new ConnsInterface();
        this.port   = 0;
        this.intKey = 0;
        this.webserver = null;

        this.recvNum = 0;
        this.traceNum = 0;
        this.traceTime = 0;
    }

    Start(port, conns){
        this.port   = port;
        this.conns  = conns;
        let that    = this;

        this.webserver = websock.createServer((connection)=>{

            ++this.intKey;
            this.conns.OnConnected(this.intKey, connection.key, connection);

            connection.on('text', function(msg) {
                if(typeof msg == "string" && msg.length < 10240){
                    that.conns.OnMessage(connection.key, msg);
                    
                    that.recvNum++;
                    let now  = new Date();
                    if(that.traceTime + 5000 < now.getTime()){

                        let val = that.recvNum - that.traceNum;
                        that.traceNum  = that.recvNum;
                        that.traceTime = now.getTime();

                        if(val > 0){
                            console.log("==========webserver recvNum:" + val + " traceTime:" + that.traceTime);
                        }
                    }
                }
                else {
                    connection.close(457, "err msg type or msg len");
                    console.error("WsListener Error msg type:", typeof msg, " msg len:", msg.length);
                }
            });
    
            connection.on("close", function (code, reason) {
                that.conns.OnClose(connection.key, code, reason);
            });
    
            connection.on("error", function (code, reason) {
                that.conns.OnError(connection.key, code, reason);
            });

        });

        this.webserver.listen(this.port);
        console.log("start ws server listen port:" + this.port);
    }
};
module.exports = WsListener;
