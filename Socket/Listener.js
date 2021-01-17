
var net = require("net");

class ConnsInterface 
{
    constructor(){ }
    OnConnected(intKey, strKey, sock) { }
    OnMessage(strKey, data) { }
    OnClose(strKey) { }
    OnError(strKey, err) { }
};

class Listener
{
    constructor(){
        this.conns  = new ConnsInterface();
        this.port   = 0;
        this.maxC   = 10000;
        this.server = null;
        this.intKey = 0;
    }

    Init(conns, port, maxC){
        this.conns  = conns;
        this.port   = port;
        this.maxC   = maxC;
    }

    Start(){

        let that = this;
        this.server = net.createServer((sock)=>{

            sock.setEncoding('utf8');
            sock.setNoDelay(true);
            
            ++that.intKey;

            let strKey = sock.remoteAddress + sock.remotePort.toString();
            that.conns.OnConnected(that.intKey, strKey, sock);
            
            sock.on('data', function(data){
                //console.log('----- Listener got data from client - ', data);
                //let strKey = sock.remoteAddress + sock.remotePort.toString();
                that.conns.OnMessage(strKey, data);
            });
            
            sock.on('end', function(){
                //console.log("-------socket end...");
                //let strKey = sock.remoteAddress + sock.remotePort.toString();
                that.conns.OnClose(strKey);
            });
            
            sock.on('error', function(err){
                //console.log("-------socket error...");
                //let strKey = sock.remoteAddress + sock.remotePort.toString();
                that.conns.OnError(strKey, err);
            });

            sock.on('close', function(had_error){
                //console.log("-------socket close...");
                //let strKey = sock.remoteAddress + sock.remotePort.toString();
                that.conns.OnClose(strKey);
            });
        });

        this.server.maxConnections = this.maxC;
        this.server.listen(this.port, function(){
            console.log('echo server bound at port %d', that.port);
        });
        console.log("start ws server listen port:%d", this.port);
    }
}

module.exports = Listener;