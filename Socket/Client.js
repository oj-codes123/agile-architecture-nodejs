
var net = require("net");
var ClientManager = require('./ClientManager');

class Client
{
    constructor(name){
        this.name = name;
        this.ip   = null;
        this.port = null;
        this.status = 0;
        this.intKey = 0;
        this.sock   = null;
        this.reConnect = true;

        this.bSize    = 0;
        this.curIndex = 0;
        this.maxSize  = 10240;
        this.buffer   = Buffer.alloc(this.maxSize);
    }

    Connect(ip, port){
        this.ip   = ip;
        this.port = port;
        this.ToConnect();
    }

    ToConnect(){
        var that  = this;

        this.sock = net.connect({host:this.ip, port:this.port}, ()=>{
            that.sock.setEncoding('utf8');
            that.sock.setNoDelay(true);
            that.status = 1;

            if(that.intKey == 0 ){
                that.intKey = ClientManager.clients.GetIntKey();
            }
            ClientManager.clients.OnConnected(that);

            that.sock.on('data', function(data){
                let array = that.OnData(data);
                if(array != null){
                    for(let i = 0; i < array.length; i++){
                        ClientManager.clients.OnMessage(that, array[i]);
                    }
                }
            });

            that.sock.on('end', function(){
                that.status = -1;
                ClientManager.clients.OnClosed(that);
            });
            
            that.sock.on('close', function(){
                that.status = -1;
                ClientManager.clients.OnClosed(that);
            });
        });

        this.sock.on('error', function(err){
            if(that.status == 0 && that.reConnect && that.intKey == 0){
                that.intKey = ClientManager.clients.GetIntKey();
                ClientManager.clients.OnUnConnected(that);
            }
            ClientManager.clients.OnError(that, err);
        });
    }

    OnData(data){
        let len = data.length + this.curIndex;
        if(len >= this.maxSize){
            this.Close();
            console.error("Client.OnData message too long intKey:" + this.intKey + " msg len:" + len);
            return null;
        }
        
        let ret = [];

        this.buffer.write(data, this.curIndex);
        if(this.bSize == 0){
            this.bSize = this.buffer.readInt32LE(0);
        }
        this.curIndex = len;

        let startIndex = 4;
        let endIndex = this.bSize;

        while(endIndex <= this.curIndex){
            ret.push(this.buffer.toString("utf8", startIndex, endIndex));
            if(endIndex + 4 <= this.curIndex){
                this.bSize = this.buffer.readInt32LE(endIndex);
                startIndex = endIndex + 4;
                endIndex = endIndex + this.bSize;
            } else {
                this.bSize =  0;
                this.curIndex = 0;
                break;
            }
        }

        let remainLen = this.curIndex - endIndex;
        if(remainLen > 0){
            let temp = this.buffer.subarray(endIndex, this.curIndex);
            this.buffer.copy(temp, 0, 0, this.maxSize - 1);
            this.curIndex = this.curIndex - endIndex;
        }
        return ret;
    }

    Send(data){
        if(this.status <= 0){
            return;
        }

        let len = data.length + 4
        let buff = Buffer.alloc(len);
        buff.writeUInt32LE(len, 0);
        buff.write(data, 4);
        this.sock.write(buff);

        //this.sock.write(data);
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
        this.Send(data);
    }

    Close(){
        this.sock.end();
    }
};

module.exports = Client;

