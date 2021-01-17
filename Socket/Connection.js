
class Connection
{
    constructor(intKey, strKey, conn){
        this.intKey  = intKey;
        this.strKey  = strKey;
        this.conn    = conn;
        this.groupId = null;
        this.userKey = null;

        this.bSize    = 0;
        this.curIndex = 0;
        this.maxSize  = 10240;
        this.buffer   = Buffer.alloc(this.maxSize);
    }

    Close(){
        this.conn.end();
    }

    OnData(data){

        let len = data.length + this.curIndex;
        if(len >= this.maxSize){
            this.Close();
            console.error("Connection message too long intKey:" + this.intKey + " msg len:" + len);
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
                break;
            }
        }

        let remainLen = this.curIndex - endIndex;
        if(remainLen > 0){
            let temp = this.buffer.subarray(endIndex, this.curIndex);
            this.buffer.copy(temp, 0, 0, this.maxSize - 1);
            this.curIndex = this.curIndex - endIndex;
        } else {
            this.curIndex = 0;
        }
        return ret;
    }

    Send(data){
        let len = data.length + 4
        let buff = Buffer.alloc(len);
        buff.writeUInt32LE(len, 0);
        buff.write(data, 4);
        this.conn.write(buff);
    }

    SendArgs(cmd, status, msg){
        let packet = {
            cmd:cmd,
            status:status,
            data:msg
        };
        let data = JSON.stringify(packet);
        this.Send(data);
    }
};
module.exports = Connection;
